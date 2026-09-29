import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { currentMembership } from "@/lib/membership";
import { today } from "@/lib/format";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const memberId = Number(params.id);
    const membership = await currentMembership(memberId, today());
    return NextResponse.json({ member_id: memberId, membership });
  } catch (e) {
    return apiError(e);
  }
}
