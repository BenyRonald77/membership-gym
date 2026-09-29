const $ = (id) => document.getElementById(id);

async function muat() {
  const tgl = new Date().toISOString().slice(0, 10);
  const log = await (await fetch("/api/checkins")).json();
  $("s-terima").textContent = log.filter((r) => r.hasil === "diterima").length;
  $("s-tolak").textContent = log.filter((r) => r.hasil === "ditolak").length;
  const ms = await (await fetch("/api/memberships")).json();
  $("s-aktif").textContent = ms.filter((m) => m.status === "aktif").length;
  const batas = new Date(); batas.setDate(batas.getDate() + 7);
  const bstr = batas.toISOString().slice(0, 10);
  const segera = ms.filter((m) => m.berakhir <= bstr && m.status !== "dibekukan");
  $("s-habis").textContent = segera.filter((m) => m.status !== "kedaluwarsa").length;
  document.querySelector("#tbl tbody").innerHTML = segera.map((m) =>
    `<tr><td>${m.nama_member}</td><td>${m.nama_paket}</td><td>${m.berakhir}</td>
     <td><span class="badge b-${m.status}">${m.status}</span></td></tr>`).join("");
}
muat();
