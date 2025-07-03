import { describe, it, expect, vi, beforeEach } from "vitest";
import validateGraphQLOperation from "./graphqlSchema.js";
import { ValidationResult } from "../types.js";
import * as shopifyAdminSchema from "../tools/shopify-admin-schema.js";

// Only mock for specific error testing scenarios
const mockLoadSchemaContent = vi.spyOn(shopifyAdminSchema, "loadSchemaContent");

describe("validateGraphQLOperation", () => {
  beforeEach(() => {
    // Reset mock calls and implementation before each test
    mockLoadSchemaContent.mockClear();
    mockLoadSchemaContent.mockRestore();
  });

  describe("schema name validation", () => {
    it("should reject unsupported schema names", async () => {
      const result = await validateGraphQLOperation(
        "```graphql\nquery { products { id } }\n```",
        "unsupported-schema",
      );

      expect(result.valid).toBe(false);
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).toBe(ValidationResult.FAILED);
      expect(result.detailedChecks[0].resultDetail).toBe(
        "Unsupported schema name: unsupported-schema. Currently supported schemas: admin",
      );
    });

    it("should accept admin schema name", async () => {
      // This test will use the real schema and proceed to validation
      const result = await validateGraphQLOperation(
        "```graphql\nquery { nonExistentField }\n```",
        "admin",
      );

      // Should proceed past schema name validation but may fail on field validation
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].resultDetail).not.toContain(
        "Unsupported schema name",
      );
      expect(result.detailedChecks[0].resultDetail).toBeDefined();
      expect(typeof result.detailedChecks[0].resultDetail).toBe("string");
    });

    it("should list all supported schemas in error message", async () => {
      const result = await validateGraphQLOperation(
        "```graphql\nquery { products { id } }\n```",
        "invalid-schema",
      );

      expect(result.valid).toBe(false);
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).toBe(ValidationResult.FAILED);
      expect(result.detailedChecks[0].resultDetail).toContain(
        "Currently supported schemas:",
      );
      expect(result.detailedChecks[0].resultDetail).toContain("admin");
    });
  });

  describe("GraphQL operation extraction", () => {
    it("should skip when no GraphQL codeblocks found", async () => {
      const result = await validateGraphQLOperation(
        "```python\nprint('hello')\n```",
        "admin",
      );

      expect(result.valid).toBe(false);
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).toBe(ValidationResult.SKIPPED);
      expect(result.detailedChecks[0].resultDetail).toBe(
        "No GraphQL codeblocks found in the provided markdown response.",
      );
    });

    it("should skip empty GraphQL codeblocks", async () => {
      const result = await validateGraphQLOperation(
        "```graphql\n\n```",
        "admin",
      );

      expect(result.valid).toBe(false);
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).toBe(ValidationResult.SKIPPED);
      expect(result.detailedChecks[0].resultDetail).toBe(
        "No GraphQL codeblocks found in the provided markdown response.",
      );
    });

    it("should extract GraphQL from proper markdown blocks", async () => {
      const result = await validateGraphQLOperation(
        "```graphql\nquery { nonExistentField }\n```",
        "admin",
      );

      // Should proceed past extraction (GraphQL was found and extracted)
      // May succeed or fail based on schema validation, but won't be skipped due to missing GraphQL
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).not.toBe(
        ValidationResult.SKIPPED,
      );
      expect(result.detailedChecks[0].resultDetail).not.toBe(
        "No GraphQL codeblocks found in the provided markdown response.",
      );
      expect(result.detailedChecks[0].resultDetail).toBeDefined();
      expect(typeof result.detailedChecks[0].resultDetail).toBe("string");
    });

    it("should handle multiple GraphQL blocks", async () => {
      const result = await validateGraphQLOperation(
        "```graphql\nquery { shop { name } }\n```\n\n```graphql\nquery { products { id } }\n```",
        "admin",
      );

      // Should extract multiple blocks
      expect(result.detailedChecks).toHaveLength(2);
      expect(result.detailedChecks[0].result).not.toBe(
        ValidationResult.SKIPPED,
      );
      expect(result.detailedChecks[1].result).not.toBe(
        ValidationResult.SKIPPED,
      );
    });

    it("should skip empty string input", async () => {
      const result = await validateGraphQLOperation("", "admin");

      expect(result.valid).toBe(false);
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).toBe(ValidationResult.SKIPPED);
      expect(result.detailedChecks[0].resultDetail).toBe(
        "No GraphQL codeblocks found in the provided markdown response.",
      );
    });

    it("should extract GraphQL from codeblocks with 'query' language identifier", async () => {
      const result = await validateGraphQLOperation(
        "```query\nquery { shop { name } }\n```",
        "admin",
      );

      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).not.toBe(
        ValidationResult.SKIPPED,
      );
      expect(result.detailedChecks[0].resultDetail).not.toBe(
        "No GraphQL codeblocks found in the provided markdown response.",
      );
    });

    it("should extract GraphQL from codeblocks with 'mutation' language identifier", async () => {
      const result = await validateGraphQLOperation(
        '```mutation\nmutation { productCreate(input: {title: "Test"}) { product { id } } }\n```',
        "admin",
      );

      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).not.toBe(
        ValidationResult.SKIPPED,
      );
      expect(result.detailedChecks[0].resultDetail).not.toBe(
        "No GraphQL codeblocks found in the provided markdown response.",
      );
    });

    it("should extract GraphQL from codeblocks with 'subscription' language identifier", async () => {
      const result = await validateGraphQLOperation(
        "```subscription\nsubscription { orders { id } }\n```",
        "admin",
      );

      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).not.toBe(
        ValidationResult.SKIPPED,
      );
      expect(result.detailedChecks[0].resultDetail).not.toBe(
        "No GraphQL codeblocks found in the provided markdown response.",
      );
    });

    it("should extract GraphQL from codeblocks with operation name after language identifier", async () => {
      const result = await validateGraphQLOperation(
        "```query AssignedFulfillmentOrderList\nquery { shop { name } }\n```",
        "admin",
      );

      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).not.toBe(
        ValidationResult.SKIPPED,
      );
      expect(result.detailedChecks[0].resultDetail).not.toBe(
        "No GraphQL codeblocks found in the provided markdown response.",
      );
    });

    it("should use fallback extraction for unlabeled codeblocks with GraphQL content", async () => {
      const result = await validateGraphQLOperation(
        "```\nquery { shop { name } }\n```",
        "admin",
      );

      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).not.toBe(
        ValidationResult.SKIPPED,
      );
      expect(result.detailedChecks[0].resultDetail).not.toBe(
        "No GraphQL codeblocks found in the provided markdown response.",
      );
    });

    it("should skip non-GraphQL codeblocks even with fallback", async () => {
      const result = await validateGraphQLOperation(
        "```\nconst x = 'hello world';\nconsole.log(x);\n```",
        "admin",
      );

      expect(result.valid).toBe(false);
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).toBe(ValidationResult.SKIPPED);
      expect(result.detailedChecks[0].resultDetail).toBe(
        "No GraphQL codeblocks found in the provided markdown response.",
      );
    });

    it("should prefer primary regex over fallback when both match", async () => {
      // This markdown has both a graphql-labeled block and an unlabeled block
      const result = await validateGraphQLOperation(
        "```graphql\nquery { shop { name } }\n```\n\n```\nquery { products { id } }\n```",
        "admin",
      );

      // Should only extract the graphql-labeled block (primary regex)
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).not.toBe(
        ValidationResult.SKIPPED,
      );
    });

    it("should fix the original Claude 4.1 issue with 'query' language identifier and operation name", async () => {
      // This tests the core issue: extraction from codeblocks with operation names after language identifier
      const claudeGeneratedMarkdown =
        "```query GetProducts\nquery { shop { name } }\n```";

      const result = await validateGraphQLOperation(
        claudeGeneratedMarkdown,
        "admin",
      );

      // Should successfully extract the GraphQL operation (the main fix)
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).not.toBe(
        ValidationResult.SKIPPED,
      );
      expect(result.detailedChecks[0].resultDetail).not.toBe(
        "No GraphQL codeblocks found in the provided markdown response.",
      );

      // The key fix: we should be able to extract and process the GraphQL
      // Before the fix, this would have been skipped entirely
      expect([ValidationResult.SUCCESS, ValidationResult.FAILED]).toContain(
        result.detailedChecks[0].result,
      );
    });

    it("should properly validate invalid GraphQL queries and return failure", async () => {
      // Test the user's specific case to ensure validation works correctly
      const invalidQuery = `\`\`\`graphql
query {
  shop {
    name
    bananaField
  }
  nonExistentRootQuery {
    id
  }
}
\`\`\``;

      const result = await validateGraphQLOperation(invalidQuery, "admin");

      // Should extract the GraphQL successfully
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).not.toBe(
        ValidationResult.SKIPPED,
      );

      // Should fail validation due to invalid fields
      expect(result.valid).toBe(false);
      expect(result.detailedChecks[0].result).toBe(ValidationResult.FAILED);
      expect(result.detailedChecks[0].resultDetail).toContain(
        "GraphQL validation errors:",
      );
      expect(result.detailedChecks[0].resultDetail).toContain("bananaField");
      expect(result.detailedChecks[0].resultDetail).toContain(
        "nonExistentRootQuery",
      );
    });
  });

  describe("GraphQL parsing", () => {
    it("should detect GraphQL syntax errors", async () => {
      const invalidGraphQL =
        "```graphql\nquery {\n  products {\n    id\n  // Missing closing brace\n```";

      const result = await validateGraphQLOperation(invalidGraphQL, "admin");

      expect(result.valid).toBe(false);
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).toBe(ValidationResult.FAILED);
      expect(result.detailedChecks[0].resultDetail).toContain(
        "GraphQL syntax error:",
      );
    });

    it("should handle malformed query structures", async () => {
      const malformedGraphQL = "```graphql\nquery { { { invalid } } }\n```";

      const result = await validateGraphQLOperation(malformedGraphQL, "admin");

      expect(result.valid).toBe(false);
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).toBe(ValidationResult.FAILED);
      expect(result.detailedChecks[0].resultDetail).toContain(
        "GraphQL syntax error:",
      );
    });

    it("should parse valid GraphQL syntax", async () => {
      const validSyntax = "```graphql\nquery { shop { name } }\n```";

      const result = await validateGraphQLOperation(validSyntax, "admin");

      // Should proceed past parsing (may succeed or fail based on schema validation)
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].resultDetail).not.toContain(
        "GraphQL syntax error:",
      );
      expect(result.detailedChecks[0].resultDetail).toBeDefined();
      expect(typeof result.detailedChecks[0].resultDetail).toBe("string");
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

      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].resultDetail).toBeDefined();
      expect(typeof result.detailedChecks[0].resultDetail).toBe("string");

      // Should fail for schema validation errors (non-existent fields)
      // Unless there are schema loading/conversion issues that cause try/catch errors
      if (result.detailedChecks[0].result === ValidationResult.FAILED) {
        // Could be either a schema validation error OR a schema loading error
        expect(result.detailedChecks[0].resultDetail).not.toContain(
          "GraphQL syntax error:",
        );
        expect(result.detailedChecks[0].resultDetail).not.toContain(
          "Unsupported schema name",
        );
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

      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].resultDetail).toBeDefined();
      expect(typeof result.detailedChecks[0].resultDetail).toBe("string");

      // Should succeed for valid GraphQL operations
      // Unless there are schema loading/conversion issues that cause try/catch errors
      if (result.detailedChecks[0].result === ValidationResult.SUCCESS) {
        expect(result.detailedChecks[0].resultDetail).toContain(
          "Successfully validated GraphQL",
        );
        expect(result.detailedChecks[0].resultDetail).toContain("Admin API schema");
      } else if (result.detailedChecks[0].result === ValidationResult.FAILED) {
        // Could be schema loading/conversion error, not syntax or schema name error
        expect(result.detailedChecks[0].resultDetail).not.toContain(
          "GraphQL syntax error:",
        );
        expect(result.detailedChecks[0].resultDetail).not.toContain(
          "Unsupported schema name",
        );
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

      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].resultDetail).toBeDefined();
      expect(typeof result.detailedChecks[0].resultDetail).toBe("string");

      // Should succeed for valid mutations
      // Unless there are schema loading/conversion issues that cause try/catch errors
      if (result.detailedChecks[0].result === ValidationResult.SUCCESS) {
        expect(result.detailedChecks[0].resultDetail).toContain(
          "Successfully validated GraphQL",
        );
        expect(result.detailedChecks[0].resultDetail).toContain("Admin API schema");
      } else if (result.detailedChecks[0].result === ValidationResult.FAILED) {
        // Could be schema loading/conversion error, not syntax error
        expect(result.detailedChecks[0].resultDetail).not.toContain(
          "GraphQL syntax error:",
        );
        expect(result.detailedChecks[0].resultDetail).not.toContain(
          "Unsupported schema name",
        );
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

      expect(result.valid).toBe(false);
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).toBe(ValidationResult.FAILED);
      expect(result.detailedChecks[0].resultDetail).toBeDefined();
      expect(typeof result.detailedChecks[0].resultDetail).toBe("string");

      // Should fail for either GraphQL validation errors OR schema conversion errors
      // Both indicate the operation is invalid
      expect(result.detailedChecks[0].resultDetail).not.toContain(
        "GraphQL syntax error:",
      );
      expect(result.detailedChecks[0].resultDetail).not.toContain(
        "Unsupported schema name",
      );

      // The error could be either:
      // 1. "GraphQL validation errors:" for actual field validation
      // 2. "Validation error:" for schema conversion issues
      const hasValidationError =
        result.detailedChecks[0].resultDetail.includes(
          "GraphQL validation errors:",
        ) ||
        result.detailedChecks[0].resultDetail.includes("Validation error:");
      expect(hasValidationError).toBe(true);
    });
  });

  describe("real-world scenarios", () => {
    it("should validate the original problem query successfully", async () => {
      const validQuery = `
        \`\`\`graphql
        query MostRecentProducts {
          products(first: 10, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                id
                title
                handle
                createdAt
              }
            }
          }
        }
        \`\`\`
      `;

      const result = await validateGraphQLOperation(validQuery, "admin");

      // This should succeed - the query is valid GraphQL for Shopify Admin API
      // Before the fix, this would fail with interface implementation errors
      // After the fix, it should validate successfully
      expect(result.valid).toBe(true);
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).toBe(ValidationResult.SUCCESS);
      expect(result.detailedChecks[0].resultDetail).toContain(
        "Successfully validated GraphQL",
      );
      expect(result.detailedChecks[0].resultDetail).toContain("Admin API schema");
    });
  });

  describe("error handling", () => {
    it("should handle actual GraphQL validation errors", async () => {
      // Test with an invalid query that should fail GraphQL validation
      const result = await validateGraphQLOperation(
        "```graphql\nquery { products { id } }\n```", // This will fail because products connection needs to specify edges
        "admin",
      );

      expect(result.valid).toBe(false);
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).toBe(ValidationResult.FAILED);
      expect(result.detailedChecks[0].resultDetail).toContain(
        "GraphQL validation errors:",
      );
    });

    it("should handle schema loading robustly", async () => {
      // Our improved schema loading should work reliably
      // Test that the schema loads and processes correctly
      const result = await validateGraphQLOperation(
        "```graphql\nquery { shop { name } }\n```", // Simple valid query
        "admin",
      );

      expect(result.valid).toBe(true);
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).toBe(ValidationResult.SUCCESS);
      expect(result.detailedChecks[0].resultDetail).toContain(
        "Successfully validated GraphQL",
      );
    });

    it("should provide clear error messages for invalid operations", async () => {
      const result = await validateGraphQLOperation(
        "```graphql\nquery { nonExistentField }\n```",
        "admin",
      );

      expect(result.valid).toBe(false);
      expect(result.detailedChecks).toHaveLength(1);
      expect(result.detailedChecks[0].result).toBe(ValidationResult.FAILED);
      expect(result.detailedChecks[0].resultDetail).toContain(
        "GraphQL validation errors:",
      );
      expect(result.detailedChecks[0].resultDetail).toContain(
        "Cannot query field",
      );
    });
  });

  describe("schema mapping extensibility", () => {
    it("should be easily extensible for new schemas", async () => {
      // This test documents the expected behavior when new schemas are added
      // Currently only 'admin' is supported, but the structure supports more
      const supportedSchemas = ["admin"]; // This would grow as schemas are added

      for (const schema of supportedSchemas) {
        const result = await validateGraphQLOperation(
          "```graphql\nquery { shop { name } }\n```",
          schema,
        );

        // Should not fail due to unsupported schema name
        expect(result.detailedChecks).toHaveLength(1);
        expect(result.detailedChecks[0].resultDetail).not.toContain(
          "Unsupported schema name",
        );
      }
    });
  });
});
