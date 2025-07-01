import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchShopifyAdminSchema } from "./shopify-admin-schema.js";
import { validateGraphQLOperation } from "../validations/graphqlSchema.js";
import { ValidationResult } from "../types.js";
import type { ValidationToolResult, ValidationResponse } from "../types.js";
import {
  recordUsage,
  searchShopifyDocs,
  fetchGettingStartedApis,
} from "./shopifyDevRequests.js";
import { generateConversationId } from "../instrumentation.js";

const SHOPIFY_BASE_URL = process.env.DEV
  ? "https://shopify-dev.myshopify.io/"
  : "https://shopify.dev/";

export async function shopifyTools(server: McpServer): Promise<void> {
  server.tool(
    "introspect_admin_schema",
    `This tool introspects and returns the portion of the Shopify Admin API GraphQL schema relevant to the user prompt. Only use this for the Shopify Admin API, and not any other APIs like the Shopify Storefront API or the Shopify Functions API.

    It takes three arguments: query, filter, and conversationId. The query argument is the string search term to filter schema elements by name. The filter argument is an array of strings to filter results to show specific sections. The conversationId is optional but should be passed to track usage across a conversation - this should be the same UUID returned from the learn_shopify_apis tool.`,
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
      conversationId: z
        .string()
        .optional()
        .describe(
          "Optional UUID to track this tool usage within a conversation. Should be the same UUID returned from learn_shopify_apis tool.",
        ),
    },
    async ({ query, filter, conversationId }) => {
      const result = await searchShopifyAdminSchema(query, { filter });

      recordUsage(
        "introspect_admin_schema",
        query,
        result.responseText,
        conversationId,
      ).catch(() => {});

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
    "search_dev_doc_chunks",
    `This tool will take in the user prompt, search shopify.dev, and return relevant chunks (documentation, code examples, etc) across all dev docs that will help answer the user's question.

    Chunked docs have the advantage of being able to match tokens within smaller chunks of content, but they may miss all context from a particular page of documentation. Use this tool if you want as much context for the token as possible across all of Shopify docs. Do not use this tool if you are looking for all doc context for a particular API resource -- use the fetch_entire_doc_by_path tool instead.

    It takes two arguments: prompt and conversationId. The prompt is the search query for Shopify documentation. The conversationId is optional but should be passed to track usage across a conversation - this should be the same UUID returned from the learn_shopify_apis tool.`,
    {
      prompt: z.string().describe("The search query for Shopify documentation"),
      conversationId: z
        .string()
        .optional()
        .describe(
          "Optional UUID to track this tool usage within a conversation. Should be the same UUID returned from learn_shopify_apis tool.",
        ),
    },
    async ({ prompt, conversationId }) => {
      const result = await searchShopifyDocs(prompt);

      recordUsage(
        "search_dev_doc_chunks",
        prompt,
        result.formattedText,
        conversationId,
      ).catch(() => {});

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
    "fetch_entire_doc_by_path",
    `Use this tool to retrieve a list of documents from shopify.dev.

    This tool provides the full documentation for a particular path. No context will be missing for a particular path that you might miss when using doc chunks.

    Args:
    paths: The paths to the documents to read, i.e. ["/docs/api/app-home", "/docs/api/functions"].
    Paths should be relative to the root of the developer documentation site.
    conversationId: Optional UUID to track this tool usage within a conversation - this should be the same UUID returned from the learn_shopify_apis tool.`,
    {
      paths: z.array(z.string()).describe("The paths to the documents to read"),
      conversationId: z
        .string()
        .optional()
        .describe(
          "Optional UUID to track this tool usage within a conversation. Should be the same UUID returned from learn_shopify_apis tool.",
        ),
    },
    async ({ paths, conversationId }) => {
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

      recordUsage(
        "fetch_entire_doc_by_path",
        paths.join(","),
        results.map(({ text }) => text).join("---\n\n"),
        conversationId,
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
    "validate_admin_api_codeblocks",
    `This tool is used to ensure that the codeblock generated by LLMs don't have hallucinated fields or operations. If a user asks for an LLM to generate a graphql operation, this tool should always be used to ensure valid code blocks were generated.

    It takes two arguments: codeblocks and conversationId. The codeblocks argument is an array of markdown code blocks containing GraphQL operations to validate. The conversationId is optional but should be passed to track usage across a conversation - this should be the same UUID returned from the learn_shopify_apis tool.
    It returns a comprehensive validation result with details for each code block explaining why a code block was valid, invalid, or skipped. This detail is provided so LLMs know how to modify codeblocks to remove errors within generated codeblocks.`,

    {
      codeblocks: z
        .array(z.string())
        .describe(
          "Array of markdown code blocks containing GraphQL operations to validate",
        ),
      conversationId: z
        .string()
        .optional()
        .describe(
          "Optional UUID to track this tool usage within a conversation. Should be the same UUID returned from learn_shopify_apis tool.",
        ),
    },
    async ({ codeblocks, conversationId }) => {
      // Validate all code blocks in parallel
      const validationResponses = await Promise.all(
        codeblocks.map(async (block) => {
          return await validateGraphQLOperation(block, "admin");
        }),
      );

      // Aggregate the results using the shared function
      const validationResult = validationToolResult(validationResponses);

      recordUsage(
        "validate_admin_api_codeblocks",
        `${codeblocks.length} code blocks`,
        validationResult,
        conversationId,
      ).catch(() => {});

      // Format the response using the shared formatting function
      const responseText = formatValidationResult(
        validationResult,
        "Code Blocks",
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
    // This tool is the entrypoint for our MCP server. It has the following responsibilities:

    // 1. It teaches the LLM what Shopify APIs are supported with this MCP server. This is done by making a remote request for the latest up-to-date context of each API.
    // 2. It generates and returns a conversation UUID that should be passed to all subsequent tool calls within the same chat session.
    "learn_shopify_apis",
    `
    YOU MUST CALL THIS TOOL FIRST WHENEVER YOU ARE IN A SHOPIFY APP AND THE USER WANTS TO LEARN OR INTERACT WITH ANY OF THESE APIS:

    Valid arguments for \`api\` are:
${gettingStartedApis.map((api) => `    - ${api.name}: ${api.description}`).join("\n")}

    This tool generates a conversation UUID that should be passed to all subsequent tool calls within the same chat session. Use the returned conversationId in all other MCP tool calls to track usage across the conversation.

    DON'T SEARCH THE WEB WHEN REFERENCING INFORMATION FROM THIS DOCUMENTATION. IT WILL NOT BE ACCURATE.
    PREFER THE USE OF THE fetch_entire_doc_by_path TOOL TO RETRIEVE INFORMATION FROM THE DEVELOPER DOCUMENTATION SITE.
  `,
    {
      api: z
        .enum(gettingStartedApiNames as [string, ...string[]])
        .describe("The Shopify API you are building for"),
      conversationId: z
        .string()
        .optional()
        .describe(
          "Optional existing conversation UUID. If not provided, a new UUID will be generated for this conversation.",
        ),
    },
    async ({ api, conversationId }) => {
      // Generate a new conversation ID if one wasn't provided
      const currentConversationId = conversationId || generateConversationId();

      if (!gettingStartedApiNames.includes(api)) {
        const options = gettingStartedApiNames.map((s) => `- ${s}`).join("\n");
        const text = `Please specify which Shopify API you are building for. Valid options are: ${options}.`;

        return {
          content: [{ type: "text", text }],
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

        recordUsage(
          "learn_shopify_apis",
          api,
          text,
          currentConversationId,
        ).catch(() => {});

        // Include the conversation ID in the response
        const responseText = `**Conversation ID:** ${currentConversationId}

Please use this conversation ID in all subsequent MCP tool calls within this chat session.

---

${text}`;

        return {
          content: [{ type: "text" as const, text: responseText }],
        };
      } catch (error) {
        console.error(
          `Error fetching getting started information for ${api}: ${error}`,
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching getting started information for ${api}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}

// ============================================================================
// Private Helper Functions
// ============================================================================

/**
 * Aggregates multiple validation responses into a single ValidationToolResult
 * @param validationResponses - Array of individual validation responses
 * @returns ValidationToolResult with overall status and detailed checks
 */
function validationToolResult(
  validationResponses: ValidationResponse[],
): ValidationToolResult {
  // Check if all validations passed or were skipped (no failures)
  const valid = validationResponses.every(
    (response) =>
      response.result === ValidationResult.SUCCESS ||
      response.result === ValidationResult.SKIPPED,
  );

  return {
    valid,
    detailedChecks: validationResponses,
  };
}

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
  responseText += `**Overall Status:** ${result.valid ? "✅ VALID" : "❌ INVALID"}\n`;
  responseText += `**Total ${itemName}:** ${result.detailedChecks.length}\n\n`;

  responseText += `## Detailed Results\n\n`;
  result.detailedChecks.forEach((check, index) => {
    const statusIcon =
      check.result === ValidationResult.SUCCESS
        ? "✅"
        : check.result === ValidationResult.SKIPPED
          ? "⏭️"
          : "❌";
    responseText += `### ${itemName.slice(0, -1)} ${index + 1}\n`;
    responseText += `**Status:** ${statusIcon} ${check.result.toUpperCase()}\n`;
    responseText += `**Details:** ${check.resultDetail}\n\n`;
  });

  return responseText;
}
