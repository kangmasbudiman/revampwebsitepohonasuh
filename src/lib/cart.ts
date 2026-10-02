export type CartItem = {
  code: string;
  localName: string;
  desa: string;
  priceIdr: number; // harga per tahun
  photoUrl: string | null;
  years?: number; // durasi adopsi (default 1)
  giftName?: string; // nama penerima sertifikat (adopsi hadiah)
  giftNote?: string; // memo/pesan di sertifikat
};

const KEY = "pa_cart_v1";
const EVENT = "cart-changed";
export const MAX_YEARS = 5;

// Snapshot harus referensi stabil — array baru tiap getSnapshot memicu
// infinite loop di useSyncExternalStore.
const EMPTY: CartItem[] = [];
let cache: CartItem[] | null = null;

export function serverSnapshot(): CartItem[] {
  return EMPTY;
}

export function normalizeYears(v: unknown): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_YEARS);
}

function readStore(): CartItem[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed
      .filter(
        (i): i is CartItem =>
          i && typeof i.code === "string" && typeof i.localName === "string",
      )
      .map((i) => ({
        ...i,
        years: normalizeYears(i.years),
        giftName: typeof i.giftName === "string" ? i.giftName : "",
        giftNote: typeof i.giftNote === "string" ? i.giftNote : "",
      }));
  } catch {
    return EMPTY;
  }
}

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return EMPTY;
  if (cache === null) cache = readStore();
  return cache;
}

function save(items: CartItem[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  cache = items;
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function addToCart(item: CartItem): "added" | "duplicate" {
  const items = getCart();
  if (items.some((i) => i.code === item.code)) return "duplicate";
  save([...items, item]);
  return "added";
}

export function removeFromCart(code: string) {
  save(getCart().filter((i) => i.code !== code));
}

// Ubah durasi / info hadiah satu item (dipakai halaman keranjang).
export function updateCartItem(
  code: string,
  patch: Partial<Pick<CartItem, "years" | "giftName" | "giftNote">>,
) {
  save(
    getCart().map((i) =>
      i.code === code
        ? {
            ...i,
            ...patch,
            years: normalizeYears(patch.years ?? i.years),
          }
        : i,
    ),
  );
}

export function clearCart() {
  save([]);
}

export function subscribe(cb: () => void): () => void {
  const handler = () => {
    cache = null;
    cb();
  };
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
