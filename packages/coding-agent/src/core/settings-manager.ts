import type { ProviderLogLevel, Transport } from "@digi4care/the-firm-ai";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import lockfile from "proper-lockfile";
import { CONFIG_DIR_NAME, getAgentDir } from "../config.js";
import { settingsRegistry } from "./settings-registry.js";

export type CompactionStrategy = "context-full" | "handoff" | "off";

export interface CompactionSettings {
	enabled?: boolean; // default: true
	strategy?: CompactionStrategy; // default: "context-full"
	reserveTokens?: number; // default: 16384
	keepRecentTokens?: number; // default: 20000
	handoffAutoContinue?: boolean; // default: true
	handoffSaveToDisk?: boolean; // default: false
}

export interface BranchSummarySettings {
	reserveTokens?: number; // default: 16384 (tokens reserved for prompt + LLM response)
	skipPrompt?: boolean; // default: false - when true, skips "Summarize branch?" prompt and defaults to no summary
}

export interface RetrySettings {
	enabled?: boolean; // default: true
	maxRetries?: number; // default: 3
	baseDelayMs?: number; // default: 2000 (exponential backoff: 2s, 4s, 8s)
	maxDelayMs?: number; // default: 60000 (max server-requested delay before failing)
}

export interface TerminalSettings {
	showImages?: boolean; // default: true (only relevant if terminal supports images)
	clearOnShrink?: boolean; // default: false (clear empty rows when content shrinks)
}

export interface ImageSettings {
	autoResize?: boolean; // default: true (resize images to 2000x2000 max for better model compatibility)
	blockImages?: boolean; // default: false - when true, prevents all images from being sent to LLM providers
}

export interface ThinkingBudgetsSettings {
	minimal?: number;
	low?: number;
	medium?: number;
	high?: number;
}

export interface MarkdownSettings {
	codeBlockIndent?: string; // default: "  "
}

export type TransportSetting = Transport;

/**
 * Package source for npm/git packages.
 * - String form: load all resources from the package
 * - Object form: filter which resources to load
 */
export type PackageSource =
	| string
	| {
			source: string;
			extensions?: string[];
			skills?: string[];
			prompts?: string[];
			themes?: string[];
	  };

export interface Settings {
	lastChangelogVersion?: string;
	defaultProvider?: string;
	defaultModel?: string;
	defaultThinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
	transport?: TransportSetting; // default: "sse"
	steeringMode?: "all" | "one-at-a-time";
	followUpMode?: "all" | "one-at-a-time";
	theme?: string;
	compaction?: CompactionSettings;
	branchSummary?: BranchSummarySettings;
	retry?: RetrySettings;
	providerLogging?: {
		level?: ProviderLogLevel;
	};
	hideThinkingBlock?: boolean;
	shellPath?: string; // Custom shell path (e.g., for Cygwin users on Windows)
	quietStartup?: boolean;
	shellCommandPrefix?: string; // Prefix prepended to every bash command (e.g., "shopt -s expand_aliases" for alias support)
	npmCommand?: string[]; // Command used for npm package lookup/install operations, argv-style (e.g., ["mise", "exec", "node@20", "--", "npm"])
	collapseChangelog?: boolean; // Show condensed changelog after update (use /changelog for full)
	packages?: PackageSource[]; // Array of npm/git package sources (string or object with filtering)
	extensions?: string[]; // Array of local extension file paths or directories
	skills?: string[]; // Array of local skill file paths or directories
	prompts?: string[]; // Array of local prompt template paths or directories
	themes?: string[]; // Array of local theme file paths or directories
	enableSkillCommands?: boolean; // default: true - register skills as /skill:name commands
	terminal?: TerminalSettings;
	images?: ImageSettings;
	enabledModels?: string[]; // Model patterns for cycling (same format as --models CLI flag)
	doubleEscapeAction?: "fork" | "tree" | "none"; // Action for double-escape with empty editor (default: "tree")
	treeFilterMode?: "default" | "no-tools" | "user-only" | "labeled-only" | "all"; // Default filter when opening /tree
	thinkingBudgets?: ThinkingBudgetsSettings; // Custom token budgets for thinking levels
	editorPaddingX?: number; // Horizontal padding for input editor (default: 0)
	autocompleteMaxVisible?: number; // Max visible items in autocomplete dropdown (default: 5)
	showHardwareCursor?: boolean; // Show terminal cursor while still positioning it for IME
	markdown?: MarkdownSettings;
	sessionDir?: string; // Custom session storage directory (same format as --session-dir CLI flag)
}

