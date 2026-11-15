# Rencana Fitur: Kolaborasi Mitra (Jejakin)

> Status: **perencanaan** — belum diimplementasi. Menunggu konfirmasi scope dari user.

## 1. Konteks & Alur Bisnis

- Mitra (Jejakin) **memesan sejumlah pohon** ke Pohon Asuh (procurement).
- Jejakin **menawarkan kembali** pohon tersebut ke pengadopsi melalui jaringan mereka.
- Pohon Asuh **menunggu data pengadopsi dari Jejakin**, baru menginput ke website untuk pencatatan adopsi + penerbitan sertifikat.
- Data adopsi harus **dibedakan per mitra** (rekap & pelaporan).
- Mitra punya **design tagging (papan taging) sendiri**.

## 2. Perbedaan dengan Flow Existing

| Aspek | Adopsi normal | Adopsi mitra (Jejakin) |
|---|---|---|
| Pemesan | Member sendiri | Mitra (Jejakin) |
| Pembayaran | Member bayar → verifikasi admin | Sudah dilunasi mitra (procurement) |
| Input data | Member checkout | Admin input dari data mitra |
| Verifikasi | Ada (bukti transfer) | Tidak perlu (pre-paid) |
| Sertifikat | Setelah verifikasi + tagging | Langsung terbit (certnum) |
| Tagging | Desain standar | Desain khusus mitra |
| Rekap | Umum | Per mitra |

## 3. Perubahan Data Model (Backend)

### 3.1 Tabel baru: `mitra`

```sql
CREATE TABLE mitra (
  id BIGINT PK,
  nama VARCHAR(100) NOT NULL,        -- "Jejakin"
  slug VARCHAR(100) UNIQUE,          -- "jejakin"
  logo VARCHAR(255) NULL,            -- filename di public/assets
  tagging_template VARCHAR(255) NULL, -- desain papan taging khusus mitra
  cert_template_id BIGINT NULL,       -- FK template_sertifikat (opsional)
  aktif TINYINT DEFAULT 1,
  created_at, updated_at
);
```

Catatan: tabel `partner` yang ada dipakai untuk logo "Didukung Oleh" di beranda — **jangan dicampur**. Buat tabel `mitra` terpisah untuk tracking adopsi.

### 3.2 Kolom baru

- `data_adopsi.mitra_id` (nullable FK → mitra) — penanda asal mitra.
- `data_pohon.mitra_id` (nullable FK → mitra) — pohon yang "ditahan" untuk mitra (belum diadopsi publik, tapi sudah dimiliki mitra).
- `fototaging.mitra_id` (nullable, opsional) — atau derivasi via idadopsi → data_adopsi.mitra_id.

### 3.3 Status pohon baru

Tambah status efektif di admin table:
- `MITRA` — pohon milik mitra (adopted='reserved', mitra_id set, reserved_admin=0). Tidak bisa diadopsi publik, tidak muncul di filter "Tersedia".

`pohonBisaDiadopsi()` tetap `adopted='available'` → pohon mitra otomatis tidak bisa diadopsi publik.

## 4. Backend API Baru / Diubah

### 4.1 CRUD Mitra
- `GET mitralist` — daftar mitra aktif
- `POST tambahmitra`, `POST editmitra`, `POST hapusmitra`
- `POST uploadtaggingmitra` — upload desain papan taging mitra (pola uploadcover)

### 4.2 Penahanan pohon untuk mitra
- `POST pesanpohonmitra` — admin menahan N pohon untuk mitra (mirip pesanpohonadminbanyak tapi tanpa invoice/order; set mitra_id, adopted='reserved', reserved_name=nama mitra). Atau reuse `pesanpohonadminbanyak` dengan flag `mitra_id`?

  Rekomendasi: endpoint terpisah `tahanpohonmitra` (idpohon, mitra_id) — tidak membuat Confirmasi (karena pembayaran procurement ditangani terpisah/offline). Pohon jadi status MITRA.

