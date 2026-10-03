import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default 1mb menolak upload 1-2MB yang sebenarnya sah (batas app 2MB).
      // 3mb: file >2MB tetap sampai ke action agar validasi server yang
      // membalas pesan ramah; file >3mb disaring di browser (file-guard).
      bodySizeLimit: "3mb",
    },
  },
  images: {
    // Next 16 memblokir optimizer dari mengambil image di IP privat
    // (SSRF guard) — API dev lokal berjalan di 127.0.0.1:8000.
    // ALLOW_LOCAL_IP=1 untuk uji E2E terhadap `next start` lokal.
    dangerouslyAllowLocalIP:
      process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_IP === "1",
    remotePatterns: [
      // Foto pohon disimpan sebagai URL penuh ke domain utama
      { protocol: "https", hostname: "pohonasuh.org", pathname: "/**" },
      { protocol: "https", hostname: "www.pohonasuh.org", pathname: "/**" },
      // Bukti transfer & foto lain dilayani host API
      // (.io = domain API utama baru; .org tetap dipakai mobile Play Store)
      { protocol: "https", hostname: "rest.pohonasuh.io", pathname: "/**" },
      { protocol: "https", hostname: "rest.pohonasuh.org", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000", pathname: "/**" },
      // Foto tagging lama (sebelum pindah ke storage API) di Supabase
      { protocol: "https", hostname: "*.supabase.co", pathname: "/**" },
    ],
  },
};

export default nextConfig;
