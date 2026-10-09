// Klien REST untuk backend Laravel pohonasuh2 (shared dengan mobile app).
// Semua endpoint menerima/mengembalikan JSON polos; POST mayoritas
// form-urlencoded. Data dinamis — jangan di-cache Next.

const BASE = process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api";
const ASSET_ORIGIN = BASE.replace(/\/api\/?$/, "");

export class ApiError extends Error {}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, cache: "no-store" });
  } catch {
    throw new ApiError("Tidak dapat menghubungi server. Periksa koneksi Anda.");
  }
  if (!res.ok) {
    throw new ApiError(`Server menolak permintaan (${res.status}).`);
  }
  return (await res.json()) as T;
}

export async function apiGet<T>(
  path: string,
  headers?: Record<string, string>,
): Promise<T> {
  return fetchJson<T>(`${BASE}/${path}`, { headers });
}

export async function apiPost<T>(
  path: string,
  data: Record<string, string | number | null | undefined>,
  headers?: Record<string, string>,
): Promise<T> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) {
    if (v !== null && v !== undefined) body.set(k, String(v));
  }
  return fetchJson<T>(`${BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
    body,
  });
}

// Unduh respons biner dari API (mis. file backup .sql.gz).
export async function apiFetchBinary(
  path: string,
  headers?: Record<string, string>,
): Promise<ArrayBuffer> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/${path}`, { headers, cache: "no-store" });
  } catch {
    throw new ApiError("Tidak dapat menghubungi server. Periksa koneksi Anda.");
  }
  if (!res.ok) throw new ApiError(`Gagal mengunduh file (${res.status}).`);
  return res.arrayBuffer();
}

export async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  return fetchJson<T>(`${BASE}/${path}`, { method: "POST", body: formData });
}

// Health check endpoint (dashboard pemantauan): ukur latency sampai header
// respons diterima. Tidak melempar — hasil ok/status dikembalikan.
export async function pingEndpoint(
  path: string,
  timeoutMs = 5000,
): Promise<{ ok: boolean; ms: number; status: number | null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const start = performance.now();
  try {
    const res = await fetch(`${BASE}/${path}`, { cache: "no-store", signal: ctrl.signal });
    return { ok: res.ok, ms: Math.round(performance.now() - start), status: res.status };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - start), status: null };
  } finally {
    clearTimeout(timer);
  }
}

// Foto pohon di DB berupa URL penuh (pohonasuh.org); beberapa endpoint
// (bukti transfer) mengembalikan URL dari host API. Nilai relatif
// diprefix dengan origin API.
export function assetUrl(file?: string | null): string | null {
  if (!file) return null;
  const f = String(file).trim();
  if (f === "" || f === "-" || f === "null") return null;
  if (f.startsWith("http://") || f.startsWith("https://")) return f;
  return `${ASSET_ORIGIN}/${f.replace(/^\//, "")}`;
}

// Foto utama pohon: baris tanpa foto otomatis memakai gambar default
// dari aset backend (konsisten dengan fallback aplikasi mobile).
export function treePhotoUrl(file?: string | null): string {
  return assetUrl(file) ?? `${ASSET_ORIGIN}/assets/no-image-icon-23483.png`;
}

// Deteksi URL foto = gambar default backend (form edit menampilkan kolom
// kosong, bukan URL default).
export function isDefaultTreePhoto(url?: string | null): boolean {
  return !!url && /\/no-image-icon-23483\.png(\?.*)?$/.test(url);
}

// URL absolut dari API kadang menyimpan host emulator (10.0.2.2) dari saat
// foto di-upload lewat mobile — tulis-ulang origin IP/localhost ke origin
// API agar lolos remotePatterns next/image; domain publik dibiarkan.
export function apiAssetUrl(url?: string | null): string | null {
  const a = assetUrl(url);
  if (!a) return null;
  try {
    const u = new URL(a);
    if (/^(localhost|\d{1,3}(\.\d{1,3}){3})$/.test(u.hostname)) {
      return `${ASSET_ORIGIN}${u.pathname}${u.search}`;
    }
  } catch {
    // bukan URL absolut — kembalikan apa adanya
  }
  return a;
}

// ===================== Tipe & mapper =====================

export type TreeStatus = "AVAILABLE" | "RESERVED" | "ADOPTED";

export type ApiTree = {
  id: number;
  code: string; // idpohon
  localName: string;
  species: string | null;
  family: string | null;
  desa: string;
  diameterCm: number | null;
  heightM: number | null;
  kelilingCm: number | null;
  // Estimasi biomassa (ton) dari accessor Pohon::tonase — hanya hadir di
  // endpoint yang menyerialisasi model (pohonbykode).
  tonase: number | null;
  priceIdr: number; // harga
  photoUrl: string; // treePhotoUrl — selalu terisi (fallback gambar default)
  lat: number | null;
  lng: number | null;
  status: TreeStatus;
  tglExp: string | null;
  highlight: number | null;
};

