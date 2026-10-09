import type { ApiOrderRow } from "@/lib/api";

// Seleksi pohon untuk unduh massal papan taging (/admin/tagging): dipakai
// bersama checkbox per kartu (PapanCheck) dan bar aksi (PapanBatchBar).
// Snapshot harus referensi stabil — Map baru dibuat hanya saat berubah.
const EMPTY = new Map<number, ApiOrderRow>();
let selected: ReadonlyMap<number, ApiOrderRow> = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function papanSnapshot(): ReadonlyMap<number, ApiOrderRow> {
  return selected;
}

export function togglePapan(order: ApiOrderRow) {
  const next = new Map(selected);
  if (next.has(order.id)) next.delete(order.id);
  else next.set(order.id, order);
  selected = next;
  emit();
}

// Conteng sekaligus ("Conteng Semua" petugas): ganti seluruh seleksi dengan
// daftar papan yang akan diproses pada tampilan/tab aktif.
export function setPapanSelection(orders: ApiOrderRow[]) {
  const next = new Map<number, ApiOrderRow>();
  for (const o of orders) next.set(o.id, o);
  selected = next.size > 0 ? next : EMPTY;
  emit();
}

export function clearPapanSelection() {
  if (selected.size === 0) return;
  selected = EMPTY;
  emit();
}

export function subscribePapan(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
