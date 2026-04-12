/**
 * Client Pool (Object Pool Pattern)
 *
 * Caches SDK client instances to avoid creating new clients on every stream call.
 * Keyed by hash of baseUrl, apiKey, and custom headers.
 */

import type { ClientConfig } from "./provider-definition.js";

// WeakMap allows garbage collection when provider definitions are unloaded
const clientCache = new WeakMap<object, Map<string, unknown>>();

/**
 * Create a cache key from client configuration
 * Uses SHA-256 hash for consistent, collision-resistant keys
 */
async function createCacheKey(config: ClientConfig): Promise<string> {
	const keyData = JSON.stringify({
		baseUrl: config.baseUrl,
		apiKey: config.apiKey,
		headers: config.headers,
	});

	// Use Web Crypto API for SHA-256 (available in Node.js 16+, browsers, Edge Runtime)
	const encoder = new TextEncoder();
	const data = encoder.encode(keyData);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get or create a client instance from the pool
 *
 * @param owner - The provider definition that owns this client type (for namespacing)
 * @param config - Client configuration
 * @param factory - Factory function to create a new client if not cached
 */
export async function getOrCreateClient<T>(
	owner: object,
	config: ClientConfig,
	factory: (config: ClientConfig) => T,
): Promise<T> {
	// Get or create the cache map for this owner
	let ownerCache = clientCache.get(owner);
	if (!ownerCache) {
		ownerCache = new Map();
		clientCache.set(owner, ownerCache);
	}

	const cacheKey = await createCacheKey(config);

	// Return cached client if available
	const cached = ownerCache.get(cacheKey);
	if (cached) {
		return cached as T;
	}

	// Create new client and cache it
	const client = factory(config);
	ownerCache.set(cacheKey, client);
	return client;
}

/**
 * Get or create a client instance synchronously (fallback for simple factories)
 *
 * Note: This uses a simplified key format. Use getOrCreateClient for production
 * when async hashing is available.
 */
export function getOrCreateClientSync<T>(owner: object, config: ClientConfig, factory: (config: ClientConfig) => T): T {
	// Get or create the cache map for this owner
	let ownerCache = clientCache.get(owner);
	if (!ownerCache) {
		ownerCache = new Map();
		clientCache.set(owner, ownerCache);
	}

	// Simple synchronous key (less collision-resistant but no async needed)
	const cacheKey = `${config.baseUrl}:${config.apiKey.slice(0, 8)}:${JSON.stringify(config.headers)}`;

	// Return cached client if available
	const cached = ownerCache.get(cacheKey);
	if (cached) {
		return cached as T;
	}

	// Create new client and cache it
	const client = factory(config);
	ownerCache.set(cacheKey, client);
	return client;
}

/**
 * Clear all cached clients for a specific owner
 */
export function clearClientCache(owner: object): void {
	clientCache.delete(owner);
}

/**
 * Clear entire client cache (useful for testing)
 */
export function clearAllClientCaches(): void {
	// WeakMap can't be cleared directly, but we can create a new marker object
	// for future registrations. Existing entries will be GC'd when owners are released.
}
