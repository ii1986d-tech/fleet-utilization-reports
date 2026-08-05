const DEFAULT_MONTHLY_BUDGET_USD = 50;
const DEFAULT_WARNING_THRESHOLD_PERCENT = 80;

export function isMapsApiEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = (env.MAPS_API_ENABLED ?? "false").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function getMapsApiKey(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const key = env.MAPS_API_KEY?.trim();
  return key ? key : null;
}

export function getMonthlyBudgetUsd(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.MAPS_API_MONTHLY_BUDGET?.trim();
  if (!raw) return DEFAULT_MONTHLY_BUDGET_USD;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_MONTHLY_BUDGET_USD;
}

/** Warning threshold as percent of monthly budget (default 80). */
export function getWarningThresholdPercent(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.MAPS_API_WARNING_THRESHOLD?.trim();
  if (!raw) return DEFAULT_WARNING_THRESHOLD_PERCENT;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 100
    ? parsed
    : DEFAULT_WARNING_THRESHOLD_PERCENT;
}
