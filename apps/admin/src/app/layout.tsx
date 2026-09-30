import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Heebo } from "next/font/google";
import "./globals.css";

const sans = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-sans" });
const serif = Frank_Ruhl_Libre({ subsets: ["hebrew", "latin"], weight: ["500", "700", "800"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Menuz Admin",
  description: "עריכת תפריט ולוח הזמנות לצוות.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${sans.variable} ${serif.variable} ${sans.className} antialiased`}>{children}</body>
    </html>
  );
}
