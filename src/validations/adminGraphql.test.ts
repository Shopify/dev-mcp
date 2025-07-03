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

  it("should validate multiple codeblocks in parallel", async () => {
    mockValidateGraphQLOperation
      .mockResolvedValueOnce({
        result: ValidationResult.SUCCESS,
        resultDetail: "Valid GraphQL query",
      })
      .mockResolvedValueOnce({
        result: ValidationResult.SUCCESS,
        resultDetail: "Valid GraphQL mutation",
      });

    const codeblocks = [
      "```graphql\nquery { products { id } }\n```",
      "```graphql\nmutation { productCreate(input: {}) { product { id } } }\n```",
    ];

    const result = await validateAdminGraphQLCodeblocks(codeblocks);

    expect(mockValidateGraphQLOperation).toHaveBeenCalledTimes(2);
    expect(mockValidateGraphQLOperation).toHaveBeenNthCalledWith(
      1,
      codeblocks[0],
      "admin",
    );
    expect(mockValidateGraphQLOperation).toHaveBeenNthCalledWith(
      2,
      codeblocks[1],
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
    mockValidateGraphQLOperation
      .mockResolvedValueOnce({
        result: ValidationResult.SUCCESS,
        resultDetail: "Valid GraphQL",
      })
      .mockResolvedValueOnce({
        result: ValidationResult.SUCCESS,
        resultDetail: "Valid GraphQL",
      });

    const result = await validateAdminGraphQLCodeblocks([
      "```graphql\nquery { products { id } }\n```",
      "```graphql\nquery { shop { name } }\n```",
    ]);

    expect(result.valid).toBe(true);
    expect(result.detailedChecks).toHaveLength(2);
  });

  it("should return valid: false when any validation fails", async () => {
    mockValidateGraphQLOperation
      .mockResolvedValueOnce({
        result: ValidationResult.SUCCESS,
        resultDetail: "Valid GraphQL",
      })
      .mockResolvedValueOnce({
        result: ValidationResult.FAILED,
        resultDetail: "Invalid GraphQL",
      });

    const result = await validateAdminGraphQLCodeblocks([
      "```graphql\nquery { products { id } }\n```",
      "```graphql\nquery { invalidField }\n```",
    ]);

    expect(result.valid).toBe(false);
    expect(result.detailedChecks).toHaveLength(2);
    expect(result.detailedChecks[0].result).toBe(ValidationResult.SUCCESS);
    expect(result.detailedChecks[1].result).toBe(ValidationResult.FAILED);
  });

  it("should return valid: false when any validation is skipped", async () => {
    mockValidateGraphQLOperation
      .mockResolvedValueOnce({
        result: ValidationResult.SUCCESS,
        resultDetail: "Valid GraphQL",
      })
      .mockResolvedValueOnce({
        result: ValidationResult.SKIPPED,
        resultDetail: "Skipped empty codeblock",
      });

    const result = await validateAdminGraphQLCodeblocks([
      "```graphql\nquery { products { id } }\n```",
      "```graphql\n\n```",
    ]);

    expect(result.valid).toBe(false);
    expect(result.detailedChecks).toHaveLength(2);
    expect(result.detailedChecks[0].result).toBe(ValidationResult.SUCCESS);
    expect(result.detailedChecks[1].result).toBe(ValidationResult.SKIPPED);
  });

  it("should handle empty codeblocks array", async () => {
    const result = await validateAdminGraphQLCodeblocks([]);

    expect(mockValidateGraphQLOperation).not.toHaveBeenCalled();
    expect(result).toEqual({
      valid: true,
      detailedChecks: [],
    });
  });

  it("should handle single codeblock", async () => {
    mockValidateGraphQLOperation.mockResolvedValueOnce({
      result: ValidationResult.SUCCESS,
      resultDetail: "Valid GraphQL",
    });

    const result = await validateAdminGraphQLCodeblocks([
      "```graphql\nquery { products { id } }\n```",
    ]);

    expect(mockValidateGraphQLOperation).toHaveBeenCalledTimes(1);
    expect(result.valid).toBe(true);
    expect(result.detailedChecks).toHaveLength(1);
  });

  it("should propagate validation errors", async () => {
    mockValidateGraphQLOperation.mockRejectedValueOnce(
      new Error("Schema loading failed"),
    );

    await expect(
      validateAdminGraphQLCodeblocks([
        "```graphql\nquery { products { id } }\n```",
      ]),
    ).rejects.toThrow("Schema loading failed");
  });
});
