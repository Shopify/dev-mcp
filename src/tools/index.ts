import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchShopifyAdminSchema } from "./shopify-admin-schema.js";
import { readdirSync, readFileSync } from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const SHOPIFY_BASE_URL = process.env.DEV
  ? "https://shopify-dev.myshopify.io/"
  : "https://shopify.dev/";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Searches Shopify documentation with the given query
 * @param prompt The search query for Shopify documentation
 * @returns The formatted response or error message
 */
export async function searchShopifyDocs(prompt: string) {
  try {
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
      },
    });

    console.error(
      `[shopify-docs] Response status: ${response.status} ${response.statusText}`,
    );

    // Convert headers to object for logging
    const headersObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    console.error(
      `[shopify-docs] Response headers: ${JSON.stringify(headersObj)}`,
    );

    if (!response.ok) {
      console.error(`[shopify-docs] HTTP error status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Read and process the response
    const responseText = await response.text();
    console.error(
      `[shopify-docs] Response text (truncated): ${
        responseText.substring(0, 200) +
        (responseText.length > 200 ? "..." : "")
      }`,
    );

    // Parse and format the JSON for human readability
    try {
      const jsonData = JSON.parse(responseText);
      const formattedJson = JSON.stringify(jsonData, null, 2);

      return {
        success: true,
        formattedText: formattedJson,
      };
    } catch (e) {
      console.warn(`[shopify-docs] Error parsing JSON response: ${e}`);
      // If parsing fails, return the raw text
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
      formattedText: `Error searching Shopify documentation: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error: error instanceof Error ? error.message : String(error),
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
      const result = await searchShopifyAdminSchema(query, { filter });

      if (result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: result.responseText,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error processing Shopify Admin GraphQL schema: ${result.error}. Make sure the schema file exists.`,
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

  // if (process.env.POLARIS_UNIFIED) {
  //   server.tool(
  //     "read_polaris_surface_docs",
  //     `Use this tool to retrieve a list of documents from shopify.dev.

  //     Args:
  //     paths: The paths to the documents to read, in a comma separated list.
  //     Paths should be relative to the root of the developer documentation site.`,
  //     {
  //       paths: z
  //         .array(z.string())
  //         .describe("The paths to the documents to read"),
  //     },
  //     async ({ paths }) => {
  //       async function fetchDocText(path: string): Promise<{
  //         text: string;
  //         path: string;
  //         success: boolean;
  //       }> {
  //         try {
  //           const appendedPath = path.endsWith(".txt") ? path : `${path}.txt`;
  //           const url = new URL(appendedPath, SHOPIFY_BASE_URL);
  //           const response = await fetch(url.toString());
  //           const text = await response.text();
  //           return { text: `## ${path}\n\n${text}\n\n`, path, success: true };
  //         } catch (error) {
  //           return {
  //             text: `Error fetching document at ${path}: ${error}`,
  //             path,
  //             success: false,
  //           };
  //         }
  //       }

  //       const fetchDocs = paths.map((path) => fetchDocText(path));
  //       const results = await Promise.all(fetchDocs);

  //       return {
  //         content: [
  //           {
  //             type: "text" as const,
  //             text: results.map(({ text }) => text).join("---\n\n"),
  //           },
  //         ],
  //       };
  //     },
  //   );

  //   const surfaces = [
  //     "app-home",
  //     "admin-extensions",
  //     "checkout-extensions",
  //     "customer-account-extensions",
  //   ] as const;
  //   server.tool(
  //     "get_started",
  //     `
  //     1. Ask user for the surface they are building for.
  //     2. Use read_polaris_surface_docs tool to read the docs for the surface.

  //     Whenever the user asks about Polaris web components, always use this tool first to provide the most accurate and up-to-date documentation.

  //     valid arguments for this tool are:
  //     - "app-home"
  //     - "admin-extensions"
  //     - "checkout-extensions"
  //     - "customer-account-extensions"

  //     Once you determine the surface, you should then use the read_polaris_surface_docs tool to learn about more specific details. Overviews are not comprehensive, so this is important.

  //     DON'T SEARCH THE WEB WHEN REFERENCING INFORMATION FROM THIS DOCUMENTATION. IT WILL NOT BE ACCURATE. ONLY USE THE read_polaris_surface_docs TOOLS TO RETRIEVE INFORMATION FROM THE DEVELOPER DOCUMENTATION SITE.
  //   `,
  //     {
  //       surface: z
  //         .enum(surfaces)
  //         .describe("The Shopify surface you are building for"),
  //     },
  //     async function cb({ surface }) {
  //       if (!surfaces.includes(surface)) {
  //         const options = surfaces.map((s) => `- ${s}`).join("\n");
  //         const text = `Please specify which Shopify surface you are building for. Valid options are: ${options}.`;

  //         return {
  //           content: [{ type: "text" as const, text }],
  //         };
  //       }

  //       const docEntrypointsBySurface: Record<string, string> = {
  //         "app-home": "/docs/api/app-home/using-polaris-components",
  //         "admin-extensions": "/docs/api/admin-extensions",
  //         "checkout-extensions": "/docs/api/checkout-ui-extensions",
  //         "customer-account-extensions":
  //           "/docs/api/customer-account-ui-extensions",
  //       };

  //       const docPath = docEntrypointsBySurface[surface];
  //       const text = await fetchDocText(docPath);

  //       return {
  //         content: [{ type: "text" as const, text }],
  //       };
  //     },
  //   );
  // }

  server.tool(
    "list_hydrogen_feature_guides",
    "ALWAYS use this tool when implementing any Hydrogen storefront features or functionality. This tool is your FIRST step for ANY feature request (adding, building, implementing, creating, modifying) related to Hydrogen storefronts. Never start coding or planning without first consulting these guides. This tool provides official implementation patterns, best practices, and code examples for all Hydrogen features including cart, subscriptions, collections, localization, search, checkout, and more. Failing to use this tool first may result in non-standard implementations that don't follow Shopify best practices",
    {},
    () => {
      return {
        content: [
          {
            type: "text",
            text: listRecipes().join(", "),
          },
        ],
      };
    }
  );
  server.tool(
    "get_hydrogen_feature_guide_content",
    "Returns the content of a Hydrogen feature guide, including steps, code, and (if present) diffs/patches.",
    {
      guide: z.string().describe("The name of the guide to get content for"),
    },
    ({ guide }) => {
      const p = path.join(
        __dirname,
        "../..",
        "data",
        "recipes",
        guide,
        "recipe.md"
      );
      return {
        content: [
          {
            type: "text",
            text: readFileSync(p, "utf8"),
          },
        ],
      };
    }
  );
} 

function listRecipes(): string[] {
  return readdirSync(path.join(__dirname, "../..", "data", "recipes"));
}
