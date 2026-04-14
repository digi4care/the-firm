import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type {
	AdapterStepSnapshot,
	Api,
	CompletionSnapshot,
	ContextSnapshot,
	ProviderCallStart,
	ProviderErrorSnapshot,
	ProviderLogEvent,
	ProviderLoggingRuntime,
	ProviderLogLevel,
	ProviderLogRecord,
	ProviderLogSink,
	ProviderTraceFactory,
	ProviderTraceScope,
	RequestDispatchSnapshot,
	RequestMutationSnapshot,
	RequestSnapshot,
	ResponseEventSnapshot,
	ResponseStartSnapshot,
	RetrySnapshot,
	ToolCallMappingSnapshot,
	TransformSnapshot,
} from "@digi4care/the-firm-ai";
import { CONFIG_DIR_NAME } from "../config.js";

const LOG_LEVEL_PRIORITY: Record<ProviderLogLevel, number> = {
	off: 99,
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

function isLevelEnabled(configured: ProviderLogLevel, eventLevel: Exclude<ProviderLogLevel, "off">): boolean {
	return LOG_LEVEL_PRIORITY[eventLevel] >= LOG_LEVEL_PRIORITY[configured];
}

function sanitizeProviderFileName(provider: string): string {
	return provider.replace(/[^a-zA-Z0-9._-]/g, "_");
}

class NoOpProviderLogSink implements ProviderLogSink {
	write(_record: ProviderLogRecord): void {}
}

class FileProviderLogSink implements ProviderLogSink {
	private readonly filePath: string;
	private queue: Promise<void> = Promise.resolve();
	private readonly ready: Promise<void>;

	constructor(baseDir: string, provider: string) {
		this.filePath = join(baseDir, `${sanitizeProviderFileName(provider)}.log`);
		this.ready = mkdir(baseDir, { recursive: true }).then(() => undefined);
	}

	write(record: ProviderLogRecord): Promise<void> {
		this.queue = this.queue.then(async () => {
			await this.ready;
			await appendFile(this.filePath, `${JSON.stringify(record)}\n`, "utf8");
		});
		return this.queue;
	}

	flush(): Promise<void> {
		return this.queue;
	}
}

class DefaultProviderTraceScope implements ProviderTraceScope {
	readonly sessionId: string;
	readonly providerCallId: string;
	readonly provider: string;
	readonly api: Api;
	readonly modelId: string;
	readonly level: ProviderLogLevel;

	constructor(
		private readonly sink: ProviderLogSink,
		call: ProviderCallStart & { sessionId: string; providerCallId: string; level: ProviderLogLevel },
	) {
		this.sessionId = call.sessionId;
		this.providerCallId = call.providerCallId;
		this.provider = call.provider;
		this.api = call.api;
		this.modelId = call.modelId;
		this.level = call.level;
	}

	contextReceived(payload: ContextSnapshot): void {
		this.emit("debug", "context.received", payload);
	}

	contextTransformed(payload: TransformSnapshot): void {
		this.emit("debug", "context.transformed", payload);
	}

	toolCallMapping(payload: ToolCallMappingSnapshot): void {
		const level = payload.reason === "none" || payload.reason === "same-model" ? "debug" : "warn";
		this.emit(level, "toolCall.mapping", payload);
	}

	requestBuilt(payload: RequestSnapshot): void {
		this.emit("debug", "request.built", payload);
	}

	requestMutated(payload: RequestMutationSnapshot): void {
		this.emit("debug", "request.mutated", payload);
	}

	requestDispatched(payload: RequestDispatchSnapshot): void {
		this.emit("info", "request.dispatched", payload);
	}

	retryScheduled(payload: RetrySnapshot): void {
		this.emit("warn", "request.retryScheduled", payload);
	}

	responseStarted(payload: ResponseStartSnapshot): void {
		this.emit("debug", "response.started", payload);
	}

	responseEvent(payload: ResponseEventSnapshot): void {
		this.emit("debug", "response.event", payload);
	}

	adapterStep(payload: AdapterStepSnapshot): void {
		this.emit("info", "adapter.step", payload);
	}

	error(payload: ProviderErrorSnapshot): void {
		this.emit("error", "call.error", payload);
	}

	completed(payload: CompletionSnapshot): void {
		this.emit("info", "call.completed", payload);
	}

	private emit(level: Exclude<ProviderLogLevel, "off">, event: ProviderLogEvent, payload: object): void {
		if (!isLevelEnabled(this.level, level)) {
			return;
		}
		void this.sink.write({
			ts: new Date().toISOString(),
			sessionId: this.sessionId,
			providerCallId: this.providerCallId,
			provider: this.provider,
			api: this.api,
			modelId: this.modelId,
			level,
			event,
			payload: payload as Record<string, unknown>,
		});
	}
}

class DefaultProviderTraceFactory implements ProviderTraceFactory {
	private readonly fileSinks = new Map<string, ProviderLogSink>();

	constructor(
		private readonly sessionId: string,
		private readonly getLevel: () => ProviderLogLevel,
		private readonly cwd: string,
	) {}

	createScope(input: ProviderCallStart): ProviderTraceScope {
		const level = this.getLevel();
		const providerCallId = randomUUID();
		const sink = this.getSink(input.provider, level);
		const scope = new DefaultProviderTraceScope(sink, {
			...input,
			sessionId: this.sessionId,
			providerCallId,
			level,
		});
		if (level !== "off" && isLevelEnabled(level, "info")) {
			void sink.write({
				ts: new Date().toISOString(),
				sessionId: this.sessionId,
				providerCallId,
				provider: input.provider,
				api: input.api,
				modelId: input.modelId,
				level: "info",
				event: "call.started",
				payload: {
					modelName: input.modelName,
					baseUrl: input.baseUrl,
					transport: input.transport,
					callKind: input.callKind,
				},
			});
		}
		return scope;
	}

	private getSink(provider: string, level: ProviderLogLevel): ProviderLogSink {
		if (level === "off") {
			return new NoOpProviderLogSink();
		}
		const existing = this.fileSinks.get(provider);
		if (existing) {
			return existing;
		}
		const sessionDir = join(this.cwd, CONFIG_DIR_NAME, "agents", this.sessionId);
		const sink = new FileProviderLogSink(sessionDir, provider);
		this.fileSinks.set(provider, sink);
		return sink;
	}
}

class DefaultProviderLoggingRuntime implements ProviderLoggingRuntime {
	readonly factory: ProviderTraceFactory;

	constructor(
		readonly sessionId: string,
		private readonly resolveLevel: () => ProviderLogLevel,
		cwd: string,
	) {
		this.factory = new DefaultProviderTraceFactory(sessionId, () => this.level, cwd);
	}

	get level(): ProviderLogLevel {
		return this.resolveLevel();
	}

	get enabled(): boolean {
		return this.level !== "off";
	}

	startProviderCall(input: ProviderCallStart): ProviderTraceScope {
		return this.factory.createScope(input);
	}
}

export function createProviderLoggingRuntime(options: {
	cwd: string;
	sessionId: string;
	getLevel: () => ProviderLogLevel;
}): ProviderLoggingRuntime {
	return new DefaultProviderLoggingRuntime(options.sessionId, options.getLevel, options.cwd);
}

export function isProviderLogLevel(value: unknown): value is ProviderLogLevel {
	return value === "off" || value === "debug" || value === "info" || value === "warn" || value === "error";
}
