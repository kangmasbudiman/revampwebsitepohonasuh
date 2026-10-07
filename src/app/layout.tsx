import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { getDict, getLocale } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const m = (await getDict()).metadata;
  return {
    title: {
      default: m.defaultTitle,
      template: "%s | Pohon Asuh",
    },
    description: m.defaultDesc,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('pa_theme')==='dark'&&location.pathname.startsWith('/admin'))document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark')}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
