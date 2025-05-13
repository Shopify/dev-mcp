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
