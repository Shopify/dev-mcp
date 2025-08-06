import admin_2025_01_mock from "../data/admin_2025-01-mock.json?raw";
import admin_2025_01_mock2 from "../data/admin_2025-01-mock2.json?raw";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { SCHEMAS_CACHE_DIR } from "./tools/introspect_graphql_schema/index.js";

const mockSchemas = import.meta.glob<string>("../data/*.mock*.json", {
  eager: true,
  query: "raw",
});

export async function injectMockSchemasIntoCache() {
  // To avoid hitting the network, we pre-polulate the cache folder with a schema file.
  await fs.mkdir(SCHEMAS_CACHE_DIR, { recursive: true });
  for (const [fileName, content] of Object.entries(mockSchemas)) {
    const file = path.join(SCHEMAS_CACHE_DIR, path.basename(fileName));
    await fs.writeFile(file, content);
  }
}
