import { APP_ROLES } from "@/lib/auth/roles";

export default function HomePage() {
  return (
    <main>
      <h1>FUR-001 — Fleet Utilization Reports</h1>
      <p>
        PACK-001 foundation is online. This shell is intentionally minimal —
        reporting UI belongs to later packs.
      </p>
      <p>
        System of record: <strong>Supabase</strong>. Frotcom access in this pack
        is <strong>mock-only</strong>.
      </p>
      <p>Configured roles:</p>
      <ul>
        {APP_ROLES.map((role) => (
          <li key={role}>
            <code>{role}</code>
          </li>
        ))}
      </ul>
    </main>
  );
}
