export interface ValidationError {
  rule: string;
  message: string;
  section?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  rule: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
