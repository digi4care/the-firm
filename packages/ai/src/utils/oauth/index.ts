/**
 * OAuth credential management for AI providers.
 *
 * This module handles login, token refresh, and credential storage
 * for OAuth-based providers. Ported and extended from oh-my-pi.
 *
 * Full OAuth (token refresh) providers:
 * - Anthropic (Claude Pro/Max)
 * - GitHub Copilot
 * - Google Cloud Code Assist (Gemini CLI)
 * - Antigravity (Gemini 3, Claude, GPT-OSS via Google Cloud)
 * - OpenAI Codex (ChatGPT OAuth)
 * - GitLab Duo
 * - Kimi Code
 * - Cursor
 * - Kilo Gateway
 * - Perplexity (Pro/Max)
 *
 * API key providers (no refresh needed):
 * - Cerebras, Hugging Face, Kagi, LiteLLM, LM Studio, MiniMax, Moonshot,
 *   NanoGPT, NVIDIA, Ollama, OpenCode, Parallel, Qianfan, Qwen Portal,
 *   Synthetic, Tavily, Together, Venice, vLLM, Xiaomi, Z.AI, ZenMux,
 *   Cloudflare AI Gateway, Vercel AI Gateway, Alibaba Coding Plan
 */

// ============================================================================
// Exports
// ============================================================================

// Alibaba Coding Plan (API key)
export { loginAlibabaCodingPlan } from "./alibaba-coding-plan.js";
// Anthropic (OAuth)
export { anthropicOAuthProvider, loginAnthropic, refreshAnthropicToken } from "./anthropic.js";
// Cerebras (API key)
export { loginCerebras } from "./cerebras.js";
// Cloudflare AI Gateway (API key)
export { loginCloudflareAiGateway } from "./cloudflare-ai-gateway.js";
export type { CursorAuthParams } from "./cursor.js";
// Cursor (OAuth)
export {
	generateCursorAuthParams,
	loginCursor,
	pollCursorAuth,
	refreshCursorToken,
} from "./cursor.js";
// GitHub Copilot (OAuth)
export {
	getGitHubCopilotBaseUrl,
	githubCopilotOAuthProvider,
	loginGitHubCopilot,
	normalizeDomain,
	refreshGitHubCopilotToken,
} from "./github-copilot.js";
// GitLab Duo (OAuth)
export { loginGitLabDuo, refreshGitLabDuoToken } from "./gitlab-duo.js";
// Google Antigravity (OAuth)
export { antigravityOAuthProvider, loginAntigravity, refreshAntigravityToken } from "./google-antigravity.js";
// Google Gemini CLI (OAuth)
export { geminiCliOAuthProvider, loginGeminiCli, refreshGoogleCloudToken } from "./google-gemini-cli.js";
// Hugging Face Inference (API key)
export { loginHuggingface } from "./huggingface.js";
// Kagi (API key)
export { loginKagi } from "./kagi.js";
// Kilo Gateway (device code)
export { loginKilo } from "./kilo.js";
// Kimi Code (device code OAuth)
export { getKimiCommonHeaders, loginKimi, refreshKimiToken } from "./kimi.js";
// LiteLLM (API key)
export { loginLiteLLM } from "./litellm.js";
// LM Studio (optional API key)
export { DEFAULT_LOCAL_TOKEN, loginLmStudio } from "./lm-studio.js";
// MiniMax Coding Plan (API key)
export { loginMiniMaxCode, loginMiniMaxCodeCn } from "./minimax-code.js";
// Moonshot (API key)
export { loginMoonshot } from "./moonshot.js";
// NanoGPT (API key)
export { loginNanoGPT } from "./nanogpt.js";
// NVIDIA (API key)
export { loginNvidia } from "./nvidia.js";
// Ollama (optional API key)
export { loginOllama } from "./ollama.js";
// OpenAI Codex (ChatGPT OAuth)
export { loginOpenAICodex, openaiCodexOAuthProvider, refreshOpenAICodexToken } from "./openai-codex.js";
// OpenCode Zen / OpenCode Go (API key)
export { loginOpenCode } from "./opencode.js";
// Parallel (API key)
export { loginParallel } from "./parallel.js";
// Perplexity (Pro/Max)
export { loginPerplexity } from "./perplexity.js";
// Qianfan (API key)
export { loginQianfan } from "./qianfan.js";
// Qwen Portal (OAuth token/API key)
export { loginQwenPortal } from "./qwen-portal.js";
// Synthetic (API key)
export { loginSynthetic } from "./synthetic.js";
// Tavily (API key)
export { loginTavily } from "./tavily.js";
// Together (API key)
export { loginTogether } from "./together.js";
export * from "./types.js";
// Venice (API key)
export { loginVenice } from "./venice.js";
// Vercel AI Gateway (API key)
export { loginVercelAiGateway } from "./vercel-ai-gateway.js";
// vLLM (API key)
export { loginVllm } from "./vllm.js";
// Xiaomi MiMo (API key)
export { loginXiaomi } from "./xiaomi.js";
// Z.AI (API key)
export { loginZai } from "./zai.js";
// ZenMux (API key)
export { loginZenMux } from "./zenmux.js";

