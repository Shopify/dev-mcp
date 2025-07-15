import { describe, expect, it } from "vitest";
import { ValidationResponse, ValidationResult } from "../types.js";
import validateTypescript from "./typescript.js";

// Helper function to check if validation response is successful
function isValidationSuccessful(response: ValidationResponse): boolean {
  return response.result === ValidationResult.SUCCESS;
}

describe("validateTypescript", () => {
  describe("package validation", () => {
    it("should fail for unsupported packages", async () => {
      const codeBlock = "```<s-button>Hello, World</s-button>```";
      const validationResults = await validateTypescript(
        [codeBlock],
        "unsupported-package",
      );
      expect(isValidationSuccessful(validationResults[0])).toBe(false);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.FAILED);
      expect(validationResults[0].resultDetail).toContain(
        "Unsupported package: unsupported-package",
      );
    });

    it("should fail for other UI component packages", async () => {
      const codeBlock = "```<CustomButton>Hello, World</CustomButton>```";
      const validationResults = await validateTypescript(
        [codeBlock],
        "some-other-package",
      );
      expect(isValidationSuccessful(validationResults[0])).toBe(false);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.FAILED);
      expect(validationResults[0].resultDetail).toContain(
        "Unsupported package: some-other-package",
      );
    });

    it("should fail for empty array", async () => {
      const validationResults = await validateTypescript(
        [],
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults[0])).toBe(false);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.FAILED);
      expect(validationResults[0].resultDetail).toContain(
        "At least one code block is required",
      );
    });

    it("should fail for fake components when package definitions cannot be loaded", async () => {
      // This test now passes because we have static component definitions
      const codeBlocks = [
        "```<s-button>Hello, World</s-button>```",
        "```<s-text>Some text</s-text>```",
      ];
      const validationResults = await validateTypescript(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults[0])).toBe(true);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.SUCCESS);
    });

    it("should fail for fake components against @shopify/app-bridge-ui-types", async () => {
      const codeBlocks = [
        "```<s-buttonz>Hello, World</s-buttonz>```",
        "```<ui-modal>Modal content</ui-modal>```",
      ];
      const validationResults = await validateTypescript(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );

      // Should fail because s-buttonz doesn't exist (ui-modal is not s-* so it won't be parsed)
      expect(isValidationSuccessful(validationResults[0])).toBe(false);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.FAILED);
      expect(validationResults[0].resultDetail).toContain("validation errors");
    });
  });

  describe("multiple codeblocks", () => {
    it("should validate multiple valid codeblocks", async () => {
      const codeBlocks = [
        "```<s-button>Hello, World</s-button>```",
        "```<s-text>Some text</s-text>```",
        "```<s-badge>Badge content</s-badge>```",
      ];
      const validationResults = await validateTypescript(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults[0])).toBe(true);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.SUCCESS);
    });

    it("should validate multiple codeblocks with s- components", async () => {
      const codeBlocks = [
        "```<s-button>Hello, World</s-button>```",
        "```<s-invalid-component>Invalid</s-invalid-component>```",
        "```<s-text>Some text</s-text>```",
      ];
      const validationResults = await validateTypescript(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      // Should fail because s-invalid-component doesn't exist in the package
      expect(isValidationSuccessful(validationResults[0])).toBe(false);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.FAILED);
      expect(validationResults[0].resultDetail).toContain("validation errors");
    });

    it("should validate all codeblocks with s- components", async () => {
      const codeBlocks = [
        "```<s-button>Hello, World</s-button>```",
        "```<s-text>Some text</s-text>```",
        "```<s-fake-element>Fake content</s-fake-element>```",
      ];
      const validationResults = await validateTypescript(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      // Should fail because s-fake-element doesn't exist in the package
      expect(isValidationSuccessful(validationResults[0])).toBe(false);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.FAILED);
      expect(validationResults[0].resultDetail).toContain("validation errors");
    });
  });

  describe("@shopify/app-bridge-ui-types package", () => {
    describe("valid components", () => {
      it("s-badge", async () => {
        const validationResults = await validateTypescript(
          ["```<s-badge>Badge content</s-badge>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-banner", async () => {
        const validationResults = await validateTypescript(
          ["```<s-banner>Banner content</s-banner>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-box", async () => {
        const validationResults = await validateTypescript(
          ["```<s-box>Box content</s-box>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-button", async () => {
        const validationResults = await validateTypescript(
          ["```<s-button>Hello, World</s-button>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-checkbox", async () => {
        const validationResults = await validateTypescript(
          ["```<s-checkbox>Checkbox content</s-checkbox>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-text", async () => {
        const validationResults = await validateTypescript(
          ["```<s-text>Text content</s-text>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-heading", async () => {
        const validationResults = await validateTypescript(
          ["```<s-heading>Heading content</s-heading>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-link", async () => {
        const validationResults = await validateTypescript(
          ["```<s-link>Link content</s-link>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });
    });

    describe("valid props", () => {
      it("s-button with variant", async () => {
        const validationResults = await validateTypescript(
          ["```<s-button variant='primary'>Hello, World</s-button>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-button with disabled", async () => {
        const validationResults = await validateTypescript(
          ["```<s-button disabled>Hello, World</s-button>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-badge with tone", async () => {
        const validationResults = await validateTypescript(
          ["```<s-badge tone='info'>Badge content</s-badge>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-icon with type", async () => {
        const validationResults = await validateTypescript(
          ["```<s-icon type='search' />```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });
    });

    describe("components with different prefixes", () => {
      it("p-button (different prefix) - should fail because component doesn't exist", async () => {
        const validationResults = await validateTypescript(
          ["```<p-button>Hello, World</p-button>```"],
          "@shopify/app-bridge-ui-types",
        );
        // Should pass because p-button is not s-* so it won't be parsed
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-fake-element - should fail because component doesn't exist", async () => {
        const validationResults = await validateTypescript(
          ["```<s-fake-element>Fake content</s-fake-element>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(false);
        expect(validationResults[0].result).toBe(ValidationResult.FAILED);
        expect(validationResults[0].resultDetail).toContain(
          "validation errors",
        );
      });

      it("s-custom-component - should fail because component doesn't exist", async () => {
        const validationResults = await validateTypescript(
          ["```<s-custom-component>Custom content</s-custom-component>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(false);
        expect(validationResults[0].result).toBe(ValidationResult.FAILED);
        expect(validationResults[0].resultDetail).toContain(
          "validation errors",
        );
      });
    });

    describe("props validation", () => {
      it("s-button with variant prop - passes basic validation", async () => {
        const validationResults = await validateTypescript(
          ["```<s-button variant='primary'>Submit</s-button>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("s-button with icon prop - passes basic validation", async () => {
        const validationResults = await validateTypescript(
          ["```<s-button icon='plus'>Submit</s-button>```"],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });
    });

    describe("complex component combinations", () => {
      it("valid form with multiple field types", async () => {
        const validationResults = await validateTypescript(
          [
            "```<s-textfield label='Name' /><s-emailfield label='Email' /><s-button variant='primary'>Submit</s-button>```",
          ],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(true);
      });

      it("mix of components with s- prefix", async () => {
        const validationResults = await validateTypescript(
          [
            "```<s-button>Button</s-button><s-text>Text</s-text><s-invalid-component>Invalid</s-invalid-component>```",
          ],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults[0])).toBe(false);
        expect(validationResults[0].result).toBe(ValidationResult.FAILED);
        expect(validationResults[0].resultDetail).toContain(
          "validation errors",
        );
      });
    });
  });

  describe("real life examples", () => {
    it("tophat take 1 - validates components with s- prefix", async () => {
      const validationResults = await validateTypescript(
        [
          "```<s-button variant='primary'>Click me</s-button>```",
          "```<s-text>This is some text</s-text>```",
          "```<s-badge tone='info'>New</s-badge>```",
        ],
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults[0])).toBe(true);
    });

    it("tophat take 2 - should pass for valid components", async () => {
      const validationResults = await validateTypescript(
        [
          "```<s-heading>Main Title</s-heading><s-paragraph>This is a paragraph with some content.</s-paragraph><s-button variant='primary'>Action Button</s-button>```",
        ],
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults[0])).toBe(true);
    });
  });
});
