import pkg from "../package.json" with { type: "json" };

const packageVersion = pkg.version;

interface InstrumentationData {
  packageVersion?: string;
  timestamp?: string;
}

/**
 * Checks if instrumentation is enabled in package.json config
 */
export function isInstrumentationEnabled(): boolean {
  try {
    const packageJson = JSON.parse(process.env.npm_package_json || "{}");
    return packageJson?.config?.instrumentation !== false;
  } catch (error) {
    // If we can't read the config, default to enabled
    return true;
  }
}

/**
 * Gets instrumentation information including package version
 * Never throws. Always returns valid instrumentation data.
 */
export async function instrumentationData(): Promise<InstrumentationData> {
  // If instrumentation is disabled, return nothing
  if (!isInstrumentationEnabled()) {
    return {};
  }

  return {
    packageVersion: packageVersion,
    timestamp: new Date().toISOString(),
  };
}
