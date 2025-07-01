import pkg from "../package.json" with { type: "json" };
import { randomUUID } from "crypto";

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
