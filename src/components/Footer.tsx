'use client';

import { Mail, Phone, MapPin, Instagram, Youtube, Facebook, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useLanguageStore } from '@/store/useLanguageStore';
import { CONFIG } from '@/lib/config';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguageStore();

  return (
    <footer className="bg-hanji-white border-t border-border-light pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <div className="relative h-10 w-40">
              <Image 
                src="/logo_horizontal.jfif" 
                alt="자연의 결" 
                fill 
                className="object-contain filter grayscale"
              />
            </div>
            <p className="text-sm text-muted leading-relaxed max-w-xs">
              {t.common.footerDesc}
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted hover:text-charcoal transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="text-muted hover:text-charcoal transition-colors"><Youtube className="w-5 h-5" /></a>
              <a href="#" className="text-muted hover:text-charcoal transition-colors"><Facebook className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-sm text-charcoal uppercase tracking-widest mb-6">Menu</h4>
            <ul className="space-y-4 text-xs text-muted tracking-wide">
              <li><a href="/shop" className="hover:text-deep-sage transition-colors">{t.common.shop}</a></li>
              <li><a href="/about" className="hover:text-deep-sage transition-colors">{t.common.about}</a></li>
              <li><a href="/support/refund" className="hover:text-deep-sage transition-colors">{t.common.refundPolicy}</a></li>
              <li><a href="/mypage" className="hover:text-deep-sage transition-colors">{t.common.mypage}</a></li>
            </ul>
          </div>

          {/* Support Info */}
          <div>
            <h4 className="font-serif text-sm text-charcoal uppercase tracking-widest mb-6">{t.common.customerCenter}</h4>
            <div className="space-y-4 text-xs text-muted tracking-wide">
              <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {CONFIG.CONTACT_PHONE}</p>
              <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {CONFIG.CONTACT_EMAIL}</p>
              <p className="leading-relaxed">
                평일 10:00 - 17:00 <br/>
                점심 12:00 - 13:00 <br/>
                (주말 및 공휴일 휴무)
              </p>
            </div>
          </div>

          {/* Business Info */}
          <div className="lg:col-span-1">
            <h4 className="font-serif text-sm text-charcoal uppercase tracking-widest mb-6">{t.common.businessInfo}</h4>
            <div className="space-y-2 text-[11px] text-muted leading-relaxed font-light">
              <p><span className="font-medium text-charcoal/70">상호명:</span> 농업회사법인 복이네농장(주)</p>
              <p><span className="font-medium text-charcoal/70">대표자:</span> 유일복</p>
              <p><span className="font-medium text-charcoal/70">사업자등록번호:</span> 763-88-03163</p>
              <p><span className="font-medium text-charcoal/70">통신판매업신고:</span> 제 2024-경기연천-00069 호</p>
              <p><span className="font-medium text-charcoal/70">호스팅제공자:</span> Vercel Inc.</p>
              <p className="flex items-start gap-1.5"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /> 경기도 연천군 군남면 청정로2194번길 366-59</p>
            </div>
          </div>
        </div>

        {/* Escrow & Safety */}
        <div className="mb-12 p-6 bg-white/50 border border-border-light rounded-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-hanji-white rounded-full flex items-center justify-center border border-border-light">
              <ShieldCheck className="w-6 h-6 text-deep-sage" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-charcoal">{t.common.escrowTitle}</p>
              <p className="text-[10px] text-muted leading-relaxed">{t.common.escrowDesc}</p>
            </div>
          </div>
          <button className="text-[10px] px-4 py-2 border border-border-light hover:bg-charcoal hover:text-white transition-all uppercase tracking-widest">{t.common.escrowConfirm}</button>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border-light flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-6 text-[10px] text-muted uppercase tracking-widest">
            <a href="#" className="hover:text-charcoal transition-colors font-medium text-deep-sage">{t.common.privacyPolicy}</a>
            <a href="#" className="hover:text-charcoal transition-colors">{t.common.termsOfService}</a>
            <a href="/support/refund" className="hover:text-charcoal transition-colors font-bold text-terracotta underline">{t.common.refundPolicy}</a>
          </div>
          <p className="text-[10px] text-muted font-light tracking-tighter">
            &copy; {currentYear} NATURE TEXTURE (복이네농장). All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