// ============================================================================
// Provider Registry
// ============================================================================

import { anthropicOAuthProvider } from "./anthropic.js";
import { githubCopilotOAuthProvider } from "./github-copilot.js";
import { antigravityOAuthProvider } from "./google-antigravity.js";
import { geminiCliOAuthProvider } from "./google-gemini-cli.js";
import { openaiCodexOAuthProvider } from "./openai-codex.js";
import type { OAuthCredentials, OAuthProviderId, OAuthProviderInfo, OAuthProviderInterface } from "./types.js";

const BUILT_IN_OAUTH_PROVIDERS: OAuthProviderInterface[] = [
	anthropicOAuthProvider,
	githubCopilotOAuthProvider,
	geminiCliOAuthProvider,
	antigravityOAuthProvider,
	openaiCodexOAuthProvider,
];

const oauthProviderRegistry = new Map<string, OAuthProviderInterface>(
	BUILT_IN_OAUTH_PROVIDERS.map((provider) => [provider.id, provider]),
);

/**
 * Get an OAuth provider by ID
 */
export function getOAuthProvider(id: OAuthProviderId): OAuthProviderInterface | undefined {
	return oauthProviderRegistry.get(id);
}

/**
 * Register a custom OAuth provider
 */
export function registerOAuthProvider(provider: OAuthProviderInterface): void {
	oauthProviderRegistry.set(provider.id, provider);
}

/**
 * Unregister an OAuth provider.
 *
 * If the provider is built-in, restores the built-in implementation.
 * Custom providers are removed completely.
 */
export function unregisterOAuthProvider(id: string): void {
	const builtInProvider = BUILT_IN_OAUTH_PROVIDERS.find((provider) => provider.id === id);
	if (builtInProvider) {
		oauthProviderRegistry.set(id, builtInProvider);
		return;
	}
	oauthProviderRegistry.delete(id);
}

/**
 * Reset OAuth providers to built-ins.
 */
export function resetOAuthProviders(): void {
	oauthProviderRegistry.clear();
	for (const provider of BUILT_IN_OAUTH_PROVIDERS) {
		oauthProviderRegistry.set(provider.id, provider);
	}
}

/**
 * Get all registered OAuth providers
 */
export function getOAuthProviders(): OAuthProviderInterface[] {
	return Array.from(oauthProviderRegistry.values());
}

/**
 * @deprecated Use getOAuthProviders() which returns OAuthProviderInterface[]
 */
export function getOAuthProviderInfoList(): OAuthProviderInfo[] {
	return getOAuthProviders().map((p) => ({
		id: p.id,
		name: p.name,
		available: true,
	}));
}

// ============================================================================
// High-level API
// ============================================================================

import { refreshCursorToken } from "./cursor.js";
import { refreshGitLabDuoToken } from "./gitlab-duo.js";
import { refreshKimiToken } from "./kimi.js";

/**
 * Refresh token for any OAuth provider (built-in or API-key based).
 * For API-key providers, returns credentials as-is (keys don't expire).
 */
