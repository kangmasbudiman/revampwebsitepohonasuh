"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  TreePine,
  Users,
  Award,
  ShoppingCart,
  Newspaper,
  MapPin,
  Loader2,
} from "lucide-react";
import {
  searchGlobal,
} from "@/lib/actions/search";
import {
  EMPTY_GLOBAL_SEARCH,
  type ApiGlobalSearch,
  type ApiSearchPohon,
  type ApiSearchMember,
  type ApiSearchSertifikat,
  type ApiSearchOrder,
  type ApiSearchBlog,
  type ApiSearchDesa,
} from "@/lib/api";
import { rupiah } from "@/lib/format";

type Item = {
  key: string;
  title: string;
  mono?: boolean;
  subtitle: string;
  target: string;
};

type Section = { key: string; label: string; icon: typeof Search; items: Item[] };

function pohonItems(rows: ApiSearchPohon[]): Item[] {
  return rows.map((r) => ({
    key: `pohon-${r.id}`,
    title: r.code,
    mono: true,
    subtitle: [r.localName, r.desa].filter(Boolean).join(" · "),
    target: `/admin/pohon/${encodeURIComponent(r.code)}`,
  }));
}

function memberItems(rows: ApiSearchMember[]): Item[] {
  return rows.map((r) => ({
    key: `member-${r.id}`,
    title: r.name,
    subtitle: r.emaile || r.hp || `ID ${r.id}`,
    target: `/admin/user?q=${encodeURIComponent(r.emaile || r.name)}`,
  }));
}

function sertifikatItems(rows: ApiSearchSertifikat[]): Item[] {
  return rows.map((r) => ({
    key: `sertifikat-${r.id}`,
    title: r.certnum,
    mono: true,
    subtitle: [r.nama, r.invoice].filter(Boolean).join(" · "),
    target: `/admin/sertifikat?q=${encodeURIComponent(r.certnum)}`,
  }));
}

function orderItems(rows: ApiSearchOrder[]): Item[] {
  return rows.map((r) => ({
    key: `order-${r.id}`,
    title: r.invoice,
    mono: true,
    subtitle: [r.nama, rupiah(r.price)].filter(Boolean).join(" · "),
    // Detail verifikasi hanya ada untuk order yang belum diverifikasi;
    // order terverifikasi dilacak lewat sertifikatnya (filter invoice).
    target:
      r.confirmation === "no"
        ? `/admin/verifikasi/${r.id}`
        : `/admin/sertifikat?q=${encodeURIComponent(r.invoice)}`,
  }));
}

function blogItems(rows: ApiSearchBlog[]): Item[] {
  return rows.map((r) => ({
    key: `blog-${r.id}`,
    title: r.name,
    subtitle: r.kategori,
    target: `/admin/blog/${r.id}/edit`,
  }));
}

function desaItems(rows: ApiSearchDesa[]): Item[] {
  return rows.map((r) => ({
    key: `desa-${r.id}`,
    title: r.nama,
    subtitle: r.provinsi ?? "",
    target: `/admin/peta?desa=${encodeURIComponent(r.nama)}`,
  }));
}

function buildSections(r: ApiGlobalSearch): Section[] {
  return [
    { key: "pohon", label: "Pohon", icon: TreePine, items: pohonItems(r.pohon) },
    { key: "member", label: "Member", icon: Users, items: memberItems(r.member) },
    { key: "sertifikat", label: "Sertifikat", icon: Award, items: sertifikatItems(r.sertifikat) },
    { key: "order", label: "Order", icon: ShoppingCart, items: orderItems(r.order) },
    { key: "blog", label: "Blog", icon: Newspaper, items: blogItems(r.blog) },
    { key: "desa", label: "Desa", icon: MapPin, items: desaItems(r.desa) },
  ].filter((s) => s.items.length > 0);
}

export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ApiGlobalSearch>(EMPTY_GLOBAL_SEARCH);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  const sections = buildSections(results);
  const flat = sections.flatMap((s) => s.items);
  const typed = q.trim().length >= 2;

  // Fokus + pilih teks saat dialog dibuka.
  useEffect(() => {
    if (open) {
      setActiveIndex(flat.length > 0 ? 0 : -1);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Debounce 300ms; respons basi dibuang lewat reqId.
  useEffect(() => {
    const needle = q.trim();
    if (!open || needle.length < 2) {
      setResults(EMPTY_GLOBAL_SEARCH);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const r = await searchGlobal(needle);
      if (reqId.current !== id) return;
      setResults(r);
      setLoading(false);
      setActiveIndex(buildSections(r).flatMap((s) => s.items).length > 0 ? 0 : -1);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open]);

  // Item aktif selalu terlihat saat navigasi keyboard.
  useEffect(() => {
    document.querySelector<HTMLElement>("[data-search-active='true']")?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex]);

  if (!open) return null;

  const go = (target: string) => {
    onClose();
    router.push(target);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (flat.length === 0 ? -1 : Math.min(i + 1, flat.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (flat.length === 0 ? -1 : Math.max(i - 1, 0)));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[activeIndex];
      if (item) go(item.target);
    }
  };

  let idx = -1;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Pencarian global">
      <button
        type="button"
        aria-label="Tutup pencarian"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
      />
      <div className="animate-menu relative mx-auto mt-[10vh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-2xl dark:border-night-700">
        <div className="flex items-center gap-3 border-b border-emerald-100 px-4 dark:border-night-700">
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-600" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-emerald-600" />
          )}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Cari pohon, member, sertifikat, order, blog, desa…"
            className="w-full bg-transparent py-4 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <kbd className="hidden shrink-0 rounded-md border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 sm:block dark:border-night-700 dark:text-zinc-500">
            Esc
          </kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {!typed ? (
            <p className="px-3 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
              Ketik minimal 2 karakter untuk mencari di seluruh sistem.
            </p>
          ) : !loading && flat.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
              Tidak ada hasil untuk “{q.trim()}”.
            </p>
          ) : (
            sections.map((section) => (
              <div key={section.key} className="mb-1">
                <p className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70">
                  <section.icon className="h-3.5 w-3.5" />
                  {section.label}
                  <span className="font-normal normal-case tracking-normal text-zinc-400">
                    ({section.items.length})
                  </span>
                </p>
                {section.items.map((item) => {
                  idx += 1;
                  const active = idx === activeIndex;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      data-search-active={active || undefined}
                      onMouseEnter={() => setActiveIndex(flat.indexOf(item))}
                      onClick={() => go(item.target)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        active
                          ? "bg-emerald-50 dark:bg-night-800"
                          : "hover:bg-emerald-50/60 dark:hover:bg-night-800/60"
                      }`}
                    >
                      <span className="min-w-0">
                        <span
                          className={`block truncate text-sm font-medium text-zinc-800 dark:text-zinc-100 ${
                            item.mono ? "font-mono" : ""
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {item.subtitle}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-emerald-100 px-4 py-2 text-[11px] text-zinc-400 dark:border-night-700 dark:text-zinc-500">
          <span>↑↓ navigasi</span>
          <span>Enter buka</span>
          <span>Esc tutup</span>
        </div>
      </div>
    </div>
  );
}
