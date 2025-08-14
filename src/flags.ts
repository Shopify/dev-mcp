export const polarisUnifiedEnabled =
  process.env.POLARIS_UNIFIED === "true" || process.env.POLARIS_UNIFIED === "1";

export const liquidEnabled =
  process.env.LIQUID === "true" || process.env.LIQUID === "1";

// LIQUID_VALIDATION_MODE can be "full" or "partial"
export const liquidMcpValidationMode =
  process.env.LIQUID_VALIDATION_MODE === "partial" ? "partial" : "full";
