#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { shopifyPrompts } from "./prompts/index.js";
import { shopifyTools } from "./tools/index.js";

declare const __APP_VERSION__: string;
const VERSION = __APP_VERSION__;

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
    },
  );

  // Register Shopify tools
  await shopifyTools(server);

  // Register Shopify prompts
  shopifyPrompts(server);

  // Connect to transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Shopify Dev MCP Server v${VERSION} running on stdio`);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
