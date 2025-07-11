import {
  AbstractFileSystem,
  check,
  Config,
  FileStat,
  FileTuple,
  FileType,
  recommended,
  SourceCode,
  toSourceCode,
} from "@shopify/theme-check-common";
import {
  ValidationFunctionResult,
  ValidationResponse,
  ValidationResult,
} from "../types.js";
import {
  createFailedResult,
  createValidationResult,
  validationResult,
} from "./validationUtils.js";
import { ThemeLiquidDocsManager } from "@shopify/theme-check-docs-updater";

type LiquidCodeblock = {
  fileName: string;
  fileType:
    | "blocks"
    | "snippets"
    | "sections"
    | "layout"
    | "config"
    | "locales"
    | "assets";
  fileExtension: string;
  content: string;
};

/**
 * Validates Liquid codeblocks content
 * @param codeblocks - An array of objects containing the filename, filetype, and content of the codeblock
 * @returns ValidationFunctionResult with overall status and detailed checks
 */
export default async function validateLiquidCodeblocks(
  codeblocks: LiquidCodeblock[],
): Promise<ValidationFunctionResult> {
  try {
    const noCodeblocksResult = handleNoCodeblocksFound(codeblocks);
    if (noCodeblocksResult) {
      return noCodeblocksResult;
    }

    return await validateAllCodeblocks(codeblocks);
  } catch (error) {
    return createFailedResult([
      validationResult(
        ValidationResult.FAILED,
        `Validation error: ${error instanceof Error ? error.message : String(error)}`,
      ),
    ]);
  }
}

function handleNoCodeblocksFound(
  codeblocks: LiquidCodeblock[],
): ValidationFunctionResult | null {
  if (codeblocks.length === 0) {
    return createFailedResult([
      validationResult(
        ValidationResult.SKIPPED,
        "No Liquid codeblocks found in the provided markdown response.",
      ),
    ]);
  }
  return null;
}

async function validateAllCodeblocks(
  codeblocks: LiquidCodeblock[],
): Promise<ValidationFunctionResult> {
  const partialTheme = codeblocks.reduce(
    (theme, codeblock) => {
      const uri = `file:///${codeblock.fileType}/${codeblock.fileName}.${codeblock.fileExtension}`;

      theme[uri] = toSourceCode(uri, codeblock.content, undefined);
      return theme;
    },
    {} as Record<string, SourceCode>,
  );

  const offenses = await runThemeCheck(partialTheme);

  const fileUriToOffenses = offenses.reduce(
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

  const validationResults = [] as ValidationResponse[];

  for (let uri of Object.keys(partialTheme)) {
    if (fileUriToOffenses[uri]) {
      validationResults.push(
        validationResult(
          ValidationResult.FAILED,
          `Liquid codeblock ${uri} has the following offenses from using Shopify's Theme Check:\n\n${fileUriToOffenses[uri].join("\n\n")}`,
        ),
      );
    } else {
      validationResults.push(
        validationResult(
          ValidationResult.SUCCESS,
          `Liquid codeblock ${uri} had no offenses from using Shopify's Theme Check.`,
        ),
      );
    }
  }

  return createValidationResult(validationResults);
}

async function runThemeCheck(partialTheme: Record<string, SourceCode>) {
  const mockFs = new MockFileSystem(partialTheme);
  const config: Config = {
    checks: recommended,
    settings: {},
    rootUri: "file:///",
    context: "theme",
  };
  const docsManager = new ThemeLiquidDocsManager();

  return await check(Object.values(partialTheme), config, {
    fs: mockFs,
    themeDocset: docsManager,
    jsonValidationSet: docsManager,
  });
}

// We mimic a theme on a file system to be able to run theme checks
class MockFileSystem implements AbstractFileSystem {
  constructor(private partialTheme: Record<string, SourceCode>) {}

  async readFile(uri: string): Promise<string> {
    const file = this.partialTheme[uri];

    if (!file) {
      throw new Error(`File not found: ${uri}`);
    }

    return file.source;
  }

  async readDirectory(uri: string): Promise<FileTuple[]> {
    // not implemented
    return [];
  }

  async stat(uri: string): Promise<FileStat> {
    if (this.partialTheme[uri]) {
      return {
        type: FileType.File,
        size: this.partialTheme[uri].source.length,
      };
    }
    throw new Error(`File not found: ${uri}`);
  }
}
