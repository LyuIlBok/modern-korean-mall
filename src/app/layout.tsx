import type { Metadata } from "next";
import { Noto_Serif_KR, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartSidebar from "@/components/CartSidebar";

const notoSerifKr = Noto_Serif_KR({
  weight: ["200", "400", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif-kr",
});

const notoSansKr = Noto_Sans_KR({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
});

export const metadata: Metadata = {
  title: "자연의 결 | 모던 한국 농산물",
  description: "여백의 미가 깃든 한국적인 농산물 및 농자재 큐레이션 숍",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSerifKr.variable} ${notoSansKr.variable}`}>
      <body className="bg-hanji-white text-charcoal font-sans antialiased min-h-screen flex flex-col selection:bg-deep-sage selection:text-white">
        <Header />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <Footer />
        <CartSidebar />
      </body>
    </html>
  );
}