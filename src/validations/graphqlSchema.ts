import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { parse, validate, buildSchema, GraphQLError } from "graphql";
import {
  loadSchemaContent,
  SCHEMA_FILE_PATH,
} from "../tools/shopify-admin-schema.js";
import { ValidationResult } from "../types.js";
import type { ValidationResponse } from "../types.js";

/**
 * Validates a GraphQL operation from a markdown code block against the Shopify Admin API schema
 *
 * @param markdownCodeBlock - The markdown code block containing the GraphQL operation
 * @param schemaName - The name of the schema (currently supports 'admin' for Shopify Admin API)
 * @returns ValidationResponse indicating the status of the validation
 */
export async function validateGraphQLOperation(
  markdownCodeBlock: string,
  schemaName: string,
): Promise<ValidationResponse> {
  try {
    return (
      validateSchemaIsSupported(schemaName) ||
      skipIfNoGraphQLFound(markdownCodeBlock) ||
      (await performGraphQLValidation(markdownCodeBlock))
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

function validateSchemaName(schemaName: string): boolean {
  return schemaName === "admin";
}

function extractGraphQLOperation(markdownCodeBlock: string): string | null {
  const operation = extractGraphQLFromMarkdown(markdownCodeBlock);

  if (!operation) {
    return null;
  }

  return operation;
}

async function loadAndBuildGraphQLSchema() {
  const schemaContent = await loadSchemaContent(SCHEMA_FILE_PATH);
  const schemaJson = JSON.parse(schemaContent);
  const sdl = introspectionToSDL(schemaJson);
  return buildSchema(sdl);
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

/**
 * Converts GraphQL introspection result to SDL (Schema Definition Language)
 */
function introspectionToSDL(introspectionResult: any): string {
  const schema = introspectionResult.data.__schema;

  let sdl = "";

  // Add scalar types
  const scalarTypes = schema.types.filter(
    (type: any) => type.kind === "SCALAR" && !type.name.startsWith("__"),
  );

  for (const scalar of scalarTypes) {
    if (!["String", "Int", "Float", "Boolean", "ID"].includes(scalar.name)) {
      sdl += `scalar ${scalar.name}\n\n`;
    }
  }

  // Add enum types
  const enumTypes = schema.types.filter((type: any) => type.kind === "ENUM");
  for (const enumType of enumTypes) {
    sdl += `enum ${enumType.name} {\n`;
    for (const value of enumType.enumValues || []) {
      sdl += `  ${value.name}\n`;
    }
    sdl += `}\n\n`;
  }

  // Add input types
  const inputTypes = schema.types.filter(
    (type: any) => type.kind === "INPUT_OBJECT",
  );
  for (const inputType of inputTypes) {
    sdl += `input ${inputType.name} {\n`;
    for (const field of inputType.inputFields || []) {
      sdl += `  ${field.name}: ${formatTypeForSDL(field.type)}\n`;
    }
    sdl += `}\n\n`;
  }

  // Add object types
  const objectTypes = schema.types.filter(
    (type: any) => type.kind === "OBJECT" && !type.name.startsWith("__"),
  );

  for (const objectType of objectTypes) {
    sdl += `type ${objectType.name}`;
    if (objectType.interfaces && objectType.interfaces.length > 0) {
      sdl += ` implements ${objectType.interfaces.map((i: any) => i.name).join(" & ")}`;
    }
    sdl += ` {\n`;

    for (const field of objectType.fields || []) {
      sdl += `  ${field.name}`;
      if (field.args && field.args.length > 0) {
        sdl += `(${field.args.map((arg: any) => `${arg.name}: ${formatTypeForSDL(arg.type)}`).join(", ")})`;
      }
      sdl += `: ${formatTypeForSDL(field.type)}\n`;
    }
    sdl += `}\n\n`;
  }

  // Add interface types
  const interfaceTypes = schema.types.filter(
    (type: any) => type.kind === "INTERFACE",
  );
  for (const interfaceType of interfaceTypes) {
    sdl += `interface ${interfaceType.name} {\n`;
    for (const field of interfaceType.fields || []) {
      sdl += `  ${field.name}: ${formatTypeForSDL(field.type)}\n`;
    }
    sdl += `}\n\n`;
  }

  // Add union types
  const unionTypes = schema.types.filter((type: any) => type.kind === "UNION");
  for (const unionType of unionTypes) {
    sdl += `union ${unionType.name} = ${unionType.possibleTypes.map((t: any) => t.name).join(" | ")}\n\n`;
  }

  // Add schema directive to specify root types
  sdl += `schema {\n`;
  if (schema.queryType) {
    sdl += `  query: ${schema.queryType.name}\n`;
  }
  if (schema.mutationType) {
    sdl += `  mutation: ${schema.mutationType.name}\n`;
  }
  if (schema.subscriptionType) {
    sdl += `  subscription: ${schema.subscriptionType.name}\n`;
  }
  sdl += `}\n`;

  return sdl;
}

function formatTypeForSDL(type: any): string {
  if (type.kind === "NON_NULL") {
    return `${formatTypeForSDL(type.ofType)}!`;
  } else if (type.kind === "LIST") {
    return `[${formatTypeForSDL(type.ofType)}]`;
  } else {
    return type.name;
  }
}

function validateSchemaIsSupported(
  schemaName: string,
): ValidationResponse | null {
  if (validateSchemaName(schemaName) === false) {
    return validationResult(
      ValidationResult.FAILED,
      `Unsupported schema name: ${schemaName}. Currently only 'admin' is supported.`,
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
): Promise<ValidationResponse> {
  const operation = extractGraphQLOperation(markdownCodeBlock)!; // We know it exists from previous check
  const schema = await loadAndBuildGraphQLSchema();

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
    `Successfully validated GraphQL ${operationType} against Shopify Admin API schema.`,
  );
}
