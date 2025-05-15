// Import vitest first
import { describe, test, expect, beforeEach, vi, afterAll } from "vitest";

// Mock fetch globally
global.fetch = vi.fn();

// Now import the modules to test
import { searchShopifyDocs } from "./index.js";

// Mock console.error and console.warn
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
console.error = vi.fn();
console.warn = vi.fn();

// Clean up after tests
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
    description: "App Home, Admin Extensions, Checkout Extensions, Customer Account Extensions, Polaris Web Components"
  },
  {
    name: "admin",
    description: "Admin API, Admin API GraphQL Schema, Admin API REST Schema"
  },
  {
    name: "functions",
    description: "Shopify Functions, Shopify Functions API"
  }
];

// Sample getting started guide response
const sampleGettingStartedGuide = `# Getting Started with Admin API
This guide walks you through the first steps of using the Shopify Admin API.

## Authentication
Learn how to authenticate your app with OAuth.

## Making API Calls
Examples of common API calls with the Admin API.`;

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
    expect(result.formattedText).toContain(
      "Error searching Shopify documentation",
    );
    expect(result.formattedText).toContain("500");
  });

  test("handles fetch error", async () => {
    // Mock a network error
    fetchMock.mockRejectedValue(new Error("Network error"));

    // Call the function directly
    const result = await searchShopifyDocs("product");

    // Check that the error was handled
    expect(result.success).toBe(false);
    expect(result.formattedText).toContain(
      "Error searching Shopify documentation: Network error",
    );
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
      expect.any(Object)
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
      call[0].includes("/mcp/getting_started?api=admin")
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
    expect(result.content[0].text).toContain("Error fetching getting started information");
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
    expect(result.content[0].text).toContain("Error fetching getting started information");
    expect(result.content[0].text).toContain("Network failure");
  });
});
