import validateGraphQLOperation from "./graphqlSchema.js";
import { ValidationFunctionResult, ValidationResult } from "../types.js";

/**
 * Validates multiple GraphQL Admin API codeblocks
 * @param codeblocks - Array of markdown code blocks containing GraphQL operations to validate
 * @returns ValidationToolResult with overall status and detailed checks
 */
export default async function validateAdminGraphQLCodeblocks(
  codeblocks: string[],
): Promise<ValidationFunctionResult> {
  const validationResponses = await Promise.all(
    codeblocks.map(async (block) => {
      return await validateGraphQLOperation(block, "admin");
    }),
  );

  return {
    valid: validationResponses.every(
      (response) => response.result === ValidationResult.SUCCESS,
    ),
    detailedChecks: validationResponses,
  };
}
