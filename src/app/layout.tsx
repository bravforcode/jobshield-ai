import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "JobShield AI — Career mobility for the Thai labour market",
    template: "%s · JobShield AI",
  },
  description:
    "A two-layer recommender that ranks next-step occupations from a PPMI skill graph and a Dijkstra-min-cost transition graph. Built on real job-posting co-occurrence.",
  keywords: [
    "career mobility",
    "Thai labour market",
    "skill graph",
    "PPMI",
    "Dijkstra",
    "wage gap",
  ],
  openGraph: {
    title: "JobShield AI",
    description: "Where can you go next in the Thai labour market, and why.",
    type: "website",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "JobShield AI" }],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrains.variable}`}>
      <head>
        <JsonLd />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased print:bg-white">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
