import { fileURLToPath } from "node:url";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

// Now import the module to test
import {
  filterAndSortItems,
  formatArg,
  formatField,
  formatGraphqlOperation,
  formatSchemaType,
  formatType,
  introspectGraphqlSchema,
  MAX_FIELDS_TO_SHOW,
  SCHEMAS_CACHE_DIR,
  type Schema,
} from "./index.js";
import { injectMockSchemasIntoCache } from "../../test-utils.js";

// Mock console.error
const originalConsoleError = console.error;
console.error = vi.fn();

afterAll(() => {
  console.error = originalConsoleError;
});

beforeAll(async () => {
  await injectMockSchemasIntoCache();
});

describe("formatType", () => {
  test("formats scalar types", () => {
    const type = { kind: "SCALAR", name: "String", ofType: null };
    expect(formatType(type)).toBe("String");
  });

  test("formats non-null types", () => {
    const type = {
      kind: "NON_NULL",
      name: null,
      ofType: { kind: "SCALAR", name: "String", ofType: null },
    };
    expect(formatType(type)).toBe("String!");
  });

  test("formats list types", () => {
    const type = {
      kind: "LIST",
      name: null,
      ofType: { kind: "SCALAR", name: "String", ofType: null },
    };
    expect(formatType(type)).toBe("[String]");
  });

  test("formats complex nested types", () => {
    const type = {
      kind: "NON_NULL",
      name: null,
      ofType: {
        kind: "LIST",
        name: null,
        ofType: {
          kind: "NON_NULL",
          name: null,
          ofType: { kind: "OBJECT", name: "Product", ofType: null },
        },
      },
    };
    expect(formatType(type)).toBe("[Product!]!");
  });

  test("handles null input", () => {
    expect(formatType(null)).toBe("null");
  });
});

describe("formatArg", () => {
  test("formats basic argument", () => {
    const arg = {
      name: "id",
      type: { kind: "SCALAR", name: "ID", ofType: null },
      defaultValue: null,
    };
    expect(formatArg(arg)).toBe("id: ID");
  });

  test("formats argument with default value", () => {
    const arg = {
      name: "first",
      type: { kind: "SCALAR", name: "Int", ofType: null },
      defaultValue: "10",
    };
    expect(formatArg(arg)).toBe("first: Int = 10");
  });

  test("formats argument with complex type", () => {
    const arg = {
      name: "input",
      type: {
        kind: "NON_NULL",
        name: null,
        ofType: { kind: "INPUT_OBJECT", name: "ProductInput", ofType: null },
      },
      defaultValue: null,
    };
    expect(formatArg(arg)).toBe("input: ProductInput!");
  });
});

describe("formatField", () => {
  test("formats basic field", () => {
    const field = {
      name: "id",
      args: [],
      type: { kind: "SCALAR", name: "ID", ofType: null },
      isDeprecated: false,
      deprecationReason: null,
    };
    expect(formatField(field)).toBe("  id: ID");
  });

  test("formats field with arguments", () => {
    const field = {
      name: "product",
      args: [
        {
          name: "id",
          type: { kind: "SCALAR", name: "ID", ofType: null },
          defaultValue: null,
        },
      ],
      type: { kind: "OBJECT", name: "Product", ofType: null },
      isDeprecated: false,
      deprecationReason: null,
    };
    expect(formatField(field)).toBe("  product(id: ID): Product");
  });

  test("formats deprecated field", () => {
    const field = {
      name: "legacyField",
      args: [],
      type: { kind: "SCALAR", name: "String", ofType: null },
      isDeprecated: true,
      deprecationReason: "Use newField instead",
    };
    expect(formatField(field)).toBe(
      "  legacyField: String @deprecated (Use newField instead)",
    );
  });
});

