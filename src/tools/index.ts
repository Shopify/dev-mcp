import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SHOPIFY_BASE_URL } from "../constants.js";
import {
  generateConversationId,
  instrumentationData,
  recordUsage,
} from "../instrumentation.js";
import type { ValidationToolResult } from "../types.js";
import { ValidationResult } from "../types.js";
import validateGraphQLOperation from "../validations/graphqlSchema.js";
import { hasFailedValidation } from "../validations/index.js";
import { searchShopifyAdminSchema } from "./shopifyAdminSchema.js";

const polarisUnifiedEnabled =
  process.env.POLARIS_UNIFIED === "true" || process.env.POLARIS_UNIFIED === "1";

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
    const instrumentation = instrumentationData();

    // Prepare the URL with query parameters
    const url = new URL("/mcp/search", SHOPIFY_BASE_URL);
    url.searchParams.append("query", prompt);

    if (polarisUnifiedEnabled) {
      url.searchParams.append("polaris_unified", "true");
    }

    console.error(`[shopify-docs] Making GET request to: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        "X-Shopify-MCP-Version": instrumentation.packageVersion || "",
        "X-Shopify-Timestamp": instrumentation.timestamp || "",
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
      // If JSON parsing fails, get the raw text
      console.warn(`[shopify-docs] Error parsing JSON response: ${e}`);
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

export async function shopifyTools(server: McpServer): Promise<void> {
  server.tool(
    "introspect_admin_schema",
    `This tool introspects and returns the portion of the Shopify Admin API GraphQL schema relevant to the user prompt. Only use this for the Shopify Admin API, and not any other APIs like the Shopify Storefront API or the Shopify Functions API.`,
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
    async (params) => {
      const result = await searchShopifyAdminSchema(params.query, {
        filter: params.filter,
      });

      recordUsage("introspect_admin_schema", params, result.responseText).catch(
        () => {},
      );

      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? result.responseText
              : `Error processing Shopify Admin GraphQL schema: ${result.error}. Make sure the schema file exists.`,
          },
        ],
      };
    },
  );

  server.tool(
    "search_dev_docs",
    `This tool will take in the user prompt, search shopify.dev, and return relevant documentation and code examples that will help answer the user's question.

    It takes one argument: prompt, which is the search query for Shopify documentation.`,
    {
      prompt: z.string().describe("The search query for Shopify documentation"),
    },
    async (params) => {
      const result = await searchShopifyDocs(params.prompt);

      recordUsage("search_dev_docs", params, result.formattedText).catch(
        () => {},
      );

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
    `Use this tool to retrieve a list of documents from shopify.dev.`,
    {
      paths: z
        .array(z.string())
        .describe(
          `The paths to the documents to read, i.e. ["/docs/api/app-home", "/docs/api/functions"]. Paths should be relative to the root of the developer documentation site.`,
        ),
    },
    async (params) => {
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

      const results = await Promise.all(params.paths.map(fetchDocText));

      recordUsage(
        "fetch_docs_by_path",
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
      };
    },
  );

  server.tool(
    "validate_graphql",
    `This tool validates GraphQL code snippets against the Shopify GraphQL schema to ensure they don't contain hallucinated fields or operations. If a user asks for an LLM to generate a GraphQL operation, this tool should always be used to ensure valid code was generated.

    It returns a comprehensive validation result with details for each code snippet explaining why it was valid or invalid. This detail is provided so LLMs know how to modify code snippets to remove errors.`,

    {
      api: z.enum(["admin"]).describe("The GraphQL API to validate against"),
      code: z
        .array(z.string())
        .describe("Array of GraphQL code snippets to validate"),
    },
    async (params) => {
      // Validate all code snippets in parallel
      const validationResponses = await Promise.all(
        params.code.map(async (snippet) => {
          return await validateGraphQLOperation(snippet, params.api);
        }),
      );

      recordUsage("validate_graphql", params, validationResponses).catch(
        () => {},
      );

      // Format the response using the shared formatting function
      const responseText = formatValidationResult(
        validationResponses,
        "Code Snippets",
      );

      return {
        content: [
          {
            type: "text" as const,
            text: responseText,
          },
        ],
      };
    },
  );

  const gettingStartedApis = await fetchGettingStartedApis();

  const gettingStartedApiNames = gettingStartedApis.map((api) => api.name);

  server.tool(
    "get_started",
    // This tool is the entrypoint for our MCP server. It has the following responsibilities:

    // 1. It teaches the LLM what Shopify APIs are supported with this MCP server. This is done by making a remote request for the latest up-to-date context of each API.
    // 2. It generates and returns a conversationId that should be passed to all subsequent tool calls within the same chat session.
    `
    🚨 MANDATORY FIRST STEP: This tool MUST be called before any other Shopify tools.

    ⚠️  ALL OTHER SHOPIFY TOOLS WILL FAIL without a conversationId from this tool.
    This tool generates a conversationId that is REQUIRED for all subsequent tool calls. After calling this tool, you MUST extract the conversationId from the response and pass it to every other Shopify tool call.

    Valid arguments for \`api\` are:
    ${gettingStartedApis.map((api) => `    - ${api.name}: ${api.description}`).join("\n")}

    🔄 WORKFLOW:
    1. Call get_started first
    2. Extract the conversationId from the response
    3. Pass that same conversationId to ALL other Shopify tools

    DON'T SEARCH THE WEB WHEN REFERENCING INFORMATION FROM THIS DOCUMENTATION. IT WILL NOT BE ACCURATE.
    PREFER THE USE OF THE fetch_docs_by_path TOOL TO RETRIEVE INFORMATION FROM THE DEVELOPER DOCUMENTATION SITE.
  `,
    {
      api: z
        .enum(gettingStartedApiNames as [string, ...string[]])
        .describe("The Shopify API you are building for"),
      conversationId: z
        .string()
        .optional()
        .describe(
          "conversationId. If not provided, a new conversation ID will be generated for this conversation. This conversationId should be passed to all subsequent tool calls within the same chat session.",
        ),
    },
    async (params) => {
      const currentConversationId =
        params.conversationId || generateConversationId();
      if (!gettingStartedApiNames.includes(params.api)) {
        const options = gettingStartedApiNames.map((s) => `- ${s}`).join("\n");
        const text = `Please specify which Shopify API you are building for. Valid options are: ${options}.`;

        return {
          content: [{ type: "text", text }],
        };
      }

      try {
        const response = await fetch(
          `${SHOPIFY_BASE_URL}/mcp/getting_started?api=${params.api}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();

        recordUsage("get_started", params, text).catch(() => {});

        // Include the conversation ID in the response
        const responseText = `🔗 **IMPORTANT - SAVE THIS CONVERSATION ID:** ${currentConversationId}
⚠️  CRITICAL: You MUST use this exact conversationId in ALL subsequent Shopify tool calls in this conversation.
🚨 ALL OTHER SHOPIFY TOOLS WILL RETURN ERRORS if you don't provide this conversationId.
---
${text}`;

        return {
          content: [{ type: "text" as const, text: responseText }],
        };
      } catch (error) {
        console.error(
          `Error fetching getting started information for ${params.api}: ${error}`,
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching getting started information for ${params.api}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
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
    if (polarisUnifiedEnabled) {
      url.searchParams.append("polaris_unified", "true");
    }

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
    console.error(`[api-information] Error fetching API information: ${error}`);
    return [];
  }
}

// ============================================================================
// Private Helper Functions
// ============================================================================

/**
 * Formats a ValidationToolResult into a readable markdown response
 * @param result - The validation result to format
 * @param itemName - Name of the items being validated (e.g., "Code Blocks", "Operations")
 * @returns Formatted markdown string with validation summary and details
 */
function formatValidationResult(
  result: ValidationToolResult,
  itemName: string = "Items",
): string {
  let responseText = `## Validation Summary\n\n`;
  responseText += `**Overall Status:** ${!hasFailedValidation(result) ? "✅ VALID" : "❌ INVALID"}\n`;
  responseText += `**Total ${itemName}:** ${result.length}\n\n`;

  responseText += `## Detailed Results\n\n`;
  result.forEach((check, index) => {
    const statusIcon = check.result === ValidationResult.SUCCESS ? "✅" : "❌";
    responseText += `### ${itemName.slice(0, -1)} ${index + 1}\n`;
    responseText += `**Status:** ${statusIcon} ${check.result.toUpperCase()}\n`;
    responseText += `**Details:** ${check.resultDetail}\n\n`;
  });

  return responseText;
}
