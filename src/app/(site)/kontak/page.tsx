import { apiGet } from "@/lib/api";
import { getDict } from "@/lib/i18n";

export async function generateMetadata() {
  return { title: (await getDict()).pages.kontak.title };
}

type Kontak = { nama?: string; telepon?: string; whatsapp?: string; email?: string };

export default async function ContactPage() {
  let k: Kontak = {};
  try {
    k = await apiGet<Kontak>("getkontak");
  } catch {
    // tampilkan kartu kosong di bawah
  }
  const t = (await getDict()).pages.kontak;

  const items = [
    { label: t.email, value: k.email, href: k.email ? `mailto:${k.email}` : undefined },
    {
      label: t.whatsapp,
      value: k.whatsapp,
      href: k.whatsapp ? `https://wa.me/${k.whatsapp.replace(/[^0-9]/g, "")}` : undefined,
    },
    {
      label: t.phone,
      value: k.telepon,
      href: k.telepon ? `tel:${k.telepon.replace(/[^0-9+]/g, "")}` : undefined,
    },
  ].filter((i) => i.value);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">{t.heading}</h1>
      <p className="mt-2 max-w-2xl text-zinc-600">
        {t.intro.replaceAll("{name}", k.nama || "Pohon Asuh")}
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-emerald-100 bg-white p-6 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{item.label}</p>
            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block break-words text-sm font-medium text-emerald-900 hover:text-emerald-700"
              >
                {item.value}
              </a>
            ) : (
              <p className="mt-2 text-sm leading-6 text-zinc-700">{item.value}</p>
            )}
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="mt-10 text-center text-zinc-500">{t.empty}</p>
      )}
    </main>
  );
}
