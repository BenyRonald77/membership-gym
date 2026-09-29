"""CRUD master data: membership_types, members, classes."""
import secrets
from datetime import date

from flask import Blueprint, jsonify, request

from gym.db import get_conn

api_bp = Blueprint("api", __name__, url_prefix="/api")


def _dicts(cur):
    return [dict(r) for r in cur.fetchall()]


def _require(data: dict, fields: list[str]):
    missing = [f for f in fields if f not in data or data[f] in (None, "")]
    if missing:
        return jsonify({"error": f"field wajib: {', '.join(missing)}"}), 400
    return None


def _crud(table: str, fields: list[str], order: str = "id"):
    """Daftarkan endpoint CRUD standar untuk satu tabel."""
    base = "/" + table.replace("_", "-")

    @api_bp.get(base, endpoint=f"list_{table}")
    def list_():
        conn = get_conn()
        try:
            return jsonify(_dicts(
                conn.execute(f"SELECT * FROM {table} ORDER BY {order}")))
        finally:
            conn.close()

    @api_bp.post(base, endpoint=f"create_{table}")
    def create():
        data = request.get_json(force=True)
        err = _require(data, fields)
        if err:
            return err
        conn = get_conn()
        try:
            cols = ", ".join(fields)
            ph = ", ".join("?" for _ in fields)
            cur = conn.execute(
                f"INSERT INTO {table} ({cols}) VALUES ({ph})",
                [data[f] for f in fields])
            conn.commit()
            row = conn.execute(f"SELECT * FROM {table} WHERE id = ?",
                               (cur.lastrowid,)).fetchone()
            return jsonify(dict(row)), 201
        except Exception as e:  # noqa: BLE001
            return jsonify({"error": str(e)}), 400
        finally:
            conn.close()

    @api_bp.put(f"{base}/<int:row_id>", endpoint=f"update_{table}")
    def update(row_id: int):
        data = request.get_json(force=True)
        conn = get_conn()
        try:
            sets = [f"{f} = ?" for f in fields if f in data]
            if not sets:
                return jsonify({"error": "tidak ada field yang diubah"}), 400
            vals = [data[f] for f in fields if f in data] + [row_id]
            cur = conn.execute(
                f"UPDATE {table} SET {', '.join(sets)} WHERE id = ?", vals)
            conn.commit()
            if cur.rowcount == 0:
                return jsonify({"error": "tidak ditemukan"}), 404
            row = conn.execute(f"SELECT * FROM {table} WHERE id = ?",
                               (row_id,)).fetchone()
            return jsonify(dict(row))
        except Exception as e:  # noqa: BLE001
            return jsonify({"error": str(e)}), 400
        finally:
            conn.close()

    @api_bp.delete(f"{base}/<int:row_id>", endpoint=f"delete_{table}")
    def delete(row_id: int):
        conn = get_conn()
        try:
            cur = conn.execute(f"DELETE FROM {table} WHERE id = ?", (row_id,))
            conn.commit()
            if cur.rowcount == 0:
                return jsonify({"error": "tidak ditemukan"}), 404
            return jsonify({"ok": True})
        except Exception as e:  # noqa: BLE001
            return jsonify({"error": str(e)}), 400
        finally:
            conn.close()


_crud("membership_types", ["nama", "durasi_hari", "harga"])
_crud("classes", ["nama", "instruktur", "hari", "jam_mulai", "jam_selesai", "kuota"],
      order="hari, jam_mulai")


# ---------- members (kode_qr dibuat otomatis) ----------

@api_bp.get("/members")
def list_members():
    conn = get_conn()
    try:
        return jsonify(_dicts(
            conn.execute("SELECT * FROM members ORDER BY nama")))
    finally:
        conn.close()


@api_bp.get("/members/<int:m_id>")
def get_member(m_id: int):
    conn = get_conn()
    try:
        row = conn.execute("SELECT * FROM members WHERE id = ?",
                           (m_id,)).fetchone()
        if row is None:
            return jsonify({"error": "tidak ditemukan"}), 404
        return jsonify(dict(row))
    finally:
        conn.close()


@api_bp.post("/members")
def create_member():
    data = request.get_json(force=True)
    err = _require(data, ["nama"])
    if err:
        return err
    conn = get_conn()
    try:
        kode = "GYM-" + secrets.token_hex(4)
        cur = conn.execute(
            "INSERT INTO members (nama, no_hp, kode_qr, tanggal_daftar)"
            " VALUES (?, ?, ?, ?)",
            (data["nama"], data.get("no_hp"), kode,
             date.today().isoformat()))
        conn.commit()
        row = conn.execute("SELECT * FROM members WHERE id = ?",
                           (cur.lastrowid,)).fetchone()
        return jsonify(dict(row)), 201
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()


@api_bp.put("/members/<int:m_id>")
def update_member(m_id: int):
    data = request.get_json(force=True)
    conn = get_conn()
    try:
        sets = [f"{f} = ?" for f in ("nama", "no_hp") if f in data]
        if not sets:
            return jsonify({"error": "tidak ada field yang diubah"}), 400
        vals = [data[f] for f in ("nama", "no_hp") if f in data] + [m_id]
        cur = conn.execute(
            f"UPDATE members SET {', '.join(sets)} WHERE id = ?", vals)
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({"error": "tidak ditemukan"}), 404
        row = conn.execute("SELECT * FROM members WHERE id = ?",
                           (m_id,)).fetchone()
        return jsonify(dict(row))
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()


@api_bp.delete("/members/<int:m_id>")
def delete_member(m_id: int):
    conn = get_conn()
    try:
        cur = conn.execute("DELETE FROM members WHERE id = ?", (m_id,))
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({"error": "tidak ditemukan"}), 404
        return jsonify({"ok": True})
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()