/** Deep merge settings: project/overrides take precedence, nested objects merge recursively */
function deepMergeSettings(base: Settings, overrides: Settings): Settings {
	const result: Settings = { ...base };

	for (const key of Object.keys(overrides) as (keyof Settings)[]) {
		const overrideValue = overrides[key];
		const baseValue = base[key];

		if (overrideValue === undefined) {
			continue;
		}

		// For nested objects, merge recursively
		if (
			typeof overrideValue === "object" &&
			overrideValue !== null &&
			!Array.isArray(overrideValue) &&
			typeof baseValue === "object" &&
			baseValue !== null &&
			!Array.isArray(baseValue)
		) {
			(result as Record<string, unknown>)[key] = { ...baseValue, ...overrideValue };
		} else {
			// For primitives and arrays, override value wins
			(result as Record<string, unknown>)[key] = overrideValue;
		}
	}

	return result;
}

export type SettingsScope = "global" | "project";
export type SettingValueSource = SettingsScope | "default";

export interface SettingsStorage {
	withLock(scope: SettingsScope, fn: (current: string | undefined) => string | undefined): void;
}

export interface SettingsError {
	scope: SettingsScope;
	error: Error;
}

export class FileSettingsStorage implements SettingsStorage {
	private globalSettingsPath: string;
	private projectSettingsPath: string;

	constructor(cwd: string = process.cwd(), agentDir: string = getAgentDir()) {
		this.globalSettingsPath = join(agentDir, "settings.json");
		this.projectSettingsPath = join(cwd, CONFIG_DIR_NAME, "settings.json");
	}

	private acquireLockSyncWithRetry(path: string): () => void {
		const maxAttempts = 10;
		const delayMs = 20;
		let lastError: unknown;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				return lockfile.lockSync(path, { realpath: false });
			} catch (error) {
				const code =
					typeof error === "object" && error !== null && "code" in error
						? String((error as { code?: unknown }).code)
						: undefined;
				if (code !== "ELOCKED" || attempt === maxAttempts) {
					throw error;
				}
				lastError = error;
				const start = Date.now();
				while (Date.now() - start < delayMs) {
					// Sleep synchronously to avoid changing callers to async.
				}
			}
		}

		throw (lastError as Error) ?? new Error("Failed to acquire settings lock");
	}

	withLock(scope: SettingsScope, fn: (current: string | undefined) => string | undefined): void {
		const path = scope === "global" ? this.globalSettingsPath : this.projectSettingsPath;
		const dir = dirname(path);

		let release: (() => void) | undefined;
		try {
			// Only create directory and lock if file exists or we need to write
			const fileExists = existsSync(path);
			if (fileExists) {
				release = this.acquireLockSyncWithRetry(path);
			}
			const current = fileExists ? readFileSync(path, "utf-8") : undefined;
			const next = fn(current);
			if (next !== undefined) {
				// Only create directory when we actually need to write
				if (!existsSync(dir)) {
					mkdirSync(dir, { recursive: true });
				}
				if (!release) {
					release = this.acquireLockSyncWithRetry(path);
				}
				writeFileSync(path, next, "utf-8");
			}
		} finally {
			if (release) {
				release();
			}
		}
	}
}

export class InMemorySettingsStorage implements SettingsStorage {
	private global: string | undefined;
	private project: string | undefined;

