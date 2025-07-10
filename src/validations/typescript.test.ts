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
    it("should work with any package - validate JSX components", () => {
      const codeBlock = "```<s-button>Hello, World</s-button>```";
      const validationResults = validateTypescript(
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

    it("should work with any UI component package", () => {
      const codeBlock = "```<CustomButton>Hello, World</CustomButton>```";
      const validationResults = validateTypescript(
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

    it("should fail for empty array", () => {
      const validationResults = validateTypescript(
        [],
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults)).toBe(false);
      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].result).toBe(ValidationResult.FAILED);
      expect(validationResults[0].resultDetail).toContain(
        "No code blocks provided for validation",
      );
    });
  });

  describe("multiple codeblocks", () => {
    it("should validate multiple valid codeblocks", () => {
      const codeBlocks = [
        "```<s-button>Hello, World</s-button>```",
        "```<s-badge>New</s-badge>```",
        "```<s-text>Some text</s-text>```",
      ];
      const validationResults = validateTypescript(
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

    it("should validate multiple codeblocks with s- components", () => {
      const codeBlocks = [
        "```<s-button>Hello, World</s-button>```",
        "```<s-invalid-component>Invalid</s-invalid-component>```",
        "```<s-text>Some text</s-text>```",
      ];
      const validationResults = validateTypescript(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults)).toBe(true);
      expect(validationResults).toHaveLength(3);
      expect(validationResults[0].result).toBe(ValidationResult.SUCCESS);
      expect(validationResults[1].result).toBe(ValidationResult.SUCCESS);
      expect(validationResults[2].result).toBe(ValidationResult.SUCCESS);
    });

    it("should validate all codeblocks with s- components", () => {
      const codeBlocks = [
        "```<s-button>Hello, World</s-button>```",
        "```<s-badge>New</s-badge>```",
        "```<s-fake-element>Fake</s-fake-element>```",
      ];
      const validationResults = validateTypescript(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults)).toBe(true);
      expect(validationResults).toHaveLength(3);
      expect(validationResults[0].result).toBe(ValidationResult.SUCCESS);
      expect(validationResults[1].result).toBe(ValidationResult.SUCCESS);
      expect(validationResults[2].result).toBe(ValidationResult.SUCCESS);
    });
  });

  describe("@shopify/app-bridge-ui-types package", () => {
    describe("valid components", () => {
      it("s-badge", () => {
        const codeBlock = "```<s-badge>New</s-badge>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-banner", () => {
        const codeBlock = "```<s-banner>Important message</s-banner>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-box", () => {
        const codeBlock = "```<s-box>Content</s-box>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-button", () => {
        const codeBlock = "```<s-button>Hello, World</s-button>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-checkbox", () => {
        const codeBlock = "```<s-checkbox>Check me</s-checkbox>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-text", () => {
        const codeBlock = "```<s-text>Text content</s-text>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-heading", () => {
        const codeBlock = "```<s-heading>Heading text</s-heading>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-link", () => {
        const codeBlock = "```<s-link href='/'>Home</s-link>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });
    });

    describe("valid props", () => {
      it("s-button with variant", () => {
        const codeBlock =
          "```<s-button variant='primary'>Hello, World</s-button>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-button with disabled", () => {
        const codeBlock = "```<s-button disabled>Disabled Button</s-button>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-badge with tone", () => {
        const codeBlock = "```<s-badge tone='critical'>Error</s-badge>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });
    });

    describe("components with s- prefix", () => {
      it("p-button (wrong prefix) - should fail for no s- components", () => {
        const codeBlock = "```<p-button>Hello, World</p-button>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(false);
      });

      it("s-fake-element - passes basic validation", () => {
        const codeBlock = "```<s-fake-element>Fake</s-fake-element>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-custom-component - passes basic validation", () => {
        const codeBlock =
          "```<s-custom-component>Custom</s-custom-component>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });
    });

    describe("props validation", () => {
      it("s-button with appearance prop - passes basic validation", () => {
        const codeBlock =
          "```<s-button appearance='critical'>Hello, World</s-button>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("s-button with size prop - passes basic validation", () => {
        const codeBlock =
          "```<s-button size='large'>Hello, World</s-button>```";
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });
    });

    describe("complex component combinations", () => {
      it("valid form with multiple field types", () => {
        const codeBlock = `\`\`\`
<s-stack>
  <s-text-field placeholder="Full Name"></s-text-field>
  <s-email-field placeholder="Email Address"></s-email-field>
  <s-button variant="primary">Submit</s-button>
</s-stack>
\`\`\``;
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });

      it("mix of components with s- prefix", () => {
        const codeBlock = `\`\`\`
<s-stack>
  <s-button>Valid Button</s-button>
  <s-invalid-component>Invalid</s-invalid-component>
</s-stack>
\`\`\``;
        const validationResults = validateTypescript(
          [codeBlock],
          "@shopify/app-bridge-ui-types",
        );
        expect(isValidationSuccessful(validationResults)).toBe(true);
      });
    });
  });

  describe("real life examples", () => {
    it("tophat take 1 - validates components with s- prefix", () => {
      const codeBlock =
        '```html<s-stack direction="horizontal" gap="large">\n  <s-section>\n    <s-heading level="2">Congrats on creating a new Shopify app 🎉</s-heading>\n    <s-paragraph>\n      This embedded app template uses <s-link url="https://shopify.dev/docs/apps/tools/app-bridge" external>App Bridge</s-link>\n    </s-paragraph>\n  </s-section>\n</s-stack>\n```';
      const validationResults = validateTypescript(
        [codeBlock],
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults)).toBe(true);
      expect(validationResults[0].resultDetail).toContain(
        "Code block successfully validated against @shopify/app-bridge-ui-types types",
      );
    });

    it("tophat take 2 - should pass for valid components", () => {
      const codeBlock =
        '```html\n<s-page>\n<s-stack gap="large">\n    <s-grid gridTemplateColumns="2fr 1fr" gap="large">\n      <s-section>\n        <s-stack gap="large">\n          <s-stack gap="base">\n            <s-heading>Congrats on creating a new Shopify app 🎉</s-heading>\n            <s-text>\n              This embedded app template uses\n              <s-link href="https://shopify.dev/docs/apps/tools/app-bridge" target="_blank">\n                App Bridge\n              </s-link>\n              interface examples like an <s-link href="/app/additional">additional page in the app nav</s-link>, as\n              well as an\n              <s-link href="https://shopify.dev/docs/api/admin-graphql" target="_blank">\n                Admin GraphQL\n              </s-link>\n              mutation demo, to provide a starting point for app development.\n            </s-text>\n          </s-stack>\n        </s-stack>\n      </s-section>\n    </s-grid>\n  </s-stack>\n</s-page>\n```';

      const validationResults = validateTypescript(
        [codeBlock],
        "@shopify/app-bridge-ui-types",
      );
      expect(isValidationSuccessful(validationResults)).toBe(true);
    });
  });
});
