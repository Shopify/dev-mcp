import {
  AbstractFileSystem,
  check,
  Config,
  FileStat,
  FileTuple,
  recommended,
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
  extractCodeblocksWithRegex,
  validationResult,
} from "./validationUtils.js";

/**
 * Validates Theme codeblocks from a markdown response
 * @param markdownResponse - Markdown response containing Theme codeblocks
 * @returns ValidationFunctionResult with overall status and detailed checks
 */
export default async function validateLiquidCodeblocks(
  markdownResponse: string,
): Promise<ValidationFunctionResult> {
  // Insert more validation requirements here...
  try {
    const codeblocks = extractLiquidCodeblocks(markdownResponse);

    console.error("[validation] codeblocks: ", codeblocks);

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

function extractLiquidCodeblocks(markdownResponse: string): string[] {
  const primaryRegex = /```(?:liquid)(?:\s+[\w\s]*?)?\s*\n?([\s\S]*?)\n?```/g;
  return extractCodeblocksWithRegex(markdownResponse, primaryRegex);
}

function handleNoCodeblocksFound(
  codeblocks: string[],
): ValidationFunctionResult | null {
  if (codeblocks.length === 0) {
    return createFailedResult([
      validationResult(
        ValidationResult.SKIPPED,
        "No GraphQL codeblocks found in the provided markdown response.",
      ),
    ]);
  }
  return null;
}

async function validateAllCodeblocks(
  codeblocks: string[],
): Promise<ValidationFunctionResult> {
  const validationResponses = await Promise.all(
    codeblocks.map(async (codeblock) => {
      return await validateLiquidCodeblock(codeblock);
    }),
  );

  return createValidationResult(validationResponses);
}

async function validateLiquidCodeblock(
  codeblock: string,
): Promise<ValidationResponse> {
  const source = toSourceCode("file://example.liquid", codeblock, undefined);
  const mockFs = new MockFileSystem();

  const themeDesc = {
    "snippets/example.liquid": codeblock,
  };

  const config: Config = {
    checks: recommended,
    settings: {},
    rootUri: "/",
    context: "theme",
  };

  const offenses = await check([source], config, {
    fs: mockFs,
  });

  if (offenses.length > 0) {
    return validationResult(
      ValidationResult.FAILED,
      `Liquid codeblock offenses: ${offenses.map((o) => o.message).join("; ")}`,
    );
  }

  return validationResult(
    ValidationResult.SUCCESS,
    "Liquid codeblock validated successfully.",
  );
}

// A lot of theme checks require a file system to work
// We don't really care about those checks so we will mock the file system
class MockFileSystem implements AbstractFileSystem {
  constructor() {}

  async readFile(uri: string): Promise<string> {
    throw new Error("not implemented read file");
  }

  async readDirectory(uri: string): Promise<FileTuple[]> {
    throw new Error("not implemented read directory");
  }

  async stat(uri: string): Promise<FileStat> {
    throw new Error("not implemented stat");
  }
}