const TREE_STATUS_MAP: Record<string, TreeStatus> = {
  available: "AVAILABLE",
  reserved: "RESERVED",
  adopted: "ADOPTED",
};

function num(v: unknown): number | null {
  const n = Number(v);
  return v === null || v === undefined || v === "" || Number.isNaN(n) ? null : n;
}

// Baris data_pohon dari endpoint mana pun (filtertrees, pohonbykode,
// pohonbydesa, pohonmapall, pohonbykode web) → ApiTree.
export function mapTree(r: Record<string, unknown>): ApiTree {
  return {
    id: Number(r.id),
    code: String(r.idpohon ?? ""),
    localName: String(r.localname ?? ""),
    species: r.species ? String(r.species) : null,
    family: r.family ? String(r.family) : null,
    desa: String(r.desa ?? ""),
    diameterCm: num(r.diameter),
    heightM: num(r.tinggi),
    kelilingCm: num(r.keliling),
    tonase: num(r.tonase),
    priceIdr: Number(r.harga) || 0,
    photoUrl: treePhotoUrl(r.foto_pohon as string | null),
    lat: num(r.latitude),
    lng: num(r.longitude),
    status: TREE_STATUS_MAP[String(r.adopted ?? "")] ?? "ADOPTED",
    tglExp: r.tgl_exp ? String(r.tgl_exp) : null,
    highlight: num(r.highlight),
  };
}

export function mapTrees(rows: Record<string, unknown>[]): ApiTree[] {
  return rows.map(mapTree);
}

export type ApiDesa = {
  id: number;
  name: string;
  slug: string;
  provinsi: string | null;
  kabupaten: string | null;
  kecamatan: string | null;
  description: string | null; // profil
  photoUrl: string | null;
  hutanDesa: string | null;
  total: number;
  available: number;
  adopted: number;
  aktif: boolean;
};

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// certnum mengandung '/' (mis. 001/LPHD-RA/2026) → encode per segmen
// agar cocok dengan route catch-all /sertifikat/[...code].
export function certUrl(certnum: string): string {
  return `/sertifikat/${certnum.split("/").map(encodeURIComponent).join("/")}`;
}

// Baris getdesa → ApiDesa (slug dihitung dari nama — tabel desa tak
// punya kolom slug).
export function mapDesa(r: Record<string, unknown>): ApiDesa {
  const name = String(r.nama ?? "");
  return {
    id: Number(r.id),
    name,
    slug: slugify(name),
    provinsi: r.provinsi ? String(r.provinsi) : null,
    kabupaten: r.kabupaten ? String(r.kabupaten) : null,
    kecamatan: r.kecamatan ? String(r.kecamatan) : null,
    description: r.profil ? String(r.profil) : null,
    photoUrl: assetUrl(r.foto as string | null),
    hutanDesa: r.hutan_desa ? String(r.hutan_desa) : null,
    total: Number(r.total) || 0,
    available: Number(r.available) || 0,
    adopted: Number(r.adopted) || 0,
    aktif: Number(r.aktif ?? 1) === 1,
  };
}

// Baris getdesa → ApiLokasi (kelola Data Lokasi web admin).
export type ApiLokasi = {
  id: number;
  nama: string;
  label: string;
  slug: string;
  kodeCert: string;
  kodePohon: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  skema: string;
  aktif: boolean;
  lat: string;
  lng: string;
  profil: string;
  foto: string;
  total: number;
  available: number;
  adminDesa: string;
};

export function mapLokasi(r: Record<string, unknown>): ApiLokasi {
  const nama = String(r.nama ?? "");
  return {
    id: Number(r.id),
    nama,
    label: r.label ? String(r.label) : "",
    slug: slugify(nama),
    kodeCert: r.kode_cert ? String(r.kode_cert) : "",
    kodePohon: r.kode_pohon ? String(r.kode_pohon) : "",
    kecamatan: r.kecamatan ? String(r.kecamatan) : "",
    kabupaten: r.kabupaten ? String(r.kabupaten) : "",
    provinsi: r.provinsi ? String(r.provinsi) : "",
    skema: r.skema ? String(r.skema) : "",
    aktif: Number(r.aktif ?? 1) === 1,
    lat: r.latitude ? String(r.latitude) : "",
    lng: r.longitude ? String(r.longitude) : "",
    profil: r.profil ? String(r.profil) : "",
    foto: r.foto ? String(r.foto) : "",
    total: Number(r.total) || 0,
    available: Number(r.available) || 0,
    adminDesa: r.admin_desa ? String(r.admin_desa) : "",
  };
}

export type ApiBank = {
  id: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
};

