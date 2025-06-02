import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  validateGraphQL,
  formatValidationErrors,
} from "./shopify-graphql-validation.js";
import { GraphQLError } from "graphql";

describe("GraphQL validation", () => {
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

    const result = await validateGraphQL(invalidQuery);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.errors?.[0].message).toMatch(/Cannot query field/);
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

    const result = await validateGraphQL(invalidQuery);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.errors?.[0].message).toMatch(/argument.*is required/);
  });

  test("handles syntax errors in GraphQL", async () => {
    const invalidSyntax = `
      query GetProduct {
        product(id: "gid://shopify/Product/123") {
          id
          title
        // Missing closing brace
    `;

    const result = await validateGraphQL(invalidSyntax);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBe(1);
    expect(result.errors?.[0].message).toMatch(
      /Syntax Error|GraphQL validation error/,
    );
  });

  test("validates mutations correctly", async () => {
    const mutation = `
      mutation CreateProduct($input: ProductCreateInput!) {
        productCreate(product: $input) {
          product {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const result = await validateGraphQL(mutation);

    expect(result.isValid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  test("handles multiple operations in one document", async () => {
    const multipleOps = `
      query GetProduct($id: ID!) {
        product(id: $id) {
          title
        }
      }

      query GetShop {
        shop {
          name
        }
      }
    `;

    const result = await validateGraphQL(multipleOps);

    expect(result.isValid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  test("validates fragments correctly", async () => {
    const queryWithFragment = `
      fragment ProductFields on Product {
        id
        title
        description
      }

      query GetProduct($id: ID!) {
        product(id: $id) {
          ...ProductFields
        }
      }
    `;

    const result = await validateGraphQL(queryWithFragment);

    expect(result.isValid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  test("handles empty or whitespace-only input", async () => {
    const emptyQuery = "   \n   \n   ";

    const result = await validateGraphQL(emptyQuery);

    expect(result.isValid).toBe(false);
    expect(result.errors?.[0].message).toMatch(/Syntax Error|Expected/);
  });

  test("reports multiple validation errors", async () => {
    const queryWithMultipleErrors = `
      query BadQuery {
        product(wrongArg: "123") {
          nonExistentField1
          nonExistentField2
        }
        nonExistentQuery {
          field
        }
      }
    `;

    const result = await validateGraphQL(queryWithMultipleErrors);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(1);
  });

  test("validates complex nested queries", async () => {
    const complexQuery = `
      query GetProductWithVariants($id: ID!) {
        product(id: $id) {
          id
          title
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
              }
            }
          }
        }
      }
    `;

    const result = await validateGraphQL(complexQuery);

    expect(result.isValid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  test("validates queries with directives", async () => {
    const queryWithDirectives = `
      query GetProductConditional($id: ID!, $includeVariants: Boolean!) {
        product(id: $id) {
          id
          title
          variants(first: 10) @include(if: $includeVariants) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      }
    `;

    const result = await validateGraphQL(queryWithDirectives);

    expect(result.isValid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  test("reports errors for incorrect variable types", async () => {
    const queryWithWrongVarType = `
      query GetProduct($id: String!) {
        product(id: $id) {
          id
          title
        }
      }
    `;

    const result = await validateGraphQL(queryWithWrongVarType);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0].message).toMatch(
      /Variable.*used in position expecting type/,
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
