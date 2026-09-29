import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { currentMembership, membershipStatus } from "@/lib/membership";
import { today } from "@/lib/format";

export async function GET() {
  try {
    const todayStr = today();
    const rows = await prisma.membership.findMany({
      orderBy: { mulai: "desc" },
      include: { member: true, membershipType: true },
    });
    const out = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        member_id: r.memberId,
        membership_type_id: r.membershipTypeId,
        mulai: r.mulai,
        berakhir: r.berakhir,
        tanggal_buat: r.tanggalBuat,
        nama_member: r.member.nama,
        nama_paket: r.membershipType.nama,
        status: await membershipStatus(r.id, r.mulai, r.berakhir, todayStr),
      }))
    );
    return NextResponse.json(out);
  } catch (e) {
    return apiError(e);
  }
}
