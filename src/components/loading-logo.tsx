import Image from "next/image";

export default function LoadingLogo({ label = "Memuat data" }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      <div className="relative h-20 w-20">
        <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-pa-ring" />
        <span
          className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-pa-ring"
          style={{ animationDelay: "0.8s" }}
        />
        <Image
          src="/images/logo_icon.png"
          alt="Logo Pohon Asuh"
          width={80}
          height={80}
          priority
          className="relative h-full w-full rounded-full object-cover shadow-md animate-pa-bounce"
        />
      </div>
      <p className="flex items-center gap-0.5 text-sm font-medium text-emerald-700">
        {label}
        <span className="animate-pulse">.</span>
        <span className="animate-pulse [animation-delay:200ms]">.</span>
        <span className="animate-pulse [animation-delay:400ms]">.</span>
      </p>
    </div>
  );
}
