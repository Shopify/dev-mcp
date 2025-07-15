import { z } from "zod";
import {
  ComponentDefinition,
  getPolarisComponents,
} from "../data/typescriptSchemas/appHome.js";
import { ValidationResponse, ValidationResult } from "../types.js";

// ============================================================================
// Input Validation Schemas
// ============================================================================

const TypeScriptValidationInputSchema = z.object({
  codeblocks: z
    .array(z.string())
    .min(1, "At least one code block is required")
    .describe(
      "Array of markdown code blocks containing HTML with custom elements to validate",
    ),
  packageName: z
    .string()
    .min(1, "Package name is required")
    .describe(
      "TypeScript package name to validate against (e.g., '@shopify/app-bridge-ui-types')",
    ),
});

const CodeBlockSchema = z.string().min(1, "Code block cannot be empty");

type TypeScriptValidationInput = z.infer<
  typeof TypeScriptValidationInputSchema
>;

// ============================================================================
// Component Information Types
// ============================================================================

interface ComponentInfo {
  tagName: string;
  props: Record<string, any>;
  content: string;
}

interface ComponentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface CodeBlockValidationResult {
  index: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validates TypeScript code blocks against a specified package's component definitions
 */
export function validateTypeScriptCodeBlocks(
  input: TypeScriptValidationInput,
): ValidationResponse & { validationResults?: CodeBlockValidationResult[] } {
  try {
    // Validate input
    const validationResult = TypeScriptValidationInputSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        result: ValidationResult.FAILED,
        resultDetail: `Invalid input: ${validationResult.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ")}`,
      };
    }

    const { codeblocks, packageName } = validationResult.data;

    // For now, only support @shopify/app-bridge-ui-types
    if (packageName !== "@shopify/app-bridge-ui-types") {
      return {
        result: ValidationResult.FAILED,
        resultDetail: `Unsupported package: ${packageName}. Only @shopify/app-bridge-ui-types is currently supported.`,
      };
    }

    // Validate each code block
    const results: CodeBlockValidationResult[] = [];
    let allValid = true;

    for (let i = 0; i < codeblocks.length; i++) {
      const codeblock = codeblocks[i];
      const blockResult = validateCodeBlock(codeblock, i);
      results.push(blockResult);
      if (!blockResult.isValid) {
        allValid = false;
      }
    }

    // If all code blocks are valid, return success
    if (allValid) {
      return {
        result: ValidationResult.SUCCESS,
        resultDetail: `Code block${
          codeblocks.length > 1 ? "s" : ""
        } successfully validated against ${packageName} types.`,
      };
    }

