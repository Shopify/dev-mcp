import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchShopifyAdminSchema } from "./shopify-admin-schema.js";

const SHOPIFY_BASE_URL = process.env.DEV
  ? "https://shopify-dev.myshopify.io/"
  : "https://shopify.dev/";

const GettingStartedAPISchema = z.object({
  name: z.string(),
  description: z.string(),
});

type GettingStartedAPI = z.infer<typeof GettingStartedAPISchema>;

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

/**
 * Validates GraphQL code against a specified Shopify API surface
 * @param api The Shopify API surface to validate against (admin)
 * @param code The GraphQL code to validate
 * @returns Validation results including whether the code is valid and any errors
 */
export async function validateShopifyGraphQL(api: string, code: string) {
  try {
    // Prepare the URL with query parameters
    const url = new URL("/mcp/validate_graphql", SHOPIFY_BASE_URL);
    url.searchParams.append("api", api);
    url.searchParams.append("code", code);

    console.error(`[validate-graphql] Making GET request to: ${url.toString()}`);

    // Make the GET request with the GraphQL code as query parameter
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
        "X-Shopify-Surface": "mcp",
      },
    });

    console.error(
      `[validate-graphql] Response status: ${response.status} ${response.statusText}`,
    );

    // Convert headers to object for logging
    const headersObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    console.error(
      `[validate-graphql] Response headers: ${JSON.stringify(headersObj)}`,
    );

    if (!response.ok) {
      console.error(`[validate-graphql] HTTP error status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Read and process the response
    const responseText = await response.text();
    console.error(
      `[validate-graphql] Response text (truncated): ${
        responseText.substring(0, 200) +
        (responseText.length > 200 ? "..." : "")
      }`,
    );

    // Parse and format the JSON for human readability
    try {
      const jsonData = JSON.parse(responseText);
      const isValid = jsonData.is_valid === true;

      let formattedResponse = `## GraphQL Validation Results\n\n`;
      formattedResponse += `**Valid:** ${isValid ? "✅ Yes" : "❌ No"}\n\n`;

      if (!isValid && jsonData.errors && jsonData.errors.length > 0) {
        formattedResponse += `**Errors:**\n\n`;
        jsonData.errors.forEach((error: any, index: number) => {
          formattedResponse += `${index + 1}. ${error.message}`;
          if (error.locations && error.locations.length > 0) {
            const location = error.locations[0];
            formattedResponse += ` (Line ${location.line}, Column ${location.column})`;
          }
          formattedResponse += `\n`;
        });
      }

      return {
        success: true,
        isValid,
        formattedText: formattedResponse,
        rawResponse: jsonData,
      };
    } catch (e) {
      console.warn(`[validate-graphql] Error parsing JSON response: ${e}`);
      // If parsing fails, return the raw text
      return {
        success: true,
        isValid: false,
        formattedText: `Unable to parse validation response. Raw response: ${responseText}`,
        rawResponse: responseText,
      };
    }
  } catch (error) {
    console.error(
      `[validate-graphql] Error validating GraphQL: ${error}`,
    );

    return {
      success: false,
      isValid: false,
      formattedText: `Error validating GraphQL: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function shopifyTools(server: McpServer): Promise<void> {
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
    async ({ query, filter }) => {
      const result = await searchShopifyAdminSchema(query, { filter });

      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? result.responseText
              : `Error processing Shopify Admin GraphQL schema: ${result.error}. Make sure the schema file exists.`
          },
        ],
      };
    },
  );

  server.tool(
    "validate_graphql",
    `This tool validates GraphQL code against a specified Shopify API surface and returns validation results including any errors.
    ALWAYS MAKE SURE THAT THE GRAPHQL CODE YOU GENERATE IS VALID WITH THIS TOOL.

    It takes two arguments:
    - api: The Shopify API surface to validate against ('admin')
    - code: The GraphQL code to validate`,
    {
      api: z
        .enum(["admin"])
        .describe("The Shopify API surface to validate against ('admin')"),
      code: z
        .string()
        .describe("The GraphQL code to validate"),
    },
    async ({ api, code }) => {
      const result = await validateShopifyGraphQL(api, code);

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

  server.tool(
    "search_dev_docs",
    `This tool will take in the user prompt, search shopify.dev, and return relevant documentation that will help answer the user's question.

    It takes one argument: prompt, which is the search query for Shopify documentation.`,
    {
      prompt: z.string().describe("The search query for Shopify documentation"),
    },
    async ({ prompt }) => {
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

  server.tool(
    "fetch_docs_by_path",
    `Use this tool to retrieve a list of documents from shopify.dev.

    Args:
    paths: The paths to the documents to read, i.e. ["/docs/api/app-home", "/docs/api/functions"].
    Paths should be relative to the root of the developer documentation site.`,
    {
      paths: z
        .array(z.string())
        .describe("The paths to the documents to read"),
    },
    async ({ paths }) => {
      type DocResult = {
        text: string;
        path: string;
        success: boolean;
      };

      async function fetchDocText(path: string): Promise<DocResult> {
        try {
          const appendedPath = path.endsWith(".txt") ? path : `${path}.txt`;
          const url = new URL(appendedPath, SHOPIFY_BASE_URL);
          const response = await fetch(url.toString());

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const text = await response.text();
          return { text: `## ${path}\n\n${text}\n\n`, path, success: true };
        } catch (error) {
          console.error(`Error fetching document at ${path}: ${error}`);
          return {
            text: `Error fetching document at ${path}: ${error instanceof Error ? error.message : String(error)}`,
            path,
            success: false,
          };
        }
      }

      const results = await Promise.all(paths.map(fetchDocText));

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

  const gettingStartedApis = await fetchGettingStartedApis();
  const filteredApis = !process.env.POLARIS_UNIFIED
    ? gettingStartedApis.filter((api) => api.name !== "app-ui")
    : gettingStartedApis;

  const gettingStartedApiNames = filteredApis.map((api) => api.name);

  server.tool(
    "get_started",
    `
    Use this tool first whenever you're interacting with any of these Shopify APIs.

    Valid arguments for \`api\` are:
${filteredApis.map((api) => `    - ${api.name}: ${api.description}`).join('\n')}

    1. Look at the getting started guide for the selected API.
    2. Use the fetch_docs_by_path tool to read additional docs for the API.

    DON'T SEARCH THE WEB WHEN REFERENCING INFORMATION FROM THIS DOCUMENTATION. IT WILL NOT BE ACCURATE.
    ONLY USE THE fetch_docs_by_path TOOL TO RETRIEVE INFORMATION FROM THE DEVELOPER DOCUMENTATION SITE.
  `,
    {
      api: z
        .enum(gettingStartedApiNames as [string, ...string[]])
        .describe("The Shopify API you are building for"),
    },
    async ({ api }) => {
      if (!gettingStartedApiNames.includes(api)) {
        const options = gettingStartedApiNames.map(s => `- ${s}`).join("\n");
        const text = `Please specify which Shopify API you are building for. Valid options are: ${options}.`;

        return {
          content: [{ type: "text" as const, text }],
        };
      }

      try {
        const response = await fetch(
          `${SHOPIFY_BASE_URL}/mcp/getting_started?api=${api}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error) {
        console.error(`Error fetching getting started information for ${api}: ${error}`);
        return {
          content: [{
            type: "text" as const,
            text: `Error fetching getting started information for ${api}: ${error instanceof Error ? error.message : String(error)}`
          }],
        };
      }
    },
  );
}

/**
 * Fetches and validates information about available APIs from the getting_started_apis endpoint
 * @returns An array of validated API information objects with name and description properties, or an empty array on error
 */
async function fetchGettingStartedApis(): Promise<GettingStartedAPI[]> {
  try {
    const url = new URL("/mcp/getting_started_apis", SHOPIFY_BASE_URL);

    console.error(`[api-information] Making GET request to: ${url.toString()}`);

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
      `[api-information] Response status: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      console.error(`[api-information] HTTP error status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Read and process the response
    const responseText = await response.text();
    console.error(
      `[api-information] Response text (truncated): ${
        responseText.substring(0, 200) +
        (responseText.length > 200 ? "..." : "")
      }`,
    );

    try {
      const jsonData = JSON.parse(responseText);
      // Parse and validate with Zod schema
      const validatedData = z.array(GettingStartedAPISchema).parse(jsonData);
      return validatedData;
    } catch (e) {
      console.warn(`[api-information] Error parsing JSON response: ${e}`);
      return [];
    }
  } catch (error) {
    console.error(
      `[api-information] Error fetching API information: ${error}`,
    );
    return [];
  }
}

