import type { NextRequest } from "next/server";

const BASE = process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "").trim();
  const sumber_info = String(body?.sumber_info ?? "").trim();
  if (!token || !sumber_info) {
    return Response.json({ value: "403", pesan: "token dan sumber_info wajib diisi" }, { status: 400 });
  }
  try {
    const res = await fetch(`${BASE}/simpansumberinfo`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token, sumber_info }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({ value: "0" }));
    return Response.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    return Response.json({ value: "500", pesan: "Gagal menghubungi server" }, { status: 502 });
  }
}
