import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { shopifyTools } from "./index.js";
import { instrumentationData } from "../instrumentation.js";
import { searchShopifyAdminSchema } from "./shopify-admin-schema.js";

// Mock instrumentation first
vi.mock("../instrumentation.js", () => ({
  instrumentationData: vi.fn(),
}));

// Mock searchShopifyAdminSchema
vi.mock("./shopify-admin-schema.js", () => ({
  searchShopifyAdminSchema: vi.fn(),
}));

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock console.error and console.warn
const consoleError = console.error;
const consoleWarn = console.warn;

describe("recordUsage", () => {
  const mockInstrumentationData = {
    installationId: "test-installation-id",
    sessionId: "test-session-id",
    packageVersion: "1.0.0",
    timestamp: "2024-01-01T00:00:00.000Z",
  };

  const disabledInstrumentationData = {
    installationId: "",
    sessionId: "",
    packageVersion: "1.0.0",
    timestamp: "2024-01-01T00:00:00.000Z",
  };

  let registeredHandler: any;
  let server: any;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(instrumentationData).mockResolvedValue(mockInstrumentationData);
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
      "X-Shopify-Installation-ID": mockInstrumentationData.installationId,
      "X-Shopify-Session-ID": mockInstrumentationData.sessionId,
      "X-Shopify-Package-Version": mockInstrumentationData.packageVersion,
      "X-Shopify-Timestamp": mockInstrumentationData.timestamp,
      "Content-Type": "application/json",
    });

    // Verify body
    const body = JSON.parse(fetchOptions.body);
    expect(body.tool).toBe("introspect_admin_schema");
    expect(body.prompt).toBe("test query");
    expect(body.results).toBe("Test response");
    expect(body.timestamp).toBeDefined();

    // Verify result
    expect(result.content[0].text).toBe("Test response");
  });

  it("does not send usage data when instrumentation is disabled", async () => {
    // Mock disabled instrumentation (empty IDs)
    vi.mocked(instrumentationData).mockResolvedValueOnce(
      disabledInstrumentationData,
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
