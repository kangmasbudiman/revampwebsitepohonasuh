import LoadingLogo from "@/components/loading-logo";
import ScrollTopOnMount from "@/components/scroll-top-on-mount";

export default function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <ScrollTopOnMount />
      <LoadingLogo />
    </main>
  );
}
