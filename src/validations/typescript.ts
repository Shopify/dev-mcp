import ts from "typescript";
import { ValidationResponse, ValidationResult } from "../types.js";

/**
 * Validates TypeScript code blocks, with specific handling for different package types.
 *
 * @param codeBlocks - Array of TypeScript code blocks to validate
 * @param packageName - The typescript package name to determine validation strategy
 * @returns ValidationResponse[] containing detailed results for each codeblock
 */
export default function validateTypescript(
  codeBlocks: string[],
  packageName: string,
): ValidationResponse[] {
  const detailedChecks: ValidationResponse[] = [];

  if (packageName !== "@shopify/app-bridge-ui-types") {
    return [
      {
        result: ValidationResult.FAILED,
        resultDetail: `Package "${packageName}" is not supported. Only "@shopify/app-bridge-ui-types" is currently supported.`,
      },
    ];
  }

  if (codeBlocks.length === 0) {
    return [
      {
        result: ValidationResult.FAILED,
        resultDetail: "No code blocks provided for validation.",
      },
    ];
  }

  // Validate each code block
  for (let i = 0; i < codeBlocks.length; i++) {
    const validation = validatePolarisComponentUsage(
      codeBlocks[i],
      packageName,
    );

    if (validation.isValid) {
      detailedChecks.push({
        result: ValidationResult.SUCCESS,
        resultDetail:
          "Codeblock that included Polaris web components was validated with the Typescript compiler with the Polaris types.",
      });
    } else {
      detailedChecks.push({
        result: ValidationResult.FAILED,
        resultDetail: validation.error,
      });
    }
  }

  return detailedChecks;
}

/**
 * Extracts code content from markdown code blocks.
 * Handles both ``` and ```html/```tsx formats.
 *
 * @param code - The markdown code block
 * @returns The extracted code content
 */
function extractCodeFromMarkdownBlock(code: string): string {
  // Remove leading/trailing whitespace
  const trimmed = code.trim();

  // Check if it's wrapped in triple backticks
  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    // Find the end of the opening backticks and optional language specifier
    const firstNewline = trimmed.indexOf("\n");
    const startIndex = firstNewline > 0 ? firstNewline + 1 : 3;

    // Extract content between opening and closing backticks
    return trimmed.slice(startIndex, -3).trim();
  }

  // If not wrapped in backticks, return as is
  return trimmed;
}

/**
 * Validates Polaris component usage in TypeScript code for @shopify/app-bridge-ui-types package.
 *
 * @param code - The TypeScript code to validate
 * @param packageName - The package name (guaranteed to be "@shopify/app-bridge-ui-types")
 * @returns Object containing validation result and error message
 */
function validatePolarisComponentUsage(
  code: string,
  packageName: string,
): {
  isValid: boolean;
  error: string;
} {
  const extractedCode = extractCodeFromMarkdownBlock(code);
  const shopifyComponents = extractAppBridgeUIComponentsFromAST(extractedCode);

  if (shopifyComponents.length === 0) {
    return {
      isValid: false,
      error: "No Shopify UI components (s-* elements) found in code",
    };
  }

  const validation = validateComponentAgainstTypes(extractedCode);
  return validation;
}

/**
 * Extracts Shopify App Bridge UI components from TypeScript AST.
 * Specifically looks for JSX elements with 's-' prefix in @shopify/app-bridge-ui-types context.
 *
 * @param code - The TypeScript code to analyze
 * @returns Array of unique Shopify component names found in the code
 */
function extractAppBridgeUIComponentsFromAST(code: string): string[] {
  try {
    const enhancedCode = createEnhancedCodeWithImports(code);
    const sourceFile = createTypeScriptSourceFile(enhancedCode);
    const shopifyComponents = findShopifyComponentsInAST(sourceFile);
    return removeDuplicateComponents(shopifyComponents);
  } catch (error) {
    return [];
  }
}

/**
 * Creates enhanced code with necessary imports for parsing.
 */
function createEnhancedCodeWithImports(code: string): string {
  return `
/** @jsx h */
import { h } from "preact";
import "@shopify/app-bridge-ui-types";

const element = ${code};
`;
}

/**
 * Creates a TypeScript source file for AST parsing.
 */
function createTypeScriptSourceFile(enhancedCode: string): ts.SourceFile {
  return ts.createSourceFile(
    "temp.tsx",
    enhancedCode,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TSX,
  );
}

/**
 * Finds Shopify components in the AST by visiting nodes recursively.
 */
