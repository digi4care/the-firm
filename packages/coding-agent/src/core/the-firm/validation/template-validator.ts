import type { Template, TemplateSection, ValidationError, ValidationResult } from "../types/index.js";
import type { Validator } from "./validator.js";

/**
 * Validates that all required sections from the template are present in the content.
 * Sections are identified by `## Section Name` markdown headings.
 */
export class TemplateValidator implements Validator {
  readonly name = "template";

  validate(content: string, template: Template): ValidationResult {
    const errors: ValidationError[] = [];

    const requiredSections = template.sections.filter((s: TemplateSection) => s.required);
    const presentHeadings = extractHeadings(content);

    for (const section of requiredSections) {
      if (!presentHeadings.has(section.name)) {
        errors.push({
          rule: "template:missing-section",
          message: `Missing required section: ${section.name}`,
          section: section.name,
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings: [] };
  }
}

/**
 * Extract all `## Heading` names from content.
 * Returns a Set of heading text (trimmed, case-sensitive).
 */
function extractHeadings(content: string): Set<string> {
  const headings = new Set<string>();
  for (const line of content.split("\n")) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      headings.add(match[1].trim());
    }
  }
  return headings;
}
