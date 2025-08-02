import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  test,
  vi,
} from "vitest";

global.fetch = vi.fn();

import {
  instrumentationData,
  isInstrumentationDisabled,
} from "../instrumentation.js";
import { ValidationResult } from "../types.js";
import validateGraphQLOperation from "../validations/graphqlSchema.js";
import { searchShopifyDocs, shopifyTools } from "./index.js";

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
console.error = vi.fn();
console.warn = vi.fn();

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Sample response data for mocking
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

// Sample response for getting_started_apis
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

// Sample getting started guide response
const sampleGettingStartedGuide = `# Getting Started with Admin API
This guide walks you through the first steps of using the Shopify Admin API.

## Authentication
Learn how to authenticate your app with OAuth.

## Making API Calls
Examples of common API calls with the Admin API.`;

// Mock instrumentation first
vi.mock("../instrumentation.js", () => ({
  instrumentationData: vi.fn(() => ({
    packageVersion: "1.0.0",
    timestamp: "2024-01-01T00:00:00.000Z",
  })),
  isInstrumentationDisabled: vi.fn(() => false),
  generateConversationId: vi.fn(() => "test-conversation-id"),
  recordUsage: vi.fn(() => Promise.resolve()),
}));

// Mock introspectGraphqlSchema
vi.mock("./introspectGraphqlSchema.js", () => ({
  introspectGraphqlSchema: vi.fn(),
}));

// Mock validateGraphQLOperation
vi.mock("../validations/graphqlSchema.js", () => ({
  default: vi.fn(),
}));

// Mock JavaScript and Rust validation functions
vi.mock("../validations/javascript.js", () => ({
  validateJavaScriptCodeBlock: vi.fn(),
}));

vi.mock("../validations/rust.js", () => ({
  validateRustCodeBlock: vi.fn(),
}));

vi.mock("../../package.json", () => ({
  default: { version: "1.0.0" },
}));

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock the environment variable
const originalEnv = process.env;

// Mock console.error and console.warn
const consoleError = console.error;
const consoleWarn = console.warn;

describe("searchShopifyDocs", () => {
  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup the mock for fetch
    fetchMock = global.fetch as any;

    // By default, mock successful response
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: {
        forEach: (callback: (value: string, key: string) => void) => {
          callback("application/json", "content-type");
        },
      },
      text: async () => JSON.stringify(sampleDocsResponse),
    });
  });

  test("returns formatted JSON response correctly", async () => {
    // Call the function directly with test parameters
    const result = await searchShopifyDocs("product listings");

    // Verify the fetch was called with correct URL
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchUrl = fetchMock.mock.calls[0][0];
    expect(fetchUrl).toContain("/mcp/search");
    expect(fetchUrl).toContain("query=product+listings");

    // Check that the response is formatted JSON
    expect(result.success).toBe(true);

    // The response should be properly formatted with indentation
    expect(result.formattedText).toContain("{\n");
    expect(result.formattedText).toContain('  "filename":');

    // Parse the response and verify it matches our sample data
    const parsedResponse = JSON.parse(result.formattedText);
    expect(parsedResponse).toEqual(sampleDocsResponse);
    expect(parsedResponse[0].filename).toBe(
      "api/admin/graphql/reference/products.md",
    );
    expect(parsedResponse[0].score).toBe(0.85);
  });

  test("handles HTTP error", async () => {
    // Mock an error response
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: {
        forEach: (callback: (value: string, key: string) => void) => {
          callback("text/plain", "content-type");
        },
      },
      text: async () => "Internal Server Error",
    });

    // Call the function directly
    const result = await searchShopifyDocs("product");

    // Check that the error was handled
    expect(result.success).toBe(false);
    expect(result.formattedText).toContain("HTTP error! status: 500");
    expect(result.formattedText).toContain("500");
  });

  test("handles fetch error", async () => {
    // Mock a network error
    fetchMock.mockRejectedValue(new Error("Network error"));

    // Call the function directly
    const result = await searchShopifyDocs("product");

    // Check that the error was handled
    expect(result.success).toBe(false);
    expect(result.formattedText).toContain("Network error");
  });

  test("handles non-JSON response gracefully", async () => {
    // Mock a non-JSON response
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: {
        forEach: (callback: (value: string, key: string) => void) => {
          callback("text/plain", "content-type");
        },
      },
      text: async () => "This is not valid JSON",
    });

    // Call the function directly
    const result = await searchShopifyDocs("product");

    // Check that the error was handled and raw text is returned
    expect(result.success).toBe(true);
    expect(result.formattedText).toBe("This is not valid JSON");

    // Verify that console.warn was called with the JSON parsing error
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "[search-shopify-docs] Error parsing JSON response:",
      ),
    );
  });

  it("sends no data when instrumentation is disabled", async () => {
    const emptyInstrumentationData = {};

    vi.mocked(isInstrumentationDisabled).mockReturnValueOnce(true);
    vi.mocked(instrumentationData).mockResolvedValueOnce(
      emptyInstrumentationData,
    );

    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ data: "test" }),
    };
    fetchMock.mockResolvedValueOnce(mockResponse);

    const result = await searchShopifyDocs("test query");

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const fetchOptions = fetchMock.mock.calls[0][1];
    expect(fetchOptions.headers).toEqual({
      Accept: "application/json",
      "Cache-Control": "no-cache",
      "X-Shopify-Surface": "mcp",
      "X-Shopify-MCP-Version": "",
      "X-Shopify-Timestamp": "",
    });

    expect(result.success).toBe(true);
    expect(result.formattedText).toBe('{\n  "data": "test"\n}');
  });
});

