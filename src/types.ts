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

  /**
   * Optional parsed components produced by component validation.
   * Present only for component validation responses.
   */
  components?: ParsedComponent[];
}

export type ValidationToolResult = ValidationResponse[];

export interface ParsedComponent {
  tagName: string;
  props: Record<string, any>;
  content: string;
}
