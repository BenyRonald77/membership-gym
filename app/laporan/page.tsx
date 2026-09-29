"use client";

import { useEffect, useState } from "react";

type Ms = {
  id: number;
  nama_member: string;
  nama_paket: string;
  berakhir: string;
  status: string;
};

export default function LaporanPage() {
  const [stats, setStats] = useState({ terima: 0, tolak: 0, aktif: 0, habis: 0 });
  const [rows, setRows] = useState<Ms[]>([]);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [ci, ms] = await Promise.all([
        fetch("/api/checkins").then((r) => r.json()),
        fetch("/api/memberships").then((r) => r.json()) as Promise<Ms[]>,
      ]);
      const terima = ci.filter((c: { hasil: string }) => c.hasil === "diterima").length;
      const tolak = ci.filter((c: { hasil: string }) => c.hasil === "ditolak").length;
      const aktif = ms.filter((m) => m.status === "aktif").length;
      const batas = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const segera = ms.filter(
        (m) => m.berakhir <= batas && ["aktif", "kedaluwarsa"].includes(m.status)
      );
      setStats({ terima, tolak, aktif, habis: segera.length });
      setRows(segera.sort((a, b) => a.berakhir.localeCompare(b.berakhir)));
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Laporan</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          [stats.terima, "Check-in diterima"],
          [stats.tolak, "Check-in ditolak"],
          [stats.aktif, "Membership aktif"],
          [stats.habis, "Kedaluwarsa ≤ 7 hari"],
        ].map(([n, label]) => (
          <div key={label as string} className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold">{n}</div>
            <div className="text-sm text-slate-600">{label}</div>
          </div>
        ))}
      </div>
      <h2 className="text-xl font-semibold mb-2">Membership segera / sudah kedaluwarsa</h2>
      <table className="w-full bg-white rounded-lg shadow text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Member</th><th className="p-2">Paket</th>
            <th className="p-2">Berakhir</th><th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-b">
              <td className="p-2">{m.nama_member}</td>
              <td className="p-2">{m.nama_paket}</td>
              <td className="p-2">{m.berakhir}</td>
              <td className="p-2">{m.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
