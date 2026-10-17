import { toSvg } from "html-to-image";

// Capture node → PNG via canvas. toBlob bawaan html-to-image menggambar
// canvas segera setelah decode() — di Chrome, raster foreignObject SVG
// masih lazy sehingga hasilnya bisa kehilangan overlay DOM/CSS (hanya
// <img> yang sempat tampil). Tunggu dua frame + jeda ekstra sebelum
// drawImage; tanpa jeda overlay hilang, dengan jeda tampil penuh.
export async function renderNodeToPng(
  node: HTMLElement,
  width: number,
  height: number,
): Promise<Blob> {
  const dataUrl = await toSvg(node, { width, height, pixelRatio: 1 });
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => img.decode().then(() => resolve(), reject);
    img.onerror = () => reject(new Error("gagal memuat SVG capture"));
    img.src = dataUrl;
  });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 250));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("context 2d tidak tersedia");
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("toBlob PNG kosong");
  return blob;
}
