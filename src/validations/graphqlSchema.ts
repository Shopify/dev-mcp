import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { parse, validate, buildClientSchema, GraphQLError } from "graphql";
import { loadSchemaContent } from "../tools/shopify-admin-schema.js";
import { ValidationResult } from "../types.js";
import type { ValidationResponse } from "../types.js";

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
 * Validates a GraphQL operation from a markdown code block against the specified schema
 *
 * @param markdownCodeBlock - The markdown code block containing the GraphQL operation
 * @param schemaName - The name of the schema (currently supports 'admin' for Shopify Admin API)
 * @returns ValidationResponse indicating the status of the validation
 */
export default async function validateGraphQLOperation(
  markdownCodeBlock: string,
  schemaName: string,
): Promise<ValidationResponse> {
  try {
    return (
      validateSchemaIsSupported(schemaName) ||
      skipIfNoGraphQLFound(markdownCodeBlock) ||
      (await performGraphQLValidation(
        markdownCodeBlock,
        schemaName as SupportedSchemaName,
      ))
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

function extractGraphQLOperation(markdownCodeBlock: string): string | null {
  const operation = extractGraphQLFromMarkdown(markdownCodeBlock);

  if (!operation) {
    return null;
  }

  return operation;
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

function extractGraphQLFromMarkdown(markdownCodeBlock: string): string {
  const codeBlockRegex = /^```(?:graphql|gql)?\s*\n?([\s\S]*?)\n?```$/;
  const match = markdownCodeBlock.trim().match(codeBlockRegex);

  if (match) {
    return match[1].trim();
  }

  return markdownCodeBlock.trim();
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

function skipIfNoGraphQLFound(
  markdownCodeBlock: string,
): ValidationResponse | null {
  const operation = extractGraphQLOperation(markdownCodeBlock);
  if (operation === null) {
    return validationResult(
      ValidationResult.SKIPPED,
      "No GraphQL operation found in the provided markdown code block.",
    );
  }
  return null;
}

async function performGraphQLValidation(
  markdownCodeBlock: string,
  schemaName: SupportedSchemaName,
): Promise<ValidationResponse> {
  const operation = extractGraphQLOperation(markdownCodeBlock)!; // We know it exists from previous check
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
