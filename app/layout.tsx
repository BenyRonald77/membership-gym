import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Membership Gym",
  description: "Sistem membership gym: paket, check-in QR, kelas berkuota",
};

const NAV = [
  { href: "/", label: "Check-in" },
  { href: "/member", label: "Member" },
  { href: "/kelas", label: "Kelas" },
  { href: "/laporan", label: "Laporan" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen text-slate-900">
        <header className="bg-slate-900 text-white px-6 py-4 flex items-center gap-8">
          <h1 className="text-lg font-bold">Membership Gym</h1>
          <nav className="flex gap-4">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-slate-300 hover:text-white">
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="max-w-5xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
