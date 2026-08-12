import { Noto_Serif_KR, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartSidebar from "@/components/CartSidebar";
import ToastContainer from "@/components/Toast";
import ChatWidget from "@/components/ChatWidget";
import AnnouncementPopup from "@/components/layout/AnnouncementPopup";
import PwaRegister from "@/components/pwa/PwaRegister";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import Script from "next/script";
import { Metadata } from 'next';
import { GoogleTagManager, GoogleAnalytics } from '@next/third-parties/google';

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

export const metadata: Metadata = {
  title: {
    default: '자연의 결 | 모던 한국 농산물 큐레이션',
    template: '%s | 자연의 결'
  },
  description: '꾸밈없는 자연의 산물과 정직한 농부의 마음을 전합니다. 연천 비무장지대 오대쌀, 유기농 꿀고구마 등 엄선된 우리 농산물을 만나보세요.',
  keywords: ['농산물', '오대쌀', '꿀고구마', '유기농', '산지직송', '자연의결', '복이네농장', '한국농산물', '프리미엄농산물'],
  authors: [{ name: '복이네농장' }],
  openGraph: {
    title: '자연의 결 | Nature Texture',
    description: '자연이 빚은 본연의 가치를 전합니다. 정직한 농부의 산물을 경험해보세요.',
    url: 'https://modern-korean-mall.vercel.app',
    siteName: '자연의 결',
    images: [
      {
        url: 'https://modern-korean-mall.vercel.app/logo_main.png',
        width: 1200,
        height: 630,
        alt: '자연의 결 메인 이미지',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '자연의 결 | Nature Texture',
    description: '자연이 빚은 본연의 가치를 전합니다.',
    images: ['https://modern-korean-mall.vercel.app/logo_main.png'],
  },
  robots: 'index, follow',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4A5D4E',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <GoogleTagManager gtmId="GTM-KM6X382D" />
      <GoogleAnalytics gaId="G-13W7B0K2Y1" />
      <head>
        {/* PortOne V2 SDK */}
        <Script 
          src="https://cdn.portone.io/v2/browser-sdk.js" 
          strategy="lazyOnload" 
        />

        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={`${notoSerif.variable} ${notoSans.variable} font-sans antialiased bg-hanji-white text-charcoal flex flex-col min-h-screen selection:bg-deep-sage selection:text-white`}>
        <PwaRegister />
        <AnnouncementPopup />
        <Header />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <Footer />
        <CartSidebar />
        <ToastContainer />
        <ChatWidget />
        <InstallPrompt />
      </body>
    </html>
  );
}
