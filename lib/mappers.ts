import type { GymClass, Member, MembershipType } from "@prisma/client";

export const memberToSnake = (m: Member) => ({
  id: m.id,
  nama: m.nama,
  no_hp: m.noHp,
  kode_qr: m.kodeQr,
  tanggal_daftar: m.tanggalDaftar,
});

export const membershipTypeToSnake = (t: MembershipType) => ({
  id: t.id,
  nama: t.nama,
  durasi_hari: t.durasiHari,
  harga: t.harga,
});

export const classToSnake = (c: GymClass) => ({
  id: c.id,
  nama: c.nama,
  instruktur: c.instruktur,
  hari: c.hari,
  jam_mulai: c.jamMulai,
  jam_selesai: c.jamSelesai,
  kuota: c.kuota,
});
