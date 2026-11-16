"use client";

import { useRef, useState } from "react";
import { registrasiOrganisasiMitra } from "@/lib/actions/mitra";
import SubmitButton from "@/components/admin/submit-button";
import { TriangleAlert, X } from "lucide-react";

const BIDANG = [
  "Lingkungan dan Konservasi",
  "Pendidikan",
  "Sosial dan Pemberdayaan",
  "CSR",
  "Keanekaragaman Hayati",
  "Perubahan Iklim",
  "Lainnya",
];

const JENIS = ["perusahaan", "ngo", "komunitas", "yayasan", "pendidikan", "pemerintah", "lainnya"];

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_URL = /^https?:\/\/[^\s]+\.[^\s]{2,}$/i;
const RE_HP = /^\+?[0-9]{9,20}$/;
const RE_USERNAME = /^[a-z0-9_.]{3,30}$/;

type FieldError = { field: string; step: number; message: string };

function fieldOf(err: FieldError) {
  return err.field;
}

export default function MitraRegisterForm({ initialError = "" }: { initialError?: string }) {
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  const [popupMessages, setPopupMessages] = useState<string[]>(() =>
    initialError ? initialError.split("\n").map((m) => m.trim()).filter(Boolean) : [],
  );
  const [popupOpen, setPopupOpen] = useState(() => initialError.trim().length > 0);
  const formRef = useRef<HTMLFormElement>(null);

  const showPopup = (errs: FieldError[]) => {
    setPopupMessages(errs.map((e) => e.message));
    setFieldErrors(new Set(errs.map(fieldOf)));
    setPopupOpen(true);
    // lompat ke langkah pertama yang punya error
    const fist = Math.min(...errs.map((e) => e.step));
    setStep((s) => (fist < s ? fist : s));
  };

  const closePopup = () => setPopupOpen(false);

  // tampilkan error dari server (?error=...) di popup yang sama (di-inisialisasi di useState)
const get = (name: string) => {
    const el = formRef.current?.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
      | null;
    return el;
  };
  const valueOf = (name: string) => String(get(name)?.value ?? "").trim();
  const checkedOf = (name: string) => Boolean((get(name) as HTMLInputElement | null)?.checked);
  const filesOf = (name: string) => Array.from(((get(name) as HTMLInputElement | null)?.files) ?? []);

  const validateStep = (target: number): FieldError[] => {
    const e: FieldError[] = [];
    const add = (field: string, stepNo: number, message: string) =>
      e.push({ field, step: stepNo, message });

    if (target === 1 || target === 99) {
      const nama = valueOf("nama");
      if (nama.length < 3) add("nama", 1, "Nama organisasi wajib diisi (minimal 3 karakter).");
      else if (nama.length > 150) add("nama", 1, "Nama organisasi maksimal 150 karakter.");

      const jenis = valueOf("jenis");
      if (!JENIS.includes(jenis)) add("jenis", 1, "Jenis organisasi wajib dipilih.");

      const website = valueOf("website");
      if (website && !RE_URL.test(website))
        add("website", 1, "Format website tidak valid — gunakan https://domain.com");

      const logo = filesOf("logo")[0];
      if (!logo) add("logo", 1, "Logo organisasi wajib diunggah (PNG/JPG/WebP, maks 5 MB).");
      else {
        const ext = logo.name.split(".").pop()?.toLowerCase() ?? "";
        if (!["jpg", "jpeg", "png", "webp"].includes(ext))
          add("logo", 1, "Logo harus berformat JPG, PNG, atau WebP.");
        else if (logo.size > 5_000_000) add("logo", 1, "Logo maksimal 5 MB.");
      }

      if (!valueOf("provinsi")) add("provinsi", 1, "Provinsi wajib diisi.");
      if (!valueOf("kota")) add("kota", 1, "Kota/Kabupaten wajib diisi.");

      const alamat = valueOf("alamat");
      if (!alamat) add("alamat", 1, "Alamat lengkap wajib diisi.");
      else if (alamat.length > 255) add("alamat", 1, "Alamat maksimal 255 karakter.");

      if (!BIDANG.includes(valueOf("bidang_kegiatan")))
        add("bidang_kegiatan", 1, "Bidang kegiatan wajib dipilih.");

      const deskripsi = valueOf("deskripsi");
      if (deskripsi.length < 10)
        add("deskripsi", 1, "Deskripsi organisasi wajib diisi (minimal 10 karakter).");
    }

    if (target === 2 || target === 99) {
      const namaPj = valueOf("nama_pj");
      if (namaPj.length < 3) add("nama_pj", 2, "Nama penanggung jawab wajib diisi (minimal 3 karakter).");
      else if (namaPj.length > 150) add("nama_pj", 2, "Nama penanggung jawab maksimal 150 karakter.");

      if (!valueOf("jabatan")) add("jabatan", 2, "Jabatan penanggung jawab wajib diisi.");

      const emailPj = valueOf("email_pj");
      if (!RE_EMAIL.test(emailPj)) add("email_pj", 2, "Email penanggung jawab tidak valid.");

      const hp = valueOf("hp_pj").replace(/[\s\-()]/g, "");
      if (!RE_HP.test(hp)) add("hp_pj", 2, "Nomor WhatsApp tidak valid (9–20 digit, boleh diawali +).");
    }

    if (target === 3 || target === 99) {
      const checkDoc = (name: string, label: string, exts: string[]) => {
        const f = filesOf(name)[0];
        if (!f) return;
        const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
        if (!exts.includes(ext)) add(name, 3, `${label} harus berformat ${exts.join("/").toUpperCase()}.`);
        else if (f.size > 5_000_000) add(name, 3, `${label} maksimal 5 MB.`);
      };
      checkDoc("profil_org", "Profil organisasi", ["pdf"]);
      checkDoc("dokumen_legal", "Dokumen legalitas", ["pdf", "jpg", "jpeg", "png", "webp"]);
      checkDoc("surat_penunjukan", "Surat penunjukan", ["pdf", "jpg", "jpeg", "png", "webp"]);
    }

    if (target === 4 || target === 99) {
      const email = valueOf("email");
      if (!RE_EMAIL.test(email)) add("email", 4, "Email login tidak valid.");

      const username = valueOf("username").toLowerCase();
      if (!RE_USERNAME.test(username))
        add("username", 4, "Nama pengguna 3–30 karakter: huruf kecil, angka, titik atau underscore.");

      const password = valueOf("password");
      if (password.length < 8) add("password", 4, "Kata sandi minimal 8 karakter.");

      const password2 = valueOf("password2");
      if (password2 !== password) add("password2", 4, "Konfirmasi kata sandi tidak cocok.");
    }

    if (target === 5 || target === 99) {
      if (!checkedOf("setuju_data"))
        add("setuju_data", 5, "Anda harus menyatakan bahwa informasi organisasi benar.");
      if (!checkedOf("setuju_sk"))
        add("setuju_sk", 5, "Anda harus menyetujui Syarat dan Ketentuan.");
      if (!checkedOf("setuju_privasi"))
        add("setuju_privasi", 5, "Anda harus menyetujui Kebijakan Privasi.");
    }

    return e;
  };

  const goNext = (target: number) => {
    const errs = validateStep(target);
    if (errs.length) {
      showPopup(errs);
      return;
    }
    setFieldErrors(new Set());
    setStep(Math.min(5, target + 1));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const errs = validateStep(99);
    if (errs.length) {
      e.preventDefault();
      showPopup(errs);
    }
  };

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
  };

  const inputClass = (name: string, extra = "") =>
    `mt-1 w-full rounded-xl border px-3 py-2 text-sm dark:bg-night-950 dark:text-zinc-100 ${
      fieldErrors.has(name)
        ? "border-red-400 ring-2 ring-red-200 dark:border-red-700"
        : "border-zinc-200 dark:border-night-700"
    } ${extra}`;

  const labelClass = "block text-xs font-medium text-zinc-700";
  const star = <span className="text-red-500">*</span>;
  const hint = "mt-1 text-[11px] text-zinc-400";

  return (
    <form ref={formRef} action={registrasiOrganisasiMitra} noValidate encType="multipart/form-data" onSubmit={onSubmit} className="mt-6 space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2 text-[10px] font-semibold text-zinc-600">
        {["Informasi Organisasi", "Penanggung Jawab", "Dokumen", "Buat Akun", "Konfirmasi"].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                step >= i + 1 ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-500"
              }`}
            >
              {i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
            {i < 4 && <div className="h-0.5 w-6 bg-zinc-200" />}
          </div>
        ))}
      </div>

      {/* Tahap 1 — Informasi Organisasi */}
      <div className={step !== 1 ? "hidden" : "rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5"}>
        <h3 className="text-sm font-bold text-emerald-900">1. Informasi Organisasi</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nama Organisasi {star}</label>
            <input name="nama" maxLength={150} className={inputClass("nama")} aria-invalid={fieldErrors.has("nama")} />
          </div>
          <div>
            <label className={labelClass}>Jenis Organisasi {star}</label>
            <select name="jenis" className={inputClass("jenis")} aria-invalid={fieldErrors.has("jenis")} defaultValue="">
              <option value="">Pilih…</option>
              <option value="perusahaan">Perusahaan</option>
              <option value="ngo">NGO/Organisasi Nonprofit</option>
              <option value="komunitas">Komunitas</option>
              <option value="yayasan">Yayasan</option>
              <option value="pendidikan">Lembaga Pendidikan</option>
              <option value="pemerintah">Instansi Pemerintah</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Website</label>
            <input name="website" type="url" placeholder="https://…" className={inputClass("website")} aria-invalid={fieldErrors.has("website")} />
          </div>
          <div>
            <label className={labelClass}>Logo Organisasi {star}</label>
            <input
              type="file"
              name="logo"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={onLogoChange}
              className={inputClass("logo", "file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-700")}
              aria-invalid={fieldErrors.has("logo")}
            />
            {preview && <img src={preview} alt="Preview" className="mt-2 h-20 w-20 rounded-xl border border-zinc-200 object-contain" />}
            <p className={hint}>PNG/JPG/WebP, maks 5 MB</p>
          </div>
          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Negara</label>
              <input name="negara" defaultValue="Indonesia" maxLength={100} className={inputClass("negara")} />
            </div>
            <div>
              <label className={labelClass}>Provinsi {star}</label>
              <input name="provinsi" placeholder="mis. Jambi" maxLength={150} className={inputClass("provinsi")} aria-invalid={fieldErrors.has("provinsi")} />
            </div>
            <div>
              <label className={labelClass}>Kota/Kabupaten {star}</label>
              <input name="kota" placeholder="mis. Kota Jambi" maxLength={150} className={inputClass("kota")} aria-invalid={fieldErrors.has("kota")} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Alamat Lengkap {star}</label>
            <textarea name="alamat" rows={2} maxLength={255} className={inputClass("alamat")} aria-invalid={fieldErrors.has("alamat")} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Bidang Kegiatan {star}</label>
            <select name="bidang_kegiatan" className={inputClass("bidang_kegiatan")} aria-invalid={fieldErrors.has("bidang_kegiatan")} defaultValue="">
              <option value="">Pilih…</option>
              {BIDANG.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Deskripsi Singkat Organisasi {star}</label>
            <textarea name="deskripsi" rows={3} placeholder="Profil singkat dan aktivitas organisasi" className={inputClass("deskripsi")} aria-invalid={fieldErrors.has("deskripsi")} />
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <button type="button" onClick={() => goNext(1)} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            Lanjut →
          </button>
        </div>
      </div>

      {/* Tahap 2 — Penanggung Jawab */}
      <div className={step !== 2 ? "hidden" : "rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5"}>
        <h3 className="text-sm font-bold text-emerald-900">2. Informasi Penanggung Jawab</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nama Lengkap {star}</label>
            <input name="nama_pj" maxLength={150} className={inputClass("nama_pj")} aria-invalid={fieldErrors.has("nama_pj")} />
          </div>
          <div>
            <label className={labelClass}>Jabatan {star}</label>
            <input name="jabatan" placeholder="mis. Direktur Program" maxLength={100} className={inputClass("jabatan")} aria-invalid={fieldErrors.has("jabatan")} />
          </div>
          <div>
            <label className={labelClass}>Divisi/Departemen</label>
            <input name="divisi" placeholder="opsional" maxLength={100} className={inputClass("divisi")} />
          </div>
          <div>
            <label className={labelClass}>Email Penanggung Jawab {star}</label>
            <input name="email_pj" type="email" maxLength={150} className={inputClass("email_pj")} aria-invalid={fieldErrors.has("email_pj")} />
            <p className={hint}>Untuk komunikasi & verifikasi.</p>
          </div>
          <div>
            <label className={labelClass}>Nomor WhatsApp {star}</label>
            <input name="hp_pj" type="tel" placeholder="+6281…" maxLength={20} className={inputClass("hp_pj")} aria-invalid={fieldErrors.has("hp_pj")} />
            <p className={hint}>9–20 digit, boleh diawali +62.</p>
          </div>
        </div>
        <div className="mt-2 flex justify-between">
          <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-emerald-200 px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
            ← Kembali
          </button>
          <button type="button" onClick={() => goNext(2)} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            Lanjut →
          </button>
        </div>
      </div>

      {/* Tahap 3 — Dokumen Pendukung */}
      <div className={step !== 3 ? "hidden" : "rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5"}>
        <h3 className="text-sm font-bold text-emerald-900">3. Dokumen Pendukung</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label className={labelClass}>Profil Organisasi (disarankan)</label>
            <input type="file" name="profil_org" accept=".pdf" className={inputClass("profil_org", "file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs")} aria-invalid={fieldErrors.has("profil_org")} />
            <p className={hint}>PDF, maks 5 MB.</p>
          </div>
          <div>
            <label className={labelClass}>Dokumen Legalitas (opsional)</label>
            <input type="file" name="dokumen_legal" accept=".pdf,.jpg,.jpeg,.png,.webp" className={inputClass("dokumen_legal", "file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs")} aria-invalid={fieldErrors.has("dokumen_legal")} />
            <p className={hint}>Sertifikat pendirian / SK — PDF/JPG/PNG/WebP, maks 5 MB.</p>
          </div>
          <div>
            <label className={labelClass}>Surat Penunjukan Penanggung Jawab (opsional)</label>
            <input type="file" name="surat_penunjukan" accept=".pdf,.jpg,.jpeg,.png,.webp" className={inputClass("surat_penunjukan", "file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs")} aria-invalid={fieldErrors.has("surat_penunjukan")} />
            <p className={hint}>Bila email/telepon belum menyimpulkan kewenangan.</p>
          </div>
        </div>
        <div className="mt-2 flex justify-between">
          <button type="button" onClick={() => setStep(2)} className="rounded-xl border border-emerald-200 px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
            ← Kembali
          </button>
          <button type="button" onClick={() => goNext(3)} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            Lanjut →
          </button>
        </div>
      </div>

      {/* Tahap 4 — Buat Akun */}
      <div className={step !== 4 ? "hidden" : "rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5"}>
        <h3 className="text-sm font-bold text-emerald-900">4. Buat Akun Login</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Email login {star}</label>
            <input name="email" type="email" placeholder="email@domain.org" maxLength={150} className={inputClass("email")} aria-invalid={fieldErrors.has("email")} />
            <p className={hint}>Untuk login (boleh sama dengan email penanggung jawab).</p>
          </div>
          <div>
            <label className={labelClass}>Nama Pengguna {star}</label>
            <input name="username" type="text" minLength={3} maxLength={30} placeholder="hanya huruf kecil, angka, _ dan ." className={inputClass("username")} aria-invalid={fieldErrors.has("username")} autoCapitalize="none" spellCheck={false} />
          </div>
          <div>
            <label className={labelClass}>Kata Sandi {star}</label>
            <input name="password" type="password" minLength={8} className={inputClass("password")} aria-invalid={fieldErrors.has("password")} autoComplete="new-password" />
            <p className={hint}>Minimal 8 karakter.</p>
          </div>
          <div>
            <label className={labelClass}>Konfirmasi Kata Sandi {star}</label>
            <input name="password2" type="password" minLength={8} className={inputClass("password2")} aria-invalid={fieldErrors.has("password2")} autoComplete="new-password" />
            <p className={hint}>Harus sama dengan di atas.</p>
          </div>
        </div>
        <div className="mt-2 flex justify-between">
          <button type="button" onClick={() => setStep(3)} className="rounded-xl border border-emerald-200 px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
            ← Kembali
          </button>
          <button type="button" onClick={() => goNext(4)} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            Lanjut →
          </button>
        </div>
      </div>

      {/* Tahap 5 — Konfirmasi */}
      <div className={step !== 5 ? "hidden" : "rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5"}>
        <h3 className="text-sm font-bold text-emerald-900">5. Konfirmasi</h3>
        <p className="mt-1 text-sm text-zinc-600">Periksa sekali lagi — setelah dikirim, akun akan menunggu verifikasi admin.</p>
        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-3 text-xs text-zinc-700">
            <input type="checkbox" name="setuju_data" className="mt-0.5 h-4 w-4" />
            Saya menyatakan bahwa informasi organisasi yang diberikan adalah benar.
          </label>
          <label className="flex items-start gap-3 text-xs text-zinc-700">
            <input type="checkbox" name="setuju_sk" className="mt-0.5 h-4 w-4" />
            Saya menyetujui Syarat dan Ketentuan penggunaan platform Pohon Asuh.
          </label>
          <label className="flex items-start gap-3 text-xs text-zinc-700">
            <input type="checkbox" name="setuju_privasi" className="mt-0.5 h-4 w-4" />
            Saya menyetujui Kebijakan Privasi Pohon Asuh.
          </label>
        </div>
        <input type="hidden" name="idorga" value="" />
        <div className="mt-2 flex justify-between">
          <button type="button" onClick={() => setStep(4)} className="rounded-xl border border-emerald-200 px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
            ← Kembali
          </button>
          <SubmitButton pendingLabel="Memproses pendaftaran…" className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700">
            Kirim Pendaftaran Mitra
          </SubmitButton>
        </div>
      </div>

      {/* Popup pemberitahuan validasi */}
      {popupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="popup-title">
          <button type="button" onClick={closePopup} className="absolute inset-0 cursor-default bg-black/55" aria-label="Tutup" />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-night-900">
            <button type="button" onClick={closePopup} className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" aria-label="Tutup notifikasi">
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100">
                <TriangleAlert className="h-6 w-6 text-red-600" aria-hidden />
              </span>
              <h2 id="popup-title" className="text-base font-bold text-red-700 dark:text-red-400">
                Ada yang perlu diperbaiki
              </h2>
            </div>
            <ul className="mt-4 max-h-64 list-disc space-y-1.5 overflow-y-auto rounded-xl border border-red-100 bg-red-50/60 p-4 pl-8 text-sm text-zinc-800 dark:border-red-900 dark:bg-red-950/30 dark:text-zinc-100">
              {popupMessages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
            <button type="button" onClick={closePopup} className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              Oke, saya perbaiki
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
