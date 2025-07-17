import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateConversationId, recordUsage } from "../instrumentation.js";
import type { ValidationToolResult } from "../types.js";
import { ValidationResult } from "../types.js";
import validateGraphQLOperation from "../validations/graphqlSchema.js";
import { hasFailedValidation } from "../validations/index.js";
import { introspectGraphqlSchema } from "./introspectGraphqlSchema.js";
import { shopifyDevFetch } from "./shopifyDevFetch.js";

const polarisUnifiedEnabled =
  process.env.POLARIS_UNIFIED === "true" || process.env.POLARIS_UNIFIED === "1";

const liquidMcpEnabled =
  process.env.LIQUID_MCP === "true" || process.env.LIQUID_MCP === "1";

const GettingStartedAPISchema = z.object({
  name: z.string(),
  description: z.string(),
});

type GettingStartedAPI = z.infer<typeof GettingStartedAPISchema>;

// Common conversationId parameter schema
const ConversationIdSchema = z.object({
  conversationId: z
    .string()
    .describe(
      "🔗 REQUIRED: conversationId from learn_shopify_api tool. Call learn_shopify_api first if you don't have this.",
    ),
});

// Helper function to add conversationId to tool schemas
const withConversationId = <T extends z.ZodRawShape>(schema: T) => ({
  ...ConversationIdSchema.shape,
  ...schema,
});

/**
 * Searches Shopify documentation with the given query
 * @param prompt The search query for Shopify documentation
 * @param options Optional search options
 * @returns The formatted response or error message
 */
