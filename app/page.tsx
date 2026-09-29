"use client";

import { useEffect, useState } from "react";

type CheckinRow = {
  id: number;
  waktu: string;
  nama_member: string | null;
  hasil: string;
  alasan: string | null;
};

export default function CheckinPage() {
  const [kode, setKode] = useState("");
  const [hasil, setHasil] = useState<string>("");
  const [ok, setOk] = useState<boolean | null>(null);
  const [log, setLog] = useState<CheckinRow[]>([]);

  async function muat() {
    const r = await fetch("/api/checkins");
    setLog(await r.json());
  }
  useEffect(() => {
    muat();
  }, []);

  async function scan() {
    const r = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kode_qr: kode }),
    });
    const d = await r.json();
    if (d.hasil === "diterima") {
      setOk(true);
      setHasil(`DITERIMA — ${d.member.nama} (${d.paket}, berlaku sampai ${d.berlaku_sampai})`);
    } else {
      setOk(false);
      setHasil(`DITOLAK — ${d.alasan || d.error}`);
    }
    setKode("");
    muat();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Check-in Member</h1>
      <div className="bg-white rounded-lg shadow p-4 flex gap-2 mb-4">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Pindai / ketik kode QR member… (cth: GYM-a1b2c3d4)"
          value={kode}
          autoFocus
          onChange={(e) => setKode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && scan()}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={scan}
        >
          Check-in
        </button>
      </div>
      {hasil && (
        <div
          className={`rounded-lg p-4 mb-4 font-semibold ${
            ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {hasil}
        </div>
      )}
      <h2 className="text-xl font-semibold mb-2">Riwayat hari ini</h2>
      <table className="w-full bg-white rounded-lg shadow text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Waktu</th>
            <th className="p-2">Member</th>
            <th className="p-2">Hasil</th>
            <th className="p-2">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {log.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="p-2">{c.waktu}</td>
              <td className="p-2">{c.nama_member ?? "—"}</td>
              <td className="p-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    c.hasil === "diterima"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {c.hasil}
                </span>
              </td>
              <td className="p-2">{c.alasan ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
