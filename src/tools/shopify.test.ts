// Import vitest first
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock instrumentation first
vi.mock("../instrumentation.js", () => ({
  instrumentationData: vi.fn(),
}));

// Import after mocks
import { searchShopifyDocs } from "./index.js";
import { instrumentationData } from "../instrumentation.js";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock console.error and console.warn
const consoleError = console.error;
const consoleWarn = console.warn;
console.error = vi.fn();
console.warn = vi.fn();

describe("searchShopifyDocs", () => {
  const mockInstrumentationData = {
    installationId: "test-installation-id",
    sessionId: "test-session-id",
    packageVersion: "1.0.0",
    timestamp: "2024-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(instrumentationData).mockResolvedValue(mockInstrumentationData);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Restore console functions
    console.error = consoleError;
    console.warn = consoleWarn;
  });

  it("returns formatted JSON response correctly", async () => {
    // Mock successful response
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ data: "test" }),
    };
    fetchMock.mockResolvedValueOnce(mockResponse);

    const result = await searchShopifyDocs("test query");

    // Verify the fetch was called with correct URL
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchUrl = fetchMock.mock.calls[0][0];
    expect(fetchUrl).toContain("/mcp/search");
    expect(fetchUrl).toContain("query=test+query");

    // Verify headers
    const fetchOptions = fetchMock.mock.calls[0][1];
    expect(fetchOptions.headers).toEqual({
      Accept: "application/json",
      "Cache-Control": "no-cache",
      "X-Shopify-Surface": "mcp",
      "X-Shopify-MCP-Version": "1.0.0",
      "X-Shopify-Installation-ID": mockInstrumentationData.installationId,
      "X-Shopify-Session-ID": mockInstrumentationData.sessionId,
      "X-Shopify-Package-Version": mockInstrumentationData.packageVersion,
      "X-Shopify-Timestamp": mockInstrumentationData.timestamp,
    });

    // Verify response
    expect(result.success).toBe(true);
    expect(result.formattedText).toBe('{\n  "data": "test"\n}');
  });

  it("handles HTTP error", async () => {
    // Mock error response
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "Internal Server Error",
    };
    fetchMock.mockResolvedValueOnce(mockResponse);

    const result = await searchShopifyDocs("test query");

    expect(result.success).toBe(false);
    expect(result.formattedText).toBe("HTTP error! status: 500");
  });

  it("handles fetch error", async () => {
    // Mock fetch error
    const networkError = new Error("Network error");
    fetchMock.mockRejectedValueOnce(networkError);

    const result = await searchShopifyDocs("test query");

    expect(result.success).toBe(false);
    expect(result.formattedText).toBe("Network error");
  });

  it("handles non-JSON response gracefully", async () => {
    // Mock non-JSON response
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => {
        throw new Error("Invalid JSON");
      },
      text: async () => "This is not valid JSON",
    };
    fetchMock.mockResolvedValueOnce(mockResponse);

    const result = await searchShopifyDocs("test query");

    expect(result.success).toBe(true);
    expect(result.formattedText).toBe("This is not valid JSON");
  });

  it("sends empty IDs when instrumentation is disabled", async () => {
    // Mock instrumentation data with empty IDs
    const disabledInstrumentationData = {
      installationId: "",
      sessionId: "",
      packageVersion: "1.0.0",
      timestamp: "2024-01-01T00:00:00.000Z",
    };
    vi.mocked(instrumentationData).mockResolvedValueOnce(
      disabledInstrumentationData,
    );

    // Mock successful response
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ data: "test" }),
    };
    fetchMock.mockResolvedValueOnce(mockResponse);

    const result = await searchShopifyDocs("test query");

    // Verify the fetch was called with correct URL
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchUrl = fetchMock.mock.calls[0][0];
    expect(fetchUrl).toContain("/mcp/search");
    expect(fetchUrl).toContain("query=test+query");

    // Verify headers with empty IDs
    const fetchOptions = fetchMock.mock.calls[0][1];
    expect(fetchOptions.headers).toEqual({
      Accept: "application/json",
      "Cache-Control": "no-cache",
      "X-Shopify-Surface": "mcp",
      "X-Shopify-MCP-Version": "1.0.0",
      "X-Shopify-Installation-ID": "",
      "X-Shopify-Session-ID": "",
      "X-Shopify-Package-Version": disabledInstrumentationData.packageVersion,
      "X-Shopify-Timestamp": disabledInstrumentationData.timestamp,
    });

    // Verify response
    expect(result.success).toBe(true);
    expect(result.formattedText).toBe('{\n  "data": "test"\n}');
  });
});
