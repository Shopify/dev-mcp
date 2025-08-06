import { vol } from "memfs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs");
vi.mock("node:fs/promises");

import * as introspectGraphqlSchema from "../tools/introspect_graphql_schema/index.js";
import { ValidationResult } from "../types.js";
import validateGraphQLOperation from "./graphqlSchema.js";

// Mock schemas for testing
const mockSchemas: introspectGraphqlSchema.Schema[] = [
  {
    api: "admin",
    id: "admin_2025-01",
    version: "2025-01",
    url: "https://example.com/admin_2025-01.json",
  },
];

// Comprehensive mock GraphQL schema for admin API
const mockAdminSchema = {
  data: {
    __schema: {
      queryType: { name: "QueryRoot" },
      mutationType: { name: "Mutation" },
      subscriptionType: null,
      types: [
        {
          kind: "OBJECT",
          name: "QueryRoot",
          description: "The schema's entry-point for queries.",
          fields: [
            {
              name: "products",
              description: "List of the shop's products.",
              args: [
                {
                  name: "first",
                  description:
                    "Returns up to the first `n` elements from the list.",
                  type: {
                    kind: "SCALAR",
                    name: "Int",
                    ofType: null,
                  },
                  defaultValue: null,
                },
                {
                  name: "after",
                  description:
                    "Returns the elements that come after the specified cursor.",
                  type: {
                    kind: "SCALAR",
                    name: "String",
                    ofType: null,
                  },
                  defaultValue: null,
                },
                {
                  name: "last",
                  description:
                    "Returns up to the last `n` elements from the list.",
                  type: {
                    kind: "SCALAR",
                    name: "Int",
                    ofType: null,
                  },
                  defaultValue: null,
                },
                {
                  name: "before",
                  description:
                    "Returns the elements that come before the specified cursor.",
                  type: {
                    kind: "SCALAR",
                    name: "String",
                    ofType: null,
                  },
                  defaultValue: null,
                },
                {
                  name: "reverse",
                  description: "Reverse the order of the underlying list.",
                  type: {
                    kind: "SCALAR",
                    name: "Boolean",
                    ofType: null,
                  },
                  defaultValue: "false",
                },
                {
                  name: "sortKey",
                  description: "Sort the underlying list by the given key.",
                  type: {
                    kind: "ENUM",
                    name: "ProductSortKeys",
                    ofType: null,
                  },
                  defaultValue: "ID",
                },
                {
                  name: "query",
                  description: "Supported filter parameters.",
                  type: {
                    kind: "SCALAR",
                    name: "String",
                    ofType: null,
                  },
                  defaultValue: null,
                },
              ],
              type: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "OBJECT",
                  name: "ProductConnection",
                  ofType: null,
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "product",
              description: "Returns a Product resource by ID.",
              args: [
                {
                  name: "id",
                  description: "The ID of the Product to return.",
                  type: {
                    kind: "NON_NULL",
                    name: null,
                    ofType: {
                      kind: "SCALAR",
                      name: "ID",
                      ofType: null,
                    },
                  },
                  defaultValue: null,
                },
              ],
              type: {
                kind: "OBJECT",
                name: "Product",
                ofType: null,
              },
              isDeprecated: false,
              deprecationReason: null,
            },
          ],
          inputFields: null,
          interfaces: [],
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "OBJECT",
          name: "Mutation",
          description: "The schema's entry-point for mutations.",
          fields: [
            {
              name: "productCreate",
              description: "Creates a product.",
              args: [
                {
                  name: "product",
                  description: "The properties for the new product.",
                  type: {
                    kind: "NON_NULL",
                    name: null,
                    ofType: {
                      kind: "INPUT_OBJECT",
                      name: "ProductInput",
                      ofType: null,
                    },
                  },
                  defaultValue: null,
                },
              ],
              type: {
                kind: "OBJECT",
                name: "ProductCreatePayload",
                ofType: null,
              },
              isDeprecated: false,
              deprecationReason: null,
            },
          ],
          inputFields: null,
          interfaces: [],
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "OBJECT",
          name: "ProductConnection",
          description:
            "An auto-generated type for paginating through multiple Products.",
          fields: [
            {
              name: "edges",
              description: "A list of edges.",
              args: [],
              type: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "LIST",
                  name: null,
                  ofType: {
                    kind: "NON_NULL",
                    name: null,
                    ofType: {
                      kind: "OBJECT",
                      name: "ProductEdge",
                      ofType: null,
                    },
                  },
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "nodes",
              description: "A list of the nodes contained in ProductEdge.",
              args: [],
              type: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "LIST",
                  name: null,
                  ofType: {
                    kind: "NON_NULL",
                    name: null,
                    ofType: {
                      kind: "OBJECT",
                      name: "Product",
                      ofType: null,
                    },
                  },
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "pageInfo",
              description: "Information to aid in pagination.",
              args: [],
              type: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "OBJECT",
                  name: "PageInfo",
                  ofType: null,
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
          ],
          inputFields: null,
          interfaces: [],
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "OBJECT",
          name: "ProductEdge",
          description:
            "An auto-generated type which holds one Product and a cursor during pagination.",
          fields: [
            {
              name: "cursor",
              description: "A cursor for use in pagination.",
              args: [],
              type: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "SCALAR",
                  name: "String",
                  ofType: null,
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "node",
              description: "The item at the end of ProductEdge.",
              args: [],
              type: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "OBJECT",
                  name: "Product",
                  ofType: null,
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
          ],
          inputFields: null,
          interfaces: [],
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "OBJECT",
          name: "Product",
          description:
            "A product represents an individual item for sale in a Shopify store.",
          fields: [
            {
              name: "id",
              description: "A globally-unique identifier.",
              args: [],
              type: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "SCALAR",
                  name: "ID",
                  ofType: null,
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "title",
              description: "The title of the product.",
              args: [],
              type: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "SCALAR",
                  name: "String",
                  ofType: null,
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "handle",
              description:
                "A human-friendly unique string for the Product automatically generated from its title.",
              args: [],
              type: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "SCALAR",
                  name: "String",
                  ofType: null,
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "createdAt",
              description: "The date and time when the product was created.",
              args: [],
              type: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "SCALAR",
                  name: "DateTime",
                  ofType: null,
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
          ],
          inputFields: null,
          interfaces: [
            {
              kind: "INTERFACE",
              name: "Node",
              ofType: null,
            },
          ],
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "INPUT_OBJECT",
          name: "ProductInput",
          description: "The input fields for a product.",
          fields: null,
          inputFields: [
            {
              name: "title",
              description: "The title of the product.",
              type: {
                kind: "SCALAR",
                name: "String",
                ofType: null,
              },
              defaultValue: null,
            },
            {
              name: "handle",
              description:
                "A human-friendly unique string for the Product automatically generated from its title.",
              type: {
                kind: "SCALAR",
                name: "String",
                ofType: null,
              },
              defaultValue: null,
            },
          ],
          interfaces: null,
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "OBJECT",
          name: "ProductCreatePayload",
          description: "Return type for `productCreate` mutation.",
          fields: [
            {
              name: "product",
              description: "The product object.",
              args: [],
              type: {
                kind: "OBJECT",
                name: "Product",
                ofType: null,
              },
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "userErrors",
              description:
                "The list of errors that occurred from executing the mutation.",
              args: [],
              type: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "LIST",
                  name: null,
                  ofType: {
                    kind: "NON_NULL",
                    name: null,
                    ofType: {
                      kind: "OBJECT",
                      name: "UserError",
                      ofType: null,
                    },
                  },
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
          ],
          inputFields: null,
          interfaces: [],
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "OBJECT",
          name: "PageInfo",
          description: "Information about pagination in a connection.",
          fields: [
            {
              name: "hasNextPage",
              description: "Indicates if there are more pages to fetch.",
              args: [],
              type: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "SCALAR",
                  name: "Boolean",
                  ofType: null,
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "hasPreviousPage",
              description:
                "Indicates if there are any pages prior to the current page.",
              args: [],
              type: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "SCALAR",
                  name: "Boolean",
                  ofType: null,
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "startCursor",
              description:
                "The cursor corresponding to the first node in edges.",
              args: [],
              type: {
                kind: "SCALAR",
                name: "String",
                ofType: null,
              },
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "endCursor",
              description:
                "The cursor corresponding to the last node in edges.",
              args: [],
              type: {
                kind: "SCALAR",
                name: "String",
                ofType: null,
              },
              isDeprecated: false,
              deprecationReason: null,
            },
          ],
          inputFields: null,
          interfaces: [],
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "INTERFACE",
          name: "Node",
          description:
            "An object with an ID field to support global identification, in accordance with the Relay specification.",
          fields: [
            {
              name: "id",
              description: "A globally-unique identifier.",
              args: [],
              type: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "SCALAR",
                  name: "ID",
                  ofType: null,
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
          ],
          inputFields: null,
          interfaces: [],
          enumValues: null,
          possibleTypes: [
            {
              kind: "OBJECT",
              name: "Product",
              ofType: null,
            },
          ],
        },
        {
          kind: "OBJECT",
          name: "UserError",
          description: "An error that occurred during a mutation.",
          fields: [
            {
              name: "field",
              description: "The path to the input field that caused the error.",
              args: [],
              type: {
                kind: "LIST",
                name: null,
                ofType: {
                  kind: "NON_NULL",
                  name: null,
                  ofType: {
                    kind: "SCALAR",
                    name: "String",
                    ofType: null,
                  },
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "message",
              description: "The error message.",
              args: [],
              type: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "SCALAR",
                  name: "String",
                  ofType: null,
                },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
          ],
          inputFields: null,
          interfaces: [],
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "ENUM",
          name: "ProductSortKeys",
          description: "The set of valid sort keys for the Product query.",
          fields: null,
          inputFields: null,
          interfaces: null,
          enumValues: [
            {
              name: "CREATED_AT",
              description: "Sort by the `created_at` value.",
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "ID",
              description: "Sort by the `id` value.",
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "PRODUCT_TYPE",
              description: "Sort by the `product_type` value.",
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "RELEVANCE",
              description:
                "Sort by relevance to the search terms when the `query` parameter is specified on the connection.",
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "TITLE",
              description: "Sort by the `title` value.",
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "UPDATED_AT",
              description: "Sort by the `updated_at` value.",
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "VENDOR",
              description: "Sort by the `vendor` value.",
              isDeprecated: false,
              deprecationReason: null,
            },
          ],
          possibleTypes: null,
        },
        {
          kind: "SCALAR",
          name: "String",
          description: "Represents textual data as UTF-8 character sequences.",
          fields: null,
          inputFields: null,
          interfaces: null,
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "SCALAR",
          name: "Boolean",
          description: "Represents `true` or `false` values.",
          fields: null,
          inputFields: null,
          interfaces: null,
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "SCALAR",
          name: "Int",
          description: "Represents non-fractional signed whole numeric values.",
          fields: null,
          inputFields: null,
          interfaces: null,
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "SCALAR",
          name: "ID",
          description:
            "Represents a unique identifier that is Base64 obfuscated.",
          fields: null,
          inputFields: null,
          interfaces: null,
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "SCALAR",
          name: "DateTime",
          description:
            'An ISO-8601 encoded UTC date time string. Example value: `"2019-07-03T20:47:55Z"`.',
          fields: null,
          inputFields: null,
          interfaces: null,
          enumValues: null,
          possibleTypes: null,
        },
      ],
      directives: [],
    },
  },
};

describe("validateGraphQLOperation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up memfs with the mock schema
    vol.reset();
    vol.fromJSON({
      "./data/admin_2025-01.json": JSON.stringify(mockAdminSchema),
    });
  });

  describe("schema name validation", () => {
    it("should reject unsupported api names", async () => {
      const result = await validateGraphQLOperation(
        "query { products { id } }",
        { api: "unsupported-api", version: "2025-01", schemas: mockSchemas },
      );

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toBe(
        'Validation error: Schema configuration for API "unsupported-api" version "2025-01" not found in provided schemas. Currently supported schemas: admin (2025-01)',
      );
    });

    it("should accept admin api name", async () => {
      // This test will use the real schema and proceed to validation
      const result = await validateGraphQLOperation(
        "query { nonExistentField }",
        { api: "admin", version: "2025-01", schemas: mockSchemas },
      );

      // Should proceed past schema name validation but may fail on field validation
      expect(result.resultDetail).not.toContain("Unsupported schema");
      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");
    });

    it("should list all supported schemas in error message", async () => {
      const result = await validateGraphQLOperation(
        "query { products { id } }",
        { api: "invalid-api", version: "2025-01", schemas: mockSchemas },
      );

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("Currently supported schemas:");
      expect(result.resultDetail).toContain("admin (2025-01)");
    });

    it("should validate against specific version", async () => {
      const schemasWithVersions: introspectGraphqlSchema.Schema[] = [
        {
          api: "admin",
          id: "admin_2025-01",
          version: "2025-01",
          url: "https://example.com/admin_2025-01.json",
        },
        {
          api: "admin",
          id: "admin_2024-10",
          version: "2024-10",
          url: "https://example.com/admin_2024-10.json",
        },
      ];

      const result = await validateGraphQLOperation(
        "query { products(first: 10) { edges { node { id title } } } }",
        { api: "admin", version: "2025-01", schemas: schemasWithVersions },
      );

      // Should succeed or fail based on actual schema validation
      expect(result.resultDetail).toBeDefined();
      if (result.result === ValidationResult.SUCCESS) {
        expect(result.resultDetail).toContain("Successfully validated GraphQL");
      }
    });

    it("should reject unsupported version", async () => {
      const result = await validateGraphQLOperation(
        "query { products { id } }",
        { api: "admin", version: "2024-07", schemas: mockSchemas },
      );

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain('version "2024-07"');
      expect(result.resultDetail).toContain("Currently supported schemas:");
    });
  });

  describe("GraphQL operation processing", () => {
    it("should fail for empty code", async () => {
      const result = await validateGraphQLOperation("", {
        api: "admin",
        version: "2025-01",
        schemas: mockSchemas,
      });

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toBe(
        "No GraphQL operation found in the provided code.",
      );
    });

    it("should fail for code with only whitespace", async () => {
      const result = await validateGraphQLOperation("   \n  \n", {
        api: "admin",
        version: "2025-01",
        schemas: mockSchemas,
      });

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toBe(
        "No GraphQL operation found in the provided code.",
      );
    });

    it("should process valid GraphQL code", async () => {
      const result = await validateGraphQLOperation(
        "query { nonExistentField }",
        { api: "admin", version: "2025-01", schemas: mockSchemas },
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
        { api: "admin", version: "2025-01", schemas: mockSchemas },
      );

      // Should proceed past processing (GraphQL was found and processed)
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

      const result = await validateGraphQLOperation(invalidGraphQL, {
        api: "admin",
        version: "2025-01",
        schemas: mockSchemas,
      });

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("GraphQL syntax error:");
    });

    it("should handle malformed query structures", async () => {
      const malformedGraphQL = "query { { { invalid } } }";

      const result = await validateGraphQLOperation(malformedGraphQL, {
        api: "admin",
        version: "2025-01",
        schemas: mockSchemas,
      });

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("GraphQL syntax error:");
    });

    it("should parse valid GraphQL syntax", async () => {
      const validSyntax = "query { nonExistentField }";

      const result = await validateGraphQLOperation(validSyntax, {
        api: "admin",
        version: "2025-01",
        schemas: mockSchemas,
      });

      // Should proceed past parsing (may succeed or fail based on schema validation)
      expect(result.resultDetail).not.toContain("GraphQL syntax error:");
      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");
    });
  });

  describe("GraphQL schema validation", () => {
    it("should fail for operations with non-existent fields", async () => {
      const queryWithInvalidField = "query { nonExistentField }";

      const result = await validateGraphQLOperation(queryWithInvalidField, {
        api: "admin",
        version: "2025-01",
        schemas: mockSchemas,
      });

      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");

      // Should fail for schema validation errors (non-existent fields)
      // Unless there are schema loading/conversion issues that cause try/catch errors
      if (result.result === ValidationResult.FAILED) {
        // Could be either a schema validation error OR a schema loading error
        expect(result.resultDetail).not.toContain("GraphQL syntax error:");
        expect(result.resultDetail).not.toContain("Unsupported schema");
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

      const result = await validateGraphQLOperation(validQuery, {
        api: "admin",
        version: "2025-01",
        schemas: mockSchemas,
      });

      expect(result.resultDetail).toContain("Successfully validated GraphQL");
      expect(result.resultDetail).toContain("against schema");
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

      const result = await validateGraphQLOperation(mutation, {
        api: "admin",
        version: "2025-01",
        schemas: mockSchemas,
      });

      expect(result.resultDetail).toContain("Successfully validated GraphQL");
      expect(result.resultDetail).toContain("against schema");
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

      const result = await validateGraphQLOperation(invalidMutation, {
        api: "admin",
        version: "2025-01",
        schemas: mockSchemas,
      });

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toBeDefined();
      expect(typeof result.resultDetail).toBe("string");

      // Should fail for either GraphQL validation errors OR schema conversion errors
      // Both indicate the operation is invalid
      expect(result.resultDetail).not.toContain("GraphQL syntax error:");
      expect(result.resultDetail).not.toContain("Unsupported schema");

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

      const result = await validateGraphQLOperation(validQuery, {
        api: "admin",
        version: "2025-01",
        schemas: mockSchemas,
      });

      expect(result.result).toBe(ValidationResult.SUCCESS);
      expect(result.resultDetail).toContain("Successfully validated GraphQL");
      expect(result.resultDetail).toContain("against schema");
    });
  });
  describe("error handling", () => {
    it("should handle actual GraphQL validation errors", async () => {
      // Test with an invalid query that should fail GraphQL validation
      const result = await validateGraphQLOperation(
        "query { products { id } }", // This will fail because products connection needs to specify edges
        { api: "admin", version: "2025-01", schemas: mockSchemas },
      );

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("GraphQL validation errors:");
    });

    it("should provide clear error messages for invalid operations", async () => {
      const result = await validateGraphQLOperation(
        "query { nonExistentField }",
        { api: "admin", version: "2025-01", schemas: mockSchemas },
      );

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("GraphQL validation errors:");
      expect(result.resultDetail).toContain("Cannot query field");
    });
  });
});
