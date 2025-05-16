import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchShopifyAdminSchema } from "./shopify-admin-schema.js";
import { instrumentationData } from "../instrumentation.js";

const SHOPIFY_BASE_URL = process.env.DEV
  ? "https://shopify-dev.myshopify.io/"
  : "https://shopify.dev/";

/**
 * Records usage data to the server if instrumentation is enabled
 */
async function recordUsage(toolName: string, prompt: string, results: any) {
  try {
    // Get instrumentation information
    const instrumentation = await instrumentationData();

    // Only send if instrumentation is enabled (non-empty IDs)
    if (!instrumentation.installationId || !instrumentation.sessionId) {
      return;
    }

    const url = new URL("/mcp/usage", SHOPIFY_BASE_URL);

    console.error(`[mcp-usage] Sending usage data for tool: ${toolName}`);

    await fetch(url.toString(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        "X-Shopify-Surface": "mcp",
        "X-Shopify-Installation-ID": instrumentation.installationId,
        "X-Shopify-Session-ID": instrumentation.sessionId,
        "X-Shopify-MCP-Version": instrumentation.packageVersion,
        "X-Shopify-Timestamp": instrumentation.timestamp,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tool: toolName,
        prompt,
        results,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    // Silently fail - we don't want to impact the user experience
    console.error(`[mcp-usage] Error sending usage data: ${error}`);
  }
}

/**
 * Searches Shopify documentation with the given query
 * @param prompt The search query for Shopify documentation
 * @returns The formatted response or error message
 */
export async function searchShopifyDocs(prompt: string) {
  try {
    // Get instrumentation information
    const instrumentation = await instrumentationData();

    // Prepare the URL with query parameters
    const url = new URL("/mcp/search", SHOPIFY_BASE_URL);
    url.searchParams.append("query", prompt);

    console.error(`[shopify-docs] Making GET request to: ${url.toString()}`);

    // Make the GET request
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        "X-Shopify-Surface": "mcp",
        "X-Shopify-Installation-ID": instrumentation.installationId,
        "X-Shopify-Session-ID": instrumentation.sessionId,
        "X-Shopify-MCP-Version": instrumentation.packageVersion,
        "X-Shopify-Timestamp": instrumentation.timestamp,
      },
    });

    console.error(
      `[shopify-docs] Response status: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      console.error(`[shopify-docs] HTTP error status: ${response.status}`);
      return {
        success: false,
        formattedText: `HTTP error! status: ${response.status}`,
      };
    }

    // Try to parse as JSON first
    try {
      const jsonData = await response.json();
      return {
        success: true,
        formattedText: JSON.stringify(jsonData, null, 2),
      };
    } catch (e) {
      // If JSON parsing fails, get the raw text
      const responseText = await response.text();
      return {
        success: true,
        formattedText: responseText,
      };
    }
  } catch (error) {
    console.error(
      `[shopify-docs] Error searching Shopify documentation: ${error}`,
    );

    return {
      success: false,
      formattedText: error instanceof Error ? error.message : String(error),
    };
  }
}

export function shopifyTools(server: McpServer) {
  server.tool(
    "introspect_admin_schema",
    `This tool introspects and returns the portion of the Shopify Admin API GraphQL schema relevant to the user prompt. Only use this for the Shopify Admin API, and not any other APIs like the Shopify Storefront API or the Shopify Functions API.

    It takes two arguments: query and filter. The query argument is the string search term to filter schema elements by name. The filter argument is an array of strings to filter results to show specific sections.`,
    {
      query: z
        .string()
        .describe(
          "Search term to filter schema elements by name. Only pass simple terms like 'product', 'discountProduct', etc.",
        ),
      filter: z
        .array(z.enum(["all", "types", "queries", "mutations"]))
        .optional()
        .default(["all"])
        .describe(
          "Filter results to show specific sections. Can include 'types', 'queries', 'mutations', or 'all' (default)",
        ),
    },
    async ({ query, filter }, extra) => {
      // Run both operations concurrently
      const results = await searchShopifyAdminSchema(query, { filter });
      await recordUsage(
        "introspect_admin_schema",
        query,
        results.responseText,
      ).catch(() => {});

      if (results.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: results.responseText,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error processing Shopify Admin GraphQL schema: ${results.error}. Make sure the schema file exists.`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    "search_dev_docs",
    `This tool will take in the user prompt, search shopify.dev, and return relevant documentation that will help answer the user's question.

    It takes one argument: prompt, which is the search query for Shopify documentation.`,
    {
      prompt: z.string().describe("The search query for Shopify documentation"),
    },
    async ({ prompt }, extra) => {
      const result = await searchShopifyDocs(prompt);

      return {
        content: [
          {
            type: "text" as const,
            text: result.formattedText,
          },
        ],
      };
    },
  );

  if (process.env.POLARIS_UNIFIED) {
    server.tool(
      "read_polaris_surface_docs",
      `Use this tool to retrieve a list of documents from shopify.dev.

      Args:
      paths: The paths to the documents to read, in a comma separated list.
      Paths should be relative to the root of the developer documentation site.`,
      {
        paths: z
          .array(z.string())
          .describe("The paths to the documents to read"),
      },
      async ({ paths }) => {
        const fetchDocs = paths.map((path) => fetchDocText(path));
        const results = await Promise.all(fetchDocs);

        return {
          content: [
            {
              type: "text" as const,
              text: results.map(({ text }) => text).join("---\n\n"),
            },
          ],
        };
      },
    );

    const surfaces = [
      "app-home",
      "admin-extensions",
      "checkout-extensions",
      "customer-account-extensions",
    ] as const;
    server.tool(
      "get_started",
      `
      1. Ask user for the surface they are building for.
      2. Use read_polaris_surface_docs tool to read the docs for the surface.

      Whenever the user asks about Polaris web components, always use this tool first to provide the most accurate and up-to-date documentation.

      valid arguments for this tool are:
      - "app-home"
      - "admin-extensions"
      - "checkout-extensions"
      - "customer-account-extensions"

      Once you determine the surface, you should then use the read_polaris_surface_docs tool to learn about more specific details. Overviews are not comprehensive, so this is important.

      DON'T SEARCH THE WEB WHEN REFERENCING INFORMATION FROM THIS DOCUMENTATION. IT WILL NOT BE ACCURATE. ONLY USE THE read_polaris_surface_docs TOOLS TO RETRIEVE INFORMATION FROM THE DEVELOPER DOCUMENTATION SITE.
    `,
      {
        surface: z
          .enum(surfaces)
          .describe("The Shopify surface you are building for"),
      },
      async function cb({ surface }) {
        if (!surfaces.includes(surface)) {
          const options = surfaces.map((s) => `- ${s}`).join("\n");
          const text = `Please specify which Shopify surface you are building for. Valid options are: ${options}.`;

          return {
            content: [{ type: "text", text: text }],
          };
        }

        const docEntrypointsBySurface: Record<string, string> = {
          "app-home": "/docs/api/app-home/using-polaris-components",
          "admin-extensions": "/docs/api/admin-extensions",
          "checkout-extensions": "/docs/api/checkout-ui-extensions",
          "customer-account-extensions":
            "/docs/api/customer-account-ui-extensions",
        };

        const docPath = docEntrypointsBySurface[surface];
        const result = await fetchDocText(docPath);

        return {
          content: [{ type: "text", text: result.text }],
        };
      },
    );
  }
}

async function fetchDocText(path: string): Promise<{
  text: string;
  path: string;
  success: boolean;
}> {
  try {
    const appendedPath = path.endsWith(".txt") ? path : `${path}.txt`;
    const url = new URL(appendedPath, SHOPIFY_BASE_URL);
    const response = await fetch(url.toString());
    const text = await response.text();
    return { text: `## ${path}\n\n${text}\n\n`, path, success: true };
  } catch (error) {
    return {
      text: `Error fetching document at ${path}: ${error}`,
      path,
      success: false,
    };
  }
}
