function requiredPublicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and set placeholders for local development.`,
    );
  }
  return value;
}

export function getSupabasePublicEnv(): {
  url: string;
  anonKey: string;
} {
  return {
    url: requiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requiredPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

/** Server-only. Never expose via NEXT_PUBLIC_*. */
export function getSupabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (server-only).");
  }
  return value;
}
