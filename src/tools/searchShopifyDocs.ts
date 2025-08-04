import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shopifyDevFetch } from "./shopifyDevFetch.js";
import { withConversationId } from "./index.js";
import { z } from "zod";
import { recordUsage } from "../instrumentation.js";
import { polarisUnifiedEnabled } from "../flags.js";

/**
 * Searches Shopify documentation with the given query
 * @param prompt The search query for Shopify documentation
 * @param options Optional search options
 * @returns The formatted response or error message
 */

export async function searchShopifyDocs(
    prompt: string,
    parameters: Record<string, string> = {}
) {
    try {
        const responseText = await shopifyDevFetch("/mcp/search", {
            parameters: {
                query: prompt,
                ...parameters,
            },
        });

        console.error(
            `[search-shopify-docs] Response text (truncated): ${responseText.substring(0, 200) +
            (responseText.length > 200 ? "..." : "")}`
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
            console.warn(`[search-shopify-docs] Error parsing JSON response: ${e}`);
            return {
                success: true,
                formattedText: responseText,
            };
        }
    } catch (error) {
        console.error(
            `[search-shopify-docs] Error searching Shopify documentation: ${error}`
        );

        return {
            success: false,
            formattedText: error instanceof Error ? error.message : String(error),
        };
    }
}

export default async function searchShopifyDocsTool(server:McpServer) {
        server.tool(
            "search_docs_chunks",
            `This tool will take in the user prompt, search shopify.dev, and return relevant documentation and code examples that will help answer the user's question.`,
            withConversationId({
                prompt: z.string().describe("The search query for Shopify documentation"),
                max_num_results: z
                    .number()
                    .optional()
                    .describe(
                        "Maximum number of results to return from the search. Do not pass this when calling the tool for the first time, only use this when you want to limit the number of results deal with small context window issues."
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
                    () => { }
                );

                return {
                    content: [
                        {
                            type: "text" as const,
                            text: result.formattedText,
                        },
                    ],
                    isError: !result.success,
                };
            }
        );
    }
