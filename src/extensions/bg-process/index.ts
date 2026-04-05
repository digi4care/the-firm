/**
 * Background Process Extension
 *
 * Automatically backgrounds long-running bash commands (>10s by default).
 * Notifies the LLM when backgrounded processes complete - no polling needed.
 * Provides bg_status tool to check/stop backgrounded processes.
 */

import { spawn } from "node:child_process";
import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { getSetting } from "../settings/lib/settings-store.js";
import { appendLog, readLog, writeLog } from "./log-writer.js";
import { BgProcessManager, DEFAULT_BG_TIMEOUT_MS } from "./process-manager.js";
import type { BgResult } from "./types.js";

export default function registerBgProcess(pi: ExtensionAPI) {
	const manager = new BgProcessManager();

	function isEnabled(): boolean {
		const val = getSetting("theFirm.bgProcessTracking");
		return val !== false; // default true
	}

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

		async execute(_toolCallId, params, signal) {
			// If bg tracking disabled, run command directly without auto-backgrounding
			if (!isEnabled()) {
				const { command } = params;
				return new Promise<BgResult>((resolve) => {
					let stdout = "";
					let stderr = "";
					const child = spawn("bash", ["-c", command], {
						cwd: process.cwd(),
						env: { ...process.env },
						stdio: ["ignore", "pipe", "pipe"],
					});
					child.stdout?.on("data", (d: Buffer) => {
						stdout += d.toString();
					});
					child.stderr?.on("data", (d: Buffer) => {
						stderr += d.toString();
					});
					child.on("close", (code) => {
						const output = (stdout + stderr).trim();
						const exitInfo = code !== 0 ? `\n[Exit code: ${code}]` : "";
						resolve({ content: [{ type: "text", text: output + exitInfo }], details: {} });
					});
					child.on("error", (err) => {
						resolve({
							content: [{ type: "text", text: `Error: ${err.message}` }],
							details: {},
							isError: true,
						});
					});
				});
			}

			const { command } = params;
			const userTimeout = params.timeout ? params.timeout * 1000 : undefined;
			const effectiveTimeout = userTimeout ?? DEFAULT_BG_TIMEOUT_MS;

			return new Promise<BgResult>((resolve) => {
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
					if (backgrounded && child.pid) {
						appendLog(manager.get(child.pid)?.logFile ?? "", chunk);
					}
				});

				child.stderr?.on("data", (d: Buffer) => {
					const chunk = d.toString();
					stderr += chunk;
					if (backgrounded && child.pid) {
						appendLog(manager.get(child.pid)?.logFile ?? "", chunk);
					}
				});

				// Timeout handler: move to background
				const timer = setTimeout(() => {
					if (settled) return;
					settled = true;
					backgrounded = true;

					child.unref();

					const logFile = `/tmp/pi-bg-${Date.now()}.log`;
					const pid = child.pid;
					if (!pid) {
						resolve({
							content: [{ type: "text", text: "Error: Failed to get process ID" }],
							details: {},
							isError: true,
						});
						return;
					}

					writeLog(logFile, stdout + stderr);
					manager.register(pid, command, logFile);

					// Listen for completion and notify LLM
					child.on("close", (code) => {
						manager.markFinished(pid, code);
						const fullOutput = stdout + stderr;
						writeLog(logFile, fullOutput);

						pi.sendMessage(
							{
								customType: "bg-process",
								content: manager.formatDoneMessage(pid, command, logFile),
								display: true,
							},
							{
								triggerTurn: true,
								deliverAs: "followUp",
							},
						);
					});

					const preview = manager.formatPreview(stdout + stderr);
					const text = manager.formatBackgroundedMessage(
						pid,
						command,
						logFile,
						preview,
						effectiveTimeout / 1000,
					);

					resolve({ content: [{ type: "text", text }], details: {} });
				}, effectiveTimeout);

				// Normal completion (before timeout)
				child.on("close", (code) => {
					if (settled) return;
					settled = true;
					clearTimeout(timer);

					const output = (stdout + stderr).trim();
					const exitInfo = code !== 0 ? `\n[Exit code: ${code}]` : "";

					resolve({ content: [{ type: "text", text: output + exitInfo }], details: {} });
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
							resolve({ content: [{ type: "text", text: "Command cancelled." }], details: {} });
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

		async execute(_toolCallId, params) {
			const { action, pid } = params;

			if (action === "list") {
				const statuses = manager.getAllStatuses();
				if (statuses.length === 0) {
					return { content: [{ type: "text", text: "No background processes." }], details: {} };
				}

				const lines = statuses.map((p) => {
					const statusStr =
						p.status === "finished"
							? `⚪ stopped (exit ${p.exitCode ?? "?"})`
							: p.status === "running"
								? "🟢 running"
								: "⚪ stopped";
					return `PID: ${p.pid} | ${statusStr} | Log: ${p.logFile}\n  Cmd: ${p.command}`;
				});

				return { content: [{ type: "text", text: lines.join("\n\n") }], details: {} };
			}

			if (!pid) {
				return {
					content: [{ type: "text", text: "Error: pid is required for log/stop" }],
					details: {},
					isError: true,
				};
			}

			if (action === "log") {
				const proc = manager.get(pid);
				const logFile = proc?.logFile;
				const content = logFile ? readLog(logFile) : null;

				if (content) {
					return { content: [{ type: "text", text: content || "(empty)" }], details: {} };
				}
				return { content: [{ type: "text", text: "No log available for this PID." }], details: {} };
			}

			if (action === "stop") {
				const success = manager.stop(pid);
				return {
					content: [
						{
							type: "text",
							text: success
								? `Process ${pid} terminated.`
								: `Process ${pid} not found (already stopped?).`,
						},
					],
					details: {},
				};
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
		manager.stopAll();
	});
}
