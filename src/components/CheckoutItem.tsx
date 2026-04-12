'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCartStore } from '@/store/useCartStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { CartItem as CartItemType, ProductOption } from '@/types';
import { formatPrice } from '@/lib/utils';
import { Plus, Minus, ChevronDown, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function CheckoutItem({ item }: { item: CartItemType }) {
  const { updateQuantity, updateOption, removeItem } = useCartStore();
  const { t } = useLanguageStore();
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

  const totalPrice = (item.price + (item.optionPrice || 0)) * item.quantity;

  return (
    <div className="flex gap-8 items-center group">
      <div className="relative w-20 h-24 rounded-sm overflow-hidden flex-shrink-0 border border-white/10 shadow-lg">
        <Image src={item.imageUrl} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
      </div>
      <div className="flex-1 space-y-3">
        <p className="font-serif text-base font-medium leading-snug">{item.name}</p>
        
        <div className="flex flex-col gap-3">
          {/* Option Selector */}
          {options.length > 0 ? (
            <div className="relative inline-block w-full max-w-[220px]">
              <select 
                value={options.find(o => o.option_name === item.optionName)?.id || ''}
                onChange={(e) => handleOptionChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 pl-3 pr-8 py-2 rounded-sm text-xs font-bold text-white/70 appearance-none cursor-pointer hover:border-white/30 transition-all focus:outline-none shadow-inner"
              >
                {options.map(opt => {
                  const isSoldOut = opt.stock <= 0 || !opt.is_active;
                  return (
                    <option key={opt.id} value={opt.id} disabled={isSoldOut} className="bg-charcoal text-white text-sm">
                      {opt.option_name} (+{formatPrice(opt.additional_price)}){isSoldOut ? ' (품절)' : ''}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
            </div>
          ) : isLoadingOptions ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-white/20" />
              <span className="text-xs text-white/20 uppercase tracking-widest font-bold">Options...</span>
            </div>
          ) : (
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black">Base Option</p>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-white/10 rounded-sm bg-white/5 overflow-hidden">
              <button 
                type="button"
                onClick={() => {
                  if (item.quantity > 1) {
                    updateQuantity(item.id, item.quantity - 1, item.optionName);
                  } else {
                    removeItem(item.id, item.optionName);
                  }
                }} 
                className="p-2 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-8 text-center text-xs font-serif font-bold border-x border-white/5">{item.quantity}</span>
              <button 
                type="button"
                onClick={() => updateQuantity(item.id, item.quantity + 1, item.optionName)} 
                className="p-2 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <span className="text-[10px] text-white/30 uppercase tracking-widest font-black">{t?.checkout?.units || '개'}</span>
          </div>
        </div>
      </div>
      <p className="font-serif text-lg font-bold text-white/90">{formatPrice(totalPrice)}</p>
    </div>
  );
}
