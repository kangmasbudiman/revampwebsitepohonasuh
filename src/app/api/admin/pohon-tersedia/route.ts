import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { apiGet } from "@/lib/api";

// Proxy endpoint pohon tersedia (butuh X-Admin-Key yang hanya ada di server).
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || (session.level ?? 1) !== 1) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const programId = req.nextUrl.searchParams.get("program_id") ?? "";
  const desa = req.nextUrl.searchParams.get("desa") ?? "";
  const pesananId = req.nextUrl.searchParams.get("pesanan_id") ?? "";
  try {
    const key = process.env.ADMIN_API_KEY ?? "";
    const qs = `pohontersediaadmin?program_id=${encodeURIComponent(programId)}&desa=${encodeURIComponent(desa)}&pesanan_id=${encodeURIComponent(pesananId)}`;
    const data = await apiGet<{ data?: unknown[]; provinsi?: string[] }>(qs, { "X-Admin-Key": key });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ data: [], provinsi: [] }, { status: 200 });
  }
}
