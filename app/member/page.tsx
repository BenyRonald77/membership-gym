"use client";

import { useEffect, useState } from "react";

type Member = {
  id: number;
  nama: string;
  no_hp: string | null;
  kode_qr: string;
};
type Paket = { id: number; nama: string; durasi_hari: number; harga: number };
type Membership = {
  id: number;
  nama_paket: string;
  mulai: string;
  berakhir: string;
  status: string;
  freeze_selesai?: string;
};

const rupiah = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function MemberPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [pakets, setPakets] = useState<Paket[]>([]);
  const [nama, setNama] = useState("");
  const [nohp, setNohp] = useState("");
  const [sel, setSel] = useState<Member | null>(null);
  const [ms, setMs] = useState<Membership | null>(null);
  const [paketId, setPaketId] = useState("");
  const [frMulai, setFrMulai] = useState(todayStr());
  const [frSelesai, setFrSelesai] = useState("");
  const [frAlasan, setFrAlasan] = useState("");

  async function muat() {
    const [m, p] = await Promise.all([
      fetch("/api/members").then((r) => r.json()),
      fetch("/api/membership-types").then((r) => r.json()),
    ]);
    setMembers(m);
    setPakets(p);
    if (p.length && !paketId) setPaketId(String(p[0].id));
  }
  useEffect(() => {
    muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tambah() {
    if (!nama.trim()) return alert("Nama wajib diisi");
    const r = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, no_hp: nohp }),
    });
    if (!r.ok) return alert((await r.json()).error);
    setNama("");
    setNohp("");
    muat();
  }

  async function pilih(m: Member) {
    setSel(m);
    const r = await fetch(`/api/members/${m.id}/membership`);
    const d = await r.json();
    setMs(d.membership);
  }

  async function aksi(path: string, body?: object, konfirmasi?: string) {
    if (konfirmasi && !confirm(konfirmasi)) return;
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const d = await r.json();
    if (!r.ok) return alert(d.error);
    if (sel) pilih(sel);
    muat();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Member</h1>
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="font-semibold mb-2">Tambah member</h3>
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2" placeholder="Nama lengkap"
            value={nama} onChange={(e) => setNama(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="No. HP"
            value={nohp} onChange={(e) => setNohp(e.target.value)} />
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={tambah}>
            Tambah
          </button>
        </div>
      </div>

      <table className="w-full bg-white rounded-lg shadow text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Nama</th><th className="p-2">No. HP</th>
            <th className="p-2">Kode QR</th><th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b">
              <td className="p-2">{m.nama}</td>
              <td className="p-2">{m.no_hp ?? "—"}</td>
              <td className="p-2 font-mono">{m.kode_qr}</td>
              <td className="p-2">
                <button className="text-blue-600 underline" onClick={() => pilih(m)}>
                  Kelola
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold">{sel.nama}</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/members/${sel.id}/qr`} alt="QR member" width={180} height={180} className="my-2" />
            <p>Kode: <code className="bg-slate-100 px-1 rounded">{sel.kode_qr}</code></p>
            <div className="my-2 text-sm">
              {ms ? (
                <>
                  <p>Paket: <b>{ms.nama_paket}</b></p>
                  <p>Berlaku: {ms.mulai} s/d {ms.berakhir}</p>
                  <p>Status: <b>{ms.status}</b>{ms.freeze_selesai ? ` (sampai ${ms.freeze_selesai})` : ""}</p>
                </>
              ) : (
                <p className="text-red-600">Belum punya paket membership.</p>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2 items-center">
                <select className="border rounded px-2 py-1" value={paketId}
                  onChange={(e) => setPaketId(e.target.value)}>
                  {pakets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} — {rupiah(p.harga)}
                    </option>
                  ))}
                </select>
                {ms ? (
                  <button className="bg-blue-600 text-white px-3 py-1 rounded"
                    onClick={() => aksi(`/api/memberships/${ms.id}/extend`, { membership_type_id: Number(paketId) })}>
                    Perpanjang
                  </button>
                ) : (
                  <button className="bg-green-600 text-white px-3 py-1 rounded"
                    onClick={() => aksi("/api/memberships/activate", { member_id: sel.id, membership_type_id: Number(paketId) })}>
                    Aktifkan
                  </button>
                )}
              </div>
              {ms && ms.status === "aktif" && (
                <div className="border-t pt-2 flex gap-2 items-center flex-wrap">
                  <input type="date" className="border rounded px-2 py-1" value={frMulai}
                    onChange={(e) => setFrMulai(e.target.value)} />
                  <input type="date" className="border rounded px-2 py-1" value={frSelesai}
                    onChange={(e) => setFrSelesai(e.target.value)} />
                  <input className="border rounded px-2 py-1" placeholder="Alasan"
                    value={frAlasan} onChange={(e) => setFrAlasan(e.target.value)} />
                  <button className="bg-amber-600 text-white px-3 py-1 rounded"
                    onClick={() => aksi(`/api/memberships/${ms.id}/freeze`, { mulai: frMulai, selesai: frSelesai, alasan: frAlasan })}>
                    Bekukan
                  </button>
                </div>
              )}
              {ms && ms.status === "dibekukan" && (
                <button className="bg-green-600 text-white px-3 py-1 rounded"
                  onClick={() => aksi(`/api/memberships/${ms.id}/unfreeze`, {}, "Cairkan pembekuan sekarang?")}>
                  Cairkan (unfreeze)
                </button>
              )}
            </div>
            <button className="mt-4 text-slate-500 underline" onClick={() => setSel(null)}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
