# DESIGN.md — Membership Gym

## Keputusan desain

- **Status membership dihitung, bukan disimpan.** `aktif`/`dibekukan`/
  `kedaluwarsa`/`belum_mulai` diturunkan dari `mulai`, `berakhir`, dan tabel
  `freezes` setiap kali dibaca. Tidak ada cron/penjadwal kedaluwarsa.
- **Freeze memperpanjang `berakhir` saat dibuat.** Jumlah hari = inklusif
  (mulai–selesai). `unfreeze` mengembalikan hari yang belum terpakai dan
  menutup record freeze sehari sebelum hari ini agar status langsung `aktif`.
  Total freeze per membership dibatasi 30 hari.
- **QR = token acak** `GYM-<8 hex>` per member, di-render sebagai SVG via
  `segno` (murni Python). Check-in menerima kode sebagai teks — pemindai
  barcode fisik berfungsi sebagai keyboard.
- **Booking kelas** memvalidasi: member aktif, hari tanggal cocok dengan
  jadwal kelas, tidak duplikat, kuota belum penuh, tanggal tidak lampau.
- **Frontend** vanilla JS multipage (Check-in, Member, Kelas, Laporan),
  tanpa build step. Aksi destruktif memakai `confirm`/`prompt` bawaan browser.

## Batasan yang disadari

- Satu member diasumsikan punya satu membership berjalan; riwayat lama tetap
  tersimpan di tabel `memberships`.
- Check-in tidak terikat sesi/gate fisik — hanya pencatatan + validasi.
- Tidak ada autentikasi; cocok untuk intranet/lokal resepsionis.
