const stageAliases = {
  production: "production",
  live: "production",
  "pre-production": "pre-production",
  preproduction: "pre-production",
  preprod: "pre-production",
  demo: "pre-production",
  demonstration: "pre-production",
  sandbox: "pre-production",
  development: "pre-production"
};

const requestedStage = (process.env.NEXT_PUBLIC_SITE_STAGE ?? "")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "-");

const normalizedStage =
  stageAliases[requestedStage] ?? "pre-production";

export const publicRuntimeConfig = {
  siteStage: normalizedStage,
  siteStageLabel:
    normalizedStage === "production" ? "Production" : "Pre-production",
  isPreProduction: normalizedStage !== "production"
};
