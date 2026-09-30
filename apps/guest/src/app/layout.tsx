import type { Metadata } from "next";
import { Noto_Sans_Hebrew, Noto_Serif_Hebrew } from "next/font/google";
import "./globals.css";

const sans = Noto_Sans_Hebrew({
  subsets: ["hebrew", "latin"],
  variable: "--font-sans",
});

const serif = Noto_Serif_Hebrew({
  subsets: ["hebrew", "latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Menuz Tableside",
  description: "תפריט שולחן לדדה, לשף עידן הלפרין ול-BEER TIME.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${sans.variable} ${serif.variable} ${sans.className} antialiased`}>{children}</body>
    </html>
  );
}
