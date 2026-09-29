import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireFields } from "@/lib/api";
import { classToSnake } from "@/lib/mappers";

export async function GET() {
  try {
    const rows = await prisma.gymClass.findMany({
      orderBy: [{ hari: "asc" }, { jamMulai: "asc" }],
    });
    return NextResponse.json(rows.map(classToSnake));
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    requireFields(body, ["nama", "hari", "jam_mulai", "jam_selesai", "kuota"]);
    const created = await prisma.gymClass.create({
      data: {
        nama: String(body.nama),
        instruktur: body.instruktur ? String(body.instruktur) : null,
        hari: String(body.hari),
        jamMulai: String(body.jam_mulai),
        jamSelesai: String(body.jam_selesai),
        kuota: Number(body.kuota),
      },
    });
    return NextResponse.json(classToSnake(created), { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
