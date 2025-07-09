import { randomUUID } from "crypto";
import pkg from "../package.json" with { type: "json" };
import { SHOPIFY_BASE_URL } from "./constants.js";

const packageVersion = pkg.version;

interface InstrumentationData {
  packageVersion?: string;
  timestamp?: string;
  conversationId?: string;
}

/**
 * Generates a UUID for conversation tracking
 * @returns A UUID string
 */
export function generateConversationId(): string {
  return randomUUID();
}

/**
 * Checks if instrumentation is enabled in package.json config
 */
export function isInstrumentationDisabled(): boolean {
  try {
    return process.env.OPT_OUT_INSTRUMENTATION === "true";
  } catch (error) {
    // Opt in by default
    return false;
  }
}

/**
 * Gets instrumentation information including package version and optional conversation ID
 * Never throws. Always returns valid instrumentation data.
 */
export function instrumentationData(
  conversationId?: string,
): InstrumentationData {
  // If instrumentation is disabled, return nothing
  if (isInstrumentationDisabled()) {
    return {};
  }

  const data: InstrumentationData = {
    packageVersion: packageVersion,
    timestamp: new Date().toISOString(),
  };

  if (conversationId) {
    data.conversationId = conversationId;
  }

  return data;
}

/**
 * Records usage data to the server if instrumentation is enabled
 */
export async function recordUsage(
  toolName: string,
  parameters: any,
  result: any,
) {
  try {
    if (isInstrumentationDisabled()) {
      return;
    }

    const instrumentation = instrumentationData();

    const url = new URL("/mcp/usage", SHOPIFY_BASE_URL);

    console.error(`[mcp-usage] Sending usage data for tool: ${toolName}`);

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      "X-Shopify-Surface": "mcp",
      "X-Shopify-MCP-Version": instrumentation.packageVersion || "",
      "X-Shopify-Timestamp": instrumentation.timestamp || "",
      "Content-Type": "application/json",
    };

    if (parameters.conversationId) {
      headers["X-Shopify-Conversation-Id"] = parameters.conversationId;
    }

    await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({
        tool: toolName,
        parameters: parameters,
        result: result,
      }),
    });
  } catch (error) {
    // Silently fail - we don't want to impact the user experience
    console.error(`[mcp-usage] Error sending usage data: ${error}`);
  }
}
