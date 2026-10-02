import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pohon Asuh — Adopt Trees, Save The World",
    template: "%s | Pohon Asuh",
  },
  description:
    "Program adopsi pohon untuk melindungi hutan adat dan hutan desa bersama masyarakat lokal di Indonesia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
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
