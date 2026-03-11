import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://card-lens.vercel.app";
const SITE_TITLE = "Card Lens - Real-time Trading Card Recognition";
const SITE_DESCRIPTION = "Identify Pokemon, One Piece, Riftbound, and Hololive cards in real-time using your camera. Get instant prices, rarity, and card details.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Card Lens",
  },
  description: SITE_DESCRIPTION,
  keywords: ["trading card", "card scanner", "pokemon tcg", "one piece tcg", "riftbound", "hololive ocg", "card recognition", "card prices", "card collection", "TCG"],
  authors: [{ name: "Card Lens" }],
  creator: "Card Lens",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Card Lens",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  verification: {
    google: "n_3Hjp7UaJBRHoWOqgU_S01qImIBPdK672FldkQFGvI",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-[family-name:var(--font-geist-sans)] antialiased`}
        suppressHydrationWarning
      >
        <div className="relative z-10">{children}</div>
        <Toaster
          theme="dark"
          position="bottom-center"
          toastOptions={{
            style: {
              background: "rgba(39, 39, 42, 0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#e4e4e7",
              backdropFilter: "blur(12px)",
            },
          }}
        />
      </body>
    </html>
  );
}
