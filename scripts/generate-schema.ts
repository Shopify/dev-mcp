import {
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  existsSync,
} from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import ts from "typescript";
import { readFileSync as fsRead } from "fs";

/**
 * Simple schema generator (POC)
 * Reads component.json files from admin-ui-foundations repo and outputs
 * polaris-web-components-schema.json in data/
 *
 * Usage:
 *   ADMIN_UI_PATH=/abs/path/to/admin-ui-foundations/admin-ui-components/src/components \
 *   ts-node scripts/generate-schema.ts
 */

const COMPONENTS_ROOT =
  process.env.ADMIN_UI_PATH ||
  "/Users/maxenceparenteau/Developer/admin-ui-foundations/admin-ui-components/src/components";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

let CHILDREN_MAP: Record<string, string[]> = {};
try {
  const mapPath = join(__dirname, "../data/component-children.json");
  CHILDREN_MAP = JSON.parse(fsRead(mapPath, "utf8"));
} catch {
  console.warn(
    "⚠️  No component-children.json found; proceeding without hierarchy map",
  );
}

function extractTag(metaSrc: string): string | null {
  const match = metaSrc.match(/tagName\s*=\s*['"`]([^'"`]+)['"`]/);
  return match ? match[1] : null;
}

function extractEnums(propsSrc: string): Record<string, any> {
  const enums: Record<string, any> = {};
  // matches: export const buttonTones = [ 'neutral', 'critical', 'auto' ]
  const regex = /export const (\w+)\s*=\s*\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(propsSrc))) {
    const name = m[1];
    const listRaw = m[2];
    const values = listRaw
      .split(/[,\n]/)
      .map((s) => s.replace(/['"`]/g, "").trim())
      .filter(Boolean);
    if (values.length > 0) {
      enums[name] = {
        type: "string",
        enum: values,
      };
    }
  }
  return enums;
}

function extractSlots(metaSrc: string): string[] {
  const match = metaSrc.match(/slots\s*:\s*\[([^\]]+)\]/);
  if (!match) return [];
  const listRaw = match[1];
  return listRaw
    .split(/[\n,]/)
    .map((s) => s.replace(/['"`]/g, "").trim())
    .filter(Boolean);
}

function extractInterfaceProps(src: string): {
  required: string[];
  optional: string[];
} {
  const required: string[] = [];
  const optional: string[] = [];

  const sourceFile = ts.createSourceFile(
    "props.ts",
    src,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false,
    ts.ScriptKind.TS,
  );

  sourceFile.forEachChild((node) => {
    if (ts.isInterfaceDeclaration(node) && /Props$/.test(node.name.text)) {
      node.members.forEach((member) => {
        if (ts.isPropertySignature(member) && member.name) {
          const name = (member.name as ts.Identifier).text;
          if (member.questionToken) {
            optional.push(name);
          } else {
            required.push(name);
          }
        }
      });
    }
  });

  return { required, optional };
}

function buildSchema() {
  const schema: any = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Polaris Web Components Schema (generated)",
    type: "object",
    _generatedAt: new Date().toISOString(),
    _source: COMPONENTS_ROOT,
    definitions: {},
  };

  for (const dirName of readdirSync(COMPONENTS_ROOT)) {
    const compDir = join(COMPONENTS_ROOT, dirName);
    if (!statSync(compDir).isDirectory()) continue;

    const metaPath = join(compDir, "meta.ts");
    const propsPath = join(compDir, "properties.ts");
    if (!existsSync(metaPath)) {
      console.warn(`⚠️  No meta.ts for ${dirName}`);
      continue;
    }

    const tag = extractTag(readFileSync(metaPath, "utf8"));
    if (!tag) {
      console.warn(`⚠️  Could not find tagName in ${dirName}`);
      continue;
    }

    const props: Record<string, any> = {};
    let reqProps: string[] = [];
    if (existsSync(propsPath)) {
      const propsSrc = readFileSync(propsPath, "utf8");
      const enums = extractEnums(propsSrc);
      Object.assign(props, enums);

      const { required: requiredProps, optional: optProps } =
        extractInterfaceProps(propsSrc);
      reqProps = requiredProps;
      for (const propName of [...reqProps, ...optProps]) {
        if (!props[propName]) {
          props[propName] = { type: "string" };
        }
      }
    }

    const slotsArr = extractSlots(readFileSync(metaPath, "utf8"));

    let childrenSchema: any = undefined;
    if (CHILDREN_MAP[dirName]) {
      childrenSchema = {
        type: "array",
        items: {
          anyOf: CHILDREN_MAP[dirName].map((child) => ({
            $ref: `#/definitions/${child}`,
          })),
        },
      };
    }

    schema.definitions[dirName] = {
      type: "object",
      description: dirName,
      properties: {
        tag: { const: tag },
        attributes: {
          type: "object",
          properties: props,
          required: reqProps.length ? reqProps : undefined,
        },
        slots: slotsArr.length
          ? {
              type: "array",
              items: { type: "string" },
              const: slotsArr,
            }
          : undefined,
        children: childrenSchema,
      },
      required: ["tag"],
    };
  }

  const outPath = join(__dirname, "../data/polaris-web-components-schema.json");
  writeFileSync(outPath, JSON.stringify(schema, null, 2));
  console.log(
    `✅ Schema generated with ${Object.keys(schema.definitions).length} components -> ${outPath}`,
  );
}

buildSchema();
