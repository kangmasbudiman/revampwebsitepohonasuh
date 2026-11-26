import { NextResponse } from "next/server";
import { issueCaptcha } from "@/lib/captcha";

export const dynamic = "force-dynamic";

export async function GET() {
  const code = await issueCaptcha();
  return NextResponse.json({ code }, { headers: { "Cache-Control": "no-store" } });
}
