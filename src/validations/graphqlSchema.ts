import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { parse, validate, buildClientSchema, GraphQLError } from "graphql";
import { loadSchemaContent } from "../tools/shopify-admin-schema.js";
import { ValidationResult, ValidationFunctionResult } from "../types.js";
import type { ValidationResponse } from "../types.js";

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
 * Validates GraphQL operations from a markdown response against the specified schema
 *
 * @param markdownResponse - The markdown response containing GraphQL codeblocks
 * @param schemaName - The name of the schema (currently supports 'admin' for Shopify Admin API)
 * @returns ValidationFunctionResult with overall status and detailed checks for each codeblock
 */
export default async function validateGraphQLOperation(
  markdownResponse: string,
  schemaName: string,
): Promise<ValidationFunctionResult> {
  try {
    const schemaValidationResult = checkSchemaSupport(schemaName);
    if (schemaValidationResult) {
      return createFailedResult([schemaValidationResult]);
    }

    const codeblocks = extractGraphQLCodeblocks(markdownResponse);

    const noCodeblocksResult = handleNoCodeblocksFound(codeblocks);
    if (noCodeblocksResult) {
      return noCodeblocksResult;
    }

    return await validateAllCodeblocks(
      codeblocks,
      schemaName as SupportedSchemaName,
    );
  } catch (error) {
    return createFailedResult([
      validationResult(
        ValidationResult.FAILED,
        `Validation error: ${error instanceof Error ? error.message : String(error)}`,
      ),
    ]);
  }
}

// ============================================================================
// Private Implementation Details
// ============================================================================

function checkSchemaSupport(schemaName: string): ValidationResponse | null {
  return validateSchemaIsSupported(schemaName);
}

function handleNoCodeblocksFound(
  codeblocks: string[],
): ValidationFunctionResult | null {
  if (codeblocks.length === 0) {
    return createFailedResult([
      validationResult(
        ValidationResult.SKIPPED,
        "No GraphQL codeblocks found in the provided markdown response.",
      ),
    ]);
  }
  return null;
}

async function validateAllCodeblocks(
  codeblocks: string[],
  schemaName: SupportedSchemaName,
): Promise<ValidationFunctionResult> {
  const validationResponses = await Promise.all(
    codeblocks.map(async (codeblock) => {
      return await validateSingleGraphQLCodeblock(codeblock, schemaName);
    }),
  );

  return createValidationResult(validationResponses);
}

function createFailedResult(
  detailedChecks: ValidationResponse[],
): ValidationFunctionResult {
  return {
    valid: false,
    detailedChecks,
  };
}

function createValidationResult(
  validationResponses: ValidationResponse[],
): ValidationFunctionResult {
  return {
    valid: validationResponses.every(
      (response) => response.result === ValidationResult.SUCCESS,
    ),
    detailedChecks: validationResponses,
  };
}

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

function extractGraphQLCodeblocks(markdownResponse: string): string[] {
  const primaryResults = extractWithPrimaryRegex(markdownResponse);
  if (primaryResults.length > 0) {
    return primaryResults;
  }

  return extractWithFallbackRegex(markdownResponse);
}

function extractWithPrimaryRegex(markdownResponse: string): string[] {
  const primaryRegex =
    /```(?:graphql|gql|query|mutation|subscription)(?:\s+[\w\s]*?)?\s*\n?([\s\S]*?)\n?```/g;
  return extractCodeblocksWithRegex(markdownResponse, primaryRegex);
}

function extractWithFallbackRegex(markdownResponse: string): string[] {
  const fallbackRegex = /```(?:\w+\s*)?\s*\n?([\s\S]*?)\n?```/g;
  return extractCodeblocksWithRegex(markdownResponse, fallbackRegex).filter(
    (codeblock) => isLikelyGraphQLOperation(codeblock),
  );
}

function extractCodeblocksWithRegex(
  markdownResponse: string,
  regex: RegExp,
): string[] {
  const codeblocks: string[] = [];
  let match;

  while ((match = regex.exec(markdownResponse)) !== null) {
    const operation = match[1].trim();
    if (operation) {
      codeblocks.push(operation);
    }
  }

  return codeblocks;
}

function isLikelyGraphQLOperation(content: string): boolean {
  const graphqlKeywords = /^\s*(?:query|mutation|subscription|fragment)\s+/i;
  const graphqlSyntax =
    /(?:query|mutation|subscription|fragment)\s*(?:\w+\s*)?\{|^\s*\{/;

  return graphqlKeywords.test(content) || graphqlSyntax.test(content);
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

async function validateSingleGraphQLCodeblock(
  codeblock: string,
  schemaName: SupportedSchemaName,
): Promise<ValidationResponse> {
  const schema = await loadAndBuildGraphQLSchema(schemaName);

  const parseResult = parseGraphQLDocument(codeblock);
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
    `Successfully validated GraphQL ${operationType} against Shopify Admin API schema.`,
  );
}
