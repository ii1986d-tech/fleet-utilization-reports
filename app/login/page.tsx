"use client";

import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <main style={{ maxWidth: 480, margin: "2rem auto", padding: "1rem" }}>
      <h1>Login</h1>
      <p>Use a Supabase Auth user with app_metadata.role set (admin/manager/viewer).</p>
      {message ? <p role="alert">{message}</p> : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            try {
              const supabase = createSupabaseBrowserClient();
              const { error } = await supabase.auth.signInWithPassword({ email, password });
              setMessage(error ? error.message : "Signed in. Open Settings.");
            } catch (err) {
              setMessage(err instanceof Error ? err.message : "Login failed");
            }
          });
        }}
      >
        <label>
          Email{" "}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <br />
        <label>
          Password{" "}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <br />
        <button type="submit" disabled={pending}>
          Sign in
        </button>
      </form>
      <p>
        <a href="/settings/vehicles">Settings</a>
      </p>
    </main>
  );
}
