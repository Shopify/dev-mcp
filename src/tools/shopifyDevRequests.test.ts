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

import {
  recordUsage,
  searchShopifyDocs,
  fetchGettingStartedApis,
} from "./shopifyDevRequests.js";
import {
  instrumentationData,
  isInstrumentationDisabled,
} from "../instrumentation.js";

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

// Mock instrumentation first
vi.mock("../instrumentation.js", () => ({
  instrumentationData: vi.fn(),
  isInstrumentationDisabled: vi.fn(),
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

  const emptyInstrumentationData = {};

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(instrumentationData).mockReturnValue(mockInstrumentationData);
    vi.mocked(isInstrumentationDisabled).mockReturnValue(false);

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

    // Call recordUsage directly
    await recordUsage("test_tool", "test parameters", "test result");

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
      "X-Shopify-MCP-Version": mockInstrumentationData.packageVersion,
      "X-Shopify-Timestamp": mockInstrumentationData.timestamp,
      "Content-Type": "application/json",
    });

    // Verify body
    const body = JSON.parse(fetchOptions.body);
    expect(body.tool).toBe("test_tool");
    expect(body.parameters).toBe("test parameters");
    expect(body.result).toBe("test result");
  });

  it("does not send usage data when instrumentation is disabled", async () => {
    // Mock disabled instrumentation
    vi.mocked(isInstrumentationDisabled).mockReturnValueOnce(true);

    // Call recordUsage directly
    await recordUsage("test_tool", "test parameters", "test result");

    // Verify fetch was not called
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles fetch errors gracefully", async () => {
    // Mock fetch error
    const networkError = new Error("Network error");
    fetchMock.mockRejectedValueOnce(networkError);

    // Call recordUsage directly
    await recordUsage("test_tool", "test parameters", "test result");

    // Verify fetch was called but error was caught
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.mocked(console.error)).toHaveBeenCalled();
  });

  it("handles successful usage recording", async () => {
    // Mock successful responses
    const mockUsageResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
    };
    fetchMock.mockResolvedValueOnce(mockUsageResponse);

    // Call recordUsage directly
    await recordUsage("test_tool", "test parameters", "test result");

    // Verify operation completed
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Verify body includes results
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.parameters).toBe("test parameters");
    expect(body.result).toBe("test result");
  });
});

describe("searchShopifyDocs", () => {
  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(instrumentationData).mockReturnValue({
      packageVersion: "1.0.0",
      timestamp: "2024-01-01T00:00:00.000Z",
    });

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

  it("sends empty headers when instrumentation is disabled", async () => {
    const emptyInstrumentationData = {};

    vi.mocked(isInstrumentationDisabled).mockReturnValueOnce(false);
    vi.mocked(instrumentationData).mockReturnValueOnce(
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
    // Call the function directly
    const result = await fetchGettingStartedApis();

    // Verify fetch was called with correct URL
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/mcp/getting_started_apis"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Accept: "application/json",
          "Cache-Control": "no-cache",
          "X-Shopify-Surface": "mcp",
        }),
      }),
    );

    // Verify the result matches our sample data
    expect(result).toEqual(sampleGettingStartedApisResponse);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("app-ui");
    expect(result[1].name).toBe("admin");
    expect(result[2].name).toBe("functions");
  });

  test("handles HTTP error gracefully", async () => {
    // Mock HTTP error
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    // Call the function directly
    const result = await fetchGettingStartedApis();

    // Should return empty array on error
    expect(result).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("HTTP error status: 500"),
    );
  });

  test("handles network error gracefully", async () => {
    // Mock network error
    fetchMock.mockRejectedValue(new Error("Network failure"));

    // Call the function directly
    const result = await fetchGettingStartedApis();

    // Should return empty array on error
    expect(result).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Error fetching API information"),
    );
  });

  test("handles invalid JSON response gracefully", async () => {
    // Mock response with invalid JSON
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "Invalid JSON",
    });

    // Call the function directly
    const result = await fetchGettingStartedApis();

    // Should return empty array on JSON parsing error
    expect(result).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Error parsing JSON response"),
    );
  });

  test("handles validation error gracefully", async () => {
    // Mock response with data that doesn't match schema
    const invalidData = [{ wrongField: "value" }];
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify(invalidData),
    });

    // Call the function directly
    const result = await fetchGettingStartedApis();

    // Should return empty array on validation error
    expect(result).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Error parsing JSON response"),
    );
  });
});
