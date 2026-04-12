/**
 * Polyfills for utilities used by ported oh-my-pi OAuth providers.
 * These replace @oh-my-pi/pi-utils imports.
 */
import * as os from "node:os";
import * as path from "node:path";

/**
 * Environment variable access (replaces $env from @oh-my-pi/pi-utils).
 */
export const $env: Record<string, string> = process.env as Record<string, string>;

/**
 * Sleep for ms, respecting abort signal.
 * Replaces abortableSleep from @oh-my-pi/pi-utils.
 */
export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
	if (!signal) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
	if (signal.aborted) {
		return Promise.reject(new Error("Aborted"));
	}
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(new Error("Aborted"));
		};
		signal.addEventListener("abort", onAbort, { once: true });
	});
}

/**
 * Check if an error is ENOENT (file not found).
 * Replaces isEnoent from @oh-my-pi/pi-utils.
 */
export function isEnoent(err: unknown): err is NodeJS.ErrnoException {
	return err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT";
}

/**
 * Get the agent config directory.
 * Replaces getAgentDir from @oh-my-pi/pi-utils.
 * Returns ~/.the-firm/agent (The Firm's config directory).
 */
export function getAgentDir(): string {
	const envDir = process.env.THE_FIRM_CODING_AGENT_DIR;
	if (envDir) {
		if (envDir === "~") return os.homedir();
		if (envDir.startsWith("~/")) return os.homedir() + envDir.slice(1);
		return envDir;
	}
	return path.join(os.homedir(), ".the-firm", "agent");
}