// getrekening → ApiBank
export function mapBank(r: Record<string, unknown>): ApiBank {
  return {
    id: Number(r.id),
    bankName: String(r.nama_bank ?? ""),
    accountNumber: String(r.no_rek ?? ""),
    accountName: String(r.atas_nama ?? ""),
  };
}

export type AdoptionStatus =
  | "PENDING_PAYMENT"
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "CANCELLED";

// confirmation Laravel → status adopsi web. 'no' + bukti terunggah =
// menunggu verifikasi admin.
export function adoptionStatus(confirmation: string, hasProof: boolean): AdoptionStatus {
  if (confirmation === "yes") return "ACTIVE";
  if (confirmation === "cancel") return "CANCELLED";
  return hasProof ? "PENDING_VERIFICATION" : "PENDING_PAYMENT";
}

// Baris getconfirmasi (satu confirmation = satu order, bisa multi pohon).
export type ApiConfirmation = {
  id: number;
  invoice: string;
  price: number; // total termasuk kode unik
  tanggal: string;
  jmlPohon: number;
  confirmation: string;
  createdAt: string | null; // order dibuat (batas pembayaran = +24 jam)
  fotoUrl: string | null;
  linkInvoice: string | null;
};

export function mapConfirmation(r: Record<string, unknown>): ApiConfirmation {
  return {
    id: Number(r.id),
    invoice: String(r.invoice ?? ""),
    price: Number(r.price) || 0,
    tanggal: String(r.tanggal ?? ""),
    jmlPohon: Number(r.jml_pohon) || 1,
    confirmation: String(r.confirmation ?? "no"),
    createdAt: r.created_at ? String(r.created_at) : null,
    fotoUrl: assetUrl(r.foto as string | null),
    linkInvoice: r.link_invoice ? String(r.link_invoice) : null,
  };
}

export function mapConfirmations(rows: Record<string, unknown>[]): ApiConfirmation[] {
  return rows.map(mapConfirmation);
}

// Baris mytrees (satu baris per pohon dalam order).
export type ApiAdopsiPohon = {
  id: number;
  invoice: string;
  idpohon: string;
  localName: string;
  photoUrl: string;
  desa: string;
  price: number;
  proses: number;
  certnum: string | null;
  tglAdopt: string | null;
  tglExp: string | null;
  dur: number; // durasi adopsi (tahun)
  nama: string; // nama penerima di sertifikat
  memo: string; // memo/pesan sertifikat
};

export function mapAdopsiPohon(r: Record<string, unknown>): ApiAdopsiPohon {
  return {
    id: Number(r.id),
    invoice: String(r.invoice ?? ""),
    idpohon: String(r.idpohon ?? ""),
    localName: String(r.localname ?? ""),
    photoUrl: treePhotoUrl(r.foto_pohon as string | null),
    desa: String(r.desa ?? ""),
    price: Number(r.price) || 0,
    proses: Number(r.proses) || 0,
    certnum: r.certnum ? String(r.certnum) : null,
    tglAdopt: r.tgl_adopt ? String(r.tgl_adopt) : null,
    tglExp: r.tgl_exp ? String(r.tgl_exp) : null,
    dur: Number(r.dur) || 1,
    nama: String(r.nama ?? ""),
    memo: String(r.memo ?? ""),
  };
}

export function mapAdopsiPohons(rows: Record<string, unknown>[]): ApiAdopsiPohon[] {
  return rows.map(mapAdopsiPohon);
}

// Baris fototagingorder (proses tagging per pohon dalam satu order, sisi
// donatur). Foto di-scope idadopsi — hanya bukti tagging order ini.
export type ApiTaggingTree = {
  idadopsi: number;
  idpohon: string;
  localName: string;
  desa: string;
  proses: number;
  foto: { url: string; tanggal: string | null }[];
};

export function mapTaggingTrees(rows: Record<string, unknown>[]): ApiTaggingTree[] {
  return rows.map((r) => ({
    idadopsi: Number(r.idadopsi) || 0,
    idpohon: String(r.idpohon ?? ""),
    localName: String(r.localname ?? ""),
    desa: String(r.desa ?? ""),
    proses: Number(r.proses) || 0,
    foto: Array.isArray(r.foto)
      ? (r.foto as Record<string, unknown>[])
          .map((f) => ({
            url: apiAssetUrl(f.url as string | null) ?? "",
            tanggal: f.tanggal ? String(f.tanggal) : null,
          }))
          .filter((f) => f.url !== "")
      : [],
  }));
}

