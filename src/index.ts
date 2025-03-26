#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { shopifyTools } from "./shopify.js";
import { z } from "zod";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Get package.json version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, "../package.json"), "utf8")
);
const VERSION = packageJson.version;

async function main() {
  // Create server instance
  const server = new McpServer(
    {
      name: "shopify-dev-mcp",
      version: VERSION,
    },
    {
      capabilities: {
        logging: {},
      },
    }
  );

  // Register Shopify tools
  await shopifyTools(server);

  // Register Shopify prompts
  server.prompt(
    "shopify-admin-graphql",
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
    })
  );

  // Connect to transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Shopify Dev MCP Server v${VERSION} running on stdio`);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
