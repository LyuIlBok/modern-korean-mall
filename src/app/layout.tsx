'use client';

import { Noto_Serif_KR, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartSidebar from "@/components/CartSidebar";
import ToastContainer from "@/components/Toast";
import { useLanguageStore } from "@/store/useLanguageStore";
import Script from "next/script";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { language } = useLanguageStore();

  return (
    <html lang={language}>
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

        <title>자연의 결 | 모던 한국 농산물 큐레이션</title>
        <meta name="naver-site-verification" content="bd26db4e27ea50f336cb8327f45f6edde12bf7b3" />
        <meta name="google-site-verification" content="j4r-CHUjYPZG8DYoa9SzzwEYxw_eTf5i_VqQsC17Ac8" />
        <meta name="description" content="꾸밈없는 자연의 산물과 정직한 농산물을 제안합니다. 연천 비무장지대 오대쌀, 유기농 꿀고구마 등 엄선된 산물을 만나보세요." />
        <meta name="keywords" content="농산물, 오대쌀, 꿀고구마, 유기농, 산지직송, 자연의결, 복이네농장, 한국농산물" />
        
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://modern-korean-mall.vercel.app" />
        <meta property="og:title" content="자연의 결 | Nature Texture" />
        <meta property="og:description" content="자연이 빚은 본연의 가치를 전합니다. 정직한 농부의 산물을 경험해보세요." />
        <meta property="og:image" content="https://modern-korean-mall.vercel.app/logo_main.png" />

        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="자연의 결 | Nature Texture" />
        <meta property="twitter:description" content="자연이 빚은 본연의 가치를 전합니다. 정직한 농부의 산물을 경험해보세요." />
        
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
      </body>
    </html>
  );
}
