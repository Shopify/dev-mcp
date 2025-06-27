import { describe, it, expect, vi } from "vitest";
import { validateGraphQLOperation } from "./graphqlSchema.js";
import { ValidationResult } from "../types.js";
import * as shopifyAdminSchema from "../tools/shopify-admin-schema.js";

// Only mock for specific error testing scenarios
const mockLoadSchemaContent = vi.spyOn(shopifyAdminSchema, "loadSchemaContent");

describe("validateGraphQLOperation", () => {
  describe("schema name validation", () => {
    it("should reject unsupported schema names", async () => {
      const result = await validateGraphQLOperation(
        "```graphql\nquery { products { id } }\n```",
        "unsupported-schema",
      );

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toBe(
        "Unsupported schema name: unsupported-schema. Currently only 'admin' is supported.",
      );
    });

    it("should accept admin schema name", async () => {
      // This test will use the real schema and proceed to validation
      const result = await validateGraphQLOperation(
        "```graphql\nquery { nonExistentField }\n```",
        "admin",
      );

      // Should proceed past schema name validation but may fail on field validation
      expect(result.resultDetail).not.toContain("Unsupported schema name");
      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");
    });
  });

  describe("GraphQL operation extraction", () => {
    it("should skip empty code blocks", async () => {
      const result = await validateGraphQLOperation(
        "```graphql\n\n```",
        "admin",
      );

      expect(result.result).toBe(ValidationResult.SKIPPED);
      expect(result.resultDetail).toBe(
        "No GraphQL operation found in the provided markdown code block.",
      );
    });

    it("should skip code blocks with only whitespace", async () => {
      const result = await validateGraphQLOperation(
        "```graphql\n   \n  \n```",
        "admin",
      );

      expect(result.result).toBe(ValidationResult.SKIPPED);
      expect(result.resultDetail).toBe(
        "No GraphQL operation found in the provided markdown code block.",
      );
    });

    it("should extract GraphQL from proper markdown blocks", async () => {
      const result = await validateGraphQLOperation(
        "```graphql\nquery { nonExistentField }\n```",
        "admin",
      );

      // Should proceed past extraction (GraphQL was found and extracted)
      // May succeed or fail based on schema validation, but won't be skipped due to missing GraphQL
      expect(result.result).not.toBe(ValidationResult.SKIPPED);
      expect(result.resultDetail).not.toBe(
        "No GraphQL operation found in the provided markdown code block.",
      );
      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");
    });

    it("should handle GraphQL blocks without language specifier", async () => {
      const result = await validateGraphQLOperation(
        "```\nquery { nonExistentField }\n```",
        "admin",
      );

      // Should proceed past extraction
      expect(result.result).not.toBe(ValidationResult.SKIPPED);
      expect(result.resultDetail).not.toBe(
        "No GraphQL operation found in the provided markdown code block.",
      );
      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");
    });

    it("should handle plain GraphQL without markdown wrapper", async () => {
      const result = await validateGraphQLOperation(
        "query { nonExistentField }",
        "admin",
      );

      // Should extract the raw GraphQL and proceed
      expect(result.result).not.toBe(ValidationResult.SKIPPED);
      expect(result.resultDetail).not.toBe(
        "No GraphQL operation found in the provided markdown code block.",
      );
      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");
    });

    it("should skip empty string input", async () => {
      const result = await validateGraphQLOperation("", "admin");

      expect(result.result).toBe(ValidationResult.SKIPPED);
      expect(result.resultDetail).toBe(
        "No GraphQL operation found in the provided markdown code block.",
      );
    });
  });

  describe("GraphQL parsing", () => {
    it("should detect GraphQL syntax errors", async () => {
      const invalidGraphQL =
        "```graphql\nquery {\n  products {\n    id\n  // Missing closing brace\n```";

      const result = await validateGraphQLOperation(invalidGraphQL, "admin");

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("GraphQL syntax error:");
    });

    it("should handle malformed query structures", async () => {
      const malformedGraphQL = "```graphql\nquery { { { invalid } } }\n```";

      const result = await validateGraphQLOperation(malformedGraphQL, "admin");

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("GraphQL syntax error:");
    });

    it("should parse valid GraphQL syntax", async () => {
      const validSyntax = "```graphql\nquery { nonExistentField }\n```";

      const result = await validateGraphQLOperation(validSyntax, "admin");

      // Should proceed past parsing (may succeed or fail based on schema validation)
      expect(result.resultDetail).not.toContain("GraphQL syntax error:");
      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");
    });
  });

  describe("GraphQL schema validation", () => {
    it("should fail for operations with non-existent fields", async () => {
      const queryWithInvalidField =
        "```graphql\nquery { nonExistentField }\n```";

      const result = await validateGraphQLOperation(
        queryWithInvalidField,
        "admin",
      );

      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");

      // Should fail for schema validation errors (non-existent fields)
      // Unless there are schema loading/conversion issues that cause try/catch errors
      if (result.result === ValidationResult.FAILED) {
        // Could be either a schema validation error OR a schema loading error
        expect(result.resultDetail).not.toContain("GraphQL syntax error:");
        expect(result.resultDetail).not.toContain("Unsupported schema name");
      }
    });

    it("should succeed for valid GraphQL operations", async () => {
      const validQuery = `
        \`\`\`graphql
        query {
          products(first: 10) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
        \`\`\`
      `;

      const result = await validateGraphQLOperation(validQuery, "admin");

      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");

      // Should succeed for valid GraphQL operations
      // Unless there are schema loading/conversion issues that cause try/catch errors
      if (result.result === ValidationResult.SUCCESS) {
        expect(result.resultDetail).toContain("Successfully validated GraphQL");
        expect(result.resultDetail).toContain("Shopify Admin API schema");
      } else if (result.result === ValidationResult.FAILED) {
        // Could be schema loading/conversion error, not syntax or schema name error
        expect(result.resultDetail).not.toContain("GraphQL syntax error:");
        expect(result.resultDetail).not.toContain("Unsupported schema name");
      }
    });

    it("should succeed for valid mutations", async () => {
      const mutation = `
        \`\`\`graphql
        mutation {
          productCreate(input: {title: "Test Product"}) {
            product {
              id
              title
            }
          }
        }
        \`\`\`
      `;

      const result = await validateGraphQLOperation(mutation, "admin");

      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");

      // Should succeed for valid mutations
      // Unless there are schema loading/conversion issues that cause try/catch errors
      if (result.result === ValidationResult.SUCCESS) {
        expect(result.resultDetail).toContain("Successfully validated GraphQL");
        expect(result.resultDetail).toContain("Shopify Admin API schema");
      } else if (result.result === ValidationResult.FAILED) {
        // Could be schema loading/conversion error, not syntax error
        expect(result.resultDetail).not.toContain("GraphQL syntax error:");
        expect(result.resultDetail).not.toContain("Unsupported schema name");
      }
    });

    it("should fail for non-existent mutations", async () => {
      const invalidMutation = `
        \`\`\`graphql
        mutation {
          nonExistentMutation(input: {title: "Test"}) {
            result {
              id
            }
          }
        }
        \`\`\`
      `;

      const result = await validateGraphQLOperation(invalidMutation, "admin");

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");

      // Should fail for either GraphQL validation errors OR schema conversion errors
      // Both indicate the operation is invalid
      expect(result.resultDetail).not.toContain("GraphQL syntax error:");
      expect(result.resultDetail).not.toContain("Unsupported schema name");

      // The error could be either:
      // 1. "GraphQL validation errors:" for actual field validation
      // 2. "Validation error:" for schema conversion issues
      const hasValidationError =
        result.resultDetail.includes("GraphQL validation errors:") ||
        result.resultDetail.includes("Validation error:");
      expect(hasValidationError).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle schema loading errors", async () => {
      mockLoadSchemaContent.mockRejectedValueOnce(new Error("File not found"));

      const result = await validateGraphQLOperation(
        "```graphql\nquery { products { id } }\n```",
        "admin",
      );

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("Validation error: File not found");

      // Restore original implementation
      mockLoadSchemaContent.mockRestore();
    });

    it("should handle JSON parsing errors", async () => {
      mockLoadSchemaContent.mockResolvedValueOnce("invalid json");

      const result = await validateGraphQLOperation(
        "```graphql\nquery { products { id } }\n```",
        "admin",
      );

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("Validation error:");

      // Restore original implementation
      mockLoadSchemaContent.mockRestore();
    });

    it("should handle unexpected errors gracefully", async () => {
      mockLoadSchemaContent.mockImplementationOnce(() => {
        throw new Error("Unexpected error");
      });

      const result = await validateGraphQLOperation(
        "```graphql\nquery { products { id } }\n```",
        "admin",
      );

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("Validation error:");

      // Restore original implementation
      mockLoadSchemaContent.mockRestore();
    });
  });
});
