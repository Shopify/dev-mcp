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

vi.mock("../instrumentation.js", () => ({
  instrumentationData: vi.fn(),
  isInstrumentationDisabled: vi.fn(),
}));

const fetchMock = vi.fn();
global.fetch = fetchMock;

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

    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
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

    await recordUsage("test_tool", "test parameters", "test result");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchUrl = fetchMock.mock.calls[0][0];
    expect(fetchUrl).toContain("/mcp/usage");

    const fetchOptions = fetchMock.mock.calls[0][1];
    expect(fetchOptions.headers).toEqual({
      Accept: "application/json",
      "Cache-Control": "no-cache",
      "X-Shopify-Surface": "mcp",
      "X-Shopify-MCP-Version": mockInstrumentationData.packageVersion,
      "X-Shopify-Timestamp": mockInstrumentationData.timestamp,
      "Content-Type": "application/json",
    });

    const body = JSON.parse(fetchOptions.body);
    expect(body.tool).toBe("test_tool");
    expect(body.parameters).toBe("test parameters");
    expect(body.result).toBe("test result");
  });

  it("does not send usage data when instrumentation is disabled", async () => {
    vi.mocked(isInstrumentationDisabled).mockReturnValueOnce(true);

    await recordUsage("test_tool", "test parameters", "test result");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles fetch errors gracefully", async () => {
    const networkError = new Error("Network error");
    fetchMock.mockRejectedValueOnce(networkError);

    await recordUsage("test_tool", "test parameters", "test result");

    expect(vi.mocked(console.error)).toHaveBeenCalled();
  });

  it("handles successful usage recording", async () => {
    const mockUsageResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
    };
    fetchMock.mockResolvedValueOnce(mockUsageResponse);

    await recordUsage("test_tool", "test parameters", "test result");

    expect(fetchMock).toHaveBeenCalledTimes(1);

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

    fetchMock = global.fetch as any;

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
    const result = await searchShopifyDocs("product listings");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchUrl = fetchMock.mock.calls[0][0];
    expect(fetchUrl).toContain("/mcp/search");
    expect(fetchUrl).toContain("query=product+listings");

    expect(result.success).toBe(true);

    expect(result.formattedText).toContain("{\n");
    expect(result.formattedText).toContain('  "filename":');

    const parsedResponse = JSON.parse(result.formattedText);
    expect(parsedResponse).toEqual(sampleDocsResponse);
    expect(parsedResponse[0].filename).toBe(
      "api/admin/graphql/reference/products.md",
    );
    expect(parsedResponse[0].score).toBe(0.85);
  });

  test("handles HTTP error", async () => {
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

    const result = await searchShopifyDocs("product");

    expect(result.formattedText).toContain("HTTP error! status: 500");
    expect(result.formattedText).toContain("500");
  });

  test("handles fetch error", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const result = await searchShopifyDocs("product");

    expect(result.success).toBe(false);
    expect(result.formattedText).toContain("Network error");
  });

  test("handles non-JSON response gracefully", async () => {
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

    vi.mocked(console.warn).mockClear();

    const result = await searchShopifyDocs("product");

    expect(result.success).toBe(true);
    expect(result.formattedText).toBe("This is not valid JSON");

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

  it("includes polaris_unified parameter when POLARIS_UNIFIED env var is true", async () => {
    const originalEnv = process.env.POLARIS_UNIFIED;
    process.env.POLARIS_UNIFIED = "true";

    vi.resetModules();
    const { searchShopifyDocs: searchShopifyDocsWithEnv } = await import(
      "./shopifyDevRequests.js"
    );

    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ data: "test" }),
    };
    fetchMock.mockResolvedValueOnce(mockResponse);

    await searchShopifyDocsWithEnv("test query");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchUrl = fetchMock.mock.calls[0][0];
    expect(fetchUrl).toContain("polaris_unified=true");
    expect(fetchUrl).toContain("query=test+query");

    process.env.POLARIS_UNIFIED = originalEnv;
  });

  it("includes polaris_unified parameter when POLARIS_UNIFIED env var is 1", async () => {
    const originalEnv = process.env.POLARIS_UNIFIED;
    process.env.POLARIS_UNIFIED = "1";

    vi.resetModules();
    const { searchShopifyDocs: searchShopifyDocsWithEnv } = await import(
      "./shopifyDevRequests.js"
    );

    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ data: "test" }),
    };
    fetchMock.mockResolvedValueOnce(mockResponse);

    await searchShopifyDocsWithEnv("test query");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchUrl = fetchMock.mock.calls[0][0];
    expect(fetchUrl).toContain("polaris_unified=true");
    expect(fetchUrl).toContain("query=test+query");

    process.env.POLARIS_UNIFIED = originalEnv;
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
    const result = await fetchGettingStartedApis();
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

    expect(result).toEqual(sampleGettingStartedApisResponse);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("app-ui");
    expect(result[1].name).toBe("admin");
    expect(result[2].name).toBe("functions");
  });

  test("handles HTTP error gracefully", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const result = await fetchGettingStartedApis();

    expect(result).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("HTTP error status: 500"),
    );
  });

  test("handles network error gracefully", async () => {
    fetchMock.mockRejectedValue(new Error("Network failure"));

    const result = await fetchGettingStartedApis();

    expect(result).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Error fetching API information"),
    );
  });

  test("handles invalid JSON response gracefully", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "Invalid JSON",
    });

    const result = await fetchGettingStartedApis();

    expect(result).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Error parsing JSON response"),
    );
  });

  test("handles validation error gracefully", async () => {
    const invalidData = [{ wrongField: "value" }];
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify(invalidData),
    });

    const result = await fetchGettingStartedApis();

    expect(result).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Error parsing JSON response"),
    );
  });

  test("includes polaris_unified parameter when POLARIS_UNIFIED env var is true", async () => {
    const originalEnv = process.env.POLARIS_UNIFIED;
    process.env.POLARIS_UNIFIED = "true";

    vi.resetModules();
    const { fetchGettingStartedApis: fetchWithEnv } = await import(
      "./shopifyDevRequests.js"
    );

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify(sampleGettingStartedApisResponse),
    });

    await fetchWithEnv();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("polaris_unified=true"),
      expect.any(Object),
    );

    process.env.POLARIS_UNIFIED = originalEnv;
  });

  test("includes polaris_unified parameter when POLARIS_UNIFIED env var is 1", async () => {
    const originalEnv = process.env.POLARIS_UNIFIED;
    process.env.POLARIS_UNIFIED = "1";

    vi.resetModules();
    const { fetchGettingStartedApis: fetchWithEnv } = await import(
      "./shopifyDevRequests.js"
    );

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify(sampleGettingStartedApisResponse),
    });

    await fetchWithEnv();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("polaris_unified=true"),
      expect.any(Object),
    );

    process.env.POLARIS_UNIFIED = originalEnv;
  });
});
