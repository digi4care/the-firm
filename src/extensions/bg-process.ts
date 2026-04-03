/**
 * Background Process Extension
 *
 * Automatically backgrounds long-running bash commands (>10s by default).
 * Notifies the LLM when backgrounded processes complete - no polling needed.
 * Provides bg_status tool to check/stop backgrounded processes.
 */

import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

/** Default timeout before auto-backgrounding (milliseconds) */
const DEFAULT_BG_TIMEOUT_MS = 10_000;

interface BgProcess {
	pid: number;
	command: string;
	logFile: string;
	startedAt: number;
	finished: boolean;
	exitCode: number | null;
}

function isAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

export default function (pi: ExtensionAPI) {
	const bgProcesses = new Map<number, BgProcess>();

	// Override built-in bash tool with auto-backgrounding
	pi.registerTool({
		name: "bash",
		label: "Bash",
		description: `Execute a bash command. Output is truncated to 2000 lines or 50KB. If a command runs longer than ${DEFAULT_BG_TIMEOUT_MS / 1000}s (or custom timeout), it is automatically backgrounded and you get the PID + log file path. Use the bg_status tool to check on backgrounded processes.`,
		parameters: Type.Object({
			command: Type.String({ description: "Bash command to execute" }),
			timeout: Type.Optional(
				Type.Number({
					description: "Timeout in seconds (optional, default: 10s before backgrounding)",
				}),
			),
		}),
		async execute(toolCallId, params, signal) {
			const { command } = params;
			const userTimeout = params.timeout ? params.timeout * 1000 : undefined;
			const effectiveTimeout = userTimeout ?? DEFAULT_BG_TIMEOUT_MS;

			type Result = {
				content: { type: "text"; text: string }[];
				details: Record<string, unknown>;
				isError?: boolean;
			};

			return new Promise<Result>((resolve) => {
				let stdout = "";
				let stderr = "";
				let settled = false;
				let backgrounded = false;

				const child = spawn("bash", ["-c", command], {
					cwd: process.cwd(),
					env: { ...process.env },
					stdio: ["ignore", "pipe", "pipe"],
				});

				child.stdout?.on("data", (d: Buffer) => {
					const chunk = d.toString();
					stdout += chunk;
					// After backgrounding, append to log file
					if (backgrounded && child.pid) {
						try {
							appendFileSync(bgProcesses.get(child.pid)?.logFile ?? "", chunk);
						} catch {
							/* ignore */
						}
					}
				});

				child.stderr?.on("data", (d: Buffer) => {
					const chunk = d.toString();
					stderr += chunk;
					if (backgrounded && child.pid) {
						try {
							appendFileSync(bgProcesses.get(child.pid)?.logFile ?? "", chunk);
						} catch {
							/* ignore */
						}
					}
				});

				// Timeout handler: move to background
				const timer = setTimeout(() => {
					if (settled) return;
					settled = true;
					backgrounded = true;

					child.unref();

					const logFile = `/tmp/pi-bg-${Date.now()}.log`;
					const pid = child.pid!;

					// Write current output to log
					writeFileSync(logFile, stdout + stderr);

					const proc: BgProcess = {
						pid,
						command,
						logFile,
						startedAt: Date.now(),
						finished: false,
						exitCode: null,
					};
					bgProcesses.set(pid, proc);

					// Listen for completion and notify LLM
					child.on("close", (code) => {
						proc.finished = true;
						proc.exitCode = code;
						const fullOutput = stdout + stderr;
						const tail = fullOutput.slice(-3000);
						const truncated = fullOutput.length > 3000 ? "[...truncated]\n" + tail : tail;

						// Write final output to log
						try {
							writeFileSync(logFile, fullOutput);
						} catch {
							/* ignore */
						}

						pi.sendMessage(
							{
								customType: "bg-process",
								content: `[BG_PROCESS_DONE] PID ${pid} finished (exit ${code ?? "?"})\nCommand: ${command}\n\nOutput (last 3000 chars):\n${truncated}`,
								display: true,
							},
							{
								triggerTurn: true,
								deliverAs: "followUp",
							},
						);
					});

					const preview = (stdout + stderr).slice(0, 500);
					const text = `Command still running after ${effectiveTimeout / 1000}s, moved to background.\nPID: ${pid}\nLog: ${logFile}\nStop: kill ${pid}\n\nOutput so far:\n${preview}\n\n⏳ You will be notified automatically when it finishes. No need to poll.`;

					resolve({
						content: [{ type: "text", text }],
						details: {},
					});
				}, effectiveTimeout);

				// Normal completion (before timeout)
				child.on("close", (code) => {
					if (settled) return;
					settled = true;
					clearTimeout(timer);

					const output = (stdout + stderr).trim();
					const exitInfo = code !== 0 ? `\n[Exit code: ${code}]` : "";

					resolve({
						content: [{ type: "text", text: output + exitInfo }],
						details: {},
					});
				});

				child.on("error", (err) => {
					if (settled) return;
					settled = true;
					clearTimeout(timer);

					resolve({
						content: [{ type: "text", text: `Error: ${err.message}` }],
						details: {},
						isError: true,
					});
				});

				// Handle abort signal
				if (signal) {
					signal.addEventListener(
						"abort",
						() => {
							if (settled) return;
							settled = true;
							clearTimeout(timer);
							try {
								child.kill();
							} catch {
								/* ignore */
							}
							resolve({
								content: [{ type: "text", text: "Command cancelled." }],
								details: {},
							});
						},
						{ once: true },
					);
				}
			});
		},
	});

	// bg_status tool: check/manage background processes
	pi.registerTool({
		name: "bg_status",
		label: "Background Process Status",
		description:
			"Check status, view output, or stop background processes that were auto-backgrounded.",
		parameters: Type.Object({
			action: StringEnum(["list", "log", "stop"] as const, {
				description: "list=show all, log=view output, stop=kill process",
			}),
			pid: Type.Optional(
				Type.Number({
					description: "PID of the process (required for log/stop)",
				}),
			),
		}),
		async execute(toolCallId, params) {
			const { action, pid } = params;

			if (action === "list") {
				if (bgProcesses.size === 0) {
					return {
						content: [{ type: "text", text: "No background processes." }],
						details: {},
					};
				}
				const lines = [...bgProcesses.values()].map((p) => {
					const status = p.finished
						? `⚪ stopped (exit ${p.exitCode ?? "?"})`
						: isAlive(p.pid)
							? "🟢 running"
							: "⚪ stopped";
					return `PID: ${p.pid} | ${status} | Log: ${p.logFile}\n  Cmd: ${p.command}`;
				});
				return {
					content: [{ type: "text", text: lines.join("\n\n") }],
					details: {},
				};
			}

			if (!pid) {
				return {
					content: [{ type: "text", text: "Error: pid is required for log/stop" }],
					details: {},
					isError: true,
				};
			}

			const proc = bgProcesses.get(pid);

			if (action === "log") {
				const logFile = proc?.logFile;
				if (logFile && existsSync(logFile)) {
					try {
						const content = readFileSync(logFile, "utf-8");
						const tail = content.slice(-5000);
						const truncated =
							content.length > 5000 ? `[...truncated, showing last 5000 chars]\n${tail}` : tail;
						return {
							content: [{ type: "text", text: truncated || "(empty)" }],
							details: {},
						};
					} catch (e: unknown) {
						const message = e instanceof Error ? e.message : String(e);
						return {
							content: [{ type: "text", text: `Error reading log: ${message}` }],
							details: {},
							isError: true,
						};
					}
				}
				return {
					content: [{ type: "text", text: "No log available for this PID." }],
					details: {},
				};
			}

			if (action === "stop") {
				try {
					process.kill(pid, "SIGTERM");
					bgProcesses.delete(pid);
					return {
						content: [{ type: "text", text: `Process ${pid} terminated.` }],
						details: {},
					};
				} catch {
					bgProcesses.delete(pid);
					return {
						content: [
							{
								type: "text",
								text: `Process ${pid} not found (already stopped?).`,
							},
						],
						details: {},
					};
				}
			}

			return {
				content: [{ type: "text", text: `Unknown action: ${action}` }],
				details: {},
				isError: true,
			};
		},
	});

	// Cleanup: kill all background processes on session shutdown
	pi.on("session_shutdown", async () => {
		for (const [pid, proc] of bgProcesses) {
			if (!proc.finished) {
				try {
					process.kill(pid, "SIGTERM");
				} catch {
					/* ignore */
				}
			}
		}
		bgProcesses.clear();
	});
}
