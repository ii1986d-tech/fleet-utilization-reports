import { FrotcomNotConfiguredError } from "./errors";

export type FrotcomAuthSession = {
  kind: "mock";
  obtainedAt: string;
};

/**
 * Auth port for a future live adapter. PACK-001 never performs network auth.
 */
export async function authenticateMock(): Promise<FrotcomAuthSession> {
  return {
    kind: "mock",
    obtainedAt: new Date().toISOString(),
  };
}

export async function authenticateLive(): Promise<never> {
  throw new FrotcomNotConfiguredError();
}
