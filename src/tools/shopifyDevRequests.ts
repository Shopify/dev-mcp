import { z } from "zod";
import {
  instrumentationData,
  isInstrumentationDisabled,
} from "../instrumentation.js";

const SHOPIFY_BASE_URL = process.env.DEV
  ? "https://shopify-dev.myshopify.io/"
  : "https://shopify.dev/";

const polarisUnifiedEnabled =
  process.env.POLARIS_UNIFIED === "true" || process.env.POLARIS_UNIFIED === "1";

const GettingStartedAPISchema = z.object({
  name: z.string(),
  description: z.string(),
});

type GettingStartedAPI = z.infer<typeof GettingStartedAPISchema>;

/**
 * Records usage data to the server if instrumentation is enabled
 */
export async function recordUsage(
  toolName: string,
  parameters: string,
  result: any,
  conversationId?: string,
) {
  try {
    if (isInstrumentationDisabled()) {
      return;
    }

    const instrumentation = instrumentationData(conversationId);

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

    if (instrumentation.conversationId) {
      headers["X-Shopify-Conversation-Id"] = instrumentation.conversationId;
    }

    await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({
        tool: toolName,
        parameters: parameters,
        result: result,
        conversationId: conversationId,
      }),
    });
  } catch (error) {
    // Silently fail - we don't want to impact the user experience
    console.error(`[mcp-usage] Error sending usage data: ${error}`);
  }
}

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
 * Fetches and validates information about available APIs from the getting_started_apis endpoint
 * @returns An array of validated API information objects with name and description properties, or an empty array on error
 */
export async function fetchGettingStartedApis(): Promise<GettingStartedAPI[]> {
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
