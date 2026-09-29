import { NextRequest, NextResponse } from "next/server";
import { apiError, requireFields } from "@/lib/api";
import { activateMembership } from "@/lib/membership";
import { today } from "@/lib/format";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    requireFields(body, ["member_id", "membership_type_id"]);
    const mulaiRaw = body.mulai ?? body.tanggal_mulai;
    const result = await activateMembership(
      Number(body.member_id),
      Number(body.membership_type_id),
      mulaiRaw ? String(mulaiRaw) : undefined,
      today()
    );
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
