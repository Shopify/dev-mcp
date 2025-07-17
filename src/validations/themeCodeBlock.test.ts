import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationResult } from "../types.js";
import validateThemeCodeblocks from "./themeCodeBlock.js";

describe("validateThemeCodeblocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully validate a single codeblock", async () => {
    const codeblocks = [
      {
        fileName: "test.liquid",
        fileType: "snippets" as const,
        content: "{{ 1 + 1 }}",
      },
    ];

    const result = await validateThemeCodeblocks(codeblocks);

    expect(result).toEqual([
      {
        result: ValidationResult.SUCCESS,
        resultDetail:
          "Theme codeblock test.liquid had no offenses from using Shopify's Theme Check.",
      },
    ]);
  });

  it("should successfully validate liquid code with translations", async () => {
    const codeblocks = [
      {
        fileName: "test.liquid",
        fileType: "snippets" as const,
        content: "{{ 'translated_string' | t }}",
      },
      {
        fileName: "en.default.json",
        fileType: "locales" as const,
        content: `{
          "translated_string": "translated string"
        }`,
      },
    ];

    const result = await validateThemeCodeblocks(codeblocks);

    expect(result).toContainEqual({
      result: ValidationResult.SUCCESS,
      resultDetail:
        "Theme codeblock test.liquid had no offenses from using Shopify's Theme Check.",
    });
    expect(result).toContainEqual({
      result: ValidationResult.SUCCESS,
      resultDetail:
        "Theme codeblock en.default.json had no offenses from using Shopify's Theme Check.",
    });
  });

  it("should successfully validate liquid code with referenced assets", async () => {
    const codeblocks = [
      {
        fileName: "test.liquid",
        fileType: "snippets" as const,
        content: "{{ 'index.css' | asset_url | stylesheet_tag }}",
      },
      {
        fileName: "index.css",
        fileType: "assets" as const,
        content: `body {
          background-color: red;
        }`,
      },
    ];

    const result = await validateThemeCodeblocks(codeblocks);

    expect(result).toContainEqual({
      result: ValidationResult.SUCCESS,
      resultDetail:
        "Theme codeblock test.liquid had no offenses from using Shopify's Theme Check.",
    });
    expect(result).toContainEqual({
      result: ValidationResult.SUCCESS,
      resultDetail:
        "Theme codeblock index.css had no offenses from using Shopify's Theme Check.",
    });
  });

  it("should successfully validate liquid code referencing another liquid file", async () => {
    const codeblocks = [
      {
        fileName: "test.liquid",
        fileType: "snippets" as const,
        content: "{% render 'child-snippet' %}",
      },
      {
        fileName: "child-snippet.liquid",
        fileType: "snippets" as const,
        content: `{{ 'child snippet' }}`,
      },
    ];

    const result = await validateThemeCodeblocks(codeblocks);

    expect(result).toContainEqual({
      result: ValidationResult.SUCCESS,
      resultDetail:
        "Theme codeblock test.liquid had no offenses from using Shopify's Theme Check.",
    });
    expect(result).toContainEqual({
      result: ValidationResult.SUCCESS,
      resultDetail:
        "Theme codeblock child-snippet.liquid had no offenses from using Shopify's Theme Check.",
    });
  });

  it("should fail to validate liquid code using a non-existent filter", async () => {
    const codeblocks = [
      {
        fileName: "test.liquid",
        fileType: "snippets" as const,
        content: "{{ 'test' | non-existent-filter }}",
      },
    ];

    const result = await validateThemeCodeblocks(codeblocks);

    expect(result).toContainEqual({
      result: ValidationResult.FAILED,
      resultDetail:
        "Theme codeblock test.liquid has the following offenses from using Shopify's Theme Check:\n\nERROR: Unknown filter 'non-existent-filter' used.",
    });
  });

  it("should fail to validate liquid code and offer suggestions", async () => {
    const codeblocks = [
      {
        fileName: "test.liquid",
        fileType: "snippets" as const,
        content: "{% assign some_var = 'test' %}",
      },
    ];

    const result = await validateThemeCodeblocks(codeblocks);

    expect(result).toContainEqual({
      result: ValidationResult.FAILED,
      resultDetail:
        "Theme codeblock test.liquid has the following offenses from using Shopify's Theme Check:\n\nERROR: The variable 'some_var' is assigned but not used; SUGGESTED FIXES: Remove the unused variable 'some_var'",
    });
  });

  it("should fail to validate liquid code referencing a non-existent file", async () => {
    const codeblocks = [
      {
        fileName: "test.liquid",
        fileType: "snippets" as const,
        content: "{% render 'non-existent-snippet' %}",
      },
    ];

    const result = await validateThemeCodeblocks(codeblocks);

    expect(result).toContainEqual({
      result: ValidationResult.FAILED,
      resultDetail:
        "Theme codeblock test.liquid has the following offenses from using Shopify's Theme Check:\n\nERROR: 'snippets/non-existent-snippet.liquid' does not exist",
    });
  });
});
