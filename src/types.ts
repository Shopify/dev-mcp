export enum ValidationResult {
  SUCCESS = "success",
  FAILED = "failed",
  SKIPPED = "skipped",
}

export interface ValidationResponse {
  /**
   * The status of the validation check
   */
  result: ValidationResult;

  /**
   * Explanation of the validation result.
   * For FAILED: Details about why validation failed
   * For SKIPPED: Rationale for why validation was skipped
   * For SUCCESS: Description of what validation was successfully performed
   */
  resultDetail: string;
}
