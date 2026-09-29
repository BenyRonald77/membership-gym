import { prisma } from "./prisma";

/** Status membership dihitung dari tanggal, bukan disimpan di DB. */
export type MembershipStatus = "aktif" | "dibekukan" | "kedaluwarsa" | "belum_mulai";

export const MAX_FREEZE_HARI = 30;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const DAY = 86400000;
const toDays = (s: string) =>
  Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / DAY;
const fromDays = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
export const addDays = (s: string, d: number) =>
  fromDays(Math.round(toDays(s)) + d);
export const isValidDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(toDays(s)) &&
  fromDays(toDays(s)) === s;

export async function membershipStatus(
  membershipId: number,
  mulai: string,
  berakhir: string,
  todayStr: string
): Promise<MembershipStatus> {
  if (todayStr < mulai) return "belum_mulai";
  if (todayStr > berakhir) return "kedaluwarsa";
  const f = await prisma.freeze.findFirst({
    where: {
      membershipId,
      mulai: { lte: todayStr },
      selesai: { gte: todayStr },
    },
  });
  return f ? "dibekukan" : "aktif";
}

export type CurrentMembership = {
  id: number;
  member_id: number;
  membership_type_id: number;
  mulai: string;
  berakhir: string;
  tanggal_buat: string;
  nama_paket: string;
  durasi_hari: number;
  harga: number;
  status: MembershipStatus;
  freeze_selesai?: string;
};

export async function currentMembership(
  memberId: number,
  todayStr: string
): Promise<CurrentMembership | null> {
  const m = await prisma.membership.findFirst({
    where: { memberId, mulai: { lte: todayStr } },
    orderBy: { mulai: "desc" },
    include: { membershipType: true },
  });
  if (!m) return null;
  const status = await membershipStatus(m.id, m.mulai, m.berakhir, todayStr);
  const out: CurrentMembership = {
    id: m.id,
    member_id: m.memberId,
    membership_type_id: m.membershipTypeId,
    mulai: m.mulai,
    berakhir: m.berakhir,
    tanggal_buat: m.tanggalBuat,
    nama_paket: m.membershipType.nama,
    durasi_hari: m.membershipType.durasiHari,
    harga: m.membershipType.harga,
    status,
  };
  if (status === "dibekukan") {
    const f = await prisma.freeze.findFirst({
      where: {
        membershipId: m.id,
        mulai: { lte: todayStr },
        selesai: { gte: todayStr },
      },
      orderBy: { mulai: "desc" },
    });
    if (f) out.freeze_selesai = f.selesai;
  }
  return out;
}

export function freezeUsedDays(
  freezes: { mulai: string; selesai: string }[]
): number {
  let total = 0;
  for (const r of freezes) {
    const hari = Math.round(toDays(r.selesai) - toDays(r.mulai)) + 1;
    total += Math.max(hari, 0);
  }
  return total;
}

export async function activateMembership(
  memberId: number,
  typeId: number,
  mulaiOpt: string | undefined,
  todayStr: string
) {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new ApiError(404, "member tidak ditemukan");
  const tipe = await prisma.membershipType.findUnique({ where: { id: typeId } });
  if (!tipe) throw new ApiError(404, "paket tidak ditemukan");
  const cur = await currentMembership(memberId, todayStr);
  if (cur && ["aktif", "dibekukan", "belum_mulai"].includes(cur.status)) {
    throw new ApiError(
      409,
      "member masih punya paket yang berlaku, gunakan perpanjang"
    );
  }
  const mulai = mulaiOpt || todayStr;
  if (!isValidDate(mulai)) {
    throw new ApiError(400, "format tanggal salah (YYYY-MM-DD)");
  }
  const berakhir = addDays(mulai, tipe.durasiHari);
  const created = await prisma.membership.create({
    data: {
      memberId,
      membershipTypeId: typeId,
      mulai,
      berakhir,
      tanggalBuat: todayStr,
    },
  });
  return {
    id: created.id,
    member_id: created.memberId,
    membership_type_id: created.membershipTypeId,
    mulai: created.mulai,
    berakhir: created.berakhir,
    tanggal_buat: created.tanggalBuat,
    status: await membershipStatus(
      created.id,
      created.mulai,
      created.berakhir,
      todayStr
    ),
  };
}