describe("formatSchemaType", () => {
  test("formats object type with fields", () => {
    const type = {
      kind: "OBJECT",
      name: "Product",
      description: "A product in the shop",
      interfaces: [{ name: "Node" }],
      fields: [
        {
          name: "id",
          args: [],
          type: { kind: "SCALAR", name: "ID", ofType: null },
          isDeprecated: false,
          deprecationReason: null,
        },
        {
          name: "title",
          args: [],
          type: { kind: "SCALAR", name: "String", ofType: null },
          isDeprecated: false,
          deprecationReason: null,
        },
      ],
      inputFields: null,
    };

    const result = formatSchemaType(type);
    expect(result).toContain("OBJECT Product");
    expect(result).toContain("Description: A product in the shop");
    expect(result).toContain("Implements: Node");
    expect(result).toContain("Fields:");
    expect(result).toContain("id: ID");
    expect(result).toContain("title: String");
  });

  test("formats input object type with input fields", () => {
    const type = {
      kind: "INPUT_OBJECT",
      name: "ProductInput",
      description: "Input for creating a product",
      interfaces: [],
      fields: null,
      inputFields: [
        {
          name: "title",
          type: { kind: "SCALAR", name: "String", ofType: null },
          defaultValue: null,
        },
        {
          name: "price",
          type: { kind: "SCALAR", name: "Float", ofType: null },
          defaultValue: null,
        },
      ],
    };

    const result = formatSchemaType(type);
    expect(result).toContain("INPUT_OBJECT ProductInput");
    expect(result).toContain("Description: Input for creating a product");
    expect(result).toContain("Input Fields:");
    expect(result).toContain("title: String");
    expect(result).toContain("price: Float");
  });

  test("handles type with many fields by truncating", () => {
    // Create an object with more than MAX_FIELDS_TO_SHOW fields
    const manyFields = Array(MAX_FIELDS_TO_SHOW + 10)
      .fill(null)
      .map((_, i) => ({
        name: `field${i}`,
        args: [],
        type: { kind: "SCALAR", name: "String", ofType: null },
        isDeprecated: false,
        deprecationReason: null,
      }));

    const type = {
      kind: "OBJECT",
      name: "LargeType",
      description: "Type with many fields",
      interfaces: [],
      fields: manyFields,
      inputFields: null,
    };

    const result = formatSchemaType(type);
    expect(result).toContain(`... and 10 more fields`);
    // Should include MAX_FIELDS_TO_SHOW fields
    expect((result.match(/field\d+: String/g) || []).length).toBe(
      MAX_FIELDS_TO_SHOW,
    );
  });

  test("handles type with many input fields by truncating", () => {
    // Create an input object with more than MAX_FIELDS_TO_SHOW fields
    const manyInputFields = Array(MAX_FIELDS_TO_SHOW + 10)
      .fill(null)
      .map((_, i) => ({
        name: `inputField${i}`,
        type: { kind: "SCALAR", name: "String", ofType: null },
        defaultValue: null,
      }));

    const type = {
      kind: "INPUT_OBJECT",
      name: "LargeInputType",
      description: "Input type with many fields",
      interfaces: [],
      fields: null,
      inputFields: manyInputFields,
    };

    const result = formatSchemaType(type);
    expect(result).toContain(`... and 10 more input fields`);
    // Should include MAX_FIELDS_TO_SHOW fields
    expect((result.match(/inputField\d+: String/g) || []).length).toBe(
      MAX_FIELDS_TO_SHOW,
    );
  });
});

describe("formatGraphqlOperation", () => {
  test("formats query with arguments and return type", () => {
    const query = {
      name: "product",
      description: "Get a product by ID",
      args: [
        {
          name: "id",
          type: {
            kind: "NON_NULL",
            name: null,
            ofType: { kind: "SCALAR", name: "ID", ofType: null },
          },
          defaultValue: null,
        },
      ],
      type: { kind: "OBJECT", name: "Product", ofType: null },
    };

    const result = formatGraphqlOperation(query);
    expect(result).toContain("product");
    expect(result).toContain("Description: Get a product by ID");
    expect(result).toContain("Arguments:");
    expect(result).toContain("id: ID!");
    expect(result).toContain("Returns: Product");
  });

  test("truncates long descriptions", () => {
    const longDescription =
      "This is a very long description that should be truncated. ".repeat(10);
    const query = {
      name: "longQuery",
      description: longDescription,
      args: [],
      type: { kind: "SCALAR", name: "String", ofType: null },
    };

    const result = formatGraphqlOperation(query);
    expect(result).toContain("...");
    expect(result.length).toBeLessThan(longDescription.length);
  });
});