describe("fetchGettingStartedApis", () => {
  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = global.fetch as any;

    // Mock successful response by default
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: {
        forEach: (callback: (value: string, key: string) => void) => {
          callback("application/json", "content-type");
        },
      },
      text: async () => JSON.stringify(sampleGettingStartedApisResponse),
    });
  });

  beforeEach(() => {
    vi.resetModules();
    // Reset environment to clean state
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("fetches and validates API information successfully", async () => {
    // Since this function is not directly exposed, we need to test it indirectly
    // We'll check that fetch was called with the right URL when shopifyTools is executed
    // This is a bit of a placeholder test since we can't easily test the unexported function

    // Import the function we want to test - note that this is a circular import
    // that would normally be avoided, but it's okay for testing purposes
    const { shopifyTools } = await import("./index.js");

    // Create a mock server
    const mockServer = {
      tool: vi.fn(),
    };

    // Call the function
    await shopifyTools(mockServer as any);

    // Verify fetch was called to get the APIs
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/mcp/getting_started_apis?liquid_mcp=true"),
      expect.any(Object),
    );
  });

  test("adds liquid_mcp query parameter", async () => {
    const { shopifyTools } = await import("./index.js");

    const fetchSpy = vi.spyOn(global, "fetch");
    const mockServer = { tool: vi.fn() };

    await shopifyTools(mockServer as any);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/mcp/getting_started_apis?liquid_mcp=true"),
      expect.any(Object),
    );
  });
});

