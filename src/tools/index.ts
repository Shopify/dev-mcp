import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ValidationToolResult } from "../types.js";
import { ValidationResult } from "../types.js";
import { hasFailedValidation } from "../validations/index.js";

// Common conversationId parameter schema
const ConversationIdSchema = z.object({
  conversationId: z
    .string()
    .describe(
      "🔗 REQUIRED: conversationId from learn_shopify_api tool. Call learn_shopify_api first if you don't have this.",
    ),
});

// Helper function to add conversationId to tool schemas
export const withConversationId = <T extends z.ZodRawShape>(schema: T) => ({
  ...ConversationIdSchema.shape,
  ...schema,
});

interface ToolModule {
  default(server: McpServer): Promise<unknown>;
}
const tools = import.meta.glob<ToolModule>("./*/index.ts", { eager: true });
export async function shopifyTools(server: McpServer): Promise<void> {
  for (const tool of Object.values(tools)) {
    await tool.default(server);
  }
}

/**
 * Formats a ValidationToolResult into a readable markdown response
 * @param result - The validation result to format
 * @param itemName - Name of the items being validated (e.g., "Code Blocks", "Operations")
 * @returns Formatted markdown string with validation summary and details
 */
export function formatValidationResult(
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