    // Otherwise, return detailed validation results
    return {
      result: ValidationResult.FAILED,
      resultDetail: "Some code blocks contain validation errors",
      validationResults: results,
    };
  } catch (error) {
    return {
      result: ValidationResult.FAILED,
      resultDetail: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// Code Block Validation
// ============================================================================

/**
 * Validates a single code block
 */
function validateCodeBlock(
  codeblock: string,
  index: number,
): CodeBlockValidationResult {
  try {
    // Parse the code block to extract components
    const components = parseCodeBlock(codeblock);

    // Validate each component
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const component of components) {
      const componentResult = validateComponent(component);
      errors.push(...componentResult.errors);
      warnings.push(...componentResult.warnings);
    }

    return {
      index,
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      index,
      isValid: false,
      errors: [
        `Failed to parse code block: ${error instanceof Error ? error.message : String(error)}`,
      ],
      warnings: [],
    };
  }
}

// ============================================================================
// Component Validation
// ============================================================================

/**
 * Validates a single component against the package definitions
 */
function validateComponent(
  component: ComponentInfo,
): ComponentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get component definitions
  const componentMap = getPolarisComponents();
  const componentDef = componentMap.get(component.tagName);

  if (!componentDef) {
    errors.push(`Unknown component: ${component.tagName}`);
    return { isValid: false, errors, warnings };
  }

  // Validate props
  for (const [propName, propValue] of Object.entries(component.props)) {
    if (!componentDef.props.has(propName)) {
      errors.push(
        `Invalid prop '${propName}' for component '${component.tagName}'. Valid props are: ${Array.from(
          componentDef.props,
        ).join(", ")}`,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Code Block Parsing
// ============================================================================

/**
 * Parses a code block to extract component information
 */
function parseCodeBlock(codeblock: string): ComponentInfo[] {
  const components: ComponentInfo[] = [];

  // Remove markdown code block markers
  const cleanedCode = codeblock
    .replace(/^```[\w]*\n?/, "")
    .replace(/\n?```$/, "");

  // Simple regex to match custom elements (s-*)
  const componentRegex = /<(s-[a-zA-Z0-9-]+)([^>]*)(?:\s*\/>|>.*?<\/\1>)/gs;
  let match;

  while ((match = componentRegex.exec(cleanedCode)) !== null) {
    const tagName = match[1];
    const attributeString = match[2];
    const content = match[0];

    // Parse attributes
    const props = parseAttributes(attributeString);

    components.push({
      tagName,
      props,
      content,
    });
  }

  return components;
}

/**
 * Parses HTML attributes from a string
 */
function parseAttributes(attributeString: string): Record<string, any> {
  const props: Record<string, any> = {};

  // Simple attribute parsing - handles both quoted and unquoted values
  const attributeRegex =
    /([a-zA-Z0-9-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;

  while ((match = attributeRegex.exec(attributeString)) !== null) {
    const name = match[1];
    const value = match[2] || match[3] || match[4] || true;
    props[name] = value;
  }

  return props;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets available component names for the supported package
 */
function getAvailableComponents(): string[] {
  const componentMap = getPolarisComponents();
  return Array.from(componentMap.keys());
}

/**
 * Gets detailed information about a specific component
 */
function getComponentInfo(tagName: string): ComponentDefinition | undefined {
  const componentMap = getPolarisComponents();
  return componentMap.get(tagName);
}

/**
 * Validates that a package is supported
 */
function isSupportedPackage(packageName: string): boolean {
  return packageName === "@shopify/app-bridge-ui-types";
}

// ============================================================================
// Validation Statistics
// ============================================================================

/**
 * Gets validation statistics for debugging
 */
export function getValidationStats(): {
  supportedPackages: string[];
  availableComponents: string[];
  totalComponents: number;
} {
  const components = getAvailableComponents();

  return {
    supportedPackages: ["@shopify/app-bridge-ui-types"],
    availableComponents: components,
    totalComponents: components.length,
  };
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(
  results: CodeBlockValidationResult[],
): string[] {
  const formattedErrors: string[] = [];

  for (const result of results) {
    if (!result.isValid) {
      formattedErrors.push(
        `Code block ${result.index + 1}: ${result.errors.join(", ")}`,
      );
    }
  }

  return formattedErrors;
}

/**
 * Formats validation warnings for display
 */
export function formatValidationWarnings(
  results: CodeBlockValidationResult[],
): string[] {
  const formattedWarnings: string[] = [];

  for (const result of results) {
    if (result.warnings.length > 0) {
      formattedWarnings.push(
        `Code block ${result.index + 1}: ${result.warnings.join(", ")}`,
      );
    }
  }

  return formattedWarnings;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a value is a valid component definition
 */
function isValidComponentDefinition(
  value: unknown,
): value is ComponentDefinition {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "tagName" in value &&
    "props" in value &&
    typeof (value as any).name === "string" &&
    typeof (value as any).tagName === "string" &&
    (value as any).props instanceof Set
  );
}

/**
 * Type guard to check if a value is a valid component info
 */
function isValidComponentInfo(value: unknown): value is ComponentInfo {
  return (
    typeof value === "object" &&
    value !== null &&
    "tagName" in value &&
    "props" in value &&
    "content" in value &&
    typeof (value as any).tagName === "string" &&
    typeof (value as any).props === "object" &&
    typeof (value as any).content === "string"
  );
}

// ============================================================================
// Debug Utilities
// ============================================================================

/**
 * Debug function to log component parsing details
 */
export function debugComponentParsing(codeblock: string): void {
  console.log("=== Debug Component Parsing ===");
  console.log("Original code block:", codeblock);

  const components = parseCodeBlock(codeblock);
  console.log("Parsed components:", components);

  for (const component of components) {
    console.log(`Component: ${component.tagName}`);
    console.log(`Props:`, component.props);

    const validation = validateComponent(component);
    console.log(`Validation result:`, validation);
  }
}

/**
 * Debug function to inspect available components
 */
export function debugAvailableComponents(): void {
  console.log("=== Debug Available Components ===");

  const componentMap = getPolarisComponents();
  console.log(`Total components: ${componentMap.size}`);

  for (const [tagName, definition] of componentMap) {
    console.log(
      `${tagName}: ${definition.name} (${definition.props.size} props)`,
    );
  }
}

// ============================================================================
// Backwards Compatibility
// ============================================================================

/**
 * Legacy function for backwards compatibility
 */
export default function validateTypescript(
  codeBlocks: unknown,
  packageName: unknown,
): Promise<ValidationResponse[]> {
  return new Promise((resolve) => {
    try {
      const result = validateTypeScriptCodeBlocks({
        codeblocks: Array.isArray(codeBlocks) ? codeBlocks : [codeBlocks],
        packageName:
          typeof packageName === "string"
            ? packageName
            : "@shopify/app-bridge-ui-types",
      });

      resolve([result]);
    } catch (error) {
      resolve([
        {
          result: ValidationResult.FAILED,
          resultDetail: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ]);
    }
  });
}

/**
 * Validates TypeScript code blocks with formatting
 */
export async function validateTypescriptWithFormatting(
  codeBlocks: unknown,
  packageName: unknown,
  itemName: string = "Code Blocks",
): Promise<{
  validationResults: ValidationResponse[];
  formattedResponse: string;
  isValid: boolean;
}> {
  const validationResults = await validateTypescript(codeBlocks, packageName);
  const isValid = validationResults.every(
    (result) => result.result === ValidationResult.SUCCESS,
  );

  // Format the response
  const hasFailures = validationResults.some(
    (result) => result.result === ValidationResult.FAILED,
  );

  let formattedResponse = `## Validation Summary\n\n`;
  formattedResponse += `**Overall Status:** ${!hasFailures ? "✅ VALID" : "❌ INVALID"}\n`;
  formattedResponse += `**Total ${itemName}:** ${validationResults.length}\n\n`;

  formattedResponse += `## Detailed Results\n\n`;
  validationResults.forEach((check, index) => {
    const statusIcon = check.result === ValidationResult.SUCCESS ? "✅" : "❌";
    formattedResponse += `### ${itemName.slice(0, -1)} ${index + 1}\n`;
    formattedResponse += `**Status:** ${statusIcon} ${check.result.toUpperCase()}\n`;
    formattedResponse += `**Details:** ${check.resultDetail}\n\n`;
  });

  return {
    validationResults,
    formattedResponse,
    isValid,
  };
}

/**
 * Export validation functions for use in other modules
 */
export {
  getAvailableComponents,
  getComponentInfo,
  isSupportedPackage,
  parseAttributes,
  parseCodeBlock,
  validateComponent,
};
