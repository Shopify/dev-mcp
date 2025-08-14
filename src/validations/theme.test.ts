import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ValidationResult } from "../types.js";
import validateTheme from "./theme.js";

describe("validateTheme", () => {
  let tempThemeDirectory: string;
  let blocksDirectory: string;
  let snippetsDirectory: string;
  let localesDirectory: string;

  beforeEach(async () => {
    tempThemeDirectory = await mkdtemp(join(tmpdir(), "theme-test-"));

    blocksDirectory = join(tempThemeDirectory, "blocks");
    snippetsDirectory = join(tempThemeDirectory, "snippets");
    localesDirectory = join(tempThemeDirectory, "locales");

    await Promise.all([
      mkdir(blocksDirectory, { recursive: true }),
      mkdir(snippetsDirectory, { recursive: true }),
      mkdir(localesDirectory, { recursive: true }),
    ]);
  });

  afterEach(async () => {
    await rm(tempThemeDirectory, { recursive: true, force: true });
  });

  it("should successfully validate a theme", async () => {
    // Create the test.liquid file with the specified content
    const relativeFilePath = join("snippets", "test.liquid");
    const filePath = join(snippetsDirectory, "test.liquid");
    await writeFile(filePath, "{{ 'hello' }}");

    // Run validateTheme on the temporary directory
    const responses = await validateTheme(tempThemeDirectory, [
      relativeFilePath,
    ]);

    expect(responses).toContainEqual({
      result: ValidationResult.SUCCESS,
      resultDetail: `Theme file ${relativeFilePath} passed all checks from Shopify's Theme Check.`,
    });
  });

  it("should fail to validate a theme with an unknown filter", async () => {
    // Create the test.liquid file with the specified content
    const relativeFilePath = join("snippets", "test.liquid");
    const filePath = join(snippetsDirectory, "test.liquid");
    await writeFile(filePath, "{{ 'hello' | non-existent-filter }}");

    // Run validateTheme on the temporary directory
    const responses = await validateTheme(tempThemeDirectory, [
      relativeFilePath,
    ]);

    expect(responses).toContainEqual({
      result: ValidationResult.FAILED,
      resultDetail: `Theme file ${relativeFilePath} failed to validate:

ERROR: Unknown filter 'non-existent-filter' used.`,
    });
  });

  it("should fail to validate a theme with an invalid schema", async () => {
    // Create the test.liquid file with the specified content
    const relativeFilePath = join("blocks", "test.liquid");
    const filePath = join(blocksDirectory, "test.liquid");
    const schemaName = "Long long long long long long name";
    await writeFile(
      filePath,
      `
{% schema %}
  {
    "name": "${schemaName}"
  }
{% endschema %}`,
    );

    // Run validateTheme on the temporary directory
    const responses = await validateTheme(tempThemeDirectory, [
      relativeFilePath,
    ]);

    expect(responses).toContainEqual({
      result: ValidationResult.FAILED,
      resultDetail: `Theme file ${relativeFilePath} failed to validate:

ERROR: Schema name '${schemaName}' is too long (max 25 characters)`,
    });
  });

  it("should successfully validate a theme with an unknown filter if its check is exempted", async () => {
    // Create the test.liquid file with the specified content
    const relativeSnippetFilePath = join("snippets", "test.liquid");
    const snippetFilePath = join(snippetsDirectory, "test.liquid");
    await writeFile(snippetFilePath, "{{ 'hello' | non-existent-filter }}");

    const themeCheckYml = join(tempThemeDirectory, ".theme-check.yml");
    await writeFile(themeCheckYml, "ignore:\n- snippets/test.liquid");

    // Run validateTheme on the temporary directory
    const responses = await validateTheme(tempThemeDirectory, [
      relativeSnippetFilePath,
    ]);

    expect(responses).toContainEqual({
      result: ValidationResult.SUCCESS,
      resultDetail: `Theme file ${relativeSnippetFilePath} passed all checks from Shopify's Theme Check.`,
    });
  });

  it("should fail to validate only files that were touched by the LLM", async () => {
    for (let i = 0; i < 5; i++) {
      const snippetFilePath = join(snippetsDirectory, `test-${i}.liquid`);
      await writeFile(snippetFilePath, "{{ 'hello' | non-existent-filter }}");
    }

    const relativeSnippetFilePath = join("snippets", "test-0.liquid");

    // Run validateTheme on the temporary directory
    const responses = await validateTheme(tempThemeDirectory, [
      relativeSnippetFilePath,
    ]);

    expect(responses).toHaveLength(1);
    expect(responses).toContainEqual({
      result: ValidationResult.FAILED,
      resultDetail: `Theme file ${relativeSnippetFilePath} failed to validate:

ERROR: Unknown filter 'non-existent-filter' used.`,
    });
  });
});