// Baris ordercustomer (admin: gabungan data_adopsi + confirmation).
// lat/lng hanya terisi pada ordercustomerbypengurus (untuk petugas
// tagging di lapangan).
export type ApiOrderRow = {
  id: number; // id data_adopsi
  idpohon: string;
  localName: string;
  photoUrl: string;
  invoice: string;
  nama: string;
  pengasuh: number;
  desa: string;
  price: number; // subtotal pohon
  total: number; // total confirmation (dengan kode unik)
  proses: number;
  confirmation: string;
  confirmasiId: number;
  fotoBuktiUrl: string | null;
  tglAdopt: string | null;
  tglExp: string | null;
  createdAt: string | null;
  lat: number | null;
  lng: number | null;
  diameter: number;
  tinggi: number;
  keliling: number;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
};

export function mapOrderRows(rows: Record<string, unknown>[]): ApiOrderRow[] {
  return rows.map(mapOrderRow);
}

export function mapOrderRow(r: Record<string, unknown>): ApiOrderRow {
  return {
    id: Number(r.id),
    idpohon: String(r.idpohon ?? ""),
    localName: String(r.localname ?? ""),
    photoUrl: treePhotoUrl(r.foto_pohon as string | null),
    invoice: String(r.invoice ?? ""),
    nama: String(r.nama ?? ""),
    pengasuh: Number(r.pengasuh) || 0,
    desa: String(r.desa ?? ""),
    price: Number(r.price) || 0,
    total: Number(r.total) || 0,
    proses: Number(r.proses) || 0,
    confirmation: String(r.confirmasi ?? ""),
    confirmasiId: Number(r.confirmasiid) || 0,
    fotoBuktiUrl: assetUrl(r.fotopembayaran as string | null),
    tglAdopt: r.tgl_adopt ? String(r.tgl_adopt) : null,
    tglExp: r.tgl_exp ? String(r.tgl_exp) : null,
    createdAt: r.created_at ? String(r.created_at) : null,
    lat: num(r.latitude),
    lng: num(r.longitude),
    diameter: num(r.diameter) || 0,
    tinggi: num(r.tinggi) || 0,
    keliling: num(r.keliling) || 0,
    kecamatan: String(r.kecamatan ?? ""),
    kabupaten: String(r.kabupaten ?? ""),
    provinsi: String(r.provinsi ?? ""),
  };
}

// Baris blog (blog/blogbyfilter/blogfirst/blogbyid). created_at pada
// endpoint list formatnya rusak ('m' PHP = nama bulan) — hanya blogbyid
// yang mengirim tanggal bersih.
export type ApiPost = {
  id: number;
  title: string; // name
  description: string;
  coverUrl: string | null;
  category: string; // kategori
  author: string; // nama (member)
  viewer: number;
  createdAt: string | null;
};

export function mapPost(r: Record<string, unknown>): ApiPost {
  return {
    id: Number(r.id),
    title: String(r.name ?? ""),
    description: String(r.deskripsi ?? ""),
    coverUrl: assetUrl(r.cover as string | null),
    category: String(r.kategori ?? ""),
    author: String(r.nama ?? ""),
    viewer: Number(r.viewer) || 0,
    createdAt: r.created_at ? String(r.created_at) : null,
  };
}

export function mapPosts(rows: Record<string, unknown>[]): ApiPost[] {
  return rows.map(mapPost);
}

// getkontak → kontak organisasi (sumber tunggal, dipakai footer + /kontak).
export type ApiKontak = {
  nama: string;
  telepon: string;
  whatsapp: string;
  email: string;
};

export function mapKontak(r: Record<string, unknown>): ApiKontak {
  return {
    nama: String(r.nama ?? ""),
    telepon: String(r.telepon ?? ""),
    whatsapp: String(r.whatsapp ?? ""),
    email: String(r.email ?? ""),
  };
}

// GET slider → hero slide beranda (satu slider untuk web & mobile).
// DB menyimpan filename polos; endpoint mengembalikan URL prod domain —
// rebuild dari origin API agar upload lokal langsung terlihat di dev.
export type ApiSlider = {
  id: number;
  judul: string;
  deskripsi: string;
  gambarFile: string; // filename di public/assets
  imageUrl: string | null;
};

export function mapSlider(r: Record<string, unknown>): ApiSlider {
  const file = String(r.gambar ?? "").split("/").pop() ?? "";
  return {
    id: Number(r.id),
    judul: String(r.judul ?? ""),
    deskripsi: String(r.deskripsi ?? ""),
    gambarFile: file,
    imageUrl: file ? `${ASSET_ORIGIN}/assets/${file}` : null,
  };
}

export function mapSliders(rows: Record<string, unknown>[]): ApiSlider[] {
  return rows.map(mapSlider);
}

// Baris posisipetugas → posisi GPS petugas terakhir.
export type ApiPosisiPetugas = {
  id: number;
  nama: string;
  email: string;
  lat: number;
  lng: number;
  updatedAt: string | null; // ISO dari Laravel
};

