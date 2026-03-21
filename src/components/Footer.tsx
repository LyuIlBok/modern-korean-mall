'use client';

import Link from 'next/image';
import { Mail, Phone, MapPin, Instagram, Youtube, Facebook } from 'lucide-react';
import Image from 'next/image';

export default function Footer() {
  const currentYear = new Date().getFullYear();

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
              자연이 빚은 본연의 가치를 전합니다. <br/>
              우리는 정직한 땀방울로 길러낸 <br/>
              단아한 산물만을 엄선하여 제안합니다.
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
              <li><a href="/shop" className="hover:text-deep-sage transition-colors">전체 상품 (Collection)</a></li>
              <li><a href="/about" className="hover:text-deep-sage transition-colors">브랜드 스토리 (Our Story)</a></li>
              <li><a href="/support" className="hover:text-deep-sage transition-colors">고객 지원 (Support)</a></li>
              <li><a href="/mypage" className="hover:text-deep-sage transition-colors">마이페이지 (My Page)</a></li>
            </ul>
          </div>

          {/* Support Info */}
          <div>
            <h4 className="font-serif text-sm text-charcoal uppercase tracking-widest mb-6">Customer Center</h4>
            <div className="space-y-4 text-xs text-muted tracking-wide">
              <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> 010-0000-0000</p>
              <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> support@nature-texture.com</p>
              <p className="leading-relaxed">
                평일 10:00 - 17:00 <br/>
                점심 12:00 - 13:00 <br/>
                (주말 및 공휴일 휴무)
              </p>
            </div>
          </div>

          {/* Business Info (PG 심사 필수) */}
          <div className="lg:col-span-1">
            <h4 className="font-serif text-sm text-charcoal uppercase tracking-widest mb-6">Business Information</h4>
            <div className="space-y-2 text-[11px] text-muted leading-relaxed font-light">
              <p><span className="font-medium text-charcoal/70">상호명:</span> 농업회사법인 복이네농장(주)</p>
              <p><span className="font-medium text-charcoal/70">대표자:</span> 유일복</p>
              <p><span className="font-medium text-charcoal/70">사업자등록번호:</span> [번호를 입력해주세요]</p>
              <p><span className="font-medium text-charcoal/70">통신판매업신고:</span> 제 2024-서울-0000호</p>
              <p className="flex items-start gap-1.5"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /> [사업장 주소를 입력해주세요]</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border-light flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-6 text-[10px] text-muted uppercase tracking-widest">
            <a href="#" className="hover:text-charcoal transition-colors font-medium text-deep-sage">개인정보처리방침</a>
            <a href="#" className="hover:text-charcoal transition-colors">이용약관</a>
            <a href="#" className="hover:text-charcoal transition-colors">사업자정보확인</a>
          </div>
          <p className="text-[10px] text-muted font-light tracking-tighter">
            &copy; {currentYear} NATURE TEXTURE (복이네농장). All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
