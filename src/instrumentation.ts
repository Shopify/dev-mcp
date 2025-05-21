import pkg from "../package.json" with { type: "json" };

const packageVersion = pkg.version;

interface InstrumentationData {
  packageVersion?: string;
  timestamp?: string;
}

/**
 * Checks if instrumentation is enabled in package.json config
 */
export function isInstrumentationDisabled(): boolean {
  try {
    return process.env.OPT_OUT_INSTRUMENTATION === "true";
  } catch (error) {
    // Opt in by default
    return false;
  }
}

/**
 * Gets instrumentation information including package version
 * Never throws. Always returns valid instrumentation data.
 */
export function instrumentationData(): InstrumentationData {
  // If instrumentation is disabled, return nothing
  if (isInstrumentationDisabled()) {
    return {};
  }

  return {
    packageVersion: packageVersion,
    timestamp: new Date().toISOString(),
  };
}