export async function extendMembership(
  msId: number,
  typeIdOpt: number | undefined,
  todayStr: string
) {
  const m = await prisma.membership.findUnique({ where: { id: msId } });
  if (!m) throw new ApiError(404, "membership tidak ditemukan");
  const tipe = await prisma.membershipType.findUnique({
    where: { id: typeIdOpt ?? m.membershipTypeId },
  });
  if (!tipe) throw new ApiError(404, "paket tidak ditemukan");
  const awal = m.berakhir > todayStr ? m.berakhir : todayStr;
  const berakhir = addDays(awal, tipe.durasiHari);
  const updated = await prisma.membership.update({
    where: { id: msId },
    data: { berakhir, membershipTypeId: tipe.id },
  });
  return {
    id: updated.id,
    member_id: updated.memberId,
    membership_type_id: updated.membershipTypeId,
    mulai: updated.mulai,
    berakhir: updated.berakhir,
    tanggal_buat: updated.tanggalBuat,
    status: await membershipStatus(
      updated.id,
      updated.mulai,
      updated.berakhir,
      todayStr
    ),
  };
}

export async function freezeMembership(
  msId: number,
  mulaiOpt: string | undefined,
  selesai: string | undefined,
  alasan: string | undefined,
  todayStr: string
) {
  const m = await prisma.membership.findUnique({ where: { id: msId } });
  if (!m) throw new ApiError(404, "membership tidak ditemukan");
  const st = await membershipStatus(m.id, m.mulai, m.berakhir, todayStr);
  if (st !== "aktif")
    throw new ApiError(400, "hanya membership aktif yang bisa dibekukan");
  const mulai = mulaiOpt || todayStr;
  if (!selesai || !isValidDate(mulai) || !isValidDate(selesai)) {
    throw new ApiError(
      400,
      "format tanggal salah (YYYY-MM-DD), field wajib: selesai"
    );
  }
  if (selesai < mulai)
    throw new ApiError(400, "tanggal selesai harus >= tanggal mulai");
  if (mulai < todayStr)
    throw new ApiError(400, "pembekuan tidak bisa dimulai di masa lalu");
  const hari = Math.round(toDays(selesai) - toDays(mulai)) + 1;
  const terpakai = await prisma.freeze.findMany({
    where: { membershipId: msId },
    select: { mulai: true, selesai: true },
  });
  if (freezeUsedDays(terpakai) + hari > MAX_FREEZE_HARI) {
    throw new ApiError(
      400,
      `total pembekuan melebihi batas ${MAX_FREEZE_HARI} hari`
    );
  }
  await prisma.freeze.create({
    data: { membershipId: msId, mulai, selesai, alasan: alasan || null },
  });
  const berakhir = addDays(m.berakhir, hari);
  const updated = await prisma.membership.update({
    where: { id: msId },
    data: { berakhir },
  });
  return {
    id: updated.id,
    member_id: updated.memberId,
    membership_type_id: updated.membershipTypeId,
    mulai: updated.mulai,
    berakhir: updated.berakhir,
    tanggal_buat: updated.tanggalBuat,
    status: await membershipStatus(
      updated.id,
      updated.mulai,
      updated.berakhir,
      todayStr
    ),
    hari_dibekukan: hari,
  };
}

export async function unfreezeMembership(msId: number, todayStr: string) {
  const m = await prisma.membership.findUnique({ where: { id: msId } });
  if (!m) throw new ApiError(404, "membership tidak ditemukan");
  const f = await prisma.freeze.findFirst({
    where: {
      membershipId: msId,
      mulai: { lte: todayStr },
      selesai: { gte: todayStr },
    },
    orderBy: { mulai: "desc" },
  });
  if (!f)
    throw new ApiError(400, "tidak ada pembekuan yang sedang berjalan");
  const ditambahkan = Math.round(toDays(f.selesai) - toDays(f.mulai)) + 1;
  const terpakai = Math.round(toDays(todayStr) - toDays(f.mulai));
  // Akhiri freeze sehari sebelum hari ini agar status langsung kembali aktif
  await prisma.freeze.update({
    where: { id: f.id },
    data: { selesai: addDays(todayStr, -1) },
  });
  const berakhir = addDays(addDays(m.berakhir, -ditambahkan), terpakai);
  const updated = await prisma.membership.update({
    where: { id: msId },
    data: { berakhir },
  });
  return {
    id: updated.id,
    member_id: updated.memberId,
    membership_type_id: updated.membershipTypeId,
    mulai: updated.mulai,
    berakhir: updated.berakhir,
    tanggal_buat: updated.tanggalBuat,
    status: await membershipStatus(
      updated.id,
      updated.mulai,
      updated.berakhir,
      todayStr
    ),
  };
}
