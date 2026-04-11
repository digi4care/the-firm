import { describe, expect, it } from "vitest";
import type { Template } from "../../types";
import { CompositeValidator } from "../../validation/composite-validator";
import { FrontmatterValidator } from "../../validation/frontmatter-validator";
import { LinkValidator } from "../../validation/link-validator";
import { MVIValidator } from "../../validation/mvi-validator";
import { TemplateValidator } from "../../validation/template-validator";
import type { Validator } from "../../validation/validator";

// ── Fixtures ─────────────────────────────────────────────────────────

function makeTemplate(overrides: Partial<Template> = {}): Template {
	return {
		name: "test-template",
		contentType: "concept",
		sections: [
			{ name: "Context", required: true, hint: "Background information" },
			{ name: "Decision", required: true, hint: "What was decided" },
			{ name: "Optional", required: false, hint: "Extra details" },
		],
		frontmatterSchema: {},
		mviLimits: { maxLines: 200, maxDescription: 120 },
		...overrides,
	};
}

const VALID_FRONTMATTER = `---
status: active
description: "A test document"
owner: test-user
created: 2026-01-01
updated: 2026-01-08
---`;

const VALID_CONTENT = `${VALID_FRONTMATTER}

## Context
Some background information here.

## Decision
The decision that was made.

## Optional
Extra details.
`;

// ── MVIValidator ─────────────────────────────────────────────────────

describe("MVIValidator", () => {
	const validator = new MVIValidator();

	it("accepts valid content within limits", () => {
		const result = validator.validate(VALID_CONTENT, makeTemplate());
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("rejects content exceeding max lines", () => {
		const longContent = Array(250).fill("line of text").join("\n");
		const result = validator.validate(longContent, makeTemplate());
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].rule).toBe("mvi:max-lines");
		expect(result.errors[0].message).toContain("250");
	});

	it("rejects description exceeding max length", () => {
		const longDesc = "x".repeat(150);
		const content = `---\ndescription: "${longDesc}"\n---\n\nShort body.`;
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].rule).toBe("mvi:max-description");
		expect(result.errors[0].message).toContain("152");
	});

	it("uses custom mviLimits from template", () => {
		const template = makeTemplate({ mviLimits: { maxLines: 10, maxDescription: 50 } });
		const content = Array(15).fill("line").join("\n");
		const result = validator.validate(content, template);
		expect(result.valid).toBe(false);
		expect(result.errors[0].rule).toBe("mvi:max-lines");
	});

	it("passes when description is within limit", () => {
		const desc = "x".repeat(100);
		const content = `---\ndescription: "${desc}"\n---\n\nBody.`;
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(true);
	});

	it("passes when no description is present (null case)", () => {
		const content = "No frontmatter at all, just plain content.";
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(true);
	});
});

// ── FrontmatterValidator ─────────────────────────────────────────────

describe("FrontmatterValidator", () => {
	const validator = new FrontmatterValidator();

	it("accepts valid frontmatter with all required fields", () => {
		const result = validator.validate(VALID_CONTENT, makeTemplate());
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("rejects content without frontmatter", () => {
		const content = "Just some markdown content, no frontmatter.";
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].rule).toBe("frontmatter:missing");
	});

	it("rejects missing required fields", () => {
		const content = `---
status: active
description: "Something"
---`;
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(false);
		// Missing: owner, created, updated
		const missingFields = result.errors.map((e) => e.message);
		expect(missingFields.some((m) => m.includes("owner"))).toBe(true);
		expect(missingFields.some((m) => m.includes("created"))).toBe(true);
		expect(missingFields.some((m) => m.includes("updated"))).toBe(true);
	});

	it("warns on empty description", () => {
		const content = `---
status: active
description: ""
owner: user
created: 2026-01-01
updated: 2026-01-08
---`;
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(true);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0].rule).toBe("frontmatter:empty-description");
	});

	it("warns on description with only quotes", () => {
		const content = `---
status: active
description: ''
owner: user
created: 2026-01-01
updated: 2026-01-08
---`;
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(true);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0].rule).toBe("frontmatter:empty-description");
	});

	it("accepts frontmatter with whitespace-only description as empty", () => {
		const content = `---
status: active
description: 
owner: user
created: 2026-01-01
updated: 2026-01-08
---`;
		const result = validator.validate(content, makeTemplate());
		expect(result.warnings.some((w) => w.rule === "frontmatter:empty-description")).toBe(true);
	});
});

// ── TemplateValidator ────────────────────────────────────────────────

describe("TemplateValidator", () => {
	const validator = new TemplateValidator();

	it("accepts content with all required sections", () => {
		const result = validator.validate(VALID_CONTENT, makeTemplate());
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("rejects missing required section", () => {
		const content = `${VALID_FRONTMATTER}

## Context
Some context.

## Optional
Details.
`;
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].rule).toBe("template:missing-section");
		expect(result.errors[0].message).toContain("Decision");
	});

	it("passes when only optional section is missing", () => {
		const content = `${VALID_FRONTMATTER}

## Context
Some context.

## Decision
The decision.
`;
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(true);
	});

	it("reports multiple missing sections", () => {
		const content = `${VALID_FRONTMATTER}

No sections here.
`;
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(2);
	});

	it("handles template with no required sections", () => {
		const template = makeTemplate({
			sections: [{ name: "Optional", required: false, hint: "Optional" }],
		});
		const result = validator.validate("No sections", template);
		expect(result.valid).toBe(true);
	});
});

