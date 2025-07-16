import { buildClientSchema, parse, validate } from "graphql";
import { fileURLToPath } from "node:url";
import { loadSchemaContent } from "../tools/introspectGraphqlSchema.js";
import { ValidationResponse, ValidationResult } from "../types.js";

// ============================================================================
// Schema Configuration
// ============================================================================

/**
 * Mapping of schema names to their file paths
 */
const SCHEMA_MAPPINGS = {
  admin: fileURLToPath(
    new URL("../../data/admin_schema_2025-01.json", import.meta.url),
  ),
} as const;

type SupportedSchemaName = keyof typeof SCHEMA_MAPPINGS;

// ============================================================================
// Public API
// ============================================================================

/**
 * Validates a GraphQL operation against the specified schema
 *
 * @param graphqlCode - The raw GraphQL operation code
 * @param schemaName - The name of the schema (currently supports 'admin' for Shopify Admin API)
 * @returns ValidationResponse indicating the status of the validation
 */
export default async function validateGraphQLOperation(
  graphqlCode: string,
  schemaName: string,
): Promise<ValidationResponse> {
  try {
    const schemaValidation = validateSchemaIsSupported(schemaName);
    if (schemaValidation) return schemaValidation;

    const trimmedCode = graphqlCode.trim();
    if (!trimmedCode) {
      return validationResult(
        ValidationResult.FAILED,
        "No GraphQL operation found in the provided code.",
      );
    }

    return await performGraphQLValidation(
      graphqlCode,
      schemaName as SupportedSchemaName,
    );
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

function validateSchemaName(
  schemaName: string,
): schemaName is SupportedSchemaName {
  return schemaName in SCHEMA_MAPPINGS;
}

function getSchemaPath(schemaName: SupportedSchemaName): string {
  return SCHEMA_MAPPINGS[schemaName];
}

async function loadAndBuildGraphQLSchema(schemaName: SupportedSchemaName) {
  const schemaPath = getSchemaPath(schemaName);
  const schemaContent = await loadSchemaContent(schemaPath);
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

function validateSchemaIsSupported(
  schemaName: string,
): ValidationResponse | null {
  if (!validateSchemaName(schemaName)) {
    const supportedSchemas = Object.keys(SCHEMA_MAPPINGS).join(", ");
    return validationResult(
      ValidationResult.FAILED,
      `Unsupported schema name: ${schemaName}. Currently supported schemas: ${supportedSchemas}`,
    );
  }
  return null;
}

async function performGraphQLValidation(
  graphqlCode: string,
  schemaName: SupportedSchemaName,
): Promise<ValidationResponse> {
  const operation = graphqlCode.trim();
  const schema = await loadAndBuildGraphQLSchema(schemaName);

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
    `Successfully validated GraphQL ${operationType} against ${schemaName} schema.`,
  );
}
