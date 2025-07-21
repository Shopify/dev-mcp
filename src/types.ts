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

export type ValidationToolResult = ValidationResponse[];

/**
 * Formats a ValidationToolResult into a readable markdown response
 * @param result - The validation result to format
 * @param itemName - Name of the items being validated (e.g., "Code Blocks", "Operations")
 * @returns Formatted markdown string with validation summary and details
 */
export function formatValidationResult(
  result: ValidationToolResult,
  itemName: string = "Items",
): string {
  const hasFailures = result.some(
    (response) => response.result === ValidationResult.FAILED,
  );

  let responseText = `## Validation Summary\n\n`;
  responseText += `**Overall Status:** ${!hasFailures ? "✅ VALID" : "❌ INVALID"}\n`;
  responseText += `**Total ${itemName}:** ${result.length}\n\n`;

  responseText += `## Detailed Results\n\n`;
  result.forEach((check, index) => {
    const statusIcon = check.result === ValidationResult.SUCCESS ? "✅" : "❌";
    responseText += `### ${itemName.slice(0, -1)} ${index + 1}\n`;
    responseText += `**Status:** ${statusIcon} ${check.result.toUpperCase()}\n`;
    responseText += `**Details:** ${check.resultDetail}\n\n`;
  });

  return responseText;
}
