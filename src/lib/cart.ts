export type CartItem = {
  code: string;
  localName: string;
  desa: string;
  priceIdr: number; // harga per tahun
  photoUrl: string | null;
  years?: number; // durasi adopsi (default 1)
  giftName?: string; // nama penerima sertifikat (adopsi hadiah)
  giftNote?: string; // memo/pesan di sertifikat
  addedAt?: number; // epoch ms — item otomatis keluar setelah 1 × 24 jam
};

export type ExpiredNotice = { code: string; localName: string };

const KEY = "pa_cart_v1";
const EXPIRED_KEY = "pa_cart_expired_v1";
const EVENT = "cart-changed";
export const MAX_YEARS = 5;
export const CART_TTL_MS = 24 * 60 * 60 * 1000;

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
    let migrated = false;
    const now = Date.now();
    const items = parsed
      .filter(
        (i): i is CartItem =>
          i && typeof i.code === "string" && typeof i.localName === "string",
      )
      .map((i) => {
        if (typeof i.addedAt !== "number") migrated = true;
        return {
          ...i,
          years: normalizeYears(i.years),
          giftName: typeof i.giftName === "string" ? i.giftName : "",
          giftNote: typeof i.giftNote === "string" ? i.giftNote : "",
          // keranjang lama tanpa stempel dianggap baru dimasukkan
          addedAt: typeof i.addedAt === "number" ? i.addedAt : now,
        };
      });
    const alive = items.filter((i) => now - i.addedAt < CART_TTL_MS);
    const expired = items.filter((i) => now - i.addedAt >= CART_TTL_MS);
    if (expired.length) recordExpired(expired);
    if (expired.length || migrated) {
      window.localStorage.setItem(KEY, JSON.stringify(alive));
    }
    return alive;
  } catch {
    return EMPTY;
  }
}

function recordExpired(items: CartItem[]) {
  try {
    const prev = JSON.parse(window.localStorage.getItem(EXPIRED_KEY) ?? "[]");
    const list = Array.isArray(prev) ? prev : [];
    const next = [
      ...items.map((i) => ({ code: i.code, localName: i.localName })),
      ...list,
    ].slice(0, 8);
    window.localStorage.setItem(EXPIRED_KEY, JSON.stringify(next));
  } catch {
    // abaikan — notifikasi bersifat best-effort
  }
}

export function getExpiredNotice(): ExpiredNotice[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(EXPIRED_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is ExpiredNotice =>
        e && typeof e.code === "string" && typeof e.localName === "string",
    );
  } catch {
    return [];
  }
}

export function dismissExpiredNotice() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(EXPIRED_KEY);
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
  save([...items, { ...item, addedAt: item.addedAt ?? Date.now() }]);
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
