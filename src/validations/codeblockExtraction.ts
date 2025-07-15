/**
 * Utilities for extracting code from markdown codeblocks and other formats
 * Different validation types need different extraction strategies
 */

export interface CodeblockExtractionOptions {
  /** Remove markdown code block markers */
  removeMarkdownBlocks?: boolean;
  /** Remove HTML comments */
  removeHtmlComments?: boolean;
  /** Remove JavaScript/CSS comments */
  removeJsComments?: boolean;
  /** Trim whitespace from start and end */
  trimWhitespace?: boolean;
}

/**
 * Extract clean code from a codeblock based on the specified options
 */
export function extractCodeFromBlock(
  codeblock: string,
  options: CodeblockExtractionOptions = {},
): string {
  let extracted = codeblock;

  // Always trim by default unless explicitly disabled
  if (options.trimWhitespace !== false) {
    extracted = extracted.trim();
  }

  // Remove markdown code block markers
  if (options.removeMarkdownBlocks) {
    extracted = extracted
      .replace(/^```[\w]*\n?/, "") // Remove opening ```lang
      .replace(/\n?```$/, ""); // Remove closing ```
  }

  // Remove HTML comments
  if (options.removeHtmlComments) {
    extracted = extracted.replace(/<!--[\s\S]*?-->/g, "");
  }

  // Remove JavaScript/CSS comments
  if (options.removeJsComments) {
    extracted = extracted
      .replace(/\/\*[\s\S]*?\*\//g, "") // Remove /* */ comments
      .replace(/\/\/.*$/gm, ""); // Remove // comments
  }

  return extracted;
}

/**
 * Predefined extraction strategies for different validation types
 */
export const EXTRACTION_STRATEGIES = {
  /** For GraphQL validation - minimal extraction, just trim */
  graphql: {
    trimWhitespace: true,
  } as CodeblockExtractionOptions,

  /** For TypeScript/HTML component validation - comprehensive extraction */
  typescript: {
    trimWhitespace: true,
    removeMarkdownBlocks: true,
    removeHtmlComments: true,
  } as CodeblockExtractionOptions,

  /** For JavaScript validation */
  javascript: {
    trimWhitespace: true,
    removeMarkdownBlocks: true,
    removeJsComments: true,
  } as CodeblockExtractionOptions,

  /** No extraction at all */
  none: {} as CodeblockExtractionOptions,
} as const;

/**
 * Extract code using a predefined strategy
 */
export function extractCodeWithStrategy(
  codeblock: string,
  strategy: keyof typeof EXTRACTION_STRATEGIES,
): string {
  return extractCodeFromBlock(codeblock, EXTRACTION_STRATEGIES[strategy]);
}

/**
 * Extract TypeScript code from codeblocks
 * This is what the TypeScript validation uses
 */
export function extractTypeScriptCode(codeblock: string): string {
  return extractCodeWithStrategy(codeblock, "typescript");
}