describe("learn_shopify_api tool behavior", () => {
  let fetchMock: any;
  let mockServer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = global.fetch as any;

    // First response is for API list
    // Second response is for getting started guide
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/mcp/getting_started_apis")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: {
            forEach: (callback: (value: string, key: string) => void) => {
              callback("application/json", "content-type");
            },
          },
          text: async () => JSON.stringify(sampleGettingStartedApisResponse),
        });
      } else if (url.includes("/mcp/getting_started")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: {
            forEach: (callback: (value: string, key: string) => void) => {
              callback("text/plain", "content-type");
            },
          },
          text: async () => sampleGettingStartedGuide,
        });
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    // Create a mock server that captures the registered tools
    mockServer = {
      tool: vi.fn((name, description, schema, handler) => {
        // Store the handler for testing
        if (name === "learn_shopify_api") {
          mockServer.learnShopifyApisHandler = handler;
        }
      }),
      learnShopifyApisHandler: null,
    };
  });

  test("fetches getting started guide successfully", async () => {
    // Import the function and register the tools
    const { shopifyTools } = await import("./index.js");
    await shopifyTools(mockServer);

    // Ensure the handler was registered
    expect(mockServer.learnShopifyApisHandler).not.toBeNull();

    // Now we can test the handler directly
    const result = await mockServer.learnShopifyApisHandler({ api: "admin" });

    // Check that the fetch was called with the correct URL
    const getStartedCalls = fetchMock.mock.calls.filter((call: [string, any]) =>
      call[0].includes("/mcp/getting_started?api=admin"),
    );
    expect(getStartedCalls.length).toBe(1);

    // Verify the response content
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain(
      "**IMPORTANT - SAVE THIS CONVERSATION ID:** test-conversation-id",
    );
    expect(result.content[0].text).toContain(sampleGettingStartedGuide);
  });

  test("handles HTTP error when fetching guide", async () => {
    // Set up a failure for the getting started endpoint
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/mcp/getting_started_apis")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: {
            forEach: (callback: (value: string, key: string) => void) => {
              callback("application/json", "content-type");
            },
          },
          text: async () => JSON.stringify(sampleGettingStartedApisResponse),
        });
      } else if (url.includes("/mcp/getting_started")) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          headers: {
            forEach: () => {},
          },
          text: async () => "Internal Server Error",
        });
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    // Register the tools
    const { shopifyTools } = await import("./index.js");
    await shopifyTools(mockServer);

    // Test the handler
    const result = await mockServer.learnShopifyApisHandler({ api: "admin" });

    // Verify error handling
    expect(result.content[0].text).toContain(
      "Error fetching getting started information",
    );
    expect(result.content[0].text).toContain("500");
  });

  test("handles network error", async () => {
    // Set up a network failure
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/mcp/getting_started_apis")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: {
            forEach: (callback: (value: string, key: string) => void) => {
              callback("application/json", "content-type");
            },
          },
          text: async () => JSON.stringify(sampleGettingStartedApisResponse),
        });
      } else if (url.includes("/mcp/getting_started")) {
        return Promise.reject(new Error("Network failure"));
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    // Register the tools
    const { shopifyTools } = await import("./index.js");
    await shopifyTools(mockServer);

    // Test the handler
    const result = await mockServer.learnShopifyApisHandler({ api: "admin" });

    // Verify error handling
    expect(result.content[0].text).toContain(
      "Error fetching getting started information",
    );
    expect(result.content[0].text).toContain("Network failure");
  });
});