describe("filterAndSortItems", () => {
  test("filters items by name matching search term", () => {
    const items = [
      { name: "Product" },
      { name: "ProductInput" },
      { name: "Order" },
      { name: "OrderInput" },
      { name: "ProductVariant" },
    ];

    const result = filterAndSortItems(items, "product", 10);
    expect(result.items.length).toBe(3);
    expect(result.items[0].name).toBe("Product");
    expect(result.items[1].name).toBe("ProductInput");
    expect(result.items[2].name).toBe("ProductVariant");
    expect(result.wasTruncated).toBe(false);
  });

  test("sorts items by name length", () => {
    const items = [
      { name: "ProductVariant" },
      { name: "ProductInput" },
      { name: "Product" },
    ];

    const result = filterAndSortItems(items, "product", 10);
    expect(result.items[0].name).toBe("Product"); // Shortest first
    expect(result.items[1].name).toBe("ProductInput");
    expect(result.items[2].name).toBe("ProductVariant");
  });

  test("truncates results to maxItems", () => {
    const items = Array(20)
      .fill(null)
      .map((_, i) => ({ name: `Product${i}` }));

    const result = filterAndSortItems(items, "product", 5);
    expect(result.items.length).toBe(5);
    expect(result.wasTruncated).toBe(true);
  });

  test("handles items without names", () => {
    const items = [
      { name: "Product" },
      { somethingElse: true },
      { name: null },
      { name: "AnotherProduct" },
    ];

    const result = filterAndSortItems(items, "product", 10);
    expect(result.items.length).toBe(2);
  });
});

