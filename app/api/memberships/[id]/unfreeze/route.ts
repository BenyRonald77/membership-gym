import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { unfreezeMembership } from "@/lib/membership";
import { today } from "@/lib/format";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await unfreezeMembership(Number(params.id), today());
    return NextResponse.json(result);
  } catch (e) {
    return apiError(e);
  }
}
