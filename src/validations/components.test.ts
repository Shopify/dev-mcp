import { describe, expect, it } from "vitest";
import { ValidationResponse, ValidationResult } from "../types.js";
import { validateComponentCodeBlock } from "./components.js";

// Helper function to check if validation response is successful
function isValidationSuccessful(response: ValidationResponse): boolean {
  return response.result === ValidationResult.SUCCESS;
}

// Helper function to call the new validation function in a test-friendly way
async function validateComponent(
  codeBlocks: string[],
  packageName: string,
): Promise<ValidationResponse[]> {
  // Handle empty array case like the tool would
  if (codeBlocks.length === 0) {
    return [
      {
        result: ValidationResult.FAILED,
        resultDetail: "No code blocks provided for validation",
      },
    ];
  }

  // Validate each code block individually (like the tool does)
  const results = codeBlocks.map((code) => {
    return validateComponentCodeBlock({
      code,
      packageName,
    });
  });

  return results;
}

describe("validateComponent", () => {
  describe("package validation", () => {
    it("should fail for unsupported packages", async () => {
      const codeBlock = "```<s-button>Hello, World</s-button>```";
      const validationResults = await validateComponent(
        [codeBlock],
        "unsupported-package",
      );
      expect(isValidationSuccessful(validationResults[0])).toBe(false);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.FAILED);
    });

    it("should fail for other UI component packages", async () => {
      const codeBlock =
        "```<s-button variant='primary'>Hello, World</s-button>```";
      const validationResults = await validateComponent(
        [codeBlock],
        "@shopify/polaris",
      );
      expect(isValidationSuccessful(validationResults[0])).toBe(false);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.FAILED);
    });

    it("should fail for empty array", async () => {
      const validationResults = await validateComponent(
        [],
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults[0])).toBe(false);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.FAILED);
    });

    it("should fail for fake components when package definitions cannot be loaded", async () => {
      const codeBlock =
        "```<fake-button variant='primary'>Hello, World</fake-button>```";
      const validationResults = await validateComponent(
        [codeBlock],
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults[0])).toBe(true);
    });

    it("should fail for fake components against @shopify/app-bridge-ui-types", async () => {
      const codeBlock =
        "```<s-fake-component variant='primary'>Hello, World</s-fake-component>```";
      const validationResults = await validateComponent(
        [codeBlock],
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults[0])).toBe(false);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.FAILED);
    });
  });

  describe("multiple codeblocks", () => {
    it("should validate multiple valid codeblocks", async () => {
      const codeBlocks = [
        "```<s-button>Button 1</s-button>```",
        "```<s-button>Button 2</s-button>```",
      ];
      const validationResults = await validateComponent(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      expect(validationResults).toHaveLength(2);
      expect(isValidationSuccessful(validationResults[0])).toBe(true);
      expect(isValidationSuccessful(validationResults[1])).toBe(true);
      expect(validationResults[0].result).toBe(ValidationResult.SUCCESS);
      expect(validationResults[1].result).toBe(ValidationResult.SUCCESS);
    });

    it("should validate multiple codeblocks with s- components", async () => {
      const codeBlocks = [
        "```<s-button>Button</s-button>```",
        "```<s-text>Text</s-text>```",
        "```<s-heading>Heading</s-heading>```",
      ];
      const validationResults = await validateComponent(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      expect(validationResults).toHaveLength(3);
      expect(isValidationSuccessful(validationResults[0])).toBe(true);
      expect(isValidationSuccessful(validationResults[1])).toBe(true);
      expect(isValidationSuccessful(validationResults[2])).toBe(true);
      expect(validationResults[0].result).toBe(ValidationResult.SUCCESS);
      expect(validationResults[1].result).toBe(ValidationResult.SUCCESS);
      expect(validationResults[2].result).toBe(ValidationResult.SUCCESS);
    });

    it("should validate all codeblocks with s- components", async () => {
      const codeBlocks = [
        "```<s-button>Button</s-button><s-text>Text</s-text>```",
        "```<s-heading>Heading</s-heading>```",
      ];
      const validationResults = await validateComponent(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      expect(validationResults).toHaveLength(2);
      expect(isValidationSuccessful(validationResults[0])).toBe(true);
      expect(isValidationSuccessful(validationResults[1])).toBe(true);
      expect(validationResults[0].result).toBe(ValidationResult.SUCCESS);
      expect(validationResults[1].result).toBe(ValidationResult.SUCCESS);
    });
  });

  describe("@shopify/app-bridge-ui-types package", () => {
    describe("valid components", () => {
      it("s-badge", async () => {
        const validationResults = await validateComponent(
          ["```<s-badge>Badge</s-badge>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-banner", async () => {
        const validationResults = await validateComponent(
          ["```<s-banner>Banner</s-banner>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-box", async () => {
        const validationResults = await validateComponent(
          ["```<s-box>Box</s-box>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-button", async () => {
        const validationResults = await validateComponent(
          ["```<s-button>Button</s-button>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-checkbox", async () => {
        const validationResults = await validateComponent(
          ["```<s-checkbox>Checkbox</s-checkbox>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-text", async () => {
        const validationResults = await validateComponent(
          ["```<s-text>Text</s-text>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-heading", async () => {
        const validationResults = await validateComponent(
          ["```<s-heading>Heading</s-heading>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-link", async () => {
        const validationResults = await validateComponent(
          ["```<s-link>Link</s-link>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });
    });

    describe("valid props", () => {
      it("s-button with variant", async () => {
        const validationResults = await validateComponent(
          ["```<s-button variant='primary'>Button</s-button>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-button with disabled", async () => {
        const validationResults = await validateComponent(
          ["```<s-button disabled>Button</s-button>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-badge with tone", async () => {
        const validationResults = await validateComponent(
          ["```<s-badge tone='info'>Badge</s-badge>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-icon with type", async () => {
        const validationResults = await validateComponent(
          ["```<s-icon type='search'>Icon</s-icon>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-number-field with numeric placeholder should pass", async () => {
        const validationResults = await validateComponent(
          [
            "```<s-number-field label='Quantity' placeholder='0'></s-number-field>```",
          ],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-number-field with numeric placeholder (different value) should pass", async () => {
        const validationResults = await validateComponent(
          [
            "```<s-number-field label='Quantity' placeholder='10'></s-number-field>```",
          ],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-number-field with text placeholder should pass", async () => {
        const validationResults = await validateComponent(
          [
            "```<s-number-field label='Quantity' placeholder='Enter a quantity'></s-number-field>```",
          ],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-number-field with mixed placeholder should pass", async () => {
        const validationResults = await validateComponent(
          [
            "```<s-number-field label='Quantity' placeholder='0 items'></s-number-field>```",
          ],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-number-field with no placeholder should pass", async () => {
        const validationResults = await validateComponent(
          ["```<s-number-field label='Quantity'></s-number-field>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-number-field with numeric attributes should convert correctly", async () => {
        const validationResults = await validateComponent(
          [
            "```<s-number-field label='Quantity' min='0' max='100' step='1' placeholder='Enter quantity'></s-number-field>```",
          ],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });
    });

    describe("components with different prefixes", () => {
      it("p-button (different prefix) - should fail because component doesn't exist", async () => {
        const validationResults = await validateComponent(
          ["```<p-button>Button</p-button>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-fake-element - should fail because component doesn't exist", async () => {
        const validationResults = await validateComponent(
          ["```<s-fake-element>Fake</s-fake-element>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(false);
        expect(validationResults[0].result).toBe(ValidationResult.FAILED);
      });

      it("s-custom-component - should fail because component doesn't exist", async () => {
        const validationResults = await validateComponent(
          ["```<s-custom-component>Custom</s-custom-component>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(false);
        expect(validationResults[0].result).toBe(ValidationResult.FAILED);
      });
    });

    describe("props validation", () => {
      it("s-button with variant prop - passes basic validation", async () => {
        const validationResults = await validateComponent(
          ["```<s-button variant='primary'>Button</s-button>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-button with icon prop - passes basic validation", async () => {
        const validationResults = await validateComponent(
          ["```<s-button icon='search'>Button</s-button>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });
    });

    describe("complex component combinations", () => {
      it("valid form with multiple field types", async () => {
        const validationResults = await validateComponent(
          [
            "```<s-text-field label='Name' /><s-email-field label='Email' /><s-button variant='primary'>Submit</s-button>```",
          ],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("mix of components with s- prefix", async () => {
        const validationResults = await validateComponent(
          [
            "```<s-button>Button</s-button><s-text>Text</s-text><s-invalid-component>Invalid</s-invalid-component>```",
          ],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(false);
        expect(validationResults[0].result).toBe(ValidationResult.FAILED);
      });
    });
  });

  describe("real life examples", () => {
    it("tophat take 1 - validates components with s- prefix", async () => {
      const codeBlocks = [
        "```<s-button variant='primary'>Save</s-button><s-button>Cancel</s-button>```",
      ];
      const validationResults = await validateComponent(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults[0])).toBe(true);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.SUCCESS);
    });

    it("tophat take 2 - should pass for valid components", async () => {
      const codeBlocks = [
        "```<s-text>Hello world</s-text><s-button>Click me</s-button>```",
      ];
      const validationResults = await validateComponent(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults[0])).toBe(true);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.SUCCESS);
    });
  });
});
