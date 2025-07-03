import { describe, it, expect } from "vitest";
import {
  formatValidationResults,
  validationSummary,
} from "./validationUtils.js";
import { ValidationResult, ValidationFunctionResult } from "../types.js";

describe("validationUtils", () => {
  describe("formatValidationResults", () => {
    it("should format validation results with all successful checks", () => {
      const input: ValidationFunctionResult = {
        valid: true,
        detailedChecks: [
          {
            result: ValidationResult.SUCCESS,
            resultDetail: "Valid GraphQL query",
          },
          {
            result: ValidationResult.SUCCESS,
            resultDetail: "Valid GraphQL mutation",
          },
        ],
      };

      const result = formatValidationResults(input);

      expect(result).toEqual({
        valid: true,
        detailedChecks: input.detailedChecks,
      });
    });

    it("should format validation results with failed checks", () => {
      const input: ValidationFunctionResult = {
        valid: false,
        detailedChecks: [
          {
            result: ValidationResult.SUCCESS,
            resultDetail: "Valid GraphQL query",
          },
          {
            result: ValidationResult.FAILED,
            resultDetail: "Invalid GraphQL operation",
          },
        ],
      };

      const result = formatValidationResults(input);

      expect(result).toEqual({
        valid: false,
        detailedChecks: input.detailedChecks,
      });
    });

    it("should format validation results with skipped checks", () => {
      const input: ValidationFunctionResult = {
        valid: false,
        detailedChecks: [
          {
            result: ValidationResult.SKIPPED,
            resultDetail: "Skipped empty codeblock",
          },
        ],
      };

      const result = formatValidationResults(input);

      expect(result).toEqual({
        valid: false,
        detailedChecks: input.detailedChecks,
      });
    });

    it("should handle empty detailedChecks array", () => {
      const input: ValidationFunctionResult = {
        valid: true,
        detailedChecks: [],
      };

      const result = formatValidationResults(input);

      expect(result).toEqual({
        valid: false, // overallStatus returns SKIPPED when no checks exist
        detailedChecks: [],
      });
    });
  });

  describe("validationSummary", () => {
    it("should generate summary with success icons", () => {
      const input: ValidationFunctionResult = {
        valid: true,
        detailedChecks: [
          {
            result: ValidationResult.SUCCESS,
            resultDetail: "Valid GraphQL query",
          },
          {
            result: ValidationResult.SUCCESS,
            resultDetail: "Valid GraphQL mutation",
          },
        ],
      };

      const result = validationSummary(input);

      expect(result).toContain("## Detailed Results");
      expect(result).toContain("### Validation 1");
      expect(result).toContain("**Status:** ✅ SUCCESS");
      expect(result).toContain("**Details:** Valid GraphQL query");
      expect(result).toContain("### Validation 2");
      expect(result).toContain("**Details:** Valid GraphQL mutation");
    });

    it("should generate summary with failure icons", () => {
      const input: ValidationFunctionResult = {
        valid: false,
        detailedChecks: [
          {
            result: ValidationResult.FAILED,
            resultDetail: "Invalid GraphQL operation",
          },
        ],
      };

      const result = validationSummary(input);

      expect(result).toContain("## Detailed Results");
      expect(result).toContain("### Validation 1");
      expect(result).toContain("**Status:** ❌ FAILED");
      expect(result).toContain("**Details:** Invalid GraphQL operation");
    });

    it("should generate summary with skipped icons", () => {
      const input: ValidationFunctionResult = {
        valid: false,
        detailedChecks: [
          {
            result: ValidationResult.SKIPPED,
            resultDetail: "Skipped empty codeblock",
          },
        ],
      };

      const result = validationSummary(input);

      expect(result).toContain("## Detailed Results");
      expect(result).toContain("### Validation 1");
      expect(result).toContain("**Status:** ⏭️ SKIPPED");
      expect(result).toContain("**Details:** Skipped empty codeblock");
    });

    it("should generate summary with mixed validation results", () => {
      const input: ValidationFunctionResult = {
        valid: false,
        detailedChecks: [
          {
            result: ValidationResult.SUCCESS,
            resultDetail: "Valid GraphQL query",
          },
          {
            result: ValidationResult.FAILED,
            resultDetail: "Invalid GraphQL operation",
          },
          {
            result: ValidationResult.SKIPPED,
            resultDetail: "Skipped empty codeblock",
          },
        ],
      };

      const result = validationSummary(input);

      expect(result).toContain("## Detailed Results");
      expect(result).toContain("### Validation 1");
      expect(result).toContain("**Status:** ✅ SUCCESS");
      expect(result).toContain("### Validation 2");
      expect(result).toContain("**Status:** ❌ FAILED");
      expect(result).toContain("### Validation 3");
      expect(result).toContain("**Status:** ⏭️ SKIPPED");
    });

    it("should handle empty detailedChecks array", () => {
      const input: ValidationFunctionResult = {
        valid: true,
        detailedChecks: [],
      };

      const result = validationSummary(input);

      expect(result).toContain("## Detailed Results");
      expect(result).not.toContain("### Validation");
    });

    it("should properly number validation results", () => {
      const input: ValidationFunctionResult = {
        valid: true,
        detailedChecks: [
          {
            result: ValidationResult.SUCCESS,
            resultDetail: "First validation",
          },
          {
            result: ValidationResult.SUCCESS,
            resultDetail: "Second validation",
          },
          {
            result: ValidationResult.SUCCESS,
            resultDetail: "Third validation",
          },
        ],
      };

      const result = validationSummary(input);

      expect(result).toContain("### Validation 1");
      expect(result).toContain("### Validation 2");
      expect(result).toContain("### Validation 3");
      expect(result).toContain("**Details:** First validation");
      expect(result).toContain("**Details:** Second validation");
      expect(result).toContain("**Details:** Third validation");
    });
  });
});
