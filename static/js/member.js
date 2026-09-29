const $ = (id) => document.getElementById(id);
const tbody = document.querySelector("#tbl tbody");
let pakets = [];

async function jget(u) { return (await fetch(u)).json(); }
async function jpost(u, b) {
  const r = await fetch(u, {method: "POST",
    headers: {"Content-Type": "application/json"}, body: JSON.stringify(b || {})});
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "gagal");
  return d;
}

async function muat() {
  const members = await jget("/api/members");
  pakets = await jget("/api/membership-types");
  const rows = await Promise.all(members.map(async (m) => {
    const d = await jget(`/api/members/${m.id}/membership`);
    return {...m, ms: d.membership};
  }));
  tbody.innerHTML = rows.map((m) => {
    const ms = m.ms;
    const st = ms ? `<span class="badge b-${ms.status}">${ms.status}</span>` : "-";
    const pkt = ms ? ms.nama_paket : "-";
    return `<tr><td>${m.nama}</td><td>${m.no_hp || ""}</td><td><code>${m.kode_qr}</code></td>
      <td>${pkt}</td><td>${st}</td>
      <td><button class="ghost" onclick="detail(${m.id})">Kelola</button></td></tr>`;
  }).join("");
}

async function detail(id) {
  const m = await jget(`/api/members/${id}`);
  const d = await jget(`/api/members/${id}/membership`);
  const ms = d.membership;
  $("m-nama").textContent = m.nama;
  $("m-kode").textContent = m.kode_qr;
  $("m-qr").src = `/api/members/${id}/qr.svg`;
  $("m-info").innerHTML = ms
    ? `<p>Paket: <b>${ms.nama_paket}</b> (${ms.mulai} → ${ms.berakhir})<br>
       Status: <span class="badge b-${ms.status}">${ms.status}</span></p>`
    : "<p>Belum punya paket.</p>";
  const aksi = $("m-aksi");
  aksi.innerHTML = "";
  const mkBtn = (label, ghost, fn) => {
    const b = document.createElement("button");
    b.textContent = label; if (ghost) b.className = "ghost";
    b.onclick = fn; aksi.appendChild(b);
  };
  const opsiPaket = () => {
    const p = prompt("ID paket:\n" + pakets.map((x) => `${x.id}. ${x.nama} (${x.durasi_hari} hari)`).join("\n"));
    return p ? parseInt(p) : null;
  };
  if (!ms || ms.status === "kedaluwarsa") {
    mkBtn(ms ? "Perpanjang" : "Aktifkan paket", false, async () => {
      const pid = opsiPaket(); if (!pid) return;
      try {
        if (ms && ms.status === "kedaluwarsa")
          await jpost(`/api/memberships/${ms.id}/extend`, {membership_type_id: pid});
        else
          await jpost("/api/memberships/activate", {member_id: id, membership_type_id: pid});
        detail(id); muat();
      } catch (e) { alert(e.message); }
    });
  }
  if (ms && ms.status === "aktif") {
    mkBtn("Bekukan", true, async () => {
      const selesai = prompt("Bekukan sampai tanggal (YYYY-MM-DD):");
      if (!selesai) return;
      const alasan = prompt("Alasan:", "") || "";
      try { await jpost(`/api/memberships/${ms.id}/freeze`, {selesai, alasan}); detail(id); muat(); }
      catch (e) { alert(e.message); }
    });
  }
  if (ms && ms.status === "dibekukan") {
    mkBtn("Cairkan", false, async () => {
      try { await jpost(`/api/memberships/${ms.id}/unfreeze`); detail(id); muat(); }
      catch (e) { alert(e.message); }
    });
  }
  $("modal").classList.remove("hidden");
}

$("tambah").onclick = async () => {
  const nama = $("nama").value.trim();
  if (!nama) return alert("Nama wajib diisi");
  await jpost("/api/members", {nama, no_hp: $("nohp").value.trim()});
  $("nama").value = ""; $("nohp").value = "";
  muat();
};
$("tutup").onclick = () => $("modal").classList.add("hidden");
muat();
