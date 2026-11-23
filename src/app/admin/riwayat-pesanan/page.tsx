import AdminPesananMitraPage from "../pesanan-mitra/page";

export const metadata = { title: "Riwayat Pesanan Pohon Mitra | Pohon Asuh" };

// Halaman Riwayat Pesanan — daftar semua pesanan pohon mitra.
// Memakai tampilan Pesanan Pohon dengan status dipaksa "semua", TANPA redirect
// supaya URL/menu aktif tetap "/admin/riwayat-pesanan".
export default async function AdminRiwayatPesananPage(props: PageProps<"/admin/riwayat-pesanan">) {
  const sp = await props.searchParams;
  const forced = {
    ...props,
    searchParams: Promise.resolve({ ...sp, status: "semua" }),
  } as unknown as PageProps<"/admin/pesanan-mitra">;
  return <AdminPesananMitraPage {...forced} />;
}
