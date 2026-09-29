CREATE TABLE IF NOT EXISTS membership_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL UNIQUE,
  durasi_hari INTEGER NOT NULL CHECK (durasi_hari > 0),
  harga INTEGER NOT NULL CHECK (harga > 0)
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  no_hp TEXT,
  kode_qr TEXT NOT NULL UNIQUE,
  tanggal_daftar TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id),
  membership_type_id INTEGER NOT NULL REFERENCES membership_types(id),
  mulai TEXT NOT NULL,
  berakhir TEXT NOT NULL,
  tanggal_buat TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS freezes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  membership_id INTEGER NOT NULL REFERENCES memberships(id),
  mulai TEXT NOT NULL,
  selesai TEXT NOT NULL,
  alasan TEXT
);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  instruktur TEXT,
  hari TEXT NOT NULL,
  jam_mulai TEXT NOT NULL,
  jam_selesai TEXT NOT NULL,
  kuota INTEGER NOT NULL CHECK (kuota > 0)
);

CREATE TABLE IF NOT EXISTS class_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id),
  member_id INTEGER NOT NULL REFERENCES members(id),
  tanggal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'dipesan'
    CHECK (status IN ('dipesan','hadir','batal')),
  UNIQUE (class_id, member_id, tanggal)
);

CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER REFERENCES members(id),
  waktu TEXT NOT NULL,
  hasil TEXT NOT NULL CHECK (hasil IN ('diterima','ditolak')),
  alasan TEXT
);

CREATE INDEX IF NOT EXISTS idx_memberships_member ON memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_checkins_waktu ON checkins(waktu);
CREATE INDEX IF NOT EXISTS idx_bookings_tanggal ON class_bookings(class_id, tanggal);
