import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { freezeMembership } from "@/lib/membership";
import { today } from "@/lib/format";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await freezeMembership(
      Number(params.id),
      body.mulai ? String(body.mulai) : undefined,
      body.selesai ? String(body.selesai) : undefined,
      body.alasan ? String(body.alasan) : undefined,
      today()
    );
    return NextResponse.json(result);
  } catch (e) {
    return apiError(e);
  }
}
