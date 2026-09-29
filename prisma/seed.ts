import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const n = await prisma.membershipType.count();
  if (n > 0) {
    console.log("seed dilewati (sudah ada data)");
    return;
  }

  await prisma.membershipType.createMany({
    data: [
      { nama: "Reguler 1 Bulan", durasiHari: 30, harga: 150000 },
      { nama: "Premium 3 Bulan", durasiHari: 90, harga: 400000 },
      { nama: "Tahunan", durasiHari: 365, harga: 1500000 },
    ],
  });

  await prisma.gymClass.createMany({
    data: [
      { nama: "Yoga", instruktur: "Sinta", hari: "Senin", jamMulai: "07:00", jamSelesai: "08:00", kuota: 20 },
      { nama: "Yoga", instruktur: "Sinta", hari: "Kamis", jamMulai: "07:00", jamSelesai: "08:00", kuota: 20 },
      { nama: "Zumba", instruktur: "Riko", hari: "Rabu", jamMulai: "17:00", jamSelesai: "18:00", kuota: 25 },
      { nama: "Zumba", instruktur: "Riko", hari: "Sabtu", jamMulai: "17:00", jamSelesai: "18:00", kuota: 25 },
    ],
  });

  await prisma.member.createMany({
    data: [
      { nama: "Andi Pratama", noHp: "081234567890", kodeQr: "GYM-a1b2c3d4", tanggalDaftar: "2026-09-01" },
      { nama: "Budi Santoso", noHp: "081234567891", kodeQr: "GYM-e5f6a7b8", tanggalDaftar: "2026-09-05" },
      { nama: "Citra Lestari", noHp: "081234567892", kodeQr: "GYM-c9d0e1f2", tanggalDaftar: "2026-09-10" },
    ],
  });

  console.log("seed selesai");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