export function mapPosisiPetugas(r: Record<string, unknown>): ApiPosisiPetugas {
  return {
    id: Number(r.idmember) || 0,
    nama: String(r.nama ?? ""),
    email: String(r.email ?? ""),
    lat: num(r.lat) ?? 0,
    lng: num(r.lng) ?? 0,
    updatedAt: r.updated_at ? String(r.updated_at) : null,
  };
}

export function mapPosisiPetugasList(rows: Record<string, unknown>[]): ApiPosisiPetugas[] {
  return rows.map(mapPosisiPetugas);
}

// penugasandesa → pemetaan desa ↔ petugas.
export type ApiPetugasRingkas = {
  id: number;
  nama: string;
  email: string;
};

export type ApiDesaPenugasan = {
  id: number;
  nama: string;
  provinsi: string | null;
  photoUrl: string | null;
  petugas: ApiPetugasRingkas[];
};

export type ApiPetugasRingkasan = {
  id: number;
  nama: string;
  email: string;
  jumDesa: number;
  desaList: string;
};

export type ApiPenugasan = {
  desa: ApiDesaPenugasan[];
  petugas: ApiPetugasRingkasan[];
};

export function mapPenugasan(r: Record<string, unknown>): ApiPenugasan {
  const desa = Array.isArray(r.desa) ? (r.desa as Record<string, unknown>[]) : [];
  const petugas = Array.isArray(r.petugas) ? (r.petugas as Record<string, unknown>[]) : [];
  return {
    desa: desa.map((d) => ({
      id: Number(d.iddesa) || 0,
      nama: String(d.nama ?? ""),
      provinsi: d.provinsi ? String(d.provinsi) : null,
      photoUrl: assetUrl(d.foto as string | null),
      petugas: Array.isArray(d.petugas)
        ? (d.petugas as Record<string, unknown>[]).map((p) => ({
            id: Number(p.idpetugas) || 0,
            nama: String(p.nama ?? ""),
            email: String(p.email ?? ""),
          }))
        : [],
    })),
    petugas: petugas.map((p) => ({
      id: Number(p.idmember) || 0,
      nama: String(p.nama ?? ""),
      email: String(p.email ?? ""),
      jumDesa: Number(p.jumdesa) || 0,
      desaList: String(p.desa_list ?? ""),
    })),
  };
}

// pohonmapdesa → titik pohon satu desa (semua status) utk peta offline tagging.
export type ApiPetaPohon = {
  id: number;
  code: string;
  localName: string;
  species: string | null;
  lat: number | null;
  lng: number | null;
  desa: string | null;
  status: TreeStatus;
};

export function mapPetaPohons(rows: Record<string, unknown>[]): ApiPetaPohon[] {
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.idpohon ?? ""),
    localName: String(r.localname ?? ""),
    species: r.species ? String(r.species) : null,
    lat: num(r.latitude),
    lng: num(r.longitude),
    desa: r.desa ? String(r.desa) : null,
    status: TREE_STATUS_MAP[String(r.adopted ?? "").toLowerCase()] ?? "AVAILABLE",
  }));
}

// getmembers → daftar member utk kelola user web admin.
export type ApiMember = {
  id: number;
  name: string;
  emaile: string;
  hp: string;
  admin: number; // 0 donatur, 1 admin, 2 petugas
  aktif: boolean;
  tanggal: string | null;
  address: string | null;
};

export function mapMembers(rows: Record<string, unknown>[]): ApiMember[] {
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name ?? ""),
    emaile: String(r.emaile ?? ""),
    hp: String(r.hp ?? ""),
    admin: Number(r.admin) || 0,
    aktif: r.aktif === undefined || r.aktif === null ? true : Number(r.aktif) === 1,
    tanggal: r.tanggal ? String(r.tanggal) : null,
    address: r.address ? String(r.address) : null,
  }));
}

// allcertificate → daftar sertifikat utk kelola sertifikat web admin.
export type ApiSertifikatRow = {
  id: number;
  certnum: string;
  nama: string;
  idpohon: string;
  localName: string;
  invoice: string;
  tglAdopt: string | null;
  tglExp: string | null;
  proses: number;
  desa: string;
};

export function mapSertifikatRows(rows: Record<string, unknown>[]): ApiSertifikatRow[] {
  return rows.map((r) => ({
    id: Number(r.id),
    certnum: String(r.certnum ?? ""),
    nama: String(r.nama ?? ""),
    idpohon: String(r.idpohon ?? ""),
    localName: String(r.localname ?? ""),
    invoice: String(r.invoice ?? ""),
    tglAdopt: r.tgl_adopt ? String(r.tgl_adopt) : null,
    tglExp: r.tgl_exp ? String(r.tgl_exp) : null,
    proses: Number(r.proses) || 0,
    desa: String(r.desa ?? ""),
  }));
}

