import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { currentMembership } from "@/lib/membership";
import { nowStamp, today } from "@/lib/format";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const kode = String(body.kode_qr || "").trim();
    const waktu = nowStamp();
    const todayStr = today();

    const tolak = async (memberId: number | null, alasan: string) => {
      await prisma.checkin.create({
        data: { memberId, waktu, hasil: "ditolak", alasan },
      });
      return NextResponse.json({ hasil: "ditolak", alasan });
    }

    if (!kode) {
      return NextResponse.json(
        { hasil: "ditolak", alasan: "kode QR kosong" },
        { status: 400 }
      );
    }

    const m = await prisma.member.findUnique({ where: { kodeQr: kode } });
    if (!m) return tolak(null, "kode QR tidak dikenal");

    const ms = await currentMembership(m.id, todayStr);
    if (!ms) return tolak(m.id, "tidak memiliki paket membership aktif");
    if (ms.status === "kedaluwarsa") {
      return tolak(
        m.id,
        `masa aktif habis pada ${ms.berakhir}, silakan perpanjang`
      );
    }
    if (ms.status === "dibekukan") {
      return tolak(m.id, `membership dibekukan sampai ${ms.freeze_selesai}`);
    }
    if (ms.status === "belum_mulai") {
      return tolak(m.id, `paket berlaku mulai ${ms.mulai}`);
    }

    await prisma.checkin.create({
      data: { memberId: m.id, waktu, hasil: "diterima", alasan: null },
    });
    return NextResponse.json({
      hasil: "diterima",
      member: { id: m.id, nama: m.nama },
      paket: ms.nama_paket,
      berlaku_sampai: ms.berakhir,
    });
  } catch (e) {
    return apiError(e);
  }
}
