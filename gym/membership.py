"""Lifecycle membership: status hitung, aktivasi, perpanjang, freeze/unfreeze.

Status TIDAK disimpan di DB — selalu dihitung dari tanggal:
- dibekukan   : ada freeze yang mencakup hari ini
- kedaluwarsa : hari ini > berakhir
- belum_mulai : hari ini < mulai
- aktif       : selain itu
"""
from datetime import date, timedelta

from flask import Blueprint, jsonify, request

from gym.db import get_conn

membership_bp = Blueprint("membership", __name__, url_prefix="/api")

MAX_FREEZE_HARI = 30


def _today() -> date:
    return date.today()


def _status(m: dict, conn, today: date) -> str:
    mulai = date.fromisoformat(m["mulai"])
    berakhir = date.fromisoformat(m["berakhir"])
    if today < mulai:
        return "belum_mulai"
    if today > berakhir:
        return "kedaluwarsa"
    f = conn.execute(
        "SELECT id FROM freezes WHERE membership_id = ? AND mulai <= ? AND selesai >= ?",
        (m["id"], today.isoformat(), today.isoformat())).fetchone()
    return "dibekukan" if f else "aktif"


def current_membership(member_id: int, today: date | None = None):
    """Membership terbaru milik member + status hitung. None jika tak ada."""
    today = today or _today()
    conn = get_conn()
    try:
        m = conn.execute(
            "SELECT ms.*, mt.nama AS nama_paket, mt.durasi_hari, mt.harga"
            " FROM memberships ms JOIN membership_types mt"
            " ON mt.id = ms.membership_type_id"
            " WHERE ms.member_id = ? AND ms.mulai <= ?"
            " ORDER BY ms.mulai DESC LIMIT 1",
            (member_id, today.isoformat())).fetchone()
        if m is None:
            return None
        d = dict(m)
        d["status"] = _status(d, conn, today)
        if d["status"] == "dibekukan":
            f = conn.execute(
                "SELECT selesai FROM freezes WHERE membership_id = ?"
                " AND mulai <= ? AND selesai >= ?"
                " ORDER BY mulai DESC LIMIT 1",
                (d["id"], today.isoformat(), today.isoformat())).fetchone()
            d["freeze_selesai"] = f["selesai"] if f else None
        return d
    finally:
        conn.close()


@membership_bp.get("/members/<int:member_id>/membership")
def get_current(member_id: int):
    m = current_membership(member_id)
    if m is None:
        return jsonify({"member_id": member_id, "membership": None})
    return jsonify({"member_id": member_id, "membership": m})


@membership_bp.get("/memberships")
def list_memberships():
    today = _today()
    conn = get_conn()
    try:
        rows = conn.execute(
            "SELECT ms.*, mb.nama AS nama_member, mt.nama AS nama_paket"
            " FROM memberships ms"
            " JOIN members mb ON mb.id = ms.member_id"
            " JOIN membership_types mt ON mt.id = ms.membership_type_id"
            " ORDER BY ms.mulai DESC").fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["status"] = _status(d, conn, today)
            out.append(d)
        return jsonify(out)
    finally:
        conn.close()


@membership_bp.post("/memberships/activate")
def activate():
    data = request.get_json(force=True)
    for f in ("member_id", "membership_type_id"):
        if f not in data or data[f] in (None, ""):
            return jsonify({"error": f"field wajib: {f}"}), 400
    today = _today()
    conn = get_conn()
    try:
        member = conn.execute("SELECT id FROM members WHERE id = ?",
                              (data["member_id"],)).fetchone()
        if member is None:
            return jsonify({"error": "member tidak ditemukan"}), 404
        tipe = conn.execute("SELECT * FROM membership_types WHERE id = ?",
                            (data["membership_type_id"],)).fetchone()
        if tipe is None:
            return jsonify({"error": "paket tidak ditemukan"}), 404
        cur = conn.execute(
            "SELECT * FROM memberships WHERE member_id = ? AND mulai <= ?"
            " ORDER BY mulai DESC LIMIT 1", (member["id"], today.isoformat())).fetchone()
        if cur and _status(dict(cur), conn, today) in ("aktif", "dibekukan", "belum_mulai"):
            return jsonify({"error": "member masih punya paket yang berlaku, gunakan perpanjang"}), 409
        mulai = date.fromisoformat(data["mulai"]) if data.get("mulai") else today
        berakhir = mulai + timedelta(days=int(tipe["durasi_hari"]))
        cur2 = conn.execute(
            "INSERT INTO memberships (member_id, membership_type_id, mulai, berakhir, tanggal_buat)"
            " VALUES (?, ?, ?, ?, ?)",
            (member["id"], tipe["id"], mulai.isoformat(), berakhir.isoformat(),
             today.isoformat()))
        conn.commit()
        row = conn.execute("SELECT * FROM memberships WHERE id = ?",
                           (cur2.lastrowid,)).fetchone()
        d = dict(row)
        d["status"] = _status(d, conn, today)
        return jsonify(d), 201
    finally:
        conn.close()


