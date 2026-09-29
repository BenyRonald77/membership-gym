import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { apiError, requireFields } from "@/lib/api";
import { memberToSnake } from "@/lib/mappers";
import { today } from "@/lib/format";

export async function GET() {
  try {
    const rows = await prisma.member.findMany({ orderBy: { nama: "asc" } });
    return NextResponse.json(rows.map(memberToSnake));
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    requireFields(body, ["nama"]);
    const kode = "GYM-" + randomBytes(4).toString("hex");
    const created = await prisma.member.create({
      data: {
        nama: String(body.nama),
        noHp: body.no_hp ? String(body.no_hp) : null,
        kodeQr: kode,
        tanggalDaftar: today(),
      },
    });
    return NextResponse.json(memberToSnake(created), { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
