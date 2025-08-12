import { Parser } from "acorn";
import jsx from "acorn-jsx";
import tsPlugin from "acorn-typescript";
import { full as walkFull } from "acorn-walk";
import { z } from "zod";
import * as AppHomeSchemas from "../data/typescriptSchemas/appHome.js";
import * as PosSchemas from "../data/typescriptSchemas/pos.js";
import { ValidationResponse, ValidationResult } from "../types.js";
import { extractTypeScriptCode } from "./codeblockExtraction.js";

// ============================================================================
// Main Validation Function
// ============================================================================

export function validateComponentCodeBlock(
  input: ComponentValidationInput,
): ValidationResponse {
  try {
    // Validate input
    const validationResult = ComponentValidationInputSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        result: ValidationResult.FAILED,
        resultDetail: `Invalid input: ${validationResult.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ")}`,
      };
    }

    const data = validationResult.data;

    // Create a resolver that provides Zod schemas on-demand (no pre-built maps)
    const resolveSchema =
      "schemas" in data
        ? createExplicitSchemaResolver(data.schemas)
        : createPackageSchemaResolver(data.packageName);

    // Parse components from code and validate against schemas
    return validateCodeBlock(data.code, resolveSchema);
  } catch (error) {
    return {
      result: ValidationResult.FAILED,
      resultDetail: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// Schema Types and Interfaces
// ============================================================================

const ExplicitSchemasInputSchema = z.object({
  code: z
    .string()
    .min(1, "Code block is required")
    .describe("Code block containing components to validate"),
  schemas: z
    .record(z.string(), z.any())
    .describe("Object mapping component names to their Zod schemas"),
});

const PackageNameInputSchema = z.object({
  code: z
    .string()
    .min(1, "Code block is required")
    .describe("Code block containing components to validate"),
  packageName: z.string().min(1),
});

const ComponentValidationInputSchema = z.union([
  ExplicitSchemasInputSchema,
  PackageNameInputSchema,
]);

type ComponentValidationInput = z.infer<typeof ComponentValidationInputSchema>;

interface ComponentInfo {
  tagName: string;
  props: Record<string, any>;
  content: string;
}

// ============================================================================
// On-demand Schema Resolution (no pre-built maps, no aliasing)
// ============================================================================

type SchemaResolver = (tagName: string) => z.ZodType<any> | null;

// Back-compat: known packages
const PACKAGE_SCHEMA_MAP = {
  "@shopify/app-bridge-ui-types": AppHomeSchemas,
  "@shopify/ui-extensions-react/point-of-sale": PosSchemas,
} as const;

type SupportedPackage = keyof typeof PACKAGE_SCHEMA_MAP;

function createPackageSchemaResolver(packageName: string): SchemaResolver {
  if (!(packageName in PACKAGE_SCHEMA_MAP)) {
    throw new Error(
      `Unsupported package: ${packageName}. Supported packages are: ${Object.keys(
        PACKAGE_SCHEMA_MAP,
      ).join(", ")}`,
    );
  }

  const pkg = PACKAGE_SCHEMA_MAP[packageName as SupportedPackage] as any;
  const tagMapping = (pkg as any).TAG_TO_TYPE_MAPPING as
    | Record<string, string>
    | undefined;

  if (!tagMapping) {
    throw new Error(
      `Package ${packageName} does not expose TAG_TO_TYPE_MAPPING for component resolution`,
    );
  }

  return (tagName: string) => {
    const typeName = tagMapping[tagName];
    if (!typeName) return null;
    const schemaName = `${typeName}Schema`;
    const schema = pkg[schemaName];
    return schema instanceof z.ZodSchema ? (schema as z.ZodType<any>) : null;
  };
}

function createExplicitSchemaResolver(
  schemas: Record<string, z.ZodType<any>>,
): SchemaResolver {
  // Strict: only exact key matches; no aliasing or name variants
  return (tagName: string) => schemas[tagName] ?? null;
}

// ============================================================================
// Core Validation Logic
// ============================================================================

function validateCodeBlock(
  codeblock: string,
  resolveSchema: SchemaResolver,
): ValidationResponse {
  try {
    const components = parseComponents(codeblock, resolveSchema);

    if (components.length === 0) {
      return {
        result: ValidationResult.SUCCESS,
        resultDetail: "No components found to validate.",
      };
    }

    const errors: string[] = [];
    const validComponents: string[] = [];

    for (const component of components) {
      const result = validateSingleComponent(component, resolveSchema);
      if (result.isValid) {
        validComponents.push(result.tagName);
      } else if (result.error) {
        errors.push(result.error);
      }
    }

    if (errors.length === 0) {
      const componentsList =
        validComponents.length > 0
          ? ` Found components: ${validComponents.join(", ")}.`
          : "";
      return {
        result: ValidationResult.SUCCESS,
        resultDetail: `All components validated successfully.${componentsList}`,
      };
    }

    return {
      result: ValidationResult.FAILED,
      resultDetail: `Validation errors: ${errors.join("; ")}`,
    };
  } catch (error) {
    return {
      result: ValidationResult.FAILED,
      resultDetail: `Failed to parse code block: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function validateSingleComponent(
  component: ComponentInfo,
  resolveSchema: SchemaResolver,
): { isValid: boolean; error?: string; tagName: string } {
  const schema = resolveSchema(component.tagName);

  if (!schema) {
    return {
      isValid: false,
      error: `Unknown component: ${component.tagName}`,
      tagName: component.tagName,
    };
  }

  try {
    schema.parse(component.props);
    return {
      isValid: true,
      tagName: component.tagName,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => {
        const path = err.path.length > 0 ? err.path.join(".") : "root";
        return `Property '${path}': ${err.message}`;
      });

      return {
        isValid: false,
        error: `${component.tagName} validation failed: ${errorMessages.join("; ")}`,
        tagName: component.tagName,
      };
    }

    return {
      isValid: false,
      error: `${component.tagName} validation failed: ${error instanceof Error ? error.message : String(error)}`,
      tagName: component.tagName,
    };
  }
}

// ============================================================================
// Component Parsing (Acorn-based)
// ============================================================================

function parseComponents(
  codeblock: string,
  resolveSchema: SchemaResolver,
): ComponentInfo[] {
  const components: ComponentInfo[] = [];
  const cleanedCode = extractTypeScriptCode(codeblock);

  const ExtendedParser = (Parser as any).extend(
    (jsx as any)(),
    (tsPlugin as any)(),
  );

  try {
    // Parse full code with JSX/TS support
    const ast: any = ExtendedParser.parse(cleanedCode, {
      ecmaVersion: "latest",
      sourceType: "module",
      allowHashBang: true,
      locations: true,
      ranges: true,
    });

    // Walk all nodes to find JSXOpeningElement
    walkFull(ast, (node: any) => {
      if (node && node.type === "JSXOpeningElement") {
        const nameNode = node.name;
        const tagName = jsxNameToString(nameNode);
        if (!tagName) return;

        // Skip common HTML elements
        if (isCommonHtmlElement(tagName)) return;

        // Include only tags that have a resolvable Zod schema
        const schema = resolveSchema(tagName);
        if (!schema) return;

        const props = extractJsxAttributes(node.attributes, cleanedCode);

        components.push({
          tagName,
          props,
          content: cleanedCode.slice(node.start, node.end),
        });
      }
    });
  } catch (e) {
    // Fallback: no components if parsing fails
    return components;
  }

  return components;
}

function jsxNameToString(nameNode: any): string | null {
  if (!nameNode) return null;
  switch (nameNode.type) {
    case "JSXIdentifier":
      return nameNode.name as string;
    case "JSXMemberExpression": {
      // e.g., UI.Button -> take the rightmost identifier "Button"
      let current: any = nameNode;
      while (current.object && current.property) {
        if (current.property && current.property.type === "JSXIdentifier") {
          return current.property.name as string;
        }
        current = current.object;
      }
      return null;
    }
    case "JSXNamespacedName":
      // e.g., svg:path -> take local name
      return nameNode.name?.name ?? nameNode.local?.name ?? null;
    default:
      return null;
  }
}

function extractJsxAttributes(
  attrs: any[],
  source: string,
): Record<string, any> {
  const props: Record<string, any> = {};

  for (const attr of attrs) {
    if (attr.type === "JSXAttribute") {
      const key = attr.name?.name;
      if (!key) continue;

      if (attr.value == null) {
        // <Comp disabled />
        props[key] = true;
        continue;
      }

      if (attr.value.type === "Literal") {
        props[key] = attr.value.value;
        continue;
      }

      if (attr.value.type === "JSXExpressionContainer") {
        const expr = attr.value.expression;
        // Handle simple literal expressions
        if (expr.type === "Literal") {
          props[key] = expr.value;
          continue;
        }
        if (expr.type === "Identifier") {
          if (expr.name === "true") props[key] = true;
          else if (expr.name === "false") props[key] = false;
          else props[key] = expr.name; // keep identifier name as string placeholder
          continue;
        }
        // Fallback: keep raw expression text as string
        props[key] = source.slice(expr.start, expr.end);
        continue;
      }
    } else if (attr.type === "JSXSpreadAttribute") {
      // Skip spreads; cannot safely evaluate at validation time
      continue;
    }
  }

  return props;
}

function isCommonHtmlElement(tagName: string): boolean {
  const commonElements = new Set([
    "div",
    "span",
    "p",
    "a",
    "img",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "table",
    "tr",
    "td",
    "th",
    "thead",
    "tbody",
    "form",
    "input",
    "button",
    "select",
    "option",
    "textarea",
    "nav",
    "header",
    "footer",
    "main",
    "section",
    "article",
    "aside",
    "br",
    "hr",
    "strong",
    "em",
    "code",
    "pre",
  ]);

  return commonElements.has(tagName.toLowerCase());
}

function parseStringValue(value: string, attributeName: string): any {
  // Handle boolean string values
  if (value === "true") return true;
  if (value === "false") return false;

  // Handle numeric values for specific attributes that are typically numeric
  if (isNumericAttribute(attributeName)) {
    if (/^-?\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^-?\d*\.\d+$/.test(value)) {
      return parseFloat(value);
    }
  }

  // Return as string by default
  return value;
}

function isNumericAttribute(attributeName: string): boolean {
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
    "maxlength",
    "minlength",
    "value",
    "defaultValue",
    "initialValue",
    "maximumValue",
    "minimumValue",
  ]);

  return numericAttributes.has(attributeName.toLowerCase());
}
