"use client";

import { useState } from "react";

type Props = {
  name: string;
  defaultValue?: number | string | null;
  className?: string;
  placeholder?: string;
};

// Input budget yang langsung tampil dalam format Rupiah (Rp 1.000.000)
// sementara nilai mentah (angka) yang dikirim ke server lewat hidden input.
export default function RupiahInput({
  name,
  defaultValue = "",
  className = "",
  placeholder = "Rp 0",
}: Props) {
  const initial = Number(String(defaultValue ?? "").replace(/[^\d]/g, "")) || 0;
  const [value, setValue] = useState<number>(initial);

  const display = value > 0 ? `Rp ${value.toLocaleString("id-ID")}` : "";

  return (
    <>
      <input type="hidden" name={name} value={value > 0 ? String(value) : ""} />
      <input
        type="text"
        inputMode="numeric"
        value={display}
        placeholder={placeholder}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "");
          setValue(digits ? Number(digits) : 0);
        }}
        className={className}
      />
    </>
  );
}
