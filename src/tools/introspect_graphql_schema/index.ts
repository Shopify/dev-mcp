import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shopifyDevFetch } from "../shopify_dev_fetch/index.js";
import { withConversationId } from "../index.js";
import { recordUsage } from "../../instrumentation.js";
import { z } from "zod";
type GraphQLSchemasResponse = z.infer<typeof GraphQLSchemasResponseSchema>;

// Schema for individual GraphQL schema objects
const GraphQLSchemaSchema = z.object({
  id: z.string(),
  version: z.string(),
  url: z.string(),
});

// Schema for API objects
const APISchema = z.object({
  name: z.string(),
  description: z.string(),
  schemas: z.array(GraphQLSchemaSchema),
});

// Schema for the complete GraphQL schemas response
const GraphQLSchemasResponseSchema = z.object({
  latest_version: z.string(),
  apis: z.array(APISchema),
});

let memoized: ReturnType<typeof fetchGraphQLSchemas> | null = null;

/**
 * Fetches available GraphQL schemas from Shopify
 * @returns Object containing available APIs and versions
 */
export async function fetchGraphQLSchemas(): Promise<{
  schemas: { api: string; id: string; version: string; url: string }[];
  apis: { name: string; description: string }[];
  versions: string[];
  latestVersion?: string;
}> {
  if (memoized) return memoized;
  memoized = (async () => {
    try {
      const responseText = await shopifyDevFetch("/mcp/graphql_schemas");

      let parsedResponse: GraphQLSchemasResponse;
      try {
        const jsonData = JSON.parse(responseText);
        parsedResponse = GraphQLSchemasResponseSchema.parse(jsonData);
      } catch (parseError) {
        console.error(`Error parsing schemas JSON: ${parseError}`);
        console.error(`Response text: ${responseText.substring(0, 500)}...`);
        return {
          schemas: [],
          apis: [],
          versions: [],
        };
      }

      // Extract unique APIs and versions
      const apisMap = new Map<string, { name: string; description: string }>();
      const versions = new Set<string>();
      const schemas: {
        api: string;
        id: string;
        version: string;
        url: string;
      }[] = [];

      parsedResponse.apis.forEach((api) => {
        apisMap.set(api.name, { name: api.name, description: api.description });

        api.schemas.forEach((schema) => {
          versions.add(schema.version);
          schemas.push({
            api: api.name,
            id: schema.id,
            version: schema.version,
            url: schema.url,
          });
        });
      });

      return {
        schemas,
        apis: Array.from(apisMap.values()),
        versions: Array.from(versions),
        latestVersion: parsedResponse.latest_version,
      };
    } catch (error) {
      console.error(`Error fetching schemas: ${error}`);
      return {
        schemas: [],
        apis: [],
        versions: [],
      };
    }
  })();
  return memoized;
}

export type Schema = {
  api: string;
  id: string;
  version: string;
  url: string;
};

// Path to the schemas cache directory
export const SCHEMAS_CACHE_DIR = fileURLToPath(
  new URL(/* @vite-ignore */ "../../../data", import.meta.url),
);

// Function to get the schema ID for a specific API
export async function getSchema(
  api: string,
  version: string,
  schemas: Schema[] = [],
): Promise<Schema> {
  const matchingSchema = schemas.find(
    (schema) => schema.api === api && (!version || schema.version === version),
  );

  if (!matchingSchema) {
    const supportedSchemas = schemas
      .map((schema) => `${schema.api} (${schema.version})`)
      .join(", ");

    throw new Error(
      `Schema configuration for API "${api}"${
        version ? ` version "${version}"` : ""
      } not found in provided schemas. Currently supported schemas: ${supportedSchemas}`,
    );
  }

  return matchingSchema;
}

