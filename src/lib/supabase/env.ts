function requiredPublicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
  // Next.js inlines NEXT_PUBLIC_* only for static property access in the client bundle.
  // Dynamic process.env[name] stays undefined in the browser.
  let value: string | undefined;
  switch (name) {
    case "NEXT_PUBLIC_SUPABASE_URL":
      value = process.env.NEXT_PUBLIC_SUPABASE_URL;
      break;
    case "NEXT_PUBLIC_SUPABASE_ANON_KEY":
      value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      break;
    default: {
      const _exhaustive: never = name;
      throw new Error(`Unhandled public env: ${_exhaustive}`);
    }
  }
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
