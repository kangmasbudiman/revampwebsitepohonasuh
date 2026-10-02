import { getSession } from "@/lib/auth";
import CartView from "@/components/cart-view";

export const metadata = { title: "Keranjang | Pohon Asuh" };

export default async function CartPage() {
  const session = await getSession();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold text-emerald-950">Keranjang Adopsi</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Periksa pohon pilihanmu sebelum melanjutkan pembayaran.
      </p>
      <div className="mt-8">
        <CartView loggedIn={!!session} />
      </div>
    </main>
  );
}