// Function to load schema content from the API or cache
export async function loadSchemaContent(schema: Schema): Promise<string> {
  // Ensure cache directory exists
  await fs.mkdir(SCHEMAS_CACHE_DIR, { recursive: true });

  const cacheFilePath = path.join(SCHEMAS_CACHE_DIR, `${schema.id}.json`);

  try {
    // Check if we have a cached version
    if (existsSync(cacheFilePath)) {
      console.error(
        `[introspect-graphql-schema] Reading cached schema from ${cacheFilePath}`,
      );
      return fs.readFile(cacheFilePath, "utf-8");
    }

    console.error(
      `[introspect-graphql-schema] Fetching schema from API for ${schema.id}`,
    );

    const schemaContent = await shopifyDevFetch(schema.url, {
      headers: {
        "Accept-Encoding": "gzip",
      },
    });

    // Cache the schema content
    await fs.writeFile(cacheFilePath, schemaContent, "utf-8");
    console.error(
      `[introspect-graphql-schema] Cached schema to ${cacheFilePath}`,
    );

    return schemaContent;
  } catch (error) {
    console.error(`[introspect-graphql-schema] Error loading schema: ${error}`);
    throw error;
  }
}

// Maximum number of fields to extract from an object
export const MAX_FIELDS_TO_SHOW = 50;

// Helper function to filter, sort, and truncate schema items
export const filterAndSortItems = (
  items: any[],
  searchTerm: string,
  maxItems: number,
) => {
  // Filter items based on search term
  const filtered = items.filter((item: any) =>
    item.name?.toLowerCase().includes(searchTerm),
  );

  // Sort filtered items by name length (shorter names first)
  filtered.sort((a: any, b: any) => {
    if (!a.name) return 1;
    if (!b.name) return -1;
    return a.name.length - b.name.length;
  });

  // Return truncation info and limited items
  return {
    wasTruncated: filtered.length > maxItems,
    items: filtered.slice(0, maxItems),
  };
};

// Helper functions to format GraphQL schema types as plain text
export const formatType = (type: any): string => {
  if (!type) return "null";

  if (type.kind === "NON_NULL") {
    return `${formatType(type.ofType)}!`;
  } else if (type.kind === "LIST") {
    return `[${formatType(type.ofType)}]`;
  } else {
    return type.name;
  }
};

export const formatArg = (arg: any): string => {
  return `${arg.name}: ${formatType(arg.type)}${
    arg.defaultValue !== null ? ` = ${arg.defaultValue}` : ""
  }`;
};

export const formatField = (field: any): string => {
  let result = `  ${field.name}`;

  // Add arguments if present
  if (field.args && field.args.length > 0) {
    result += `(${field.args.map(formatArg).join(", ")})`;
  }

  result += `: ${formatType(field.type)}`;

  // Add deprecation info if present
  if (field.isDeprecated) {
    result += ` @deprecated`;
    if (field.deprecationReason) {
      result += ` (${field.deprecationReason})`;
    }
  }

  return result;
};

export const formatSchemaType = (item: any): string => {
  let result = `${item.kind} ${item.name}`;

  if (item.description) {
    // Truncate description if too long
    const maxDescLength = 150;
    const desc = item.description.replace(/\n/g, " ");
    result += `\n  Description: ${
      desc.length > maxDescLength
        ? desc.substring(0, maxDescLength) + "..."
        : desc
    }`;
  }

  // Add interfaces if present
  if (item.interfaces && item.interfaces.length > 0) {
    result += `\n  Implements: ${item.interfaces
      .map((i: any) => i.name)
      .join(", ")}`;
  }

  // For INPUT_OBJECT types, use inputFields instead of fields
  if (
    item.kind === "INPUT_OBJECT" &&
    item.inputFields &&
    item.inputFields.length > 0
  ) {
    result += "\n  Input Fields:";
    // Extract at most MAX_FIELDS_TO_SHOW fields
    const fieldsToShow = item.inputFields.slice(0, MAX_FIELDS_TO_SHOW);
    for (const field of fieldsToShow) {
      result += `\n${formatField(field)}`;
    }
    if (item.inputFields.length > MAX_FIELDS_TO_SHOW) {
      result += `\n  ... and ${
        item.inputFields.length - MAX_FIELDS_TO_SHOW
      } more input fields`;
    }
  }
  // For regular object types, use fields
  else if (item.fields && item.fields.length > 0) {
    result += "\n  Fields:";
    // Extract at most MAX_FIELDS_TO_SHOW fields
    const fieldsToShow = item.fields.slice(0, MAX_FIELDS_TO_SHOW);
    for (const field of fieldsToShow) {
      result += `\n${formatField(field)}`;
    }
    if (item.fields.length > MAX_FIELDS_TO_SHOW) {
      result += `\n  ... and ${
        item.fields.length - MAX_FIELDS_TO_SHOW
      } more fields`;
    }
  }

  return result;
};

