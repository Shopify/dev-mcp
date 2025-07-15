import { z } from "zod";
import * as AppHomeSchemas from "../data/typescriptSchemas/appHome.js";
import { ValidationResponse, ValidationResult } from "../types.js";

// ============================================================================
// Package to Schema Module Mapping
// ============================================================================

/**
 * Maps package names to their corresponding schema modules
 */
const PACKAGE_SCHEMA_MAP = {
  "@shopify/app-bridge-ui-types": AppHomeSchemas,
} as const;

type SupportedPackage = keyof typeof PACKAGE_SCHEMA_MAP;

// ============================================================================
// Component Tag Name to Schema Mapping
// ============================================================================

/**
 * Maps component tag names (e.g., 's-button') to their corresponding schema names
 * This mapping assumes the pattern: s-{component} -> {Component}Schema
 */
function getSchemaNameFromTagName(tagName: string): string | null {
  if (!tagName.startsWith("s-")) {
    return null;
  }

  // Convert s-button -> Button, s-date-picker -> DatePicker
  const componentName = tagName
    .slice(2) // Remove 's-' prefix
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return `${componentName}Schema`;
}

/**
 * Gets the zod schema for a component tag name from a package
 */
function getComponentSchema(
  tagName: string,
  packageName: string,
): z.ZodSchema | null {
  if (!isSupportedPackage(packageName)) {
    return null;
  }

  const schemaName = getSchemaNameFromTagName(tagName);
  if (!schemaName) {
    return null;
  }

  const schemaModule = PACKAGE_SCHEMA_MAP[packageName];
  const schema = (schemaModule as any)[schemaName];

  return schema instanceof z.ZodSchema ? schema : null;
}

/**
 * Checks if a package is supported for validation
 */
function isSupportedPackage(
  packageName: string,
): packageName is SupportedPackage {
  return packageName in PACKAGE_SCHEMA_MAP;
}

/**
 * Gets list of supported package names
 */
function getSupportedPackages(): string[] {
  return Object.keys(PACKAGE_SCHEMA_MAP);
}

/**
 * Gets all available component schemas for a package
 */
function getAvailableComponents(packageName: string): string[] {
  if (!isSupportedPackage(packageName)) {
    return [];
  }

  const schemaModule = PACKAGE_SCHEMA_MAP[packageName];
  const components: string[] = [];

  // Whitelist of actual UI component schemas (not data/type schemas)
  const UI_COMPONENT_SCHEMAS = new Set([
    "BadgeSchema",
    "BannerSchema",
    "BoxSchema",
    "ButtonSchema",
    "CheckboxSchema",
    "ChoiceListSchema",
    "ClickableSchema",
    "DatePickerSchema",
    "DividerSchema",
    "EmailFieldSchema",
    "GridSchema",
    "GridItemSchema",
    "HeaderSchema",
    "HeadingSchema",
    "IconSchema",
    "ImageSchema",
    "LinkSchema",
    "MoneyFieldSchema",
    "NumberFieldSchema",
    "ParagraphSchema",
    "PasswordFieldSchema",
    "SearchFieldSchema",
    "SectionSchema",
    "SelectSchema",
    "SpinnerSchema",
    "StackSchema",
    "SwitchSchema",
    "TableSchema",
    "TableHeaderSchema",
    "TableHeaderRowSchema",
    "TextSchema",
    "TextAreaSchema",
    "TextFieldSchema",
    "URLFieldSchema",
  ]);

  // Find actual UI component schemas and convert to tag names
  for (const [exportName, exportValue] of Object.entries(schemaModule)) {
    if (
      UI_COMPONENT_SCHEMAS.has(exportName) &&
      exportValue instanceof z.ZodSchema
    ) {
      // Convert ButtonSchema -> s-button
      const componentName = exportName.slice(0, -6); // Remove 'Schema' suffix
      const tagName = `s-${componentName
        .replace(/([A-Z])/g, "-$1")
        .toLowerCase()
        .slice(1)}`; // Convert camelCase to kebab-case and add s- prefix

      components.push(tagName);
    }
  }

  return components.sort();
}

