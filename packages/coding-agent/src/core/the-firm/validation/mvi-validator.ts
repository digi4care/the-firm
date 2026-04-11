import type { Template, ValidationError, ValidationResult } from "../types/index.js";
import type { Validator } from "./validator.js";

const DEFAULT_MAX_LINES = 200;
const DEFAULT_MAX_DESCRIPTION = 120;

/**
 * Validates Minimum Viable Information (MVI) constraints:
 * - Line count must not exceed template.mviLimits.maxLines (default 200)
 * - Frontmatter description must not exceed template.mviLimits.maxDescription (default 120)
 */
export class MVIValidator implements Validator {
  readonly name = "mvi";

  validate(content: string, template: Template): ValidationResult {
    const errors: ValidationError[] = [];
    const maxLines = template.mviLimits?.maxLines ?? DEFAULT_MAX_LINES;
    const maxDescription = template.mviLimits?.maxDescription ?? DEFAULT_MAX_DESCRIPTION;

    const lines = content.split("\n");
    if (lines.length > maxLines) {
      errors.push({
        rule: "mvi:max-lines",
        message: `Content has ${lines.length} lines, maximum is ${maxLines}`,
      });
    }

    const description = extractDescription(content);
    if (description !== null && description.length > maxDescription) {
      errors.push({
        rule: "mvi:max-description",
        message: `Description is ${description.length} characters, maximum is ${maxDescription}`,
      });
    }

    return { valid: errors.length === 0, errors, warnings: [] };
  }
}

/**
 * Extract the description value from YAML frontmatter.
 * Returns null if no description field is found.
 */
function extractDescription(content: string): string | null {
  const match = content.match(/^description:[ \t]*([^\n]+)/m);
  return match ? match[1].trim() : null;
}
