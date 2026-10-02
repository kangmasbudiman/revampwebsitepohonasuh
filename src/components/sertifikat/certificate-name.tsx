"use client";

import { useLayoutEffect, useRef } from "react";

// Nama penerima di sertifikat: mengecil otomatis agar selalu muat satu baris
// di area nama (posisi & ukuran dasar dari template PDF). h1 = satu-satunya
// heading halaman (juga dipakai E2E e2e-adopsi utk membaca nama pemegang).
export default function CertificateName({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const h1Ref = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const el = h1Ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    const fit = () => {
      // Hapus inline font-size dulu agar ukuran dari class (cqw) berlaku;
      // inline style selalu menang atas class — dulu "100%" di sini
      // membuat nama selalu jatuh ke 16px turunan body.
      el.style.removeProperty("font-size");
      const base = parseFloat(getComputedStyle(el).fontSize);
      const avail = parent.clientWidth;
      if (el.scrollWidth > avail) {
        const scale = avail / el.scrollWidth;
        el.style.fontSize = `${Math.max(base * 0.45, Math.floor(base * scale))}px`;
      }
    };
    fit();

    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [name]);

  return (
    <h1
      ref={h1Ref}
      className={`inline-block max-w-full whitespace-nowrap ${className ?? ""}`}
    >
      {name}
    </h1>
  );
}