/**
 * Validates component properties against its schema
 */
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
      const errors = error.errors.map((err) => {
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

/**
 * Gets statistics about available components and schemas
 */
function getValidationStats(packageName?: string): {
  supportedPackages: string[];
  packageStats?: {
    packageName: string;
    totalComponents: number;
    availableComponents: string[];
  };
} {
  const supportedPackages = getSupportedPackages();

  if (packageName && isSupportedPackage(packageName)) {
    const availableComponents = getAvailableComponents(packageName);
    return {
      supportedPackages,
      packageStats: {
        packageName,
        totalComponents: availableComponents.length,
        availableComponents,
      },
    };
  }

  return { supportedPackages };
}

// ============================================================================
// Interfaces
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

type TypeScriptValidationInput = z.infer<
  typeof TypeScriptValidationInputSchema
>;

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
  componentsFound: string[];
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

    // Check if package is supported
    if (!isSupportedPackage(packageName)) {
      const supportedPackages = getValidationStats().supportedPackages;
      return {
        result: ValidationResult.FAILED,
        resultDetail: `Unsupported package: ${packageName}. Supported packages are: ${supportedPackages.join(", ")}`,
      };
    }

    // Validate each code block
    const results: CodeBlockValidationResult[] = [];
    let allValid = true;

    for (let i = 0; i < codeblocks.length; i++) {
      const codeblock = codeblocks[i];
      const blockResult = validateCodeBlock(codeblock, i, packageName);
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
        } successfully validated against ${packageName} schemas.`,
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
  packageName: string,
): CodeBlockValidationResult {
  try {
    // Parse the code block to extract components
    const components = parseCodeBlock(codeblock);

    // Validate each component
    const errors: string[] = [];
    const warnings: string[] = [];
    const componentsFound: string[] = [];

    for (const component of components) {
      componentsFound.push(component.tagName);
      const componentResult = validateComponent(component, packageName);
      errors.push(...componentResult.errors);
      warnings.push(...componentResult.warnings);
    }

    return {
      index,
      isValid: errors.length === 0,
      errors,
      warnings,
      componentsFound,
    };
  } catch (error) {
    return {
      index,
      isValid: false,
      errors: [
        `Failed to parse code block: ${error instanceof Error ? error.message : String(error)}`,
      ],
      warnings: [],
      componentsFound: [],
    };
  }
}

// ============================================================================
// Component Validation
// ============================================================================

/**
 * Validates a single component against the package schemas
 */
function validateComponent(
  component: ComponentInfo,
  packageName: string,
): ComponentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if component exists in the package
  const schema = getComponentSchema(component.tagName, packageName);
  if (!schema) {
    const availableComponents = getAvailableComponents(packageName);
    errors.push(
      `Unknown component: ${component.tagName}. Available components for ${packageName}: ${availableComponents.join(", ")}`,
    );
    return { isValid: false, errors, warnings };
  }

  // Validate component properties using zod schema
  const validationResult = validateComponentProps(
    component.tagName,
    component.props,
    packageName,
  );

  errors.push(...validationResult.errors);
  warnings.push(...validationResult.warnings);

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

    // Convert string values to appropriate types
    let parsedValue: any = value;
    if (typeof value === "string") {
      // Try to parse as boolean
      if (value === "true") parsedValue = true;
      else if (value === "false") parsedValue = false;
      // Try to parse as number
      else if (/^\d+$/.test(value)) parsedValue = parseInt(value, 10);
      else if (/^\d*\.\d+$/.test(value)) parsedValue = parseFloat(value);
      // Keep as string otherwise
      else parsedValue = value;
    }

    props[name] = parsedValue;
  }

  return props;
}

// ============================================================================
// Validation Statistics
// ============================================================================

/**
 * Gets validation statistics for debugging
 */
export function getComponentValidationStats(packageName?: string): {
  supportedPackages: string[];
  packageStats?: {
    packageName: string;
    totalComponents: number;
    availableComponents: string[];
  };
} {
  return getValidationStats(packageName);
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
