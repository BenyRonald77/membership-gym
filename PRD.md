# PRD — Membership Gym

Sistem membership gym: paket aktif/kedaluwarsa, check-in QR yang menolak member
dengan masa aktif habis, kelas grup berkuota (yoga, zumba), dan pembekuan
membership sementara.

## Tujuan

Resepsionis bisa mendaftarkan member, mengaktifkan paket, memindai QR saat
check-in (member kedaluwarsa/beku otomatis ditolak dengan alasan jelas),
mengelola kelas berkuota beserta booking, dan membekukan membership sementara
(mis. sakit/dinas) dengan masa aktif yang diperpanjang otomatis.

## Stack

- Backend: TypeScript + Next.js 14 (App Router), database SQLite via Prisma
- QR: paket npm `qrcode` — QR SVG berisi token unik member
- Frontend: React + Tailwind CSS (dikonversi dari vanilla JS)

Versi awal memakai Python + Flask + SQLite (stdlib `sqlite3`) dengan QR via
`segno`; dikonversi ke stack ini tanpa mengubah fitur dan aturan bisnis.

## Model Data

- `membership_types`: id, nama, durasi_hari, harga
- `members`: id, nama, no_hp, kode_qr (token unik), tanggal_daftar
- `memberships`: id, member_id, membership_type_id, mulai, berakhir, status
  (`aktif`/`dibekukan`/`kedaluwarsa` — dihitung, lihat aturan)
- `freezes`: id, membership_id, mulai, selesai, alasan
- `classes`: id, nama, instruktur, hari, jam_mulai, jam_selesai, kuota
- `class_bookings`: id, class_id, member_id, tanggal, status
  (`dipesan`/`hadir`/`batal`)
- `checkins`: id, member_id, waktu, hasil (`diterima`/`ditolak`), alasan

## Aturan Bisnis

1. Status membership dihitung dari tanggal, bukan disimpan:
   - `dibekukan` jika ada freeze yang mencakup hari ini
   - `kedaluwarsa` jika hari ini > berakhir
   - `aktif` jika mulai ≤ hari ini ≤ berakhir dan tidak dibekukan
2. Check-in QR:
   - Member tanpa membership aktif → DITOLAK ("tidak ada paket aktif")
   - Membership kedaluwarsa → DITOLAK ("masa aktif habis …")
   - Membership dibekukan → DITOLAK ("membership dibekukan sampai …")
   - Selain itu → DITERIMA, tercatat di `checkins`
3. Pembekuan: hanya membership aktif yang bisa dibekukan; `berakhir`
   diperpanjang sejumlah hari freeze saat freeze selesai/dihentikan.
   Total hari freeze per membership dibatasi 30 hari.
4. Kelas grup: booking hanya untuk member aktif; tidak boleh melebihi kuota;
   satu member tidak boleh booking dua kali di kelas+tanggal yang sama.
5. Kode QR = token acak per member (`GYM-<8 hex>`); QR dapat dicetak ulang
   kapan saja dari halaman member.

## Tahap Pengerjaan

- **F0 — Fondasi**: PRD, README, struktur, requirements, .gitignore.
- **F1 — Database + API master**: schema, seed (3 paket, 2 kelas, contoh member),
  CRUD membership_types/members/classes.
- **F2 — Lifecycle membership**: aktivasi/perpanjang paket, status hitung,
  beku/cairkan (freeze) dengan perpanjangan otomatis.
- **F3 — QR + check-in**: generate QR SVG per member, endpoint check-in dengan
  seluruh aturan penolakan, riwayat check-in.
- **F4 — Kelas berkuota + UI**: booking/batal/hadir, validasi kuota, dan UI
  lengkap (Check-in, Member, Kelas, Laporan).

## Kriteria Selesai

- [ ] Member kedaluwarsa/dibeku/tanpa paket DITOLAK saat check-in dengan alasan
- [ ] Booking kelas menolak saat kuota penuh atau member tidak aktif
- [ ] Freeze memperpanjang masa berakhir sesuai jumlah hari
- [ ] QR unik per member dan bisa dipindai (simulasi input kode)
- [ ] `npm install && cp .env.example .env && npx prisma generate && npx prisma db push && npm run seed && npm run dev` langsung jalan

## Non-tujuan

- Payment gateway, aplikasi mobile native, integrasi turnstile fisik.
