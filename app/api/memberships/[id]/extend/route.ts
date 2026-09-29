import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { extendMembership } from "@/lib/membership";
import { today } from "@/lib/format";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await extendMembership(
      Number(params.id),
      body.membership_type_id !== undefined
        ? Number(body.membership_type_id)
        : undefined,
      today()
    );
    return NextResponse.json(result);
  } catch (e) {
    return apiError(e);
  }
}
