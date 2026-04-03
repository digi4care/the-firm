/**
 * Helpers for formatting client options and resolving selections.
 *
 * Known limitations:
 * - If a client's display name is "+ Create new client", it will be indistinguishable
 *   from the create-new option. First match wins in resolveSelectedClient.
 * - If multiple clients share the same display name, the first match wins when
 *   resolving the selection back to a client ID.
 */

export interface ClientOption {
	id: string;
	name: string;
}

export interface ResolvedClient {
	id: string;
	name: string;
	isNew: boolean;
}

const CREATE_NEW_OPTION = "+ Create new client";

/**
 * Formats client options for Pi's ctx.ui.select().
 *
 * Bugfix: Returns string[] instead of {value, label} objects.
 * Pi's select API expects strings, not objects (which get toString()'d to "[object Object]").
 *
 * @param clients - Array of client objects with id and display name
 * @returns String array: ["+ Create new client", "Client A", "Client B"]
 */
export function formatClientOptions(clients: ClientOption[]): string[] {
	return [CREATE_NEW_OPTION, ...clients.map((c) => c.name)];
}

/**
 * Resolves the selected string back to client information.
 *
 * @param selected - The string returned from ctx.ui.select()
 * @param clients - Original array of client objects (used for mapping name back to id)
 * @returns Resolved client info, or null if cancelled (undefined)
 */
export function resolveSelectedClient(
	selected: string | undefined,
	clients: ClientOption[],
): ResolvedClient | null {
	if (selected === undefined) {
		return null; // Cancelled
	}

	if (selected === CREATE_NEW_OPTION) {
		return { id: "", name: "", isNew: true };
	}

	// Find client by name (first match wins)
	const client = clients.find((c) => c.name === selected);
	if (client) {
		return { id: client.id, name: client.name, isNew: false };
	}

	// Fallback: treat the selection as both id and name
	return { id: selected, name: selected, isNew: false };
}

export type { ClientOption, ResolvedClient };
export { CREATE_NEW_OPTION };

// Default export for convenience
export default {
	formatClientOptions,
	resolveSelectedClient,
	CREATE_NEW_OPTION,
};
