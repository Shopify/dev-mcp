#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request, Response } from "express";
import { shopifyTools } from "./tools/index.js";
import { shopifyPrompts } from "./prompts/index.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Get package.json version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, "../package.json"), "utf8"),
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
    },
  );

  // Register Shopify tools
  await shopifyTools(server);

  // Register Shopify prompts
  shopifyPrompts(server);

  // Check if we should run in HTTP+SSE mode
  const useHttp =
    process.argv.includes("--http") || process.env.MCP_USE_HTTP === "true";

  if (useHttp) {
    // Set up Express app for HTTP+SSE mode
    const app = express();
    app.use(express.json());

    // Store SSE transports for session management
    const transports = {} as Record<string, SSEServerTransport>;

    // Legacy SSE endpoint for older clients
    app.get("/sse", async (req: Request, res: Response) => {
      // Create SSE transport for legacy clients
      const transport = new SSEServerTransport("/messages", res);
      transports[transport.sessionId] = transport;

      res.on("close", () => {
        delete transports[transport.sessionId];
      });

      await server.connect(transport);
    });

    // Legacy message endpoint for older clients
    app.post("/messages", async (req: Request, res: Response) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports[sessionId];
      if (transport) {
        await transport.handlePostMessage(req, res, req.body);
      } else {
        res.status(400).send("No transport found for sessionId");
      }
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.error(
        `Shopify Dev MCP Server v${VERSION} running on HTTP+SSE mode`,
      );
      console.error(`- SSE endpoint: /sse`);
      console.error(`- Messages endpoint: /messages`);
      console.error(`Server running on port ${port}`);
    });
  } else {
    // Connect to stdio transport (default mode)
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`Shopify Dev MCP Server v${VERSION} running on stdio`);
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
