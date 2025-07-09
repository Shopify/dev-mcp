import { describe, it, expect } from "vitest";
import validateTypescript from "./validateTypescript.js";
import { ValidationResult } from "../types.js";

describe("validateTypescript", () => {
  describe("package validation", () => {
    it("should fail for unsupported package", () => {
      const codeBlock = "```<s-button>Hello, World</s-button>```";
      const { valid, detailedChecks } = validateTypescript(
        [codeBlock],
        "unsupported-package",
      );
      expect(valid).toBe(false);
      expect(detailedChecks).toHaveLength(1);
      expect(detailedChecks[0].result).toBe(ValidationResult.FAILED);
      expect(detailedChecks[0].resultDetail).toContain(
        'Package "unsupported-package" is not supported',
      );
    });

    it("should only support @shopify/app-bridge-ui-types package", () => {
      const codeBlock = "```<s-button>Hello, World</s-button>```";
      const { valid, detailedChecks } = validateTypescript(
        [codeBlock],
        "some-other-package",
      );
      expect(valid).toBe(false);
      expect(detailedChecks).toHaveLength(1);
      expect(detailedChecks[0].result).toBe(ValidationResult.FAILED);
      expect(detailedChecks[0].resultDetail).toContain(
        'Only "@shopify/app-bridge-ui-types" is currently supported',
      );
    });

    it("should fail for empty array", () => {
      const { valid, detailedChecks } = validateTypescript(
        [],
        "@shopify/app-bridge-ui-types",
      );
      expect(valid).toBe(false);
      expect(detailedChecks).toHaveLength(1);
      expect(detailedChecks[0].result).toBe(ValidationResult.FAILED);
      expect(detailedChecks[0].resultDetail).toContain(
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
      const { valid, detailedChecks } = validateTypescript(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      expect(valid).toBe(true);
      expect(detailedChecks).toHaveLength(3);
      expect(
        detailedChecks.every(
          (check) => check.result === ValidationResult.SUCCESS,
        ),
      ).toBe(true);
    });

    it("should fail if any codeblock is invalid", () => {
      const codeBlocks = [
        "```<s-button>Hello, World</s-button>```",
        "```<s-invalid-component>Invalid</s-invalid-component>```",
        "```<s-text>Some text</s-text>```",
      ];
      const { valid, detailedChecks } = validateTypescript(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      expect(valid).toBe(false);
      expect(detailedChecks).toHaveLength(3);
      expect(detailedChecks[0].result).toBe(ValidationResult.SUCCESS);
      expect(detailedChecks[1].result).toBe(ValidationResult.FAILED);
      expect(detailedChecks[2].result).toBe(ValidationResult.SUCCESS);
    });

    it("should report the correct block number for failures", () => {
      const codeBlocks = [
        "```<s-button>Hello, World</s-button>```",
        "```<s-badge>New</s-badge>```",
        "```<s-fake-element>Fake</s-fake-element>```",
      ];
      const { valid, detailedChecks } = validateTypescript(
        codeBlocks,
        "@shopify/app-bridge-ui-types",
      );
      expect(valid).toBe(false);
      expect(detailedChecks).toHaveLength(3);
      expect(detailedChecks[0].result).toBe(ValidationResult.SUCCESS);
      expect(detailedChecks[1].result).toBe(ValidationResult.SUCCESS);
      expect(detailedChecks[2].result).toBe(ValidationResult.FAILED);
    });
  });

  describe("@shopify/app-bridge-ui-types package", () => {
    describe("valid components", () => {
      // Basic components
      it("s-badge", () => {
        const codeBlock = "```<s-badge>New</s-badge>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-banner", () => {
        const codeBlock = "```<s-banner>Important message</s-banner>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-box", () => {
        const codeBlock = "```<s-box>Content</s-box>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-button", () => {
        const codeBlock = "```<s-button>Hello, World</s-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-checkbox", () => {
        const codeBlock = "```<s-checkbox>Check me</s-checkbox>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-choice", () => {
        const codeBlock = "```<s-choice>Option 1</s-choice>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-choice-list", () => {
        const codeBlock =
          "```<s-choice-list><s-choice>Option 1</s-choice></s-choice-list>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-clickable", () => {
        const codeBlock = "```<s-clickable>Click me</s-clickable>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-date-picker", () => {
        const codeBlock = "```<s-date-picker></s-date-picker>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-divider", () => {
        const codeBlock = "```<s-divider></s-divider>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      // Form fields
      it("s-email-field", () => {
        const codeBlock = "```<s-email-field></s-email-field>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-number-field", () => {
        const codeBlock = "```<s-number-field></s-number-field>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-password-field", () => {
        const codeBlock = "```<s-password-field></s-password-field>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-search-field", () => {
        const codeBlock = "```<s-search-field></s-search-field>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-text-area", () => {
        const codeBlock = "```<s-text-area></s-text-area>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-text-field", () => {
        const codeBlock = "```<s-text-field></s-text-field>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-url-field", () => {
        const codeBlock = "```<s-url-field></s-url-field>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-money-field", () => {
        const codeBlock = "```<s-money-field></s-money-field>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      // Layout components
      it("s-grid", () => {
        const codeBlock =
          "```<s-grid><s-grid-item>Item</s-grid-item></s-grid>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-grid-item", () => {
        const codeBlock = "```<s-grid-item>Grid item content</s-grid-item>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-stack", () => {
        const codeBlock = "```<s-stack>Stacked content</s-stack>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-page", () => {
        const codeBlock = "```<s-page>Page content</s-page>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-section", () => {
        const codeBlock = "```<s-section>Section content</s-section>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      // Typography components
      it("s-heading", () => {
        const codeBlock = "```<s-heading>Heading text</s-heading>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-text", () => {
        const codeBlock = "```<s-text>Text content</s-text>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-paragraph", () => {
        const codeBlock = "```<s-paragraph>Paragraph text</s-paragraph>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      // Media components
      it("s-icon", () => {
        const codeBlock = "```<s-icon></s-icon>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-image", () => {
        const codeBlock = "```<s-image src='example.jpg'></s-image>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      // Navigation and actions
      it("s-link", () => {
        const codeBlock = "```<s-link href='/'>Home</s-link>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      // Form controls
      it("s-select", () => {
        const codeBlock =
          "```<s-select><s-option>Option 1</s-option></s-select>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-option", () => {
        const codeBlock = "```<s-option>Option text</s-option>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-option-group", () => {
        const codeBlock =
          "```<s-option-group><s-option>Option 1</s-option></s-option-group>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-switch", () => {
        const codeBlock = "```<s-switch></s-switch>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      // Feedback components
      it("s-spinner", () => {
        const codeBlock = "```<s-spinner></s-spinner>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      // List components
      it("s-ordered-list", () => {
        const codeBlock =
          "```<s-ordered-list><s-list-item>Item 1</s-list-item></s-ordered-list>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-unordered-list", () => {
        const codeBlock =
          "```<s-unordered-list><s-list-item>Item 1</s-list-item></s-unordered-list>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-list-item", () => {
        const codeBlock = "```<s-list-item>List item text</s-list-item>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      // Table components
      it("s-table", () => {
        const codeBlock =
          "```<s-table><s-table-body><s-table-row><s-table-cell>Cell</s-table-cell></s-table-row></s-table-body></s-table>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-table-body", () => {
        const codeBlock =
          "```<s-table-body><s-table-row><s-table-cell>Cell</s-table-cell></s-table-row></s-table-body>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-table-header", () => {
        const codeBlock =
          "```<s-table-header><s-table-header-row><s-table-cell>Header</s-table-cell></s-table-header-row></s-table-header>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-table-header-row", () => {
        const codeBlock =
          "```<s-table-header-row><s-table-cell>Header</s-table-cell></s-table-header-row>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-table-row", () => {
        const codeBlock =
          "```<s-table-row><s-table-cell>Cell</s-table-cell></s-table-row>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-table-cell", () => {
        const codeBlock = "```<s-table-cell>Cell content</s-table-cell>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      // Query component
      it("s-query-container", () => {
        const codeBlock =
          "```<s-query-container>Query content</s-query-container>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });
    });

    describe("valid props", () => {
      it("s-button with variant", () => {
        const codeBlock =
          "```<s-button variant='primary'>Hello, World</s-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-button with disabled", () => {
        const codeBlock = "```<s-button disabled>Disabled Button</s-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-button with loading", () => {
        const codeBlock = "```<s-button loading>Loading Button</s-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-button with href", () => {
        const codeBlock = "```<s-button href='/link'>Link Button</s-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-button with accessibilityLabel", () => {
        const codeBlock =
          "```<s-button accessibilityLabel='Save document'>Save</s-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-badge with tone", () => {
        const codeBlock = "```<s-badge tone='critical'>Error</s-badge>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-banner with tone", () => {
        const codeBlock =
          "```<s-banner tone='success'>Success message</s-banner>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-checkbox with checked", () => {
        const codeBlock =
          "```<s-checkbox checked>Checked option</s-checkbox>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-text-field with placeholder", () => {
        const codeBlock =
          "```<s-text-field placeholder='Enter text'></s-text-field>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-icon with type", () => {
        const codeBlock = "```<s-icon type='plus'></s-icon>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });
    });

    describe("valid prop values", () => {
      it("s-button variant='primary'", () => {
        const codeBlock =
          "```<s-button variant='primary'>Primary Button</s-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-button variant='secondary'", () => {
        const codeBlock =
          "```<s-button variant='secondary'>Secondary Button</s-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-badge tone='critical'", () => {
        const codeBlock =
          "```<s-badge tone='critical'>Critical Badge</s-badge>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("s-banner tone='success'", () => {
        const codeBlock =
          "```<s-banner tone='success'>Success Banner</s-banner>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });
    });

    describe("invalid components", () => {
      // Non-existent Polaris components
      it("p-button (wrong prefix)", () => {
        const codeBlock = "```<p-button>Hello, World</p-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("polaris-button (wrong naming)", () => {
        const codeBlock = "```<polaris-button>Hello, World</polaris-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      // React-only components that don't exist as web components
      it("s-block-stack (React-only)", () => {
        const codeBlock = "```<s-block-stack>Hello, World</s-block-stack>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("s-inline-stack (React-only)", () => {
        const codeBlock = "```<s-inline-stack>Hello, World</s-inline-stack>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("s-card (React-only)", () => {
        const codeBlock = "```<s-card>Card content</s-card>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("s-layout (React-only)", () => {
        const codeBlock = "```<s-layout>Layout content</s-layout>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("s-form-layout (React-only)", () => {
        const codeBlock = "```<s-form-layout>Form content</s-form-layout>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      // Completely made up components
      it("s-custom-component", () => {
        const codeBlock =
          "```<s-custom-component>Custom</s-custom-component>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("s-fake-element", () => {
        const codeBlock = "```<s-fake-element>Fake</s-fake-element>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });
    });

    describe("invalid props", () => {
      it("s-heading doesn't support level", () => {
        const codeBlock = "```<s-heading level='2'>Heading Text</s-heading>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("s-button doesn't support appearance", () => {
        const codeBlock =
          "```<s-button appearance='critical'>Hello, World</s-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("s-button doesn't support size (React-only prop)", () => {
        const codeBlock =
          "```<s-button size='large'>Hello, World</s-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("s-button doesn't support fullWidth (React-only prop)", () => {
        const codeBlock = "```<s-button fullWidth>Hello, World</s-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("s-button doesn't support textAlign (React-only prop)", () => {
        const codeBlock =
          "```<s-button textAlign='center'>Hello, World</s-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("s-badge doesn't support status (invalid prop)", () => {
        const codeBlock = "```<s-badge status='error'>Error Badge</s-badge>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("s-text doesn't support weight (invalid prop)", () => {
        const codeBlock = "```<s-text weight='bold'>Bold Text</s-text>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("s-heading doesn't support variant (invalid prop)", () => {
        const codeBlock =
          "```<s-heading variant='large'>Heading</s-heading>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });
    });

    describe("invalid prop values", () => {
      it("s-button doesn't support variant 'plain' (React-only)", () => {
        const codeBlock =
          "```<s-button variant='plain'>Plain Button</s-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("s-button doesn't support variant 'monochromePlain' (React-only)", () => {
        const codeBlock =
          "```<s-button variant='monochromePlain'>Monochrome Button</s-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("s-button doesn't support invalid variant 'custom'", () => {
        const codeBlock =
          "```<s-button variant='custom'>Custom Button</s-button>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });

      it("s-banner doesn't support invalid tone 'error'", () => {
        const codeBlock =
          "```<s-banner tone='error'>Error Banner</s-banner>```";
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });
    });

    describe("complex component combinations", () => {
      it("valid nested table structure", () => {
        const codeBlock = `\`\`\`
<s-table>
  <s-table-header>
    <s-table-header-row>
      <s-table-cell>Name</s-table-cell>
      <s-table-cell>Email</s-table-cell>
    </s-table-header-row>
  </s-table-header>
  <s-table-body>
    <s-table-row>
      <s-table-cell>John Doe</s-table-cell>
      <s-table-cell>john@example.com</s-table-cell>
    </s-table-row>
  </s-table-body>
</s-table>
\`\`\``;
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("valid form with multiple field types", () => {
        const codeBlock = `\`\`\`
<s-stack>
  <s-text-field placeholder="Full Name"></s-text-field>
  <s-email-field placeholder="Email Address"></s-email-field>
  <s-password-field placeholder="Password"></s-password-field>
  <s-button variant="primary">Submit</s-button>
</s-stack>
\`\`\``;
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("valid choice list with options", () => {
        const codeBlock = `\`\`\`
<s-choice-list>
  <s-choice>Option 1</s-choice>
  <s-choice>Option 2</s-choice>
  <s-choice>Option 3</s-choice>
</s-choice-list>
\`\`\``;
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(true);
      });

      it("invalid mix of valid and invalid components", () => {
        const codeBlock = `\`\`\`
<s-stack>
  <s-button>Valid Button</s-button>
  <s-invalid-component>Invalid</s-invalid-component>
</s-stack>
\`\`\``;
        const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
        expect(valid).toBe(false);
      });
    });
  });

  describe("real life examples", () => {
    it("tophat take 1", () => {
      // This example contains invalid props that cause TypeScript errors:
      // 1. s-heading level="2" - Property 'level' does not exist on type
      // 2. s-link url="..." external - Properties 'url' and 'external' do not exist on type
      // Note: s-stack direction="horizontal" might be filtered out by the validation logic
      const codeBlock =
        '```html<s-stack direction="horizontal" gap="large">\n  <s-section>\n    <s-heading level="2">Congrats on creating a new Shopify app 🎉</s-heading>\n    <s-paragraph>\n      This embedded app template uses <s-link url="https://shopify.dev/docs/apps/tools/app-bridge" external>App Bridge</s-link>\n    </s-paragraph>\n  </s-section>\n</s-stack>\n```';
      const { valid, detailedChecks } = validateTypescript(
        [codeBlock],
        "@shopify/app-bridge-ui-types",
      );
      expect(valid).toBe(false);
      // expect(detailedChecks[0].resultDetail).toContain("TypeScript compilation errors:");

      // // Check for specific prop validation errors that are actually caught
      // expect(detailedChecks[0].resultDetail).toContain("level");
      // expect(detailedChecks[0].resultDetail).toContain("url");
      // expect(detailedChecks[0].resultDetail).toContain("external");

      // // Check for specific error types
      // expect(detailedChecks[0].resultDetail).toContain("is not assignable to type");
      // expect(detailedChecks[0].resultDetail).toContain("does not exist on type");

      // // Check that the problematic props are mentioned in the error
      // expect(detailedChecks[0].resultDetail).toContain("Property 'level' does not exist");
      // expect(detailedChecks[0].resultDetail).toContain("Property 'url' does not exist");

      // Check for the actual errors that are being caught
      expect(detailedChecks[0].resultDetail).toContain(
        "Property 'level' does not exist on type",
      );
      expect(detailedChecks[0].resultDetail).toContain(
        "Property 'url' does not exist on type",
      );
    });

    it("tophat take 2", () => {
      const codeBlock =
        '```html\n<s-page>\n<s-stack gap="large">\n    <s-grid gridTemplateColumns="2fr 1fr" gap="large">\n      <s-section>\n        <s-stack gap="large">\n          <s-stack gap="base">\n            <s-heading>Congrats on creating a new Shopify app 🎉</s-heading>\n            <s-text>\n              This embedded app template uses\n              <s-link href="https://shopify.dev/docs/apps/tools/app-bridge" target="_blank">\n                App Bridge\n              </s-link>\n              interface examples like an <s-link href="/app/additional">additional page in the app nav</s-link>, as\n              well as an\n              <s-link href="https://shopify.dev/docs/api/admin-graphql" target="_blank">\n                Admin GraphQL\n              </s-link>\n              mutation demo, to provide a starting point for app development.\n            </s-text>\n          </s-stack>\n        </s-stack>\n      </s-section>\n    </s-grid>\n  </s-stack>\n</s-page>\n```';

      const { valid } = validateTypescript([codeBlock], "@shopify/app-bridge-ui-types");
      expect(valid).toBe(true);
    });

    // TODO: Add test for ui-title-bar (App Bridge Web Component)
  });
});