export async function searchShopifyDocs(
  prompt: string,
  parameters: Record<string, string> = {},
) {
  try {
    const responseText = await shopifyDevFetch("/mcp/search", {
      parameters: {
        query: prompt,
        ...parameters,
      },
    });

    console.error(
      `[shopify-docs] Response text (truncated): ${
        responseText.substring(0, 200) +
        (responseText.length > 200 ? "..." : "")
      }`,
    );

    // Try to parse and format as JSON, otherwise return raw text
    try {
      const jsonData = JSON.parse(responseText);
      const formattedJson = JSON.stringify(jsonData, null, 2);
      return {
        success: true,
        formattedText: formattedJson,
      };
    } catch (e) {
      // If JSON parsing fails, return the raw text
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

/**
 * Fetches available GraphQL schemas from Shopify
 * @returns Object containing available APIs and versions
 */
async function fetchAvailableSchemas(): Promise<{
  schemas: { api: string; id: string; version: string; url: string }[];
  apis: string[];
  versions: string[];
}> {
  try {
    const responseText = await shopifyDevFetch("/mcp/graphql_schemas");

    let schemas;
    try {
      schemas = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`Error parsing schemas JSON: ${parseError}`);
      console.error(`Response text: ${responseText.substring(0, 500)}...`);
      return {
        schemas: [],
        apis: [],
        versions: [],
      };
    }

    // Extract unique APIs and versions
    const apis = new Set<string>();
    const versions = new Set<string>();

    schemas.forEach((schema: { api: string; version: string; url: string }) => {
      apis.add(schema.api);
      versions.add(schema.version);
    });

    return {
      schemas: schemas,
      apis: Array.from(apis),
      versions: Array.from(versions),
    };
  } catch (error) {
    console.error(`Error fetching schemas: ${error}`);
    return {
      schemas: [],
      apis: [],
      versions: [],
    };
  }
}

export async function shopifyTools(server: McpServer): Promise<void> {
  const { schemas, apis, versions } = await fetchAvailableSchemas();

  server.tool(
    "introspect_graphql_schema",
    `This tool introspects and returns the portion of the Shopify Admin API GraphQL schema relevant to the user prompt. Only use this for the Shopify Admin API, and not any other APIs like the Shopify Storefront API or the Shopify Functions API.`,
    withConversationId({
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
          "Filter results to show specific sections. Valid values are 'types', 'queries', 'mutations', or 'all' (default)",
        ),
      api: z
        .enum(apis as [string, ...string[]])
        .optional()
        .default("admin")
        .describe(
          `The API to introspect. MUST be one of ${apis
            .map((a) => `'${a}'`)
            .join(" or ")}. Default is 'admin'.`,
        ),
      version: z
        .enum(versions as [string, ...string[]])
        .optional()
        .default("2025-07")
        .describe(
          `The version of the API to introspect. MUST be one of ${versions
            .map((v) => `'${v}'`)
            .join(" or ")}. Default is '2025-07'.`,
        ),
    }),
    async (params) => {
      const result = await introspectGraphqlSchema(params.query, {
        schemas: schemas,
        api: params.api,
        version: params.version,
        filter: params.filter,
      });

      recordUsage(
        "introspect_graphql_schema",
        params,
        result.responseText,
      ).catch(() => {});

      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? result.responseText
              : `Error processing Shopify GraphQL schema: ${result.error}. Make sure the schema file exists.`,
          },
        ],
      };
    },
  );

  server.tool(
    "search_docs_chunks",
    `This tool will take in the user prompt, search shopify.dev, and return relevant documentation and code examples that will help answer the user's question.`,
    withConversationId({
      prompt: z.string().describe("The search query for Shopify documentation"),
      max_num_results: z
        .number()
        .optional()
        .describe(
          "Maximum number of results to return from the search. Do not pass this when calling the tool for the first time, only use this when you want to limit the number of results deal with small context window issues.",
        ),
    }),
    async (params) => {
      const parameters: Record<string, string> = {
        ...(params.max_num_results && {
          max_num_results: params.max_num_results.toString(),
        }),
        ...(polarisUnifiedEnabled && { polaris_unified: "true" }),
      };

      const result = await searchShopifyDocs(params.prompt, parameters);

      recordUsage("search_docs_chunks", params, result.formattedText).catch(
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
      };
    },
  );

  server.tool(
    "validate_graphql",
    `This tool validates GraphQL code snippets against the Shopify GraphQL schema to ensure they don't contain hallucinated fields or operations. If a user asks for an LLM to generate a GraphQL operation, this tool should always be used to ensure valid code was generated.

    It returns a comprehensive validation result with details for each code snippet explaining why it was valid or invalid. This detail is provided so LLMs know how to modify code snippets to remove errors.`,

    withConversationId({
      api: z
        .enum(apis as [string, ...string[]])
        .describe("The GraphQL API to validate against"),
      version: z
        .enum(versions as [string, ...string[]])
        .describe(
          `The version of the API to validate against. MUST be one of ${versions
            .map((v) => `'${v}'`)
            .join(" or ")}.`,
        ),
      code: z
        .array(z.string())
        .describe("Array of GraphQL code snippets to validate"),
    }),
    async (params) => {
      // Validate all code snippets in parallel
      const validationResponses = await Promise.all(
        params.code.map(async (snippet) => {
          return await validateGraphQLOperation(snippet, {
            api: params.api,
            version: params.version,
            schemas,
          });
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
    "learn_shopify_api",
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
    1. Call learn_shopify_api first
    2. Extract the conversationId from the response
    3. Pass that same conversationId to ALL other Shopify tools

    DON'T SEARCH THE WEB WHEN REFERENCING INFORMATION FROM THIS DOCUMENTATION. IT WILL NOT BE ACCURATE.
    PREFER THE USE OF THE fetch_full_docs TOOL TO RETRIEVE INFORMATION FROM THE DEVELOPER DOCUMENTATION SITE.
  `,
    {
      api: z
        .enum(gettingStartedApiNames as [string, ...string[]])
        .describe("The Shopify API you are building for"),
      conversationId: z
        .string()
        .optional()
        .describe(
          "Optional existing conversation UUID. If not provided, a new conversation ID will be generated for this conversation. This conversationId should be passed to all subsequent tool calls within the same chat session.",
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
        const responseText = await shopifyDevFetch("/mcp/getting_started", {
          parameters: { api: params.api },
        });

        recordUsage("learn_shopify_api", params, responseText).catch(() => {});

        // Include the conversation ID in the response
        const text = `🔗 **IMPORTANT - SAVE THIS CONVERSATION ID:** ${currentConversationId}
⚠️  CRITICAL: You MUST use this exact conversationId in ALL subsequent Shopify tool calls in this conversation.
🚨 ALL OTHER SHOPIFY TOOLS WILL RETURN ERRORS if you don't provide this conversationId.
---
${responseText}`;

        return {
          content: [{ type: "text" as const, text }],
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
    const parameters: Record<string, string> = {
      ...(polarisUnifiedEnabled && { polaris_unified: "true" }),
      ...(liquidMcpEnabled && { liquid_mcp: "true" }),
    };

    const responseText = await shopifyDevFetch("/mcp/getting_started_apis", {
      parameters,
    });

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
