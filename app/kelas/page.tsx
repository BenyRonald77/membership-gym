"use client";

import { useEffect, useState } from "react";

type Kelas = { id: number; nama: string; instruktur: string | null; hari: string; jam_mulai: string; jam_selesai: string; kuota: number };
type Booking = {
  id: number; class_id: number; member_id: number; tanggal: string;
  status: string; nama_member: string; nama_kelas: string;
};
type KelasDetail = Kelas & {
  terisi: number; sisa: number;
  bookings: { id: number; nama_member: string; status: string }[];
};
type Member = { id: number; nama: string };

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function KelasPage() {
  const [tgl, setTgl] = useState(todayStr());
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [detail, setDetail] = useState<Record<number, KelasDetail>>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [bKelas, setBKelas] = useState("");
  const [bMember, setBMember] = useState("");
  const [bTgl, setBTgl] = useState(todayStr());
  const [bMsg, setBMsg] = useState("");

  async function muat() {
    const [k, m] = await Promise.all([
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/members").then((r) => r.json()),
    ]);
    setKelas(k);
    setMembers(m);
    if (k.length && !bKelas) setBKelas(String(k[0].id));
    if (m.length && !bMember) setBMember(String(m[0].id));
    const det: Record<number, KelasDetail> = {};
    for (const c of k as Kelas[]) {
      const d = await fetch(`/api/classes/${c.id}?tanggal=${tgl}`).then((r) => r.json());
      det[c.id] = d;
    }
    setDetail(det);
  }
  useEffect(() => {
    muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tgl]);

  async function booking() {
    setBMsg("");
    const r = await fetch(`/api/classes/${bKelas}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: Number(bMember), tanggal: bTgl }),
    });
    const d = await r.json();
    setBMsg(r.ok ? `Berhasil booking (id ${d.id})` : `Gagal: ${d.error}`);
    muat();
  }

  async function setStatus(id: number, aksi: "cancel" | "attend") {
    const r = await fetch(`/api/bookings/${id}/${aksi}`, { method: "POST" });
    if (!r.ok) alert((await r.json()).error);
    muat();
  }

  const semuaBooking: Booking[] = Object.values(detail).flatMap((d) =>
    d.bookings.map((b) => ({ ...b, class_id: 0, member_id: 0, tanggal: tgl, nama_kelas: d.nama }))
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Kelas Grup</h1>
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-2 items-center">
        <label>Tanggal:{" "}
          <input type="date" className="border rounded px-2 py-1" value={tgl}
            onChange={(e) => setTgl(e.target.value)} />
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {kelas.map((c) => {
          const d = detail[c.id];
          return (
            <div key={c.id} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold">{c.nama} — {c.hari}</h3>
              <p className="text-sm text-slate-600">
                {c.instruktur ?? "—"} · {c.jam_mulai}–{c.jam_selesai}
              </p>
              <p className="text-sm mt-1">
                Kuota: <b>{d ? `${d.terisi}/${d.kuota} (sisa ${d.sisa})` : "…"}</b>
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold mb-2">Booking kelas</h3>
        <div className="flex gap-2 flex-wrap items-center">
          <select className="border rounded px-2 py-1" value={bKelas} onChange={(e) => setBKelas(e.target.value)}>
            {kelas.map((c) => (
              <option key={c.id} value={c.id}>{c.nama} — {c.hari}</option>
            ))}
          </select>
          <select className="border rounded px-2 py-1" value={bMember} onChange={(e) => setBMember(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.nama}</option>
            ))}
          </select>
          <input type="date" className="border rounded px-2 py-1" value={bTgl}
            onChange={(e) => setBTgl(e.target.value)} />
          <button className="bg-blue-600 text-white px-4 py-1 rounded" onClick={booking}>
            Booking
          </button>
        </div>
        {bMsg && <p className="mt-2 text-sm">{bMsg}</p>}
      </div>

      <h2 className="text-xl font-semibold mb-2">Booking pada tanggal terpilih</h2>
      <table className="w-full bg-white rounded-lg shadow text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Kelas</th><th className="p-2">Member</th>
            <th className="p-2">Status</th><th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {semuaBooking.map((b) => (
            <tr key={b.id} className="border-b">
              <td className="p-2">{b.nama_kelas}</td>
              <td className="p-2">{b.nama_member}</td>
              <td className="p-2">{b.status}</td>
              <td className="p-2 flex gap-2">
                {b.status === "dipesan" && (
                  <>
                    <button className="text-green-600 underline" onClick={() => setStatus(b.id, "attend")}>Hadir</button>
                    <button className="text-red-600 underline" onClick={() => setStatus(b.id, "cancel")}>Batal</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
