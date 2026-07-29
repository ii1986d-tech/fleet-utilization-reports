import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FUR-001 Fleet Utilization Reports",
  description: "Internal fleet utilization reporting foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
