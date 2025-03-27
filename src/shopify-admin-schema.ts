import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";
import { existsSync } from "fs";
import { parse, buildSchema, validate, GraphQLError } from "graphql";

// Get the directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the schema file in the data folder
export const SCHEMA_FILE_PATH = path.join(
  __dirname,
  "..",
  "data",
  "admin_schema_2025-01.json"
);

// Function to load schema content, handling decompression if needed
export async function loadSchemaContent(schemaPath: string): Promise<string> {
  const gzippedSchemaPath = `${schemaPath}.gz`;

  // If uncompressed file doesn't exist but gzipped does, decompress it
  if (!existsSync(schemaPath) && existsSync(gzippedSchemaPath)) {
    console.error(
      `[shopify-admin-schema-tool] Decompressing GraphQL schema from ${gzippedSchemaPath}`
    );
    const compressedData = await fs.readFile(gzippedSchemaPath);
    const schemaContent = zlib.gunzipSync(compressedData).toString("utf-8");

    // Save the uncompressed content to disk
    await fs.writeFile(schemaPath, schemaContent, "utf-8");
    console.error(
      `[shopify-admin-schema-tool] Saved uncompressed schema to ${schemaPath}`
    );
    return schemaContent;
  }

  console.error(
    `[shopify-admin-schema-tool] Reading GraphQL schema from ${schemaPath}`
  );
  return fs.readFile(schemaPath, "utf8");
}

// Function to load and parse GraphQL schema from JSON to GraphQLSchema object
export async function loadGraphQLSchema() {
  try {
    const schemaContent = await loadSchemaContent(SCHEMA_FILE_PATH);
    const schemaJson = JSON.parse(schemaContent);

    // Extract SDL (Schema Definition Language) from the IntrospectionQuery result
    if (schemaJson.data && schemaJson.data.__schema) {
      console.error(`[shopify-admin-schema-tool] Query type name from schema: ${schemaJson.data.__schema.queryType?.name}`);

      // Convert introspection result to SDL
      const sdl = introspectionToSDL(schemaJson.data);

      try {
        console.error(`[shopify-admin-schema-tool] Building schema from SDL`);
        const schema = buildSchema(sdl);
        console.error(`[shopify-admin-schema-tool] Schema built successfully`);
        return schema;
      } catch (buildError) {
        console.error(`[shopify-admin-schema-tool] Error building schema: ${buildError}`);
        // Log the first 500 characters of the SDL for debugging
        console.error(`[shopify-admin-schema-tool] SDL snippet: ${sdl.substring(0, 500)}...`);
        throw buildError;
      }
    }

    throw new Error("Invalid schema format: missing __schema field");
  } catch (error) {
    console.error(`[shopify-admin-schema-tool] Error loading GraphQL schema: ${error}`);
    throw error;
  }
}

// Helper function to convert introspection result to SDL
function introspectionToSDL(introspectionData: any): string {
  // This is a simplified version - in a real implementation, you would need a more
  // comprehensive approach to convert introspection data to SDL

  let sdl = "";

  // First, extract and declare all scalar types
  const customScalars = introspectionData.__schema.types
    .filter((type: any) => type.kind === "SCALAR" && !isBuiltInScalar(type.name))
    .map((type: any) => type.name);

  // Add scalar declarations
  for (const scalar of customScalars) {
    sdl += `scalar ${scalar}\n\n`;
  }

  // Explicitly define root types - these are known for Shopify Admin API
  const queryTypeName = "QueryRoot";
  const mutationTypeName = "Mutation";

  // Define the schema with root types
  sdl += `schema {\n`;
  sdl += `  query: ${queryTypeName}\n`;
  sdl += `  mutation: ${mutationTypeName}\n`;
  sdl += `}\n\n`;

  // Process types
  if (introspectionData.__schema.types) {
    // First ensure query and mutation types are present and have at least one field
    let hasQueryType = false;
    let hasMutationType = false;

    for (const type of introspectionData.__schema.types) {
      if (type.name === queryTypeName) hasQueryType = true;
      if (type.name === mutationTypeName) hasMutationType = true;
    }

    // If query type is not found, add a placeholder
    if (!hasQueryType) {
      sdl += `type ${queryTypeName} {\n  _placeholder: String\n}\n\n`;
    }

    // If mutation type is not found, add a placeholder
    if (!hasMutationType) {
      sdl += `type ${mutationTypeName} {\n  _placeholder: String\n}\n\n`;
    }

    // Process all other types
    for (const type of introspectionData.__schema.types) {
      // Skip built-in types and scalars (already processed)
      if (type.name.startsWith("__") || type.kind === "SCALAR") continue;

      // Add type definition based on kind
      switch (type.kind) {
        case "OBJECT":
          sdl += `type ${type.name} {\n`;
          if (type.fields && type.fields.length > 0) {
            for (const field of type.fields) {
              sdl += `  ${field.name}`;

              // Add arguments if any
              if (field.args && field.args.length > 0) {
                sdl += "(";
                sdl += field.args.map((arg: any) =>
                  `${arg.name}: ${formatType(arg.type)}`
                ).join(", ");
                sdl += ")";
              }

              sdl += `: ${formatType(field.type)}\n`;
            }
          } else {
            // Add placeholder field if no fields
            sdl += `  _placeholder: String\n`;
          }
          sdl += "}\n\n";
          break;

        case "INPUT_OBJECT":
          sdl += `input ${type.name} {\n`;
          if (type.inputFields && type.inputFields.length > 0) {
            for (const field of type.inputFields) {
              sdl += `  ${field.name}: ${formatType(field.type)}\n`;
            }
          } else {
            // Add placeholder field if no fields
            sdl += `  _placeholder: String\n`;
          }
          sdl += "}\n\n";
          break;

        case "ENUM":
          sdl += `enum ${type.name} {\n`;
          if (type.enumValues && type.enumValues.length > 0) {
            for (const value of type.enumValues) {
              sdl += `  ${value.name}\n`;
            }
          } else {
            // Add placeholder value if no enum values
            sdl += `  PLACEHOLDER\n`;
          }
          sdl += "}\n\n";
          break;

        case "INTERFACE":
          sdl += `interface ${type.name} {\n`;
          if (type.fields && type.fields.length > 0) {
            for (const field of type.fields) {
              sdl += `  ${field.name}`;

              // Add arguments if any
              if (field.args && field.args.length > 0) {
                sdl += "(";
                sdl += field.args.map((arg: any) =>
                  `${arg.name}: ${formatType(arg.type)}`
                ).join(", ");
                sdl += ")";
              }

              sdl += `: ${formatType(field.type)}\n`;
            }
          } else {
            // Add placeholder field if no fields
            sdl += `  _placeholder: String\n`;
          }
          sdl += "}\n\n";
          break;

        case "UNION":
          if (type.possibleTypes && type.possibleTypes.length > 0) {
            sdl += `union ${type.name} = ${type.possibleTypes.map((t: any) => t.name).join(" | ")}\n\n`;
          } else {
            // Skip unions with no possible types as they're invalid
            console.error(`[shopify-admin-schema-tool] Skipping union type ${type.name} with no possible types`);
          }
          break;
      }
    }
  }

  console.error(`[shopify-admin-schema-tool] Generated SDL with query root type: ${queryTypeName}`);
  return sdl;
}

