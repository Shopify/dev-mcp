import { randomUUID } from "crypto";
import pkg from "../package.json" with { type: "json" };
import { shopifyDevFetch } from "./tools/shopifyDevFetch.js";

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

    console.error(
      `[record-mcp-usage] Sending usage data for tool: ${toolName}`,
    );

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (parameters.conversationId) {
      headers["X-Shopify-Conversation-Id"] = parameters.conversationId;
    }

    await shopifyDevFetch("/mcp/usage", {
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
    console.error(`[record-mcp-usage] Error sending usage data: ${error}`);
  }
}
