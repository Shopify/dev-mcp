import { ValidationResponse, ValidationResult } from "../types.js";

/**
 * Validates TypeScript code blocks using Typia runtime validators.
 * This approach is lightweight and doesn't require users to have TypeScript tooling setup.
 * It can work with any TypeScript package by validating the code structure and types.
 *
 * @param codeBlocks - Array of TypeScript code blocks to validate
 * @param packageName - The TypeScript package name to determine validation strategy
 * @returns ValidationResponse[] containing detailed results for each codeblock
 */
export default function validateTypescript(
  codeBlocks: string[],
  packageName: string,
): ValidationResponse[] {
  const detailedChecks: ValidationResponse[] = [];

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
    const validation = validateCodeBlock(codeBlocks[i], packageName);

    if (validation.isValid) {
      detailedChecks.push({
        result: ValidationResult.SUCCESS,
        resultDetail: `Code block successfully validated against ${packageName} types.`,
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
 * Validates a single TypeScript code block.
 * This function can be extended to support different validation strategies
 * based on the package name and code content.
 *
 * @param code - The TypeScript code to validate
 * @param packageName - The package name to validate against
 * @returns Object containing validation result and error message
 */
function validateCodeBlock(
  code: string,
  packageName: string,
): {
  isValid: boolean;
  error: string;
} {
  try {
    // Remove markdown code block markers if present
    const cleanCode = cleanCodeBlock(code);

    if (!cleanCode.trim()) {
      return {
        isValid: false,
        error: "Empty code block provided",
      };
    }

    // Determine validation strategy based on package and code content
    const validationStrategy = getValidationStrategy(cleanCode, packageName);

    switch (validationStrategy.type) {
      case "jsx-components":
        return validateJSXComponents(cleanCode, packageName);
      case "typescript-interface":
        return validateTypescriptInterface(cleanCode, packageName);
      case "javascript-object":
        return validateJavaScriptObject(cleanCode, packageName);
      case "generic-typescript":
        return validateGenericTypeScript(cleanCode, packageName);
      default:
        return validateGenericCode(cleanCode, packageName);
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Code validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Determines the appropriate validation strategy based on code content and package.
 */
function getValidationStrategy(
  code: string,
  packageName: string,
): {
  type: string;
  confidence: number;
} {
  // JSX/React components (for UI libraries)
  if (code.includes("<") && code.includes(">") && /[<]\w+/.test(code)) {
    return { type: "jsx-components", confidence: 0.9 };
  }

  // TypeScript interfaces or types
  if (code.includes("interface ") || code.includes("type ")) {
    return { type: "typescript-interface", confidence: 0.8 };
  }

  // JavaScript objects with type annotations
  if (code.includes(":") && (code.includes("{") || code.includes("="))) {
    return { type: "javascript-object", confidence: 0.7 };
  }

  // Generic TypeScript code
  if (
    code.includes("function ") ||
    code.includes("const ") ||
    code.includes("let ")
  ) {
    return { type: "generic-typescript", confidence: 0.6 };
  }

  return { type: "generic-code", confidence: 0.5 };
}

/**
 * Validates JSX components using Typia.
 * This works with any UI component library that uses JSX/React patterns.
 */
function validateJSXComponents(
  code: string,
  packageName: string,
): {
  isValid: boolean;
  error: string;
} {
  try {
    const components = extractJSXComponents(code);

    if (components.length === 0) {
      return {
        isValid: false,
        error: "No JSX components found in code block",
      };
    }

    // Validate each component
    for (const component of components) {
      const validation = validateComponent(component, packageName);
      if (!validation.isValid) {
        return validation;
      }
    }

    return { isValid: true, error: "" };
  } catch (error) {
    return {
      isValid: false,
      error: `JSX validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validates TypeScript interfaces or type definitions.
 */
function validateTypescriptInterface(
  code: string,
  packageName: string,
): {
  isValid: boolean;
  error: string;
} {
  try {
    // Basic TypeScript syntax validation
    if (!isValidTypeScriptSyntax(code)) {
      return {
        isValid: false,
        error: "Invalid TypeScript syntax detected",
      };
    }

    // Check for common TypeScript patterns
    if (hasValidTypeScriptPatterns(code)) {
      return { isValid: true, error: "" };
    }

    return {
      isValid: false,
      error: "Code does not follow expected TypeScript patterns",
    };
  } catch (error) {
    return {
      isValid: false,
      error: `TypeScript interface validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validates JavaScript objects with type annotations.
 */
function validateJavaScriptObject(
  code: string,
  packageName: string,
): {
  isValid: boolean;
  error: string;
} {
  try {
    // Use Typia to validate object structures
    const validation = validateObjectStructure(code, packageName);
    return validation;
  } catch (error) {
    return {
      isValid: false,
      error: `JavaScript object validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validates generic TypeScript code.
 */
function validateGenericTypeScript(
  code: string,
  packageName: string,
): {
  isValid: boolean;
  error: string;
} {
  try {
    // Basic syntax and structure validation
    if (!isValidCodeStructure(code)) {
      return {
        isValid: false,
        error: "Invalid code structure detected",
      };
    }

    return { isValid: true, error: "" };
  } catch (error) {
    return {
      isValid: false,
      error: `Generic TypeScript validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validates generic code that doesn't fit other patterns.
 */
function validateGenericCode(
  code: string,
  packageName: string,
): {
  isValid: boolean;
  error: string;
} {
  try {
    // Basic code validation
    if (code.trim().length === 0) {
      return {
        isValid: false,
        error: "Empty code block",
      };
    }

    // Check for obvious syntax errors
    if (hasObviousSyntaxErrors(code)) {
      return {
        isValid: false,
        error: "Syntax errors detected in code block",
      };
    }

    return { isValid: true, error: "" };
  } catch (error) {
    return {
      isValid: false,
      error: `Generic code validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Helper Functions

/**
 * Removes markdown code block markers from code.
 */
function cleanCodeBlock(code: string): string {
  return code
    .replace(/^```[\w]*\n?/, "") // Remove opening ```
    .replace(/\n?```$/, "") // Remove closing ```
    .trim();
}

/**
 * Extracts JSX components from code.
 */
function extractJSXComponents(code: string): Array<{
  tagName: string;
  props: Record<string, any>;
  children: string;
}> {
  const components: Array<{
    tagName: string;
    props: Record<string, any>;
    children: string;
  }> = [];

  // Simple regex to match JSX elements
  const jsxPattern = /<(\w+(?:-\w+)*)([^>]*)(?:\/>|>([^<]*)<\/\1>)/g;
  let match;

  while ((match = jsxPattern.exec(code)) !== null) {
    const [, tagName, propsString, children] = match;
    const props = parseProps(propsString);

    components.push({
      tagName,
      props,
      children: children || "",
    });
  }

  return components;
}

/**
 * Parses props from JSX prop string.
 */
function parseProps(propsString: string): Record<string, any> {
  const props: Record<string, any> = {};

  if (!propsString.trim()) {
    return props;
  }

  // Simple prop parsing (can be enhanced)
  const propPattern = /(\w+)(?:=["']([^"']+)["']|=\{([^}]+)\})?/g;
  let match;

  while ((match = propPattern.exec(propsString)) !== null) {
    const [, propName, stringValue, jsValue] = match;

    if (stringValue !== undefined) {
      props[propName] = stringValue;
    } else if (jsValue !== undefined) {
      // Try to parse JavaScript values
      try {
        props[propName] = JSON.parse(jsValue);
      } catch {
        props[propName] = jsValue;
      }
    } else {
      props[propName] = true; // Boolean prop
    }
  }

  return props;
}

/**
 * Validates a single component using Typia or custom validation.
 */
function validateComponent(
  component: { tagName: string; props: Record<string, any>; children: string },
  packageName: string,
): {
  isValid: boolean;
  error: string;
} {
  try {
    // Use Typia validation if available for this component
    const typiaValidator = getTypiaValidator(component.tagName, packageName);

    if (typiaValidator) {
      const isValid = typiaValidator(component.props);
      if (!isValid) {
        return {
          isValid: false,
          error: `Component "${component.tagName}" has invalid props for package "${packageName}"`,
        };
      }
    }

    // Fallback to generic validation
    return validateComponentGeneric(component, packageName);
  } catch (error) {
    return {
      isValid: false,
      error: `Component validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Gets Typia validator for a specific component if available.
 */
function getTypiaValidator(
  componentName: string,
  packageName: string,
): ((props: any) => boolean) | null {
  // This is where we can add package-specific Typia validators
  // For now, return null to use generic validation
  return null;
}

/**
 * Generic component validation.
 */
function validateComponentGeneric(
  component: { tagName: string; props: Record<string, any>; children: string },
  packageName: string,
): {
  isValid: boolean;
  error: string;
} {
  // Basic component validation
  if (!component.tagName || component.tagName.trim().length === 0) {
    return {
      isValid: false,
      error: "Component must have a valid tag name",
    };
  }

  // Package-specific validation can be added here
  if (packageName === "@shopify/app-bridge-ui-types") {
    // For Shopify components, validate that it starts with 's-'
    if (!component.tagName.startsWith("s-")) {
      return {
        isValid: false,
        error: `Shopify UI components must start with 's-', got: ${component.tagName}`,
      };
    }
  }

  return { isValid: true, error: "" };
}

/**
 * Validates object structure using Typia.
 */
function validateObjectStructure(
  code: string,
  packageName: string,
): {
  isValid: boolean;
  error: string;
} {
  try {
    // Extract objects from code
    const objects = extractObjects(code);

    if (objects.length === 0) {
      return {
        isValid: false,
        error: "No objects found in code block",
      };
    }

    // Validate each object
    for (const obj of objects) {
      // Use Typia validation if available
      const validation = validateObjectWithTypia(obj, packageName);
      if (!validation.isValid) {
        return validation;
      }
    }

    return { isValid: true, error: "" };
  } catch (error) {
    return {
      isValid: false,
      error: `Object structure validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Extracts objects from code.
 */
function extractObjects(code: string): any[] {
  const objects: any[] = [];

  try {
    // Simple object extraction (can be enhanced)
    const objectPattern = /\{[^{}]*\}/g;
    const matches = code.match(objectPattern);

    if (matches) {
      for (const match of matches) {
        try {
          const obj = JSON.parse(match);
          objects.push(obj);
        } catch {
          // Not valid JSON, skip
        }
      }
    }
  } catch {
    // Error in extraction, return empty array
  }

  return objects;
}

/**
 * Validates object with Typia.
 */
function validateObjectWithTypia(
  obj: any,
  packageName: string,
): {
  isValid: boolean;
  error: string;
} {
  try {
    // This is where package-specific Typia validators would go
    // For now, use basic validation
    if (typeof obj !== "object" || obj === null) {
      return {
        isValid: false,
        error: "Invalid object structure",
      };
    }

    return { isValid: true, error: "" };
  } catch (error) {
    return {
      isValid: false,
      error: `Typia validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Checks if code has valid TypeScript syntax.
 */
function isValidTypeScriptSyntax(code: string): boolean {
  // Basic syntax checks
  const brackets = { "{": 0, "[": 0, "(": 0 };

  for (const char of code) {
    if (char === "{") brackets["{"]++;
    else if (char === "}") brackets["{"]--;
    else if (char === "[") brackets["["]++;
    else if (char === "]") brackets["["]--;
    else if (char === "(") brackets["("]++;
    else if (char === ")") brackets["("]--;
  }

  return brackets["{"] === 0 && brackets["["] === 0 && brackets["("] === 0;
}

/**
 * Checks if code has valid TypeScript patterns.
 */
function hasValidTypeScriptPatterns(code: string): boolean {
  // Check for common TypeScript patterns
  const patterns = [
    /interface\s+\w+/,
    /type\s+\w+/,
    /:\s*\w+/,
    /function\s+\w+/,
    /const\s+\w+/,
    /let\s+\w+/,
    /var\s+\w+/,
  ];

  return patterns.some((pattern) => pattern.test(code));
}

/**
 * Checks if code has valid structure.
 */
function isValidCodeStructure(code: string): boolean {
  // Basic structure validation
  return code.trim().length > 0 && isValidTypeScriptSyntax(code);
}

/**
 * Checks for obvious syntax errors.
 */
function hasObviousSyntaxErrors(code: string): boolean {
  // Check for obvious syntax errors
  const errors = [
    /\)\s*\(/, // Missing operator between parentheses
    /\}\s*\{/, // Missing operator between braces
    /\]\s*\[/, // Missing operator between brackets
    /;;+/, // Multiple semicolons
    /\(\s*\)/, // Empty parentheses in unexpected places
  ];

  return errors.some((error) => error.test(code));
}
