import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { today } from "@/lib/format";

export async function GET(req: NextRequest) {
  try {
    const tanggal = req.nextUrl.searchParams.get("date") || today();
    const rows = await prisma.checkin.findMany({
      where: { waktu: { startsWith: tanggal } },
      orderBy: { waktu: "desc" },
      include: { member: { select: { nama: true } } },
    });
    return NextResponse.json(
      rows.map((c) => ({
        id: c.id,
        member_id: c.memberId,
        waktu: c.waktu,
        hasil: c.hasil,
        alasan: c.alasan,
        nama_member: c.member?.nama ?? null,
      }))
    );
  } catch (e) {
    return apiError(e);
  }
}
