import { readFileSync } from "fs";
import { builtinModules } from "module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      formats: ["esm"],
      fileName: () => "index.js",
    },
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        "@shopify/theme-check-node",
        "@shopify/theme-check-common",
      ],
      output: {
        interop: "auto",
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
    coverage: {
      provider: "v8",
    },
    alias: {
      // Similar to the moduleNameMapper in Jest config
      "^(\\.{1,2}/.*)\\.js$": "$1",
    },
  },
});
