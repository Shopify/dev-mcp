import { ValidationResult, ValidationToolResult } from "../types.js";

/**
 * Helper function to check if any validation checks failed
 * @param result - The validation tool result to check
 * @returns true if any validation check failed, false otherwise
 */
export function hasFailedValidation(result: ValidationToolResult): boolean {
  return result.some(
    (validation) => validation.result === ValidationResult.FAILED,
  );
}
