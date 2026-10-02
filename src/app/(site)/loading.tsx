import LoadingLogo from "@/components/loading-logo";
import ScrollTopOnMount from "@/components/scroll-top-on-mount";

export default function Loading() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
      <ScrollTopOnMount />
      <LoadingLogo />
    </main>
  );
}
