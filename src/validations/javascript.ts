import { z } from "zod";
import { ValidationResponse, ValidationResult } from "../types.js";

// Import tree-sitter and language grammars with proper typing for CommonJS modules
const Parser = require("tree-sitter");
const JavaScript = require("tree-sitter-javascript");

// ============================================================================
// Main Validation Function
// ============================================================================

export function validateJavaScriptCodeBlock(
  input: JavaScriptValidationInput,
): ValidationResponse {
  try {
    // Validate input
    const validationResult = JavaScriptValidationInputSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        result: ValidationResult.FAILED,
        resultDetail: `Invalid input: ${validationResult.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ")}`,
      };
    }

    const { code } = validationResult.data;

    // Extract and clean the JavaScript code
    const cleanedCode = extractJavaScriptCode(code);

    // Validate JavaScript syntax
    return validateJavaScriptSyntax(cleanedCode);
  } catch (error) {
    return {
      result: ValidationResult.FAILED,
      resultDetail: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// Input Schema
// ============================================================================

const JavaScriptValidationInputSchema = z.object({
  code: z
    .string()
    .min(1, "Code block is required")
    .describe("Markdown code block containing JavaScript code to validate"),
});

type JavaScriptValidationInput = z.infer<
  typeof JavaScriptValidationInputSchema
>;

// ============================================================================
// Code Extraction
// ============================================================================

/**
 * Extracts JavaScript code from markdown code blocks or returns raw code
 * @param code - Raw code string, potentially with markdown formatting
 * @returns Cleaned JavaScript code string
 */
function extractJavaScriptCode(code: string): string {
  let cleanedCode = code.trim();

  // Remove markdown code block markers if present
  const markdownBlockRegex = /^```(?:javascript|js)?\s*\n([\s\S]*?)\n```$/;
  const match = cleanedCode.match(markdownBlockRegex);

  if (match) {
    cleanedCode = match[1];
  }

  // Remove leading/trailing whitespace and normalize line endings
  return cleanedCode.trim().replace(/\r\n/g, "\n");
}

// ============================================================================
// JavaScript Syntax Validation
// ============================================================================

function validateJavaScriptSyntax(code: string): ValidationResponse {
  try {
    // Initialize tree-sitter parser with JavaScript language
    const parser = new Parser();
    parser.setLanguage(JavaScript);

    // Parse the JavaScript code
    const tree = parser.parse(code);

    // Check for syntax errors by looking for ERROR nodes in the parse tree
    const errors = findSyntaxErrors(tree.rootNode, code);

    if (errors.length === 0) {
      return {
        result: ValidationResult.SUCCESS,
        resultDetail: "JavaScript code has valid syntax",
      };
    }

    // Format error messages with line/column information
    const errorMessages = errors.map((error) => {
      const line = error.startPosition.row + 1;
      const column = error.startPosition.column + 1;
      return `Line ${line}, Column ${column}: ${error.message}`;
    });

    return {
      result: ValidationResult.FAILED,
      resultDetail: `JavaScript syntax errors: ${errorMessages.join("; ")}`,
    };
  } catch (error) {
    return {
      result: ValidationResult.FAILED,
      resultDetail: `Failed to parse JavaScript: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

interface SyntaxError {
  message: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
}

function findSyntaxErrors(node: any, sourceCode: string): SyntaxError[] {
  const errors: SyntaxError[] = [];

  function traverse(currentNode: any) {
    // Check if this node is an ERROR node
    if (currentNode.type === "ERROR") {
      const nodeText = sourceCode.slice(
        currentNode.startIndex,
        currentNode.endIndex,
      );
      errors.push({
        message: `Syntax error: unexpected token '${nodeText.trim()}'`,
        startPosition: currentNode.startPosition,
        endPosition: currentNode.endPosition,
      });
    }

    // Check if this node is MISSING (indicates expected but absent syntax)
    if (currentNode.isMissing) {
      errors.push({
        message: `Missing expected syntax: ${currentNode.type}`,
        startPosition: currentNode.startPosition,
        endPosition: currentNode.endPosition,
      });
    }

    // Check if this node has errors (indicates parsing issues)
    if (currentNode.hasError) {
      // Only report if we haven't already found an error at this position
      const hasErrorAtPosition = errors.some(
        (err) =>
          err.startPosition.row === currentNode.startPosition.row &&
          err.startPosition.column === currentNode.startPosition.column,
      );

      if (!hasErrorAtPosition && currentNode.type !== "ERROR") {
        errors.push({
          message: `Parse error in ${currentNode.type}`,
          startPosition: currentNode.startPosition,
          endPosition: currentNode.endPosition,
        });
      }
    }

    // Recursively check all children
    for (let i = 0; i < currentNode.childCount; i++) {
      traverse(currentNode.child(i)!);
    }
  }

  traverse(node);
  return errors;
}
