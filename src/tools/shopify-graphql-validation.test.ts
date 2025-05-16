import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  validateGraphQL,
  formatValidationErrors,
} from "./shopify-graphql-validation.js";
import { GraphQLError } from "graphql";
import * as adminSchema from "./shopify-admin-schema.js";

// Mock the schema loading function
vi.mock("./shopify-admin-schema.js", () => {
  return {
    SCHEMA_FILE_PATH: "mock-path",
    loadSchemaContent: vi.fn(),
  };
});

// Mock the graphql module
vi.mock("graphql", async () => {
  const actual = await vi.importActual("graphql");
  return {
    ...actual,
    buildClientSchema: vi.fn(),
    parse: vi.fn(),
    validate: vi.fn(),
  };
});

import { buildClientSchema, parse, validate } from "graphql";

describe("GraphQL validation", () => {
  // Sample schema with basic types for testing
  const mockSchema = JSON.stringify({
    data: {
      __schema: {
        queryType: {
          name: "QueryRoot",
        },
        types: [
          {
            kind: "OBJECT",
            name: "QueryRoot",
            fields: [
              {
                name: "product",
                args: [
                  {
                    name: "id",
                    type: {
                      kind: "NON_NULL",
                      ofType: {
                        kind: "SCALAR",
                        name: "ID",
                      },
                    },
                  },
                ],
                type: {
                  kind: "OBJECT",
                  name: "Product",
                },
              },
            ],
          },
          {
            kind: "OBJECT",
            name: "Product",
            fields: [
              {
                name: "id",
                type: {
                  kind: "NON_NULL",
                  ofType: {
                    kind: "SCALAR",
                    name: "ID",
                  },
                },
              },
              {
                name: "title",
                type: {
                  kind: "SCALAR",
                  name: "String",
                },
              },
            ],
          },
        ],
      },
    },
  });

  const mockSchemaObject = {};

  beforeEach(() => {
    vi.resetAllMocks();

    // Set up mocks
    vi.mocked(adminSchema.loadSchemaContent).mockResolvedValue(mockSchema);
    vi.mocked(buildClientSchema).mockReturnValue(mockSchemaObject as any);
    vi.mocked(parse).mockReturnValue({} as any);

    // Default to no validation errors
    vi.mocked(validate).mockReturnValue([]);
  });

  test("validates a correct GraphQL query", async () => {
    const validQuery = `
      query GetProduct {
        product(id: "gid://shopify/Product/123") {
          id
          title
        }
      }
    `;

    const result = await validateGraphQL(validQuery);

    expect(result.isValid).toBe(true);
    expect(result.errors).toBeUndefined();

    // Verify the right functions were called
    expect(adminSchema.loadSchemaContent).toHaveBeenCalledWith("mock-path");
    expect(buildClientSchema).toHaveBeenCalled();
    expect(parse).toHaveBeenCalledWith(validQuery);
    expect(validate).toHaveBeenCalled();
  });

  test("reports errors for invalid fields", async () => {
    const invalidQuery = `
      query GetProduct {
        product(id: "gid://shopify/Product/123") {
          id
          title
          nonExistentField
        }
      }
    `;

    // Mock validation errors
    const mockError = new GraphQLError(
      'Cannot query field "nonExistentField" on type "Product"',
    );
    vi.mocked(validate).mockReturnValue([mockError]);

    const result = await validateGraphQL(invalidQuery);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBe(1);
    expect(result.errors?.[0].message).toMatch(
      /Cannot query field "nonExistentField"/,
    );
  });

  test("reports errors for missing required arguments", async () => {
    const invalidQuery = `
      query GetProduct {
        product {
          id
          title
        }
      }
    `;

    // Mock validation errors
    const mockError = new GraphQLError(
      'Field "product" argument "id" of type "ID!" is required',
    );
    vi.mocked(validate).mockReturnValue([mockError]);

    const result = await validateGraphQL(invalidQuery);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBe(1);
    expect(result.errors?.[0].message).toMatch(
      /Field "product" argument "id" of type "ID!" is required/,
    );
  });

  test("handles syntax errors in GraphQL", async () => {
    const invalidSyntax = `
      query GetProduct {
        product(id: "gid://shopify/Product/123") {
          id
          title
        // Missing closing brace
    `;

    // Mock parse to throw a syntax error
    vi.mocked(parse).mockImplementation(() => {
      throw new GraphQLError("Syntax Error: Expected '}', found <EOF>");
    });

    const result = await validateGraphQL(invalidSyntax);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBe(1);
    expect(result.errors?.[0].message).toMatch(
      /GraphQL validation error: Syntax Error/,
    );
  });

  test("handles schema loading errors", async () => {
    // Mock schema loading failure
    vi.mocked(adminSchema.loadSchemaContent).mockRejectedValue(
      new Error("Schema not found"),
    );

    const query = `query { product(id: "123") { title } }`;

    const result = await validateGraphQL(query);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0].message).toMatch(
      /GraphQL validation error: Schema not found/,
    );
  });
});

describe("formatValidationErrors", () => {
  test("formats errors with locations", () => {
    // Create errors with locations manually
    const error1 = new GraphQLError("Field does not exist");
    const error2 = new GraphQLError("Invalid argument");

    // Add locations manually to match the interface
    Object.defineProperty(error1, "locations", {
      value: [{ line: 3, column: 5 }],
    });

    Object.defineProperty(error2, "locations", {
      value: [{ line: 10, column: 12 }],
    });

    const formatted = formatValidationErrors([error1, error2]);

    expect(formatted).toContain("1. Field does not exist (Line 3, Column 5)");
    expect(formatted).toContain("2. Invalid argument (Line 10, Column 12)");
  });

  test("formats errors without locations", () => {
    const errors = [
      new GraphQLError("Parser error"),
      new GraphQLError("Validation error"),
    ];

    const formatted = formatValidationErrors(errors);

    expect(formatted).toContain("1. Parser error");
    expect(formatted).toContain("2. Validation error");
  });
});
