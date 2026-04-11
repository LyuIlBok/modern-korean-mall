'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  X, Plus, Loader2, CheckCircle, Save, Camera, 
  Image as ImageIcon, Trash2, Package, Settings, ChevronLeft
} from 'lucide-react';
import Image from 'next/image';
import RichTextEditor from './RichTextEditor';
import Link from 'next/link';

interface AdminProduct {
  id?: string;
  name: string;
  price: number;
  stock: number;
  shipping_fee: number;
  category: string;
  description: string;
  imageUrl: string;
  images?: string[];
  reward_points?: number;
  discount_rate?: number;
  is_sold_out?: boolean;
  specs?: {
    origin?: string;
    producer?: string;
  };
}

interface ProductOption {
  id?: string; // New options won't have an ID initially
  option_name: string;
  additional_price: number;
  stock: number;
  is_active: boolean;
}

export default function ProductForm({ initialData }: { initialData?: AdminProduct }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Product State
  const [formData, setFormData] = useState<AdminProduct>(initialData || {
    name: '',
    price: 0,
    stock: 100,
    shipping_fee: 0,
    category: '농산물',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e',
    reward_points: 0,
    discount_rate: 0,
    specs: { origin: '경기도 연천군', producer: '농업회사법인 복이네농장(주)' }
  });

  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string | null>(null);

  // Options State (Managed locally until submission)
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [deletedOptionIds, setDeletedOptionIds] = useState<string[]>([]);

  const isEditMode = !!initialData?.id;

  const fetchOptions = useCallback(async () => {
    if (!initialData?.id) return;
    const { data } = await supabase
      .from('product_options')
      .select('*')
      .eq('product_id', initialData.id)
      .order('created_at', { ascending: true });
    
    if (data) setOptions(data);
  }, [initialData?.id]);

  useEffect(() => {
    if (isEditMode) fetchOptions();
  }, [isEditMode, fetchOptions]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setMainImage(files[0]);
    setMainPreview(URL.createObjectURL(files[0]));
  };

  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let finalImageUrl = formData.imageUrl;

      if (mainImage) {
        finalImageUrl = await uploadFile(mainImage, 'main');
      }

      const productPayload = {
        ...formData,
        imageUrl: finalImageUrl,
        is_sold_out: Number(formData.stock) <= 0
      };

      // 1. Submit Product
      const endpoint = '/api/admin/products';
      const method = isEditMode ? 'PATCH' : 'POST';
      const body = isEditMode 
        ? { productId: initialData?.id, productData: productPayload, adminToken: session?.user?.id }
        : { productData: productPayload, adminToken: session?.user?.id };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      const productId = isEditMode ? initialData?.id : result.id;

      // 2. Handle Options Synchronization
      if (productId) {
        // 2a. Delete removed options
        if (deletedOptionIds.length > 0) {
          await supabase.from('product_options').delete().in('id', deletedOptionIds);
        }

        // 2b. Upsert remaining options
        const optionsToUpsert = options.map(opt => ({
          ...opt,
          product_id: productId
        }));

        if (optionsToUpsert.length > 0) {
          const { error: upsertError } = await supabase
            .from('product_options')
            .upsert(optionsToUpsert, { onConflict: 'id' });
          
          if (upsertError) throw upsertError;
        }
      }
      
      alert(isEditMode ? '상품과 옵션이 수정되었습니다.' : '상품과 옵션이 등록되었습니다.');
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      console.error('Submission failed:', err);
      alert(err.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const addOptionRow = () => {
    setOptions([...options, { 
      option_name: '', 
      additional_price: 0, 
      stock: 100, 
      is_active: true 
    }]);
  };

  const updateOptionRow = (index: number, field: keyof ProductOption, value: any) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: value };
    setOptions(updated);
  };

  const removeOptionRow = (index: number) => {
    const target = options[index];
    if (target.id) {
      setDeletedOptionIds([...deletedOptionIds, target.id]);
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-12 pb-24">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Link href="/admin" className="text-xs text-muted flex items-center gap-1 hover:text-deep-sage transition-colors">
            <ChevronLeft className="w-3 h-3" /> Back to List
          </Link>
          <h1 className="font-serif text-4xl text-charcoal">{isEditMode ? '상품 및 옵션 수정' : '새 상품 등록'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left: Basic Info */}
          <div className="lg:col-span-2 space-y-10 bg-white p-10 rounded-sm border border-border-light shadow-sm">
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] text-muted uppercase tracking-widest font-bold">Product Name</label>
                <input 
                  required 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder="상품명을 입력해 주세요" 
                  className="w-full border-b border-border-light py-3 focus:outline-none focus:border-deep-sage text-xl font-serif bg-transparent" 
                />
              </div>

              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted uppercase tracking-widest font-bold">Base Price (KRW)</label>
                  <input 
                    required 
                    type="number" 
                    value={formData.price} 
                    onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} 
                    className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-muted uppercase tracking-widest font-bold">Base Shipping Fee</label>
                  <input 
                    required 
                    type="number" 
                    value={formData.shipping_fee} 
                    onChange={(e) => setFormData({...formData, shipping_fee: Number(e.target.value)})} 
                    className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted uppercase tracking-widest font-bold">Total Stock (Main)</label>
                  <input 
                    required 
                    type="number" 
                    value={formData.stock} 
                    onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} 
                    className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-muted uppercase tracking-widest font-bold">Category</label>
                  <select 
                    value={formData.category} 
                    onChange={(e) => setFormData({...formData, category: e.target.value})} 
                    className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent"
                  >
                    <option value="농산물">농산물</option>
                    <option value="농자재">농자재</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] text-muted uppercase tracking-widest font-bold block">Detailed Description</label>
                <div className="min-h-[400px] border border-border-light rounded-sm">
                  <RichTextEditor 
                    value={formData.description} 
                    onChange={(html) => setFormData({...formData, description: html})} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Main Image */}
          <div className="space-y-10">
            <div className="bg-white p-8 rounded-sm border border-border-light shadow-sm space-y-6">
              <label className="text-[10px] text-muted uppercase tracking-widest font-bold flex items-center gap-2">
                <ImageIcon className="w-3 h-3" /> Main Listing Image
              </label>
              <div className="relative aspect-square bg-hanji-white rounded-sm overflow-hidden border border-border-light group cursor-pointer hover:border-deep-sage transition-colors">
                <Image 
                  src={mainPreview || formData.imageUrl} 
                  alt="Main" 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <p className="text-[10px] text-muted text-center italic">클릭하여 대표 이미지를 변경하세요.</p>
            </div>

            {/* Reward & Discount */}
            <div className="bg-white p-8 rounded-sm border border-border-light shadow-sm space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted uppercase tracking-widest font-bold text-deep-sage">Reward Points (₩)</label>
                  <input 
                    type="number"
                    value={formData.reward_points} 
                    onChange={(e) => setFormData({...formData, reward_points: Number(e.target.value)})} 
                    className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent font-bold text-deep-sage" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-muted uppercase tracking-widest font-bold text-terracotta">Discount Rate (%)</label>
                  <input 
                    type="number"
                    value={formData.discount_rate} 
                    onChange={(e) => setFormData({...formData, discount_rate: Number(e.target.value)})} 
                    className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent font-bold text-terracotta" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Product Options Table */}
        <div className="bg-white p-10 rounded-sm border border-border-light shadow-sm space-y-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-amber-600" />
              <div>
                <h2 className="font-serif text-2xl text-charcoal">품목 옵션 관리</h2>
                <p className="text-xs text-muted font-light mt-1">상품의 무게, 용량, 포장 방식별로 가격과 재고를 개별 관리합니다.</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={addOptionRow}
              className="bg-hanji-white border border-border-light px-6 py-2.5 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> 옵션 추가
            </button>
          </div>

          <div className="border border-border-light rounded-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-hanji-white text-[10px] uppercase tracking-[0.2em] text-muted border-b border-border-light">
                <tr>
                  <th className="px-6 py-4">옵션 명칭 (Option Name)</th>
                  <th className="px-6 py-4 w-40 text-right">추가 금액 (Add Price)</th>
                  <th className="px-6 py-4 w-32 text-right">재고 (Stock)</th>
                  <th className="px-6 py-4 w-32 text-center">상태 (Status)</th>
                  <th className="px-6 py-4 w-20 text-center">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {options.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-xs text-muted italic">
                      등록된 옵션이 없습니다. 우측 상단의 '옵션 추가' 버튼을 눌러주세요.
                    </td>
                  </tr>
                ) : (
                  options.map((opt, idx) => (
                    <tr key={idx} className="hover:bg-hanji-white/30 transition-colors">
                      <td className="px-6 py-4">
                        <input 
                          required
                          value={opt.option_name}
                          onChange={(e) => updateOptionRow(idx, 'option_name', e.target.value)}
                          placeholder="예: 5kg 상급, 선물용 포장 등"
                          className="w-full bg-transparent border-b border-transparent focus:border-amber-500 outline-none text-sm font-medium py-1"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] text-muted font-bold">+</span>
                          <input 
                            type="number"
                            value={opt.additional_price}
                            onChange={(e) => updateOptionRow(idx, 'additional_price', Number(e.target.value))}
                            className="w-24 text-right bg-transparent border-b border-transparent focus:border-amber-500 outline-none text-sm font-bold"
                          />
                          <span className="text-[10px] text-muted">원</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number"
                          value={opt.stock}
                          onChange={(e) => updateOptionRow(idx, 'stock', Number(e.target.value))}
                          className="w-full text-right bg-transparent border-b border-transparent focus:border-amber-500 outline-none text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <select 
                          value={opt.is_active ? 'active' : 'inactive'}
                          onChange={(e) => updateOptionRow(idx, 'is_active', e.target.value === 'active')}
                          className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer"
                        >
                          <option value="active" className="text-green-600">판매중</option>
                          <option value="inactive" className="text-terracotta">품절/중지</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          type="button"
                          onClick={() => removeOptionRow(idx)}
                          className="p-2 text-muted hover:text-terracotta transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex justify-center">
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full max-w-xl bg-charcoal text-white py-8 rounded-sm hover:bg-deep-sage transition-all font-serif text-3xl flex items-center justify-center gap-6 shadow-2xl disabled:opacity-50 group"
          >
            {isLoading ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : (
              isEditMode ? <Save className="w-10 h-10 group-hover:scale-110 transition-transform" /> : <Package className="w-10 h-10 group-hover:scale-110 transition-transform" />
            )} 
            {isEditMode ? '상품 및 옵션 정보 저장' : '새 상품 최종 등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
