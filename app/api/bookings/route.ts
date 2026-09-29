import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { today } from "@/lib/format";

export async function GET(req: NextRequest) {
  try {
    const tanggal = req.nextUrl.searchParams.get("tanggal") || today();
    const rows = await prisma.classBooking.findMany({
      where: { tanggal },
      orderBy: [{ id: "asc" }],
      include: {
        member: { select: { nama: true } },
        gymClass: { select: { nama: true, jamMulai: true } },
      },
    });
    rows.sort((a, b) => a.gymClass.jamMulai.localeCompare(b.gymClass.jamMulai));
    return NextResponse.json(
      rows.map((b) => ({
        id: b.id,
        class_id: b.classId,
        member_id: b.memberId,
        tanggal: b.tanggal,
        status: b.status,
        nama_member: b.member.nama,
        nama_kelas: b.gymClass.nama,
      }))
    );
  } catch (e) {
    return apiError(e);
  }
}
