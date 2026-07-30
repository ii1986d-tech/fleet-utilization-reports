import { APP_ROLES } from "@/lib/auth/roles";
import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>FUR-001 — Fleet Utilization Reports</h1>
      <p>
        PACK-001 foundation + PACK-002 settings (masters &amp; assignments). Reporting UI belongs
        to later packs.
      </p>
      <p>
        <Link href="/settings/vehicles">Open Settings</Link> · <Link href="/login">Login</Link>
      </p>
      <p>
        System of record: <strong>Supabase</strong>. Frotcom access remains <strong>mock-only</strong>.
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
