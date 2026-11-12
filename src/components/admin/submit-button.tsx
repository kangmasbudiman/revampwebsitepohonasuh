"use client";

import { useFormStatus } from "react-dom";
import { Loader2, type LucideIcon } from "lucide-react";

// Tombol submit form server-action: otomatis menampilkan spinner & tidak
// bisa diklik dua kali saat proses berjalan (useFormStatus = pending).
export default function SubmitButton({
  children,
  className = "",
  title,
  disabled,
  pendingLabel = "Memproses…",
  icon: Icon,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  disabled?: boolean;
  pendingLabel?: string;
  icon?: LucideIcon;
}) {
  const { pending } = useFormStatus();
  const aktif = pending || disabled;

  return (
    <button
      type="submit"
      title={title}
      disabled={aktif}
      aria-busy={pending}
      className={`${className} ${aktif ? "cursor-wait opacity-70" : ""}`}
    >
      {pending ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon aria-hidden className="h-4 w-4" />
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}
