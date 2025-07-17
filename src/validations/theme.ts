import { themeCheckRun } from "@shopify/theme-check-node";
import { access } from "fs/promises";
import { join } from "path";
import { ValidationResponse, ValidationResult } from "../types.js";

/**
 * Validates Shopify Theme
 * @param absoluteThemePath - The path to the theme directory
 * @returns ValidationResponse containing the success of running theme-check for the whole theme
 */
export default async function validateTheme(
  absoluteThemePath: string,
): Promise<ValidationResponse> {
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

    if (results.offenses.length > 0) {
      const formattedOffenses = results.offenses
        .map((offense) => `${offense.uri}: ${offense.message}`)
        .join("\n");
      return {
        result: ValidationResult.FAILED,
        resultDetail: `Theme at ${absoluteThemePath} failed to validate:\n\n${formattedOffenses}`,
      };
    }

    return {
      result: ValidationResult.SUCCESS,
      resultDetail: `Theme at ${absoluteThemePath} passed all checks from Shopify's Theme Check.`,
    };
  } catch (error) {
    return {
      result: ValidationResult.FAILED,
      resultDetail: `Validation error: Could not validate ${absoluteThemePath}. Details: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
