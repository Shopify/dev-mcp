import {
  describe,
  it,
  test,
  expect,
  beforeEach,
  vi,
  afterAll,
  afterEach,
} from "vitest";

global.fetch = vi.fn();

import { shopifyTools } from "./index.js";
import {
  instrumentationData,
  isInstrumentationDisabled,
  generateConversationId,
} from "../instrumentation.js";
import { searchShopifyAdminSchema } from "./shopify-admin-schema.js";
import validateGraphQLOperation from "../validations/graphqlSchema.js";
import { ValidationResult } from "../types.js";
import {
  recordUsage,
  searchShopifyDocs,
  fetchGettingStartedApis,
} from "./shopifyDevRequests.js";

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
console.error = vi.fn();
console.warn = vi.fn();

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

const sampleDocsResponse = [
  {
    filename: "api/admin/graphql/reference/products.md",
    score: 0.85,
    content:
      "The products API allows you to manage products in your Shopify store.",
  },
  {
    filename: "apps/tools/product-listings.md",
    score: 0.72,
    content:
      "Learn how to display and manage product listings in your Shopify app.",
  },
];

const sampleGettingStartedApisResponse = [
  {
    name: "app-ui",
    description:
      "App Home, Admin Extensions, Checkout Extensions, Customer Account Extensions, Polaris Web Components",
  },
  {
    name: "admin",
    description: "Admin API, Admin API GraphQL Schema, Admin API REST Schema",
  },
  {
    name: "functions",
    description: "Shopify Functions, Shopify Functions API",
  },
];

const sampleGettingStartedGuide = `# Getting Started with Admin API
This guide walks you through the first steps of using the Shopify Admin API.

## Authentication
Learn how to authenticate your app with OAuth.

## Making API Calls
Examples of common API calls with the Admin API.`;
vi.mock("../instrumentation.js", () => ({
  instrumentationData: vi.fn(),
  isInstrumentationDisabled: vi.fn(),
  generateConversationId: vi.fn(),
}));

vi.mock("./shopify-admin-schema.js", () => ({
  searchShopifyAdminSchema: vi.fn(),
}));

vi.mock("../validations/graphqlSchema.js", () => ({
  default: vi.fn(),
}));

vi.mock("./shopifyDevRequests.js", () => ({
  recordUsage: vi.fn(),
  searchShopifyDocs: vi.fn(),
  fetchGettingStartedApis: vi.fn(),
}));

vi.mock("../../package.json", () => ({
  default: { version: "1.0.0" },
}));

const fetchMock = vi.fn();
global.fetch = fetchMock;

const consoleError = console.error;
const consoleWarn = console.warn;

