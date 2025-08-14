import { Offense, themeCheckRun } from "@shopify/theme-check-node";
import { access } from "fs/promises";
import { join, normalize } from "path";
import { ValidationResponse, ValidationResult } from "../types.js";

/**
 * Validates Shopify Theme
 * @param absoluteThemePath - The path to the theme directory
 * @param filesCreatedOrUpdated - An array of relative file paths that was generated or updated by the LLM. The file paths should be relative to the theme directory.
 * @returns ValidationResponse containing the success of running theme-check for the whole theme
 */
export default async function validateTheme(
  absoluteThemePath: string,
  filesCreatedOrUpdated: string[],
): Promise<ValidationResponse[]> {
  try {
    let configPath: string | undefined = join(
      absoluteThemePath,
      ".theme-check.yml",
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

    const groupedOffensesByFileUri = groupOffensesByFileUri(results.offenses);

    const responses: ValidationResponse[] = [];

    for (const relativeFilePath of filesCreatedOrUpdated) {
      const uri = Object.keys(groupedOffensesByFileUri).find((uri) =>
        normalize(uri).endsWith(normalize(relativeFilePath)),
      );
      if (uri) {
        responses.push({
          result: ValidationResult.FAILED,
          resultDetail: `Theme file ${relativeFilePath} failed to validate:\n\n${groupedOffensesByFileUri[uri].join("\n")}`,
        });
      } else {
        responses.push({
          result: ValidationResult.SUCCESS,
          resultDetail: `Theme file ${relativeFilePath} passed all checks from Shopify's Theme Check.`,
        });
      }
    }

    return responses;
  } catch (error) {
    return filesCreatedOrUpdated.map((filePath) => ({
      result: ValidationResult.FAILED,
      resultDetail: `Validation error: Could not validate ${filePath}. Details: ${error instanceof Error ? error.message : String(error)}`,
    }));
  }
}

export function groupOffensesByFileUri(offenses: Offense[]) {
  return offenses.reduce(
    (acc, o) => {
      let formattedMessage = `ERROR: ${o.message}`;

      if (o.suggest && o.suggest.length > 0) {
        formattedMessage += `; SUGGESTED FIXES: ${o.suggest.map((s) => s.message).join("OR ")}.`;
      }

      const uri = o.uri;

      if (acc[uri]) {
        acc[uri].push(formattedMessage);
      } else {
        acc[uri] = [formattedMessage];
      }
      return acc;
    },
    {} as Record<string, string[]>,
  );
}
