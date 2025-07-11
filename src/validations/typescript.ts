import { readFile } from "fs/promises";
import { resolve } from "path";
import { ValidationResponse, ValidationResult } from "../types.js";

/**
 * Component information extracted from code blocks
 */
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

interface PackageComponentInfo {
  name: string;
  props: Set<string>;
  tagName: string;
}

/**
 * Package cache to avoid repeated parsing
 */
const packageCache = new Map<
  string,
  {
    components: Map<string, PackageComponentInfo>;
    packageExists: boolean;
  }
>();

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Main validation function that validates components against actual TypeScript packages
 */
export default async function validateTypescript(
  codeBlocks: string[],
  packageName: string,
): Promise<ValidationResponse[]> {
  // Handle empty array case
  if (codeBlocks.length === 0) {
    return [
      {
        result: ValidationResult.FAILED,
        resultDetail: "No code blocks provided for validation",
      },
    ];
  }

  // Process all code blocks in parallel
  const results = await Promise.all(
    codeBlocks.map(async (block, index) => {
      try {
        // Parse HTML-like components from the code block
        const components = parseComponents(block);

        if (components.length === 0) {
          return {
            result: ValidationResult.SUCCESS,
            resultDetail:
              "No components found in code block - validation passed.",
          };
        }

        // Validate each component against the actual TypeScript package
        return await validateComponentsForPackage(components, packageName);
      } catch (error) {
        return {
          result: ValidationResult.FAILED,
          resultDetail: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }),
  );

  return results;
}

// ============================================================================
// TypeScript Definition Parsing
// ============================================================================

/**
 * Validates components against a specific TypeScript package
 */
async function validateComponentsForPackage(
  components: ComponentInfo[],
  packageName: string,
): Promise<ValidationResponse> {
  try {
    // Parse the TypeScript definitions to get actual component information
    const packageInfo = await parseTypeScriptDefinitions(packageName);

    // Validate each component
    const validationResults = components.map((component) =>
      validateSingleComponent(component, packageInfo, packageName),
    );

    // Check for failures
    const failures = validationResults.filter((result) => !result.isValid);

    if (failures.length > 0) {
      const errorDetails = failures
        .map((failure) => failure.errors.join("; "))
        .join(" | ");
      return {
        result: ValidationResult.FAILED,
        resultDetail: `Component validation failed: ${errorDetails}`,
      };
    }

    // Collect warnings
    const warnings = validationResults.flatMap((result) => result.warnings);
    const warningText =
      warnings.length > 0 ? ` (Warnings: ${warnings.join("; ")})` : "";

    return {
      result: ValidationResult.SUCCESS,
      resultDetail: `Code block successfully validated against ${packageName} types.${warningText}`,
    };
  } catch (error) {
    return {
      result: ValidationResult.FAILED,
      resultDetail: `Package validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Parses TypeScript definition files to extract component information
 */
async function parseTypeScriptDefinitions(packageName: string): Promise<{
  components: Map<string, PackageComponentInfo>;
  packageExists: boolean;
}> {
  // Check cache first
  if (packageCache.has(packageName)) {
    return packageCache.get(packageName)!;
  }

  const result = {
    components: new Map<string, PackageComponentInfo>(),
    packageExists: false,
  };

  try {
    // Try to find TypeScript definitions in common locations
    const definitionsContent =
      await findAndReadTypeScriptDefinitions(packageName);
    result.packageExists = true;

    // Parse the TypeScript definitions to extract component information
    const components = parseComponentsFromDefinitions(
      definitionsContent,
      packageName,
    );
    result.components = components;

    // Cache the result
    packageCache.set(packageName, result);
    return result;
  } catch (error) {
    // Package definitions don't exist or can't be read
    console.warn(
      `Package definitions for '${packageName}' could not be loaded: ${error}`,
    );
    packageCache.set(packageName, result);
    return result;
  }
}

/**
 * Attempts to find and read TypeScript definitions from common locations
 */
async function findAndReadTypeScriptDefinitions(
  packageName: string,
): Promise<string> {
  const commonPaths = [
    // Common TypeScript definition file locations
    `node_modules/${packageName}/dist/app-bridge-ui.d.ts`, // Shopify specific
    `node_modules/${packageName}/dist/index.d.ts`, // Most common
    `node_modules/${packageName}/lib/index.d.ts`, // Alternative lib folder
    `node_modules/${packageName}/types/index.d.ts`, // Types folder
    `node_modules/${packageName}/index.d.ts`, // Root level
    `node_modules/${packageName}/${packageName}.d.ts`, // Package name
    `node_modules/${packageName}/dist/${packageName}.d.ts`, // Package name in dist
  ];

  // Try each path until one works
  for (const relativePath of commonPaths) {
    try {
      const fullPath = resolve(process.cwd(), relativePath);
      const content = await readFile(fullPath, "utf-8");
      console.log(`Found TypeScript definitions at: ${relativePath}`);
      return content;
    } catch {
      // Continue to next path
    }
  }

  // If no standard paths work, try to read package.json to find types entry
  try {
    const packageJsonPath = resolve(
      process.cwd(),
      `node_modules/${packageName}/package.json`,
    );
    const packageJsonContent = await readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);

    // Check for types or typings field
    const typesEntry = packageJson.types || packageJson.typings;
    if (typesEntry) {
      const typesPath = resolve(
        process.cwd(),
        `node_modules/${packageName}/${typesEntry}`,
      );
      const content = await readFile(typesPath, "utf-8");
      console.log(
        `Found TypeScript definitions via package.json types field: ${typesEntry}`,
      );
      return content;
    }
  } catch {
    // Package.json approach failed
  }

  throw new Error(
    `No TypeScript definitions found for package '${packageName}' in any common location`,
  );
}

/**
 * Parses component information from TypeScript definitions content
 */
function parseComponentsFromDefinitions(
  content: string,
  packageName?: string,
): Map<string, PackageComponentInfo> {
  const components = new Map<string, PackageComponentInfo>();

  // Dynamically discover components from TypeScript definitions
  // Look for interface declarations that likely represent component props
  const interfaceRegex =
    /interface\s+(\w+Props\$?\d*)\s+extends[^{]*{([^}]*)}/gs;
  const tagNameRegex = /(?:const\s+)?tagName\$?\w*\s*=\s*["']([^"']+)["']/g;
  const declarationRegex = /declare\s+class\s+(\w+)\s+extends[^{]*{/g;

  // First pass: Find all component interfaces
  const interfaceMatches = [...content.matchAll(interfaceRegex)];
  const componentInterfaces = new Map<string, string>();

  for (const match of interfaceMatches) {
    const interfaceName = match[1];
    const interfaceBody = match[2];

    // Extract component name from interface name
    // e.g., "ButtonProps$1" -> "Button"
    const componentName = interfaceName.replace(/Props\$?\d*$/, "");

    if (componentName) {
      componentInterfaces.set(componentName, interfaceName);
    }
  }

  // Second pass: Find tag names (e.g., "s-button", "s-link")
  const tagNameMatches = [...content.matchAll(tagNameRegex)];
  const tagNameMap = new Map<string, string>();

  for (const match of tagNameMatches) {
    const tagName = match[1];
    // Try to infer component name from tag name
    // e.g., "s-button" -> "Button"
    const componentName = tagName
      .replace(/^[a-z]+-/, "")
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      .replace(/^[a-z]/, (letter) => letter.toUpperCase());
    tagNameMap.set(componentName, tagName);
  }

  // Third pass: Find declared classes to validate component names
  const classMatches = [...content.matchAll(declarationRegex)];
  const validComponents = new Set<string>();

  for (const match of classMatches) {
    const className = match[1];
    validComponents.add(className);
  }

  // Combine the information to build component mappings
  for (const [componentName, interfaceName] of componentInterfaces) {
    // Only include if we have a valid component class
    if (validComponents.has(componentName)) {
      const tagName =
        tagNameMap.get(componentName) ||
        inferTagName(componentName, packageName);
      const props = extractPropsFromInterface(content, interfaceName);

      components.set(tagName, {
        name: componentName,
        props,
        tagName,
      });
    }
  }

  // If no components found dynamically, try a fallback approach
  if (components.size === 0) {
    console.warn(
      "No components found via dynamic parsing, trying fallback approach...",
    );
    return parseComponentsWithFallback(content, packageName);
  }

  return components;
}

/**
 * Fallback parsing approach for packages with different structures
 */
function parseComponentsWithFallback(
  content: string,
  packageName?: string,
): Map<string, PackageComponentInfo> {
  const components = new Map<string, PackageComponentInfo>();

  // Look for any interface that might be component props
  const allInterfaceRegex =
    /interface\s+(\w+)\s*(?:extends[^{]*)?\s*{([^}]*)}/gs;
  const matches = [...content.matchAll(allInterfaceRegex)];

  for (const match of matches) {
    const interfaceName = match[1];
    const interfaceBody = match[2];

    // Skip if this doesn't look like a component props interface
    if (
      !interfaceName.includes("Props") &&
      !interfaceBody.includes("children")
    ) {
      continue;
    }

    // Infer component name and tag name
    const componentName = interfaceName.replace(/Props\$?\d*$/, "");
    const tagName = inferTagName(componentName, packageName);
    const props = extractPropsFromInterface(content, interfaceName);

    components.set(tagName, {
      name: componentName,
      props,
      tagName,
    });
  }

  return components;
}

/**
 * Infers tag name from component name using common conventions
 */
function inferTagName(componentName: string, packageName?: string): string {
  // Convert PascalCase to kebab-case
  const kebabCase = componentName
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");

  // Infer prefix from package name patterns
  const prefix = inferPrefixFromPackageName(packageName);

  return `${prefix}-${kebabCase}`;
}

/**
 * Infers the component prefix from package name patterns
 */
function inferPrefixFromPackageName(packageName?: string): string {
  if (!packageName) return "s"; // Default fallback

  // Common package name patterns and their prefixes
  const patterns = [
    { pattern: /shopify/i, prefix: "s" },
    { pattern: /polaris/i, prefix: "p" },
    { pattern: /material/i, prefix: "m" },
    { pattern: /ant-design/i, prefix: "a" },
    { pattern: /chakra/i, prefix: "c" },
    { pattern: /semantic/i, prefix: "sem" },
    { pattern: /bootstrap/i, prefix: "b" },
    { pattern: /tailwind/i, prefix: "t" },
    { pattern: /ui-kit/i, prefix: "ui" },
    { pattern: /design-system/i, prefix: "ds" },
    { pattern: /components/i, prefix: "comp" },
  ];

  // Check each pattern
  for (const { pattern, prefix } of patterns) {
    if (pattern.test(packageName)) {
      return prefix;
    }
  }

  // If no pattern matches, try to extract from package name
  const nameParts = packageName.split("/");
  const packageBaseName = nameParts[nameParts.length - 1];

  // Use first few characters of package name
  if (packageBaseName.length >= 2) {
    const firstTwo = packageBaseName.substring(0, 2).toLowerCase();
    if (/^[a-z]{2}$/.test(firstTwo)) {
      return firstTwo;
    }
  }

  // Final fallback
  return "ui";
}

/**
 * Extracts props from a TypeScript interface definition
 */
function extractPropsFromInterface(
  content: string,
  interfaceName: string,
): Set<string> {
  const props = new Set<string>();

  // Common props that all components inherit
  const commonProps = [
    "id",
    "children",
    "className",
    "class",
    "style",
    "title",
    "aria-label",
    "data-testid",
    "key",
    "ref",
    "slot",
    "accessibilityLabel",
    "accessibilityVisibility",
    "background",
    "display",
    "padding",
    "paddingBlock",
    "paddingBlockStart",
    "paddingBlockEnd",
    "paddingInline",
    "paddingInlineStart",
    "paddingInlineEnd",
    "blockSize",
    "minBlockSize",
    "maxBlockSize",
    "inlineSize",
    "minInlineSize",
    "maxInlineSize",
    "border",
    "borderWidth",
    "borderStyle",
    "borderColor",
    "borderRadius",
    "overflow",
  ];

  commonProps.forEach((prop) => props.add(prop));

  // Find the interface definition - handle multiline interfaces
  const interfaceRegex = new RegExp(
    `interface\\s+${interfaceName}(?:\\s+extends\\s+[^{]*)?\\s*{([^}]*)}`,
    "s",
  );
  const match = content.match(interfaceRegex);

  if (match) {
    const interfaceBody = match[1];

    // Extract property names from the interface - improved regex
    // Match property names that start at the beginning of a line (after whitespace)
    const propRegex = /^\s*\/\*\*[\s\S]*?\*\/\s*([a-zA-Z][a-zA-Z0-9]*)\??:/gm;
    let propMatch;

    while ((propMatch = propRegex.exec(interfaceBody)) !== null) {
      const propName = propMatch[1];
      props.add(propName);
    }

    // Also try without comments for props that don't have documentation
    const simplePropRegex = /^\s*([a-zA-Z][a-zA-Z0-9]*)\??:/gm;
    let simplePropMatch;

    while ((simplePropMatch = simplePropRegex.exec(interfaceBody)) !== null) {
      const propName = simplePropMatch[1];
      props.add(propName);
    }
  }

  // Add common clickable props if this is a clickable component
  if (
    interfaceName.includes("Button") ||
    interfaceName.includes("Link") ||
    interfaceName.includes("Clickable")
  ) {
    const clickableProps = [
      "href",
      "target",
      "download",
      "onClick",
      "onFocus",
      "onBlur",
      "disabled",
      "loading",
      "type",
      "commandFor",
      "command",
      "variant",
      "tone",
      "icon",
      "accessibilityLabel",
    ];
    clickableProps.forEach((prop) => props.add(prop));
  }

  // Add common field props if this is a form field
  if (
    interfaceName.includes("Field") ||
    interfaceName.includes("Input") ||
    interfaceName.includes("TextArea")
  ) {
    const fieldProps = [
      "name",
      "value",
      "defaultValue",
      "placeholder",
      "required",
      "disabled",
      "readOnly",
      "onChange",
      "onInput",
      "onFocus",
      "onBlur",
      "error",
      "label",
      "details",
      "maxLength",
      "minLength",
      "max",
      "min",
      "step",
      "autocomplete",
      "prefix",
      "suffix",
      "icon",
      "accessory",
    ];
    fieldProps.forEach((prop) => props.add(prop));
  }

  // Add common display props for components that can have visual variants
  if (
    interfaceName.includes("Badge") ||
    interfaceName.includes("Banner") ||
    interfaceName.includes("Button") ||
    interfaceName.includes("Text")
  ) {
    const displayProps = [
      "variant",
      "size",
      "tone",
      "color",
      "appearance",
      "level",
      "weight",
      "align",
      "decoration",
    ];
    displayProps.forEach((prop) => props.add(prop));
  }

  return props;
}

/**
 * Validates a single component against package information
 */
function validateSingleComponent(
  component: ComponentInfo,
  packageInfo: {
    components: Map<string, PackageComponentInfo>;
    packageExists: boolean;
  },
  packageName: string,
): ComponentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if package exists
  if (!packageInfo.packageExists) {
    warnings.push(
      `Package '${packageName}' could not be loaded - using basic validation`,
    );
    return validateBasicComponent(component);
  }

  // Check if component is exported from the package
  if (!packageInfo.components.has(component.tagName)) {
    errors.push(
      `Component '${component.tagName}' is not exported from package '${packageName}'. Available components: ${Array.from(packageInfo.components.keys()).join(", ") || "none"}`,
    );
  } else {
    // Component exists - validate its props
    const componentInfo = packageInfo.components.get(component.tagName)!;

    for (const propName of Object.keys(component.props)) {
      if (!componentInfo.props.has(propName)) {
        errors.push(
          `Property '${propName}' is not valid for component '${component.tagName}'. Valid props include: ${Array.from(componentInfo.props).slice(0, 10).join(", ")}${componentInfo.props.size > 10 ? "..." : ""}`,
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Fallback validation when package can't be loaded
 */
function validateBasicComponent(
  component: ComponentInfo,
): ComponentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation: check for reasonable component tag name
  if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(component.tagName)) {
    errors.push(
      `Invalid component tag name '${component.tagName}' - should start with a letter and contain only letters, numbers, and hyphens`,
    );
  }

  // Basic validation: check for reasonable prop names
  for (const propName of Object.keys(component.props)) {
    if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(propName)) {
      errors.push(
        `Invalid prop name '${propName}' for component '${component.tagName}' - should start with a letter and contain only letters, numbers, and hyphens`,
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
// Component Parsing
// ============================================================================

/**
 * Parses HTML-like components from code blocks
 */
function parseComponents(codeBlock: string): ComponentInfo[] {
  const components: ComponentInfo[] = [];

  // Match HTML-like tags: <tag-name prop="value">content</tag-name>
  const tagRegex = /<([a-zA-Z][a-zA-Z0-9-]*)[^>]*>(.*?)<\/\1>/gis;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(codeBlock)) !== null) {
    const [fullMatch, tagName, content] = match;

    // Extract props from the opening tag
    const props = parseProps(fullMatch);

    components.push({
      tagName,
      props,
      content: content.trim(),
    });
  }

  return components;
}

/**
 * Parses props from a tag string
 */
function parseProps(tagString: string): Record<string, any> {
  const props: Record<string, any> = {};

  // Match prop="value" or prop={value} patterns
  const propRegex =
    /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g;
  let match: RegExpExecArray | null;

  while ((match = propRegex.exec(tagString)) !== null) {
    const [, propName, doubleQuotedValue, singleQuotedValue, bracesValue] =
      match;

    // Determine the prop value
    let propValue: any;
    if (doubleQuotedValue !== undefined) {
      propValue = doubleQuotedValue;
    } else if (singleQuotedValue !== undefined) {
      propValue = singleQuotedValue;
    } else if (bracesValue !== undefined) {
      // Try to parse as JSON/JavaScript expression
      try {
        propValue = JSON.parse(bracesValue);
      } catch {
        // If it can't be parsed as JSON, treat as string
        propValue = bracesValue;
      }
    }

    props[propName] = propValue;
  }

  return props;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Gets the list of discovered components for a package
 */
export async function getDiscoveredComponents(
  packageName: string,
): Promise<string[]> {
  const packageInfo = await parseTypeScriptDefinitions(packageName);
  return Array.from(packageInfo.components.keys());
}

/**
 * Checks if a component is supported by a package
 */
export async function isComponentSupported(
  componentName: string,
  packageName: string,
): Promise<boolean> {
  const packageInfo = await parseTypeScriptDefinitions(packageName);
  return packageInfo.components.has(componentName);
}

/**
 * Clears the package cache
 */
export function clearPackageCache(): void {
  packageCache.clear();
}
