import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Šarže Manager",
  description: "Správa šarží, skladu a výroby",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-50 font-sans antialiased">
        <Nav />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
