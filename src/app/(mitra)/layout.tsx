import MitraNav from "@/components/mitra-nav";
import MitraFooter from "@/components/mitra-footer";

export default async function MitraLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-zinc-900">
      <MitraNav />
      <div className="flex flex-1 flex-col">{children}</div>
      <MitraFooter />
    </div>
  );
}
