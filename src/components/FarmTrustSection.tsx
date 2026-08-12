'use client';

import { ShieldCheck, Truck, HeartHandshake, Leaf, Award } from 'lucide-react';

export default function FarmTrustSection() {
  return (
    <section className="py-16 bg-gradient-to-b from-hanji-white/60 to-white border-y border-border-light font-sans">
      <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-12">
        
        {/* Header Title */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-deep-sage/10 text-deep-sage text-xs font-bold uppercase tracking-widest border border-deep-sage/20">
            <Leaf className="w-3.5 h-3.5" /> Nature Texture Promise
          </div>
          <h2 className="font-serif text-3xl md:text-4xl text-charcoal font-bold leading-tight">
            자연의 결이 약속하는 4가지 정직함
          </h2>
          <p className="text-sm text-muted font-light leading-relaxed">
            경기도 연천의 비옥한 토양에서 생산자가 직접 땀 흘려 가꾼 고품질 산물만을 엄선하여 정성껏 전해드립니다.
          </p>
        </div>

        {/* 4 Core Value Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: 산지 직송 */}
          <div className="bg-white p-8 rounded-sm border border-border-light shadow-sm hover:shadow-md hover:border-deep-sage/30 transition-all space-y-4 group">
            <div className="w-12 h-12 rounded-sm bg-hanji-white border border-border-light flex items-center justify-center text-deep-sage group-hover:bg-deep-sage group-hover:text-white transition-colors">
              <Truck className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-charcoal">오전 10시 당일 수확 출하</h3>
              <p className="text-xs text-muted leading-relaxed">
                매일 오전 수확한 가장 신선한 농산물을 중간 유통 단계 없이 산지에서 직접 포장하여 바로 발송합니다.
              </p>
            </div>
          </div>

          {/* Card 2: 100% 안심 보장 */}
          <div className="bg-white p-8 rounded-sm border border-border-light shadow-sm hover:shadow-md hover:border-deep-sage/30 transition-all space-y-4 group">
            <div className="w-12 h-12 rounded-sm bg-hanji-white border border-border-light flex items-center justify-center text-deep-sage group-hover:bg-deep-sage group-hover:text-white transition-colors">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-charcoal">100% 신선도 품질 보장제</h3>
              <p className="text-xs text-muted leading-relaxed">
                배송 중 파손이나 신선도에 문제가 있으실 경우 사진을 보내주시면 즉시 100% 교환/환불해 드립니다.
              </p>
            </div>
          </div>

          {/* Card 3: 친환경 보냉 포장 */}
          <div className="bg-white p-8 rounded-sm border border-border-light shadow-sm hover:shadow-md hover:border-deep-sage/30 transition-all space-y-4 group">
            <div className="w-12 h-12 rounded-sm bg-hanji-white border border-border-light flex items-center justify-center text-deep-sage group-hover:bg-deep-sage group-hover:text-white transition-colors">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-charcoal">친환경 안심 보냉 포장</h3>
              <p className="text-xs text-muted leading-relaxed">
                환경을 생각하는 재생지 보냉 패키징과 완충재로 신선함은 살리고 자연에 무해하게 전달합니다.
              </p>
            </div>
          </div>

          {/* Card 4: 엄선된 고품질 */}
          <div className="bg-white p-8 rounded-sm border border-border-light shadow-sm hover:shadow-md hover:border-deep-sage/30 transition-all space-y-4 group">
            <div className="w-12 h-12 rounded-sm bg-hanji-white border border-border-light flex items-center justify-center text-deep-sage group-hover:bg-deep-sage group-hover:text-white transition-colors">
              <Award className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-charcoal">생산자 유일복의 이름을 걸고</h3>
              <p className="text-xs text-muted leading-relaxed">
                농업회사법인 복이네농장의 자부심을 담아, 나와 내 가족이 먹는다는 마음으로 바르게 선별합니다.
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
