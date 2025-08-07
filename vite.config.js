import { fileURLToPath } from "node:url";
import { builtinModules } from "module";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      formats: ["esm"],
    },
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
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
