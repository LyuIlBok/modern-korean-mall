'use client';

import { GraduationCap, ArrowRight, Sparkles, Coins } from 'lucide-react';
import Link from 'next/link';

export default function StudyRewardBanner() {
  return (
    <div className="bg-charcoal text-white rounded-sm overflow-hidden p-8 md:p-10 relative shadow-xl font-sans">
      {/* Background Subtle Pattern & Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-deep-sage/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        
        <div className="space-y-3 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-deep-sage/30 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-400/20">
            <Sparkles className="w-3.5 h-3.5" /> 스마트 팜 어학 연동 혜택
          </div>
          
          <h3 className="font-serif text-2xl md:text-3xl text-white font-bold leading-tight flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-deep-sage" />
            단어장 복습하고 적립금 받으세요!
          </h3>
          
          <p className="text-sm text-gray-300 font-light leading-relaxed">
            농업·식물보호기사 라이트너 단어장에서 매일 퀴즈를 풀면, 자연의 결 쇼핑몰에서 바로 사용할 수 있는 **쇼핑몰 적립금**이 자동으로 쌓입니다.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-sm border border-white/15 flex items-center gap-3">
            <Coins className="w-5 h-5 text-amber-400" />
            <div className="text-left">
              <p className="text-[10px] text-gray-300 uppercase tracking-widest font-bold">Daily Reward</p>
              <p className="text-sm font-bold text-white">1회 복습당 포인트 지급</p>
            </div>
          </div>

          <Link 
            href="/mypage" 
            className="bg-deep-sage hover:bg-emerald-700 text-white font-bold text-sm px-6 py-4 rounded-sm transition-all flex items-center justify-center gap-2 uppercase tracking-wider shadow-md hover:shadow-emerald-900/30 whitespace-nowrap"
          >
            적립금 보상 확인하기 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}
