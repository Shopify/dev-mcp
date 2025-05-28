import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request, gql } from "graphql-request";
import { execa } from "execa";
import path from "node:path";
import fs from "node:fs/promises";

function fakeAppStatus() {
  return {
    cursor: "234567865",
    logs: [
      [
        "2025-05-28T11:00:00.000Z",
        "function",
        "<something about the function building>",
      ],
      ["2025-05-28T12:00:00.000Z", "dev-session", "App configuration is valid"],
    ],
    status: "READY",
    graphiqlUrl: "https://shopify-dev.myshopify.io/admin/graphiql",
    previewUrl: "https://shopify-dev.myshopify.io/admin/graphiql",
    manifest: {
      "shopify-extensions": [
        {
          name: "Shopify CLI",
          version: "1.0.0",
          status: "READY",
        },
      ],
    },
  };
}

export function addCliTools(server: McpServer) {
  server.tool(
    "check_app_status",
    "Using the running Shopify `app dev` command, check the status of the current app's work in progress, getting feedback on whether changes made are valid or not, any logs, and the breakdown of the Shopify extensions included in the app.",
    {
      projectPath: z
        .string()
        .describe("The absolute path to the Shopify app project to check"),
      cursor: z
        .string()
        .optional()
        .describe(
          "Use this to filter outputs to only show changes made since last time. Leave it blank if this is the first time you're calling this tool.",
        ),
    },
    async ({ cursor, projectPath }) => {
      async function getStatus(port: number) {
        try {
          const response = await fetch(`http://localhost:${port}/dev-status`, {
            method: "GET",
          });

          const data = await response.json();

          return data;
        } catch (e) {
          console.error(e);
          return null;
        }
      }

      // first get the port. it'll be in the projectPath/.shopify/dev-control-port.lock; contents will be the port number
      const portLockPath = path.join(
        projectPath,
        ".shopify/dev-control-port.lock",
      );
      let port;
      if (await fs.stat(portLockPath).catch(() => false)) {
        const portLock = await fs.readFile(portLockPath, "utf8");
        port = Number.parseInt(portLock.trim());
      } else {
        return {
          content: [
            {
              type: "text",
              text: "No running Shopify CLI app found\nRun `shopify app dev --path <path-to-app>` first, in a standalone/background process",
            },
          ],
        };
      }

      // keep trying getstatus until it works, or until 4 seconds have passed
      const startTime = Date.now();
      while (Date.now() - startTime < 4000) {
        const status = await getStatus(port);
        if (status) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(status, null, 2),
              },
            ],
          };
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: "Unable to get app status",
          },
        ],
      };
    },
  );
}
