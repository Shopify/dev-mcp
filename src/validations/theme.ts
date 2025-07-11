import { ValidationFunctionResult, ValidationResult } from "../types.js";
import {
  createFailedResult,
  createValidationResult,
  validationResult,
} from "./validationUtils.js";
import { access } from "fs/promises";
import { join } from "path";
import { themeCheckRun } from "@shopify/theme-check-node";

/**
 * Validates Shopify Theme
 * @param absoluteThemePath - The path to the theme directory
 * @returns ValidationFunctionResult with overall status and detailed checks
 */
export default async function validateTheme(
  absoluteThemePath: string,
): Promise<ValidationFunctionResult> {
  try {
    let configPath: string | undefined = join(
      absoluteThemePath,
      "theme-check.yml",
    );

    try {
      await access(configPath);
    } catch {
      configPath = undefined;
    }

    const results = await themeCheckRun(
      absoluteThemePath,
      configPath,
      (message) => console.error(message),
    );

    const failedValidationResponses = results.offenses.map((offense) => {
      return validationResult(
        ValidationResult.FAILED,
        `Validation error for ${offense.uri}: ${offense.message}`,
      );
    });

    if (failedValidationResponses.length > 0) {
      return createFailedResult(failedValidationResponses);
    }

    return createValidationResult([
      validationResult(
        ValidationResult.SUCCESS,
        `Theme at ${absoluteThemePath} had no offenses from using Shopify's Theme Check.`,
      ),
    ]);
  } catch (error) {
    return createFailedResult([
      validationResult(
        ValidationResult.FAILED,
        `Validation error for theme at ${absoluteThemePath}: ${error instanceof Error ? error.message : String(error)}`,
      ),
    ]);
  }
}
