'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Loader2, DollarSign, Package } from 'lucide-react';

interface ProductOption {
  id: string;
  option_name: string;
  additional_price: number;
}

export default function ProductOptionModal({ 
  product, 
  onClose 
}: { 
  product: any, 
  onClose: () => void 
}) {
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // New Option State
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const fetchOptions = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('product_options')
      .select('*')
      .eq('product_id', product.id)
      .order('created_at', { ascending: true });
    
    if (data) setOptions(data);
    setIsLoading(false);
  }, [product.id]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('product_options')
        .insert([{
          product_id: product.id,
          option_name: newName,
          additional_price: Number(newPrice || 0)
        }]);

      if (error) throw error;
      
      setNewName('');
      setNewPrice('');
      fetchOptions();
    } catch (err) {
      console.error('Failed to add option:', err);
      alert('옵션 추가에 실패했습니다.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteOption = async (id: string) => {
    if (!confirm('이 옵션을 삭제하시겠습니까?')) return;

    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('product_options')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchOptions();
    } catch (err) {
      console.error('Failed to delete option:', err);
      alert('옵션 삭제에 실패했습니다.');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" 
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 20 }} 
        className="relative bg-white w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-border-light flex justify-between items-center bg-hanji-white">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-amber-600" />
            <div className="space-y-0.5">
              <h2 className="font-serif text-xl text-charcoal">옵션 관리</h2>
              <p className="text-[10px] text-muted uppercase tracking-widest font-bold">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-muted hover:text-charcoal">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Add Option Form */}
          <form onSubmit={handleAddOption} className="bg-hanji-white p-6 rounded-sm border border-border-light space-y-4">
            <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-bold">New Option</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <input 
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="옵션명 (예: 5kg, 특상급)"
                  className="w-full bg-white border border-border-light px-4 py-3 rounded-sm text-sm focus:border-amber-500 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">₩</div>
                <input 
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="추가 금액"
                  className="w-full bg-white border border-border-light pl-8 pr-4 py-3 rounded-sm text-sm focus:border-amber-500 outline-none transition-all"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={isActionLoading}
              className="w-full bg-amber-600 text-white py-3 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-amber-700 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Option
            </button>
          </form>

          {/* Options List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-bold">Existing Options ({options.length})</p>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {isLoading ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted" /></div>
              ) : options.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted italic border border-dashed border-border-light rounded-sm">등록된 옵션이 없습니다.</div>
              ) : (
                options.map((opt) => (
                  <div key={opt.id} className="flex items-center justify-between p-4 bg-white border border-border-light rounded-sm hover:border-amber-200 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-hanji-white flex items-center justify-center text-amber-600 font-serif font-bold italic border border-border-light">O</div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-charcoal">{opt.option_name}</p>
                        <p className="text-[10px] text-muted font-medium">+₩{opt.additional_price.toLocaleString()}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteOption(opt.id)}
                      disabled={isActionLoading}
                      className="p-2 text-muted hover:text-terracotta transition-colors group-hover:opacity-100 opacity-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-hanji-white px-8 py-4 border-t border-border-light flex justify-between items-center">
          <p className="text-[10px] text-muted italic">* 옵션은 즉시 실제 상점에 반영됩니다.</p>
          <button onClick={onClose} className="text-xs font-bold uppercase tracking-widest text-charcoal hover:text-amber-600 transition-colors">Done</button>
        </div>
      </motion.div>
    </div>
  );
}
