'use client';

import { Noto_Serif_KR, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartSidebar from "@/components/CartSidebar";
import ToastContainer from "@/components/Toast";
import { useLanguageStore } from "@/store/useLanguageStore";

const notoSerif = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "900"],
  variable: "--font-serif",
});

const notoSans = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  variable: "--font-sans",
});

// 클라이언트 컴포넌트라 metadata를 직접 내보낼 수 없으므로, 
// 별도의 SEO 컴포넌트나 Head 태그를 사용하거나 layout 구성을 변경해야 합니다.
// 여기서는 기본 구조를 유지하며 최적화합니다.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { language } = useLanguageStore();

  return (
    <html lang={language}>
      <head>
        <title>자연의 결 | 모던 한국 농산물 큐레이션</title>
        <meta name="description" content="꾸밈없는 자연의 산물과 정직한 농산물을 제안합니다. 연천 비무장지대 오대쌀, 유기농 꿀고구마 등 엄선된 산물을 만나보세요." />
        <meta name="keywords" content="농산물, 오대쌀, 꿀고구마, 유기농, 산지직송, 자연의결, 복이네농장, 한국농산물" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://modern-korean-mall.vercel.app/" />
        <meta property="og:title" content="자연의 결 | Nature Texture" />
        <meta property="og:description" content="자연이 빚은 본연의 가치를 전합니다. 정직한 농부의 산물을 경험해보세요." />
        <meta property="og:image" content="https://modern-korean-mall.vercel.app/logo_main.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="자연의 결 | Nature Texture" />
        <meta property="twitter:description" content="자연이 빚은 본연의 가치를 전합니다. 정직한 농부의 산물을 경험해보세요." />
        
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${notoSerif.variable} ${notoSans.variable} font-sans antialiased bg-hanji-white text-charcoal flex flex-col min-h-screen selection:bg-deep-sage selection:text-white`}>
        <Header />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <Footer />
        <CartSidebar />
        <ToastContainer />
      </body>
    </html>
  );
}
