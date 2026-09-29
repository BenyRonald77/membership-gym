import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { ApiError } from "@/lib/membership";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const m = await prisma.member.findUnique({
      where: { id: Number(params.id) },
      select: { kodeQr: true },
    });
    if (!m) throw new ApiError(404, "member tidak ditemukan");
    const svg = await QRCode.toString(m.kodeQr, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 6,
    });
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml" },
    });
  } catch (e) {
    return apiError(e);
  }
}
