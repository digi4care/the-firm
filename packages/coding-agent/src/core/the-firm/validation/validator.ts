import type { Template, ValidationResult } from "../types/index.js";

/**
 * Validates content against a template's rules.
 * Each validator checks one concern (MVI limits, frontmatter, sections, links).
 */
export interface Validator {
  readonly name: string;
  validate(content: string, template: Template): ValidationResult;
}
