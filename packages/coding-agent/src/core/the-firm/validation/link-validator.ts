import type { Template, ValidationError, ValidationResult, ValidationWarning } from "../types/index.js";
import type { Validator } from "./validator.js";

const RELATIVE_LINK_PATTERN = /\[([^\]]*)\]\(\.\/([^)]+)\)/g;

interface RelativeLink {
	text: string;
	path: string;
}

/**
 * Extract all relative markdown links [text](./path) from content.
 */
function extractRelativeLinks(content: string): RelativeLink[] {
	const links: RelativeLink[] = [];
	const regex = new RegExp(RELATIVE_LINK_PATTERN.source, "g");
	let current = regex.exec(content);
	while (current !== null) {
		links.push({ text: current[1], path: current[2] });
		current = regex.exec(content);
	}
	return links;
}

/**
 * Validates markdown links in content.
 * Two modes:
 * - Empty knownFiles (default): warning-only, reports relative links as warnings.
 * - Populated knownFiles: validates each link against the set, reports broken links as errors.
 */
export class LinkValidator implements Validator {
	readonly name = "link";

	constructor(private readonly knownFiles: Set<string> = new Set()) {}

	validate(content: string, _template: Template): ValidationResult {
		const warnings: ValidationWarning[] = [];
		const errors: ValidationError[] = [];
		const links = extractRelativeLinks(content);

		if (this.knownFiles.size === 0) {
			for (const link of links) {
				warnings.push({
					rule: "link:relative",
					message: `Relative link found: [${link.text}](./${link.path})`,
					suggestion: "Verify this link target exists",
				});
			}
		} else {
			for (const link of links) {
				// Strip anchor for file existence check
				const filePath = link.path.split("#")[0];
				if (!this.knownFiles.has(filePath) && !this.knownFiles.has(link.path)) {
					errors.push({
						rule: "link:broken",
						message: `Broken link: [${link.text}](./${link.path}) — target not found`,
						suggestion: "Create the file or fix the link path",
					});
				}
			}
		}

		return { valid: errors.length === 0, errors, warnings };
	}
}
