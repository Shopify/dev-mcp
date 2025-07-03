import { describe, it, expect, vi, beforeEach } from "vitest";
import validateAdminGraphQLCodeblocks from "./adminGraphql.js";
import validateGraphQLOperation from "./graphqlSchema.js";
import { ValidationResult } from "../types.js";

// Mock the graphqlSchema module
vi.mock("./graphqlSchema.js", () => ({
  default: vi.fn(),
}));

describe("validateAdminGraphQLCodeblocks", () => {
  const mockValidateGraphQLOperation = vi.mocked(validateGraphQLOperation);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate multiple codeblocks in markdown response", async () => {
    mockValidateGraphQLOperation.mockResolvedValueOnce({
      valid: true,
      detailedChecks: [
        {
          result: ValidationResult.SUCCESS,
          resultDetail: "Valid GraphQL query",
        },
        {
          result: ValidationResult.SUCCESS,
          resultDetail: "Valid GraphQL mutation",
        },
      ],
    });

    const markdownResponse = `
Here are some GraphQL operations:

\`\`\`graphql
query { products { id } }
\`\`\`

\`\`\`graphql
mutation { productCreate(input: {}) { product { id } } }
\`\`\`
    `;

    const result = await validateAdminGraphQLCodeblocks(markdownResponse);

    expect(mockValidateGraphQLOperation).toHaveBeenCalledTimes(1);
    expect(mockValidateGraphQLOperation).toHaveBeenCalledWith(
      markdownResponse,
      "admin",
    );

    expect(result).toEqual({
      valid: true,
      detailedChecks: [
        {
          result: ValidationResult.SUCCESS,
          resultDetail: "Valid GraphQL query",
        },
        {
          result: ValidationResult.SUCCESS,
          resultDetail: "Valid GraphQL mutation",
        },
      ],
    });
  });

  it("should return valid: true only when all validations succeed", async () => {
    mockValidateGraphQLOperation.mockResolvedValueOnce({
      valid: true,
      detailedChecks: [
        {
          result: ValidationResult.SUCCESS,
          resultDetail: "Valid GraphQL",
        },
        {
          result: ValidationResult.SUCCESS,
          resultDetail: "Valid GraphQL",
        },
      ],
    });

    const markdownResponse = `
\`\`\`graphql
query { products { id } }
\`\`\`

\`\`\`graphql
query { shop { name } }
\`\`\`
    `;

    const result = await validateAdminGraphQLCodeblocks(markdownResponse);

    expect(result.valid).toBe(true);
    expect(result.detailedChecks).toHaveLength(2);
  });

  it("should return valid: false when any validation fails", async () => {
    mockValidateGraphQLOperation.mockResolvedValueOnce({
      valid: false,
      detailedChecks: [
        {
          result: ValidationResult.SUCCESS,
          resultDetail: "Valid GraphQL",
        },
        {
          result: ValidationResult.FAILED,
          resultDetail: "Invalid GraphQL",
        },
      ],
    });

    const markdownResponse = `
\`\`\`graphql
query { products { id } }
\`\`\`

\`\`\`graphql
query { invalidField }
\`\`\`
    `;

    const result = await validateAdminGraphQLCodeblocks(markdownResponse);

    expect(result.valid).toBe(false);
    expect(result.detailedChecks).toHaveLength(2);
    expect(result.detailedChecks[0].result).toBe(ValidationResult.SUCCESS);
    expect(result.detailedChecks[1].result).toBe(ValidationResult.FAILED);
  });

  it("should return valid: false when any validation is skipped", async () => {
    mockValidateGraphQLOperation.mockResolvedValueOnce({
      valid: false,
      detailedChecks: [
        {
          result: ValidationResult.SUCCESS,
          resultDetail: "Valid GraphQL",
        },
        {
          result: ValidationResult.SKIPPED,
          resultDetail: "Skipped empty codeblock",
        },
      ],
    });

    const markdownResponse = `
\`\`\`graphql
query { products { id } }
\`\`\`

\`\`\`graphql

\`\`\`
    `;

    const result = await validateAdminGraphQLCodeblocks(markdownResponse);

    expect(result.valid).toBe(false);
    expect(result.detailedChecks).toHaveLength(2);
    expect(result.detailedChecks[0].result).toBe(ValidationResult.SUCCESS);
    expect(result.detailedChecks[1].result).toBe(ValidationResult.SKIPPED);
  });

  it("should handle empty markdown response", async () => {
    mockValidateGraphQLOperation.mockResolvedValueOnce({
      valid: false,
      detailedChecks: [
        {
          result: ValidationResult.SKIPPED,
          resultDetail:
            "No GraphQL codeblocks found in the provided markdown response.",
        },
      ],
    });

    const result = await validateAdminGraphQLCodeblocks("");

    expect(mockValidateGraphQLOperation).toHaveBeenCalledTimes(1);
    expect(result.valid).toBe(false);
    expect(result.detailedChecks).toHaveLength(1);
    expect(result.detailedChecks[0].result).toBe(ValidationResult.SKIPPED);
  });

  it("should handle single codeblock", async () => {
    mockValidateGraphQLOperation.mockResolvedValueOnce({
      valid: true,
      detailedChecks: [
        {
          result: ValidationResult.SUCCESS,
          resultDetail: "Valid GraphQL",
        },
      ],
    });

    const markdownResponse = `
\`\`\`graphql
query { products { id } }
\`\`\`
    `;

    const result = await validateAdminGraphQLCodeblocks(markdownResponse);

    expect(mockValidateGraphQLOperation).toHaveBeenCalledTimes(1);
    expect(result.valid).toBe(true);
    expect(result.detailedChecks).toHaveLength(1);
  });

  it("should propagate validation errors", async () => {
    mockValidateGraphQLOperation.mockResolvedValueOnce({
      valid: false,
      detailedChecks: [
        {
          result: ValidationResult.FAILED,
          resultDetail: "Validation error: Schema loading failed",
        },
      ],
    });

    const markdownResponse = `
\`\`\`graphql
query { products { id } }
\`\`\`
    `;

    const result = await validateAdminGraphQLCodeblocks(markdownResponse);

    expect(result.valid).toBe(false);
    expect(result.detailedChecks[0].result).toBe(ValidationResult.FAILED);
    expect(result.detailedChecks[0].resultDetail).toContain(
      "Schema loading failed",
    );
  });
});
