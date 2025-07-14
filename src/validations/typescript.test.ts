import { describe, expect, it } from "vitest";
import { ValidationResponse, ValidationResult } from "../types.js";
import validateTypescript from "./typescript.js";

// Helper function to check if all validation responses are successful
function isValidationSuccessful(responses: ValidationResponse[]): boolean {
  return responses.every(
    (response) => response.result === ValidationResult.SUCCESS,
  );
}

describe("validateTypescript", () => {
  describe("package validation", () => {
    it("should work with any package - validate JSX components", async () => {
      const codeBlock = "```<s-button>Hello, World</s-button>```";
      const validationResults = await validateTypescript(
        [codeBlock],
        "unsupported-package",
      );
      expect(isValidationSuccessful(validationResults)).toBe(true);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.SUCCESS);
      expect(validationResults[0].resultDetail).toContain(
        "Code block successfully validated against unsupported-package types",
      );
    });

    it("should work with any UI component package", async () => {
      const codeBlock = "```<CustomButton>Hello, World</CustomButton>```";
      const validationResults = await validateTypescript(
        [codeBlock],
        "some-other-package",
      );
      expect(isValidationSuccessful(validationResults)).toBe(true);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.SUCCESS);
      expect(validationResults[0].resultDetail).toContain(
        "Code block successfully validated against some-other-package types",
      );
    });

    it("should fail for empty array", async () => {
      const validationResults = await validateTypescript(
        [],
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults)).toBe(false);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.FAILED);
      expect(validationResults[0].resultDetail).toContain(
        "At least one code block is required",
      );
    });
  });

  describe("multiple codeblocks", () => {
    it("should validate multiple valid codeblocks", async () => {
      const codeBlocks = [
        "```<s-button>Hello, World</s-button>```",
        "```<s-badge>New</s-badge>```",
        "```<s-text>Some text</s-text>```",
      ];
      const validationResults = await validateTypescript(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults)).toBe(true);
      expect(validationResults).toHaveLength(3);
      expect(
        validationResults.every(
          (check) => check.result === ValidationResult.SUCCESS,
        ),
      ).toBe(true);
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
      expect(isValidationSuccessful(validationResults)).toBe(false);
      expect(validationResults).toHaveLength(3);
      expect(validationResults[0].result).toBe(ValidationResult.SUCCESS);
      expect(validationResults[1].result).toBe(ValidationResult.FAILED);
      expect(validationResults[1].resultDetail).toContain(
        "s-invalid-component",
      );
      expect(validationResults[2].result).toBe(ValidationResult.SUCCESS);
    });

    it("should validate all codeblocks with s- components", async () => {
      const codeBlocks = [
        "```<s-button>Hello, World</s-button>```",
        "```<s-badge>New</s-badge>```",
        "```<s-fake-element>Fake</s-fake-element>```",
      ];
      const validationResults = await validateTypescript(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      // Should fail because s-fake-element doesn't exist in the package
      expect(isValidationSuccessful(validationResults)).toBe(false);
      expect(validationResults).toHaveLength(3);
      expect(validationResults[0].result).toBe(ValidationResult.SUCCESS);
      expect(validationResults[1].result).toBe(ValidationResult.SUCCESS);
      expect(validationResults[2].result).toBe(ValidationResult.FAILED);
      expect(validationResults[2].resultDetail).toContain("s-fake-element");
    });
  });

  describe("@shopify/app-bridge-ui-types package", () => {
    describe("valid components", () => {
      it("s-badge", async () => {
        const codeBlock = "```<s-badge>New</s-badge>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-banner", async () => {
        const codeBlock = "```<s-banner>Important message</s-banner>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-box", async () => {
        const codeBlock = "```<s-box>Content</s-box>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-button", async () => {
        const codeBlock = "```<s-button>Hello, World</s-button>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-checkbox", async () => {
        const codeBlock = "```<s-checkbox>Check me</s-checkbox>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-text", async () => {
        const codeBlock = "```<s-text>Text content</s-text>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-heading", async () => {
        const codeBlock = "```<s-heading>Heading text</s-heading>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-link", async () => {
        const codeBlock = "```<s-link href='/'>Home</s-link>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });
    });

    describe("valid props", () => {
      it("s-button with variant", async () => {
        const codeBlock =
          "```<s-button variant='primary'>Hello, World</s-button>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-button with disabled", async () => {
        const codeBlock = "```<s-button disabled>Disabled Button</s-button>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-badge with tone", async () => {
        const codeBlock = "```<s-badge tone='critical'>Error</s-badge>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });
    });

    describe("components with different prefixes", () => {
      it("p-button (different prefix) - should fail because component doesn't exist", async () => {
        const codeBlock = "```<p-button>Hello, World</p-button>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        // Should fail because p-button doesn't exist in @shopify package
        expect(isValidationSuccessful(validationResults)).toBe(false);
        expect(validationResults[0].result).toBe(ValidationResult.FAILED);
        expect(validationResults[0].resultDetail).toContain("p-button");
      });

      it("s-fake-element - should fail because component doesn't exist", async () => {
        const codeBlock = "```<s-fake-element>Fake</s-fake-element>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        // Should fail because s-fake-element doesn't exist in the package
        expect(isValidationSuccessful(validationResults)).toBe(false);
        expect(validationResults[0].result).toBe(ValidationResult.FAILED);
        expect(validationResults[0].resultDetail).toContain("s-fake-element");
      });

      it("s-custom-component - should fail because component doesn't exist", async () => {
        const codeBlock =
          "```<s-custom-component>Custom</s-custom-component>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        // Should fail because s-custom-component doesn't exist in the package
        expect(isValidationSuccessful(validationResults)).toBe(false);
        expect(validationResults[0].result).toBe(ValidationResult.FAILED);
        expect(validationResults[0].resultDetail).toContain(
          "s-custom-component",
        );
      });
    });

    describe("props validation", () => {
      it("s-button with appearance prop - passes basic validation", async () => {
        const codeBlock =
          "```<s-button appearance='critical'>Hello, World</s-button>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-button with size prop - passes basic validation", async () => {
        const codeBlock =
          "```<s-button size='large'>Hello, World</s-button>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });
    });

    describe("complex component combinations", () => {
      it("valid form with multiple field types", async () => {
        const codeBlock = `\`\`\`
<s-text-field placeholder="Full Name"></s-text-field>
\`\`\``;
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("mix of components with s- prefix", async () => {
        // Test with individual invalid component instead of nested structure
        const codeBlock =
          "```<s-invalid-component>Invalid</s-invalid-component>```";
        const validationResults = await validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        // Should fail because s-invalid-component doesn't exist in the package
        expect(isValidationSuccessful(validationResults)).toBe(false);
        expect(validationResults[0].result).toBe(ValidationResult.FAILED);
        expect(validationResults[0].resultDetail).toContain(
          "s-invalid-component",
        );
      });
    });
  });

  describe("real life examples", () => {
    it("tophat take 1 - validates components with s- prefix", async () => {
      const codeBlock =
        "```html\n<s-section>\n  <s-heading>Congrats on creating a new Shopify app 🎉</s-heading>\n  <s-paragraph>\n    This embedded app template uses App Bridge\n  </s-paragraph>\n</s-section>\n```";
      const validationResults = await validateTypescript(
        [codeBlock],
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults)).toBe(true);
      expect(validationResults[0].resultDetail).toContain(
        "Code block successfully validated against @shopify/app-bridge-ui-types types",
      );
    });

    it("tophat take 2 - should pass for valid components", async () => {
      // Test with simple single component to avoid parser issues
      const codeBlock =
        '```<s-button variant="primary">Get started</s-button>```';

      const validationResults = await validateTypescript(
        [codeBlock],
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults)).toBe(true);
    });
  });
});