// adopsilist → baris data_adopsi utk halaman admin Data Adopsi
// (paritas "Admin | Data Adoption" web lama).
export type ApiAdopsi = {
  id: number;
  desa: string;
  idpohon: string;
  nama: string;
  donatur: string;
  diameterCm: number | null;
  localName: string;
  tagged: boolean;
  certnum: string;
  dur: number | null;
  price: number | null;
  cur: string; // mata uang donasi (IDR | USD)
  methode: string;
  tglAdopt: string | null;
  tglExp: string | null;
  invoice: string;
  proses: number;
};

export function mapAdopsis(rows: Record<string, unknown>[]): ApiAdopsi[] {
  return rows.map((r) => ({
    id: Number(r.id),
    desa: String(r.desa ?? ""),
    idpohon: String(r.idpohon ?? ""),
    nama: String(r.nama ?? ""),
    donatur: String(r.donatur ?? ""),
    diameterCm: r.diameter === null || r.diameter === undefined ? null : Number(r.diameter),
    localName: String(r.localname ?? ""),
    tagged: String(r.tagged) === "1",
    certnum: String(r.certnum ?? ""),
    dur: r.dur === null || r.dur === undefined ? null : Number(r.dur),
    price: r.price === null || r.price === undefined ? null : Number(r.price),
    cur: String(r.cur ?? "IDR"),
    methode: String(r.methode ?? ""),
    tglAdopt: r.tgl_adopt ? String(r.tgl_adopt) : null,
    tglExp: r.tgl_exp ? String(r.tgl_exp) : null,
    invoice: String(r.invoice ?? ""),
    proses: Number(r.proses) || 0,
  }));
}

// reportprice → hitungan pohon per desa × harga × status untuk laporan
// harga admin (paritas "Admin | Data Trees Price" web lama).
export type ApiPriceRow = {
  desa: string;
  harga: number;
  status: string; // available | reserved | adopted
  jml: number;
};

export function mapPriceRows(rows: Record<string, unknown>[]): ApiPriceRow[] {
  return rows.map((r) => ({
    desa: String(r.desa ?? ""),
    harga: Number(r.harga) || 0,
    status: String(r.status ?? "adopted"),
    jml: Number(r.jml) || 0,
  }));
}

// ===================== Backup database =====================

// Endpoint backup memuat seluruh DB — wajib header token rahasia yang
// sama dengan env BACKUP_TOKEN Laravel. Hanya dipakai di server
// (page/actions); jangan pernah dipanggil dari komponen client.
export function backupHeaders(): Record<string, string> {
  return { "X-Backup-Token": process.env.BACKUP_TOKEN ?? "" };
}

// backuplist → daftar file backup .sql.gz di server API.
export type ApiBackup = {
  name: string;
  size: number; // byte
  tanggal: string; // Y-m-d H:i:s (waktu server API)
};

export function mapBackups(rows: Record<string, unknown>[]): ApiBackup[] {
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    size: Number(r.size) || 0,
    tanggal: String(r.tanggal ?? ""),
  }));
}

// globalsearch → hasil pencarian global admin, dikelompokkan per entitas.
export type ApiSearchPohon = {
  id: number;
  code: string;
  localName: string;
  species: string | null;
  desa: string;
  status: TreeStatus;
};

export type ApiSearchMember = {
  id: number;
  name: string;
  emaile: string;
  hp: string;
  admin: number;
  aktif: boolean;
};

export type ApiSearchSertifikat = {
  id: number;
  certnum: string;
  nama: string;
  idpohon: string;
  localName: string;
  invoice: string;
};

export type ApiSearchOrder = {
  id: number; // id confirmation
  invoice: string;
  nama: string;
  price: number;
  confirmation: string;
  tanggal: string | null;
};

export type ApiSearchBlog = {
  id: number;
  name: string;
  kategori: string;
};

export type ApiSearchDesa = {
  id: number;
  nama: string;
  provinsi: string | null;
};

export type ApiGlobalSearch = {
  pohon: ApiSearchPohon[];
  member: ApiSearchMember[];
  sertifikat: ApiSearchSertifikat[];
  order: ApiSearchOrder[];
  blog: ApiSearchBlog[];
  desa: ApiSearchDesa[];
};

export const EMPTY_GLOBAL_SEARCH: ApiGlobalSearch = {
  pohon: [],
  member: [],
  sertifikat: [],
  order: [],
  blog: [],
  desa: [],
};

