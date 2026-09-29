INSERT INTO membership_types (nama, durasi_hari, harga) VALUES
  ('Reguler 1 Bulan', 30, 150000),
  ('Premium 3 Bulan', 90, 400000),
  ('Tahunan', 365, 1500000);

INSERT INTO classes (nama, instruktur, hari, jam_mulai, jam_selesai, kuota) VALUES
  ('Yoga', 'Sinta', 'Senin', '07:00', '08:00', 20),
  ('Yoga', 'Sinta', 'Kamis', '07:00', '08:00', 20),
  ('Zumba', 'Riko', 'Rabu', '17:00', '18:00', 25),
  ('Zumba', 'Riko', 'Sabtu', '17:00', '18:00', 25);

INSERT INTO members (nama, no_hp, kode_qr, tanggal_daftar) VALUES
  ('Andi Pratama', '081234567890', 'GYM-a1b2c3d4', '2026-09-01'),
  ('Budi Santoso', '081234567891', 'GYM-e5f6a7b8', '2026-09-05'),
  ('Citra Lestari', '081234567892', 'GYM-c9d0e1f2', '2026-09-10');
