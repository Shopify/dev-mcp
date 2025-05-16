import { buildClientSchema, validate, parse, GraphQLError } from "graphql";
import { loadSchemaContent } from "./shopify-admin-schema.js";
import { SCHEMA_FILE_PATH } from "./shopify-admin-schema.js";

/**
 * Interface for GraphQL validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: readonly GraphQLError[];
}

/**
 * Validates GraphQL code against the local Shopify Admin GraphQL schema
 * @param code The GraphQL code to validate
 * @returns Promise resolving to a ValidationResult object containing validation status and any errors
 */
export async function validateGraphQL(code: string): Promise<ValidationResult> {
  try {
    // Load schema content from the local schema file
    const schemaContent = await loadSchemaContent(SCHEMA_FILE_PATH);

    // Parse the schema content
    const schemaJson = JSON.parse(schemaContent);

    // Build a GraphQL schema from the JSON
    const schema = buildClientSchema(schemaJson.data);

    // Parse the GraphQL code into an AST
    const documentAST = parse(code);

    // Validate the document against the schema
    const validationErrors = validate(schema, documentAST);

    // Return validation result
    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors.length > 0 ? validationErrors : undefined,
    };
  } catch (error) {
    // Handle parsing or other errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Create a GraphQL error to maintain consistent error format
    const graphqlError = new GraphQLError(
      `GraphQL validation error: ${errorMessage}`,
      { originalError: error instanceof Error ? error : undefined },
    );

    return {
      isValid: false,
      errors: [graphqlError],
    };
  }
}

/**
 * Format validation errors into a human-readable string
 * @param errors Array of GraphQL errors
 * @returns Formatted error message string
 */
export function formatValidationErrors(
  errors: readonly GraphQLError[],
): string {
  return errors
    .map((error, index) => {
      let message = `${index + 1}. ${error.message}`;

      // Add location information if available
      if (error.locations && error.locations.length > 0) {
        const location = error.locations[0];
        message += ` (Line ${location.line}, Column ${location.column})`;
      }

      return message;
    })
    .join("\n");
}
