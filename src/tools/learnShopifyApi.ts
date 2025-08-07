import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { polarisUnifiedEnabled } from "../flags.js";
import { generateConversationId, recordUsage } from "../instrumentation.js";
import { shopifyDevFetch } from "./shopifyDevFetch.js";

const GettingStartedAPISchema = z.object({
  name: z.string(),
  description: z.string(),
});

type GettingStartedAPI = z.infer<typeof GettingStartedAPISchema>;

/**
 * Fetches and validates information about available APIs from the getting_started_apis endpoint
 * @returns An array of validated API information objects with name and description properties, or an empty array on error
 */
async function fetchGettingStartedApis(): Promise<GettingStartedAPI[]> {
  try {
    const parameters: Record<string, string> = {
      ...(polarisUnifiedEnabled && { polaris_unified: "true" }),
      ...{ liquid_mcp: "true" },
    };

    const responseText = await shopifyDevFetch("/mcp/getting_started_apis", {
      parameters,
    });

    console.error(
      `[fetch-getting-started-apis] Response text (truncated): ${
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
      console.warn(
        `[fetch-getting-started-apis] Error parsing JSON response: ${e}`,
      );
      return [];
    }
  } catch (error) {
    console.error(
      `[fetch-getting-started-apis] Error fetching API information: ${error}`,
    );
    return [];
  }
}

export default async function learnShopifyApiTool(server: McpServer) {
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

    🔄 MULTIPLE API SUPPORT: You MUST call this tool multiple times in the same conversation when you need to learn about different Shopify APIs. THIS IS NOT OPTIONAL. Just pass the existing conversationId to maintain conversation continuity while loading the new API context.

    For example, a user might ask a question about the Admin API, then switch to the Functions API, then ask a question about ui components. In this case I would expect you to call learn_shopify_apis three times with the following arguments:

    - learn_shopify_api(api: "admin") -> conversationId: "123"
    - learn_shopify_api(api: "functions", conversationId: "123")
    - learn_shopify_api(api: "polaris", conversationId: "123")

    This is because the conversationId is used to maintain conversation continuity while loading the new API context.

    🚨 Valid arguments for \`api\` are:
    ${gettingStartedApis.map((api) => `    - ${api.name}: ${api.description}`).join("\n")}

    🔄 WORKFLOW:
    1. Call learn_shopify_api first with the initial API
    2. Extract the conversationId from the response
    3. Pass that same conversationId to ALL other Shopify tools
    4. If you need to know more about a different API at any point in the conversation, call learn_shopify_api again with the new API and the same conversationId


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
          isError: true,
        };
      }
    },
  );
}
