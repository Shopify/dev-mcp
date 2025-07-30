import { z } from "zod";
import * as AppHomeSchemas from "../data/typescriptSchemas/appHome.js";
import { ValidationResponse, ValidationResult } from "../types.js";
import { extractTypeScriptCode } from "./codeblockExtraction.js";

// ============================================================================
// Main Validation Function
// ============================================================================

export function validateComponentCodeBlock(
  input: TypeScriptValidationInput,
): ValidationResponse {
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

    const { code, packageName } = validationResult.data;

    // Check if package is supported
    if (!(packageName in PACKAGE_SCHEMA_MAP)) {
      const supportedPackages = Object.keys(PACKAGE_SCHEMA_MAP);
      return {
        result: ValidationResult.FAILED,
        resultDetail: `Unsupported package: ${packageName}. Supported packages are: ${supportedPackages.join(", ")}`,
      };
    }

    // Validate the code block and return the result directly
    return validateCodeBlock(code, packageName);
  } catch (error) {
    return {
      result: ValidationResult.FAILED,
      resultDetail: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Maps package names to their corresponding schema modules
 * Each schema module is expected to export TAG_TO_TYPE_MAPPING
 */
const PACKAGE_SCHEMA_MAP = {
  "@shopify/app-bridge-ui-types": AppHomeSchemas,
} as const;

type SupportedPackage = keyof typeof PACKAGE_SCHEMA_MAP;

// ============================================================================
// Component Tag Name to Schema Mapping
// ============================================================================

/**
 * Gets the zod schema for a component tag name from a package
 */
function getComponentSchema(
  tagName: string,
  packageName: string,
): z.ZodType<any> | null {
  if (!(packageName in PACKAGE_SCHEMA_MAP)) {
    return null;
  }

  const packageInfo = PACKAGE_SCHEMA_MAP[packageName as SupportedPackage];
  const tagMapping = (packageInfo as any).TAG_TO_TYPE_MAPPING;

  if (!tagMapping) {
    return null;
  }

  const typeName = tagMapping[tagName as keyof typeof tagMapping];

  if (!typeName) {
    return null;
  }

  const schemaName = `${typeName}Schema`;
  const schema = (packageInfo as any)[schemaName];

  return schema instanceof z.ZodSchema ? schema : null;
}

/**
 * Gets all available component schemas for a package
 */
function getAvailableComponents(packageName: string): string[] {
  if (!(packageName in PACKAGE_SCHEMA_MAP)) {
    return [];
  }

  const packageInfo = PACKAGE_SCHEMA_MAP[packageName as SupportedPackage];
  const tagMapping = (packageInfo as any).TAG_TO_TYPE_MAPPING;

  if (!tagMapping) {
    return [];
  }

  // Simply return all tag names from the mapping
  return Object.keys(tagMapping);
}

// ============================================================================
// Interfaces
// ============================================================================

const TypeScriptValidationInputSchema = z.object({
  code: z
    .string()
    .min(1, "Code block is required")
    .describe(
      "Markdown code block containing HTML with custom elements to validate",
    ),
  packageName: z
    .string()
    .min(1, "Package name is required")
    .describe(
      "TypeScript package name to validate against (e.g., '@shopify/app-bridge-ui-types')",
    ),
});

type TypeScriptValidationInput = z.infer<
  typeof TypeScriptValidationInputSchema
>;

interface ComponentInfo {
  tagName: string;
  props: Record<string, any>;
  content: string;
}

function validateComponentProps(
  tagName: string,
  props: Record<string, any>,
  packageName: string,
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const schema = getComponentSchema(tagName, packageName);

  if (!schema) {
    return {
      isValid: false,
      errors: [`Unknown component: ${tagName} for package ${packageName}`],
      warnings: [],
    };
  }

  try {
    schema.parse(props);
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err: any) => {
        const path = err.path.length > 0 ? err.path.join(".") : "root";
        return `Property '${path}': ${err.message}`;
      });

      return {
        isValid: false,
        errors,
        warnings: [],
      };
    }

    return {
      isValid: false,
      errors: [
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
      warnings: [],
    };
  }
}

function validateSingleComponent(
  component: ComponentInfo,
  packageName: string,
): { isValid: boolean; error?: string; tagName: string } {
  const schema = getComponentSchema(component.tagName, packageName);

  if (!schema) {
    const availableComponents = getAvailableComponents(packageName);
    return {
      isValid: false,
      error: `Unknown component: ${component.tagName}. Available components for ${packageName}: ${availableComponents.join(", ")}`,
      tagName: component.tagName,
    };
  }

  const validationResult = validateComponentProps(
    component.tagName,
    component.props,
    packageName,
  );

  if (validationResult.errors.length > 0) {
    return {
      isValid: false,
      error: validationResult.errors.join("; "),
      tagName: component.tagName,
    };
  }

  return {
    isValid: true,
    tagName: component.tagName,
  };
}

