"""Kelas grup berkuota: booking, batal, hadir — dengan validasi kuota dan status member."""
from datetime import date

from flask import Blueprint, jsonify, request

from gym.db import get_conn
from gym.membership import current_membership

classes_bp = Blueprint("classes", __name__, url_prefix="/api")

HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]


def _hari(tgl: str) -> str:
    return HARI[date.fromisoformat(tgl).weekday()]


def _booking_info(conn, class_id: int, tanggal: str):
    kuota = conn.execute("SELECT kuota FROM classes WHERE id = ?",
                         (class_id,)).fetchone()["kuota"]
    terisi = conn.execute(
        "SELECT COUNT(*) AS n FROM class_bookings"
        " WHERE class_id = ? AND tanggal = ? AND status != 'batal'",
        (class_id, tanggal)).fetchone()["n"]
    return kuota, terisi


@classes_bp.get("/classes/<int:c_id>")
def get_class(c_id: int):
    tanggal = request.args.get("tanggal", date.today().isoformat())
    conn = get_conn()
    try:
        c = conn.execute("SELECT * FROM classes WHERE id = ?",
                         (c_id,)).fetchone()
        if c is None:
            return jsonify({"error": "kelas tidak ditemukan"}), 404
        d = dict(c)
        kuota, terisi = _booking_info(conn, c_id, tanggal)
        d["kuota"], d["terisi"], d["sisa"], d["tanggal"] = kuota, terisi, kuota - terisi, tanggal
        d["bookings"] = [dict(r) for r in conn.execute(
            "SELECT b.*, m.nama AS nama_member FROM class_bookings b"
            " JOIN members m ON m.id = b.member_id"
            " WHERE b.class_id = ? AND b.tanggal = ? ORDER BY b.id",
            (c_id, tanggal)).fetchall()]
        return jsonify(d)
    finally:
        conn.close()


@classes_bp.post("/classes/<int:c_id>/book")
def book(c_id: int):
    data = request.get_json(force=True)
    member_id = data.get("member_id")
    tanggal = data.get("tanggal", date.today().isoformat())
    if not member_id:
        return jsonify({"error": "field wajib: member_id"}), 400
    try:
        tgl = date.fromisoformat(tanggal)
    except ValueError:
        return jsonify({"error": "format tanggal salah (YYYY-MM-DD)"}), 400
    if tgl < date.today():
        return jsonify({"error": "tidak bisa booking untuk tanggal lampau"}), 400
    conn = get_conn()
    try:
        c = conn.execute("SELECT * FROM classes WHERE id = ?",
                         (c_id,)).fetchone()
        if c is None:
            return jsonify({"error": "kelas tidak ditemukan"}), 404
        if _hari(tanggal) != c["hari"]:
            return jsonify({"error": f"kelas ini hanya di hari {c['hari']}"}), 400
        m = conn.execute("SELECT id FROM members WHERE id = ?",
                         (member_id,)).fetchone()
        if m is None:
            return jsonify({"error": "member tidak ditemukan"}), 404
        ms = current_membership(member_id)
        if ms is None or ms["status"] != "aktif":
            st = ms["status"] if ms else "tanpa paket"
            return jsonify({"error": f"member tidak aktif (status: {st})"}), 400
        dupe = conn.execute(
            "SELECT id FROM class_bookings WHERE class_id = ? AND member_id = ?"
            " AND tanggal = ? AND status != 'batal'",
            (c_id, member_id, tanggal)).fetchone()
        if dupe:
            return jsonify({"error": "member sudah booking di kelas ini"}), 409
        kuota, terisi = _booking_info(conn, c_id, tanggal)
        if terisi >= kuota:
            return jsonify({"error": "kuota kelas penuh"}), 409
        cur = conn.execute(
            "INSERT INTO class_bookings (class_id, member_id, tanggal, status)"
            " VALUES (?, ?, ?, 'dipesan')", (c_id, member_id, tanggal))
        conn.commit()
        row = conn.execute("SELECT * FROM class_bookings WHERE id = ?",
                           (cur.lastrowid,)).fetchone()
        return jsonify(dict(row)), 201
    finally:
        conn.close()


@classes_bp.post("/bookings/<int:b_id>/cancel")
def cancel_booking(b_id: int):
    return _set_booking_status(b_id, "batal")


@classes_bp.post("/bookings/<int:b_id>/attend")
def attend_booking(b_id: int):
    return _set_booking_status(b_id, "hadir")


def _set_booking_status(b_id: int, status: str):
    conn = get_conn()
    try:
        cur = conn.execute("UPDATE class_bookings SET status = ? WHERE id = ?",
                           (status, b_id))
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({"error": "booking tidak ditemukan"}), 404
        row = conn.execute("SELECT * FROM class_bookings WHERE id = ?",
                           (b_id,)).fetchone()
        return jsonify(dict(row))
    finally:
        conn.close()


@classes_bp.get("/bookings")
def list_bookings():
    tanggal = request.args.get("tanggal", date.today().isoformat())
    conn = get_conn()
    try:
        cur = conn.execute(
            "SELECT b.*, m.nama AS nama_member, c.nama AS nama_kelas"
            " FROM class_bookings b"
            " JOIN members m ON m.id = b.member_id"
            " JOIN classes c ON c.id = b.class_id"
            " WHERE b.tanggal = ? ORDER BY c.jam_mulai, b.id", (tanggal,))
        return jsonify([dict(r) for r in cur.fetchall()])
    finally:
        conn.close()
