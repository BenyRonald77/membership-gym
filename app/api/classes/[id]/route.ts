import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { ApiError } from "@/lib/membership";
import { classToSnake } from "@/lib/mappers";
import { today } from "@/lib/format";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const tanggal = req.nextUrl.searchParams.get("tanggal") || today();
    const c = await prisma.gymClass.findUnique({
      where: { id: Number(params.id) },
    });
    if (!c) throw new ApiError(404, "kelas tidak ditemukan");
    const terisi = await prisma.classBooking.count({
      where: { classId: c.id, tanggal, status: { not: "batal" } },
    });
    const bookings = await prisma.classBooking.findMany({
      where: { classId: c.id, tanggal },
      orderBy: { id: "asc" },
      include: { member: { select: { nama: true } } },
    });
    return NextResponse.json({
      ...classToSnake(c),
      kuota: c.kuota,
      terisi,
      sisa: c.kuota - terisi,
      tanggal,
      bookings: bookings.map((b) => ({
        id: b.id,
        class_id: b.classId,
        member_id: b.memberId,
        tanggal: b.tanggal,
        status: b.status,
        nama_member: b.member.nama,
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (body.nama !== undefined) data.nama = String(body.nama);
    if (body.instruktur !== undefined) data.instruktur = String(body.instruktur);
    if (body.hari !== undefined) data.hari = String(body.hari);
    if (body.jam_mulai !== undefined) data.jamMulai = String(body.jam_mulai);
    if (body.jam_selesai !== undefined) data.jamSelesai = String(body.jam_selesai);
    if (body.kuota !== undefined) data.kuota = Number(body.kuota);
    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "tidak ada field yang diubah");
    }
    const updated = await prisma.gymClass
      .update({ where: { id: Number(params.id) }, data })
      .catch(() => null);
    if (!updated) throw new ApiError(404, "tidak ditemukan");
    return NextResponse.json(classToSnake(updated));
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await prisma.gymClass
      .delete({ where: { id: Number(params.id) } })
      .catch(() => {
        throw new ApiError(404, "tidak ditemukan");
      });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
