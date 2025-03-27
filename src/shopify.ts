import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchShopifyAdminSchema, validateShopifyAdminQuery } from "./shopify-admin-schema.js";
import { execSync } from "child_process";

const SHOPIFY_BASE_URL = "https://shopify.dev";

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
      `[shopify-docs] Response status: ${response.status} ${response.statusText}`
    );

    // Convert headers to object for logging
    const headersObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    console.error(
      `[shopify-docs] Response headers: ${JSON.stringify(headersObj)}`
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
      }`
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
      `[shopify-docs] Error searching Shopify documentation: ${error}`
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
 * Executes a GraphQL query against the Shopify Admin API
 * @param path Path to the Shopify App
 * @param query The GraphQL query to execute
 * @param variables Optional variables for the query
 * @param apiVersion Optional API version
 * @returns The formatted response or error message
 */
export async function executeShopifyAdminQuery(
  path: string,
  query: string,
  variables: Record<string, any> = {},
  apiVersion: string = "2025-04"
) {
  try {
    // Prepare the input JSON for stdin (query and variables)
    const input = JSON.stringify({ query, variables });

    // Determine which CLI command to use
    let cliCommand = 'shopify'; // Default: use 'shopify' from PATH

    // Check for environment variable override
    const customCliCommand = process.env.SHOPIFY_CLI_COMMAND;
    if (customCliCommand) {
      // If environment variable is set, use it with node
      cliCommand = customCliCommand;
      console.error(`[shopify-admin-query] Using custom CLI path from env: ${customCliCommand}`);
    }

    // Construct the full command
    const command = `${cliCommand} app admin-graphql --path=${path} --api-version=${apiVersion}`;

    console.error(`[shopify-admin-query] Executing command: ${command}`);
    console.error(`[shopify-admin-query] Input JSON (truncated): ${input.substring(0, 100)}${input.length > 100 ? '...' : ''}`);

    // Execute the command with input piped to stdin
    const result = execSync(command, {
      input,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Parse the result to ensure it's valid JSON
    try {
      JSON.parse(result);
      return {
        success: true,
        responseText: result
      };
    } catch (err) {
      console.warn(`[shopify-admin-query] Result is not valid JSON: ${err}`);
      return {
        success: true,
        responseText: result // Return raw output even if not valid JSON
      };
    }
  } catch (error) {
    console.error(
      `[shopify-admin-query] Error executing GraphQL query: ${error}`
    );

    return {
      success: false,
      responseText: `Error executing Shopify Admin GraphQL query: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validates a GraphQL query against the Shopify Admin API schema
 * @param query The GraphQL query to validate
 * @param variables Optional variables for the query
 * @param apiVersion Optional API version
 * @returns The validation result or error message
 */
export async function validateShopifyAdminGraphQLQuery(
  query: string,
  variables: Record<string, any> = {},
  apiVersion: string = "2025-04"
) {
  try {
    console.error(`[shopify-admin-validate] Validating GraphQL query`);
    console.error(`[shopify-admin-validate] Query (truncated): ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`);

    const result = await validateShopifyAdminQuery(query, variables, apiVersion);

    if (result.success) {
      return {
        success: true,
        responseText: result.validationMessage || "Query is valid."
      };
    } else {
      return {
        success: false,
        responseText: result.validationMessage || "Query validation failed.",
        errors: result.errors
      };
    }
  } catch (error) {
    console.error(
      `[shopify-admin-validate] Error validating GraphQL query: ${error}`
    );

    return {
      success: false,
      responseText: `Error validating Shopify Admin GraphQL query: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function shopifyTools(server: McpServer) {
  server.tool(
    "introspect-admin-schema",
    `
    This tool introspects and returns the portion of the Shopify Admin API GraphQL schema relevant to the user prompt. Only use this for the Shopify Admin API, and not any other APIs like the Shopify Storefront API or the Shopify Functions API.

    It takes two arguments: query and filter. The query argument is the string search term to filter schema elements by name. The filter argument is an array of strings to filter results to show specific sections.
    `,
    {
      query: z
        .string()
        .describe(
          "Search term to filter schema elements by name. Only pass simple terms like 'product', 'discountProduct', etc."
        ),
      filter: z
        .array(z.enum(["all", "types", "queries", "mutations"]))
        .optional()
        .default(["all"])
        .describe(
          "Filter results to show specific sections. Can include 'types', 'queries', 'mutations', or 'all' (default)"
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
    }
  );

  server.tool(
    "execute-admin-query",
    `
    This tool executes a GraphQL query against the Shopify Admin API using the Shopify CLI.

    It takes the following arguments:
    - path: The path to the Shopify App being worked on
    - query: The GraphQL query string to execute
    - variables: Optional variables for the GraphQL query (default: {})
    - apiVersion: Optional API version (default: "2025-04")
    `,
    {
      path: z.string().describe("Required absolute path to the project root"),
      query: z.string().describe("The GraphQL query to execute against the Shopify Admin API"),
      variables: z.record(z.any()).optional().default({}).describe("Optional variables for the GraphQL query"),
      apiVersion: z.string().optional().default("2025-04").describe("Optional API version")
    },
    async ({ path, query, variables, apiVersion }, extra) => {
      const result = await executeShopifyAdminQuery(path, query, variables, apiVersion);

      return {
        content: [
          {
            type: "text" as const,
            text: result.responseText,
          },
        ],
      };
    }
  );

  server.tool(
    "search-dev-docs",
    `
    This tool will take in the user prompt, search shopify.dev, and return relevant documentation that will help answer the user's question.

    It takes one argument: prompt, which is the search query for Shopify documentation.
    `,
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
    }
  );

  server.tool(
    "validate-admin-query",
    `
    This tool validates a GraphQL query against the Shopify Admin API schema without executing it. Because the admin API is complex, it's recommended to check queries with this tool.

    It takes the following arguments:
    - query: The GraphQL query string to validate
    - variables: Optional variables for the GraphQL query (default: {})
    - apiVersion: Optional API version (default: "2025-04")
    `,
    {
      query: z.string().describe("The GraphQL query to validate against the Shopify Admin API schema"),
      variables: z.record(z.any()).optional().default({}).describe("Optional variables for the GraphQL query"),
      apiVersion: z.string().optional().default("2025-04").describe("Optional API version")
    },
    async ({ query, variables, apiVersion }, extra) => {
      const result = await validateShopifyAdminGraphQLQuery(query, variables, apiVersion);

      return {
        content: [
          {
            type: "text" as const,
            text: result.responseText,
          },
        ],
      };
    }
  );
}
