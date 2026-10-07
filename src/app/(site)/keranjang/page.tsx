import { getSession } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import CartView from "@/components/cart-view";

export async function generateMetadata() {
  return { title: (await getDict()).pages.keranjang.title };
}

export default async function CartPage() {
  const session = await getSession();
  const t = (await getDict()).pages.keranjang;
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold text-emerald-950">{t.heading}</h1>
      <p className="mt-1 text-sm text-zinc-500">{t.desc}</p>
      <div className="mt-8">
        <CartView loggedIn={!!session} />
      </div>
    </main>
  );
}