function findShopifyComponentsInAST(sourceFile: ts.SourceFile): string[] {
  const shopifyComponents: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = getJsxTagName(node);
      if (tagName && tagName.startsWith("s-")) {
        shopifyComponents.push(tagName);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return shopifyComponents;
}

/**
 * Removes duplicate components from the array.
 */
function removeDuplicateComponents(components: string[]): string[] {
  return [...new Set(components)];
}

/**
 * Extracts the tag name from a JSX element or self-closing element.
 *
 * @param node - The JSX element or self-closing element node
 * @returns The tag name as a string, or null if not found
 */
function getJsxTagName(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
): string | null {
  const tagNameNode = ts.isJsxElement(node)
    ? node.openingElement.tagName
    : node.tagName;

  if (ts.isIdentifier(tagNameNode)) {
    return tagNameNode.text;
  }
  return null;
}

/**
 * Validates TypeScript code against Polaris component types using the TypeScript compiler.
 * Creates a virtual TypeScript program to check for type errors and validate component usage.
 *
 * @param code - The TypeScript code to validate
 * @returns Object containing validation result and error message
 */
function validateComponentAgainstTypes(code: string): {
  isValid: boolean;
  error: string;
} {
  try {
    const enhancedCode = createEnhancedCodeWithPreactImports(code);
    const compilerOptions = createStrictCompilerOptions();
    const sourceFile = createVirtualSourceFile(enhancedCode);
    const host = createCompilerHostWithVirtualFile(sourceFile, compilerOptions);
    const program = ts.createProgram(
      ["virtual-file.tsx"],
      compilerOptions,
      host,
    );
    const allDiagnostics = ts.getPreEmitDiagnostics(program);
    const relevantDiagnostics = filterRelevantDiagnostics(allDiagnostics);

    if (relevantDiagnostics.length > 0) {
      const errors = formatDiagnosticErrors(relevantDiagnostics);
      return {
        isValid: false,
        error: `TypeScript compilation errors:\n${errors.join("\n")}`,
      };
    }

    return { isValid: true, error: "" };
  } catch (error) {
    return {
      isValid: false,
      error: `Compilation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Creates enhanced code with Preact JSX pragma and imports.
 */
function createEnhancedCodeWithPreactImports(code: string): string {
  return `
/** @jsx h */
import { h } from "preact";
import "@shopify/app-bridge-ui-types";

const button = ${code};
`;
}

/**
 * Creates strict compiler options for TypeScript validation.
 */
function createStrictCompilerOptions(): ts.CompilerOptions {
  return {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    skipLibCheck: false,
    strict: true,
    exactOptionalPropertyTypes: true,
    noUncheckedIndexedAccess: true,
    noImplicitReturns: true,
    noFallthroughCasesInSwitch: true,
    noEmit: true,
    jsx: ts.JsxEmit.React,
    jsxFactory: "h",
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    typeRoots: ["node_modules/@types", "node_modules/@shopify"],
  };
}

/**
 * Creates a virtual source file for TypeScript compilation.
 */
function createVirtualSourceFile(enhancedCode: string): ts.SourceFile {
  return ts.createSourceFile(
    "virtual-file.tsx",
    enhancedCode,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TSX,
  );
}

/**
 * Creates a compiler host with virtual file support.
 */
function createCompilerHostWithVirtualFile(
  sourceFile: ts.SourceFile,
  compilerOptions: ts.CompilerOptions,
): ts.CompilerHost {
  const host = ts.createCompilerHost(compilerOptions);
  const originalGetSourceFile = host.getSourceFile;

  host.getSourceFile = (
    fileName,
    languageVersion,
    onError,
    shouldCreateNewSourceFile,
  ) => {
    if (fileName === "virtual-file.tsx") {
      return sourceFile;
    }
    return originalGetSourceFile(
      fileName,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    );
  };

  return host;
}

/**
 * Filters diagnostics to keep only relevant type validation errors.
 */
function filterRelevantDiagnostics(
  diagnostics: readonly ts.Diagnostic[],
): ts.Diagnostic[] {
  return diagnostics.filter((d) => {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n");
    return shouldKeepDiagnostic(msg);
  });
}

/**
 * Determines if a diagnostic message should be kept based on its content.
 */
function shouldKeepDiagnostic(msg: string): boolean {
  if (shouldFilterOutDependencyError(msg)) return false;
  return shouldKeepTypeValidationError(msg);
}

/**
 * Checks if a diagnostic message is a dependency-related error that should be filtered out.
 */
function shouldFilterOutDependencyError(msg: string): boolean {
  const dependencyErrorPatterns = [
    "Could not find a declaration file for module",
    "only refers to a type, but is being used as a namespace",
    "Invalid module name in augmentation",
    "Cannot find name 'HTMLAttributes'",
    "Cannot find module",
    "ChoiceListProps$1",
    "ClickableProps$1",
    "MultipleInputProps",
    "BaseClickableProps",
  ];

  return dependencyErrorPatterns.some((pattern) => msg.includes(pattern));
}

/**
 * Checks if a diagnostic message is a type validation error that should be kept.
 */
function shouldKeepTypeValidationError(msg: string): boolean {
  const typeValidationPatterns = [
    "is not assignable to type",
    "Property",
    "does not exist on type",
    "has no exported member",
    "Object literal may only specify known properties",
    "Argument of type",
  ];

  return typeValidationPatterns.some((pattern) => msg.includes(pattern));
}

/**
 * Formats diagnostic errors into readable error messages.
 */
function formatDiagnosticErrors(diagnostics: ts.Diagnostic[]): string[] {
  return diagnostics.map((diagnostic) => {
    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start,
      );
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n",
      );
      return `Line ${line + 1}, Column ${character + 1}: ${message}`;
    } else {
      return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
    }
  });
}
