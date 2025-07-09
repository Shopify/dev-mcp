export enum ValidationResult {
  SUCCESS = "success",
  FAILED = "failed",
}

export interface ValidationResponse {
  /**
   * The status of the validation check
   */
  result: ValidationResult;

  /**
   * Explanation of the validation result.
   * For FAILED: Details about why validation failed
   * For SUCCESS: Description of what validation was successfully performed
   */
  resultDetail: string;
}

export interface ValidationToolResult {
  /**
   * Overall validation status - true only if all checks passed
   */
  valid: boolean;

  /**
   * Array of detailed validation results for each code block
   */
  detailedChecks: ValidationResponse[];
}
