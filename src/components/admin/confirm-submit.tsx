"use client";

// Tombol submit untuk aksi destruktif/irreversible: konfirmasi dulu
// sebelum form dikirim.
export default function ConfirmSubmit({
  children,
  message,
  className,
  disabled,
  title,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      disabled={disabled}
      title={title}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
