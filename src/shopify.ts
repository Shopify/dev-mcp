import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchShopifyAdminSchema } from "./shopify-admin-schema.js";

const SHOPIFY_BASE_URL = "https://shopify.dev";

/**
 * Searches Shopify documentation with the given query
 * @param prompt The search query for Shopify documentation
 * @returns The formatted response or error message
 */
export async function searchShopifyDocs(prompt: string) {
  try {
    // Prepare the URL with query parameters
    const url = new URL("/mcp/search", SHOPIFY_BASE_URL);
    url.searchParams.append("query", prompt);

    console.error(`[shopify-docs] Making GET request to: ${url.toString()}`);

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
      `[shopify-docs] Response status: ${response.status} ${response.statusText}`
    );

    // Convert headers to object for logging
    const headersObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    console.error(
      `[shopify-docs] Response headers: ${JSON.stringify(headersObj)}`
    );

    if (!response.ok) {
      console.error(`[shopify-docs] HTTP error status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Read and process the response
    const responseText = await response.text();
    console.error(
      `[shopify-docs] Response text (truncated): ${
        responseText.substring(0, 200) +
        (responseText.length > 200 ? "..." : "")
      }`
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
      console.warn(`[shopify-docs] Error parsing JSON response: ${e}`);
      // If parsing fails, return the raw text
      return {
        success: true,
        formattedText: responseText,
      };
    }
  } catch (error) {
    console.error(
      `[shopify-docs] Error searching Shopify documentation: ${error}`
    );

    return {
      success: false,
      formattedText: `Error searching Shopify documentation: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Fetches issues from a GitHub repository with the given options
 * @param owner The repository owner (organization or username)
 * @param repo The repository name
 * @param options Optional parameters for filtering issues
 * @returns The formatted response or error message
 */
/**
 * Simple function to fetch a GitHub issue using the GitHub API
 * @param issueUrl The full GitHub issue URL (e.g., "https://github.com/Shopify/repo/issues/123")
 */
export async function fetchGitHubIssue(issueUrl: string) {
  try {
    // Parse the URL to extract organization, repo, and issue number
    const match = issueUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
    if (!match) {
      return {
        success: false,
        formattedText: `Invalid GitHub issue URL: ${issueUrl}. Expected format: https://github.com/org/repo/issues/number`,
        error: "Invalid URL format"
      };
    }
    
    const [_, orgName, repo, issueNumberStr] = match;
    const issueNumber = parseInt(issueNumberStr, 10);
    
    console.log(`[github-issue] Fetching issue #${issueNumber} from ${orgName}/${repo}`);
    
    // Build the GitHub API URL
    const GITHUB_API_URL = "https://api.github.com";
    const url = `${GITHUB_API_URL}/repos/${orgName}/${repo}/issues/${issueNumber}`;
    
    // Get GitHub token from environment variable
    const githubToken = process.env.GITHUB_TOKEN;
    
    try {
      // Make the API request with auth token if available
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Shopify-Dev-MCP'
      };
      
      // Add authorization header if token is available
      if (githubToken) {
        headers['Authorization'] = `token ${githubToken}`;
        console.log('[github-issue] Using GitHub token for authentication');
      } else {
        console.log('[github-issue] No GitHub token found in environment');
      }
      
      const response = await fetch(url, { headers });
      
      // Handle non-200 responses
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Parse the JSON response
      const issue = await response.json();
      
      // Format the issue data in a clean structure
      const formattedIssue = {
        number: issue.number,
        title: issue.title,
        state: issue.state,
        author: issue.user ? issue.user.login : null,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        url: issue.html_url,
        labels: issue.labels ? issue.labels.map((label: any) => label.name) : [],
        body: issue.body || ""
      };
      
      // Return success with formatted data
      return {
        success: true,
        formattedText: JSON.stringify({ 
          repository: `${orgName}/${repo}`,
          issue: formattedIssue
        }, null, 2),
      };
    } catch (error) {
      const fetchError = error as Error;
      console.log(`[github-issue] Request error: ${fetchError.message}`);
      
      // Handle common error cases
      if (fetchError.message.includes("404")) {
        return {
          success: false,
          formattedText: `Issue #${issueNumber} not found in repository ${orgName}/${repo}. It may not exist or you may not have permission to view it.`,
          error: "Issue not found"
        };
      }
      
      if (fetchError.message.includes("403")) {
        return {
          success: false,
          formattedText: `Access denied. The repository ${orgName}/${repo} may be private or you're being rate limited by GitHub.`,
          error: "Access denied"
        };
      }
      
      // Return other errors
      return {
        success: false,
        formattedText: `Error fetching issue: ${fetchError.message}`,
        error: fetchError.message
      };
    }
  } catch (error) {
    console.log(`[github-issue] Unexpected error: ${error}`);
    return {
      success: false,
      formattedText: `Error fetching GitHub issue: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function shopifyTools(server: McpServer) {
  server.tool(
    "introspect-admin-schema",
    `
    This tool introspects and returns the portion of the Shopify Admin API GraphQL schema relevant to the user prompt. Only use this for the Shopify Admin API, and not any other APIs like the Shopify Storefront API or the Shopify Functions API.
    
    It takes two arguments: query and filter. The query argument is the string search term to filter schema elements by name. The filter argument is an array of strings to filter results to show specific sections.
    `,
    {
      query: z
        .string()
        .describe(
          "Search term to filter schema elements by name. Only pass simple terms like 'product', 'discountProduct', etc."
        ),
      filter: z
        .array(z.enum(["all", "types", "queries", "mutations"]))
        .optional()
        .default(["all"])
        .describe(
          "Filter results to show specific sections. Can include 'types', 'queries', 'mutations', or 'all' (default)"
        ),
    },
    async ({ query, filter }, extra) => {
      const result = await searchShopifyAdminSchema(query, { filter });

      if (result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: result.responseText,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error processing Shopify Admin GraphQL schema: ${result.error}. Make sure the schema file exists.`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "search-dev-docs",
    `
    This tool will take in the user prompt, search shopify.dev, and return relevant documentation that will help answer the user's question. 
    
    It takes one argument: prompt, which is the search query for Shopify documentation.
    `,
    {
      prompt: z.string().describe("The search query for Shopify documentation"),
    },
    async ({ prompt }, extra) => {
      const result = await searchShopifyDocs(prompt);

      return {
        content: [
          {
            type: "text" as const,
            text: result.formattedText,
          },
        ],
      };
    }
  );
  
  server.tool(
    "fetch-github-issues",
    `
    This tool fetches a specific issue from a GitHub repository by URL.
    
    It takes one required argument:
    - url: The full GitHub issue URL (e.g., "https://github.com/Shopify/cli/issues/722")
    `,
    {
      url: z.string().describe("The full GitHub issue URL to fetch"),
    },
    async ({ url }, extra) => {
      const result = await fetchGitHubIssue(url);

      return {
        content: [
          {
            type: "text" as const,
            text: result.formattedText,
          },
        ],
      };
    }
  );
}
