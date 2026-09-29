# Membership Gym

Sistem membership gym: paket aktif & kedaluwarsa, check-in QR (menolak member
dengan masa aktif habis), kelas grup berkuota (yoga, zumba), dan pembekuan
membership sementara.

Dikonversi dari Python/Flask ke TypeScript — Next.js 14 + Prisma + SQLite.

## Cara Menjalankan

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

Buka http://localhost:3000. Database SQLite dibuat otomatis dan di-seed saat
pertama dijalankan.

## Struktur

```
├── PRD.md
├── DESIGN.md
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── lib/
│   ├── prisma.ts       # klien Prisma
│   ├── format.ts       # rupiah, tanggal, jam
│   ├── api.ts          # helper error API
│   └── membership.ts   # status hitung, aktivasi, freeze
├── app/
│   ├── page.tsx        # Check-in (dashboard)
│   ├── member/page.tsx # Member + QR + kelola paket
│   ├── kelas/page.tsx  # Kelas grup + booking
│   ├── laporan/page.tsx
│   └── api/            # API routes (REST JSON)
```

## Halaman

- **Check-in** (`/`): pindai/ketik kode QR → DITERIMA atau DITOLAK beserta
  alasannya; riwayat check-in hari ini.
- **Member** (`/member`): tambah member, lihat QR SVG per member, aktifkan /
  perpanjang paket, bekukan / cairkan membership.
- **Kelas** (`/kelas`): daftar kelas per tanggal dengan info kuota, booking,
  tandai hadir, batalkan booking.
- **Laporan** (`/laporan`): statistik check-in, jumlah membership aktif,
  daftar membership yang segera/sudah kedaluwarsa (≤ 7 hari).

## API

- `GET/POST /api/membership-types`, `PUT/DELETE /api/membership-types/[id]`
- `GET/POST /api/members`, `GET/PUT/DELETE /api/members/[id]`
- `GET /api/members/[id]/membership` — membership berjalan + status hitung
- `GET /api/members/[id]/qr` — QR SVG member
- `GET/POST /api/classes`, `GET/PUT/DELETE /api/classes/[id]`
- `POST /api/classes/[id]/book` — booking (validasi hari, kuota, status member)
- `GET /api/bookings?tanggal=`, `POST /api/bookings/[id]/cancel|attend`
- `GET /api/memberships`, `POST /api/memberships/activate`
- `POST /api/memberships/[id]/extend|freeze|unfreeze`
- `POST /api/checkin` — `{kode_qr}` → diterima/ditolak
- `GET /api/checkins?date=`
