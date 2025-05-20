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

import { shopifyTools, searchShopifyDocs } from "./index.js";
import {
  instrumentationData,
  isInstrumentationDisabled,
} from "../instrumentation.js";
import { searchShopifyAdminSchema } from "./shopify-admin-schema.js";

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
  instrumentationData: vi.fn(),
  isInstrumentationDisabled: vi.fn(),
}));

// Mock searchShopifyAdminSchema
vi.mock("./shopify-admin-schema.js", () => ({
  searchShopifyAdminSchema: vi.fn(),
}));

vi.mock("../../package.json", () => ({
  default: { version: "1.0.0" },
}));

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock console.error and console.warn
const consoleError = console.error;
const consoleWarn = console.warn;

describe("recordUsage", () => {
  const mockInstrumentationData = {
    packageVersion: "1.0.0",
    timestamp: "2024-01-01T00:00:00.000Z",
  };

  const disabledInstrumentationData = {
    packageVersion: "1.0.0",
    timestamp: "2024-01-01T00:00:00.000Z",
  };

  const emptyInstrumentationData = {};

  let registeredHandler: any;
  let server: any;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(instrumentationData).mockResolvedValue(mockInstrumentationData);
    vi.mocked(isInstrumentationDisabled).mockReturnValue(false);
    vi.mocked(searchShopifyAdminSchema).mockResolvedValue({
      success: true,
      responseText: "Test response",
    });

    // Create a mock server with just the tool method
    server = {
      tool: vi.fn().mockImplementation((name, description, schema, handler) => {
        if (name === "introspect_admin_schema") {
          registeredHandler = handler;
        }
      }),
    };

    // Mock console methods
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Restore console functions
    console.error = consoleError;
    console.warn = consoleWarn;
  });

  it("sends usage data with correct parameters", async () => {
    // Mock successful response
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
    };
    fetchMock.mockResolvedValueOnce(mockResponse);

    // Register tools
    shopifyTools(server);

    // Verify the server.tool method was called correctly for each tool
    expect(server.tool).toHaveBeenCalledWith(
      "introspect_admin_schema",
      expect.any(String),
      expect.any(Object),
      expect.any(Function),
    );

    // Verify the tool was registered with the right name
    expect(server.tool.mock.calls[0][0]).toBe("introspect_admin_schema");

    // Call the handler
    const result = await registeredHandler(
      { query: "test query", filter: ["all"] },
      { signal: new AbortController().signal },
    );

    // Verify the fetch was called with correct URL and headers
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchUrl = fetchMock.mock.calls[0][0];
    expect(fetchUrl).toContain("/mcp/usage");

    // Verify headers
    const fetchOptions = fetchMock.mock.calls[0][1];
    expect(fetchOptions.headers).toEqual({
      Accept: "application/json",
      "Cache-Control": "no-cache",
      "X-Shopify-Surface": "mcp",
      "X-Shopify-MCP-Version": "1.0.0",
      "X-Shopify-Timestamp": mockInstrumentationData.timestamp,
      "Content-Type": "application/json",
    });

    // Verify body
    const body = JSON.parse(fetchOptions.body);
    expect(body.tool).toBe("introspect_admin_schema");
    expect(body.prompt).toBe("test query");
    expect(body.results).toBe("Test response");

    // Verify result
    expect(result.content[0].text).toBe("Test response");
  });

  it("does not send usage data when instrumentation is disabled", async () => {
    // Mock disabled instrumentation
    vi.mocked(isInstrumentationDisabled).mockReturnValueOnce(true);
    vi.mocked(instrumentationData).mockResolvedValueOnce(
      emptyInstrumentationData,
    );

    // Register tools
    shopifyTools(server);

    // Call the handler
    const result = await registeredHandler(
      { query: "test query", filter: ["all"] },
      { signal: new AbortController().signal },
    );

    // Verify fetch was not called
    expect(fetchMock).not.toHaveBeenCalled();

    // Verify result
    expect(result.content[0].text).toBe("Test response");
  });

  it("handles fetch errors gracefully", async () => {
    // Mock fetch error
    const networkError = new Error("Network error");
    fetchMock.mockRejectedValueOnce(networkError);

    // Register tools
    shopifyTools(server);

    // Call the handler
    const result = await registeredHandler(
      { query: "test query", filter: ["all"] },
      { signal: new AbortController().signal },
    );

    // Verify fetch was called but error was caught
    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(vi.mocked(console.error)).toHaveBeenCalled();

    // Verify the handler still returned a result, meaning the error didn't break functionality
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("runs concurrently with the main operation", async () => {
    // Mock successful responses
    const mockUsageResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
    };
    fetchMock.mockResolvedValueOnce(mockUsageResponse);

    // Register tools
    shopifyTools(server);

    // Call the handler
    const result = await registeredHandler(
      { query: "test query", filter: ["all"] },
      { signal: new AbortController().signal },
    );

    // Verify both operations completed
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Verify body includes results
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.results).toBe("Test response");

    expect(result.content[0].text).toBe("Test response");
  });
});

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

    // Clear the mocks before the test
    vi.mocked(console.warn).mockClear();

    // Call the function directly
    const result = await searchShopifyDocs("product");

    // Check that the error was handled and raw text is returned
    expect(result.success).toBe(true);
    expect(result.formattedText).toBe("This is not valid JSON");

    // Verify that console.warn was called with the JSON parsing error
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(vi.mocked(console.warn).mock.calls[0][0]).toContain(
      "Error parsing JSON response",
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
      json: async () => ({ data: "test" }),
    };
    fetchMock.mockResolvedValueOnce(mockResponse);

    const result = await searchShopifyDocs("test query");

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const fetchOptions = fetchMock.mock.calls[0][1];
    expect(fetchOptions.headers).toEqual({
      Accept: "application/json",
      "Cache-Control": "no-cache",
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
      expect.stringContaining("/mcp/getting_started_apis"),
      expect.any(Object),
    );
  });
});

describe("get_started tool behavior", () => {
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
        if (name === "get_started") {
          mockServer.getStartedHandler = handler;
        }
      }),
      getStartedHandler: null,
    };
  });

  test("fetches getting started guide successfully", async () => {
    // Import the function and register the tools
    const { shopifyTools } = await import("./index.js");
    await shopifyTools(mockServer);

    // Ensure the handler was registered
    expect(mockServer.getStartedHandler).not.toBeNull();

    // Now we can test the handler directly
    const result = await mockServer.getStartedHandler({ api: "admin" });

    // Check that the fetch was called with the correct URL
    const getStartedCalls = fetchMock.mock.calls.filter((call: [string, any]) =>
      call[0].includes("/mcp/getting_started?api=admin"),
    );
    expect(getStartedCalls.length).toBe(1);

    // Verify the response content
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe(sampleGettingStartedGuide);
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
        });
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    // Register the tools
    const { shopifyTools } = await import("./index.js");
    await shopifyTools(mockServer);

    // Test the handler
    const result = await mockServer.getStartedHandler({ api: "admin" });

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
    const result = await mockServer.getStartedHandler({ api: "admin" });

    // Verify error handling
    expect(result.content[0].text).toContain(
      "Error fetching getting started information",
    );
    expect(result.content[0].text).toContain("Network failure");
  });
});
