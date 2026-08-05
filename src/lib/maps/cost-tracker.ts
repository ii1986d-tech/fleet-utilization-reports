import {
  getMonthlyBudgetUsd,
  getWarningThresholdPercent,
} from "@/lib/maps/config";
import type { BudgetWarningLevel } from "@/lib/maps/types";

/** Approximate Google Directions API cost per request (USD). */
export const COST_PER_REQUEST_USD = 0.005;

type CostState = {
  /** YYYY-MM → estimated USD spend */
  byMonth: Map<string, number>;
  now: () => Date;
  env: NodeJS.ProcessEnv;
};

const state: CostState = {
  byMonth: new Map(),
  now: () => new Date(),
  env: process.env,
};

function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Test helper: replace clock / env used for budget math. */
export function configureCostTracker(options: {
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
}): void {
  if (options.now) state.now = options.now;
  if (options.env) state.env = options.env;
}

/** Test helper: clear monthly counters and reset defaults. */
export function resetCostTracker(): void {
  state.byMonth = new Map();
  state.now = () => new Date();
  state.env = process.env;
}

export async function trackRequest(
  cost: number = COST_PER_REQUEST_USD,
): Promise<void> {
  if (!Number.isFinite(cost) || cost < 0) return;
  const key = monthKey(state.now());
  const previous = state.byMonth.get(key) ?? 0;
  state.byMonth.set(key, previous + cost);
}

export async function getCurrentMonthCost(): Promise<number> {
  const key = monthKey(state.now());
  return state.byMonth.get(key) ?? 0;
}

export async function isBudgetExceeded(
  env: NodeJS.ProcessEnv = state.env,
): Promise<boolean> {
  const level = await getBudgetWarningLevel(env);
  return level === "exceeded";
}

export async function getBudgetWarningLevel(
  env: NodeJS.ProcessEnv = state.env,
): Promise<BudgetWarningLevel> {
  const spent = await getCurrentMonthCost();
  const budget = getMonthlyBudgetUsd(env);
  if (spent >= budget) return "exceeded";
  const warningPct = getWarningThresholdPercent(env);
  const warningAmount = (budget * warningPct) / 100;
  if (spent >= warningAmount) return "warning";
  return "ok";
}
