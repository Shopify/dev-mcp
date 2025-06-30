import * as ts from "typescript";
import * as appBridgeUiTypes from "@shopify/app-bridge-ui-types";
import * as fs from "fs";

export function validatePolarisWebComponents(codeBlock: string) {
  let result = false;
  let resultDetail = "";

  // extract code from language-less codeblock
  // Try multiple regex patterns to handle different codeblock formats
  let code =
    codeBlock.match(/```\n([\s\S]*?)\n```/)?.[1] || // ```\ncode\n```
    codeBlock.match(/```([\s\S]*?)```/)?.[1] || // ```code```
    codeBlock.match(/```[a-z]*\n([\s\S]*?)\n```/)?.[1] || // ```js\ncode\n```
    codeBlock.match(/```[a-z]*\n([\s\S]*?)```/)?.[1]; // ```js\ncode```

  // validate html
  if (!code) {
    resultDetail = "No code found in code block";
    return { result, resultDetail };
  }

  // Validate Polaris components and props
  const validation = validatePolarisComponentUsage(code);

  if (validation.isValid) {
    result = true;
    resultDetail = "Code uses valid Polaris web components";
  } else {
    resultDetail = validation.error;
  }

  return { result, resultDetail };
}

function validatePolarisComponentUsage(code: string): {
  isValid: boolean;
  error: string;
} {
  // Validate against @shopify/app-bridge-ui-types directly

  // Check for Shopify UI components (s-* pattern)
  const shopifyComponentPattern = /<s-[a-z-]+/gi;
  const shopifyComponents = code.match(shopifyComponentPattern);

  // Also check for ui-* pattern (legacy or alternative naming)
  const uiComponentPattern = /<ui-[a-z-]+/gi;
  const uiComponents = code.match(uiComponentPattern);

  const allComponents = [...(shopifyComponents || []), ...(uiComponents || [])];

  if (!allComponents || allComponents.length === 0) {
    return {
      isValid: false,
      error: "No Shopify UI components (s-* or ui-* elements) found in code",
    };
  }

  // Validate each component against TypeScript types directly
  for (const component of allComponents) {
    const tagName = component.replace("<", "").toLowerCase();

    // Validate component and props against TypeScript types
    const validation = validateComponentAgainstTypes(tagName, code);
    if (!validation.isValid) {
      return validation;
    }

    // Check for proper closing tags
    const closingTag = `</${tagName}>`;
    const selfClosingPattern = new RegExp(`<${tagName}[^>]*/>`, "gi");
    const hasClosingTag = code.includes(closingTag);
    const isSelfClosing = selfClosingPattern.test(code);

    if (!hasClosingTag && !isSelfClosing) {
      return { isValid: false, error: `Missing closing tag for ${component}` };
    }
  }

  return { isValid: true, error: "" };
}

function validateComponentAgainstTypes(tagName: string, code: string): { isValid: boolean; error: string } {
  try {
    // Enhanced code with Preact JSX pragma and imports - match your working example
    const enhancedCode = `
/** @jsx h */
import { h } from "preact";
import "@shopify/app-bridge-ui-types";

const button = ${code};
`;

    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext, 
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      skipLibCheck: false, // Enable checking to catch type errors
      strict: true, // Enable strict checking
      exactOptionalPropertyTypes: true, // Stricter optional property checking
      noUncheckedIndexedAccess: true, // Stricter index access
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      noEmit: true,
      jsx: ts.JsxEmit.React,
      jsxFactory: "h",
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      typeRoots: ["node_modules/@types", "node_modules/@shopify"],
    };

    // Create a virtual source file
    const sourceFile = ts.createSourceFile(
      "virtual-file.tsx",
      enhancedCode,
      ts.ScriptTarget.ES2020,
      true,
      ts.ScriptKind.TSX,
    );

    // Use default compiler host but override getSourceFile for virtual files
    const host = ts.createCompilerHost(compilerOptions);
    const originalGetSourceFile = host.getSourceFile;
    
    host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      if (fileName === "virtual-file.tsx") {
        return sourceFile;
      }
      // Let TypeScript resolve actual modules from node_modules
      return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    };

    const program = ts.createProgram(["virtual-file.tsx"], compilerOptions, host);

    // Get diagnostics - if there are any, the code is invalid
    const allDiagnostics = ts.getPreEmitDiagnostics(program);
    
    // Filter out React/dependency errors but keep actual type validation errors
    const diagnostics = allDiagnostics
      .filter(d => {
        // Use flattened message text to get the complete error message including nested parts
        const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n");
        
        // First, filter out React/dependency related errors and internal interface issues
        if (msg.includes('Could not find a declaration file for module')) return false;
        if (msg.includes('only refers to a type, but is being used as a namespace')) return false;
        if (msg.includes('Invalid module name in augmentation')) return false;
        if (msg.includes('Cannot find name \'HTMLAttributes\'')) return false;
        if (msg.includes('Cannot find module')) return false;
        if (msg.includes('ChoiceListProps$1') || msg.includes('ClickableProps$1')) return false;
        if (msg.includes('MultipleInputProps') || msg.includes('BaseClickableProps')) return false;
        
        // Then, keep only relevant type validation errors (the core validation we want)
        if (msg.includes('is not assignable to type')) return true;
        if (msg.includes('Property') && msg.includes('does not exist on type')) return true;
        if (msg.includes('has no exported member')) return true;
        if (msg.includes('Object literal may only specify known properties')) return true;
        if (msg.includes('does not exist on type')) return true;
        if (msg.includes('Argument of type') && msg.includes('is not assignable')) return true;
        
        return false; // Default to filtering out unknown errors
      });

    if (diagnostics.length > 0) {
      const errors = diagnostics.map((diagnostic) => {
        if (diagnostic.file && diagnostic.start !== undefined) {
          const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
          return `Line ${line + 1}, Column ${character + 1}: ${message}`;
        } else {
          return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        }
      });

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