### 4.3 Input adopsi dari data mitra (bulk)
- `POST inputadopsimitra` — payload: mitra_id + array adopsi {idpohon, nama, dur, tgl_adopt, memo?}. Untuk tiap baris:
  - Validasi pohon milik mitra (mitra_id cocok) & belum diadopsi.
  - Buat Dataadopsi: mitra_id, pengasuh=0 (atau member jika ada), nama, price=harga×dur, dur, tgl_adopt, tgl_exp, certnum='' (terbit lazy), proses=1, invoice='' (atau generate invoice mitra?), admin=1.
  - Set pohon: adopted='reserved' → nanti 'adopted' setelah tagging? Atau langsung 'adopted' karena pre-paid. Rekomendasi: langsung `adopted='adopted'` + isiCertnum langsung, karena tidak ada verifikasi pembayaran. Tagging (foto papan) tetap dilakukan belakangan (proses 1→3).
  - Issuing certnum langsung: panggil isiCertnum per invoice. Tapi invoice kosong → isiCertnum butuh invoice. Opsi: generate invoice mitra (mis. `#MITRA-<mitra>-<seq>`) atau buat Confirmasi dengan methode='Mitra' (pre-paid, confirmation='yes' langsung). Rekomendasi: buat Confirmasi methode='Mitra', confirmation='yes', confirmationBy=admin, price=total, lalu isiCertnum. Ini membuat adopsi mitra muncul di Data Adopsi (sudah) dan punya invoice untuk rekap.

### 4.4 kedaluwarsaPembayaran
- Tambah exclusion: `methode != 'Mitra'` (sama seperti Admin) — agar tidak auto-batal.

### 4.5 ordercustomer / Data Adopsi
- `ordercustomer` sudah join Dataadopsi → mitra_id ikut (tambah ke select).
- `getconfirmasi` (member dashboard) — adopsi mitra biasanya pengasuh=0 (tidak ada member) → tidak muncul di dashboard member. OK, karena mitra adopsi bukan member. Tapi kalau mitra memberikan akun pengadopsi (member), set pengasuh=member id → muncul di dashboard member (bonus). Rekomendasi: dukung opsional `idmember` per baris adopsi mitra.

## 5. Frontend (Web Admin)

### 5.1 Menu Mitra
- Halaman baru `/admin/mitra` — CRUD mitra (nama, logo, upload desain tagging, pilih template sertifikat default). Permission: level 1 atau role ber-izin `mitra`.

### 5.2 Kelola Pohon
- Status baru "Dipesan Mitra" di tab filter (selain Tersedia/Dipesan Admin/dll).
- Tombol "Tahan untuk Mitra" (bulk) — pilih pohon tersedia → pilih mitra → set mitra_id + status MITRA.
- Pohon mitra tidak bisa diadopsi publik (pohonBisaDiadopsi false).

### 5.3 Input Adopsi Mitra (halaman baru `/admin/adopsi-mitra`)
- Pilih mitra.
- Upload CSV/Excel (nama pengadopsi, kode pohon, durasi, tanggal adopsi, memo) ATAU input manual baris per baris.
- Preview + validasi (pohon milik mitra & belum diadopsi).
- Submit → backend inputadopsimitra → tampilkan hasil (jumlah sukses, gagal + alasan).
- Tidak perlu upload bukti (pre-paid).

### 5.4 Data Adopsi
- Filter baru "Mitra" (dropdown) selain Provinsi/Lokasi/Tahun.
- Kolom "Mitra" di tabel (atau badge).
- Export CSV tambah kolom Mitra.
- AdopsiCharts: breakdown per mitra (opsional).

### 5.5 Tagging
- Papan taging (`/admin/tagging/[id]/papan`): jika adopsi punya mitra dengan tagging_template, pakai template mitra; fallback ke desain standar.
- PapanTaging component menerima prop `taggingTemplate` (file) — override background.

