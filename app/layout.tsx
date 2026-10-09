import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monad Radar · Token X-ray",
  description: "Who really controls that Monad token? Holder clusters, insider links, flows and an AI risk verdict — powered by Nansen.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Suspense fallback={<div className="h-16 border-b border-border" />}>
          <Header />
        </Suspense>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        <footer className="mx-auto w-full max-w-7xl px-4 pb-8 pt-4 text-xs text-muted sm:px-6">
          Data: Nansen API (Smart Money, Token God Mode, Profiler) · AI: OpenRouter · Built for Monad Metropolis.
          Not financial advice.
        </footer>
      </body>
    </html>
  );
}
