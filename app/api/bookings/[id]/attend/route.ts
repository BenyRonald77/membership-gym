import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { ApiError } from "@/lib/membership";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updated = await prisma.classBooking
      .update({ where: { id: Number(params.id) }, data: { status: "hadir" } })
      .catch(() => null);
    if (!updated) throw new ApiError(404, "booking tidak ditemukan");
    return NextResponse.json({
      id: updated.id,
      class_id: updated.classId,
      member_id: updated.memberId,
      tanggal: updated.tanggal,
      status: updated.status,
    });
  } catch (e) {
    return apiError(e);
  }
}
