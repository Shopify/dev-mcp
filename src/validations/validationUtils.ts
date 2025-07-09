import {
  ValidationResult,
  ValidationFunctionResult,
  ValidationResponse,
} from "../types.js";

/**
 * Formats a ValidationFunctionResult into a readable markdown response
 * @param results - The validation results to format
 * @returns Formatted ValidationFunctionResult with overall status and detailed checks
 */
export function formatValidationResults(
  results: ValidationFunctionResult,
): ValidationFunctionResult {
  return {
    valid: overallStatus(results) === ValidationResult.SUCCESS,
    detailedChecks: results.detailedChecks,
  };
}

export function validationSummary(results: ValidationFunctionResult): string {
  let detailedResults = `## Detailed Results\n\n`;
  results.detailedChecks.forEach((check, index) => {
    const statusIcon =
      check.result === ValidationResult.SUCCESS
        ? "✅"
        : check.result === ValidationResult.SKIPPED
          ? "⏭️"
          : "❌";
    detailedResults += `### Validation ${index + 1}\n`;
    detailedResults += `**Status:** ${statusIcon} ${check.result.toUpperCase()}\n`;
    detailedResults += `**Details:** ${check.resultDetail}\n\n`;
  });

  return detailedResults;
}

function overallStatus(results: ValidationFunctionResult): ValidationResult {
  const successCount = results.detailedChecks.filter(
    (check) => check.result === ValidationResult.SUCCESS,
  ).length;
  const failureCount = results.detailedChecks.filter(
    (check) => check.result === ValidationResult.FAILED,
  ).length;
  const skippedCount = results.detailedChecks.filter(
    (check) => check.result === ValidationResult.SKIPPED,
  ).length;

  if (failureCount > 0) {
    return ValidationResult.FAILED;
  } else if (successCount > 0) {
    return ValidationResult.SUCCESS;
  } else {
    return ValidationResult.SKIPPED;
  }
}

/**
 * Converts an array of ValidationResponse into a ValidationFunctionResult
 * @param validationResponses - Array of validation responses
 * @returns ValidationFunctionResult with overall status and detailed checks
 */
export function validationToolResult(
  validationResponses: ValidationResponse[],
): ValidationFunctionResult {
  return {
    valid: validationResponses.every(
      (check) =>
        check.result === ValidationResult.SUCCESS ||
        check.result === ValidationResult.SKIPPED,
    ),
    detailedChecks: validationResponses,
  };
}

/**
 * Validates Polaris Web Components in a code block
 * @param codeblock - The code block to validate
 * @returns ValidationResponse for the code block
 */
export async function validatePolarisWebComponents(
  codeblock: string,
): Promise<ValidationResponse> {
  // TODO: Implement actual validation logic
  return {
    result: ValidationResult.SKIPPED,
    resultDetail: "Polaris Web Components validation not yet implemented",
  };
}
