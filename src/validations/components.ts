import { Parser } from "acorn";
import jsx from "acorn-jsx";
import tsPlugin from "acorn-typescript";
import { base as walkBase, full as walkFull } from "acorn-walk";
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

    const resolveSchema =
      "schemas" in data
        ? createExplicitSchemaResolver(data.schemas)
        : createPackageSchemaResolver((data as any).packageName);

    return validateCodeBlock(
      data.code,
      resolveSchema,
      (data as any).packageName as string | undefined,
    );
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

const PACKAGE_SCHEMA_MAP = {
  "@shopify/app-bridge-ui-types": AppHomeSchemas,
  "@shopify/ui-extensions-react/point-of-sale": PosSchemas,
  "@shopify/ui-extensions/point-of-sale": PosSchemas,
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

  if (tagMapping) return resolveByTagMapping(pkg, tagMapping);
  return resolveByConventionalNames(pkg);
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
  packageName?: string,
): ValidationResponse {
  try {
    const components = parseComponents(codeblock, resolveSchema, packageName);
    console.log("Components:", components);

    if (components.length === 0) {
      return {
        result: ValidationResult.SUCCESS,
        resultDetail: "No components found to validate.",
        components,
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
        components,
      };
    }

    return {
      result: ValidationResult.FAILED,
      resultDetail: `Validation errors: ${errors.join("; ")}`,
      components,
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
    console.log("Unknown component:", component.tagName);
    return {
      isValid: false,
      error: `Unknown component: ${component.tagName}`,
      tagName: component.tagName,
    };
  }

  try {
    const strictSchema =
      schema instanceof z.ZodObject ? schema.strict() : schema;
    strictSchema.parse(component.props);
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
  packageName?: string,
): ComponentInfo[] {
  const components: ComponentInfo[] = [];
  const cleanedCode = extractTypeScriptCode(codeblock);

  const ExtendedParser = (Parser as any).extend(
    (tsPlugin as any)(),
    (jsx as any)(),
  );

  try {
    const ast: any = ExtendedParser.parse(cleanedCode, {
      ecmaVersion: "latest",
      sourceType: "module",
      allowHashBang: true,
      locations: true,
      ranges: true,
    });
    const jsxBase = {
      ...walkBase,
      JSXElement(node: any, st: any, c: any) {
        c(node.openingElement, st);
        for (const child of node.children) c(child, st);
      },
      JSXFragment(node: any, st: any, c: any) {
        for (const child of node.children) c(child, st);
      },
      JSXOpeningElement(node: any, st: any, c: any) {
        for (const attr of node.attributes) c(attr, st);
      },
      JSXAttribute(node: any, st: any, c: any) {
        if (node.value) c(node.value, st);
      },
      JSXExpressionContainer(node: any, st: any, c: any) {
        c(node.expression, st);
      },
      JSXText() {}, // ensure traversal doesn't error on text
    };

    walkFull(
      ast,
      (node: any) => {
        addJsxComponentIfMatch(node, resolveSchema, cleanedCode, components);
        addCreateComponentIfMatch(
          node,
          resolveSchema,
          cleanedCode,
          components,
          packageName,
        );
      },
      jsxBase,
    );
  } catch (e) {
    console.log("Error parsing components:", e);
    return components;
  }

  return components;
}

function resolveByConventionalNames(pkg: any): SchemaResolver {
  return (tagName: string) => {
    const candidateNames = [`${tagName}PropsSchema`, `${tagName}Schema`];
    for (const schemaName of candidateNames) {
      const schema = pkg[schemaName];
      if (schema instanceof z.ZodType) return schema as z.ZodType<any>;
    }
    return null;
  };
}

function resolveByTagMapping(
  pkg: any,
  tagMapping: Record<string, string>,
): SchemaResolver {
  return (tagName: string) => {
    const typeName = tagMapping[tagName];
    if (!typeName) return null;
    const schemaName = `${typeName}Schema`;
    const schema = pkg[schemaName];
    return schema instanceof z.ZodSchema ? (schema as z.ZodType<any>) : null;
  };
}

function addJsxComponentIfMatch(
  node: any,
  resolveSchema: SchemaResolver,
  source: string,
  out: ComponentInfo[],
): void {
  if (!node || node.type !== "JSXOpeningElement") return;
  const nameNode = node.name;
  const tagName = jsxNameToString(nameNode);
  if (!tagName) return;
  if (isCommonHtmlElement(tagName)) return;
  const props = extractJsxAttributes(node.attributes, source);
  out.push({ tagName, props, content: source.slice(node.start, node.end) });
}

function addCreateComponentIfMatch(
  node: any,
  resolveSchema: SchemaResolver,
  source: string,
  out: ComponentInfo[],
  packageName?: string,
): void {
  if (!node || node.type !== "CallExpression") return;
  const callee = node.callee;
  const isCreate =
    callee &&
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property &&
    callee.property.type === "Identifier" &&
    callee.property.name === "createComponent";
  if (!isCreate) return;
  if (packageName && packageName !== "@shopify/ui-extensions/point-of-sale")
    return;
  const callArgs = node.arguments ?? [];
  const firstArg = callArgs[0];
  const secondArg = callArgs[1];
  const tagName =
    firstArg && firstArg.type === "Identifier" ? firstArg.name : null;
  if (!tagName) return;
  let props: Record<string, any> = {};
  if (secondArg && secondArg.type === "ObjectExpression") {
    props = extractObjectLiteralProps(secondArg, source);
  }
  out.push({ tagName, props, content: source.slice(node.start, node.end) });
}

function jsxNameToString(nameNode: any): string | null {
  if (!nameNode) return null;
  switch (nameNode.type) {
    case "JSXIdentifier":
      return nameNode.name as string;
    case "JSXMemberExpression": {
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
        props[key] = true;
        continue;
      }

      if (attr.value.type === "Literal") {
        props[key] = attr.value.value;
        continue;
      }

      if (attr.value.type === "JSXExpressionContainer") {
        const expr = attr.value.expression;
        if (expr.type === "Literal") {
          props[key] = expr.value;
          continue;
        }
        if (expr.type === "Identifier") {
          if (expr.name === "true") props[key] = true;
          else if (expr.name === "false") props[key] = false;
          else props[key] = expr.name;
          continue;
        }
        props[key] = source.slice(expr.start, expr.end);
        continue;
      }
    } else if (attr.type === "JSXSpreadAttribute") {
      continue;
    }
  }

  return props;
}

function extractObjectLiteralProps(
  objExpr: any,
  source: string,
): Record<string, any> {
  const props: Record<string, any> = {};
  if (!objExpr || objExpr.type !== "ObjectExpression") return props;

  for (const prop of objExpr.properties ?? []) {
    if (prop.type === "SpreadElement") continue;
    if (prop.type !== "Property") continue;

    let key: string | null = null;
    if (!prop.computed) {
      if (prop.key.type === "Identifier") key = prop.key.name as string;
      else if (prop.key.type === "Literal") key = String(prop.key.value);
    }
    if (!key) continue;

    const valueNode = prop.value;
    switch (valueNode.type) {
      case "Literal":
        props[key] = (valueNode as any).value;
        break;
      case "TemplateLiteral": {
        const hasExpressions = (valueNode.expressions ?? []).length > 0;
        if (!hasExpressions) {
          const cooked = (valueNode.quasis ?? [])
            .map((q: any) => q.value?.cooked ?? "")
            .join("");
          props[key] = cooked;
        } else {
          props[key] = source.slice(valueNode.start, valueNode.end);
        }
        break;
      }
      case "Identifier": {
        if (valueNode.name === "true") props[key] = true;
        else if (valueNode.name === "false") props[key] = false;
        else props[key] = valueNode.name;
        break;
      }
      case "ObjectExpression": {
        props[key] = extractObjectLiteralProps(valueNode, source);
        break;
      }
      default:
        props[key] = source.slice(valueNode.start, valueNode.end);
        break;
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

// Removed unused parseStringValue and isNumericAttribute helpers
