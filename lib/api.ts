import { NextResponse } from "next/server";
import { ApiError } from "@/lib/membership";

export function apiError(e: unknown) {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  const msg = e instanceof Error ? e.message : "kesalahan server";
  return NextResponse.json({ error: msg }, { status: 400 });
}

export function requireFields(
  body: Record<string, unknown>,
  fields: string[]
): void {
  const missing = fields.filter(
    (f) => body[f] === undefined || body[f] === null || body[f] === ""
  );
  if (missing.length) {
    throw new ApiError(400, `field wajib: ${missing.join(", ")}`);
  }
}
