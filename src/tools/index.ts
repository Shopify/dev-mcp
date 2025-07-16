import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execa } from "execa";
import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";
import { SHOPIFY_BASE_URL } from "../constants.js";
import {
  generateConversationId,
  instrumentationData,
  recordUsage,
} from "../instrumentation.js";
import type { ValidationToolResult } from "../types.js";
import { ValidationResult } from "../types.js";
import validateGraphQLOperation from "../validations/graphqlSchema.js";
import { hasFailedValidation } from "../validations/index.js";
import { searchShopifyAdminSchema } from "./shopifyAdminSchema.js";

const polarisUnifiedEnabled =
  process.env.POLARIS_UNIFIED === "true" || process.env.POLARIS_UNIFIED === "1";

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
 * @returns The formatted response or error message
 */
export async function searchShopifyDocs(prompt: string) {
  try {
    const instrumentation = instrumentationData();

    // Prepare the URL with query parameters
    const url = new URL("/mcp/search", SHOPIFY_BASE_URL);
    url.searchParams.append("query", prompt);

    if (polarisUnifiedEnabled) {
      url.searchParams.append("polaris_unified", "true");
    }

    console.error(`[shopify-docs] Making GET request to: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        "X-Shopify-MCP-Version": instrumentation.packageVersion || "",
        "X-Shopify-Timestamp": instrumentation.timestamp || "",
      },
    });

    console.error(
      `[shopify-docs] Response status: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      console.error(`[shopify-docs] HTTP error status: ${response.status}`);
      return {
        success: false,
        formattedText: `HTTP error! status: ${response.status}`,
      };
    }

    // Read and process the response
    const responseText = await response.text();
    console.error(
      `[shopify-docs] Response text (truncated): ${
        responseText.substring(0, 200) +
        (responseText.length > 200 ? "..." : "")
      }`,
    );

    // Parse and format the JSON for human readability
    try {
      const jsonData = JSON.parse(responseText);
      const formattedJson = JSON.stringify(jsonData, null, 2);

      return {
        success: true,
        formattedText: formattedJson,
      };
    } catch (e) {
      // If JSON parsing fails, get the raw text
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
 * Executes a command and returns the output
 */
async function runCommand(
  command: string,
  args: string[],
  cwd?: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  console.error(
    `[validate-function] Running command: ${command} ${args.join(" ")}`,
  );
  console.error(`[validate-function] Command CWD: ${cwd || "inherit"}`);

  try {
    // Use execa with better defaults and error handling
    const result = await execa(command, args, {
      cwd,
      shell: true,
      timeout: 120000, // 2 minute timeout
      reject: false, // Don't throw on non-zero exit code
      all: true, // Combine stdout and stderr
      env: process.env,
    });

    console.error(
      `[validate-function] Command '${command}' exited with code: ${result.exitCode}`,
    );

    if (result.exitCode !== 0 && result.stderr) {
      console.error(`[validate-function] stderr output: ${result.stderr}`);
    }

    return {
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      exitCode: result.exitCode || 0,
    };
  } catch (error: any) {
    console.error(
      `[validate-function] Command error for '${command}': ${error.message}`,
    );

    // Handle timeout errors specifically
    if (error.timedOut) {
      return {
        stdout: error.stdout || "",
        stderr: `Command timed out after 120 seconds\n${error.stderr || ""}`,
        exitCode: 1,
      };
    }

    // Handle command not found
    if (error.code === "ENOENT") {
      return {
        stdout: "",
        stderr: `Command '${command}' not found in PATH\nError details: ${error.message}`,
        exitCode: 1,
      };
    }

    // Handle other errors
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || `Command error: ${error.message}`,
      exitCode: error.exitCode || 1,
    };
  }
}

/**
 * Checks if Shopify CLI is installed
 */
async function checkShopifyCLI(): Promise<{
  found: boolean;
  details: string[];
}> {
  const details: string[] = [];

  try {
    // Debug: Log the PATH environment variable
    console.error(`[validate-function] Current PATH: ${process.env.PATH}`);
    console.error(
      `[validate-function] Current working directory: ${process.cwd()}`,
    );

    details.push(`Checking for Shopify CLI...`);

    // First try running shopify version directly
    const { exitCode, stdout, stderr } = await runCommand("shopify", [
      "version",
    ]);

    if (exitCode === 0) {
      console.error(
        `[validate-function] Shopify CLI found, version: ${stdout.trim()}`,
      );
      details.push(`✓ Found via 'shopify' command, version: ${stdout.trim()}`);
      return { found: true, details };
    }

    details.push(`✗ 'shopify version' failed with exit code ${exitCode}`);
    if (stderr) details.push(`  Error: ${stderr.trim()}`);

    // If that fails, try using 'command -v' to find it
    const {
      exitCode: commandExitCode,
      stdout: commandPath,
      stderr: commandStderr,
    } = await runCommand("command", ["-v", "shopify"]);

    if (commandExitCode === 0 && commandPath.trim()) {
      console.error(
        `[validate-function] Shopify CLI found at: ${commandPath.trim()}`,
      );
      details.push(`✓ Found at: ${commandPath.trim()}`);

      // Try running version with the full path
      const { exitCode: versionExitCode } = await runCommand(
        commandPath.trim(),
        ["version"],
      );
      return { found: versionExitCode === 0, details };
    }

    details.push(`✗ 'command -v shopify' failed`);
    if (commandStderr) details.push(`  Error: ${commandStderr.trim()}`);

    // Also try the known homebrew path directly
    const homebrewPath = "/opt/homebrew/bin/shopify";
    console.error(`[validate-function] Trying homebrew path: ${homebrewPath}`);
    details.push(`Trying direct path: ${homebrewPath}`);

    const { exitCode: homebrewExitCode, stderr: homebrewStderr } =
      await runCommand(homebrewPath, ["version"]);

    if (homebrewExitCode === 0) {
      console.error(`[validate-function] Shopify CLI found at homebrew path`);
      details.push(`✓ Found at homebrew path`);
      return { found: true, details };
    }

    details.push(`✗ Direct path failed with exit code ${homebrewExitCode}`);
    if (homebrewStderr) details.push(`  Error: ${homebrewStderr.trim()}`);

    console.error(
      `[validate-function] Shopify CLI not found. Exit code: ${exitCode}, stderr: ${stderr}`,
    );
    return { found: false, details };
  } catch (error) {
    console.error(`[validate-function] Error checking Shopify CLI: ${error}`);
    details.push(
      `Exception occurred: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { found: false, details };
  }
}

/**
 * Finds the Shopify app root by looking for shopify.app.toml
 */
async function findShopifyAppRoot(startPath: string): Promise<string | null> {
  let currentPath = path.resolve(startPath);

  while (currentPath !== path.dirname(currentPath)) {
    try {
      const appTomlPath = path.join(currentPath, "shopify.app.toml");
      await fs.access(appTomlPath);
      console.error(
        `[validate-function] Found shopify.app.toml at: ${currentPath}`,
      );
      return currentPath;
    } catch {
      // File doesn't exist, continue searching
    }
    currentPath = path.dirname(currentPath);
  }

  return null;
}

/**
 * Validates a Shopify Function by building and running it
 */
async function validateShopifyFunction(
  extensionPath: string,
  inputFile?: string,
  exportName: string = "run",
): Promise<{ logs: string; formattedOutput: string }> {
  const logs: string[] = [];

  logs.push("## Shopify Function Validation\n");

  // Step 1: Check if Shopify CLI is installed
  logs.push("### Environment Check\n");

  // Add debug information to the output
  logs.push("**Debug Information:**");
  logs.push(`- PATH: ${process.env.PATH || "(not set)"}`);
  logs.push(`- Current directory: ${process.cwd()}`);
  logs.push(`- Node version: ${process.version}`);
  logs.push(`- Platform: ${process.platform}`);
  logs.push(`- Architecture: ${process.arch}\n`);

  const cliCheck = await checkShopifyCLI();

  if (!cliCheck.found) {
    const errorMsg =
      "❌ Shopify CLI is not installed or not in PATH.\n\nPlease install the Shopify CLI: https://shopify.dev/docs/apps/tools/cli";
    logs.push(errorMsg);
    logs.push("\n**Troubleshooting Details:**");
    cliCheck.details.forEach((detail) => logs.push(`- ${detail}`));
    logs.push("\n**Additional Help:**");
    logs.push("- The Shopify CLI could not be found in the PATH");
    logs.push(
      "- Tried paths: 'shopify' command, 'command -v shopify', and '/opt/homebrew/bin/shopify'",
    );
    logs.push(
      "- Make sure the Shopify CLI is installed and accessible from the environment where the MCP server runs",
    );
    return {
      logs: logs.join("\n"),
      formattedOutput: logs.join("\n"),
    };
  }

  logs.push("✅ Shopify CLI is installed\n");

  // Step 2: Check if we're in a Shopify app
  const absoluteExtensionPath = path.resolve(extensionPath);
  const appRoot = await findShopifyAppRoot(absoluteExtensionPath);

  if (!appRoot) {
    const errorMsg =
      "❌ Not inside a Shopify app directory.\n\nThis tool must be run from within a Shopify app (directory containing shopify.app.toml).";
    logs.push(errorMsg);
    return {
      logs: logs.join("\n"),
      formattedOutput: logs.join("\n"),
    };
  }

  logs.push(`✅ Found Shopify app at: ${appRoot}\n`);

  // Step 3: Build the function
  logs.push("### Building Function\n");
  logs.push(`Working directory: ${absoluteExtensionPath}\n`);

  const buildResult = await runCommand(
    "shopify",
    ["app", "function", "build"],
    absoluteExtensionPath,
  );

  logs.push("**Build Output:**");
  logs.push("```");
  if (buildResult.stdout) logs.push(buildResult.stdout);
  if (buildResult.stderr) logs.push(buildResult.stderr);
  logs.push("```\n");

  if (buildResult.exitCode !== 0) {
    logs.push(`❌ Build failed with exit code ${buildResult.exitCode}`);
    return {
      logs: logs.join("\n"),
      formattedOutput: logs.join("\n"),
    };
  }

  logs.push("✅ Build completed successfully\n");

  // Step 4: Run the function
  logs.push("### Running Function\n");

  const runArgs = ["app", "function", "run", `--export=${exportName}`];

  if (inputFile) {
    runArgs.push(`--input=${inputFile}`);
    logs.push(`Using input file: ${inputFile}\n`);
  } else {
    logs.push("Using standard input (no input file specified)\n");
  }

  const runResult = await runCommand("shopify", runArgs, absoluteExtensionPath);

  logs.push("**Run Output:**");
  logs.push("```");
  if (runResult.stdout) logs.push(runResult.stdout);
  if (runResult.stderr) logs.push(runResult.stderr);
  logs.push("```\n");

  if (runResult.exitCode !== 0) {
    logs.push(`❌ Run failed with exit code ${runResult.exitCode}`);
    return {
      logs: logs.join("\n"),
      formattedOutput: logs.join("\n"),
    };
  }

  logs.push("✅ Function ran successfully\n");
  logs.push("### Summary\n");
  logs.push(
    "✅ **Function validated successfully!** The function builds and runs without errors.",
  );

  return {
    logs: logs.join("\n"),
    formattedOutput: logs.join("\n"),
  };
}

export async function shopifyTools(server: McpServer): Promise<void> {
  server.tool(
    "introspect_admin_schema",
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
          "Filter results to show specific sections. Can include 'types', 'queries', 'mutations', or 'all' (default)",
        ),
    }),
    async (params) => {
      const result = await searchShopifyAdminSchema(params.query, {
        filter: params.filter,
      });

      recordUsage("introspect_admin_schema", params, result.responseText).catch(
        () => {},
      );

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
    "search_docs_chunks",
    `This tool will take in the user prompt, search shopify.dev, and return relevant documentation and code examples that will help answer the user's question.`,
    withConversationId({
      prompt: z.string().describe("The search query for Shopify documentation"),
    }),
    async (params) => {
      const result = await searchShopifyDocs(params.prompt);

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
      api: z.enum(["admin"]).describe("The GraphQL API to validate against"),
      code: z
        .array(z.string())
        .describe("Array of GraphQL code snippets to validate"),
    }),
    async (params) => {
      // Validate all code snippets in parallel
      const validationResponses = await Promise.all(
        params.code.map(async (snippet) => {
          return await validateGraphQLOperation(snippet, params.api);
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
        const url = new URL("/mcp/getting_started", SHOPIFY_BASE_URL);
        url.searchParams.append("api", params.api);
        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseText = await response.text();

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

  server.tool(
    "validate_function",
    `Validates that a Shopify Function builds and runs successfully using the Shopify CLI.
    Prefer to use this tool over calling CLI commands directly to validate functions.

IMPORTANT: This tool requires the Shopify CLI to be installed and should only be called in environments where CLI commands can be executed. Do not call this tool in browser-based environments or where shell access is not available.`,
    withConversationId({
      extensionPath: z
        .string()
        .optional()
        .default(".")
        .describe(
          "Path to the function extension directory (where shopify.extension.toml is located)",
        ),
      inputFile: z
        .string()
        .optional()
        .describe(
          "Path to the input JSON file relative to extensionPath. If omitted, standard input is used.",
        ),
      exportName: z
        .string()
        .optional()
        .default("run")
        .describe("Name of the WebAssembly export to invoke"),
    }),
    async (params) => {
      try {
        const result = await validateShopifyFunction(
          params.extensionPath,
          params.inputFile,
          params.exportName,
        );

        recordUsage("validate_function", params, result.logs).catch(() => {});

        return {
          content: [
            {
              type: "text" as const,
              text: result.formattedOutput,
            },
          ],
        };
      } catch (error) {
        const errorMessage = `Error validating function: ${error instanceof Error ? error.message : String(error)}`;
        recordUsage("validate_function", params, errorMessage).catch(() => {});

        return {
          content: [
            {
              type: "text" as const,
              text: errorMessage,
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
    const url = new URL("/mcp/getting_started_apis", SHOPIFY_BASE_URL);
    if (polarisUnifiedEnabled) {
      url.searchParams.append("polaris_unified", "true");
    }

    console.error(`[api-information] Making GET request to: ${url.toString()}`);

    // Make the GET request
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        "X-Shopify-Surface": "mcp",
      },
    });

    console.error(
      `[api-information] Response status: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      console.error(`[api-information] HTTP error status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Read and process the response
    const responseText = await response.text();
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
