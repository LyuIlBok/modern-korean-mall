'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCartStore, CartItem as CartItemType } from '@/store/useCartStore';
import { Trash2, Plus, Minus, ChevronDown, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ProductOption {
  id: string;
  option_name: string;
  additional_price: number;
  stock: number;
  is_active: boolean;
}

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
    <div className="flex gap-5 group">
      <div className="relative w-24 h-28 bg-hanji-white rounded-sm overflow-hidden border border-border-light flex-shrink-0">
        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
      </div>
      <div className="flex-1 flex flex-col justify-between py-1">
        <div>
          <div className="flex justify-between items-start">
            <div className="space-y-1.5 flex-1 pr-4">
              <h3 className="font-serif text-lg text-charcoal leading-tight line-clamp-1">{item.name}</h3>
              
              {/* Option Selector */}
              {options.length > 0 ? (
                <div className="relative inline-block min-w-[120px]">
                  <select 
                    value={options.find(o => o.option_name === item.optionName)?.id || ''}
                    onChange={(e) => handleOptionChange(e.target.value)}
                    className="w-full bg-hanji-white border border-border-light pl-3 pr-8 py-1 rounded-full text-[10px] font-bold text-muted appearance-none cursor-pointer hover:border-deep-sage transition-colors focus:outline-none"
                  >
                    {options.map(opt => {
                      const isSoldOut = opt.stock <= 0 || !opt.is_active;
                      return (
                        <option key={opt.id} value={opt.id} disabled={isSoldOut}>
                          {opt.option_name} (+₩{opt.additional_price.toLocaleString()}){isSoldOut ? ' (품절)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted" />
                </div>
              ) : isLoadingOptions ? (
                <div className="flex items-center gap-2 py-1">
                  <Loader2 className="w-3 h-3 animate-spin text-muted" />
                  <span className="text-[10px] text-muted">옵션 불러오는 중...</span>
                </div>
              ) : (
                <p className="text-[10px] text-muted italic">기본 옵션</p>
              )}
            </div>
            <button 
              onClick={() => removeItem(item.id, item.optionName)}
              className="text-muted hover:text-terracotta transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm font-medium text-charcoal/60 mt-1">
            ₩{(item.price + (item.optionPrice || 0)).toLocaleString()}
          </p>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          {/* Quantity Selector */}
          <div className="flex items-center border border-border-light rounded-sm bg-hanji-white">
            <button 
              onClick={() => updateQuantity(item.id, item.quantity - 1, item.optionName)} 
              className="p-1.5 hover:text-deep-sage transition-colors"
              disabled={item.quantity <= 1}
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-8 text-center text-xs font-serif">{item.quantity}</span>
            <button 
              onClick={() => updateQuantity(item.id, item.quantity + 1, item.optionName)} 
              className="p-1.5 hover:text-deep-sage transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <p className="text-sm font-bold text-charcoal">
            ₩{((item.price + (item.optionPrice || 0)) * item.quantity).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
