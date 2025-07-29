import {
  AbstractFileSystem,
  check,
  Config,
  extractDocDefinition,
  FileStat,
  FileTuple,
  FileType,
  LiquidHtmlNode,
  Offense,
  path,
  recommended,
  SectionSchema,
  SourceCodeType,
  ThemeBlockSchema,
  toSchema,
  toSourceCode,
} from "@shopify/theme-check-common";
import { ThemeLiquidDocsManager } from "@shopify/theme-check-docs-updater";
import { normalize } from "path";
import { ValidationResponse, ValidationResult } from "../types.js";

type ThemeCodeblock = {
  fileName: string;
  fileType:
    | "assets"
    | "blocks"
    | "config"
    | "layout"
    | "locales"
    | "sections"
    | "snippets"
    | "templates";
  content: string;
};

type Theme = Record<string, string>;

/**
 * Validates codeblocks in a theme
 * @param codeblocks - An array of objects containing the filename, filetype, and content of the codeblock
 * @returns ValidationResponse[] with details for each codeblock
 */
export default async function validateThemeCodeblocks(
  codeblocks: ThemeCodeblock[],
): Promise<ValidationResponse[]> {
  const theme = createTheme(codeblocks);

  try {
    return await validatePartialTheme(theme);
  } catch (error) {
    return Object.keys(theme).map((uri) => ({
      result: ValidationResult.FAILED,
      resultDetail: `Validation error: Could not validate ${uri}. Details: ${error instanceof Error ? error.message : String(error)}`,
    }));
  }
}

async function validatePartialTheme(
  theme: Theme,
): Promise<ValidationResponse[]> {
  const offenses = await runThemeCheck(theme);
  const fileUriToOffenses = groupOffensesByFileUri(offenses);

  const validationResults = [] as ValidationResponse[];

  for (let uri of Object.keys(theme)) {
    const name = path.basename(uri);
    if (fileUriToOffenses[uri]) {
      validationResults.push({
        result: ValidationResult.FAILED,
        resultDetail: `Theme codeblock ${name} has the following offenses from using Shopify's Theme Check:\n\n${fileUriToOffenses[uri].join("\n\n")}`,
      });
    } else {
      validationResults.push({
        result: ValidationResult.SUCCESS,
        resultDetail: `Theme codeblock ${name} had no offenses from using Shopify's Theme Check.`,
      });
    }
  }

  return validationResults;
}

async function runThemeCheck(theme: Theme) {
  const mockFs = new MockFileSystem(theme);
  const config: Config = {
    checks: recommended,
    settings: {},
    rootUri: "file:///",
    context: "theme",
  };
  const docsManager = new ThemeLiquidDocsManager();

  const themeSourceCode = Object.entries(theme)
    .filter(
      ([uri, _content]) => uri.endsWith(".liquid") || uri.endsWith(".json"),
    )
    .map(([uri, content]) => toSourceCode(uri, content, undefined));

  return await check(themeSourceCode, config, {
    fs: mockFs,
    themeDocset: docsManager,
    jsonValidationSet: docsManager,
    getBlockSchema: async (blockName) => {
      const blockUri = `file:///blocks/${blockName}.liquid`;
      const sourceCode = themeSourceCode.find((s) => s.uri === blockUri);

      if (!sourceCode) {
        return undefined;
      }

      return toSchema(
        "theme",
        blockUri,
        sourceCode,
        async () => true,
      ) as Promise<ThemeBlockSchema | undefined>;
    },
    getSectionSchema: async (sectionName) => {
      const sectionUri = `file:///sections/${sectionName}.liquid`;
      const sourceCode = themeSourceCode.find((s) => s.uri === sectionUri);

      if (!sourceCode) {
        return undefined;
      }

      return toSchema(
        "theme",
        sectionUri,
        sourceCode,
        async () => true,
      ) as Promise<SectionSchema | undefined>;
    },
    async getDocDefinition(relativePath) {
      const sourceCode = themeSourceCode.find((s) =>
        normalize(s.uri).endsWith(normalize(relativePath)),
      );

      if (!sourceCode || sourceCode.type !== SourceCodeType.LiquidHtml) {
        return undefined;
      }

      return extractDocDefinition(
        sourceCode.uri,
        sourceCode.ast as LiquidHtmlNode,
      );
    },
  });
}

function createTheme(codeblocks: ThemeCodeblock[]): Theme {
  return codeblocks.reduce((theme, codeblock) => {
    const uri = `file:///${codeblock.fileType}/${codeblock.fileName}`;
    theme[uri] = codeblock.content;
    return theme;
  }, {} as Theme);
}

function groupOffensesByFileUri(offenses: Offense[]) {
  return offenses.reduce(
    (acc, o) => {
      let formattedMessage = `ERROR: ${o.message}`;

      if (o.suggest && o.suggest.length > 0) {
        formattedMessage += `; SUGGESTED FIXES: ${o.suggest.map((s) => s.message).join("OR ")}`;
      }

      if (acc[o.uri]) {
        acc[o.uri].push(formattedMessage);
      } else {
        acc[o.uri] = [formattedMessage];
      }
      return acc;
    },
    {} as Record<string, string[]>,
  );
}

// We mimic a theme on a file system to be able to run theme checks
class MockFileSystem implements AbstractFileSystem {
  constructor(private partialTheme: Theme) {}

  async readFile(uri: string): Promise<string> {
    const file = this.partialTheme[uri];

    if (!file) {
      throw new Error(`File not found: ${uri}`);
    }

    return file;
  }

  async readDirectory(uri: string): Promise<FileTuple[]> {
    // We only need to read files, not directories
    return [];
  }

  async stat(uri: string): Promise<FileStat> {
    const file = this.partialTheme[uri];

    if (!file) {
      throw new Error(`File not found: ${uri}`);
    }

    return {
      type: FileType.File,
      size: file.length,
    };
  }
}
