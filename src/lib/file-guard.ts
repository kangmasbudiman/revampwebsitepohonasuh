// Kawal ukuran file upload di browser (dipakai form admin).
// File >2MB ditandai invalid via setCustomValidity — submit diblokir
// browser + tooltip muncul, jadi file besar tak pernah dikirim ke server
// (Server Action bodySizeLimit 3mb akan memutus koneksi dengan error
// janggal bila lolos sampai situ).
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export function cekUkuranFile(e: React.ChangeEvent<HTMLInputElement>) {
  const input = e.currentTarget;
  const f = input.files?.[0];
  input.setCustomValidity(
    f && f.size > MAX_UPLOAD_BYTES
      ? `Ukuran ${f.name} ${(f.size / 1048576).toFixed(1)} MB — maksimal 2 MB.`
      : "",
  );
}
