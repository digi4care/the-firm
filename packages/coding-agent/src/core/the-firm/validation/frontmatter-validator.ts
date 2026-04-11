import type { Template, ValidationError, ValidationResult, ValidationWarning } from "../types/index.js";
import type { Validator } from "./validator.js";

const REQUIRED_FIELDS = ["status", "owner", "created", "updated", "description"] as const;

/**
 * Validates YAML frontmatter presence and required fields.
 * Warns if description is empty or just quotes.
 */
export class FrontmatterValidator implements Validator {
  readonly name = "frontmatter";

  validate(content: string, _template: Template): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const frontmatter = extractFrontmatter(content);

    if (frontmatter === null) {
      errors.push({
        rule: "frontmatter:missing",
        message: "Content is missing YAML frontmatter",
      });
      return { valid: false, errors, warnings };
    }

    for (const field of REQUIRED_FIELDS) {
      if (!frontmatter.includes(`${field}:`)) {
        errors.push({
          rule: "frontmatter:missing-field",
          message: `Missing required frontmatter field: ${field}`,
        });
      }
    }

    // Check description is non-empty
    const descMatch = frontmatter.match(/^description:[ \t]*([^\n]*)/m);
    if (descMatch) {
      const value = descMatch[1].trim();
      if (value === "" || value === '""' || value === "''") {
        warnings.push({
          rule: "frontmatter:empty-description",
          message: "Description field is empty",
          suggestion: "Provide a concise description of the content (max 120 characters)",
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

/**
 * Extract YAML frontmatter block (content between opening and closing ---).
 * Returns null if no valid frontmatter structure is found.
 */
function extractFrontmatter(content: string): string | null {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return null;
  }

  // Find the closing --- after the opening one
  const afterOpening = trimmed.indexOf("\n", 0);
  if (afterOpening === -1) {
    return null;
  }

  const closingIndex = trimmed.indexOf("\n---", afterOpening);
  if (closingIndex === -1) {
    return null;
  }

  return trimmed.slice(afterOpening + 1, closingIndex);
}
