"""Koneksi SQLite + inisialisasi schema dan seed."""
import sqlite3
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
DB_PATH = BASE / "data" / "gym.db"


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    conn = get_conn()
    try:
        conn.executescript((BASE / "gym" / "schema.sql").read_text())
        n = conn.execute("SELECT COUNT(*) FROM membership_types").fetchone()[0]
        if n == 0:
            conn.executescript((BASE / "gym" / "seed.sql").read_text())
        conn.commit()
    finally:
        conn.close()
