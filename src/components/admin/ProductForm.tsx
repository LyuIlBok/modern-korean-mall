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
  id: string;
  option_name: string;
  additional_price: number;
}

export default function ProductForm({ initialData }: { initialData?: AdminProduct }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isOptionsLoading, setIsOptionsLoading] = useState(false);
  
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

  // Options State
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState('');

  const isEditMode = !!initialData?.id;

  const fetchOptions = useCallback(async () => {
    if (!initialData?.id) return;
    setIsOptionsLoading(true);
    const { data } = await supabase
      .from('product_options')
      .select('*')
      .eq('product_id', initialData.id)
      .order('created_at', { ascending: true });
    
    if (data) setOptions(data);
    setIsOptionsLoading(false);
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
      
      alert(isEditMode ? '상품이 수정되었습니다.' : '상품이 등록되었습니다.');
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      alert(err.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionName || !initialData?.id) return;

    setIsOptionsLoading(true);
    try {
      const { error } = await supabase
        .from('product_options')
        .insert([{
          product_id: initialData.id,
          option_name: newOptionName,
          additional_price: Number(newOptionPrice || 0)
        }]);

      if (error) throw error;
      setNewOptionName('');
      setNewOptionPrice('');
      fetchOptions();
    } catch (err) {
      alert('옵션 추가 실패');
    } finally {
      setIsOptionsLoading(false);
    }
  };

  const handleDeleteOption = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    setIsOptionsLoading(true);
    try {
      await supabase.from('product_options').delete().eq('id', id);
      fetchOptions();
    } catch (err) {
      alert('삭제 실패');
    } finally {
      setIsOptionsLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Link href="/admin" className="text-xs text-muted flex items-center gap-1 hover:text-deep-sage transition-colors">
            <ChevronLeft className="w-3 h-3" /> Back to List
          </Link>
          <h1 className="font-serif text-4xl text-charcoal">{isEditMode ? '상품 정보 수정' : '새 상품 등록'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
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
                <label className="text-[10px] text-muted uppercase tracking-widest font-bold">Price (KRW)</label>
                <input 
                  required 
                  type="number" 
                  value={formData.price} 
                  onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} 
                  className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-muted uppercase tracking-widest font-bold">Shipping Fee</label>
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
                <label className="text-[10px] text-muted uppercase tracking-widest font-bold">Stock</label>
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
              <label className="text-[10px] text-muted uppercase tracking-widest font-bold block">Description (Rich Text)</label>
              <div className="min-h-[400px] border border-border-light rounded-sm">
                <RichTextEditor 
                  value={formData.description} 
                  onChange={(html) => setFormData({...formData, description: html})} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Images & Options */}
        <div className="space-y-10">
          {/* Main Image */}
          <div className="bg-white p-8 rounded-sm border border-border-light shadow-sm space-y-6">
            <label className="text-[10px] text-muted uppercase tracking-widest font-bold flex items-center gap-2">
              <ImageIcon className="w-3 h-3" /> Main Image
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
            <p className="text-[10px] text-muted text-center italic">클릭하여 이미지를 변경할 수 있습니다.</p>
          </div>

          {/* Options Management (Only in Edit Mode) */}
          <div className="bg-white p-8 rounded-sm border border-border-light shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-600" />
              <label className="text-[10px] text-muted uppercase tracking-widest font-bold">Product Options</label>
            </div>

            {!isEditMode ? (
              <div className="py-8 text-center bg-hanji-white rounded-sm border border-dashed border-border-light">
                <p className="text-xs text-muted font-light px-4 italic leading-relaxed">
                  상품을 먼저 등록하신 후<br/>옵션을 관리하실 수 있습니다.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Option Form */}
                <div className="space-y-3 p-4 bg-hanji-white rounded-sm border border-border-light">
                  <input 
                    value={newOptionName}
                    onChange={(e) => setNewOptionName(e.target.value)}
                    placeholder="옵션명 (예: 5kg)"
                    className="w-full bg-white border border-border-light px-3 py-2 text-xs focus:border-amber-500 outline-none"
                  />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted">₩</span>
                      <input 
                        type="number"
                        value={newOptionPrice}
                        onChange={(e) => setNewOptionPrice(e.target.value)}
                        placeholder="추가금"
                        className="w-full bg-white border border-border-light pl-6 pr-2 py-2 text-xs focus:border-amber-500 outline-none"
                      />
                    </div>
                    <button 
                      onClick={handleAddOption}
                      disabled={isOptionsLoading || !newOptionName}
                      className="bg-amber-600 text-white px-4 py-2 rounded-sm text-xs font-bold hover:bg-amber-700 transition-colors disabled:opacity-50"
                    >
                      추가
                    </button>
                  </div>
                </div>

                {/* Option List */}
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {options.length === 0 ? (
                    <p className="text-xs text-muted text-center py-4 italic">등록된 옵션이 없습니다.</p>
                  ) : (
                    options.map((opt) => (
                      <div key={opt.id} className="flex items-center justify-between p-3 bg-hanji-white rounded-sm border border-border-light group">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-charcoal">{opt.option_name}</p>
                          <p className="text-[10px] text-muted">+₩{opt.additional_price.toLocaleString()}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteOption(opt.id)}
                          className="p-1 text-muted hover:text-terracotta transition-colors group-hover:opacity-100 opacity-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4">
            <button 
              onClick={handleSubmit} 
              disabled={isLoading} 
              className="w-full bg-charcoal text-white py-6 rounded-sm hover:bg-deep-sage transition-all font-serif text-2xl flex items-center justify-center gap-4 shadow-2xl disabled:opacity-50 group"
            >
              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                isEditMode ? <Save className="w-8 h-8 group-hover:scale-110 transition-transform" /> : <CheckCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
              )} 
              {isEditMode ? '수정 내용 저장' : '상품 등록 완료'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
