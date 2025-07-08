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

export function extractCodeblocksWithRegex(
  markdownResponse: string,
  regex: RegExp,
): string[] {
  const codeblocks: string[] = [];
  let match;

  while ((match = regex.exec(markdownResponse)) !== null) {
    const operation = match[1].trim();
    if (operation) {
      codeblocks.push(operation);
    }
  }

  return codeblocks;
}

export function createFailedResult(
  detailedChecks: ValidationResponse[],
): ValidationFunctionResult {
  return {
    valid: false,
    detailedChecks,
  };
}

export function validationResult(
  result: ValidationResult,
  resultDetail: string,
): ValidationResponse {
  return { result, resultDetail };
}

export function createValidationResult(
  validationResponses: ValidationResponse[],
): ValidationFunctionResult {
  return {
    valid: validationResponses.every(
      (response) => response.result === ValidationResult.SUCCESS,
    ),
    detailedChecks: validationResponses,
  };
}
