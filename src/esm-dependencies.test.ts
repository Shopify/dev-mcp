import { readFile } from "fs/promises";
import { builtinModules } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Packages that are known to work fine despite not being pure ESM
// Add packages here that you explicitly want to allow
const ALLOWED_NON_ESM_PACKAGES: string[] = ["typescript", "env-paths"];

// Get external packages from vite config
async function getViteExternalPackages(): Promise<string[]> {
  try {
    // Import vite config dynamically
    // @ts-expect-error vite.config.js doesn't have type declarations
    const viteConfigModule = await import("../vite.config.js");
    const viteConfig = viteConfigModule.default;

    // Get external packages from the config
    const externals = viteConfig?.build?.rollupOptions?.external || [];

    // Filter out builtin modules and their node: prefixed versions
    return externals.filter(
      (pkg: string) =>
        !builtinModules.includes(pkg) && !pkg.startsWith("node:"),
    );
  } catch (error) {
    console.warn("Could not load vite config for external packages:", error);
  }
  return [];
}

describe("ESM Dependencies Check", () => {
  it("should ensure all dependencies are ESM modules", async () => {
    // Get external packages from vite config
    const viteExternalPackages = await getViteExternalPackages();

    // Combine allowed packages
    const allowedPackages = [
      ...ALLOWED_NON_ESM_PACKAGES,
      ...viteExternalPackages,
    ];

    // Read the main package.json
    const packageJsonPath = join(__dirname, "..", "package.json");
    const packageJsonContent = await readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);

    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const nonEsmPackages: Array<{
      name: string;
      version: string;
      type: string;
      reason: string;
    }> = [];
    const errors: string[] = [];

    for (const [packageName, version] of Object.entries(allDependencies)) {
      // Skip type definition packages as they don't have runtime code
      if (packageName.startsWith("@types/")) {
        continue;
      }

      // Skip allowed non-ESM packages (including vite externals)
      if (allowedPackages.includes(packageName)) {
        continue;
      }

      const { info, error } = await checkPackage(
        packageName,
        version as string,
      );

      if (error) {
        errors.push(error);
      } else if (info) {
        nonEsmPackages.push(info);
      }
    }

    // Log any errors for debugging
    if (errors.length > 0) {
      console.warn("Warnings while checking dependencies:", errors);
    }

    // Create a detailed error message
    if (nonEsmPackages.length > 0) {
      const errorMessage = [
        "The following dependencies are not ESM modules:",
        "",
        ...nonEsmPackages.map(
          (pkg) => `- ${pkg.name}@${pkg.version} (${pkg.reason})`,
        ),
        "",
        "To fix this:",
        "1. Find ESM alternatives for these packages",
        "2. Check if newer versions support ESM",
        "3. If a package works despite being CommonJS, add it to ALLOWED_NON_ESM_PACKAGES",
        "4. Add it to the external packages to vite.config.js",
        "",
        "Currently excluded packages:",
        `- Manually allowed: ${ALLOWED_NON_ESM_PACKAGES.join(", ")}`,
        `- Vite externals: ${viteExternalPackages.join(", ") || "none"}`,
      ].join("\n");

      expect(nonEsmPackages.length, errorMessage).toBe(0);
    }
  });
});

interface EsmCheckResult {
  isEsm: boolean;
  reason: string;
}

interface PackageInfo {
  name: string;
  version: string;
  type: string;
  reason: string;
}

// Helper function to resolve package.json path for both regular and scoped packages
function getPackageJsonPath(packageName: string): string {
  const basePath = join(__dirname, "..", "node_modules");
  return join(basePath, packageName, "package.json");
}

// Helper function to read and parse package.json
async function readPackageJson(path: string): Promise<any | null> {
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Helper function to check a single package for ESM compatibility
async function checkPackage(
  packageName: string,
  version: string,
): Promise<{ info: PackageInfo | null; error: string | null }> {
  const path = getPackageJsonPath(packageName);
  const packageJson = await readPackageJson(path);

  if (!packageJson) {
    return {
      info: null,
      error: `Could not find package.json for ${packageName}`,
    };
  }

  const esmCheck = checkIfPackageIsEsm(packageJson);

  if (!esmCheck.isEsm) {
    return {
      info: {
        name: packageName,
        version: version,
        type: packageJson.type || "commonjs",
        reason: esmCheck.reason,
      },
      error: null,
    };
  }

  return { info: null, error: null };
}

function checkIfPackageIsEsm(packageJson: any): EsmCheckResult {
  // A package is considered ESM if:
  // 1. It has "type": "module"
  if (packageJson.type === "module") {
    return { isEsm: true, reason: "has type: module" };
  }

  // 2. It has "exports" field with ESM exports
  if (packageJson.exports) {
    const hasEsmExports = checkExportsForEsm(packageJson.exports);
    if (hasEsmExports) {
      return { isEsm: true, reason: "has ESM exports" };
    }
  }

  // 3. It has "module" field (older convention)
  if (packageJson.module) {
    return { isEsm: true, reason: "has module field" };
  }

  // 4. It only has .mjs files (check main field)
  if (packageJson.main && packageJson.main.endsWith(".mjs")) {
    return { isEsm: true, reason: "main entry is .mjs" };
  }

  // Not ESM
  return {
    isEsm: false,
    reason: `type: ${packageJson.type || "commonjs"}, no ESM indicators`,
  };
}

function checkExportsForEsm(exports: any): boolean {
  if (typeof exports === "string") {
    return exports.endsWith(".mjs") || exports.endsWith(".js");
  }

  if (typeof exports === "object") {
    // Check for import conditions
    if (exports.import) {
      return true;
    }

    // Check nested exports
    for (const value of Object.values(exports)) {
      if (checkExportsForEsm(value)) {
        return true;
      }
    }
  }

  return false;
}
