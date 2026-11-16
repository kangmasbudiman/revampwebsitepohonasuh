"use client";

import { useState } from "react";
import { registrasiOrganisasiMitra } from "@/lib/actions/mitra";
import SubmitButton from "@/components/admin/submit-button";

const BIDANG = [
  "Lingkungan dan Konservasi",
  "Pendidikan",
  "Sosisal dan Pemberdayaan",
  "CSR",
  "Keanekaragaman Hayati",
  "Perubahan Iklim",
  "Lainnya",
];

export default function MitraRegisterForm() {
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);

  const next = (checks: boolean[]) => {
    if (checks.some((c) => !c)) return;
    setStep((s) => Math.min(5, s + 1));
  };

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
  };

  return (
    <form action={registrasiOrganisasiMitra} encType="multipart/form-data" className="mt-6 space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2 text-[10px] font-semibold text-zinc-600">
        {["Informasi Organisasi","Penanggung Jawab","Dokumen","Buat Akun","Konfirmasi"].map((label, i) => (
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
              <label className="block text-xs font-medium text-zinc-700">Nama Organisasi <span className="text-red-500">*</span></label>
              <input name="nama" required className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Jenis Organisasi <span className="text-red-500">*</span></label>
              <select name="jenis" required className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
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
              <label className="block text-xs font-medium text-zinc-700">Website</label>
              <input name="website" type="url" placeholder="https://…" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Logo Organisasi <span className="text-red-500">*</span></label>
              <input
                type="file"
                name="logo"
                accept="image/*"
                required
                onChange={onLogoChange}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-700"
              />
              {preview && <img src={preview} alt="Preview" className="mt-2 h-20 w-20 rounded-xl object-contain border border-zinc-200" />}
              <p className="mt-1 text-[11px] text-zinc-400">PNG/JPG/WebP, maks 5 MB</p>
            </div>
            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700">Negara</label>
                <input name="negara" defaultValue="Indonesia" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Provinsi <span className="text-red-500">*</span></label>
                <input name="provinsi" required placeholder="mis. Jambi" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Kota/Kabupaten <span className="text-red-500">*</span></label>
                <input name="kota" required placeholder="mis. Kota Jambi" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700">Alamat Lengkap <span className="text-red-500">*</span></label>
              <textarea name="alamat" required rows={2} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700">Bidang Kegiatan <span className="text-red-500">*</span></label>
              <select name="bidang_kegiatan" required className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
                <option value="">Pilih…</option>
                {BIDANG.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700">Deskripsi Singkat Organisasi <span className="text-red-500">*</span></label>
              <textarea name="deskripsi" required rows={3} placeholder="Profil singkat dan aktivitas organisasi" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => next([!!(document.querySelector('input[name="nama"]') as HTMLInputElement)?.value.trim(), !!(document.querySelector('input[name="logo"]') as HTMLInputElement)?.value])} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              Lanjut →
            </button>
          </div>
        </div>

      {/* Tahap — Penanggung Jawab */}
      <div className={step !== 2 ? "hidden" : "rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5"}>
          <h3 className="text-sm font-bold text-emerald-900">2. Informasi Penanggung Jawab</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700">Nama Lengkap <span className="text-red-500">*</span></label>
              <input name="nama_pj" required className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Jabatan <span className="text-red-500">*</span></label>
              <input name="jabatan" required placeholder="mis. Direktur Program" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Divisi/Departemen</label>
              <input name="divisi" placeholder="opsional" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Email Penanggung Jawab <span className="text-red-500">*</span></label>
              <input name="email_pj" type="email" required className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
              <p className="mt-1 text-[11px] text-zinc-400">Untuk komunikasi & verifikasi.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Nomor WhatsApp <span className="text-red-500">*</span></label>
              <input name="hp_pj" type="tel" required placeholder="+6281…" pattern="[0-9+\\-\s]{9,20}" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-emerald-200 px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
              ← Kembali
            </button>
            <button type="button" onClick={() => next([true])} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              Lanjut →
            </button>
          </div>
        </div>

      {/* Tahap — Dokumen Pendukung */}
      <div className={step !== 3 ? "hidden" : "rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5"}>
          <h3 className="text-sm font-bold text-emerald-900">3. Dokumen Pendukung</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700">Profil Organisasi (disarankan)</label>
              <input type="file" name="profil_org" accept=".pdf" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs" />
              <p className="mt-1 text-[11px] text-zinc-400">PDF, maks 5 MB.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Dokumen Legalitas (opsional)</label>
              <input type="file" name="dokumen_legal" accept=".pdf,.jpg,.png,.webp" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs" />
              <p className="mt-1 text-[11px] text-zinc-400">Sertifikat pendirian / SK / seleksi komite // PDF/JPG/PNG/WebP, maks 5 MB.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Surat Penunjukan Penanggung Jawab (opsional)</label>
              <input type="file" name="surat_penunjukan" accept=".pdf,.jpg,.png,.webp" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs" />
              <p className="mt-1 text-[11px] text-zinc-400">Bila email/telepon belum menyimpulkan kewenangan.</p>
            </div>
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="rounded-xl border border-emerald-200 px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
              ← Kembali
            </button>
            <button type="button" onClick={() => next([true])} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              Lanjut →
            </button>
          </div>
        </div>

      {/* Tahap — Buat Akun */}
      <div className={step !== 4 ? "hidden" : "rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5"}>
          <h3 className="text-sm font-bold text-emerald-900">4. Buat Akun Login</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700">Email login <span className="text-red-500">*</span></label>
              <input name="email" type="email" required placeholder="email@domain.org" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
              <p className="mt-1 text-[11px] text-zinc-400">Untuk login (boleh sama dengan email penanggung jawab).</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Nama Pengguna <span className="text-red-500">*</span></label>
              <input name="username" type="text" required minLength={3} maxLength={30} pattern="[a-z0-9_.-]+" placeholder="hanya huruf kecil, angka, _, -, ." className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Kata Sandi <span className="text-red-500">*</span></label>
              <input name="password" type="password" required minLength={8} pattern=".{8,}" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
              <p className="mt-1 text-[11px] text-zinc-400">Minimal 8 karakter.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Konfirmasi Kata Sandi <span className="text-red-500">*</span></label>
              <input name="password2" type="password" required minLength={8} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
              <p className="mt-1 text-[11px] text-zinc-400">Harus sama dengan di atas.</p>
            </div>
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(3)} className="rounded-xl border border-emerald-200 px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
              ← Kembali
            </button>
            <button type="button" onClick={() => setStep(5)} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              Lanjut →
            </button>
          </div>
        </div>

      {/* Tahap — Konfirmasi */}
      <div className={step !== 5 ? "hidden" : "rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5"}>
          <h3 className="text-sm font-bold text-emerald-900">5. Konfirmasi</h3>
          <p className="mt-1 text-sm text-zinc-600">Periksa sekali lagi — setelah dikirim, akun akan menunggu verifikasi admin.</p>
          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3 text-xs text-zinc-700">
              <input type="checkbox" name="setuju_data" required className="mt-0.5 h-4 w-4" />
              Saya menyatakan bahwa informasi organisasi yang diberikan adalah benar.
            </label>
            <label className="flex items-start gap-3 text-xs text-zinc-700">
              <input type="checkbox" name="setuju_sk" required className="mt-0.5 h-4 w-4" />
              Saya menyetujui Syarat dan Ketentuan penggunaan platform Pohon Asuh.
            </label>
            <label className="flex items-start gap-3 text-xs text-zinc-700">
              <input type="checkbox" name="setuju_privasi" required className="mt-0.5 h-4 w-4" />
              Saya menyetujui Kebijakan Privasi Pohon Asuh.
            </label>
          </div>
          <input type="hidden" name="idorga" value="" />
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(4)} className="rounded-xl border border-emerald-200 px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
              ← Kembali
            </button>
            <SubmitButton pendingLabel="Memproses pendaftaran…" className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700">
              Kirim Pendaftaran Mitra
            </SubmitButton>
          </div>
        </div>
    </form>
  );
}
