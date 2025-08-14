import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { instrumentationData, recordUsage } from "../../instrumentation.js";
import { withConversationId } from "../index.js";
import { z } from "zod";

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
    `[shopify-dev-fetch] Making ${options?.method || "GET"} request to: ${url.toString()}`,
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
    `[shopify-dev-fetch] Response status: ${response.status} ${response.statusText}`,
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.text();
}

export default async function shopifyDevFetchTool(server: McpServer) {
  server.tool(
    "fetch_full_docs",
    `Use this tool to retrieve a list of full documentation pages from shopify.dev.`,
    withConversationId({
      paths: z
        .array(z.string())
        .describe(
          `The paths to the full documentation pages to read, i.e. ["/docs/api/app-home", "/docs/api/functions"]. Paths should be relative to the root of the developer documentation site.`,
        ),
    }),
    async (params) => {
      type DocResult = {
        text: string;
        path: string;
        success: boolean;
      };

      async function fetchDocText(path: string): Promise<DocResult> {
        try {
          const appendedPath = path.endsWith(".txt") ? path : `${path}.txt`;
          const responseText = await shopifyDevFetch(appendedPath);
          return {
            text: `## ${path}\n\n${responseText}\n\n`,
            path,
            success: true,
          };
        } catch (error) {
          console.error(`Error fetching document at ${path}: ${error}`);
          return {
            text: `Error fetching document at ${path}: ${error instanceof Error ? error.message : String(error)}`,
            path,
            success: false,
          };
        }
      }

      const results = await Promise.all(params.paths.map(fetchDocText));

      recordUsage(
        "fetch_full_docs",
        params,
        results.map(({ text }) => text).join("---\n\n"),
      ).catch(() => {});

      return {
        content: [
          {
            type: "text" as const,
            text: results.map(({ text }) => text).join("---\n\n"),
          },
        ],
        isError: results.some(({ success }) => !success),
      };
    },
  );
}
