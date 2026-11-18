import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ value: "403", pesan: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const programId = Number(url.searchParams.get("program_id") ?? "0");
  const mitraId = url.searchParams.get("mitra_id");
  try {
    const base = process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api";
    let qs = `program_id=${encodeURIComponent(String(programId))}&idmember=${encodeURIComponent(String(session.userId))}`;
    if (session.role === "ADMIN" && mitraId) qs += `&mitra_id=${encodeURIComponent(mitraId)}`;
    const res = await fetch(`${base}/pohonbyprogram?${qs}`, { cache: "no-store" });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ value: "500", pesan: "Gagal" }, { status: 502 });
  }
}
