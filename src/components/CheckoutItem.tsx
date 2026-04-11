'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCartStore, CartItem as CartItemType } from '@/store/useCartStore';
import { Plus, Minus, ChevronDown, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ProductOption {
  id: string;
  option_name: string;
  additional_price: number;
  stock: number;
  is_active: boolean;
}

export default function CheckoutItem({ item }: { item: CartItemType }) {
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

  const totalPrice = (item.price + (item.optionPrice || 0)) * item.quantity;

  return (
    <div className="flex gap-6 items-center group">
      <div className="relative w-16 h-20 rounded-sm overflow-hidden flex-shrink-0 border border-white/10">
        <Image src={item.imageUrl} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
      </div>
      <div className="flex-1 space-y-2">
        <p className="font-serif text-sm line-clamp-1">{item.name}</p>
        
        <div className="flex flex-col gap-2">
          {/* Option Selector */}
          {options.length > 0 ? (
            <div className="relative inline-block w-full max-w-[180px]">
              <select 
                value={options.find(o => o.option_name === item.optionName)?.id || ''}
                onChange={(e) => handleOptionChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 pl-2 pr-6 py-1 rounded-sm text-[9px] font-bold text-white/60 appearance-none cursor-pointer hover:border-white/30 transition-colors focus:outline-none"
              >
                {options.map(opt => {
                  const isSoldOut = opt.stock <= 0 || !opt.is_active;
                  return (
                    <option key={opt.id} value={opt.id} disabled={isSoldOut} className="bg-charcoal text-white">
                      {opt.option_name} (+₩{opt.additional_price.toLocaleString()}){isSoldOut ? ' (품절)' : ''}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
            </div>
          ) : isLoadingOptions ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-2.5 h-2.5 animate-spin text-white/20" />
              <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Options...</span>
            </div>
          ) : (
            <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Base Option</p>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-white/10 rounded-sm bg-white/5">
              <button 
                type="button"
                onClick={() => {
                  if (item.quantity > 1) {
                    updateQuantity(item.id, item.quantity - 1, item.optionName);
                  } else {
                    removeItem(item.id, item.optionName);
                  }
                }} 
                className="p-1 hover:text-white transition-colors text-white/40"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <span className="w-6 text-center text-[10px] font-serif">{item.quantity}</span>
              <button 
                type="button"
                onClick={() => updateQuantity(item.id, item.quantity + 1, item.optionName)} 
                className="p-1 hover:text-white transition-colors text-white/40"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-medium">units</span>
          </div>
        </div>
      </div>
      <p className="font-serif text-sm">₩{totalPrice.toLocaleString()}</p>
    </div>
  );
}
