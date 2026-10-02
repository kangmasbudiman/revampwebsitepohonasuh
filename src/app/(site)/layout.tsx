import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { getSession } from "@/lib/auth";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();

  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-zinc-900">
      <SiteHeader session={session} />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
