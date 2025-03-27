// Import vitest first
import { describe, test, expect, beforeEach, vi, afterAll } from "vitest";

// Mock fetch globally
global.fetch = vi.fn();

// Now import the modules to test
import { searchShopifyDocs, fetchGitHubIssue } from "./shopify.js";

// Mock console.error, console.warn, and console.log
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;
console.error = vi.fn();
console.warn = vi.fn();
console.log = vi.fn();

// Clean up after tests
afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
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
      "api/admin/graphql/reference/products.md"
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
      "Error searching Shopify documentation"
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
      "Error searching Shopify documentation: Network error"
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
      "Error parsing JSON response"
    );
  });
});

describe("fetchGitHubIssue", () => {
  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup the mock for fetch
    fetchMock = global.fetch as any;

    // Mock a successful GitHub issue response
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        number: 722,
        title: "Sample Issue Title",
        state: "open",
        user: { login: "testuser" },
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-02T00:00:00Z",
        html_url: "https://github.com/Shopify/test-repo/issues/722",
        labels: [{ name: "bug" }, { name: "documentation" }],
        body: "This is a sample issue body"
      })
    });
  });

  test("successfully fetches a GitHub issue by URL", async () => {
    const result = await fetchGitHubIssue("https://github.com/Shopify/test-repo/issues/722");

    // Verify the fetch was called with correct URL
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchUrl = fetchMock.mock.calls[0][0];
    expect(fetchUrl).toBe("https://api.github.com/repos/Shopify/test-repo/issues/722");

    // Check that the headers were set correctly
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers["Accept"]).toBe("application/vnd.github.v3+json");
    expect(headers["User-Agent"]).toBe("Shopify-Dev-MCP");

    // Check result formatting
    expect(result.success).toBe(true);
    const parsedResponse = JSON.parse(result.formattedText);
    
    expect(parsedResponse.repository).toBe("Shopify/test-repo");
    expect(parsedResponse.issue.number).toBe(722);
    expect(parsedResponse.issue.title).toBe("Sample Issue Title");
    expect(parsedResponse.issue.author).toBe("testuser");
    expect(parsedResponse.issue.labels).toEqual(["bug", "documentation"]);
  });
  
  test("validates GitHub issue URL format", async () => {
    const result = await fetchGitHubIssue("https://github.com/invalid-url");
    
    // Check that validation works
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid URL format");
    expect(result.formattedText).toContain("Invalid GitHub issue URL");
    
    // Verify that fetch was not called
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("handles issue not found (404)", async () => {
    // Mock a 404 response
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found"
    });

    const result = await fetchGitHubIssue("https://github.com/Shopify/test-repo/issues/999");

    // Check error handling for 404
    expect(result.success).toBe(false);
    expect(result.formattedText).toContain("Issue #999 not found");
    expect(result.error).toBe("Issue not found");
  });

  test("handles access denied (403)", async () => {
    // Mock a 403 response
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden"
    });

    const result = await fetchGitHubIssue("https://github.com/Shopify/private-repo/issues/123");

    // Check error handling for 403
    expect(result.success).toBe(false);
    expect(result.formattedText).toContain("Access denied");
    expect(result.error).toBe("Access denied");
  });

  test("handles network errors", async () => {
    // Mock a network error
    fetchMock.mockRejectedValue(new Error("Network error"));

    const result = await fetchGitHubIssue("https://github.com/Shopify/test-repo/issues/123");

    // Check general error handling
    expect(result.success).toBe(false);
    expect(result.formattedText).toContain("Error fetching issue");
  });
});