export function mapGlobalSearch(r: Record<string, unknown>): ApiGlobalSearch {
  const listOf = (key: string): Record<string, unknown>[] =>
    Array.isArray(r[key]) ? (r[key] as Record<string, unknown>[]) : [];
  return {
    pohon: listOf("pohon").map((x) => ({
      id: Number(x.id),
      code: String(x.idpohon ?? ""),
      localName: String(x.localname ?? ""),
      species: x.species ? String(x.species) : null,
      desa: String(x.desa ?? ""),
      status: TREE_STATUS_MAP[String(x.adopted ?? "").toLowerCase()] ?? "AVAILABLE",
    })),
    member: listOf("member").map((x) => ({
      id: Number(x.id),
      name: String(x.name ?? ""),
      emaile: String(x.emaile ?? ""),
      hp: String(x.hp ?? ""),
      admin: Number(x.admin) || 0,
      aktif: x.aktif === undefined || x.aktif === null ? true : Number(x.aktif) === 1,
    })),
    sertifikat: listOf("sertifikat").map((x) => ({
      id: Number(x.id),
      certnum: String(x.certnum ?? ""),
      nama: String(x.nama ?? ""),
      idpohon: String(x.idpohon ?? ""),
      localName: String(x.localname ?? ""),
      invoice: String(x.invoice ?? ""),
    })),
    order: listOf("order").map((x) => ({
      id: Number(x.id),
      invoice: String(x.invoice ?? ""),
      nama: String(x.nama ?? ""),
      price: Number(x.price) || 0,
      confirmation: String(x.confirmation ?? ""),
      tanggal: x.tanggal ? String(x.tanggal) : null,
    })),
    blog: listOf("blog").map((x) => ({
      id: Number(x.id),
      name: String(x.name ?? ""),
      kategori: String(x.kategori ?? ""),
    })),
    desa: listOf("desa").map((x) => ({
      id: Number(x.id),
      nama: String(x.nama ?? ""),
      provinsi: x.provinsi ? String(x.provinsi) : null,
    })),
  };
}

// ===================== Fitur LindungiHutan (2026-09-26) =====================

// statistikdampak → angka dampak section beranda.
export type ApiStatistik = {
  pohon: number;
  diadopsi: number;
  tersedia: number;
  desa: number;
  donatur: number;
};

export function mapStatistik(r: Record<string, unknown>): ApiStatistik {
  return {
    pohon: Number(r.pohon) || 0,
    diadopsi: Number(r.diadopsi) || 0,
    tersedia: Number(r.tersedia) || 0,
    desa: Number(r.desa) || 0,
    donatur: Number(r.donatur) || 0,
  };
}

// specieslist → baris katalog spesies (ensiklopedia + karbon).
export type ApiSpecies = {
  id: number;
  namaLatin: string;
  namaLokal: string;
  famili: string;
  deskripsi: string;
  serapanKarbon: number | null; // kg CO2/pohon/tahun (estimasi)
  photoUrl: string | null;
  jmlPohon: number;
  jmlTersedia: number;
};

export function mapSpecies(r: Record<string, unknown>): ApiSpecies {
  return {
    id: Number(r.id),
    namaLatin: String(r.nama_latin ?? ""),
    namaLokal: String(r.nama_lokal ?? ""),
    famili: String(r.famili ?? ""),
    deskripsi: String(r.deskripsi ?? ""),
    serapanKarbon: num(r.serapan_karbon),
    photoUrl: assetUrl(r.foto as string | null),
    jmlPohon: Number(r.jml_pohon) || 0,
    jmlTersedia: Number(r.jml_tersedia) || 0,
  };
}

export function mapSpeciesList(rows: Record<string, unknown>[]): ApiSpecies[] {
  return rows.map(mapSpecies);
}

// speciesdetail/{id} → katalog + pohon terkait (semua status) & desa.
export type ApiSpeciesDetail = ApiSpecies & {
  speciesKey: string;
  pohon: {
    code: string;
    localName: string;
    species: string | null;
    desa: string;
    priceIdr: number;
    photoUrl: string;
    status: TreeStatus;
  }[];
  desaTerkait: { nama: string; jml: number }[];
};

export function mapSpeciesDetail(r: Record<string, unknown>): ApiSpeciesDetail {
  const pohon = Array.isArray(r.pohon) ? (r.pohon as Record<string, unknown>[]) : [];
  const desa = Array.isArray(r.desa) ? (r.desa as Record<string, unknown>[]) : [];
  return {
    ...mapSpecies(r),
    speciesKey: String(r.species_key ?? ""),
    pohon: pohon.map((p) => ({
      code: String(p.idpohon ?? ""),
      localName: String(p.localname ?? ""),
      species: p.species ? String(p.species) : null,
      desa: String(p.desa ?? ""),
      priceIdr: Number(p.harga) || 0,
      photoUrl: treePhotoUrl(p.foto_pohon as string | null),
      status: TREE_STATUS_MAP[String(p.adopted ?? "")] ?? "ADOPTED",
    })),
    desaTerkait: desa.map((d) => ({
      nama: String(d.nama ?? ""),
      jml: Number(d.jml) || 0,
    })),
  };
}

