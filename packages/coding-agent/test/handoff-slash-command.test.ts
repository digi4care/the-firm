import { describe, expect, it } from "vitest";
import { BUILTIN_SLASH_COMMANDS } from "../src/core/slash-commands.js";

describe("/handoff slash command", () => {
	it("should be registered in BUILTIN_SLASH_COMMANDS", () => {
		const handoff = BUILTIN_SLASH_COMMANDS.find((c) => c.name === "handoff");
		expect(handoff).toBeDefined();
		expect(handoff?.description).toBeTruthy();
	});

	it("should be listed alongside /compact", () => {
		const names = BUILTIN_SLASH_COMMANDS.map((c) => c.name);
		expect(names).toContain("compact");
		expect(names).toContain("handoff");
	});
});
