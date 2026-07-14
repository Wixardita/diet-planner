import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://altiora-estates.example"),
  title: "ALTIORA ESTATES — Luxury Beyond Roads",
  description: "Flight-access luxury estates for exceptional remote properties restored for the era of personal flight.",
  openGraph: { title: "ALTIORA ESTATES", description: "Luxury Beyond Roads.", images: ["/images/hero-altiora.svg"] },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