describe("MCP Tool Unit Tests", () => {
  let mockServer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(instrumentationData).mockReturnValue({
      packageVersion: "1.0.0",
      timestamp: "2024-01-01T00:00:00.000Z",
    });
    vi.mocked(isInstrumentationDisabled).mockReturnValue(false);
    vi.mocked(generateConversationId).mockReturnValue("test-conversation-uuid");
    vi.mocked(searchShopifyAdminSchema).mockResolvedValue({
      success: true,
      responseText: "Test schema response",
    });
    vi.mocked(searchShopifyDocs).mockResolvedValue({
      success: true,
      formattedText: "Test docs response",
    });
    vi.mocked(fetchGettingStartedApis).mockResolvedValue([
      { name: "admin", description: "Admin API" },
    ]);
    vi.mocked(recordUsage).mockResolvedValue(undefined);

    mockServer = {
      tool: vi.fn((name, description, schema, handler) => {
        mockServer[`${name}Handler`] = handler;
      }),
    };
  });

  test("search_dev_doc_chunks tool calls searchShopifyDocs with correct parameters", async () => {
    await shopifyTools(mockServer);

    expect(mockServer.search_dev_doc_chunksHandler).toBeDefined();

    const result = await mockServer.search_dev_doc_chunksHandler({
      prompt: "test search query",
      conversationId: "test-conversation-id",
    });

    expect(vi.mocked(searchShopifyDocs)).toHaveBeenCalledWith(
      "test search query",
    );
    expect(result.content[0].text).toBe("Test docs response");
    expect(vi.mocked(recordUsage)).toHaveBeenCalledWith(
      "search_dev_doc_chunks",
      "test search query",
      "Test docs response",
      "test-conversation-id",
    );
  });

  test("introspect_admin_schema tool calls recordUsage with correct parameters", async () => {
    await shopifyTools(mockServer);

    expect(mockServer.introspect_admin_schemaHandler).toBeDefined();

    await mockServer.introspect_admin_schemaHandler({
      query: "product",
      filter: ["types"],
      conversationId: "test-conversation-id",
    });

    expect(vi.mocked(recordUsage)).toHaveBeenCalledWith(
      "introspect_admin_schema",
      "product",
      "Test schema response",
      "test-conversation-id",
    );
  });

  test("fetch_entire_doc_by_path tool calls recordUsage with correct parameters", async () => {
    await shopifyTools(mockServer);

    expect(mockServer.fetch_entire_doc_by_pathHandler).toBeDefined();

    const fetchMock = global.fetch as any;
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => "Test document content",
    });

    await mockServer.fetch_entire_doc_by_pathHandler({
      paths: ["/docs/api/admin", "/docs/api/storefront"],
      conversationId: "test-conversation-id",
    });

    expect(vi.mocked(recordUsage)).toHaveBeenCalledWith(
      "fetch_entire_doc_by_path",
      "/docs/api/admin,/docs/api/storefront",
      expect.stringContaining("Test document content"),
      "test-conversation-id",
    );
  });

  test("validate_admin_api_codeblocks tool calls recordUsage with correct parameters", async () => {
    vi.mocked(validateGraphQLOperation).mockResolvedValue({
      result: ValidationResult.SUCCESS,
      resultDetail: "Valid GraphQL",
    });

    await shopifyTools(mockServer);

    expect(mockServer.validate_admin_api_codeblocksHandler).toBeDefined();

    const testCodeBlocks = ["```graphql\nquery { products { id } }\n```"];

    await mockServer.validate_admin_api_codeblocksHandler({
      codeblocks: testCodeBlocks,
      conversationId: "test-conversation-id",
    });

    expect(vi.mocked(recordUsage)).toHaveBeenCalledWith(
      "validate_admin_api_codeblocks",
      "1 code blocks",
      expect.objectContaining({
        valid: true,
        detailedChecks: expect.any(Array),
      }),
      "test-conversation-id",
    );
  });

  test("learn_shopify_apis tool calls fetchGettingStartedApis and recordUsage", async () => {
    const fetchMock = global.fetch as any;
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => "Getting started guide content",
    });

    await shopifyTools(mockServer);

    expect(mockServer.learn_shopify_apisHandler).toBeDefined();

    await mockServer.learn_shopify_apisHandler({
      api: "admin",
    });

    expect(vi.mocked(fetchGettingStartedApis)).toHaveBeenCalled();

    expect(vi.mocked(recordUsage)).toHaveBeenCalledWith(
      "learn_shopify_apis",
      "admin",
      "Getting started guide content",
      "test-conversation-uuid",
    );
  });
});

