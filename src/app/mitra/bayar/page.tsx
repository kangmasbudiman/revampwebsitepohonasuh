import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function MitraBayarIndex() {
  const session = await getSession();
  if (!session) redirect("/masuk?next=/mitra/bayar");
  redirect("/mitra/tagihan");
}