describe("introspectGraphqlSchema", () => {
  // Mock schemas for testing
  const mockSchemas: Schema[] = [
    {
      api: "admin",
      id: "admin_2025-01-mock",
      version: "2025-01-mock",
      url: "https://example.com/admin_2025-01-mock.json",
    },
  ];

  test("returns formatted results for a search query", async () => {
    const result = await introspectGraphqlSchema("product", {
      version: "2025-01-mock",
      schemas: mockSchemas,
    });

    expect(result.success).toBe(true);
    expect(result.responseText).toContain("## Matching GraphQL Types:");
    expect(result.responseText).toContain("OBJECT Product");
    expect(result.responseText).toContain("INPUT_OBJECT ProductInput");
    expect(result.responseText).toContain("## Matching GraphQL Queries:");
    expect(result.responseText).toContain("product");
    expect(result.responseText).toContain("## Matching GraphQL Mutations:");
    expect(result.responseText).toContain("productCreate");
  });

  test("normalizes query by removing trailing s", async () => {
    // Console error should be mocked by vi, so we can capture the messages
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await introspectGraphqlSchema("products", {
      version: "2025-01-mock",
      schemas: mockSchemas,
    });

    // Check console.error was called with the normalization message
    const errorMessages = consoleErrorSpy.mock.calls.map((call) => call[0]);
    const hasNormalizedMessage = errorMessages.some((msg) =>
      msg.includes("(normalized: product)"),
    );
    expect(hasNormalizedMessage).toBe(true);
  });

  test("normalizes query by removing spaces", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await introspectGraphqlSchema("product input", {
      version: "2025-01-mock",
      schemas: mockSchemas,
    });

    // Check console.error was called with the normalization message
    const errorMessages = consoleErrorSpy.mock.calls.map((call) => call[0]);
    const hasNormalizedMessage = errorMessages.some((msg) =>
      msg.includes("(normalized: productinput)"),
    );
    expect(hasNormalizedMessage).toBe(true);
  });

  test("handles empty query", async () => {
    const result = await introspectGraphqlSchema("", {
      version: "2025-01-mock",
      schemas: mockSchemas,
    });

    expect(result.success).toBe(true);
    // Should not filter the schema
    expect(result.responseText).toContain("OBJECT Product");
  });

  test("filters results to show only types", async () => {
    const result = await introspectGraphqlSchema("product", {
      version: "2025-01-mock",
      schemas: mockSchemas,
      filter: ["types"],
    });

    expect(result.success).toBe(true);
    // Should include types section
    expect(result.responseText).toContain("## Matching GraphQL Types:");
    expect(result.responseText).toContain("OBJECT Product");
    expect(result.responseText).toContain("INPUT_OBJECT ProductInput");
    // Should not include queries or mutations sections
    expect(result.responseText).not.toContain("## Matching GraphQL Queries:");
    expect(result.responseText).not.toContain("## Matching GraphQL Mutations:");
  });

  test("filters results to show only queries", async () => {
    const result = await introspectGraphqlSchema("product", {
      version: "2025-01-mock",
      schemas: mockSchemas,
      filter: ["queries"],
    });

    expect(result.success).toBe(true);
    // Should not include types section
    expect(result.responseText).not.toContain("## Matching GraphQL Types:");
    // Should include queries section
    expect(result.responseText).toContain("## Matching GraphQL Queries:");
    expect(result.responseText).toContain("product");
    // Should not include mutations section
    expect(result.responseText).not.toContain("## Matching GraphQL Mutations:");
  });

  test("filters results to show only mutations", async () => {
    const result = await introspectGraphqlSchema("product", {
      version: "2025-01-mock",
      schemas: mockSchemas,
      filter: ["mutations"],
    });

    expect(result.success).toBe(true);
    // Should not include types section
    expect(result.responseText).not.toContain("## Matching GraphQL Types:");
    // Should not include queries section
    expect(result.responseText).not.toContain("## Matching GraphQL Queries:");
    // Should include mutations section
    expect(result.responseText).toContain("## Matching GraphQL Mutations:");
    expect(result.responseText).toContain("productCreate");
  });

  test("shows all sections when operationType is 'all'", async () => {
    const result = await introspectGraphqlSchema("product", {
      version: "2025-01-mock",
      schemas: mockSchemas,
      filter: ["all"],
    });

    expect(result.success).toBe(true);
    // Should include all sections
    expect(result.responseText).toContain("## Matching GraphQL Types:");
    expect(result.responseText).toContain("## Matching GraphQL Queries:");
    expect(result.responseText).toContain("## Matching GraphQL Mutations:");
  });

  test("defaults to showing all sections when filter is not provided", async () => {
    // When not providing filter, it should default to ["all"]
    const result = await introspectGraphqlSchema("product", {
      version: "2025-01-mock",
      schemas: mockSchemas,
    });

    expect(result.success).toBe(true);
    // Should include all sections
    expect(result.responseText).toContain("## Matching GraphQL Types:");
    expect(result.responseText).toContain("## Matching GraphQL Queries:");
    expect(result.responseText).toContain("## Matching GraphQL Mutations:");
  });

  test("can show multiple sections with array of filters", async () => {
    const result = await introspectGraphqlSchema("product", {
      version: "2025-01-mock",
      schemas: mockSchemas,
      filter: ["queries", "mutations"],
    });

    expect(result.success).toBe(true);
    // Should not include types section
    expect(result.responseText).not.toContain("## Matching GraphQL Types:");
    // Should include queries section
    expect(result.responseText).toContain("## Matching GraphQL Queries:");
    // Should include mutations section
    expect(result.responseText).toContain("## Matching GraphQL Mutations:");
  });
});
