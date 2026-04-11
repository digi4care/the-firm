import type { Template, ValidationError, ValidationResult, ValidationWarning } from "../types/index.js";
import type { Validator } from "./validator.js";

/**
 * Runs multiple validators and merges their results.
 * valid only if all validators pass. Errors and warnings are flattened.
 */
export class CompositeValidator implements Validator {
  readonly name = "composite";

  constructor(private readonly validators: readonly Validator[]) {}

  validate(content: string, template: Template): ValidationResult {
    if (this.validators.length === 0) {
      return { valid: true, errors: [], warnings: [] };
    }

    const results = this.validators.map((v) => v.validate(content, template));

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const result of results) {
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
