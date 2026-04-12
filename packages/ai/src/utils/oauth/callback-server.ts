/**
 * Abstract base class for OAuth flows with local callback servers.
 *
 * Handles:
 * - Port allocation (tries expected port, falls back to random)
 * - Callback server setup and request handling
 * - Common OAuth flow logic
 *
 * Providers extend this and implement:
 * - generateAuthUrl(): Build provider-specific authorization URL
 * - exchangeToken(): Exchange authorization code for tokens
 *
 * Uses Node.js http.createServer for cross-platform compatibility.
 */
import type { Server } from "node:http";

import { oauthErrorHtml, oauthSuccessHtml } from "./oauth-page.js";
import type { OAuthController, OAuthCredentials } from "./types.js";

const DEFAULT_TIMEOUT = 300_000;
const DEFAULT_HOSTNAME = "localhost";
const CALLBACK_PATH = "/callback";

export type CallbackResult = { code: string; state: string };

export interface OAuthCallbackFlowOptions {
	preferredPort: number;
	callbackPath?: string;
	callbackHostname?: string;
	/** Exact redirect URI advertised to the provider; disables port fallback. */
	redirectUri?: string;
}

/**
 * Abstract base class for OAuth flows with local callback servers.
 */
export abstract class OAuthCallbackFlow {
	ctrl: OAuthController;
	preferredPort: number;
	callbackPath: string;
	callbackHostname: string;
	redirectUri?: string;
	private callbackResolve?: (result: CallbackResult) => void;
	private callbackReject?: (error: string) => void;

	constructor(
		ctrl: OAuthController,
		preferredPortOrOptions: number | OAuthCallbackFlowOptions,
		callbackPath: string = CALLBACK_PATH,
	) {
		this.ctrl = ctrl;
		if (typeof preferredPortOrOptions === "number") {
			this.preferredPort = preferredPortOrOptions;
			this.callbackPath = callbackPath;
			this.callbackHostname = DEFAULT_HOSTNAME;
			return;
		}

		this.preferredPort = preferredPortOrOptions.preferredPort;
		this.callbackPath = preferredPortOrOptions.callbackPath ?? CALLBACK_PATH;
		this.callbackHostname = preferredPortOrOptions.callbackHostname ?? DEFAULT_HOSTNAME;
		this.redirectUri = preferredPortOrOptions.redirectUri;
	}

	/**
	 * Generate provider-specific authorization URL.
	 */
	abstract generateAuthUrl(state: string, redirectUri: string): Promise<{ url: string; instructions?: string }>;

	/**
	 * Exchange authorization code for OAuth tokens.
	 */
	abstract exchangeToken(code: string, state: string, redirectUri: string): Promise<OAuthCredentials>;

	/**
	 * Generate CSRF state token.
	 */
	generateState(): string {
		const bytes = new Uint8Array(16);
		crypto.getRandomValues(bytes);
		return Array.from(bytes)
			.map((value) => value.toString(16).padStart(2, "0"))
			.join("");
	}

	/**
	 * Execute the OAuth login flow.
	 */
	async login(): Promise<OAuthCredentials> {
		const state = this.generateState();
		const { redirectUri, close } = await this.startCallbackServer(state);

		try {
			const { url: authUrl, instructions } = await this.generateAuthUrl(state, redirectUri);

			this.ctrl.onAuth?.({ url: authUrl, instructions });
			this.ctrl.onProgress?.("Waiting for browser authentication...");

			const { code } = await this.waitForCallback(state);

			this.ctrl.onProgress?.("Exchanging authorization code for tokens...");

			return await this.exchangeToken(code, state, redirectUri);
		} finally {
			close();
		}
	}

	/**
	 * Start callback server, trying preferred port first, falling back to random.
	 */
	private async startCallbackServer(
		expectedState: string,
	): Promise<{ server: Server; redirectUri: string; close: () => void }> {
		const { createServer } = await import("node:http");

		const tryStart = (port: number): Promise<{ server: Server; actualPort: number }> => {
			return new Promise((resolve, reject) => {
				const server = createServer((req, res) => this.handleCallback(req, res, expectedState));
				server.on("error", reject);
				server.listen(port, this.callbackHostname, () => {
					const addr = server.address();
					const actualPort = typeof addr === "object" && addr ? addr.port : port;
					resolve({ server, actualPort });
				});
			});
		};

		try {
			const { server, actualPort } = await tryStart(this.preferredPort);
			const redirectUri = this.redirectUri ?? `http://${this.callbackHostname}:${actualPort}${this.callbackPath}`;
			return {
				server,
				redirectUri,
				close: () => server.close(),
			};
		} catch {
			if (this.redirectUri) {
				throw new Error(
					`OAuth callback port ${this.preferredPort} unavailable; cannot fall back to a random port when redirectUri is set`,
				);
			}
			const { server, actualPort } = await tryStart(0);
			const redirectUri = `http://${this.callbackHostname}:${actualPort}${this.callbackPath}`;
			this.ctrl.onProgress?.(`Preferred port ${this.preferredPort} unavailable, using port ${actualPort}`);
			return {
				server,
				redirectUri,
				close: () => server.close(),
			};
		}
	}

