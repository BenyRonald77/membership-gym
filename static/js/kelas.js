const $ = (id) => document.getElementById(id);
const daftar = $("daftar"), tbody = document.querySelector("#tbl tbody");

async function jget(u) { return (await fetch(u)).json(); }
async function jpost(u, b) {
  const r = await fetch(u, {method: "POST",
    headers: {"Content-Type": "application/json"}, body: JSON.stringify(b || {})});
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "gagal");
  return d;
}

function hariIni() { return new Date().toISOString().slice(0, 10); }

async function muat() {
  const tgl = $("tgl").value || hariIni();
  const kelas = await jget("/api/classes");
  const info = await Promise.all(
    kelas.map((k) => jget(`/api/classes/${k.id}?tanggal=${tgl}`)));
  daftar.innerHTML = info.map((k) => {
    const pct = k.kuota ? Math.round((k.terisi / k.kuota) * 100) : 0;
    return `<div class="kelas-card"><span class="kuota">${k.terisi}/${k.kuota}</span>
      <b>${k.nama}</b> — ${k.hari} ${k.jam_mulai}–${k.jam_selesai}
      <br><small>${k.instruktur || ""} · ${tgl}</small>
      <div class="bar"><i style="width:${pct}%"></i></div></div>`;
  }).join("");
  const bk = await jget(`/api/bookings?tanggal=${tgl}`);
  tbody.innerHTML = bk.map((b) => `<tr><td>${b.nama_kelas}</td><td>${b.tanggal}</td>
    <td>${b.nama_member}</td>
    <td><span class="badge b-${b.status}">${b.status}</span></td>
    <td>${b.status === "dipesan"
      ? `<button class="ghost" onclick="aksi(${b.id},'attend')">Hadir</button>
         <button class="ghost" onclick="aksi(${b.id},'cancel')">Batal</button>` : ""}</td></tr>`).join("");
  $("b-kelas").innerHTML = kelas.map((k) => `<option value="${k.id}">${k.nama} — ${k.hari} ${k.jam_mulai}</option>`).join("");
  const members = await jget("/api/members");
  $("b-member").innerHTML = members.map((m) => `<option value="${m.id}">${m.nama}</option>`).join("");
}

async function aksi(id, apa) {
  await jpost(`/api/bookings/${id}/${apa}`);
  muat();
}

$("lihat").onclick = muat;
$("b-btn").onclick = async () => {
  $("b-msg").textContent = "";
  try {
    await jpost(`/api/classes/${$("b-kelas").value}/book`, {
      member_id: parseInt($("b-member").value),
      tanggal: $("b-tgl").value || hariIni(),
    });
    $("b-msg").textContent = "Booking berhasil.";
    muat();
  } catch (e) { $("b-msg").textContent = "Gagal: " + e.message; }
};

$("tgl").value = hariIni();
$("b-tgl").value = hariIni();
muat();
