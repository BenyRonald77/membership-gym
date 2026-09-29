import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { ApiError } from "@/lib/membership";
import type { MembershipType } from "@prisma/client";

const toSnake = (t: MembershipType) => ({
  id: t.id,
  nama: t.nama,
  durasi_hari: t.durasiHari,
  harga: t.harga,
});

type Ctx = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (body.nama !== undefined) data.nama = String(body.nama);
    if (body.durasi_hari !== undefined) data.durasiHari = Number(body.durasi_hari);
    if (body.harga !== undefined) data.harga = Number(body.harga);
    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "tidak ada field yang diubah");
    }
    const updated = await prisma.membershipType
      .update({ where: { id: Number(params.id) }, data })
      .catch(() => null);
    if (!updated) throw new ApiError(404, "tidak ditemukan");
    return NextResponse.json(toSnake(updated));
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await prisma.membershipType
      .delete({ where: { id: Number(params.id) } })
      .catch(() => {
        throw new ApiError(404, "tidak ditemukan");
      });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
