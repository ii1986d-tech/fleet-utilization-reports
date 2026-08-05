import type { FetchLike } from "@/lib/transport-orders/providers/http";

export type ProviderName = "mock" | "gemini" | "grok" | "groq" | "qwen" | "manual";

export function normalizeProviderName(raw: string): ProviderName | null {
  const name = raw.trim().toLowerCase();
  switch (name) {
    case "mock":
    case "gemini":
    case "grok":
    case "groq":
    case "qwen":
    case "manual":
      return name;
    case "xai":
      return "grok";
    default:
      return null;
  }
}

export function requireServerSecret(env: NodeJS.ProcessEnv, key: string): string {
  if (key.startsWith("NEXT_PUBLIC_")) {
    throw new Error(`Refusing public env key for AI secret: ${key}`);
  }
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing server-only secret ${key}. See docs/LIVE-AI-PROVIDER-SETUP.md`);
  }
  return value;
}

export function parseFallbackList(env: NodeJS.ProcessEnv): ProviderName[] {
  const raw =
    env.TRANSPORT_ORDER_FALLBACK_PROVIDERS?.trim() ||
    env.TRANSPORT_ORDER_PROVIDER_FALLBACKS?.trim() ||
    "";
  if (!raw) return ["grok", "qwen", "manual"];
  const out: ProviderName[] = [];
  for (const part of raw.split(",")) {
    const n = normalizeProviderName(part);
    if (n && n !== "mock" && !out.includes(n)) out.push(n);
  }
  return out;
}

export type RegistryResolveOptions = {
  mode?: import("@/lib/transport-orders/providers/mock").MockProviderMode;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
  /** When false, do not wrap with fallbacks (default true for live names). */
  withFallbacks?: boolean;
};
