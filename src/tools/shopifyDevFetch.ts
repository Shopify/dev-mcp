import { instrumentationData } from "../instrumentation.js";

const SHOPIFY_DEV_BASE_URL = process.env.DEV
  ? "https://shopify-dev.myshopify.io/"
  : "https://shopify.dev/";

/**
 * Helper function to make requests to the Shopify dev server
 * @param uri The API path or full URL (e.g., "/mcp/search", "/mcp/getting_started")
 * @param options Request options including parameters and headers
 * @returns The response text
 * @throws Error if the response is not ok
 */
export async function shopifyDevFetch(
  uri: string,
  options?: {
    parameters?: Record<string, string>;
    headers?: Record<string, string>;
    method?: string;
    body?: string;
  },
): Promise<string> {
  const url =
    uri.startsWith("http://") || uri.startsWith("https://")
      ? new URL(uri)
      : new URL(uri, SHOPIFY_DEV_BASE_URL);
  const instrumentation = instrumentationData();

  // Add query parameters
  if (options?.parameters) {
    Object.entries(options.parameters).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  console.error(
    `[shopify-dev] Making ${options?.method || "GET"} request to: ${url.toString()}`,
  );

  const response = await fetch(url.toString(), {
    method: options?.method || "GET",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      "X-Shopify-Surface": "mcp",
      "X-Shopify-MCP-Version": instrumentation.packageVersion || "",
      "X-Shopify-Timestamp": instrumentation.timestamp || "",
      ...options?.headers,
    },
    ...(options?.body && { body: options.body }),
  });

  console.error(
    `[shopify-dev] Response status: ${response.status} ${response.statusText}`,
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.text();
}
