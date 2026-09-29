import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { ApiError, currentMembership, isValidDate } from "@/lib/membership";
import { today } from "@/lib/format";

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const namaHari = (tgl: string) => {
  const utc = new Date(tgl + "T00:00:00Z").getUTCDay(); // 0=Minggu
  return HARI[(utc + 6) % 7];
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const memberId = body.member_id as number | undefined;
    const tanggal = body.tanggal ? String(body.tanggal) : today();
    if (!memberId) throw new ApiError(400, "field wajib: member_id");
    if (!isValidDate(tanggal)) {
      throw new ApiError(400, "format tanggal salah (YYYY-MM-DD)");
    }
    if (tanggal < today()) {
      throw new ApiError(400, "tidak bisa booking untuk tanggal lampau");
    }

    const classId = Number(params.id);
    const c = await prisma.gymClass.findUnique({ where: { id: classId } });
    if (!c) throw new ApiError(404, "kelas tidak ditemukan");
    if (namaHari(tanggal) !== c.hari) {
      throw new ApiError(400, `kelas ini hanya di hari ${c.hari}`);
    }
    const m = await prisma.member.findUnique({ where: { id: memberId } });
    if (!m) throw new ApiError(404, "member tidak ditemukan");
    const ms = await currentMembership(memberId, today());
    if (!ms || ms.status !== "aktif") {
      const st = ms ? ms.status : "tanpa paket";
      throw new ApiError(400, `member tidak aktif (status: ${st})`);
    }
    const dupe = await prisma.classBooking.findFirst({
      where: { classId, memberId, tanggal, status: { not: "batal" } },
    });
    if (dupe) throw new ApiError(409, "member sudah booking di kelas ini");
    const terisi = await prisma.classBooking.count({
      where: { classId, tanggal, status: { not: "batal" } },
    });
    if (terisi >= c.kuota) throw new ApiError(409, "kuota kelas penuh");

    const created = await prisma.classBooking.create({
      data: { classId, memberId, tanggal, status: "dipesan" },
    });
    return NextResponse.json(
      {
        id: created.id,
        class_id: created.classId,
        member_id: created.memberId,
        tanggal: created.tanggal,
        status: created.status,
      },
      { status: 201 }
    );
  } catch (e) {
    return apiError(e);
  }
}