// ── LinkValidator ────────────────────────────────────────────────────

describe("LinkValidator", () => {
	it("passes with no links", () => {
		const validator = new LinkValidator();
		const result = validator.validate("No links here", makeTemplate());
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
		expect(result.warnings).toHaveLength(0);
	});

	it("reports relative links as warnings in warning-only mode (empty knownFiles)", () => {
		const validator = new LinkValidator();
		const content = "See [related](./related.md) and [other](./other.md) for details.";
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
		expect(result.warnings).toHaveLength(2);
		expect(result.warnings[0].rule).toBe("link:relative");
		expect(result.warnings[0].message).toContain("related");
	});

	it("ignores absolute and external links", () => {
		const validator = new LinkValidator();
		const content = "See [external](https://example.com) and [absolute](/absolute/path.md).";
		const result = validator.validate(content, makeTemplate());
		expect(result.warnings).toHaveLength(0);
		expect(result.errors).toHaveLength(0);
	});

	it("reports broken links as errors with populated knownFiles", () => {
		const knownFiles = new Set(["related.md"]);
		const validator = new LinkValidator(knownFiles);
		const content = "See [related](./related.md) and [missing](./missing.md) for details.";
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].rule).toBe("link:broken");
		expect(result.errors[0].message).toContain("missing");
		expect(result.warnings).toHaveLength(0);
	});

	it("passes when all links resolve in knownFiles", () => {
		const knownFiles = new Set(["related.md", "other.md"]);
		const validator = new LinkValidator(knownFiles);
		const content = "See [related](./related.md) and [other](./other.md) for details.";
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
		expect(result.warnings).toHaveLength(0);
	});

	it("strips anchor for file existence check", () => {
		const knownFiles = new Set(["glossary.md"]);
		const validator = new LinkValidator(knownFiles);
		const content = "See [term](./glossary.md#definitions) for the definition.";
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("reports broken link when anchor-stripped path is not in knownFiles", () => {
		const knownFiles = new Set(["other.md"]);
		const validator = new LinkValidator(knownFiles);
		const content = "See [term](./missing.md#section) for the definition.";
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].rule).toBe("link:broken");
		expect(result.errors[0].message).toContain("missing");
	});

	it("reports only broken links in mixed content", () => {
		const knownFiles = new Set(["exists.md"]);
		const validator = new LinkValidator(knownFiles);
		const content = "See [exists](./exists.md) and [broken](./broken.md).";
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].message).toContain("broken");
	});

	it("returns no warnings in validation mode with populated knownFiles", () => {
		const knownFiles = new Set(["related.md"]);
		const validator = new LinkValidator(knownFiles);
		const content = "See [related](./related.md) for details.";
		const result = validator.validate(content, makeTemplate());
		expect(result.valid).toBe(true);
		expect(result.warnings).toHaveLength(0);
	});
});

// ── CompositeValidator ───────────────────────────────────────────────

describe("CompositeValidator", () => {
	it("chains all validators and merges results", () => {
		const validators: Validator[] = [
			new MVIValidator(),
			new FrontmatterValidator(),
			new TemplateValidator(),
			new LinkValidator(),
		];
		const composite = new CompositeValidator(validators);

		const result = composite.validate(VALID_CONTENT, makeTemplate());
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("merges errors from multiple validators", () => {
		const content = `---
status: active
---
No required sections here, and missing fields.`;

		const validators: Validator[] = [new FrontmatterValidator(), new TemplateValidator()];
		const composite = new CompositeValidator(validators);

		const result = composite.validate(content, makeTemplate());
		expect(result.valid).toBe(false);
		// Frontmatter errors (missing owner, created, updated, description) + template errors (missing Context, Decision)
		expect(result.errors.length).toBeGreaterThan(2);
	});

	it("merges warnings from multiple validators", () => {
		const content = `${VALID_FRONTMATTER}

## Context
See [link](./reference.md) for details.

## Decision
Made the decision.
`;

		const validators: Validator[] = [new LinkValidator(), new TemplateValidator()];
		const composite = new CompositeValidator(validators);

		const result = composite.validate(content, makeTemplate());
		expect(result.valid).toBe(true);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0].rule).toBe("link:relative");
	});

	it("returns valid with empty validator list", () => {
		const composite = new CompositeValidator([]);
		const result = composite.validate("anything", makeTemplate());
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
		expect(result.warnings).toHaveLength(0);
	});

	it("sets valid to false when any validator has errors", () => {
		const content = Array(250).fill("line").join("\n");
		const composite = new CompositeValidator([new MVIValidator()]);
		const result = composite.validate(content, makeTemplate());
		expect(result.valid).toBe(false);
		expect(result.errors[0].rule).toBe("mvi:max-lines");
	});
});
