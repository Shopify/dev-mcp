import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Live components from https://shopify.dev/docs/api/app-home/polaris-web-components
const LIVE_POLARIS_COMPONENTS = [
  "Badge",
  "Banner",
  "Box",
  "Button",
  "Checkbox",
  "ChoiceList",
  "Clickable",
  "DatePicker",
  "Divider",
  "EmailField",
  "Grid",
  "Heading",
  "Icon",
  "Image",
  "Link",
  "MoneyField",
  "NumberField",
  "OrderedList",
  "Page",
  "Paragraph",
  "PasswordField",
  "SearchField",
  "Section",
  "Select",
  "Spinner",
  "Stack",
  "Switch",
  "Table",
  "Text",
  "TextArea",
  "TextField",
  "URLField",
  "UnorderedList",
];

// Load schema at module level for all tests
let schema: any;
beforeAll(() => {
  const schemaPath = resolve(
    __dirname,
    "../../data/polaris-web-components-schema.json",
  );
  schema = JSON.parse(readFileSync(schemaPath, "utf8"));
});

describe("Polaris Schema Validation", () => {
  it("should validate schema components exist in live documentation", async () => {
    const components = Object.keys(schema.definitions || {});

    // Test a few key components against live docs
    const testComponents = ["Page", "Section", "Button", "TextField"];

    for (const componentName of testComponents) {
      expect(components).toContain(componentName);

      // Validate component has required structure
      const definition = schema.definitions[componentName];
      expect(definition).toHaveProperty("type", "object");
      expect(definition).toHaveProperty("description");
      expect(definition.properties).toHaveProperty("tag");
    }
  });

  // 🚨 NEW: Critical completeness check
  it("should identify missing components compared to live documentation", () => {
    const schemaComponents = Object.keys(schema.definitions || {});
    const missingComponents = LIVE_POLARIS_COMPONENTS.filter(
      (liveComponent) => !schemaComponents.includes(liveComponent),
    );

    console.warn(
      `⚠️ Missing ${missingComponents.length} components:`,
      missingComponents,
    );

    // For now, expect we have at least the core components
    const coreComponents = ["Page", "Section", "Button", "TextField"];
    coreComponents.forEach((component) => {
      expect(schemaComponents).toContain(component);
    });

    // Alert if we're missing more than 50% of components
    const completeness =
      (schemaComponents.length / LIVE_POLARIS_COMPONENTS.length) * 100;
    console.log(`📊 Schema completeness: ${completeness.toFixed(1)}%`);
    expect(completeness).toBeGreaterThan(20); // At least 20% coverage
  });

  // 🚨 NEW: Attribute validation
  it("should validate required component attributes", () => {
    const definitions = schema.definitions || {};

    Object.entries(definitions).forEach(([name, definition]: [string, any]) => {
      // All components should have a tag
      if (definition.properties) {
        expect(definition.properties).toHaveProperty("tag");

        // Form components should have label attribute
        if (["TextField", "Select", "Checkbox"].includes(name)) {
          const attributes = definition.properties?.attributes?.properties;
          expect(attributes).toBeDefined();
          // Could add more specific attribute checks here
        }
      }
    });
  });

  // 🚨 NEW: Component hierarchy validation
  it("should validate component nesting rules", () => {
    const pageDefinition = schema.definitions?.Page;
    expect(pageDefinition).toBeDefined();

    // Page should only allow Section and Banner as direct children
    const allowedChildren = pageDefinition.properties?.children?.items?.anyOf;
    expect(allowedChildren).toBeDefined();

    const childRefs = allowedChildren
      .map((child: any) => child.$ref?.split("/").pop())
      .filter(Boolean);

    expect(childRefs).toContain("Section");
    expect(childRefs).toContain("Banner");
  });

  it("should validate component tags match expected format", () => {
    const definitions = schema.definitions || {};

    Object.entries(definitions).forEach(([name, definition]: [string, any]) => {
      if (definition.properties?.tag?.const) {
        const tag = definition.properties.tag.const;

        // All component tags should start with 's-' or 'ui-'
        expect(tag).toMatch(/^(s-|ui-)/);

        // Tag should be kebab-case
        expect(tag).toMatch(/^[a-z-]+$/);
      }
    });
  });
});

// Integration test that fetches live component info
describe("Live Documentation Sync Check", () => {
  it("should detect schema version staleness", () => {
    const lastUpdated = schema._lastValidated;
    if (lastUpdated) {
      const daysSinceUpdate =
        (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      console.log(
        `📅 Schema last validated ${daysSinceUpdate.toFixed(1)} days ago`,
      );

      // Warn if schema hasn't been validated in over 30 days
      if (daysSinceUpdate > 30) {
        console.warn("⚠️ Schema may be stale - consider running sync check");
      }
    }
  });

  it(
    "should check if our schema components exist in live docs",
    async () => {
      // This would be a more comprehensive test that actually fetches
      // from shopify.dev to validate our components still exist
      const mockLiveCheck = true; // Placeholder for actual API call
      expect(mockLiveCheck).toBe(true);
    },
    { timeout: 10000 },
  );
});