	withLock(scope: SettingsScope, fn: (current: string | undefined) => string | undefined): void {
		const current = scope === "global" ? this.global : this.project;
		const next = fn(current);
		if (next !== undefined) {
			if (scope === "global") {
				this.global = next;
			} else {
				this.project = next;
			}
		}
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Path Utilities for generic get/set
// ═══════════════════════════════════════════════════════════════════════════

/** Get a nested value from an object by dot-path segments */
function pathGet(obj: Record<string, unknown>, segments: string[]): unknown {
	let current: unknown = obj;
	for (const segment of segments) {
		if (current === null || current === undefined || typeof current !== "object") {
			return undefined;
		}
		current = (current as Record<string, unknown>)[segment];
	}
	return current;
}

/** Set a nested value in an object by dot-path segments. Creates intermediate objects as needed. */
function pathSet(obj: Record<string, unknown>, segments: string[], value: unknown): void {
	let current = obj;
	for (let i = 0; i < segments.length - 1; i++) {
		const segment = segments[i];
		if (!(segment in current) || typeof current[segment] !== "object" || current[segment] === null) {
			current[segment] = {};
		}
		current = current[segment] as Record<string, unknown>;
	}
	current[segments[segments.length - 1]] = value;
}

export class SettingsManager {
	private storage: SettingsStorage;
	private globalSettings: Settings;
	private projectSettings: Settings;
	private settings: Settings;
	private modifiedFields = new Set<keyof Settings>(); // Track global fields modified during session
	private modifiedNestedFields = new Map<keyof Settings, Set<string>>(); // Track global nested field modifications
	private modifiedProjectFields = new Set<keyof Settings>(); // Track project fields modified during session
	private modifiedProjectNestedFields = new Map<keyof Settings, Set<string>>(); // Track project nested field modifications
	private globalSettingsLoadError: Error | null = null; // Track if global settings file had parse errors
	private projectSettingsLoadError: Error | null = null; // Track if project settings file had parse errors
	private writeQueue: Promise<void> = Promise.resolve();
	private errors: SettingsError[];

	private constructor(
		storage: SettingsStorage,
		initialGlobal: Settings,
		initialProject: Settings,
		globalLoadError: Error | null = null,
		projectLoadError: Error | null = null,
		initialErrors: SettingsError[] = [],
	) {
		this.storage = storage;
		this.globalSettings = initialGlobal;
		this.projectSettings = initialProject;
		this.globalSettingsLoadError = globalLoadError;
		this.projectSettingsLoadError = projectLoadError;
		this.errors = [...initialErrors];
		this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);
	}

	/** Create a SettingsManager that loads from files */
	static create(cwd: string = process.cwd(), agentDir: string = getAgentDir()): SettingsManager {
		const storage = new FileSettingsStorage(cwd, agentDir);
		return SettingsManager.fromStorage(storage);
	}

	/** Create a SettingsManager from an arbitrary storage backend */
	static fromStorage(storage: SettingsStorage): SettingsManager {
		const globalLoad = SettingsManager.tryLoadFromStorage(storage, "global");
		const projectLoad = SettingsManager.tryLoadFromStorage(storage, "project");
		const initialErrors: SettingsError[] = [];
		if (globalLoad.error) {
			initialErrors.push({ scope: "global", error: globalLoad.error });
		}
		if (projectLoad.error) {
			initialErrors.push({ scope: "project", error: projectLoad.error });
		}

		return new SettingsManager(
			storage,
			globalLoad.settings,
			projectLoad.settings,
			globalLoad.error,
			projectLoad.error,
			initialErrors,
		);
	}

	/** Create an in-memory SettingsManager (no file I/O) */
	static inMemory(settings: Partial<Settings> = {}): SettingsManager {
		const storage = new InMemorySettingsStorage();
		return new SettingsManager(storage, settings, {});
	}

	private static loadFromStorage(storage: SettingsStorage, scope: SettingsScope): Settings {
		let content: string | undefined;
		storage.withLock(scope, (current) => {
			content = current;
			return undefined;
		});

		if (!content) {
			return {};
		}
		const settings = JSON.parse(content);
		return SettingsManager.migrateSettings(settings);
	}

	private static tryLoadFromStorage(
		storage: SettingsStorage,
		scope: SettingsScope,
	): { settings: Settings; error: Error | null } {
		try {
			return { settings: SettingsManager.loadFromStorage(storage, scope), error: null };
		} catch (error) {
			return { settings: {}, error: error as Error };
		}
	}

	/** Migrate old settings format to new format */
	private static migrateSettings(settings: Record<string, unknown>): Settings {
		// Migrate queueMode -> steeringMode
		if ("queueMode" in settings && !("steeringMode" in settings)) {
			settings.steeringMode = settings.queueMode;
			delete settings.queueMode;
		}

		// Migrate legacy websockets boolean -> transport enum
		if (!("transport" in settings) && typeof settings.websockets === "boolean") {
			settings.transport = settings.websockets ? "websocket" : "sse";
			delete settings.websockets;
		}

		// Migrate old skills object format to new array format
		if (
			"skills" in settings &&
			typeof settings.skills === "object" &&
			settings.skills !== null &&
			!Array.isArray(settings.skills)
		) {
			const skillsSettings = settings.skills as {
				enableSkillCommands?: boolean;
				customDirectories?: unknown;
			};
			if (skillsSettings.enableSkillCommands !== undefined && settings.enableSkillCommands === undefined) {
				settings.enableSkillCommands = skillsSettings.enableSkillCommands;
			}
			if (Array.isArray(skillsSettings.customDirectories) && skillsSettings.customDirectories.length > 0) {
				settings.skills = skillsSettings.customDirectories;
			} else {
				delete settings.skills;
			}
		}

		return settings as Settings;
	}

	getGlobalSettings(): Settings {
		return structuredClone(this.globalSettings);
	}

	getProjectSettings(): Settings {
		return structuredClone(this.projectSettings);
	}

	async reload(): Promise<void> {
		await this.writeQueue;
		const globalLoad = SettingsManager.tryLoadFromStorage(this.storage, "global");
		if (!globalLoad.error) {
			this.globalSettings = globalLoad.settings;
			this.globalSettingsLoadError = null;
		} else {
			this.globalSettingsLoadError = globalLoad.error;
			this.recordError("global", globalLoad.error);
		}

		this.modifiedFields.clear();
		this.modifiedNestedFields.clear();
		this.modifiedProjectFields.clear();
		this.modifiedProjectNestedFields.clear();

		const projectLoad = SettingsManager.tryLoadFromStorage(this.storage, "project");
		if (!projectLoad.error) {
			this.projectSettings = projectLoad.settings;
			this.projectSettingsLoadError = null;
		} else {
			this.projectSettingsLoadError = projectLoad.error;
			this.recordError("project", projectLoad.error);
		}

		this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);
	}

