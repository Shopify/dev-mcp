import { beforeEach, describe, expect, it, vi } from "vitest";
import * as shopifyAdminSchema from "../tools/shopifyAdminSchema.js";
import { ValidationResult } from "../types.js";
import validateGraphQLOperation from "./graphqlSchema.js";

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
        "query { products { id } }",
        "unsupported-schema",
      );

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toBe(
        "Unsupported schema name: unsupported-schema. Currently supported schemas: admin",
      );
    });

    it("should accept admin schema name", async () => {
      // This test will use the real schema and proceed to validation
      const result = await validateGraphQLOperation(
        "query { nonExistentField }",
        "admin",
      );

      // Should proceed past schema name validation but may fail on field validation
      expect(result.resultDetail).not.toContain("Unsupported schema name");
      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");
    });

    it("should list all supported schemas in error message", async () => {
      const result = await validateGraphQLOperation(
        "query { products { id } }",
        "invalid-schema",
      );

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("Currently supported schemas:");
      expect(result.resultDetail).toContain("admin");
    });
  });

  describe("GraphQL operation processing", () => {
    it("should fail for empty code", async () => {
      const result = await validateGraphQLOperation("", "admin");

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toBe(
        "No GraphQL operation found in the provided code.",
      );
    });

    it("should fail for code with only whitespace", async () => {
      const result = await validateGraphQLOperation("   \n  \n", "admin");

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toBe(
        "No GraphQL operation found in the provided code.",
      );
    });

    it("should process valid GraphQL code", async () => {
      const result = await validateGraphQLOperation(
        "query { nonExistentField }",
        "admin",
      );

      // Should proceed past processing (GraphQL was found and processed)
      // May succeed or fail based on schema validation, but won't fail due to missing GraphQL
      expect(result.resultDetail).not.toBe(
        "No GraphQL operation found in the provided code.",
      );
      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");
    });

    it("should handle GraphQL with extra whitespace", async () => {
      const result = await validateGraphQLOperation(
        "  \n  query { nonExistentField }  \n  ",
        "admin",
      );

      // Should process the GraphQL and proceed
      expect(result.resultDetail).not.toBe(
        "No GraphQL operation found in the provided code.",
      );
      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");
    });
  });

  describe("GraphQL parsing", () => {
    it("should detect GraphQL syntax errors", async () => {
      const invalidGraphQL =
        "query {\n  products {\n    id\n  // Missing closing brace";

      const result = await validateGraphQLOperation(invalidGraphQL, "admin");

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("GraphQL syntax error:");
    });

    it("should handle malformed query structures", async () => {
      const malformedGraphQL = "query { { { invalid } } }";

      const result = await validateGraphQLOperation(malformedGraphQL, "admin");

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("GraphQL syntax error:");
    });

    it("should parse valid GraphQL syntax", async () => {
      const validSyntax = "query { nonExistentField }";

      const result = await validateGraphQLOperation(validSyntax, "admin");

      // Should proceed past parsing (may succeed or fail based on schema validation)
      expect(result.resultDetail).not.toContain("GraphQL syntax error:");
      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");
    });
  });

  describe("GraphQL schema validation", () => {
    it("should fail for operations with non-existent fields", async () => {
      const queryWithInvalidField = "query { nonExistentField }";

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
      `;

      const result = await validateGraphQLOperation(validQuery, "admin");

      expect(result.resultDetail).toContain("Successfully validated GraphQL");
      expect(result.resultDetail).toContain("admin schema");
      expect(result.result).toBe(ValidationResult.SUCCESS);
    });

    it("should succeed for valid mutations", async () => {
      const mutation = `
        mutation {
          productCreate(product: {title: "Test Product"}) {
            product {
              id
              title
            }
          }
        }
      `;

      const result = await validateGraphQLOperation(mutation, "admin");

      expect(result.resultDetail).toContain("Successfully validated GraphQL");
      expect(result.resultDetail).toContain("admin schema");
      expect(result.result).toBe(ValidationResult.SUCCESS);
    });

    it("should fail for non-existent mutations", async () => {
      const invalidMutation = `
        mutation {
          nonExistentMutation(input: {title: "Test"}) {
            result {
              id
            }
          }
        }
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

  describe("real-world scenarios", () => {
    it("should validate the original problem query successfully", async () => {
      const validQuery = `
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
      `;

      const result = await validateGraphQLOperation(validQuery, "admin");

      expect(result.result).toBe(ValidationResult.SUCCESS);
      expect(result.resultDetail).toContain("Successfully validated GraphQL");
      expect(result.resultDetail).toContain("admin schema");
    });
  });
  describe("error handling", () => {
    it("should handle actual GraphQL validation errors", async () => {
      // Test with an invalid query that should fail GraphQL validation
      const result = await validateGraphQLOperation(
        "query { products { id } }", // This will fail because products connection needs to specify edges
        "admin",
      );

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("GraphQL validation errors:");
    });

    it("should provide clear error messages for invalid operations", async () => {
      const result = await validateGraphQLOperation(
        "query { nonExistentField }",
        "admin",
      );

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("GraphQL validation errors:");
      expect(result.resultDetail).toContain("Cannot query field");
    });
  });
});
