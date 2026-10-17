import { notFound } from "next/navigation";
import {
  apiGet,
  mapDesa,
  mapTemplateShareList,
  type ApiSertifikatPublik,
  type ApiTemplateShare,
} from "@/lib/api";
import { labelLokasi, namaDesa } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import { getSession } from "@/lib/auth";
import ShareDesign from "@/components/bagikan/share-design";
import ShareClient from "@/components/bagikan/share-client";

export async function generateMetadata() {
  return { title: (await getDict()).bagikan.title };
}

// Halaman design share 1080×1920 — konsep seperti sertifikat publik
// (guest bisa lihat), beda layout. Pilihan template + pohon hanya di URL
// (?tpl=, ?pohon=) — tidak persist.
export default async function BagikanPage(props: PageProps<"/bagikan/[...code]">) {
  const { code } = await props.params;
  const sp = await props.searchParams;
  const certnum = code.map(decodeURIComponent).join("/");
  const t = (await getDict()).bagikan;

  let s: ApiSertifikatPublik | null = null;
  try {
    s = await apiGet<ApiSertifikatPublik | null>(`sertifikatpublik/${certnum}`);
  } catch {
    // notFound di bawah yang menangani
  }
  if (!s || !s.certnum) notFound();

  // Template share desa ini (aktif saja) — resolusi: ?tpl= → utama → null
  // (fallback gradient bawaan).
  let templates: ApiTemplateShare[] = [];
  try {
    templates = mapTemplateShareList(
      await apiGet<Record<string, unknown>[]>("templatesharelist"),
    ).filter((tpl) => tpl.aktif && tpl.desa === s!.desa);
  } catch {
    templates = [];
  }
  const tplParam = Number(Array.isArray(sp?.tpl) ? sp?.tpl[0] : sp?.tpl);
  const terpilih =
    templates.find((tpl) => tpl.id === tplParam) ?? templates.find((tpl) => tpl.utama) ?? null;

  // Pohon yang ditampilkan: default pertama; guard list kosong → pseudo.
  const daftar = (s.pohon_list ?? []).map((p) => ({
    idpohon: String(p.idpohon ?? ""),
    localname: String(p.localname ?? ""),
  }));
  const pohonParam = Array.isArray(sp?.pohon) ? sp?.pohon[0] : (sp?.pohon ?? null);
  const terpilihPohon =
    daftar.find((p) => p.idpohon === pohonParam) ?? daftar[0] ?? {
      idpohon: s.idpohon ?? "",
      localname: "",
    };
  const detailPohon = (s.pohon_list ?? []).find(
    (p) => String(p.idpohon ?? "") === terpilihPohon.idpohon,
  );

  // Label tampilan desa (kolom label admin, fallback Title Case).
  let desaLabel = namaDesa(s.desa ?? "");
  try {
    const rows = await apiGet<Record<string, unknown>[]>("getdesa");
    const d = rows.map(mapDesa).find((x) => x.name === s!.desa);
    if (d) desaLabel = labelLokasi(d);
  } catch {
    // label opsional — pakai fallback
  }

  const memo = (s.memo ?? "").trim();
  // Durasi adopsi (kartu "tahun" template) — selisih tahun adopt→exp.
  const thnA = Number(/^(\d{4})/.exec((s.tgl_adopt ?? "").trim())?.[1] ?? 0);
  const thnE = Number(/^(\d{4})/.exec((s.tgl_exp ?? "").trim())?.[1] ?? 0);
  const durasiTahun = thnA > 0 && thnE > thnA ? thnE - thnA : 1;
  const design = {
    nama: s.nama ?? "",
    donorName: (s.nama_pengasuh ?? "").trim() || null,
    idpohon: terpilihPohon.idpohon,
    localName: terpilihPohon.localname || (detailPohon?.localname ?? ""),
    species: detailPohon?.species ? String(detailPohon.species) : null,
    desaLabel,
    lokasiSub: terpilih?.subtext || null,
    tglAdopt: s.tgl_adopt ?? null,
    memo: s.memo ?? "",
    certnum: s.certnum,
    jmlPohon: Number(s.jml_pohon) || 1,
    durasiTahun,
    templateImage: terpilih?.imageUrl || null,
  };

  const session = await getSession();
  const pemilik = !!session && Number(s.pengasuh) === session.userId;
  const certPath = certnum.split("/").map(encodeURIComponent).join("/");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-center text-2xl font-bold text-emerald-950">{t.title}</h1>
      <p className="mt-1 text-center text-sm text-zinc-500">{t.sub}</p>

      <div className="mx-auto mt-6 w-full max-w-sm" data-testid="share-design">
        <ShareDesign data={design} />
      </div>

      {pemilik ? (
        <ShareClient
          certPath={certPath}
          templates={templates}
          terpilihId={terpilih?.id ?? null}
          pohonList={daftar}
          pohonParam={pohonParam}
          memo={memo}
          design={design}
        />
      ) : (
        <p className="mt-6 text-center text-sm text-zinc-500">{t.guestHint}</p>
      )}
    </main>
  );
}
