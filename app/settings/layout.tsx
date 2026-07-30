import Link from "next/link";

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <p>
          <Link href="/">← Home</Link>
        </p>
        <h1>Settings</h1>
        <nav style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/settings/vehicles">Vehicles</Link>
          <Link href="/settings/drivers">Drivers</Link>
          <Link href="/settings/customers">Customers</Link>
          <Link href="/settings/assignments">Assignments</Link>
          <Link href="/settings/imports">Imports</Link>
          <Link href="/login">Login</Link>
        </nav>
        <p style={{ color: "#555", fontSize: "0.9rem" }}>
          Admin write only. Manager/viewer: read. No hard delete — deactivate / end.
        </p>
      </header>
      {children}
    </div>
  );
}
