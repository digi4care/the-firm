/**
 * Types for background process management
 */

export interface BgProcess {
	pid: number;
	command: string;
	logFile: string;
	startedAt: number;
	finished: boolean;
	exitCode: number | null;
}

export interface BgResult {
	content: { type: "text"; text: string }[];
	details: Record<string, unknown>;
	isError?: boolean;
}

export interface BgStatus {
	pid: number;
	command: string;
	status: "running" | "stopped" | "finished";
	exitCode: number | null;
	logFile: string;
}

export class BgProcessError extends Error {
	constructor(
		message: string,
		public readonly code: string,
	) {
		super(message);
		this.name = "BgProcessError";
	}
}
