# Rencana Fitur: Self-Service Mitra (Akun Mitra)

> Status: **perencanaan** — menunggu konfirmasi scope. Implementasi akan bertahap.

## 1. Tujuan

Mitra (Jejakin) punya **akun login sendiri** dengan kemampuan:
1. Memesan/hold pohon sendiri (request → admin approve).
2. Input data adopsi sendiri (CSV/manual) untuk pohon yang ditahan.
3. Kelola sertifikat sendiri (lihat/unduh/share).
4. 1 mitra = 1 akun (akun terikat ke satu mitra).

Admin tetap approve hold request dan mengawasi.

## 2. Perubahan Data Model

### 2.1 Kolom baru: `member.mitra_id` (nullable FK → mitra)
- Akun member dengan role "Mitra" wajib punya `mitra_id`.
- Admin biasa / petugas: `mitra_id = null`.

### 2.2 Role baru: "Mitra"
- izin: `mitra` (sama dengan admin mitra, tapi scoping data per mitra_id).
- Dibuat manual oleh admin via Kelola Role, atau seed otomatis.

### 2.3 Status hold request (pohon)
- Saat mitra request hold: `pohon.adopted='reserved'`, `mitra_id` set, `reserved_name=mitra nama`, `approval_status='pending'`.
- Admin approve: `approval_status='approved'` (final, pohon resmi milik mitra).
- Admin reject: `adopted='available'`, `mitra_id=null`, `approval_status=null`.

Kolom baru: `data_pohon.approval_status` VARCHAR(20) nullable ('pending'/'approved').

Atau tabel terpisah `mitra_hold_request` (id, mitra_id, idpohon, status, created_at, approved_by, approved_at) — lebih bersih untuk audit. Rekomendasi: tabel terpisah.

## 3. Backend API

### 3.1 Akun mitra
- `GET mitramyinfo` (auth member): return mitra milik member (nama, slug, logo, tagging_template).
- Guard: member.mitra_id harus terisi & role Mitra.

### 3.2 Request hold (mitra)
- `POST mitrarequesthold` (auth member): idpohon (comma). Validasi pohon available & bukan milik mitra lain. Buat `mitra_hold_request` rows (status='pending'). Tidak mengubah pohon dulu.
- `GET mitramyrequests` (auth member): daftar request milik mitra + status.

### 3.3 Approve/reject (admin)
- `GET mitrapendingholds` (admin): daftar request pending (semua mitra) untuk admin.
- `POST mitraapprovehold` (admin): request_id → set pohon adopted='reserved', mitra_id, approval approved; update request status.
- `POST mitrarejecthold` (admin): request_id → release pohon; request status rejected.

### 3.4 Data mitra (scoping)
- `mitralist` sudah ada; tambah filter `?idmember`? Atau endpoint `mitramyinfo`.
- `inputadopsimitra` sudah ada — untuk self-service, mitra_id diambil dari session member (bukan input). Tambah param `idmember` opsional: bila diisi, validasi member.mitra_id == mitra_id.

### 3.5 Sertifikat mitra
- Sudah bisa via dashboard (member sees own adopsi via getconfirmasi with pengasuh=member id). Untuk adopsi mitra, pengasuh=0 saat ini → tidak muncul di dashboard member. 
- Perbaikan: saat input adopsi mitra, jika admin memilih "pengasuh = member mitra", set pengasuh=member id (opsional). Atau endpoint `mitramyadopsi` query Dataadopsi where mitra_id = member.mitra_id.
- Rekomendasi: tambah `GET mitramyadopsi` (auth member) → Dataadopsi where mitra_id = member.mitra_id.

## 4. Frontend

### 4.1 Akun mitra & login
- Mitra login via halaman login biasa (member). Setelah login, redirect ke `/mitra` (dashboard mitra) bila role Mitra.

### 4.2 Dashboard mitra (`/mitra` atau `/dashboard/mitra`)
- Ringkasan: jumlah pohon ditahan, adopsi tercatat, sertifikat.
- Menu: Pohon Saya, Input Adopsi, Sertifikat, Request Hold.

### 4.3 Request hold pohon (`/mitra/pohon`)
- Browse pohon available (reuse /pohon tapi dengan tombol "Request Hold" alih-alih "Adopsi").
- Submit request → admin approve.

### 4.4 Admin approve (`/admin/mitra-requests`)
- Daftar request pending per mitra, approve/reject.

### 4.5 Input adopsi (`/mitra/adopsi`)
- Reuse komponen MitraAdopsiForm, mitra_id fixed from session (tidak bisa pilih mitra lain).

### 4.6 Sertifikat (`/mitra/sertifikat`)
- Daftar adopsi mitra + link sertifikat/share.

## 5. Role & Izin

- Role "Mitra" dengan izin `mitra`.
- izin `mitra` sudah ada (backend + frontend). Tambah scoping: mitra hanya lihat data miliknya.
- Admin level 1 tetap akses semua.

## 6. Fase Implementasi

- **Fase A — Akun & link mitra**: migration member.mitra_id, role Mitra, guard mitra, endpoint mitramyinfo. (1 hari)
- **Fase B — Request hold**: tabel mitra_hold_request, endpoint request/approve/reject, admin page approve, mitra page request. (2-3 hari)
- **Fase C — Dashboard mitra + input adopsi + sertifikat**: halaman /mitra/* reusing komponen existing. (2 hari)
- **Fase D — Scoping & polish**: mitra hanya lihat data miliknya di semua endpoint; notifikasi; testing.

## 7. Pertanyaan Terbuka

1. **Approval hold**: admin approve manual, atau auto-approve jika pohon available? Rekomendasi: manual (admin kontrol).
2. **Input adopsi mitra**: mitra input sendiri ATAU tetap admin input dari data mitra? User bilang mitra bisa input sendiri — tapi data pengadopsi dari jaringan mitra, jadi mitra yang input (mereka yang punya data). Rekomendasi: mitra input sendiri, admin monitor.
3. **Sertifikat management**: mitra hanya lihat/unduh, atau juga bisa edit nama penerima/memo? Rekomendasi: lihat/unduh/share saja (edit tetap admin).
4. **Notifikasi**: mitra dapat notif saat hold approved/rejected + saat sertifikat terbit. Perlu push/FCM? Rekomendasi: in-app Pesan + email (opsional).
5. **Pohon yang ditahan mitra**: tampil di peta publik sebagai "Dipesan Mitra" atau disembunyikan? (sama pertanyaan sebelumnya).

## 8. Estimasi & Risiko

- Total ~5-7 hari kerja.
- Risiko: scoping data mitra (hindari kebocoran data antar mitra) — perlu middleware/guard yang konsisten. Testing cross-mitra wajib.

## 9. Langkah Selanjutnya

Konfirmasi scope (mulai Fase A? semua fase?) + jawaban pertanyaan §7. Setelah itu implementasi bertahap.