	/**
	 * Handle OAuth callback HTTP request (Node.js http handler).
	 */
	private handleCallback(
		req: import("node:http").IncomingMessage,
		res: import("node:http").ServerResponse,
		expectedState: string,
	): void {
		const url = new URL(req.url ?? "/", `http://${this.callbackHostname}`);

		if (url.pathname !== this.callbackPath) {
			res.writeHead(404).end("Not Found");
			return;
		}

		const code = url.searchParams.get("code");
		const state = url.searchParams.get("state") || "";
		const error = url.searchParams.get("error") || "";
		const errorDescription = url.searchParams.get("error_description") || error;

		type OkState = { ok: true; code: string; state: string };
		type ErrorState = { ok?: false; error?: string };
		let resultState: OkState | ErrorState;

		if (error) {
			resultState = { ok: false, error: `Authorization failed: ${errorDescription}` };
		} else if (!code) {
			resultState = { ok: false, error: "Missing authorization code" };
		} else if (expectedState && state !== expectedState) {
			resultState = { ok: false, error: "State mismatch - possible CSRF attack" };
		} else {
			resultState = { ok: true, code, state };
		}

		// Signal to waitForCallback
		const resolve = this.callbackResolve;
		const reject = this.callbackReject;
		queueMicrotask(() => {
			if (resultState.ok) {
				resolve?.({ code: resultState.code, state: resultState.state });
			} else {
				reject?.(resultState.error ?? "Unknown error");
			}
		});

		const html = resultState.ok
			? oauthSuccessHtml(JSON.stringify(resultState))
			: oauthErrorHtml(resultState.error ?? "Unknown error");

		res.writeHead(resultState.ok ? 200 : 500, { "Content-Type": "text/html" }).end(html);
	}

	/**
	 * Wait for OAuth callback or manual input (whichever comes first).
	 */
	private waitForCallback(expectedState: string): Promise<CallbackResult> {
		const timeoutSignal = AbortSignal.timeout(DEFAULT_TIMEOUT);
		const signal = this.ctrl.signal ? AbortSignal.any([this.ctrl.signal, timeoutSignal]) : timeoutSignal;

		const callbackPromise = new Promise<CallbackResult>((resolve, reject) => {
			this.callbackResolve = resolve;
			this.callbackReject = reject;

			signal.addEventListener("abort", () => {
				this.callbackResolve = undefined;
				this.callbackReject = undefined;
				reject(new Error(`OAuth callback cancelled: ${signal.reason}`));
			});
		});

		if (this.ctrl.onManualCodeInput) {
			const requestManualInput = this.ctrl.onManualCodeInput;
			const manualPromise = (async (): Promise<CallbackResult> => {
				while (true) {
					const result = await Promise.race([
						callbackPromise,
						requestManualInput()
							.then((input): CallbackResult | null => {
								const parsed = parseCallbackInput(input);
								if (!parsed.code) return null;
								if (expectedState && parsed.state && parsed.state !== expectedState) return null;
								return { code: parsed.code, state: parsed.state ?? "" };
							})
							.catch((): CallbackResult | null => null),
					]);
					if (result) return result;
				}
			})();

			return Promise.race([callbackPromise, manualPromise]);
		}

		return callbackPromise;
	}
}

/**
 * Parse a redirect URL or code string to extract code and state.
 */
export function parseCallbackInput(input: string): { code?: string; state?: string } {
	const value = input.trim();
	if (!value) return {};

	try {
		const url = new URL(value);
		return {
			code: url.searchParams.get("code") ?? undefined,
			state: url.searchParams.get("state") ?? undefined,
		};
	} catch {
		// Not a URL
	}

	if (value.includes("code=")) {
		const params = new URLSearchParams(value.replace(/^[?#]/, ""));
		return {
			code: params.get("code") ?? undefined,
			state: params.get("state") ?? undefined,
		};
	}

	const [code, state] = value.split("#", 2);
	return { code, state };
}
