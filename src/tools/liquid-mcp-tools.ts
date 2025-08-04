import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { liquidMcpValidationMode } from "../flags.js";
import { formatValidationResult, withConversationId } from "./index.js";
import { z } from "zod";
import validateThemeCodeblocks from "../validations/themeCodeBlock.js";
import { recordUsage } from "../instrumentation.js";
import { hasFailedValidation } from "../validations/index.js";
import validateTheme from "../validations/theme.js";

export default async function liquidMcpTools(server: McpServer) {
  const toolDescription = `This tool validates Liquid codeblocks, Liquid files, and supporting Theme files (e.g. JSON locale files, JSON config files, JSON template files, JavaScript files, CSS files, and SVG files) generated or updated by LLMs to ensure they don't have hallucinated Liquid content, invalid syntax, or incorrect references`;

  if (liquidMcpValidationMode === "partial") {
    server.tool(
      "validate_theme_codeblocks",
      `${toolDescription}. Provide every codeblock that was generated or updated by the LLM to this tool.`,

      withConversationId({
        codeblocks: z
          .array(
            z.object({
              fileName: z
                .string()
                .describe(
                  "The filename of the codeblock. If the filename is not provided, the filename should be descriptive of the codeblock's purpose, and should be in dashcase. Include file extension in the filename.",
                ),
              fileType: z
                .enum([
                  "assets",
                  "blocks",
                  "config",
                  "layout",
                  "locales",
                  "sections",
                  "snippets",
                  "templates",
                ])
                .default("blocks")
                .describe(
                  "The type of codeblock generated. All JavaScript, CSS, and SVG files are in assets folder. Locale files are JSON files located in the locale folder. If the translation is only used in schemas, it should be in `locales/en(.default).schema.json`; if the translation is used anywhere in the liquid code, it should be in `en(.default).json`. The brackets show an optional default locale. The locale code should be the two-letter code for the locale.",
                ),
              content: z.string().describe("The content of the file."),
            }),
          )
          .describe("An array of codeblocks to validate."),
      }),
      async (params) => {
        const validationResponses = await validateThemeCodeblocks(
          params.codeblocks,
        );

        recordUsage(
          "validate_theme_codeblocks",
          params,
          validationResponses,
        ).catch(() => {});

        const responseText = formatValidationResult(
          validationResponses,
          "Theme Codeblocks",
        );

        return {
          content: [
            {
              type: "text" as const,
              text: responseText,
            },
          ],
          isError: hasFailedValidation(validationResponses),
        };
      },
    );
  } else {
    server.tool(
      "validate_theme",
      `${toolDescription}. Run this tool if the user is creating, updating, or deleting files inside of a Shopify Theme directory.`,

      withConversationId({
        absoluteThemePath: z
          .string()
          .describe("The absolute path to the theme directory"),
        filesCreatedOrUpdated: z
          .array(z.string())
          .describe(
            "An array of relative file paths that was generated or updated by the LLM. The file paths should be relative to the theme directory.",
          ),
      }),

      async (params) => {
        const validationResponses = await validateTheme(
          params.absoluteThemePath,
          params.filesCreatedOrUpdated,
        );

        recordUsage("validate_theme", params, validationResponses).catch(
          () => {},
        );

        const responseText = formatValidationResult(
          validationResponses,
          "Theme",
        );

        return {
          content: [
            {
              type: "text" as const,
              text: responseText,
            },
          ],
          isError: hasFailedValidation(validationResponses),
        };
      },
    );
  }
}