### 5.6 Sertifikat
- `template_sertifikat` sudah ada; mitra bisa punya `cert_template_id` default. Saat share sertifikat mitra, pakai template mitra bila ada.

### 5.7 Reporting
- Halaman `/admin/laporan-mitra` (opsional) — rekap per mitra: jumlah pohon, total donasi, periode, breakdown desa. Atau tambahkan filter mitra ke laporan existing.

## 6. Role & Izin

- Tambah izin baru: `mitra` (kelola mitra & input adopsi mitra).
- Role baru: `Admin Mitra` (izin: memo + mitra) untuk staff yang menangani mitra.
- Opsional: role `Mitra` (read-only) untuk akun mitra sendiri — lihat data adopsinya (defer ke fase 2).

Backend: `izinValid()` tambah `'mitra'`; frontend `hak.ts` tambah `'mitra'`.

## 7. Fase Implementasi (usulan)

- **Fase 1 — Fondasi data** (backend): migration mitra + kolom mitra_id di data_adopsi & data_pohon; CRUD mitra; izin `mitra`. Deploy backend.
- **Fase 2 — Penahanan pohon** (backend+frontend): tahanpohonmitra + tab "Dipesan Mitra" di Kelola Pohon.
- **Fase 3 — Input adopsi mitra**: endpoint inputadopsimitra + halaman upload CSV/manual + validasi + notifikasi hasil.
- **Fase 4 — Rekap & filter**: filter mitra di Data Adopsi + export CSV + (opsional) laporan.
- **Fase 5 — Tagging & sertifikat mitra**: desain tagging khusus per mitra di papan taging + template sertifikat default mitra.

## 8. Pertanyaan Terbuka (butuh keputusan user)

1. **Pembayaran procurement mitra** ditangani di luar website (offline) atau perlu dicatat (invoice mitra)? Rekomendasi: offline, tapi tetap simpan `total` di Confirmasi methode='Mitra' untuk rekap.
2. **Member account untuk pengadopsi mitra** — apakah Jejakin mengirim akun member existing atau hanya nama? Jika nama saja, pengasuh=0 (seperti adopsi admin sebelumnya); pengadopsi tidak punya dashboard. Jika member, set pengasuh=member id → muncul di dashboard (bonus).
3. **Sertifikat mitra** — pakai template sertifikat standar atau mitra punya desain sendiri juga (selain tagging)? Rekomendasi: dukung keduanya (cert_template_id per mitra, nullable).
4. **Tagging desain** — apakah mitra upload file sendiri (seperti template_share) atau admin yang upload atas nama mitra? Rekomendasi: admin upload (pola uploadcover), mitra tinggal kirim file.
5. **Pohon mitra** — apakah pohon yang ditahan mitra tetap tampil di peta publik? Rekomendasi: **tidak** (adopted='reserved' → tidak adoptable; tapi tetap tampil di peta sebagai "sudah dipesan mitra"?). Perlu keputusan UX.
6. **Multi-mitra** — apakah satu pohon bisa berganti mitra sebelum diadopsi? Rekomendasi: ya, admin bisa "lepas" pohon dari mitra (set mitra_id=null, adopted='available') selama belum diadopsi.

## 9. Estimasi & Risiko

- Fase 1–2: backend + sedikit frontend, ~1-2 hari.
- Fase 3 (CSV import): paling kompleks (validasi, preview, error reporting), ~2-3 hari.
- Fase 4–5: ~1-2 hari.
- Risiko: data mitra besar (ribuan adopsi) → bulk insert harus transaksional & idempotent (hindari duplikat certnum). Rekomendasi: dedup by (mitra_id + idpohon) dan gunakan DB transaction per batch.

## 10. Langkah Selanjutnya

Tunggu konfirmasi user atas:
- Scope fase (mulai dari Fase 1? atau langsung 1–3?).
- Jawaban pertanyaan terbuka §8.
- Nama mitra pertama (Jejakin) + sample data CSV yang akan dikirim.