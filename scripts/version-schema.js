#!/usr/bin/env node

/**
 * Schema Versioning Script
 * Manages schema versions and creates backups
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCHEMA_PATH = resolve(
  __dirname,
  "../data/polaris-web-components-schema.json",
);
const VERSIONS_DIR = resolve(__dirname, "../data/schema-versions");

function getCurrentVersion() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function ensureVersionsDir() {
  if (!existsSync(VERSIONS_DIR)) {
    mkdirSync(VERSIONS_DIR, { recursive: true });
  }
}

function archiveCurrentVersion(version) {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const archivePath = resolve(VERSIONS_DIR, `polaris-schema-${version}.json`);

  // Add version metadata
  schema._version = version;
  schema._archivedAt = new Date().toISOString();

  writeFileSync(archivePath, JSON.stringify(schema, null, 2));
  console.log(`📦 Archived schema to ${archivePath}`);

  return archivePath;
}

function updateSchemaVersion(version) {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));

  // Update version metadata
  schema._version = version;
  schema._lastUpdated = new Date().toISOString();

  writeFileSync(SCHEMA_PATH, JSON.stringify(schema, null, 2));
  console.log(`🔄 Updated schema to version ${version}`);
}

function listVersions() {
  if (!existsSync(VERSIONS_DIR)) {
    console.log("📭 No archived versions found");
    return [];
  }

  const versions = readdirSync(VERSIONS_DIR)
    .filter(
      (file) => file.startsWith("polaris-schema-") && file.endsWith(".json"),
    )
    .map((file) => file.replace("polaris-schema-", "").replace(".json", ""))
    .sort();

  console.log("📚 Available versions:");
  versions.forEach((version) => console.log(`  - ${version}`));

  return versions;
}

async function versionSchema(action = "create") {
  try {
    ensureVersionsDir();

    const currentVersion = getCurrentVersion();

    switch (action) {
      case "create":
        console.log(`🔖 Creating schema version ${currentVersion}...`);
        archiveCurrentVersion(currentVersion);
        updateSchemaVersion(currentVersion);
        console.log("✅ Schema versioning completed");
        break;

      case "list":
        listVersions();
        break;

      case "current":
        const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
        console.log(`📋 Current version: ${schema._version || "unversioned"}`);
        console.log(`📅 Last updated: ${schema._lastUpdated || "unknown"}`);
        console.log(`📊 Completeness: ${schema._completeness || "unknown"}`);
        break;

      default:
        console.error("❌ Unknown action. Use: create, list, or current");
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Schema versioning failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const action = process.argv[2] || "create";
  versionSchema(action);
}

export { versionSchema };
