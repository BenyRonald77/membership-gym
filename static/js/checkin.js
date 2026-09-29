const $ = (id) => document.getElementById(id);
const hasil = $("hasil"), tbody = document.querySelector("#log tbody");

async function kirim() {
  const kode = $("qr").value.trim();
  if (!kode) return;
  const r = await fetch("/api/checkin", {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({kode_qr: kode}),
  });
  const d = await r.json();
  if (d.hasil === "diterima") {
    hasil.innerHTML = `<div class="hasil-ok">✅ <b>${d.member.nama}</b> — DITERIMA<br>
      <small>Paket ${d.paket}, berlaku sampai ${d.berlaku_sampai}</small></div>`;
  } else {
    hasil.innerHTML = `<div class="hasil-tolak">⛔ DITOLAK<br><small>${d.alasan}</small></div>`;
  }
  $("qr").value = "";
  $("qr").focus();
  muat();
}

async function muat() {
  const d = await (await fetch("/api/checkins")).json();
  tbody.innerHTML = d.map((r) => `<tr><td>${r.waktu.slice(11)}</td>
    <td>${r.nama_member || "-"}</td>
    <td><span class="badge b-${r.hasil}">${r.hasil}</span></td>
    <td>${r.alasan || ""}</td></tr>`).join("");
}

$("btn").onclick = kirim;
$("qr").addEventListener("keydown", (e) => { if (e.key === "Enter") kirim(); });
muat();
