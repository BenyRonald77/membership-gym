import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireFields } from "@/lib/api";
import type { MembershipType } from "@prisma/client";

const toSnake = (t: MembershipType) => ({
  id: t.id,
  nama: t.nama,
  durasi_hari: t.durasiHari,
  harga: t.harga,
});

export async function GET() {
  try {
    const rows = await prisma.membershipType.findMany({
      orderBy: { id: "asc" },
    });
    return NextResponse.json(rows.map(toSnake));
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    requireFields(body, ["nama", "durasi_hari", "harga"]);
    const created = await prisma.membershipType.create({
      data: {
        nama: String(body.nama),
        durasiHari: Number(body.durasi_hari),
        harga: Number(body.harga),
      },
    });
    return NextResponse.json(toSnake(created), { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
