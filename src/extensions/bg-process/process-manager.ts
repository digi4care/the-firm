/**
 * Background process manager
 */

import { readLogTail } from "./log-writer.js";
import type { BgProcess, BgStatus } from "./types.js";

const DEFAULT_BG_TIMEOUT_MS = 10_000;

export class BgProcessManager {
	private processes = new Map<number, BgProcess>();

	isAlive(pid: number): boolean {
		try {
			process.kill(pid, 0);
			return true;
		} catch {
			return false;
		}
	}

	register(pid: number, command: string, logFile: string): BgProcess {
		const proc: BgProcess = {
			pid,
			command,
			logFile,
			startedAt: Date.now(),
			finished: false,
			exitCode: null,
		};
		this.processes.set(pid, proc);
		return proc;
	}

	get(pid: number): BgProcess | undefined {
		return this.processes.get(pid);
	}

	markFinished(pid: number, exitCode: number | null): void {
		const proc = this.processes.get(pid);
		if (proc) {
			proc.finished = true;
			proc.exitCode = exitCode;
		}
	}

	delete(pid: number): void {
		this.processes.delete(pid);
	}

	getAll(): BgProcess[] {
		return Array.from(this.processes.values());
	}

	getStatus(pid: number): BgStatus | null {
		const proc = this.processes.get(pid);
		if (!proc) return null;

		let status: "running" | "stopped" | "finished";
		if (proc.finished) {
			status = "finished";
		} else if (this.isAlive(pid)) {
			status = "running";
		} else {
			status = "stopped";
		}

		return {
			pid: proc.pid,
			command: proc.command,
			status,
			exitCode: proc.exitCode,
			logFile: proc.logFile,
		};
	}

	getAllStatuses(): BgStatus[] {
		return this.getAll()
			.map((p) => this.getStatus(p.pid))
			.filter((s): s is BgStatus => s !== null);
	}

	stop(pid: number): boolean {
		try {
			process.kill(pid, "SIGTERM");
			this.delete(pid);
			return true;
		} catch {
			this.delete(pid);
			return false;
		}
	}

	stopAll(): void {
		for (const [pid, proc] of this.processes) {
			if (!proc.finished) {
				try {
					process.kill(pid, "SIGTERM");
				} catch {
					// Ignore
				}
			}
		}
		this.processes.clear();
	}

	formatPreview(text: string, maxLen = 500): string {
		return text.slice(0, maxLen);
	}

	formatDoneMessage(pid: number, command: string, logFile: string): string {
		const tail = readLogTail(logFile, 3000) || "(no output)";
		return `[BG_PROCESS_DONE] PID ${pid} finished\nCommand: ${command}\n\nOutput (last 3000 chars):\n${tail}`;
	}

	formatBackgroundedMessage(
		pid: number,
		_command: string,
		logFile: string,
		preview: string,
		timeoutSec: number,
	): string {
		return `Command still running after ${timeoutSec}s, moved to background.\nPID: ${pid}\nLog: ${logFile}\nStop: kill ${pid}\n\nOutput so far:\n${preview}\n\n⏳ You will be notified automatically when it finishes. No need to poll.`;
	}
}

export { DEFAULT_BG_TIMEOUT_MS };