describe("validate_graphql_codeblocks tool", () => {
  let mockServer: any;
  let validateGraphQLOperationMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    validateGraphQLOperationMock = vi.mocked(validateGraphQLOperation);

    // Mock fetch for getting started APIs
    const fetchMock = global.fetch as any;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(sampleGettingStartedApisResponse),
    });

    // Create a mock server that captures the registered tools
    mockServer = {
      tool: vi.fn((name, description, schema, handler) => {
        if (name === "validate_graphql_codeblocks") {
          mockServer.validateHandler = handler;
        }
      }),
      validateHandler: null,
    };

    // Mock instrumentation
    vi.mocked(instrumentationData).mockReturnValue({
      packageVersion: "1.0.0",
      timestamp: "2024-01-01T00:00:00.000Z",
    });
    vi.mocked(isInstrumentationDisabled).mockReturnValue(false);
  });

  test("validates multiple code blocks successfully", async () => {
    // Setup mock responses
    validateGraphQLOperationMock
      .mockResolvedValueOnce({
        result: ValidationResult.SUCCESS,
        resultDetail:
          "Successfully validated GraphQL query against Shopify Admin API schema.",
      })
      .mockResolvedValueOnce({
        result: ValidationResult.FAILED,
        resultDetail: "No GraphQL operation found in the provided code block.",
      });

    // Register the tools
    await shopifyTools(mockServer);

    // Ensure the handler was registered
    expect(mockServer.validateHandler).not.toBeNull();

    const testCodeblocks = ["query { products { id } }", "const x = 1;"];

    // Call the handler
    const result = await mockServer.validateHandler({
      codeblocks: testCodeblocks,
      api: "admin",
      version: "2025-01",
    });

    // Verify validateGraphQLOperation was called correctly
    expect(validateGraphQLOperationMock).toHaveBeenCalledTimes(2);
    expect(validateGraphQLOperationMock).toHaveBeenNthCalledWith(
      1,
      testCodeblocks[0],
      {
        api: "admin",
        version: expect.any(String),
        schemas: expect.any(Array),
      },
    );
    expect(validateGraphQLOperationMock).toHaveBeenNthCalledWith(
      2,
      testCodeblocks[1],
      {
        api: "admin",
        version: expect.any(String),
        schemas: expect.any(Array),
      },
    );

    // Verify the response
    expect(result.content[0].type).toBe("text");
    const responseText = result.content[0].text;
    expect(responseText).toContain("❌ INVALID");
    expect(responseText).toContain("**Total Code Blocks:** 2");
    expect(responseText).toContain("Successfully validated GraphQL query");
    expect(responseText).toContain("No GraphQL operation found");
  });

  test("handles validation failures correctly", async () => {
    // Setup mock responses with failures
    validateGraphQLOperationMock
      .mockResolvedValueOnce({
        result: ValidationResult.FAILED,
        resultDetail:
          "GraphQL validation errors: Cannot query field 'invalidField' on type 'Product'.",
      })
      .mockResolvedValueOnce({
        result: ValidationResult.SUCCESS,
        resultDetail:
          "Successfully validated GraphQL mutation against Shopify Admin API schema.",
      });

    // Register the tools
    await shopifyTools(mockServer);

    const testCodeblocks = [
      "query { products { invalidField } }",
      "mutation { productCreate(input: {}) { product { id } } }",
    ];

    // Call the handler
    const result = await mockServer.validateHandler({
      codeblocks: testCodeblocks,
      api: "admin",
    });

    // Verify the response shows invalid overall status
    const responseText = result.content[0].text;
    expect(responseText).toContain("❌ INVALID");
    expect(responseText).toContain("**Total Code Blocks:** 2");
    expect(responseText).toContain("Cannot query field 'invalidField'");
    expect(responseText).toContain("Successfully validated GraphQL mutation");
  });

  test("handles mixed validation results", async () => {
    // Setup mixed results
    validateGraphQLOperationMock
      .mockResolvedValueOnce({
        result: ValidationResult.SUCCESS,
        resultDetail:
          "Successfully validated GraphQL query against Shopify Admin API schema.",
      })
      .mockResolvedValueOnce({
        result: ValidationResult.FAILED,
        resultDetail: "No GraphQL operation found in the provided code block.",
      })
      .mockResolvedValueOnce({
        result: ValidationResult.FAILED,
        resultDetail:
          "GraphQL syntax error: Syntax Error: Expected Name, found }",
      });

    // Register the tools
    await shopifyTools(mockServer);

    const testCodeblocks = [
      "query { products { id } }",
      "const x = 1;",
      "query { products { } }",
    ];

    // Call the handler
    const result = await mockServer.validateHandler({
      codeblocks: testCodeblocks,
      api: "admin",
    });

    // Verify the response shows invalid overall status due to failure
    const responseText = result.content[0].text;
    expect(responseText).toContain("❌ INVALID");
    expect(responseText).toContain("**Total Code Blocks:** 3");
    expect(responseText).toContain("Code Block 1\n**Status:** ✅ SUCCESS");
    expect(responseText).toContain("Code Block 2\n**Status:** ❌ FAILED");
    expect(responseText).toContain("Code Block 3\n**Status:** ❌ FAILED");
    expect(responseText).toContain("Syntax Error: Expected Name, found }");
  });

  test("handles empty code blocks array", async () => {
    // Register the tools
    await shopifyTools(mockServer);

    // Call the handler with empty array
    const result = await mockServer.validateHandler({
      codeblocks: [],
      api: "admin",
    });

    // Verify validateGraphQLOperation was not called
    expect(validateGraphQLOperationMock).not.toHaveBeenCalled();

    // Verify the response
    const responseText = result.content[0].text;
    expect(responseText).toContain("✅ VALID");
    expect(responseText).toContain("**Total Code Blocks:** 0");
  });

  test("handles validation function errors", async () => {
    // Setup mock to throw an error
    validateGraphQLOperationMock.mockRejectedValueOnce(
      new Error("Schema loading failed"),
    );

    // Register the tools
    await shopifyTools(mockServer);

    const testCodeblocks = ["query { products { id } }"];

    // Call the handler and expect it to handle the error gracefully
    await expect(
      mockServer.validateHandler({
        codeblocks: testCodeblocks,
        api: "admin",
      }),
    ).rejects.toThrow("Schema loading failed");

    // Verify validateGraphQLOperation was called
    expect(validateGraphQLOperationMock).toHaveBeenCalledTimes(1);
  });

  test("records usage data correctly", async () => {
    // Setup successful validation
    validateGraphQLOperationMock.mockResolvedValueOnce({
      result: ValidationResult.SUCCESS,
      resultDetail:
        "Successfully validated GraphQL query against Shopify Admin API schema.",
    });

    // Register the tools
    await shopifyTools(mockServer);

    const testCodeblocks = ["query { products { id } }"];

    // Call the handler
    await mockServer.validateHandler({
      codeblocks: testCodeblocks,
      api: "admin",
    });

    // Verify recordUsage was called with correct parameters
    const { recordUsage } = await import("../instrumentation.js");
    expect(vi.mocked(recordUsage)).toHaveBeenCalledWith(
      "validate_graphql_codeblocks",
      {
        codeblocks: testCodeblocks,
        api: "admin",
      },
      expect.any(Array), // The validation responses array
    );
  });
});

