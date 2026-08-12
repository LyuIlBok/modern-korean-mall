'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  Plus, Loader2, Save, Camera,
  Image as ImageIcon, Trash2, Package, Settings, ChevronLeft, Sparkles
} from 'lucide-react';
import Image from 'next/image';
import RichTextEditor from './RichTextEditor';
import Link from 'next/link';

import { useLanguageStore } from '@/store/useLanguageStore';
import { adminFetch } from '@/lib/adminFetch';

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
  is_active?: boolean;
  origin?: string;
  producer?: string;
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
  const { t } = useLanguageStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isAiDraftLoading, setIsAiDraftLoading] = useState(false);

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
    is_active: true,
    origin: '경기도 연천군',
    producer: '농업회사법인 복이네농장(주)'
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

  // [AI 고도화 Phase 0 - 즉시 테스트용 최소 연동] 상품명/카테고리/원산지/제조사로
  // Gemini 상품설명 초안을 생성해서 상세 설명 에디터에 채워줍니다. 자동 저장은
  // 아니고, 검토/수정 후 직접 "저장" 버튼을 눌러야 반영됩니다.
  const handleAiDescriptionDraft = async () => {
    if (!formData.name?.trim()) {
      alert('상품명을 먼저 입력해주세요.');
      return;
    }
    setIsAiDraftLoading(true);
    try {
      const res = await adminFetch('/api/admin/ai/product-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          origin: formData.origin,
          producer: formData.producer,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'AI 초안 생성에 실패했습니다.');
        return;
      }
      setFormData(prev => ({ ...prev, description: json.draft }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 에러가 발생했습니다.';
      alert(`시스템 오류: ${msg}`);
    } finally {
      setIsAiDraftLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let finalImageUrl = formData.imageUrl;

      if (mainImage) {
        finalImageUrl = await uploadFile(mainImage, 'main');
      }

      const productPayload = {
        ...formData,
        imageUrl: finalImageUrl,
        is_sold_out: Number(formData.stock) <= 0
      };

      // 상품 본문 + 옵션(추가/수정/삭제)을 한 요청으로 서버(service role)에 보내서
      // 같이 처리합니다. 예전엔 옵션만 브라우저에서 직접 Supabase로 썼는데, 그
      // 테이블의 RLS가 실제 관리자 판정 기준과 안 맞아서 조용히 실패하던 문제가
      // 있었습니다(자세한 내용은 /api/admin/products/route.ts 주석 참고).
      const endpoint = '/api/admin/products';
      const method = isEditMode ? 'PATCH' : 'POST';
      const body = isEditMode
        ? { productId: initialData?.id, productData: productPayload, options, deletedOptionIds }
        : { productData: productPayload, options };

      const res = await adminFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      alert(isEditMode ? '상품과 옵션이 수정되었습니다.' : '상품과 옵션이 등록되었습니다.');
      router.push('/admin');
      router.refresh();
    } catch (err: unknown) {
      console.error('Submission failed:', err);
      const message = err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.';
      alert(message);
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

  const updateOptionRow = <K extends keyof ProductOption>(index: number, field: K, value: ProductOption[K]) => {
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
          <Link href="/admin" className="text-sm text-muted flex items-center gap-2 hover:text-deep-sage transition-colors font-bold uppercase tracking-widest">
            <ChevronLeft className="w-4 h-4" /> {t?.admin?.backToList || '목록으로 돌아가기'}
          </Link>
          <h1 className="font-serif text-5xl text-charcoal font-bold tracking-tight">{isEditMode ? (t?.admin?.editTitle || '상품 및 옵션 수정') : (t?.admin?.newTitle || '새 상품 등록')}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left: Basic Info */}
          <div className="lg:col-span-2 space-y-12 bg-white p-12 rounded-sm border border-border-light shadow-sm">
            <div className="space-y-10">
              <div className="space-y-3">
                <label className="text-xs text-muted uppercase tracking-widest font-black ml-1">{t?.admin?.productName || '상품명'}</label>
                <input 
                  required 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder={t?.admin?.productName || '상품명을 입력해 주세요'} 
                  className="w-full border-b-2 border-border-light py-4 focus:outline-none focus:border-deep-sage text-2xl font-serif bg-transparent transition-colors" 
                />
              </div>

              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-3">
                  <label className="text-xs text-muted uppercase tracking-widest font-black ml-1">{t?.admin?.basePrice || '기본 판매가'} (KRW)</label>
                  <input 
                    required 
                    type="number" 
                    value={formData.price} 
                    onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} 
                    className="w-full border-b-2 border-border-light py-3 focus:outline-none bg-transparent font-black text-xl" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs text-muted uppercase tracking-widest font-black ml-1">{t?.admin?.baseShippingFee || '기본 배송비'}</label>
                  <input 
                    required 
                    type="number" 
                    value={formData.shipping_fee} 
                    onChange={(e) => setFormData({...formData, shipping_fee: Number(e.target.value)})} 
                    className="w-full border-b-2 border-border-light py-3 focus:outline-none bg-transparent text-xl font-medium" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-3">
                  <label className="text-xs text-muted uppercase tracking-widest font-black ml-1">{t?.admin?.status || '노출 상태'}</label>
                  <select 
                    value={formData.is_active === false ? 'inactive' : 'active'} 
                    onChange={(e) => setFormData({...formData, is_active: e.target.value === 'active'})} 
                    className="w-full border-b-2 border-border-light py-3 focus:outline-none bg-transparent text-xl font-bold appearance-none cursor-pointer"
                  >
                    <option value="active" className="text-green-600 font-bold">{t?.admin?.active || '노출 (Active)'}</option>
                    <option value="inactive" className="text-terracotta font-bold">{t?.admin?.inactive || '숨김 (Hidden)'}</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs text-muted uppercase tracking-widest font-black ml-1">{t?.admin?.category || '카테고리'}</label>
                  <select 
                    value={formData.category} 
                    onChange={(e) => setFormData({...formData, category: e.target.value})} 
                    className="w-full border-b-2 border-border-light py-3 focus:outline-none bg-transparent text-xl font-bold appearance-none cursor-pointer"
                  >
                    <option value="농산물">농산물</option>
                    <option value="농자재">농자재</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-3">
                  <label className="text-xs text-muted uppercase tracking-widest font-black ml-1">{t?.admin?.totalStock || '기본 재고'}</label>
                  <input 
                    required 
                    type="number" 
                    value={formData.stock} 
                    onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} 
                    className="w-full border-b-2 border-border-light py-3 focus:outline-none bg-transparent text-xl font-medium" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-3">
                  <label className="text-xs text-muted uppercase tracking-widest font-black ml-1">{t?.admin?.origin || '원산지'}</label>
                  <input 
                    required 
                    value={formData.origin || ''} 
                    onChange={(e) => setFormData({...formData, origin: e.target.value})} 
                    placeholder="예: 경기도 연천군" 
                    className="w-full border-b-2 border-border-light py-3 focus:outline-none bg-transparent text-xl font-medium" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs text-muted uppercase tracking-widest font-black ml-1">{t?.admin?.producer || '제조사'}</label>
                  <input 
                    required 
                    value={formData.producer || ''} 
                    onChange={(e) => setFormData({...formData, producer: e.target.value})} 
                    placeholder="예: 복이네농장" 
                    className="w-full border-b-2 border-border-light py-3 focus:outline-none bg-transparent text-xl font-medium" 
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs text-muted uppercase tracking-widest font-black block">{t?.admin?.detailedDescription || '상세 설명'}</label>
                  <button
                    type="button"
                    onClick={handleAiDescriptionDraft}
                    disabled={isAiDraftLoading}
                    title="Gemini로 상품설명 초안 생성 (저장 전 검토 필요)"
                    className="flex items-center gap-2 text-xs font-bold text-deep-sage border border-deep-sage px-4 py-2 rounded-sm hover:bg-deep-sage/10 transition-all disabled:opacity-50"
                  >
                    {isAiDraftLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    AI 초안 생성
                  </button>
                </div>
                <div className="min-h-[500px] border-2 border-border-light rounded-sm shadow-inner">
                  <RichTextEditor 
                    value={formData.description} 
                    onChange={(html) => setFormData({...formData, description: html})} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Main Image */}
          <div className="space-y-12">
            <div className="bg-white p-10 rounded-sm border border-border-light shadow-sm space-y-8">
              <label className="text-xs text-muted uppercase tracking-widest font-black flex items-center gap-3 ml-1">
                <ImageIcon className="w-4 h-4" /> {t?.admin?.mainImage || '대표 이미지'}
              </label>
              <div className="relative aspect-square bg-hanji-white rounded-sm overflow-hidden border-2 border-border-light group cursor-pointer hover:border-deep-sage transition-all shadow-md">
                <Image 
                  src={mainPreview || formData.imageUrl} 
                  alt="Main" 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-10 h-10 text-white" />
                </div>
                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <p className="text-xs text-muted text-center italic font-medium opacity-60">클릭하여 대표 이미지를 변경하세요.</p>
            </div>

            {/* Reward & Discount */}
            <div className="bg-white p-10 rounded-sm border border-border-light shadow-sm space-y-8">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs text-muted uppercase tracking-widest font-black text-deep-sage ml-1">{t?.admin?.rewardPoints || '적립금'} (₩)</label>
                  <input 
                    type="number"
                    value={formData.reward_points} 
                    onChange={(e) => setFormData({...formData, reward_points: Number(e.target.value)})} 
                    className="w-full border-b-2 border-border-light py-3 focus:outline-none bg-transparent font-black text-xl text-deep-sage" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs text-muted uppercase tracking-widest font-black text-terracotta ml-1">{t?.admin?.discountRate || '할인율'} (%)</label>
                  <input 
                    type="number"
                    value={formData.discount_rate} 
                    onChange={(e) => setFormData({...formData, discount_rate: Number(e.target.value)})} 
                    className="w-full border-b-2 border-border-light py-3 focus:outline-none bg-transparent font-black text-xl text-terracotta" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Product Options Table */}
        <div className="bg-white p-12 rounded-sm border border-border-light shadow-sm space-y-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-full"><Settings className="w-8 h-8 text-amber-600" /></div>
              <div>
                <h2 className="font-serif text-3xl text-charcoal font-bold">{t?.admin?.optionsTitle || '품목 옵션 관리'}</h2>
                <p className="text-sm text-muted font-medium mt-1 opacity-80">{t?.admin?.optionsDesc || '상품의 무게, 용량, 포장 방식별로 가격과 재고를 개별 관리합니다.'}</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={addOptionRow}
              className="bg-charcoal text-white px-8 py-4 rounded-sm text-xs font-black uppercase tracking-widest hover:bg-deep-sage transition-all flex items-center gap-3 shadow-xl"
            >
              <Plus className="w-5 h-5" /> {t?.admin?.addOption || '옵션 추가'}
            </button>
          </div>

          <div className="border-2 border-border-light rounded-sm overflow-hidden shadow-inner">
            <table className="w-full text-left border-collapse">
              <thead className="bg-hanji-white text-xs uppercase tracking-[0.2em] text-muted border-b-2 border-border-light font-black">
                <tr>
                  <th className="px-8 py-5">{t?.admin?.optionName || '옵션 명칭'}</th>
                  <th className="px-8 py-5 w-48 text-right">{t?.admin?.addPrice || '추가 금액'}</th>
                  <th className="px-8 py-5 w-40 text-right">{t?.admin?.stock || '재고'}</th>
                  <th className="px-8 py-5 w-40 text-center">{t?.admin?.status || '상태'}</th>
                  <th className="px-8 py-5 w-24 text-center">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {options.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-24 text-center text-sm text-muted italic font-medium">
                      등록된 옵션이 없습니다. 우측 상단의 &quot;옵션 추가&quot; 버튼을 눌러주세요.
                    </td>
                  </tr>
                ) : (
                  options.map((opt, idx) => (
                    <tr key={idx} className="hover:bg-hanji-white/50 transition-colors group">
                      <td className="px-8 py-6">
                        <input 
                          required
                          value={opt.option_name}
                          onChange={(e) => updateOptionRow(idx, 'option_name', e.target.value)}
                          placeholder="예: 5kg 상급, 선물용 포장 등"
                          className="w-full bg-transparent border-b-2 border-transparent focus:border-amber-500 outline-none text-base font-bold py-2 transition-colors"
                        />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-muted font-black">+</span>
                          <input 
                            type="number"
                            value={opt.additional_price}
                            onChange={(e) => updateOptionRow(idx, 'additional_price', Number(e.target.value))}
                            className="w-28 text-right bg-transparent border-b-2 border-transparent focus:border-amber-500 outline-none text-lg font-black"
                          />
                          <span className="text-xs text-muted font-bold">원</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <input 
                          type="number"
                          value={opt.stock}
                          onChange={(e) => updateOptionRow(idx, 'stock', Number(e.target.value))}
                          className="w-full text-right bg-transparent border-b-2 border-transparent focus:border-amber-500 outline-none text-base font-bold"
                        />
                      </td>
                      <td className="px-8 py-6 text-center">
                        <select 
                          value={opt.is_active ? 'active' : 'inactive'}
                          onChange={(e) => updateOptionRow(idx, 'is_active', e.target.value === 'active')}
                          className="bg-transparent text-xs font-black uppercase tracking-widest outline-none cursor-pointer hover:text-amber-600 transition-colors"
                        >
                          <option value="active" className="text-green-600 font-bold">{t?.admin?.active || '판매중'}</option>
                          <option value="inactive" className="text-terracotta font-bold">{t?.admin?.inactive || '품절/중지'}</option>
                        </select>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button 
                          type="button"
                          onClick={() => removeOptionRow(idx)}
                          className="p-3 text-muted hover:text-terracotta transition-all hover:bg-hanji-white rounded-full group-hover:opacity-100 opacity-40"
                        >
                          <Trash2 className="w-5 h-5" />
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
        <div className="flex justify-center pt-12">
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full max-w-2xl bg-charcoal text-white py-10 rounded-sm hover:bg-deep-sage transition-all font-serif text-4xl flex items-center justify-center gap-8 shadow-2xl disabled:opacity-50 group font-bold tracking-tight"
          >
            {isLoading ? (
              <Loader2 className="w-12 h-12 animate-spin" />
            ) : (
              isEditMode ? <Save className="w-12 h-12 group-hover:scale-110 transition-transform" /> : <Package className="w-12 h-12 group-hover:scale-110 transition-transform" />
            )} 
            {isEditMode ? (t?.admin?.saveBtn || '상품 및 옵션 정보 저장') : (t?.admin?.addBtn || '새 상품 최종 등록')}
          </button>
        </div>
      </form>
    </div>
  );
}
