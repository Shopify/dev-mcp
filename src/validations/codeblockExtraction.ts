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
  /** Remove GraphQL comments (lines starting with #) */
  removeGraphqlComments?: boolean;
  /** Remove GraphQL directives (e.g., @deprecated, @include, @skip) */
  removeGraphqlDirectives?: boolean;
  /** Remove GraphQL fragment definitions and spread operations */
  removeGraphqlFragments?: boolean;
  /** Remove GraphQL variable definitions and usages */
  removeGraphqlVariables?: boolean;
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
    const beforeRemoval = extracted;
    extracted = extracted.replace(/<!--[\s\S]*?-->/g, ""); // Remove HTML comments

    // Only apply cleanup if comments were actually removed
    if (extracted !== beforeRemoval) {
      extracted = extracted
        .replace(/^\s*$/gm, "") // Remove lines that are now empty (whitespace only)
        .replace(/\n\n\n+/g, "\n\n") // Only collapse excessive empty lines (3+ → 2)
        .replace(/^\n/, "") // Remove leading empty line
        .replace(/\n$/, ""); // Remove trailing empty line
    }
  }

  // Remove JavaScript/CSS comments
  if (options.removeJsComments) {
    const beforeRemoval = extracted;
    extracted = extracted
      .replace(/\/\*[\s\S]*?\*\//g, "") // Remove /* */ comments
      .replace(/(^|\s)\/\/.*$/gm, "$1"); // Remove // comments (at start of line or after whitespace)

    // Only apply cleanup if comments were actually removed
    if (extracted !== beforeRemoval) {
      extracted = extracted
        .replace(/^\s*$/gm, "") // Remove lines that are now empty (whitespace only)
        .replace(/\n\n\n+/g, "\n\n") // Only collapse excessive empty lines (3+ → 2)
        .replace(/^\n/, "") // Remove leading empty line
        .replace(/\n$/, ""); // Remove trailing empty line
    }
  }

  // Remove GraphQL comments (lines starting with #)
  if (options.removeGraphqlComments) {
    extracted = extracted
      .replace(/^\s*#.*$/gm, "") // Remove # comments
      .replace(/^\s*$/gm, "") // Remove lines that are now empty (whitespace only)
      .replace(/\n\n+/g, "\n") // Collapse multiple consecutive empty lines into single empty line
      .replace(/^\n/, "") // Remove leading empty line
      .replace(/\n$/, ""); // Remove trailing empty line
  }

  // Remove GraphQL directives (e.g., @deprecated, @include, @skip)
  if (options.removeGraphqlDirectives) {
    extracted = extracted
      .replace(/\s+@\w+(?:\([^)]*\))?/g, "") // Remove @directive and @directive(args)
      .replace(/^\s*$/gm, "") // Remove lines that are now empty (whitespace only)
      .replace(/\n\n+/g, "\n") // Collapse multiple consecutive empty lines into single empty line
      .replace(/^\n/, "") // Remove leading empty line
      .replace(/\n$/, ""); // Remove trailing empty line
  }

  // Remove GraphQL fragment definitions and spread operations
  if (options.removeGraphqlFragments) {
    extracted = extracted
      .replace(/fragment\s+\w+\s+on\s+\w+\s*\{[\s\S]*?\}/g, "") // Remove fragment definitions
      .replace(/\.\.\.\w+/g, "") // Remove fragment spreads
      .replace(/^\s*$/gm, "") // Remove lines that are now empty (whitespace only)
      .replace(/\n\n+/g, "\n") // Collapse multiple consecutive empty lines into single empty line
      .replace(/^\n/, "") // Remove leading empty line
      .replace(/\n$/, ""); // Remove trailing empty line
  }

  // Remove GraphQL variable definitions and usages
  if (options.removeGraphqlVariables) {
    extracted = extracted
      .replace(/\(\s*\$[^)]*\)/g, "()") // Remove variable definitions in operation
      .replace(/\$\w+/g, "") // Remove variable usages
      .replace(/^\s*$/gm, "") // Remove lines that are now empty (whitespace only)
      .replace(/\n\n+/g, "\n") // Collapse multiple consecutive empty lines into single empty line
      .replace(/^\n/, "") // Remove leading empty line
      .replace(/\n$/, ""); // Remove trailing empty line
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

  /** For GraphQL validation with comment removal */
  graphqlClean: {
    trimWhitespace: true,
    removeMarkdownBlocks: true,
    removeGraphqlComments: true,
  } as CodeblockExtractionOptions,

  /** For GraphQL validation with comprehensive cleaning */
  graphqlStrict: {
    trimWhitespace: true,
    removeMarkdownBlocks: true,
    removeGraphqlComments: true,
    removeGraphqlDirectives: true,
    removeGraphqlFragments: true,
    removeGraphqlVariables: true,
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

/**
 * Extract GraphQL code from codeblocks with comprehensive cleaning
 * This removes comments, directives, fragments, and variables for schema validation
 */
export function extractGraphQLCode(codeblock: string): string {
  return extractCodeWithStrategy(codeblock, "graphqlStrict");
}

/**
 * Extract GraphQL code from codeblocks with basic cleaning
 * This removes markdown blocks and comments but preserves directives and fragments
 */
export function extractGraphQLCodeClean(codeblock: string): string {
  return extractCodeWithStrategy(codeblock, "graphqlClean");
}