// testimonilist → section "Kata Mereka" beranda.
export type ApiTestimoni = {
  id: number;
  nama: string;
  peran: string;
  isi: string;
  urutan: number;
};

export function mapTestimonis(rows: Record<string, unknown>[]): ApiTestimoni[] {
  return rows.map((r) => ({
    id: Number(r.id),
    nama: String(r.nama ?? ""),
    peran: String(r.peran ?? ""),
    isi: String(r.isi ?? ""),
    urutan: Number(r.urutan) || 0,
  }));
}

// partnerlist → section "Didukung Oleh" beranda. Endpoint membalas logo
// ceritalist → halaman publik /cerita-dampak (kisah penerima manfaat).
// Endpoint membalas foto URL penuh dari host API; rebuild dari origin
// (pola mapPartner) agar upload dev lokal langsung terlihat.
export type ApiCerita = {
  id: number;
  judul: string;
  narasumber: string;
  peran: string;
  lokasi: string;
  isi: string;
  fotoUrl: string | null;
  createdAt: string;
};

export function mapCeritas(rows: Record<string, unknown>[]): ApiCerita[] {
  return rows.map((r) => {
    const file = String(r.foto ?? "").split("/").pop() ?? "";
    return {
      id: Number(r.id),
      judul: String(r.judul ?? ""),
      narasumber: String(r.narasumber ?? ""),
      peran: String(r.peran ?? ""),
      lokasi: String(r.lokasi ?? ""),
      isi: String(r.isi ?? ""),
      fotoUrl: file ? `${ASSET_ORIGIN}/assets/${file}` : null,
      createdAt: String(r.created_at ?? ""),
    };
  });
}

// partnerlist → section "Didukung Oleh" beranda. Endpoint membalas logo
// URL penuh dari host API; rebuild dari origin (pola mapSlider) agar
// upload dev lokal langsung terlihat.
export type ApiPartner = {
  id: number;
  nama: string;
  logoUrl: string | null;
  url: string;
  urutan: number;
};

export function mapPartners(rows: Record<string, unknown>[]): ApiPartner[] {
  return rows.map((r) => {
    const file = String(r.logo ?? "").split("/").pop() ?? "";
    return {
      id: Number(r.id),
      nama: String(r.nama ?? ""),
      logoUrl: file ? `${ASSET_ORIGIN}/assets/${file}` : null,
      url: String(r.url ?? ""),
      urutan: Number(r.urutan) || 0,
    };
  });
}

// pembayaranlist → Pencatatan Keuangan (/admin/keuangan/pembayaran): pohon
// "sudah ditagging" (dihitung hidup di backend, selaras chip Order Tagging)
// beserta status pembayarannya per siklus adopsi.
export type ApiPembayaranBayar = {
  id: number;
  penerima: string;
  jumlah: number;
  tanggal: string;
  metode: string;
  catatan: string | null;
};

export type ApiPembayaranRow = {
  idadopsi: number;
  idpohon: string;
  invoice: string;
  nama: string;
  price: number;
  proses: number;
  tglAdopt: string | null;
  desa: string;
  localname: string;
  jmlFoto: number;
  tglTagging: string | null;
  petugasDesa: string;
  dibayar: boolean;
  bayar: ApiPembayaranBayar | null;
};

export function mapPembayaranRows(res: {
  value?: number | string;
  data?: Record<string, unknown>[];
}): ApiPembayaranRow[] {
  return (res.data ?? []).map((r) => {
    const b = (r.pembayaran ?? null) as Record<string, unknown> | null;
    return {
      idadopsi: Number(r.idadopsi ?? 0),
      idpohon: String(r.idpohon ?? ""),
      invoice: String(r.invoice ?? ""),
      nama: String(r.nama ?? ""),
      price: Number(r.price ?? 0),
      proses: Number(r.proses ?? 0),
      tglAdopt: r.tgl_adopt ? String(r.tgl_adopt) : null,
      desa: String(r.desa ?? ""),
      localname: String(r.localname ?? r.idpohon ?? ""),
      jmlFoto: Number(r.jml_foto ?? 0),
      tglTagging: r.tgl_tagging ? String(r.tgl_tagging) : null,
      petugasDesa: String(r.petugas_desa ?? ""),
      dibayar: Boolean(r.dibayar),
      bayar: b
        ? {
            id: Number(b.id ?? 0),
            penerima: String(b.penerima ?? ""),
            jumlah: Number(b.jumlah ?? 0),
            tanggal: String(b.tanggal ?? ""),
            metode: String(b.metode ?? ""),
            catatan: b.catatan ? String(b.catatan) : null,
          }
        : null,
    };
  });
}
