import type { ApiOrderRow } from "@/lib/api";

// Seleksi pohon "akan ditagging" untuk membuat Laporan Kegiatan dari menu
// Order Tagging (/admin/tagging) — dipakai checkbox per kartu
// (LaporanPohonCheck) dan bar aksi (LaporanBatchBar). Snapshot harus
// referensi stabil — Map baru dibuat hanya saat berubah.
const EMPTY = new Map<number, ApiOrderRow>();
let selected: ReadonlyMap<number, ApiOrderRow> = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function laporanPohonSnapshot(): ReadonlyMap<number, ApiOrderRow> {
  return selected;
}

export function toggleLaporanPohon(order: ApiOrderRow) {
  const next = new Map(selected);
  if (next.has(order.id)) next.delete(order.id);
  else next.set(order.id, order);
  selected = next;
  emit();
}

export function clearLaporanSelection() {
  if (selected.size === 0) return;
  selected = EMPTY;
  emit();
}

export function subscribeLaporan(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
