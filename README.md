# Membership Gym

Sistem membership gym: paket aktif & kedaluwarsa, check-in QR (menolak member
dengan masa aktif habis), kelas grup berkuota (yoga, zumba), dan pembekuan
membership sementara.

## Cara Menjalankan

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Buka http://localhost:5000. Database SQLite dibuat otomatis dan di-seed saat
pertama dijalankan.

## Struktur

```
├── PRD.md
├── DESIGN.md
├── requirements.txt
├── app.py
├── gym/
│   ├── __init__.py
│   ├── db.py            # koneksi SQLite, init schema + seed
│   ├── schema.sql
│   ├── seed.sql
│   ├── membership.py    # status hitung, aktivasi, freeze
│   ├── api.py           # CRUD master data
│   ├── checkin.py       # QR + check-in
│   └── classes.py       # kelas grup + booking
├── static/
└── templates/
```

## Alur Check-in

1. Buka halaman Check-in, pindai/ketik kode QR member (cth: `GYM-9f3a2b1c`).
2. Sistem memeriksa membership: aktif → DITERIMA; kedaluwarsa/dibekukan/
   tanpa paket → DITOLAK beserta alasannya.
