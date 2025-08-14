import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatValidationResult, withConversationId } from "../index.js";
import { z } from "zod";
import validateGraphQLOperation from "../../validations/graphqlSchema.js";
import { recordUsage } from "../../instrumentation.js";
import { hasFailedValidation } from "../../validations/index.js";
import { fetchGraphQLSchemas } from "../introspect_graphql_schema/index.js";

export default async function validateGraphqlCodeblocksTool(server: McpServer) {
  const { schemas, apis, versions, latestVersion } =
    await fetchGraphQLSchemas();

  // Extract just the API names for enum definitions
  const apiNames = apis.map((api) => api.name);

  server.tool(
    "validate_graphql_codeblocks",
    `This tool validates GraphQL code blocks against the Shopify GraphQL schema to ensure they don't contain hallucinated fields or operations. If a user asks for an LLM to generate a GraphQL operation, this tool should always be used to ensure valid code was generated.

    It returns a comprehensive validation result with details for each code block explaining why it was valid or invalid. This detail is provided so LLMs know how to modify code snippets to remove errors.`,

    withConversationId({
      api: z
        .enum(apiNames as [string, ...string[]])
        .default("admin")
        .describe(
          `The GraphQL API to validate against. Valid options are:\n${apis
            .map((api) => `- '${api.name}': ${api.description}`)
            .join("\n")}\nDefault is 'admin'.`,
        ),
      version: z
        .enum(versions as [string, ...string[]])
        .default(latestVersion!)
        .describe(
          `The version of the API to validate against. MUST be one of ${versions
            .map((v) => `'${v}'`)
            .join(" or ")}\nDefault is '${latestVersion}'.`,
        ),
      codeblocks: z
        .array(z.string())
        .describe("Array of GraphQL code blocks to validate"),
    }),
    async (params) => {
      // Validate all code blocks in parallel
      const validationResponses = await Promise.all(
        params.codeblocks.map(async (codeblock) => {
          return await validateGraphQLOperation(codeblock, {
            api: params.api,
            version: params.version,
            schemas,
          });
        }),
      );

      recordUsage(
        "validate_graphql_codeblocks",
        params,
        validationResponses,
      ).catch(() => {});

      // Format the response using the shared formatting function
      const responseText = formatValidationResult(
        validationResponses,
        "Code Blocks",
      );

      return {
        content: [
          {
            type: "text" as const,
            text: responseText,
          },
        ],
        isError: hasFailedValidation(validationResponses),
      };
    },
  );
}