	// ═══════════════════════════════════════════════════════════════════════
	// Generic Path-Based Access (registry-aware)
	// ═══════════════════════════════════════════════════════════════════════

	/** Generic path-based getter — uses registry for default fallback */
	get(path: string): unknown {
		const segments = path.split(".");
		const value = pathGet(this.settings as Record<string, unknown>, segments);
		if (value !== undefined) return value;
		// Fallback to schema default
		return settingsRegistry.get(path)?.default;
	}

	/** Read the raw value stored in a specific scope without merge/default fallback. */
	getScoped(scope: SettingsScope, path: string): unknown {
		const segments = path.split(".");
		const target = scope === "global" ? this.globalSettings : this.projectSettings;
		return pathGet(target as Record<string, unknown>, segments);
	}

	/** Return which scope currently provides the effective value for a path. */
	getValueSource(path: string): SettingValueSource {
		const projectValue = this.getScoped("project", path);
		if (projectValue !== undefined) return "project";
		const globalValue = this.getScoped("global", path);
		if (globalValue !== undefined) return "global";
		return "default";
	}

	/** Generic path-based setter — writes to global settings by default. */
	set(path: string, value: unknown): void {
		this.setScoped("global", path, value);
	}

	/** Generic path-based setter with explicit global/project write target. */
	setScoped(scope: SettingsScope, path: string, value: unknown): void {
		const segments = path.split(".");
		if (scope === "global") {
			pathSet(this.globalSettings as Record<string, unknown>, segments, value);
			this.markModified(segments[0] as keyof Settings, segments.length > 1 ? segments.slice(1).join(".") : undefined);
			this.save();
			return;
		}
		const projectSettings = structuredClone(this.projectSettings);
		pathSet(projectSettings as Record<string, unknown>, segments, value);
		this.markProjectModified(segments[0] as keyof Settings, segments.length > 1 ? segments.slice(1).join(".") : undefined);
		this.saveProjectSettings(projectSettings);
	}