export const formatGraphqlOperation = (query: any): string => {
  let result = `${query.name}`;

  if (query.description) {
    // Truncate description if too long
    const maxDescLength = 100;
    const desc = query.description.replace(/\n/g, " ");
    result += `\n  Description: ${
      desc.length > maxDescLength
        ? desc.substring(0, maxDescLength) + "..."
        : desc
    }`;
  }

  // Add arguments if present
  if (query.args && query.args.length > 0) {
    result += "\n  Arguments:";
    for (const arg of query.args) {
      result += `\n    ${formatArg(arg)}`;
    }
  }

  // Add return type
  result += `\n  Returns: ${formatType(query.type)}`;

  return result;
};

// Function to search and format schema data
export async function introspectGraphqlSchema(
  query: string,
  {
    schemas = [],
    api = "admin",
    version = "2025-01",
    filter = ["all"],
  }: {
    schemas?: Schema[];
    api?: string;
    version?: string;
    filter?: Array<"all" | "types" | "queries" | "mutations">;
  } = {},
) {
  try {
    // Get the schema ID based on the API and version from provided schemas
    const schema = await getSchema(api, version, schemas);

    // Load the schema content from the API or the cache
    const schemaContent = await loadSchemaContent(schema);

    // Parse the schema content
    const schemaJson = JSON.parse(schemaContent);

    // If a query is provided, filter the schema
    let resultSchema = schemaJson;
    let wasTruncated = false;
    let queriesWereTruncated = false;
    let mutationsWereTruncated = false;

    if (query && query.trim()) {
      // Normalize search term: remove trailing 's' and remove all spaces
      let normalizedQuery = query.trim();
      if (normalizedQuery.endsWith("s")) {
        normalizedQuery = normalizedQuery.slice(0, -1);
      }
      normalizedQuery = normalizedQuery.replace(/\s+/g, "");

      console.error(
        `[introspect-graphql-schema] Filtering schema with query: ${query} (normalized: ${normalizedQuery})`,
      );

      const searchTerm = normalizedQuery.toLowerCase();

      // Example filtering logic (adjust based on actual schema structure)
      if (schemaJson?.data?.__schema?.types) {
        const MAX_RESULTS = 10;

        // Process types
        const processedTypes = filterAndSortItems(
          schemaJson.data.__schema.types,
          searchTerm,
          MAX_RESULTS,
        );
        wasTruncated = processedTypes.wasTruncated;
        const limitedTypes = processedTypes.items;

        // Find the Query and Mutation types
        const queryType = schemaJson.data.__schema.types.find(
          (type: any) => type.name === "QueryRoot",
        );
        const mutationType = schemaJson.data.__schema.types.find(
          (type: any) => type.name === "Mutation",
        );

        // Process queries if available
        let matchingQueries: any[] = [];
        if (
          queryType &&
          queryType.fields &&
          (filter.includes("all") || filter.includes("queries"))
        ) {
          const processedQueries = filterAndSortItems(
            queryType.fields,
            searchTerm,
            MAX_RESULTS,
          );
          queriesWereTruncated = processedQueries.wasTruncated;
          matchingQueries = processedQueries.items;
        }

        // Process mutations if available
        let matchingMutations: any[] = [];
        if (
          mutationType &&
          mutationType.fields &&
          (filter.includes("all") || filter.includes("mutations"))
        ) {
          const processedMutations = filterAndSortItems(
            mutationType.fields,
            searchTerm,
            MAX_RESULTS,
          );
          mutationsWereTruncated = processedMutations.wasTruncated;
          matchingMutations = processedMutations.items;
        }

        // Create a modified schema that includes matching types
        resultSchema = {
          data: {
            __schema: {
              ...schemaJson.data.__schema,
              types: limitedTypes,
              matchingQueries,
              matchingMutations,
            },
          },
        };
      }
    }

    // Create the response text with truncation message if needed
    let responseText = "";

    if (filter.includes("all") || filter.includes("types")) {
      responseText += "## Matching GraphQL Types:\n";
      if (wasTruncated) {
        responseText += `(Results limited to 10 items. Refine your search for more specific results.)\n\n`;
      }

      if (resultSchema.data.__schema.types.length > 0) {
        responseText +=
          resultSchema.data.__schema.types.map(formatSchemaType).join("\n\n") +
          "\n\n";
      } else {
        responseText += "No matching types found.\n\n";
      }
    }

    // Add queries section if showing all or queries
    if (filter.includes("all") || filter.includes("queries")) {
      responseText += "## Matching GraphQL Queries:\n";
      if (queriesWereTruncated) {
        responseText += `(Results limited to 10 items. Refine your search for more specific results.)\n\n`;
      }

      if (resultSchema.data.__schema.matchingQueries?.length > 0) {
        responseText +=
          resultSchema.data.__schema.matchingQueries
            .map(formatGraphqlOperation)
            .join("\n\n") + "\n\n";
      } else {
        responseText += "No matching queries found.\n\n";
      }
    }

    // Add mutations section if showing all or mutations
    if (filter.includes("all") || filter.includes("mutations")) {
      responseText += "## Matching GraphQL Mutations:\n";
      if (mutationsWereTruncated) {
        responseText += `(Results limited to 10 items. Refine your search for more specific results.)\n\n`;
      }

      if (resultSchema.data.__schema.matchingMutations?.length > 0) {
        responseText += resultSchema.data.__schema.matchingMutations
          .map(formatGraphqlOperation)
          .join("\n\n");
      } else {
        responseText += "No matching mutations found.";
      }
    }

    return { success: true as const, responseText };
  } catch (error) {
    console.error(
      `[introspect-graphql-schema] Error processing GraphQL schema: ${error}`,
    );
    return {
      success: false as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default async function mcpTool(server: McpServer) {
  const { schemas, apis, versions, latestVersion } =
    await fetchGraphQLSchemas();

  // Extract just the API names for enum definitions
  const apiNames = apis.map((api) => api.name);

  server.tool(
    "introspect_graphql_schema",
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
          "Filter results to show specific sections. Valid values are 'types', 'queries', 'mutations', or 'all' (default)",
        ),
      api: z
        .enum(apiNames as [string, ...string[]])
        .optional()
        .default("admin")
        .describe(
          `The API to introspect. Valid options are:\n${apis
            .map((api) => `- '${api.name}': ${api.description}`)
            .join("\n")}\nDefault is 'admin'.`,
        ),
      version: z
        .enum(versions as [string, ...string[]])
        .optional()
        .default(latestVersion!)
        .describe(
          `The version of the API to introspect. MUST be one of ${versions
            .map((v) => `'${v}'`)
            .join(" or ")}. Default is '${latestVersion}'.`,
        ),
    }),
    async (params) => {
      const result = await introspectGraphqlSchema(params.query, {
        schemas: schemas,
        api: params.api,
        version: params.version,
        filter: params.filter,
      });

      recordUsage(
        "introspect_graphql_schema",
        params,
        result.responseText,
      ).catch(() => {});

      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? result.responseText
              : `Error processing Shopify GraphQL schema: ${result.error}. Make sure the schema file exists.`,
          },
        ],
        isError: !result.success,
      };
    },
  );
}