/**
 * Validates all components and collects results
 * Eliminates nested loops by using functional approach
 */
function validateAllComponents(
  components: ComponentInfo[],
  packageName: string,
): { errors: string[]; validComponents: string[] } {
  const results = components.map((component) =>
    validateSingleComponent(component, packageName),
  );

  return {
    errors: results.filter((r) => !r.isValid).map((r) => r.error!),
    validComponents: results.filter((r) => r.isValid).map((r) => r.tagName),
  };
}

/**
 * Validates a code block - simplified without nested loops
 */
function validateCodeBlock(
  codeblock: string,
  packageName: string,
): ValidationResponse {
  try {
    const components = parseCodeBlock(codeblock);
    const { errors, validComponents } = validateAllComponents(
      components,
      packageName,
    );

    if (errors.length === 0) {
      const componentsList =
        validComponents.length > 0
          ? ` Found components: ${validComponents.join(", ")}.`
          : "";
      return {
        result: ValidationResult.SUCCESS,
        resultDetail: `Code block successfully validated against ${packageName} schemas.${componentsList}`,
      };
    }

    return {
      result: ValidationResult.FAILED,
      resultDetail: `Errors: ${errors.join("; ")}`,
    };
  } catch (error) {
    return {
      result: ValidationResult.FAILED,
      resultDetail: `Failed to parse code block: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// Component Validation (Legacy - keeping for compatibility)
// ============================================================================

/**
 * Validates a single component against the package schemas
 * @deprecated Use validateSingleComponent instead
 */
function validateComponent(
  component: ComponentInfo,
  packageName: string,
): ValidationResponse {
  const result = validateSingleComponent(component, packageName);

  if (!result.isValid) {
    return {
      result: ValidationResult.FAILED,
      resultDetail: result.error!,
    };
  }

  return {
    result: ValidationResult.SUCCESS,
    resultDetail: `Component ${result.tagName} validated successfully`,
  };
}

// ============================================================================
// Code Block Parsing
// ============================================================================

/**
 * Parses a code block to extract component information
 * Uses shared cleaning utility for consistent code processing
 */
function parseCodeBlock(codeblock: string): ComponentInfo[] {
  const components: ComponentInfo[] = [];

  // Use shared cleaning utility - removes markdown blocks, HTML comments, and trims
  const cleanedCode = extractTypeScriptCode(codeblock);

  // Simple regex to find all s- component opening tags
  // Works perfectly for LLM-generated HTML
  const tagMatches = cleanedCode.matchAll(
    /<(s-[a-zA-Z0-9-]+)([^>]*?)(?:\s*\/?>)/g,
  );

  for (const match of tagMatches) {
    const tagName = match[1];
    const attributeString = match[2].trim();

    // Parse attributes
    const props = parseAttributes(attributeString);

    components.push({
      tagName,
      props,
      content: match[0],
    });
  }

  return components;
}

/**
 * Determines if an attribute should be converted to a number based on common HTML/component patterns
 */
function isNumericAttribute(attributeName: string): boolean {
  // Attributes that are typically numeric in component schemas
  const numericAttributes = new Set([
    "max",
    "min",
    "step",
    "tabindex",
    "size",
    "rows",
    "cols",
    "span",
    "colspan",
    "rowspan",
    "width",
    "height",
  ]);

  return numericAttributes.has(attributeName.toLowerCase());
}

/**
 * Parses HTML attributes from a string
 * Optimized for LLM-generated component attributes
 */
function parseAttributes(attributeString: string): Record<string, any> {
  const props: Record<string, any> = {};

  if (!attributeString.trim()) return props;

  // Simple regex that handles quoted values with spaces properly
  // Supports: key="value with spaces" or key='value' or key=value or just key
  const attributeRegex =
    /([a-zA-Z0-9-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;

  while ((match = attributeRegex.exec(attributeString)) !== null) {
    const name = match[1];
    const value = match[2] || match[3] || match[4] || true;

    // Convert string values to appropriate types
    let parsedValue: any = value;
    if (typeof value === "string") {
      if (value === "true") parsedValue = true;
      else if (value === "false") parsedValue = false;
      // Only convert to numbers for specific numeric attributes
      // Most HTML attributes should remain as strings (e.g., placeholder, label, etc.)
      else if (isNumericAttribute(name) && /^\d+$/.test(value))
        parsedValue = parseInt(value, 10);
      else if (isNumericAttribute(name) && /^\d*\.\d+$/.test(value))
        parsedValue = parseFloat(value);
      // Keep as string otherwise
      else parsedValue = value;
    }

    props[name] = parsedValue;
  }

  return props;
}