@membership_bp.post("/memberships/<int:ms_id>/extend")
def extend(ms_id: int):
    data = request.get_json(force=True)
    today = _today()
    conn = get_conn()
    try:
        m = conn.execute("SELECT * FROM memberships WHERE id = ?",
                         (ms_id,)).fetchone()
        if m is None:
            return jsonify({"error": "membership tidak ditemukan"}), 404
        tipe_id = data.get("membership_type_id", m["membership_type_id"])
        tipe = conn.execute("SELECT * FROM membership_types WHERE id = ?",
                            (tipe_id,)).fetchone()
        if tipe is None:
            return jsonify({"error": "paket tidak ditemukan"}), 404
        berakhir_lama = date.fromisoformat(m["berakhir"])
        awal = max(berakhir_lama, today)
        berakhir_baru = awal + timedelta(days=int(tipe["durasi_hari"]))
        conn.execute(
            "UPDATE memberships SET berakhir = ?, membership_type_id = ? WHERE id = ?",
            (berakhir_baru.isoformat(), tipe["id"], ms_id))
        conn.commit()
        row = conn.execute("SELECT * FROM memberships WHERE id = ?",
                           (ms_id,)).fetchone()
        d = dict(row)
        d["status"] = _status(d, conn, today)
        return jsonify(d)
    finally:
        conn.close()


def _freeze_terpakai(conn, membership_id: int) -> int:
    rows = conn.execute(
        "SELECT mulai, selesai FROM freezes WHERE membership_id = ?",
        (membership_id,)).fetchall()
    total = 0
    for r in rows:
        hari = (date.fromisoformat(r["selesai"])
                - date.fromisoformat(r["mulai"])).days + 1
        total += max(hari, 0)  # record void (selesai < mulai) dihitung 0
    return total


@membership_bp.post("/memberships/<int:ms_id>/freeze")
def freeze(ms_id: int):
    data = request.get_json(force=True)
    today = _today()
    conn = get_conn()
    try:
        m = conn.execute("SELECT * FROM memberships WHERE id = ?",
                         (ms_id,)).fetchone()
        if m is None:
            return jsonify({"error": "membership tidak ditemukan"}), 404
        d = dict(m)
        if _status(d, conn, today) != "aktif":
            return jsonify({"error": "hanya membership aktif yang bisa dibekukan"}), 400
        try:
            mulai = date.fromisoformat(data.get("mulai", today.isoformat()))
            selesai = date.fromisoformat(data["selesai"])
        except (KeyError, ValueError):
            return jsonify({"error": "format tanggal salah (YYYY-MM-DD), field wajib: selesai"}), 400
        if selesai < mulai:
            return jsonify({"error": "tanggal selesai harus >= tanggal mulai"}), 400
        if mulai < today:
            return jsonify({"error": "pembekuan tidak bisa dimulai di masa lalu"}), 400
        hari = (selesai - mulai).days + 1
        if _freeze_terpakai(conn, ms_id) + hari > MAX_FREEZE_HARI:
            return jsonify({"error": f"total pembekuan melebihi batas {MAX_FREEZE_HARI} hari"}), 400
        conn.execute(
            "INSERT INTO freezes (membership_id, mulai, selesai, alasan)"
            " VALUES (?, ?, ?, ?)",
            (ms_id, mulai.isoformat(), selesai.isoformat(), data.get("alasan")))
        berakhir_baru = date.fromisoformat(d["berakhir"]) + timedelta(days=hari)
        conn.execute("UPDATE memberships SET berakhir = ? WHERE id = ?",
                     (berakhir_baru.isoformat(), ms_id))
        conn.commit()
        row = conn.execute("SELECT * FROM memberships WHERE id = ?",
                           (ms_id,)).fetchone()
        out = dict(row)
        out["status"] = _status(out, conn, today)
        return jsonify({**out, "hari_dibekukan": hari})
    finally:
        conn.close()


@membership_bp.post("/memberships/<int:ms_id>/unfreeze")
def unfreeze(ms_id: int):
    """Hentikan freeze yang sedang berjalan lebih awal; koreksi perpanjangan."""
    today = _today()
    conn = get_conn()
    try:
        m = conn.execute("SELECT * FROM memberships WHERE id = ?",
                         (ms_id,)).fetchone()
        if m is None:
            return jsonify({"error": "membership tidak ditemukan"}), 404
        f = conn.execute(
            "SELECT * FROM freezes WHERE membership_id = ? AND mulai <= ? AND selesai >= ?"
            " ORDER BY mulai DESC LIMIT 1",
            (ms_id, today.isoformat(), today.isoformat())).fetchone()
        if f is None:
            return jsonify({"error": "tidak ada pembekuan yang sedang berjalan"}), 400
        mulai_f = date.fromisoformat(f["mulai"])
        selesai_lama = date.fromisoformat(f["selesai"])
        ditambahkan = (selesai_lama - mulai_f).days + 1  # hari yg ditambahkan saat freeze
        terpakai = (today - mulai_f).days  # hari freeze yang sudah berjalan penuh
        # Akhiri freeze sebelum hari ini agar status langsung kembali aktif
        conn.execute("UPDATE freezes SET selesai = ? WHERE id = ?",
                     ((today - timedelta(days=1)).isoformat(), f["id"]))
        berakhir_baru = (date.fromisoformat(m["berakhir"])
                         - timedelta(days=ditambahkan)
                         + timedelta(days=terpakai))
        conn.execute("UPDATE memberships SET berakhir = ? WHERE id = ?",
                     (berakhir_baru.isoformat(), ms_id))
        conn.commit()
        row = conn.execute("SELECT * FROM memberships WHERE id = ?",
                           (ms_id,)).fetchone()
        out = dict(row)
        out["status"] = _status(out, conn, today)
        return jsonify(out)
    finally:
        conn.close()
