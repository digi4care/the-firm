import { describe, expect, it } from "bun:test";
import {
	type ClientOption,
	CREATE_NEW_OPTION,
	formatClientOptions,
	resolveSelectedClient,
} from "../select-helpers.js";

describe("formatClientOptions", () => {
	it("returns only create-new option for empty clients array", () => {
		const result = formatClientOptions([]);
		expect(result).toEqual([CREATE_NEW_OPTION]);
	});

	it("returns formatted options with multiple clients", () => {
		const clients: ClientOption[] = [
			{ id: "firm-client-abc", name: "Client A" },
			{ id: "firm-client-def", name: "Client B" },
		];
		const result = formatClientOptions(clients);
		expect(result).toEqual([CREATE_NEW_OPTION, "Client A", "Client B"]);
	});

	it("returns string[] NOT {value, label} objects (Bug 1 fix)", () => {
		const clients: ClientOption[] = [{ id: "test-1", name: "Test Client" }];
		const result = formatClientOptions(clients);

		// Verify it's an array of strings
		expect(Array.isArray(result)).toBe(true);
		for (const item of result) {
			expect(typeof item).toBe("string");
		}

		// Verify no objects with {value, label} structure
		for (const item of result) {
			expect(typeof item).not.toBe("object");
			// @ts-expect-error - checking runtime shape
			expect(item?.value).toBeUndefined();
			// @ts-expect-error - checking runtime shape
			expect(item?.label).toBeUndefined();
		}
	});

	it("preserves client name order", () => {
		const clients: ClientOption[] = [
			{ id: "z-last", name: "Zebra Corp" },
			{ id: "a-first", name: "Alpha Inc" },
			{ id: "m-middle", name: "Midway LLC" },
		];
		const result = formatClientOptions(clients);
		expect(result).toEqual([CREATE_NEW_OPTION, "Zebra Corp", "Alpha Inc", "Midway LLC"]);
	});
});

describe("resolveSelectedClient", () => {
	const clients: ClientOption[] = [
		{ id: "firm-client-abc", name: "Client A" },
		{ id: "firm-client-def", name: "Client B" },
		{ id: "firm-client-xyz", name: "Special Corp" },
	];

	it("returns null for undefined (cancelled)", () => {
		const result = resolveSelectedClient(undefined, clients);
		expect(result).toBeNull();
	});

	it("returns isNew: true for create-new selection", () => {
		const result = resolveSelectedClient(CREATE_NEW_OPTION, clients);
		expect(result).toEqual({ id: "", name: "", isNew: true });
	});

	it("resolves existing client by name", () => {
		const result = resolveSelectedClient("Client A", clients);
		expect(result).toEqual({ id: "firm-client-abc", name: "Client A", isNew: false });
	});

	it("resolves another existing client by name", () => {
		const result = resolveSelectedClient("Special Corp", clients);
		expect(result).toEqual({ id: "firm-client-xyz", name: "Special Corp", isNew: false });
	});

	it("returns fallback for unknown string", () => {
		const result = resolveSelectedClient("Unknown Client", clients);
		expect(result).toEqual({ id: "Unknown Client", name: "Unknown Client", isNew: false });
	});

	it("uses first match when multiple clients have same name", () => {
		const duplicateClients: ClientOption[] = [
			{ id: "first-id", name: "Duplicate Name" },
			{ id: "second-id", name: "Duplicate Name" },
		];
		const result = resolveSelectedClient("Duplicate Name", duplicateClients);
		// First match wins
		expect(result).toEqual({ id: "first-id", name: "Duplicate Name", isNew: false });
	});

	it("handles empty clients array", () => {
		const result = resolveSelectedClient("Any Client", []);
		expect(result).toEqual({ id: "Any Client", name: "Any Client", isNew: false });
	});
});

describe("Bug 1: [object Object] in client select dialog", () => {
	it("formatClientOptions returns strings that can be toString'd safely", () => {
		const clients: ClientOption[] = [
			{ id: "c1", name: "Acme Corp" },
			{ id: "c2", name: "Beta Inc" },
		];
		const options = formatClientOptions(clients);

		// Simulate what Pi's select would do - display strings
		const displayed = options.map((opt) => String(opt));
		expect(displayed).toEqual([CREATE_NEW_OPTION, "Acme Corp", "Beta Inc"]);

		// Verify no [object Object] appears
		for (const str of displayed) {
			expect(str).not.toBe("[object Object]");
		}
	});

	it("resolveSelectedClient works with string selection from formatClientOptions", () => {
		const clients: ClientOption[] = [
			{ id: "firm-client-abc", name: "Client A" },
			{ id: "firm-client-def", name: "Client B" },
		];
		const options = formatClientOptions(clients);

		// Simulate user selecting "Client A" (the string, not an object)
		const selected = options[1]; // "Client A"
		const resolved = resolveSelectedClient(selected, clients);

		expect(resolved).toEqual({ id: "firm-client-abc", name: "Client A", isNew: false });
	});
});
