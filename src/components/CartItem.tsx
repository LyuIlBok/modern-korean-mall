'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCartStore } from '@/store/useCartStore';
import { CartItem as CartItemType, ProductOption } from '@/types';
import { formatPrice } from '@/lib/utils';
import { Trash2, Plus, Minus, ChevronDown, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function CartItem({ item }: { item: CartItemType }) {
  const { updateQuantity, updateOption, removeItem } = useCartStore();
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      setIsLoadingOptions(true);
      const { data } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', item.id)
        .order('created_at', { ascending: true });
      
      if (data) setOptions(data as ProductOption[]);
      setIsLoadingOptions(false);
    };
    fetchOptions();
  }, [item.id]);

  const handleOptionChange = (newOptionId: string) => {
    const opt = options.find(o => o.id === newOptionId);
    if (opt) {
      updateOption(item.id, item.optionName, opt.option_name, opt.additional_price);
    }
  };

  return (
    <div className="flex gap-6 items-center group bg-hanji-white/30 p-4 rounded-sm border border-border-light/50 shadow-sm">
      <div className="relative w-28 h-32 bg-white rounded-sm overflow-hidden border border-border-light flex-shrink-0 shadow-inner">
        <Image src={item.imageUrl} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
      </div>
      <div className="flex-1 flex flex-col justify-between py-1 min-h-[120px]">
        <div>
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1 pr-4">
              <h3 className="font-serif text-xl text-charcoal leading-tight line-clamp-1">{item.name}</h3>
              
              {/* Option Selector */}
              {options.length > 0 ? (
                <div className="relative inline-block min-w-[140px]">
                  <select 
                    value={options.find(o => o.option_name === item.optionName)?.id || ''}
                    onChange={(e) => handleOptionChange(e.target.value)}
                    className="w-full bg-white border border-border-light pl-4 pr-10 py-2 rounded-full text-xs font-bold text-muted appearance-none cursor-pointer hover:border-deep-sage transition-all focus:outline-none shadow-sm"
                  >
                    {options.map(opt => {
                      const isSoldOut = opt.stock <= 0 || !opt.is_active;
                      return (
                        <option key={opt.id} value={opt.id} disabled={isSoldOut}>
                          {opt.option_name} (+{formatPrice(opt.additional_price)}){isSoldOut ? ' (품절)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted" />
                </div>
              ) : isLoadingOptions ? (
                <div className="flex items-center gap-2 py-1">
                  <Loader2 className="w-4 h-4 animate-spin text-muted" />
                  <span className="text-xs text-muted font-medium">옵션 불러오는 중...</span>
                </div>
              ) : (
                <p className="text-xs text-muted italic font-medium opacity-60">기본 옵션</p>
              )}
            </div>
            <button 
              onClick={() => removeItem(item.id, item.optionName)}
              className="text-muted hover:text-terracotta transition-colors p-2 hover:bg-white rounded-full shadow-sm"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          <p className="text-base font-bold text-charcoal/80 mt-2">
            {formatPrice(item.price + (item.optionPrice || 0))}
          </p>
        </div>
        
        <div className="flex justify-between items-center mt-6">
          {/* Quantity Selector */}
          <div className="flex items-center border border-border-light rounded-sm bg-white shadow-sm overflow-hidden">
            <button 
              onClick={() => {
                if (item.quantity > 1) {
                  updateQuantity(item.id, item.quantity - 1, item.optionName);
                } else {
                  removeItem(item.id, item.optionName);
                }
              }} 
              className="p-2.5 hover:bg-hanji-white hover:text-deep-sage transition-all border-r border-border-light"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-12 text-center text-lg font-serif font-bold">{item.quantity}</span>
            <button 
              onClick={() => updateQuantity(item.id, item.quantity + 1, item.optionName)} 
              className="p-2.5 hover:bg-hanji-white hover:text-deep-sage transition-all border-l border-border-light"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xl font-black text-charcoal">
            {formatPrice((item.price + (item.optionPrice || 0)) * item.quantity)}
          </p>
        </div>
      </div>
    </div>
  );
}