export async function refreshOAuthToken(
	providerId: OAuthProviderId,
	credentials: OAuthCredentials,
): Promise<OAuthCredentials> {
	// Try the provider registry first (proper OAuthProviderInterface)
	const provider = oauthProviderRegistry.get(providerId);
	if (provider?.refreshToken) {
		return provider.refreshToken(credentials);
	}

	// Handle ported providers that use standalone refresh functions
	switch (providerId) {
		case "kimi-code":
			return refreshKimiToken(credentials.refresh);
		case "cursor":
			return refreshCursorToken(credentials.refresh);
		case "gitlab-duo":
			return refreshGitLabDuoToken(credentials);
		case "kilo":
			// Kilo tokens don't expire in the standard way
			return credentials;
		case "perplexity":
			// Perplexity tokens are handled via JWT expiry in getOAuthApiKey
			return credentials;
		// API key providers — keys don't expire
		case "cerebras":
		case "huggingface":
		case "opencode-zen":
		case "opencode-go":
		case "nvidia":
		case "nanogpt":
		case "synthetic":
		case "together":
		case "litellm":
		case "lm-studio":
		case "ollama":
		case "xiaomi":
		case "zai":
		case "qianfan":
		case "venice":
		case "minimax-code":
		case "minimax-code-cn":
		case "moonshot":
		case "kagi":
		case "cloudflare-ai-gateway":
		case "vercel-ai-gateway":
		case "qwen-portal":
		case "zenmux":
		case "vllm":
		case "alibaba-coding-plan":
		case "parallel":
		case "tavily":
			return credentials;
		default:
			throw new Error(`Unknown OAuth provider: ${providerId}`);
	}
}

function getPerplexityJwtExpiryMs(token: string): number | undefined {
	const parts = token.split(".");
	if (parts.length !== 3) return undefined;
	const payload = parts[1];
	if (!payload) return undefined;
	try {
		const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown };
		if (typeof decoded.exp !== "number" || !Number.isFinite(decoded.exp)) return undefined;
		return decoded.exp * 1000 - 5 * 60_000;
	} catch {
		return undefined;
	}
}

/**
 * Get API key for a provider from OAuth credentials.
 * Automatically refreshes expired tokens.
 *
 * @returns API key string and updated credentials, or null if no credentials
 * @throws Error if refresh fails
 */
export async function getOAuthApiKey(
	providerId: OAuthProviderId,
	credentials: Record<string, OAuthCredentials>,
): Promise<{ newCredentials: OAuthCredentials; apiKey: string } | null> {
	let creds = credentials[providerId];
	if (!creds) {
		return null;
	}

	// Perplexity: check JWT expiry
	if (providerId === "perplexity") {
		const normalizedExpires =
			creds.expires > 0 && creds.expires < 10_000_000_000 ? creds.expires * 1000 : creds.expires;
		const jwtExpiry = getPerplexityJwtExpiryMs(creds.access);
		const expires = jwtExpiry && jwtExpiry > normalizedExpires ? jwtExpiry : normalizedExpires;
		if (expires !== creds.expires) {
			creds = { ...creds, expires };
		}
	}

	// Refresh if expired
	if (Date.now() >= creds.expires) {
		try {
			creds = await refreshOAuthToken(providerId, creds);
		} catch (refreshError) {
			if (providerId === "perplexity") {
				const jwtExpiry = getPerplexityJwtExpiryMs(creds.access);
				if (jwtExpiry && Date.now() < jwtExpiry) {
					const fallbackCredentials = { ...creds, expires: jwtExpiry };
					return { newCredentials: fallbackCredentials, apiKey: fallbackCredentials.access };
				}
			}
			const reason = refreshError instanceof Error ? refreshError.message : String(refreshError);
			throw new Error(`Failed to refresh OAuth token for ${providerId}: ${reason}`);
		}
	}

	// For providers that need projectId, return JSON
	const needsProjectId = providerId === "google-gemini-cli" || providerId === "google-antigravity";
	const apiKey = needsProjectId
		? JSON.stringify({
				token: creds.access,
				projectId: (creds as any).projectId,
				refreshToken: creds.refresh,
				expiresAt: creds.expires,
			})
		: creds.access;
	return { newCredentials: creds, apiKey };
}
