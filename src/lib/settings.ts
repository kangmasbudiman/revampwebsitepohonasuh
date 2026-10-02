import { db } from "@/lib/prisma";
import { cache } from "react";

export const getSettings = cache(async (): Promise<Record<string, string>> => {
  const rows = await db.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
});
