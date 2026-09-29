import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { ApiError } from "@/lib/membership";
import { memberToSnake } from "@/lib/mappers";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const row = await prisma.member.findUnique({
      where: { id: Number(params.id) },
    });
    if (!row) throw new ApiError(404, "tidak ditemukan");
    return NextResponse.json(memberToSnake(row));
  } catch (e) {
    return apiError(e);
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (body.nama !== undefined) data.nama = String(body.nama);
    if (body.no_hp !== undefined) data.noHp = String(body.no_hp);
    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "tidak ada field yang diubah");
    }
    const updated = await prisma.member
      .update({ where: { id: Number(params.id) }, data })
      .catch(() => null);
    if (!updated) throw new ApiError(404, "tidak ditemukan");
    return NextResponse.json(memberToSnake(updated));
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await prisma.member
      .delete({ where: { id: Number(params.id) } })
      .catch(() => {
        throw new ApiError(404, "tidak ditemukan");
      });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