	/** Apply additional overrides on top of current settings */
	applyOverrides(overrides: Partial<Settings>): void {
		this.settings = deepMergeSettings(this.settings, overrides);
	}

	// ─────────────────────────────────────────────────────────────────────────

	/** Mark a global field as modified during this session */
	private markModified(field: keyof Settings, nestedKey?: string): void {
		this.modifiedFields.add(field);
		if (nestedKey) {
			if (!this.modifiedNestedFields.has(field)) {
				this.modifiedNestedFields.set(field, new Set());
			}
			this.modifiedNestedFields.get(field)!.add(nestedKey);
		}
	}

	/** Mark a project field as modified during this session */
	private markProjectModified(field: keyof Settings, nestedKey?: string): void {
		this.modifiedProjectFields.add(field);
		if (nestedKey) {
			if (!this.modifiedProjectNestedFields.has(field)) {
				this.modifiedProjectNestedFields.set(field, new Set());
			}
			this.modifiedProjectNestedFields.get(field)!.add(nestedKey);
		}
	}

	private recordError(scope: SettingsScope, error: unknown): void {
		const normalizedError = error instanceof Error ? error : new Error(String(error));
		this.errors.push({ scope, error: normalizedError });
	}

	private clearModifiedScope(scope: SettingsScope): void {
		if (scope === "global") {
			this.modifiedFields.clear();
			this.modifiedNestedFields.clear();
			return;
		}

		this.modifiedProjectFields.clear();
		this.modifiedProjectNestedFields.clear();
	}

	private enqueueWrite(scope: SettingsScope, task: () => void): void {
		this.writeQueue = this.writeQueue
			.then(() => {
				task();
				this.clearModifiedScope(scope);
			})
			.catch((error) => {
				this.recordError(scope, error);
			});
	}

	private cloneModifiedNestedFields(source: Map<keyof Settings, Set<string>>): Map<keyof Settings, Set<string>> {
		const snapshot = new Map<keyof Settings, Set<string>>();
		for (const [key, value] of source.entries()) {
			snapshot.set(key, new Set(value));
		}
		return snapshot;
	}

	private persistScopedSettings(
		scope: SettingsScope,
		snapshotSettings: Settings,
		modifiedFields: Set<keyof Settings>,
		modifiedNestedFields: Map<keyof Settings, Set<string>>,
	): void {
		this.storage.withLock(scope, (current) => {
			const currentFileSettings = current
				? SettingsManager.migrateSettings(JSON.parse(current) as Record<string, unknown>)
				: {};
			const mergedSettings: Settings = { ...currentFileSettings };
			for (const field of modifiedFields) {
				const value = snapshotSettings[field];
				if (modifiedNestedFields.has(field) && typeof value === "object" && value !== null) {
					const nestedModified = modifiedNestedFields.get(field)!;
					const baseNested = (currentFileSettings[field] as Record<string, unknown>) ?? {};
					const inMemoryNested = value as Record<string, unknown>;
					const mergedNested = { ...baseNested };
					for (const nestedKey of nestedModified) {
						mergedNested[nestedKey] = inMemoryNested[nestedKey];
					}
					(mergedSettings as Record<string, unknown>)[field] = mergedNested;
				} else {
					(mergedSettings as Record<string, unknown>)[field] = value;
				}
			}

			return JSON.stringify(mergedSettings, null, 2);
		});
	}

	private save(): void {
		this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);

		if (this.globalSettingsLoadError) {
			return;
		}

		const snapshotGlobalSettings = structuredClone(this.globalSettings);
		const modifiedFields = new Set(this.modifiedFields);
		const modifiedNestedFields = this.cloneModifiedNestedFields(this.modifiedNestedFields);

