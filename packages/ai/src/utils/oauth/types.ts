import type { Api, Model } from "../../types.js";

export type OAuthCredentials = {
	refresh: string;
	access: string;
	expires: number;
	[key: string]: unknown;
};

export type OAuthProviderId = string;

/** @deprecated Use OAuthProviderId instead */
export type OAuthProvider = OAuthProviderId;

export type OAuthPrompt = {
	message: string;
	placeholder?: string;
	allowEmpty?: boolean;
};

export type OAuthAuthInfo = {
	url: string;
	instructions?: string;
};

/**
 * Subset of login callbacks — used by providers that don't need onPrompt.
 * Compatible with OAuthLoginCallbacks (which extends this).
 */
export interface OAuthController {
	onAuth?(info: OAuthAuthInfo): void;
	onProgress?(message: string): void;
	onManualCodeInput?(): Promise<string>;
	onPrompt?(prompt: OAuthPrompt): Promise<string>;
	signal?: AbortSignal;
}

export interface OAuthLoginCallbacks extends OAuthController {
	onAuth: (info: OAuthAuthInfo) => void;
	onPrompt: (prompt: OAuthPrompt) => Promise<string>;
}

export interface OAuthProviderInterface {
	readonly id: OAuthProviderId;
	readonly name: string;

	readonly sourceId?: string;

	/** Run the login flow, return credentials to persist */
	login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials | string>;

	/** Whether login uses a local callback server and supports manual code input. */
	usesCallbackServer?: boolean;

	/** Refresh expired credentials, return updated credentials to persist */
	refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials>;

	/** Convert credentials to API key string for the provider */
	getApiKey(credentials: OAuthCredentials): string;

	/** Optional: modify models for this provider (e.g., update baseUrl) */
	modifyModels?(models: Model<Api>[], credentials: OAuthCredentials): Model<Api>[];
}

/** @deprecated Use OAuthProviderInterface instead */
export interface OAuthProviderInfo {
	id: OAuthProviderId;
	name: string;
	available: boolean;
}
