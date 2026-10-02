import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import CheckoutView from "@/components/checkout-view";

export const metadata = { title: "Checkout | Pohon Asuh" };

export default async function CheckoutPage() {
  const session = await getSession();
  if (!session) redirect("/masuk?next=/checkout");

  let nomorWa: string[] = [];
  try {
    nomorWa = (await apiGet<{ nomer_admin?: string }[]>("getnoadmin"))
      .map((r) => String(r.nomer_admin ?? "").trim())
      .filter(Boolean);
  } catch {
    nomorWa = [];
  }
  const waLink = (nomer: string) => {
    const digits = nomer.replace(/[^0-9]/g, "").replace(/^0/, "62");
    return `https://wa.me/${digits}`;
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold text-emerald-950">Checkout</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Selesaikan pesanan adopsi pohonmu.
      </p>
      <div className="mt-8">
        <CheckoutView />
      </div>
      {nomorWa.length > 0 && (
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 text-sm text-emerald-900">
          <p className="font-semibold">Butuh bantuan?</p>
          <p className="mt-1 text-emerald-800">
            Hubungi admin kami via WhatsApp:{" "}
            {nomorWa.map((n, i) => (
              <span key={n}>
                {i > 0 && " · "}
                <a
                  href={waLink(n)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
                >
                  {n}
                </a>
              </span>
            ))}
          </p>
        </div>
      )}
    </main>
  );
}
