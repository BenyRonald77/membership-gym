"""QR member dan check-in dengan aturan penolakan."""
import io
from datetime import datetime

import segno
from flask import Blueprint, Response, jsonify, request

from gym.db import get_conn
from gym.membership import current_membership

checkin_bp = Blueprint("checkin", __name__, url_prefix="/api")


@checkin_bp.get("/members/<int:member_id>/qr.svg")
def qr_svg(member_id: int):
    conn = get_conn()
    try:
        m = conn.execute("SELECT kode_qr, nama FROM members WHERE id = ?",
                         (member_id,)).fetchone()
        if m is None:
            return jsonify({"error": "member tidak ditemukan"}), 404
        buf = io.BytesIO()
        segno.make(m["kode_qr"], error="m").save(buf, kind="svg", scale=6,
                                                 border=2)
        return Response(buf.getvalue(), mimetype="image/svg+xml")
    finally:
        conn.close()


@checkin_bp.post("/checkin")
def checkin():
    data = request.get_json(force=True)
    kode = (data.get("kode_qr") or "").strip()
    if not kode:
        return jsonify({"hasil": "ditolak",
                        "alasan": "kode QR kosong"}), 400
    conn = get_conn()
    try:
        m = conn.execute("SELECT * FROM members WHERE kode_qr = ?",
                         (kode,)).fetchone()
        waktu = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        def tolak(member_id, alasan):
            conn.execute(
                "INSERT INTO checkins (member_id, waktu, hasil, alasan)"
                " VALUES (?, ?, 'ditolak', ?)", (member_id, waktu, alasan))
            conn.commit()
            return jsonify({"hasil": "ditolak", "alasan": alasan}), 200

        if m is None:
            return tolak(None, "kode QR tidak dikenal")
        ms = current_membership(m["id"])
        if ms is None:
            return tolak(m["id"], "tidak memiliki paket membership aktif")
        st = ms["status"]
        if st == "kedaluwarsa":
            return tolak(m["id"],
                         f"masa aktif habis pada {ms['berakhir']}, silakan perpanjang")
        if st == "dibekukan":
            return tolak(m["id"],
                         f"membership dibekukan sampai {ms.get('freeze_selesai')}")
        if st == "belum_mulai":
            return tolak(m["id"], f"paket berlaku mulai {ms['mulai']}")
        conn.execute(
            "INSERT INTO checkins (member_id, waktu, hasil, alasan)"
            " VALUES (?, ?, 'diterima', NULL)", (m["id"], waktu))
        conn.commit()
        return jsonify({"hasil": "diterima",
                        "member": {"id": m["id"], "nama": m["nama"]},
                        "paket": ms["nama_paket"],
                        "berlaku_sampai": ms["berakhir"]}), 200
    finally:
        conn.close()


@checkin_bp.get("/checkins")
def list_checkins():
    tanggal = request.args.get(
        "date", datetime.now().strftime("%Y-%m-%d"))
    conn = get_conn()
    try:
        cur = conn.execute(
            "SELECT c.*, m.nama AS nama_member FROM checkins c"
            " LEFT JOIN members m ON m.id = c.member_id"
            " WHERE date(c.waktu) = ? ORDER BY c.waktu DESC", (tanggal,))
        return jsonify([dict(r) for r in cur.fetchall()])
    finally:
        conn.close()
