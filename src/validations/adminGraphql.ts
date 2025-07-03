import validateGraphQLOperation from "./graphqlSchema.js";
import { ValidationFunctionResult } from "../types.js";

/**
 * Validates GraphQL Admin API operations from a markdown response
 * @param markdownResponse - Markdown response containing GraphQL codeblocks to validate
 * @returns ValidationFunctionResult with overall status and detailed checks
 */
export default async function validateAdminGraphQLCodeblocks(
  markdownResponse: string,
): Promise<ValidationFunctionResult> {
  // Insert more validation requirements here...
  return await validateGraphQLOperation(markdownResponse, "admin");
}
