import { buildClientSchema, GraphQLSchema, parse, validate } from "graphql";
import {
  getSchema,
  loadSchemaContent,
  type Schema,
} from "../tools/introspect_graphql_schema/index.js";
import { ValidationResponse, ValidationResult } from "../types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for GraphQL validation
 */
export interface GraphQLValidationOptions {
  /** The name of the API (e.g. 'admin' for Shopify Admin API) */
  api: string;
  /** The version of the schema to validate against */
  version: string;
  /** Array of available schemas */
  schemas?: Schema[];
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Validates a GraphQL operation against the specified schema
 *
 * @param graphqlCode - The raw GraphQL operation code
 * @param options - Validation options containing api, version, and schemas
 * @returns ValidationResponse indicating the status of the validation
 */
export default async function validateGraphQLOperation(
  graphqlCode: string,
  options: GraphQLValidationOptions,
): Promise<ValidationResponse> {
  const { api, version, schemas = [] } = options;

  try {
    const trimmedCode = graphqlCode.trim();
    if (!trimmedCode) {
      return validationResult(
        ValidationResult.FAILED,
        "No GraphQL operation found in the provided code.",
      );
    }

    // Get the schema directly, which will throw if not found
    const schemaObj = await getSchema(api, version, schemas);
    const schema = await loadAndBuildGraphQLSchema(schemaObj);

    return await performGraphQLValidation(trimmedCode, schema);
  } catch (error) {
    return validationResult(
      ValidationResult.FAILED,
      `Validation error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// ============================================================================
// Private Implementation Details
// ============================================================================

function validationResult(
  result: ValidationResult,
  resultDetail: string,
): ValidationResponse {
  return { result, resultDetail };
}

async function loadAndBuildGraphQLSchema(
  schema: Schema,
): Promise<GraphQLSchema> {
  const schemaContent = await loadSchemaContent(schema);
  const schemaJson = JSON.parse(schemaContent);
  return buildClientSchema(schemaJson.data);
}

function parseGraphQLDocument(
  operation: string,
): { success: true; document: any } | { success: false; error: string } {
  try {
    const document = parse(operation);
    return { success: true, document };
  } catch (parseError) {
    return {
      success: false,
      error:
        parseError instanceof Error ? parseError.message : String(parseError),
    };
  }
}

function validateGraphQLAgainstSchema(schema: any, document: any): string[] {
  const validationErrors = validate(schema, document);
  return validationErrors.map((e) => e.message);
}

function getOperationType(document: any): string {
  if (document.definitions.length > 0) {
    const operationDefinition = document.definitions[0];
    if (operationDefinition.kind === "OperationDefinition") {
      return operationDefinition.operation;
    }
  }
  return "operation";
}

async function performGraphQLValidation(
  graphqlCode: string,
  schema: GraphQLSchema,
): Promise<ValidationResponse> {
  const operation = graphqlCode.trim();

  const parseResult = parseGraphQLDocument(operation);
  if (parseResult.success === false) {
    return validationResult(
      ValidationResult.FAILED,
      `GraphQL syntax error: ${parseResult.error}`,
    );
  }

  const validationErrors = validateGraphQLAgainstSchema(
    schema,
    parseResult.document,
  );
  if (validationErrors.length > 0) {
    return validationResult(
      ValidationResult.FAILED,
      `GraphQL validation errors: ${validationErrors.join("; ")}`,
    );
  }

  const operationType = getOperationType(parseResult.document);
  return validationResult(
    ValidationResult.SUCCESS,
    `Successfully validated GraphQL ${operationType} against schema.`,
  );
}
