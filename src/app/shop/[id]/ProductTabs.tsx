'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Product } from '@/data/mockData';
import { Star, MessageSquare, Info } from 'lucide-react';

export default function ProductTabs({ product }: { product: Product }) {
  const [activeTab, setActiveTab] = useState<'detail' | 'review' | 'qa'>('detail');

  const tabs = [
    { id: 'detail', label: '상세 정보', icon: Info },
    { id: 'review', label: '리뷰 (12)', icon: Star },
    { id: 'qa', label: '문의 (3)', icon: MessageSquare },
  ];

  return (
    <div className="border-t border-border-light pt-16">
      {/* Tab Navigation */}
      <div className="flex justify-center gap-12 border-b border-border-light mb-16">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 px-2 font-serif text-xl flex items-center gap-2 transition-all relative ${
              activeTab === tab.id ? 'text-charcoal' : 'text-muted hover:text-charcoal'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-terracotta' : 'text-muted'}`} />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-charcoal" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto min-h-[400px]">
        {activeTab === 'detail' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative aspect-[16/9] w-full rounded-sm overflow-hidden shadow-sm">
              <Image src={product.imageUrl} alt="상세1" fill className="object-cover" />
            </div>
            <div className="text-center space-y-6">
              <h3 className="font-serif text-3xl text-deep-sage tracking-tight">자연의 결이 약속하는 품질</h3>
              <p className="text-lg text-charcoal/70 leading-relaxed font-light max-w-2xl mx-auto">
                우리는 가장 정직한 방식으로 기른 산물만을 고집합니다.<br/>
                인위적인 가공을 최소화하고, 자연이 준 모습 그대로를 전달하기 위해<br/>
                수확부터 포장까지 모든 과정을 직접 관리합니다.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-border-light/20 p-8 rounded-sm">
                <h4 className="font-serif text-xl mb-4">보관 방법</h4>
                <p className="text-sm text-muted leading-relaxed">직사광선을 피하고 서늘한 곳에 보관해 주세요. 신선식품의 경우 수령 즉시 냉장 보관을 권장합니다.</p>
              </div>
              <div className="bg-border-light/20 p-8 rounded-sm">
                <h4 className="font-serif text-xl mb-4">배송 안내</h4>
                <p className="text-sm text-muted leading-relaxed">전국 어디든 꼼꼼하게 포장하여 발송합니다. 산지 직송 시스템으로 가장 신선한 상태를 유지합니다.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {[1, 2, 3].map((i) => (
               <div key={i} className="border-b border-border-light pb-8">
                 <div className="flex items-center gap-2 mb-3">
                   <div className="flex gap-0.5">
                     {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-terracotta text-terracotta" />)}
                   </div>
                   <span className="text-sm font-medium ml-2">김*현</span>
                   <span className="text-xs text-muted">2026.03.20</span>
                 </div>
                 <p className="text-charcoal/80 text-sm leading-relaxed mb-4">
                   역시 믿고 먹는 자연의 결입니다. 포장부터 명조체 폰트까지 정성이 가득 느껴져서 선물용으로도 너무 좋았어요. 
                   제품 본연의 맛이 살아있어서 정말 만족합니다!
                 </p>
                 <div className="flex gap-2">
                   <div className="relative w-16 h-16 rounded-sm overflow-hidden border border-border-light">
                     <Image src={product.imageUrl} alt="리뷰" fill className="object-cover" />
                   </div>
                 </div>
               </div>
             ))}
             <button className="w-full py-4 border border-border-light text-sm text-muted hover:text-charcoal transition-colors">리뷰 더보기 (9+)</button>
          </div>
        )}

        {activeTab === 'qa' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-hanji-white border border-border-light p-12 text-center space-y-4">
              <MessageSquare className="w-8 h-8 text-deep-sage mx-auto opacity-50" />
              <p className="text-charcoal/60">등록된 문의사항이 없습니다.</p>
              <button className="bg-charcoal text-white px-6 py-2.5 text-sm rounded-sm hover:bg-deep-sage transition-colors">문의하기</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}