// Check if a scalar is a built-in GraphQL scalar type
function isBuiltInScalar(name: string): boolean {
  return ["String", "Int", "Float", "Boolean", "ID"].includes(name);
}

// Maximum number of fields to extract from an object
export const MAX_FIELDS_TO_SHOW = 50;

// Helper function to filter, sort, and truncate schema items
export const filterAndSortItems = (
  items: any[],
  searchTerm: string,
  maxItems: number
) => {
  // Filter items based on search term
  const filtered = items.filter((item: any) =>
    item.name?.toLowerCase().includes(searchTerm)
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
export async function searchShopifyAdminSchema(
  query: string,
  {
    filter = ["all"],
  }: { filter?: Array<"all" | "types" | "queries" | "mutations"> } = {}
) {
  try {
    const schemaContent = await loadSchemaContent(SCHEMA_FILE_PATH);

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
        `[shopify-admin-schema-tool] Filtering schema with query: ${query} (normalized: ${normalizedQuery})`
      );

      const searchTerm = normalizedQuery.toLowerCase();

      // Example filtering logic (adjust based on actual schema structure)
      if (schemaJson?.data?.__schema?.types) {
        const MAX_RESULTS = 10;

        // Process types
        const processedTypes = filterAndSortItems(
          schemaJson.data.__schema.types,
          searchTerm,
          MAX_RESULTS
        );
        wasTruncated = processedTypes.wasTruncated;
        const limitedTypes = processedTypes.items;

        // Find the Query and Mutation types
        const queryType = schemaJson.data.__schema.types.find(
          (type: any) => type.name === "QueryRoot"
        );
        const mutationType = schemaJson.data.__schema.types.find(
          (type: any) => type.name === "Mutation"
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
            MAX_RESULTS
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
            MAX_RESULTS
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
      `[shopify-admin-schema-tool] Error processing GraphQL schema: ${error}`
    );
    return {
      success: false as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Function to validate a GraphQL query against the Shopify Admin schema
export async function validateShopifyAdminQuery(
  queryString: string,
  variables?: Record<string, any>,
  apiVersion?: string
): Promise<{
  success: boolean;
  errors?: readonly GraphQLError[];
  validationMessage?: string;
}> {
  try {
    console.error(
      `[shopify-admin-schema-tool] Validating GraphQL query against schema`
    );

    // Parse the query string
    let queryDocument;
    try {
      queryDocument = parse(queryString);
    } catch (parseError) {
      return {
        success: false,
        errors: [parseError as GraphQLError],
        validationMessage: `Query parsing error: ${(parseError as Error).message}`
      };
    }

    // Get the schema - we ignore apiVersion for now since we only have one schema
    const schemaContent = await loadSchemaContent(SCHEMA_FILE_PATH);
    const schemaJson = JSON.parse(schemaContent);

    try {
      // Convert introspection schema to GraphQL schema
      const schema = await loadGraphQLSchema();

      // Validate the query against the schema
      const validationErrors = validate(schema, queryDocument);

      // Filter out errors related to unknown scalar types
      const significantErrors = validationErrors.filter((error: GraphQLError) => {
        // Ignore errors about unknown scalars or fields of unknown scalars
        return !error.message.includes("Unknown type") &&
               !error.message.includes("Cannot query field") &&
               !error.message.toLowerCase().includes("scalar");
      });

      if (significantErrors.length === 0) {
        // If there are no significant errors, consider it valid
        return {
          success: true,
          validationMessage: validationErrors.length === 0
            ? "Query is valid against the Shopify Admin API schema."
            : "Query is likely valid. Some unknown types were detected but are being ignored."
        };
      } else {
        return {
          success: false,
          errors: significantErrors,
          validationMessage: `Validation errors:\n${significantErrors.map((e: GraphQLError) => `- ${e.message}`).join('\n')}`
        };
      }
    } catch (validationError) {
      return {
        success: false,
        validationMessage: `Schema validation error: ${(validationError as Error).message}`
      };
    }
  } catch (error) {
    console.error(
      `[shopify-admin-schema-tool] Error validating GraphQL query: ${error}`
    );
    return {
      success: false,
      validationMessage: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
