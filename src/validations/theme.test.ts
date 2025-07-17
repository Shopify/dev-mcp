import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ValidationResult } from "../types.js";
import validateTheme from "./theme.js";

describe("validateTheme", () => {
  let tempThemeDirectory: string;
  let snippetsDirectory: string;
  let localesDirectory: string;

  beforeEach(async () => {
    tempThemeDirectory = await mkdtemp(join(tmpdir(), "theme-test-"));

    snippetsDirectory = join(tempThemeDirectory, "snippets");
    localesDirectory = join(tempThemeDirectory, "locales");

    [snippetsDirectory, localesDirectory].forEach(async (directory) => {
      await mkdir(directory, { recursive: true });
    });
  });

  afterEach(async () => {
    await rm(tempThemeDirectory, { recursive: true, force: true });
  });

  it("should successfully validate a theme", async () => {
    // Create the test.liquid file with the specified content
    const liquidFile = join(snippetsDirectory, "test.liquid");
    await writeFile(liquidFile, "{{ 'hello' }}");

    // Run validateTheme on the temporary directory
    const result = await validateTheme(tempThemeDirectory);

    // Assert the response was a success
    expect(result.result).toBe(ValidationResult.SUCCESS);
    expect(result.resultDetail).toBe(
      `Theme at ${tempThemeDirectory} passed all checks from Shopify's Theme Check.`,
    );
  });

  it("should fail to validate a theme", async () => {
    // Create the test.liquid file with the specified content
    const liquidFile = join(snippetsDirectory, "test.liquid");
    await writeFile(liquidFile, "{{ 'hello' | non-existent-filter }}");

    // Run validateTheme on the temporary directory
    const result = await validateTheme(tempThemeDirectory);

    // Assert the response was a success
    expect(result.result).toBe(ValidationResult.FAILED);
    expect(result.resultDetail).toContain(
      "Unknown filter 'non-existent-filter' used.",
    );
  });

  it("should successfully validate a theme with an unknown filter if its check is exempted", async () => {
    // Create the test.liquid file with the specified content
    const liquidFile = join(snippetsDirectory, "test.liquid");
    await writeFile(liquidFile, "{{ 'hello' | non-existent-filter }}");

    const themeCheckYml = join(tempThemeDirectory, ".theme-check.yml");
    await writeFile(themeCheckYml, "ignore:\n- snippets/test.liquid");

    // Run validateTheme on the temporary directory
    const result = await validateTheme(tempThemeDirectory);

    // Assert the response was a success
    expect(result.result).toBe(ValidationResult.SUCCESS);
    expect(result.resultDetail).toBe(
      `Theme at ${tempThemeDirectory} passed all checks from Shopify's Theme Check.`,
    );
  });
});