describe("learn_shopify_apis tool error handling", () => {
  let fetchMock: any;
  let mockServer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = global.fetch as any;

    vi.mocked(fetchGettingStartedApis).mockResolvedValue([
      { name: "admin", description: "Admin API" },
    ]);
    vi.mocked(recordUsage).mockResolvedValue(undefined);
    vi.mocked(generateConversationId).mockReturnValue("test-conversation-uuid");

    mockServer = {
      tool: vi.fn((name, description, schema, handler) => {
        if (name === "learn_shopify_apis") {
          mockServer.learn_shopify_apisHandler = handler;
        }
      }),
      learn_shopify_apisHandler: null,
    };
  });

  test("handles invalid API name", async () => {
    await shopifyTools(mockServer);

    const result = await mockServer.learn_shopify_apisHandler({
      api: "invalid-api",
    });

    expect(result.content[0].text).toContain(
      "Please specify which Shopify API you are building for",
    );
  });

  test("handles HTTP error when fetching guide", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await shopifyTools(mockServer);

    const result = await mockServer.learn_shopify_apisHandler({ api: "admin" });

    expect(result.content[0].text).toContain(
      "Error fetching getting started information",
    );
    expect(result.content[0].text).toContain("500");
  });

  test("handles network error", async () => {
    fetchMock.mockRejectedValue(new Error("Network failure"));

    await shopifyTools(mockServer);

    const result = await mockServer.learn_shopify_apisHandler({ api: "admin" });

    expect(result.content[0].text).toContain(
      "Error fetching getting started information",
    );
    expect(result.content[0].text).toContain("Network failure");
  });
});

describe("validate_admin_api_codeblocks tool behavior", () => {
  let mockServer: any;
  let validateGraphQLOperationMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    validateGraphQLOperationMock = vi.mocked(validateGraphQLOperation);
    vi.mocked(recordUsage).mockResolvedValue(undefined);
    vi.mocked(fetchGettingStartedApis).mockResolvedValue([
      { name: "admin", description: "Admin API" },
    ]);
    vi.mocked(generateConversationId).mockReturnValue("test-conversation-uuid");

    mockServer = {
      tool: vi.fn((name, description, schema, handler) => {
        if (name === "validate_admin_api_codeblocks") {
          mockServer.validateHandler = handler;
        }
      }),
      validateHandler: null,
    };
  });

  test("validates code blocks in parallel", async () => {
    validateGraphQLOperationMock
      .mockResolvedValueOnce({
        result: ValidationResult.SUCCESS,
        resultDetail: "Valid GraphQL query",
      })
      .mockResolvedValueOnce({
        result: ValidationResult.SUCCESS,
        resultDetail: "Valid GraphQL mutation",
      });

    await shopifyTools(mockServer);

    const testCodeBlocks = [
      "```graphql\nquery { products { id } }\n```",
      "```graphql\nmutation { productCreate(input: {}) { product { id } } }\n```",
    ];

    await mockServer.validateHandler({
      codeblocks: testCodeBlocks,
      conversationId: "test-conversation-id",
    });

    expect(validateGraphQLOperationMock).toHaveBeenCalledTimes(2);
    expect(validateGraphQLOperationMock).toHaveBeenNthCalledWith(
      1,
      testCodeBlocks[0],
      "admin",
    );
    expect(validateGraphQLOperationMock).toHaveBeenNthCalledWith(
      2,
      testCodeBlocks[1],
      "admin",
    );
  });

  test("handles validation function errors", async () => {
    validateGraphQLOperationMock.mockRejectedValueOnce(
      new Error("Schema loading failed"),
    );

    await shopifyTools(mockServer);

    const testCodeBlocks = ["```graphql\nquery { products { id } }\n```"];

    await expect(
      mockServer.validateHandler({ codeblocks: testCodeBlocks }),
    ).rejects.toThrow("Schema loading failed");
  });

  test("returns formatted validation results", async () => {
    validateGraphQLOperationMock.mockResolvedValueOnce({
      result: ValidationResult.SUCCESS,
      resultDetail: "Valid GraphQL",
    });

    await shopifyTools(mockServer);

    const result = await mockServer.validateHandler({
      codeblocks: ["```graphql\nquery { products { id } }\n```"],
    });

    expect(result.content[0].type).toBe("text");
    const responseText = result.content[0].text;
    expect(responseText).toContain("## Validation Summary");
    expect(responseText).toContain("**Total Code Blocks:** 1");
    expect(responseText).toContain("## Detailed Results");
  });
});
