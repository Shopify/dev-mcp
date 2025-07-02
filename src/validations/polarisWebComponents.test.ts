import { describe, it, expect } from "vitest";
import {
  validatePolarisWebComponents,
  ValidationResult,
} from "./polarisWebComponents.js";

describe("validatePolarisWebComponents", () => {
  describe("app home", () => {
    describe("valid components", () => {
      // Basic components
      it("s-badge", () => {
        const codeBlock = "```<s-badge>New</s-badge>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });

      // it("s-banner", () => {
      //   const codeBlock = "```<s-banner>Important message</s-banner>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-box", () => {
      //   const codeBlock = "```<s-box>Content</s-box>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-button", () => {
      //   const codeBlock = "```<s-button>Hello, World</s-button>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-checkbox", () => {
      //   const codeBlock = "```<s-checkbox>Check me</s-checkbox>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-choice", () => {
      //   const codeBlock = "```<s-choice>Option 1</s-choice>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-choice-list", () => {
      //   const codeBlock =
      //     "```<s-choice-list><s-choice>Option 1</s-choice></s-choice-list>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-clickable", () => {
      //   const codeBlock = "```<s-clickable>Click me</s-clickable>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-date-picker", () => {
      //   const codeBlock = "```<s-date-picker></s-date-picker>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-divider", () => {
      //   const codeBlock = "```<s-divider></s-divider>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // // Form fields
      // it("s-email-field", () => {
      //   const codeBlock = "```<s-email-field></s-email-field>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-number-field", () => {
      //   const codeBlock = "```<s-number-field></s-number-field>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-password-field", () => {
      //   const codeBlock = "```<s-password-field></s-password-field>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-search-field", () => {
      //   const codeBlock = "```<s-search-field></s-search-field>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-text-area", () => {
      //   const codeBlock = "```<s-text-area></s-text-area>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-text-field", () => {
      //   const codeBlock = "```<s-text-field></s-text-field>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-url-field", () => {
      //   const codeBlock = "```<s-url-field></s-url-field>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-money-field", () => {
      //   const codeBlock = "```<s-money-field></s-money-field>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // // Layout components
      // it("s-grid", () => {
      //   const codeBlock =
      //     "```<s-grid><s-grid-item>Item</s-grid-item></s-grid>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-grid-item", () => {
      //   const codeBlock = "```<s-grid-item>Grid item content</s-grid-item>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-stack", () => {
      //   const codeBlock = "```<s-stack>Stacked content</s-stack>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-page", () => {
      //   const codeBlock = "```<s-page>Page content</s-page>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-section", () => {
      //   const codeBlock = "```<s-section>Section content</s-section>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // // Typography components
      // it("s-heading", () => {
      //   const codeBlock = "```<s-heading>Heading text</s-heading>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-text", () => {
      //   const codeBlock = "```<s-text>Text content</s-text>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-paragraph", () => {
      //   const codeBlock = "```<s-paragraph>Paragraph text</s-paragraph>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // // Media components
      // it("s-icon", () => {
      //   const codeBlock = "```<s-icon></s-icon>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-image", () => {
      //   const codeBlock = "```<s-image src='example.jpg'></s-image>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // // Navigation and actions
      // it("s-link", () => {
      //   const codeBlock = "```<s-link href='/'>Home</s-link>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // // Form controls
      // it("s-select", () => {
      //   const codeBlock =
      //     "```<s-select><s-option>Option 1</s-option></s-select>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-option", () => {
      //   const codeBlock = "```<s-option>Option text</s-option>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-option-group", () => {
      //   const codeBlock =
      //     "```<s-option-group><s-option>Option 1</s-option></s-option-group>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-switch", () => {
      //   const codeBlock = "```<s-switch></s-switch>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // // Feedback components
      // it("s-spinner", () => {
      //   const codeBlock = "```<s-spinner></s-spinner>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // // List components
      // it("s-ordered-list", () => {
      //   const codeBlock =
      //     "```<s-ordered-list><s-list-item>Item 1</s-list-item></s-ordered-list>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-unordered-list", () => {
      //   const codeBlock =
      //     "```<s-unordered-list><s-list-item>Item 1</s-list-item></s-unordered-list>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-list-item", () => {
      //   const codeBlock = "```<s-list-item>List item text</s-list-item>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // // Table components
      // it("s-table", () => {
      //   const codeBlock =
      //     "```<s-table><s-table-body><s-table-row><s-table-cell>Cell</s-table-cell></s-table-row></s-table-body></s-table>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-table-body", () => {
      //   const codeBlock =
      //     "```<s-table-body><s-table-row><s-table-cell>Cell</s-table-cell></s-table-row></s-table-body>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-table-header", () => {
      //   const codeBlock =
      //     "```<s-table-header><s-table-header-row><s-table-cell>Header</s-table-cell></s-table-header-row></s-table-header>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-table-header-row", () => {
      //   const codeBlock =
      //     "```<s-table-header-row><s-table-cell>Header</s-table-cell></s-table-header-row>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-table-row", () => {
      //   const codeBlock =
      //     "```<s-table-row><s-table-cell>Cell</s-table-cell></s-table-row>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // it("s-table-cell", () => {
      //   const codeBlock = "```<s-table-cell>Cell content</s-table-cell>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });

      // // Query component
      // it("s-query-container", () => {
      //   const codeBlock =
      //     "```<s-query-container>Query content</s-query-container>```";
      //   const { result } = validatePolarisWebComponents(codeBlock);
      //   expect(result).toBe(ValidationResult.SUCCESS);
      // });
    });

    describe("valid props", () => {
      it("s-button with variant", () => {
        const codeBlock =
          "```<s-button variant='primary'>Hello, World</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });

      it("s-button with disabled", () => {
        const codeBlock = "```<s-button disabled>Disabled Button</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });

      it("s-button with loading", () => {
        const codeBlock = "```<s-button loading>Loading Button</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });

      it("s-button with href", () => {
        const codeBlock = "```<s-button href='/link'>Link Button</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });

      it("s-button with accessibilityLabel", () => {
        const codeBlock =
          "```<s-button accessibilityLabel='Save document'>Save</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });

      it("s-badge with tone", () => {
        const codeBlock = "```<s-badge tone='critical'>Error</s-badge>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });

      it("s-banner with tone", () => {
        const codeBlock =
          "```<s-banner tone='success'>Success message</s-banner>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });

      it("s-checkbox with checked", () => {
        const codeBlock =
          "```<s-checkbox checked>Checked option</s-checkbox>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });

      it("s-text-field with placeholder", () => {
        const codeBlock =
          "```<s-text-field placeholder='Enter text'></s-text-field>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });

      it("s-icon with type", () => {
        const codeBlock = "```<s-icon type='plus'></s-icon>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });
    });

    describe("valid prop values", () => {
      it("s-button variant='primary'", () => {
        const codeBlock =
          "```<s-button variant='primary'>Primary Button</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });

      it("s-button variant='secondary'", () => {
        const codeBlock =
          "```<s-button variant='secondary'>Secondary Button</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });

      it("s-badge tone='critical'", () => {
        const codeBlock =
          "```<s-badge tone='critical'>Critical Badge</s-badge>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });

      it("s-banner tone='success'", () => {
        const codeBlock =
          "```<s-banner tone='success'>Success Banner</s-banner>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });
    });

    describe("invalid components", () => {
      // Non-existent Polaris components
      it("p-button (wrong prefix)", () => {
        const codeBlock = "```<p-button>Hello, World</p-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("polaris-button (wrong naming)", () => {
        const codeBlock = "```<polaris-button>Hello, World</polaris-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      // React-only components that don't exist as web components
      it("s-block-stack (React-only)", () => {
        const codeBlock = "```<s-block-stack>Hello, World</s-block-stack>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("s-inline-stack (React-only)", () => {
        const codeBlock = "```<s-inline-stack>Hello, World</s-inline-stack>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("s-card (React-only)", () => {
        const codeBlock = "```<s-card>Card content</s-card>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("s-layout (React-only)", () => {
        const codeBlock = "```<s-layout>Layout content</s-layout>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("s-form-layout (React-only)", () => {
        const codeBlock = "```<s-form-layout>Form content</s-form-layout>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      // Completely made up components
      it("s-custom-component", () => {
        const codeBlock =
          "```<s-custom-component>Custom</s-custom-component>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("s-fake-element", () => {
        const codeBlock = "```<s-fake-element>Fake</s-fake-element>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });
    });

    describe("invalid props", () => {
      it("s-heading doesn't support level", () => {
        const codeBlock = "```<s-heading level='2'>Heading Text</s-heading>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("s-button doesn't support appearance", () => {
        const codeBlock =
          "```<s-button appearance='critical'>Hello, World</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("s-button doesn't support size (React-only prop)", () => {
        const codeBlock =
          "```<s-button size='large'>Hello, World</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("s-button doesn't support fullWidth (React-only prop)", () => {
        const codeBlock = "```<s-button fullWidth>Hello, World</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("s-button doesn't support textAlign (React-only prop)", () => {
        const codeBlock =
          "```<s-button textAlign='center'>Hello, World</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("s-badge doesn't support status (invalid prop)", () => {
        const codeBlock = "```<s-badge status='error'>Error Badge</s-badge>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("s-text doesn't support weight (invalid prop)", () => {
        const codeBlock = "```<s-text weight='bold'>Bold Text</s-text>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("s-heading doesn't support variant (invalid prop)", () => {
        const codeBlock =
          "```<s-heading variant='large'>Heading</s-heading>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });
    });

    describe("invalid prop values", () => {
      it("s-button doesn't support variant 'plain' (React-only)", () => {
        const codeBlock =
          "```<s-button variant='plain'>Plain Button</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("s-button doesn't support variant 'monochromePlain' (React-only)", () => {
        const codeBlock =
          "```<s-button variant='monochromePlain'>Monochrome Button</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("s-button doesn't support invalid variant 'custom'", () => {
        const codeBlock =
          "```<s-button variant='custom'>Custom Button</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });

      it("s-banner doesn't support invalid tone 'error'", () => {
        const codeBlock =
          "```<s-banner tone='error'>Error Banner</s-banner>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
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
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
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
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });

      it("valid choice list with options", () => {
        const codeBlock = `\`\`\`
<s-choice-list>
  <s-choice>Option 1</s-choice>
  <s-choice>Option 2</s-choice>
  <s-choice>Option 3</s-choice>
</s-choice-list>
\`\`\``;
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.SUCCESS);
      });

      it("invalid mix of valid and invalid components", () => {
        const codeBlock = `\`\`\`
<s-stack>
  <s-button>Valid Button</s-button>
  <s-invalid-component>Invalid</s-invalid-component>
</s-stack>
\`\`\``;
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(ValidationResult.FAILED);
      });
    });
  });
});
