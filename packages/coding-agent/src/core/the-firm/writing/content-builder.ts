import type { Template, TemplateSection } from "../types/index.js";

/**
 * Builds markdown file content from a template, section content, and frontmatter.
 *
 * Output structure:
 * 1. YAML frontmatter block
 * 2. Title heading
 * 3. Template sections (with content or optional hints)
 * 4. Navigation footer
 */
export class ContentBuilder {
	build(
		template: Template,
		sections: Map<string, string>,
		frontmatter: Record<string, unknown>
	): string {
		const parts: string[] = [];

		// 1. YAML frontmatter
		parts.push(this.renderFrontmatter(frontmatter));

		// 2. Title heading
		const title = String(frontmatter.title ?? template.name);
		parts.push(`# ${title}`);
		parts.push("");

		// 3. Sections
		if (template.sections.length > 0) {
			for (const section of template.sections) {
				parts.push(this.renderSection(section, sections));
			}
		}

		// 4. Navigation footer
		parts.push(this.renderFooter());

		return parts.join("\n");
	}

	private renderFrontmatter(fm: Record<string, unknown>): string {
		const lines: string[] = ["---"];
		for (const [key, value] of Object.entries(fm)) {
			lines.push(`${key}: ${serializeYamlValue(value)}`);
		}
		lines.push("---");
		lines.push("");
		return lines.join("\n");
	}

	private renderSection(section: TemplateSection, sections: Map<string, string>): string {
		const parts: string[] = [];
		parts.push(`## ${section.name}`);
		parts.push("");

		const content = sections.get(section.name);
		if (content) {
			parts.push(content);
		} else if (!section.required) {
			parts.push(`<!-- ${section.hint} -->`);
		}

		parts.push("");
		return parts.join("\n");
	}

	private renderFooter(): string {
		return "---\n*Navigation: [Back to parent](../navigation.md)*\n";
	}
}

// ─── YAML Serialization ─────────────────────────────────────────────────────

/**
 * Minimal YAML serializer for frontmatter values.
 * Handles strings, numbers, booleans, and arrays of primitives.
 */
function serializeYamlValue(value: unknown): string {
	if (value === null || value === undefined) {
		return "null";
	}
	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}
	if (typeof value === "number") {
		return String(value);
	}
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return "[]";
		}
		const items = value.map((item) => `  - ${serializeInlineYaml(item)}`);
		return `\n${items.join("\n")}`;
	}
	if (typeof value === "string") {
		return serializeInlineYaml(value);
	}
	// Fallback: stringify non-primitive objects
	return serializeInlineYaml(String(value));
}

/**
 * Serialize a single YAML scalar (string, number, boolean).
 * Strings containing YAML-special characters are quoted with double quotes.
 */
function serializeInlineYaml(value: unknown): string {
	if (value === null || value === undefined) {
		return "null";
	}
	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}
	if (typeof value === "number") {
		return String(value);
	}
	if (typeof value === "string") {
		// Quote if the string contains special characters or could be misread as YAML
		if (needsQuoting(value)) {
			return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
		}
		return value;
	}
	return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Determine if a YAML string value needs quoting.
 * We quote when the string: is empty, looks like a YAML special value,
 * contains special characters, or could be parsed as a non-string type.
 */
function needsQuoting(s: string): boolean {
	if (s === "") {
		return true;
	}

	// YAML booleans / nulls
	if (/^(true|false|yes|no|on|off|null|~)$/i.test(s)) {
		return true;
	}

	// Starts with YAML-special characters
	if (/^[{}\[\]&*?|>!%@`#,'"]/.test(s)) {
		return true;
	}

	// Contains colon followed by space (key-value indicator)
	if (/:\s/.test(s)) {
		return true;
	}

	// Contains embedded double quotes
	if (/"/.test(s)) {
		return true;
	}

	// Contains newline or tab
	if (/[\n\r\t]/.test(s)) {
		return true;
	}

	// Starts or ends with whitespace
	if (s !== s.trim()) {
		return true;
	}

	// Could be parsed as a number
	if (/^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) {
		return true;
	}

	return false;
}