describe("validate_functions tool", () => {
  let mockServer: any;
  let validateJavaScriptCodeBlockMock: any;
  let validateRustCodeBlockMock: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { validateJavaScriptCodeBlock } = await import(
      "../validations/javascript.js"
    );
    const { validateRustCodeBlock } = await import("../validations/rust.js");
    validateJavaScriptCodeBlockMock = vi.mocked(validateJavaScriptCodeBlock);
    validateRustCodeBlockMock = vi.mocked(validateRustCodeBlock);

    // Mock fetch for getting started APIs
    const fetchMock = global.fetch as any;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(sampleGettingStartedApisResponse),
    });

    // Create a mock server that captures the registered tools
    mockServer = {
      tool: vi.fn((name, description, schema, handler) => {
        if (name === "validate_functions") {
          mockServer.validateFunctionsHandler = handler;
        }
      }),
      validateFunctionsHandler: null,
    };

    // Mock instrumentation
    vi.mocked(instrumentationData).mockReturnValue({
      packageVersion: "1.0.0",
      timestamp: "2024-01-01T00:00:00.000Z",
    });
    vi.mocked(isInstrumentationDisabled).mockReturnValue(false);
  });

  test("validates JavaScript code blocks successfully", async () => {
    // Setup mock responses
    validateJavaScriptCodeBlockMock.mockResolvedValueOnce({
      result: ValidationResult.SUCCESS,
      resultDetail: "JavaScript code has valid syntax",
    });

    // Register the tools
    await shopifyTools(mockServer);

    // Ensure the handler was registered
    expect(mockServer.validateFunctionsHandler).not.toBeNull();

    const testCodeblocks = [
      {
        code: 'function test() { return "hello"; }',
        language: "javascript",
      },
    ];

    // Call the handler
    const result = await mockServer.validateFunctionsHandler({
      codeblocks: testCodeblocks,
      conversationId: "test-id",
    });

    // Verify validateJavaScriptCodeBlock was called correctly
    expect(validateJavaScriptCodeBlockMock).toHaveBeenCalledTimes(1);
    expect(validateJavaScriptCodeBlockMock).toHaveBeenCalledWith({
      code: 'function test() { return "hello"; }',
    });

    // Verify the response
    expect(result.content[0].type).toBe("text");
    const responseText = result.content[0].text;
    expect(responseText).toContain("✅ VALID");
    expect(responseText).toContain("**Total Functions Code Blocks:** 1");
    expect(responseText).toContain("JavaScript code has valid syntax");
  });

  test("validates Rust code blocks successfully", async () => {
    // Setup mock responses
    validateRustCodeBlockMock.mockResolvedValueOnce({
      result: ValidationResult.SUCCESS,
      resultDetail: "Rust code has valid syntax",
    });

    // Register the tools
    await shopifyTools(mockServer);

    const testCodeblocks = [
      {
        code: "fn main() { println!('Hello, world!'); }",
        language: "rust",
      },
    ];

    // Call the handler
    const result = await mockServer.validateFunctionsHandler({
      codeblocks: testCodeblocks,
      conversationId: "test-id",
    });

    // Verify validateRustCodeBlock was called correctly
    expect(validateRustCodeBlockMock).toHaveBeenCalledTimes(1);
    expect(validateRustCodeBlockMock).toHaveBeenCalledWith({
      code: "fn main() { println!('Hello, world!'); }",
    });

    // Verify the response
    expect(result.content[0].type).toBe("text");
    const responseText = result.content[0].text;
    expect(responseText).toContain("✅ VALID");
    expect(responseText).toContain("**Total Functions Code Blocks:** 1");
    expect(responseText).toContain("Rust code has valid syntax");
  });

  test("validates mixed JavaScript and Rust code blocks", async () => {
    // Setup mock responses
    validateJavaScriptCodeBlockMock.mockResolvedValueOnce({
      result: ValidationResult.SUCCESS,
      resultDetail: "JavaScript code has valid syntax",
    });
    validateRustCodeBlockMock.mockResolvedValueOnce({
      result: ValidationResult.FAILED,
      resultDetail: "Rust syntax errors: Line 1, Column 10: unexpected token",
    });

    // Register the tools
    await shopifyTools(mockServer);

    const testCodeblocks = [
      {
        code: 'function test1() { return "hello"; }',
        language: "javascript",
      },
      {
        code: "fn broken( { }",
        language: "rust",
      },
    ];

    // Call the handler
    const result = await mockServer.validateFunctionsHandler({
      codeblocks: testCodeblocks,
      conversationId: "test-id",
    });

    // Verify both validation functions were called
    expect(validateJavaScriptCodeBlockMock).toHaveBeenCalledTimes(1);
    expect(validateRustCodeBlockMock).toHaveBeenCalledTimes(1);

    expect(validateJavaScriptCodeBlockMock).toHaveBeenCalledWith({
      code: 'function test1() { return "hello"; }',
    });
    expect(validateRustCodeBlockMock).toHaveBeenCalledWith({
      code: "fn broken( { }",
    });

    // Verify the response shows mixed results
    const responseText = result.content[0].text;
    expect(responseText).toContain("❌ INVALID"); // Overall status should be invalid due to Rust failure
    expect(responseText).toContain("**Total Functions Code Blocks:** 2");
    expect(responseText).toContain(
      "Functions Code Block 1\n**Status:** ✅ SUCCESS",
    );
    expect(responseText).toContain(
      "Functions Code Block 2\n**Status:** ❌ FAILED",
    );
    expect(responseText).toContain("JavaScript code has valid syntax");
    expect(responseText).toContain(
      "Rust syntax errors: Line 1, Column 10: unexpected token",
    );
  });

  test("handles validation failures correctly", async () => {
    // Setup mock responses with failures
    validateJavaScriptCodeBlockMock.mockResolvedValueOnce({
      result: ValidationResult.FAILED,
      resultDetail:
        "JavaScript syntax errors: Line 2, Column 5: missing closing brace",
    });
    validateRustCodeBlockMock.mockResolvedValueOnce({
      result: ValidationResult.FAILED,
      resultDetail: "Rust syntax errors: Line 1, Column 8: expected expression",
    });

    // Register the tools
    await shopifyTools(mockServer);

    const testCodeblocks = [
      {
        code: "function broken() {\n  let x = 5;",
        language: "javascript",
      },
      {
        code: "fn test() -> { }",
        language: "rust",
      },
    ];

    // Call the handler
    const result = await mockServer.validateFunctionsHandler({
      codeblocks: testCodeblocks,
      conversationId: "test-id",
    });

    // Verify both validation functions were called
    expect(validateJavaScriptCodeBlockMock).toHaveBeenCalledTimes(1);
    expect(validateRustCodeBlockMock).toHaveBeenCalledTimes(1);

    // Verify the response shows all failures
    const responseText = result.content[0].text;
    expect(responseText).toContain("❌ INVALID");
    expect(responseText).toContain("**Total Functions Code Blocks:** 2");
    expect(responseText).toContain("missing closing brace");
    expect(responseText).toContain("expected expression");
    expect(result.isError).toBe(true);
  });

  test("handles empty code blocks array", async () => {
    // Register the tools
    await shopifyTools(mockServer);

    // Call the handler with empty array
    const result = await mockServer.validateFunctionsHandler({
      codeblocks: [],
      conversationId: "test-id",
    });

    // Verify validation functions were not called
    expect(validateJavaScriptCodeBlockMock).not.toHaveBeenCalled();
    expect(validateRustCodeBlockMock).not.toHaveBeenCalled();

    // Verify the response
    const responseText = result.content[0].text;
    expect(responseText).toContain("✅ VALID");
    expect(responseText).toContain("**Total Functions Code Blocks:** 0");
    expect(result.isError).toBe(false);
  });

  test("handles unsupported language type", async () => {
    // Register the tools
    await shopifyTools(mockServer);

    const testCodeblocks = [
      {
        code: "print('Hello, world!')",
        language: "python" as any, // Unsupported language
      },
    ];

    // Call the handler
    const result = await mockServer.validateFunctionsHandler({
      codeblocks: testCodeblocks,
      conversationId: "test-id",
    });

    // Verify validation functions were not called for unsupported language
    expect(validateJavaScriptCodeBlockMock).not.toHaveBeenCalled();
    expect(validateRustCodeBlockMock).not.toHaveBeenCalled();

    // Verify the response shows error for unsupported language
    const responseText = result.content[0].text;
    expect(responseText).toContain("❌ INVALID");
    expect(responseText).toContain("Unsupported language: python");
    expect(result.isError).toBe(true);
  });

  test("records usage data correctly", async () => {
    // Setup successful validation
    validateJavaScriptCodeBlockMock.mockResolvedValueOnce({
      result: ValidationResult.SUCCESS,
      resultDetail: "JavaScript code has valid syntax",
    });

    // Register the tools
    await shopifyTools(mockServer);

    const testCodeblocks = [
      {
        code: 'function test() { return "hello"; }',
        language: "javascript",
      },
    ];

    // Call the handler
    await mockServer.validateFunctionsHandler({
      codeblocks: testCodeblocks,
      conversationId: "test-id",
    });

    // Verify recordUsage was called with correct parameters
    const { recordUsage } = await import("../instrumentation.js");
    expect(vi.mocked(recordUsage)).toHaveBeenCalledWith(
      "validate_functions",
      {
        codeblocks: testCodeblocks,
        conversationId: "test-id",
      },
      expect.any(Array), // The validation responses array
    );
  });

  test("validates code blocks in parallel", async () => {
    // Setup mock responses with delays to test parallel execution
    validateJavaScriptCodeBlockMock.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                result: ValidationResult.SUCCESS,
                resultDetail: "JavaScript code has valid syntax",
              }),
            50,
          ),
        ),
    );
    validateRustCodeBlockMock.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                result: ValidationResult.SUCCESS,
                resultDetail: "Rust code has valid syntax",
              }),
            50,
          ),
        ),
    );

    // Register the tools
    await shopifyTools(mockServer);

    const testCodeblocks = [
      {
        code: 'function test1() { return "hello"; }',
        language: "javascript",
      },
      {
        code: 'fn test1() -> String { String::from("hello") }',
        language: "rust",
      },
      {
        code: 'function test2() { return "world"; }',
        language: "javascript",
      },
    ];

    const startTime = Date.now();

    // Call the handler
    const result = await mockServer.validateFunctionsHandler({
      codeblocks: testCodeblocks,
      conversationId: "test-id",
    });

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    // Verify all validation functions were called
    expect(validateJavaScriptCodeBlockMock).toHaveBeenCalledTimes(2);
    expect(validateRustCodeBlockMock).toHaveBeenCalledTimes(1);

    // Verify parallel execution (should be less than 150ms for 3 x 50ms operations)
    expect(executionTime).toBeLessThan(150);

    // Verify successful response
    const responseText = result.content[0].text;
    expect(responseText).toContain("✅ VALID");
    expect(responseText).toContain("**Total Functions Code Blocks:** 3");
  });

  test("uses non-CLI validation by default", async () => {
    // Ensure no CLI environment variable is set
    delete process.env.FUNCTIONS_CLI_VALIDATION;

    // Setup mock responses
    validateJavaScriptCodeBlockMock.mockResolvedValueOnce({
      result: ValidationResult.SUCCESS,
      resultDetail: "JavaScript code has valid syntax",
    });

    // Register the tools
    await shopifyTools(mockServer);

    const testCodeblocks = [
      {
        code: 'function test() { return "hello"; }',
        language: "javascript",
      },
    ];

    // Call the handler with codeblocks (non-CLI mode)
    const result = await mockServer.validateFunctionsHandler({
      codeblocks: testCodeblocks,
      conversationId: "test-id",
    });

    // Verify validateJavaScriptCodeBlock was called (non-CLI implementation)
    expect(validateJavaScriptCodeBlockMock).toHaveBeenCalledTimes(1);
    expect(validateJavaScriptCodeBlockMock).toHaveBeenCalledWith({
      code: 'function test() { return "hello"; }',
    });

    // Verify successful response
    const responseText = result.content[0].text;
    expect(responseText).toContain("✅ VALID");
  });

  test("uses CLI validation when environment variable is set", async () => {
    // Set environment variable to enable CLI validation
    process.env.FUNCTIONS_CLI_VALIDATION = "true";

    // Register the tools
    await shopifyTools(mockServer);

    // Call the handler with only conversationId (CLI mode)
    const result = await mockServer.validateFunctionsHandler({
      conversationId: "test-id",
    });

    // In CLI mode, validateWithCLI is called with an empty array
    // So no individual language validation functions should be called
    expect(validateJavaScriptCodeBlockMock).not.toHaveBeenCalled();
    expect(validateRustCodeBlockMock).not.toHaveBeenCalled();

    // Verify successful response (empty validation should be valid)
    const responseText = result.content[0].text;
    expect(responseText).toContain("✅ VALID");
    expect(responseText).toContain("**Total Functions Code Blocks:** 0");

    // Clean up environment variable
    delete process.env.FUNCTIONS_CLI_VALIDATION;
  });

  test("records usage correctly for CLI mode", async () => {
    // Set environment variable to enable CLI validation
    process.env.FUNCTIONS_CLI_VALIDATION = "true";

    // Register the tools
    await shopifyTools(mockServer);

    // Call the handler with only conversationId (CLI mode)
    await mockServer.validateFunctionsHandler({
      conversationId: "test-id",
    });

    // Verify recordUsage was called with correct parameters for CLI mode
    const { recordUsage } = await import("../instrumentation.js");
    expect(vi.mocked(recordUsage)).toHaveBeenCalledWith(
      "validate_functions",
      {
        conversationId: "test-id",
      },
      expect.any(Array), // The validation responses array
    );

    // Clean up environment variable
    delete process.env.FUNCTIONS_CLI_VALIDATION;
  });
});
