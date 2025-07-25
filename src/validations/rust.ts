import Parser from "tree-sitter";
import { z } from "zod";
import { ValidationResponse, ValidationResult } from "../types.js";

// Import Rust language with proper typing
const Rust = require("tree-sitter-rust");

// ============================================================================
// Main Validation Function
// ============================================================================

export function validateRustCodeBlock(
  input: RustValidationInput,
): ValidationResponse {
  try {
    // Validate input
    const validationResult = RustValidationInputSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        result: ValidationResult.FAILED,
        resultDetail: `Invalid input: ${validationResult.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ")}`,
      };
    }

    const { code } = validationResult.data;

    // Extract and clean the Rust code
    const cleanedCode = extractRustCode(code);

    // Validate Rust syntax
    return validateRustSyntax(cleanedCode);
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

const RustValidationInputSchema = z.object({
  code: z
    .string()
    .min(1, "Code block is required")
    .describe("Markdown code block containing Rust code to validate"),
});

type RustValidationInput = z.infer<typeof RustValidationInputSchema>;

// ============================================================================
// Code Extraction
// ============================================================================

/**
 * Extracts Rust code from markdown code blocks or returns raw code
 * @param code - Raw code string, potentially with markdown formatting
 * @returns Cleaned Rust code string
 */
function extractRustCode(code: string): string {
  let cleanedCode = code.trim();

  // Remove markdown code block markers if present
  const markdownBlockRegex = /^```(?:rust|rs)?\s*\n([\s\S]*?)\n```$/;
  const match = cleanedCode.match(markdownBlockRegex);

  if (match) {
    cleanedCode = match[1];
  }

  // Remove leading/trailing whitespace and normalize line endings
  return cleanedCode.trim().replace(/\r\n/g, "\n");
}

// ============================================================================
// Rust Syntax Validation
// ============================================================================

function validateRustSyntax(code: string): ValidationResponse {
  try {
    // Initialize tree-sitter parser with Rust language
    const parser = new Parser();
    parser.setLanguage(Rust);

    // Parse the Rust code
    const tree = parser.parse(code);

    // Check for syntax errors by looking for ERROR nodes in the parse tree
    const errors = findSyntaxErrors(tree.rootNode, code);

    if (errors.length === 0) {
      return {
        result: ValidationResult.SUCCESS,
        resultDetail: "Rust code has valid syntax",
      };
    }

    // Format error messages with line/column information
    const errorMessages = errors.map((error) => {
      const lines = code.split("\n");
      const line = error.startPosition.row + 1;
      const column = error.startPosition.column + 1;
      return `Line ${line}, Column ${column}: ${error.message}`;
    });

    return {
      result: ValidationResult.FAILED,
      resultDetail: `Rust syntax errors: ${errorMessages.join("; ")}`,
    };
  } catch (error) {
    return {
      result: ValidationResult.FAILED,
      resultDetail: `Failed to parse Rust: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

interface SyntaxError {
  message: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
}

function findSyntaxErrors(
  node: Parser.SyntaxNode,
  sourceCode: string,
): SyntaxError[] {
  const errors: SyntaxError[] = [];

  function traverse(currentNode: Parser.SyntaxNode) {
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
