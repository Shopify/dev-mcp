import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function shopifyPrompts(server: McpServer) {
  server.prompt(
    "shopify_admin_graphql",
    {
      query: z
        .string()
        .describe("The specific Shopify Admin API question or request"),
    },
    ({ query }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `I need help writing a GraphQL operation for the Shopify Admin API.

Here is my specific request: ${query}

Please help me create a complete and correct GraphQL operation (query or mutation) for the Shopify Admin API that accomplishes this task. Include:
1. The full GraphQL operation with proper syntax
2. A brief explanation of what each part of the operation does
3. Any variables needed for the operation
4. How to handle the response data
5. Relevant documentation links if applicable

When formulating your response, make sure to:
- Use the latest Shopify Admin API best practices
- Structure the query efficiently, requesting only necessary fields
- Follow proper naming conventions for the GraphQL operation
- Handle error cases appropriately
- Ensure the query is optimized for performance

The GraphQL operation should be ready to use with minimal modification.`,
          },
        },
      ],
    }),
  );
}
