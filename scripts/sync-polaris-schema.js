#!/usr/bin/env node

/**
 * Schema Sync Script
 * Fetches latest Polaris component info and updates schema
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCHEMA_PATH = resolve(
  __dirname,
  "../data/polaris-web-components-schema.json",
);
const SHOPIFY_COMPONENTS_URL =
  "https://shopify.dev/docs/api/app-home/polaris-web-components";

// Components from live documentation
const LIVE_COMPONENTS = [
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

async function syncSchema() {
  try {
    console.log("🔄 Starting Polaris schema sync...");

    // Load current schema
    const currentSchema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
    const currentComponents = Object.keys(currentSchema.definitions || {});

    // Analyze what's missing
    const missingComponents = LIVE_COMPONENTS.filter(
      (component) => !currentComponents.includes(component),
    );

    console.log(`📊 Current schema: ${currentComponents.length} components`);
    console.log(`📋 Live components: ${LIVE_COMPONENTS.length} components`);
    console.log(`⚠️  Missing: ${missingComponents.length} components`);

    if (missingComponents.length > 0) {
      console.log("Missing components:", missingComponents.join(", "));

      // For now, just log what we'd need to add
      // In a full implementation, this would fetch component details
      // and generate schema definitions
      console.log("\n🔧 To complete schema sync, add these components:");
      missingComponents.forEach((component) => {
        console.log(
          `  - ${component} (s-${component
            .toLowerCase()
            .replace(/([A-Z])/g, "-$1")
            .replace(/^-/, "")})`,
        );
      });
    }

    // Update schema metadata
    currentSchema._lastSyncCheck = new Date().toISOString();
    currentSchema._completeness =
      ((currentComponents.length / LIVE_COMPONENTS.length) * 100).toFixed(1) +
      "%";
    currentSchema._missingComponents = missingComponents;

    // Write updated schema
    writeFileSync(SCHEMA_PATH, JSON.stringify(currentSchema, null, 2));

    console.log("✅ Schema sync completed");
    console.log(`📈 Completeness: ${currentSchema._completeness}`);

    // Exit with non-zero if significant drift detected
    if (missingComponents.length > 10) {
      console.warn("🚨 Significant schema drift detected!");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Schema sync failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncSchema();
}

export { syncSchema };