		this.enqueueWrite("global", () => {
			this.persistScopedSettings("global", snapshotGlobalSettings, modifiedFields, modifiedNestedFields);
		});
	}

	private saveProjectSettings(settings: Settings): void {
		this.projectSettings = structuredClone(settings);
		this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);

		if (this.projectSettingsLoadError) {
			return;
		}

		const snapshotProjectSettings = structuredClone(this.projectSettings);
		const modifiedFields = new Set(this.modifiedProjectFields);
		const modifiedNestedFields = this.cloneModifiedNestedFields(this.modifiedProjectNestedFields);
		this.enqueueWrite("project", () => {
			this.persistScopedSettings("project", snapshotProjectSettings, modifiedFields, modifiedNestedFields);
		});
	}

	async flush(): Promise<void> {
		await this.writeQueue;
	}

	drainErrors(): SettingsError[] {
		const drained = [...this.errors];
		this.errors = [];
		return drained;
	}

	// ═══════════════════════════════════════════════════════════════════════
	// Adapter Layer — typed getters/setters delegating to generic get/set
	// New settings should NOT get their own getter/setter — use get()/set().
	// ═══════════════════════════════════════════════════════════════════════

	getLastChangelogVersion = (): string | undefined => this.get("lastChangelogVersion") as string | undefined;
	setLastChangelogVersion = (version: string) => this.set("lastChangelogVersion", version);

	getSessionDir = (): string | undefined => this.get("sessionDir") as string | undefined;

	getDefaultProvider = (): string | undefined => this.get("defaultProvider") as string | undefined;
	getDefaultModel = (): string | undefined => this.get("defaultModel") as string | undefined;
	setDefaultProvider = (provider: string) => this.set("defaultProvider", provider);
	setDefaultModel = (modelId: string) => this.set("defaultModel", modelId);

	setDefaultModelAndProvider(provider: string, modelId: string): void {
		this.set("defaultProvider", provider);
		this.set("defaultModel", modelId);
	}

	getSteeringMode = (): "all" | "one-at-a-time" => (this.get("steeringMode") ?? "one-at-a-time") as "all" | "one-at-a-time";
	setSteeringMode = (mode: "all" | "one-at-a-time") => this.set("steeringMode", mode);

	getFollowUpMode = (): "all" | "one-at-a-time" => (this.get("followUpMode") ?? "one-at-a-time") as "all" | "one-at-a-time";
	setFollowUpMode = (mode: "all" | "one-at-a-time") => this.set("followUpMode", mode);

	getTheme = (): string | undefined => this.get("theme") as string | undefined;
	setTheme = (theme: string) => this.set("theme", theme);

	getDefaultThinkingLevel = (): "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | undefined => this.get("defaultThinkingLevel") as "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | undefined;
	setDefaultThinkingLevel = (level: "off" | "minimal" | "low" | "medium" | "high" | "xhigh") => this.set("defaultThinkingLevel", level);

	getTransport = (): TransportSetting => (this.get("transport") ?? "sse") as TransportSetting;
	setTransport = (transport: TransportSetting) => this.set("transport", transport);

	getCompactionEnabled = (): boolean => (this.get("compaction.enabled") ?? true) as boolean;
	setCompactionEnabled = (enabled: boolean) => this.set("compaction.enabled", enabled);

	getCompactionReserveTokens = (): number => (this.get("compaction.reserveTokens") ?? 16384) as number;
	getCompactionKeepRecentTokens = (): number => (this.get("compaction.keepRecentTokens") ?? 20000) as number;

	getCompactionStrategy = (): CompactionStrategy => (this.get("compaction.strategy") ?? "context-full") as CompactionStrategy;
	setCompactionStrategy = (strategy: CompactionStrategy) => this.set("compaction.strategy", strategy);

	getHandoffAutoContinue = (): boolean => (this.get("compaction.handoffAutoContinue") ?? true) as boolean;
	setHandoffAutoContinue = (enabled: boolean) => this.set("compaction.handoffAutoContinue", enabled);

	getHandoffSaveToDisk = (): boolean => (this.get("compaction.handoffSaveToDisk") ?? false) as boolean;
	setHandoffSaveToDisk = (enabled: boolean) => this.set("compaction.handoffSaveToDisk", enabled);

	getCompactionSettings = () => ({
		enabled: this.getCompactionEnabled(),
		strategy: this.getCompactionStrategy(),
		reserveTokens: this.getCompactionReserveTokens(),
		keepRecentTokens: this.getCompactionKeepRecentTokens(),
		handoffAutoContinue: this.getHandoffAutoContinue(),
		handoffSaveToDisk: this.getHandoffSaveToDisk(),
	});

	getBranchSummarySettings = () => ({
		reserveTokens: (this.get("branchSummary.reserveTokens") ?? 16384) as number,
		skipPrompt: (this.get("branchSummary.skipPrompt") ?? false) as boolean,
	});

	getBranchSummarySkipPrompt = (): boolean => (this.get("branchSummary.skipPrompt") ?? false) as boolean;

	getRetryEnabled = (): boolean => (this.get("retry.enabled") ?? true) as boolean;
	setRetryEnabled = (enabled: boolean) => this.set("retry.enabled", enabled);

	getRetrySettings = () => ({
		enabled: this.getRetryEnabled(),
		maxRetries: (this.get("retry.maxRetries") ?? 3) as number,
		baseDelayMs: (this.get("retry.baseDelayMs") ?? 2000) as number,
		maxDelayMs: (this.get("retry.maxDelayMs") ?? 60000) as number,
	});

	getHideThinkingBlock = (): boolean => (this.get("hideThinkingBlock") ?? false) as boolean;
	setHideThinkingBlock = (hide: boolean) => this.set("hideThinkingBlock", hide);

	getShellPath = (): string | undefined => this.get("shellPath") as string | undefined;
	setShellPath = (path: string | undefined) => this.set("shellPath", path);

	getQuietStartup = (): boolean => (this.get("quietStartup") ?? false) as boolean;
	setQuietStartup = (quiet: boolean) => this.set("quietStartup", quiet);

	getShellCommandPrefix = (): string | undefined => this.get("shellCommandPrefix") as string | undefined;
	setShellCommandPrefix = (prefix: string | undefined) => this.set("shellCommandPrefix", prefix);

	getNpmCommand = (): string[] | undefined => {
		const cmd = this.get("npmCommand") as string[] | undefined;
		return cmd ? [...cmd] : undefined;
	};
	setNpmCommand = (command: string[] | undefined) => this.set("npmCommand", command ? [...command] : undefined);

	getCollapseChangelog = (): boolean => (this.get("collapseChangelog") ?? false) as boolean;
	setCollapseChangelog = (collapse: boolean) => this.set("collapseChangelog", collapse);

	// Array/record settings — keep manual implementation for structuredClone + project variants
	getPackages(): PackageSource[] {
		return [...(this.settings.packages ?? [])];
	}

	setPackages(packages: PackageSource[]): void {
		this.globalSettings.packages = packages;
		this.markModified("packages");
		this.save();
	}

	setProjectPackages(packages: PackageSource[]): void {
		const projectSettings = structuredClone(this.projectSettings);
		projectSettings.packages = packages;
		this.markProjectModified("packages");
		this.saveProjectSettings(projectSettings);
	}

	getExtensionPaths(): string[] {
		return [...(this.settings.extensions ?? [])];
	}

	setExtensionPaths(paths: string[]): void {
		this.globalSettings.extensions = paths;
		this.markModified("extensions");
		this.save();
	}

	setProjectExtensionPaths(paths: string[]): void {
		const projectSettings = structuredClone(this.projectSettings);
		projectSettings.extensions = paths;
		this.markProjectModified("extensions");
		this.saveProjectSettings(projectSettings);
	}

	getSkillPaths(): string[] {
		return [...(this.settings.skills ?? [])];
	}

	setSkillPaths(paths: string[]): void {
		this.globalSettings.skills = paths;
		this.markModified("skills");
		this.save();
	}

	setProjectSkillPaths(paths: string[]): void {
		const projectSettings = structuredClone(this.projectSettings);
		projectSettings.skills = paths;
		this.markProjectModified("skills");
		this.saveProjectSettings(projectSettings);
	}

	getPromptTemplatePaths(): string[] {
		return [...(this.settings.prompts ?? [])];
	}

	setPromptTemplatePaths(paths: string[]): void {
		this.globalSettings.prompts = paths;
		this.markModified("prompts");
		this.save();
	}

	setProjectPromptTemplatePaths(paths: string[]): void {
		const projectSettings = structuredClone(this.projectSettings);
		projectSettings.prompts = paths;
		this.markProjectModified("prompts");
		this.saveProjectSettings(projectSettings);
	}

	getThemePaths(): string[] {
		return [...(this.settings.themes ?? [])];
	}

	setThemePaths(paths: string[]): void {
		this.globalSettings.themes = paths;
		this.markModified("themes");
		this.save();
	}

	setProjectThemePaths(paths: string[]): void {
		const projectSettings = structuredClone(this.projectSettings);
		projectSettings.themes = paths;
		this.markProjectModified("themes");
		this.saveProjectSettings(projectSettings);
	}

	getEnableSkillCommands = (): boolean => (this.get("enableSkillCommands") ?? true) as boolean;
	setEnableSkillCommands = (enabled: boolean) => this.set("enableSkillCommands", enabled);

	getThinkingBudgets = (): ThinkingBudgetsSettings | undefined => this.get("thinkingBudgets") as ThinkingBudgetsSettings | undefined;

	getShowImages = (): boolean => (this.get("terminal.showImages") ?? true) as boolean;
	setShowImages = (show: boolean) => this.set("terminal.showImages", show);

	getClearOnShrink = (): boolean => {
		const val = this.get("terminal.clearOnShrink");
		if (val !== undefined) return val as boolean;
		return process.env.PI_CLEAR_ON_SHRINK === "1";
	};
	setClearOnShrink = (enabled: boolean) => this.set("terminal.clearOnShrink", enabled);

	getImageAutoResize = (): boolean => (this.get("images.autoResize") ?? true) as boolean;
	setImageAutoResize = (enabled: boolean) => this.set("images.autoResize", enabled);

	getBlockImages = (): boolean => (this.get("images.blockImages") ?? false) as boolean;
	setBlockImages = (blocked: boolean) => this.set("images.blockImages", blocked);

	getEnabledModels = (): string[] | undefined => this.get("enabledModels") as string[] | undefined;
	setEnabledModels = (patterns: string[] | undefined) => this.set("enabledModels", patterns);

	getDoubleEscapeAction = (): "fork" | "tree" | "none" => (this.get("doubleEscapeAction") ?? "tree") as "fork" | "tree" | "none";
	setDoubleEscapeAction = (action: "fork" | "tree" | "none") => this.set("doubleEscapeAction", action);

	getTreeFilterMode = (): "default" | "no-tools" | "user-only" | "labeled-only" | "all" => {
		const mode = this.get("treeFilterMode") as string | undefined;
		const valid = ["default", "no-tools", "user-only", "labeled-only", "all"];
		return mode && valid.includes(mode) ? (mode as "default" | "no-tools" | "user-only" | "labeled-only" | "all") : "default";
	};
	setTreeFilterMode = (mode: "default" | "no-tools" | "user-only" | "labeled-only" | "all") => this.set("treeFilterMode", mode);

	getShowHardwareCursor = (): boolean => (this.get("showHardwareCursor") ?? process.env.PI_HARDWARE_CURSOR === "1") as boolean;
	setShowHardwareCursor = (enabled: boolean) => this.set("showHardwareCursor", enabled);

	getEditorPaddingX = (): number => Math.max(0, Math.min(3, Math.floor((this.get("editorPaddingX") ?? 0) as number)));
	setEditorPaddingX = (padding: number) => this.set("editorPaddingX", Math.max(0, Math.min(3, Math.floor(padding))));

	getAutocompleteMaxVisible = (): number => Math.max(3, Math.min(20, Math.floor((this.get("autocompleteMaxVisible") ?? 5) as number)));
	setAutocompleteMaxVisible = (maxVisible: number) => this.set("autocompleteMaxVisible", Math.max(3, Math.min(20, Math.floor(maxVisible))));

	getCodeBlockIndent = (): string => (this.get("markdown.codeBlockIndent") ?? "  ") as string;

}
