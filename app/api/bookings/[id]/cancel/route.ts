import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { ApiError } from "@/lib/membership";

async function setStatus(id: number, status: string) {
  const updated = await prisma.classBooking
    .update({ where: { id }, data: { status } })
    .catch(() => null);
  if (!updated) throw new ApiError(404, "booking tidak ditemukan");
  return NextResponse.json({
    id: updated.id,
    class_id: updated.classId,
    member_id: updated.memberId,
    tanggal: updated.tanggal,
    status: updated.status,
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return await setStatus(Number(params.id), "batal");
  } catch (e) {
    return apiError(e);
  }
}
