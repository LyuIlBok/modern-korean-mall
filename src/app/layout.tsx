import { Noto_Serif_KR, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartSidebar from "@/components/CartSidebar";
import ToastContainer from "@/components/Toast";
import ChatWidget from "@/components/ChatWidget";
import Script from "next/script";
import { Metadata } from 'next';

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Google Tag Manager (GTM) */}
        <Script id="gtm-script" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-KM6X382D');`}
        </Script>

        {/* Google Analytics (GA4) */}
        <Script 
          async 
          src="https://www.googletagmanager.com/gtag/js?id=G-13W7B0K2Y1" 
          strategy="afterInteractive" 
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-13W7B0K2Y1');
          `}
        </Script>

        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${notoSerif.variable} ${notoSans.variable} font-sans antialiased bg-hanji-white text-charcoal flex flex-col min-h-screen selection:bg-deep-sage selection:text-white`}>
        <noscript>
          <iframe 
            src="https://www.googletagmanager.com/ns.html?id=GTM-KM6X382D"
            height="0" 
            width="0" 
            style={{ display: 'none', visibility: 'hidden' }}
          ></iframe>
        </noscript>

        <Header />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <Footer />
        <CartSidebar />
        <ToastContainer />
        <ChatWidget />
      </body>
    </html>
  );
}
