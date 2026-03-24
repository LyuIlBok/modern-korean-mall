'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, LayoutDashboard, LogOut, Loader2, 
  ShoppingCart, Truck, CheckCircle, Image as ImageIcon,
  MessageSquare, User, Trash2, Edit3, X, TrendingUp, Bell, Check, ArrowRight, Camera, Search, Filter, AlertTriangle, MoreVertical, ExternalLink,
  DollarSign, Save
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { CONFIG } from '@/lib/config';

type ActiveTab = 'products' | 'orders' | 'qna' | 'dashboard' | 'restock';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [restockAlerts, setRestockAlerts] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // Search & Filter State 복구
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('전체');

  // Editing state
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // New product form state
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('100');
  const [newCategory, setNewCategory] = useState('농산물');
  const [newDesc, setNewDesc] = useState('');
  
  // 1. 다중 이미지 State 추가
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string | null>(null);
  
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  
  const [detailFiles, setDetailFiles] = useState<File[]>([]);
  const [detailPreviews, setDetailPreviews] = useState<string[]>([]);

  // fetchData 함수 복구
  const fetchData = useCallback(async () => {
    try {
      setIsCheckingAuth(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session || !session.user.email || !CONFIG.ADMIN_EMAILS.includes(session.user.email)) {
        console.error('Access denied or session error');
        router.replace('/');
        return;
      }

      setIsAdmin(true);
      
      // 데이터 병렬 페칭
      const [productsRes, ordersRes, alertsRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*, order_items(*, products(name))').order('created_at', { ascending: false }),
        supabase.from('restock_alerts').select('*, products(name, imageUrl)').order('created_at', { ascending: false })
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
      if (alertsRes.data) setRestockAlerts(alertsRes.data);
      
    } catch (err) { 
      console.error('Admin data fetch failed:', err);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [router]);

  // 초기 마운트 시 데이터 로드
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // filteredProducts 필터링 로직 복구
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === '전체' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  // 2. 업로드 헬퍼 함수 (병렬 업로드 및 URL 반환)
  const uploadFiles = async (files: File[], folder: string) => {
    if (files.length === 0) return [];
    
    const uploadPromises = files.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);
        
      if (uploadError) throw new Error(`업로드 실패: ${uploadError.message}`);
      
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
      return publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'gallery' | 'detail') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (type === 'main') {
      setMainImage(files[0]);
      setMainPreview(URL.createObjectURL(files[0]));
    } else if (type === 'gallery') {
      setGalleryFiles(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setGalleryPreviews(prev => [...prev, ...newPreviews]);
    } else {
      setDetailFiles(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setDetailPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number, type: 'gallery' | 'detail') => {
    if (type === 'gallery') {
      setGalleryFiles(prev => prev.filter((_, i) => i !== index));
      setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      setDetailFiles(prev => prev.filter((_, i) => i !== index));
      setDetailPreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPrice || !newDesc) return alert('필수 정보를 입력해 주세요.');

    setIsLoading(true);
    try {
      // 병렬 업로드 실행
      const [mainUrlArr, galleryUrls, detailUrls] = await Promise.all([
        mainImage ? uploadFiles([mainImage], 'main') : Promise.resolve(['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800']),
        uploadFiles(galleryFiles, 'gallery'),
        uploadFiles(detailFiles, 'details')
      ]);

      const { data, error } = await supabase.from('products').insert([{
        name: newName, 
        price: Number(newPrice), 
        stock: Number(newStock), 
        category: newCategory, 
        description: newDesc, 
        imageUrl: mainUrlArr.length > 0 ? mainUrlArr[0] : 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
        images: galleryUrls,
        detail_content_images: detailUrls,
        is_sold_out: Number(newStock) <= 0,
        specs: { origin: '연천군', producer: '복이네농장' } // 기본 스펙
      }]).select();

      if (error) throw error;
      
      alert('상품이 등록되었습니다!');
      setIsAdding(false);
      fetchData(); // 데이터 갱신
    } catch (error: any) { 
      alert(error.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsLoading(true);
    try {
      // 1. 새 파일 업로드 실행
      const [newMainUrl, newGalleryUrls, newDetailUrls] = await Promise.all([
        mainImage ? uploadFiles([mainImage], 'main') : Promise.resolve([]),
        uploadFiles(galleryFiles, 'gallery'),
        uploadFiles(detailFiles, 'details')
      ]);

      // 2. 최종 URL 리스트 구성 (기존 유지된 URL + 새로 업로드된 URL)
      const finalMainUrl = newMainUrl.length > 0 ? newMainUrl[0] : editingProduct.imageUrl;
      const finalGallery = [...(editingProduct.images || []), ...newGalleryUrls];
      const finalDetails = [...(editingProduct.detail_content_images || []), ...newDetailUrls];

      const { error } = await supabase.from('products').update({
        name: editingProduct.name, 
        price: Number(editingProduct.price), 
        stock: Number(editingProduct.stock), 
        category: editingProduct.category, 
        description: editingProduct.description, 
        imageUrl: finalMainUrl,
        images: finalGallery,
        detail_content_images: finalDetails,
        is_sold_out: Number(editingProduct.stock) <= 0
      }).eq('id', editingProduct.id);

      if (error) throw error;
      
      alert('상품 정보가 수정되었습니다.');
      setEditingProduct(null);
      // 스테이트 초기화
      setMainImage(null); setMainPreview(null);
      setGalleryFiles([]); setGalleryPreviews([]);
      setDetailFiles([]); setDetailPreviews([]);
      fetchData();
    } catch (err: any) { 
      alert(err.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  // 기존 이미지 삭제 처리 (수정 모드용)
  const removeExistingImage = (idx: number, type: 'gallery' | 'detail') => {
    if (!editingProduct) return;
    if (type === 'gallery') {
      const newImages = editingProduct.images.filter((_: any, i: number) => i !== idx);
      setEditingProduct({ ...editingProduct, images: newImages });
    } else {
      const newDetails = editingProduct.detail_content_images.filter((_: any, i: number) => i !== idx);
      setEditingProduct({ ...editingProduct, detail_content_images: newDetails });
    }
  };

  const handleDeleteProduct = async (product: any) => {
    if (!confirm(`'${product.name}' 상품을 정말로 삭제하시겠습니까?\n관련 이미지 파일도 함께 삭제됩니다.`)) return;
    
    try {
      // 1. Storage에서 이미지 삭제 (URL에서 파일 경로 추출)
      if (product.imageUrl && product.imageUrl.includes('product-images')) {
        const urlParts = product.imageUrl.split('product-images/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('product-images').remove([filePath]);
        }
      }

      // 2. Database에서 상품 삭제
      const { error } = await supabase.from('products').delete().eq('id', product.id);
      if (error) throw error;

      setProducts(products.filter(p => p.id !== product.id));
      alert('상품과 이미지가 모두 삭제되었습니다.');
    } catch (err: any) {
      alert(`삭제 실패: ${err.message}`);
    }
  };

  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center bg-hanji-white text-deep-sage uppercase text-xs">Loading Dashboard...</div>;
  if (!isAdmin) return null;

  const totalSales = orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  const pendingOrders = orders.filter(o => o.status === '결제완료').length;

  return (
    <div className="flex-1 flex min-h-screen bg-hanji-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-light bg-white flex flex-col p-8 sticky top-0 h-screen shadow-sm">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-deep-sage rounded-sm flex items-center justify-center text-white"><LayoutDashboard className="w-6 h-6" /></div>
          <h2 className="font-serif text-xl text-charcoal">관리자 센터</h2>
        </div>
        <nav className="space-y-4 flex-1">
          {[
            { id: 'dashboard', label: '운영 현황', icon: TrendingUp },
            { id: 'products', label: '상품 관리', icon: Package },
            { id: 'orders', label: '주문 관리', icon: ShoppingCart },
            { id: 'restock', label: '재입고 알림', icon: Bell },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as ActiveTab)} className={`flex items-center gap-3 w-full p-3 rounded-sm transition-all text-sm ${activeTab === item.id ? 'bg-deep-sage text-white font-bold shadow-md' : 'text-muted hover:bg-hanji-white'}`}><item.icon className="w-4 h-4" /> {item.label}</button>
          ))}
        </nav>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="flex items-center gap-3 text-muted hover:text-terracotta pt-6 font-medium text-sm border-t border-border-light"><LogOut className="w-4 h-4" /> 로그아웃</button>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-12">
              <h1 className="font-serif text-4xl text-charcoal">운영 현황</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-10 rounded-sm shadow-sm border border-border-light flex justify-between items-center"><div className="space-y-2"><p className="text-[10px] text-muted uppercase tracking-widest">Total Sales</p><h3 className="text-3xl font-serif text-charcoal">₩{totalSales.toLocaleString()}</h3></div><DollarSign className="w-8 h-8 text-deep-sage opacity-20" /></div>
                <div className="bg-white p-10 rounded-sm shadow-sm border border-border-light flex justify-between items-center"><div className="space-y-2"><p className="text-[10px] text-muted uppercase tracking-widest">Total Orders</p><h3 className="text-3xl font-serif text-charcoal">{orders.length}건</h3></div><ShoppingCart className="w-8 h-8 text-deep-sage opacity-20" /></div>
                <div className="bg-white p-10 rounded-sm shadow-sm border border-border-light flex justify-between items-center"><div className="space-y-2"><p className="text-[10px] text-muted uppercase tracking-widest">Pending Ship</p><h3 className="text-3xl font-serif text-charcoal">{pendingOrders}건</h3></div><Truck className="w-8 h-8 text-terracotta opacity-20" /></div>
              </div>
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div key="products" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              <div className="flex justify-between items-end">
                <div className="space-y-4">
                  <h1 className="font-serif text-4xl">상품 관리</h1>
                  <p className="text-muted text-sm font-light">등록된 전체 상품 {products.length}개를 관리합니다.</p>
                </div>
                <button onClick={() => setIsAdding(!isAdding)} className="bg-charcoal text-white px-8 py-3.5 rounded-sm flex items-center gap-2 hover:bg-deep-sage transition-all shadow-lg font-medium">{isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {isAdding ? '닫기' : '새 상품 등록하기'}</button>
              </div>

              {/* Advanced Filter Bar */}
              <div className="bg-white p-6 rounded-sm border border-border-light shadow-sm flex flex-col md:flex-row gap-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="text" placeholder="상품명 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-hanji-white/50 border border-border-light pl-12 pr-4 py-3 rounded-sm text-sm focus:outline-none focus:border-deep-sage" />
                </div>
                <div className="flex gap-4">
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-hanji-white/50 border border-border-light px-6 py-3 rounded-sm text-sm focus:outline-none">
                    <option value="전체">전체 카테고리</option><option value="농산물">농산물</option><option value="농자재">농자재</option>
                  </select>
                </div>
              </div>

              {isAdding && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border border-border-light p-10 rounded-sm shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-deep-sage" />
                  <form onSubmit={handleAddProduct} className="space-y-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-8">
                        <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Product Name</label><input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="상품명을 입력해 주세요" className="w-full border-b border-border-light py-3 focus:outline-none focus:border-deep-sage text-lg font-serif" /></div>
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Price (KRW)</label><input required value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" placeholder="판매가" className="w-full border-b border-border-light py-2 focus:outline-none" /></div>
                          <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Stock</label><input required value={newStock} onChange={(e) => setNewStock(e.target.value)} type="number" placeholder="수량" className="w-full border-b border-border-light py-2 focus:outline-none" /></div>
                        </div>
                        <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Category</label><select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent"><option value="농산물">농산물</option><option value="농자재">농자재</option></select></div>
                      </div>
                      <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Description</label><textarea required value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="상품에 대한 상세한 설명을 적어주세요." className="w-full h-full min-h-[200px] bg-hanji-white/30 border border-border-light p-5 rounded-sm focus:outline-none focus:border-deep-sage resize-none text-sm leading-relaxed" /></div>
                    </div>

                    {/* Image Upload Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 border-t border-border-light pt-10">
                      {/* Main Image */}
                      <div className="space-y-4">
                        <label className="text-[10px] text-muted uppercase tracking-widest font-bold flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Main Image</label>
                        <div className="relative aspect-square bg-hanji-white rounded-sm overflow-hidden border border-border-light group">
                          {mainPreview ? (
                            <Image src={mainPreview} alt="Main" fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted/30"><Camera className="w-8 h-8 mb-2" /><span className="text-[9px] font-bold">대표 이미지</span></div>
                          )}
                          <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'main')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                      </div>

                      {/* Gallery Images */}
                      <div className="space-y-4 md:col-span-2">
                        <label className="text-[10px] text-muted uppercase tracking-widest font-bold flex items-center gap-2"><Plus className="w-3 h-3" /> Gallery Images (Multiple)</label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                          {galleryPreviews.map((src, idx) => (
                            <div key={idx} className="relative aspect-square bg-hanji-white rounded-sm overflow-hidden border border-border-light group">
                              <Image src={src} alt="Gallery" fill className="object-cover" />
                              <button type="button" onClick={() => removeFile(idx, 'gallery')} className="absolute top-1 right-1 p-1 bg-charcoal text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                          <label className="aspect-square bg-hanji-white border border-dashed border-border-light rounded-sm flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors">
                            <Plus className="w-6 h-6 text-muted/30" /><span className="text-[8px] font-bold text-muted/40 mt-1">ADD</span>
                            <input type="file" multiple accept="image/*" onChange={(e) => handleImageChange(e, 'gallery')} className="hidden" />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Detail Images */}
                    <div className="space-y-4 border-t border-border-light pt-10">
                      <label className="text-[10px] text-muted uppercase tracking-widest font-bold flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Detail Page Images (Professional Content)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                        {detailPreviews.map((src, idx) => (
                          <div key={idx} className="relative aspect-[2/3] bg-hanji-white rounded-sm overflow-hidden border border-border-light group">
                            <Image src={src} alt="Detail" fill className="object-cover" />
                            <button type="button" onClick={() => removeFile(idx, 'detail')} className="absolute top-2 right-2 p-1.5 bg-charcoal text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                          </div>
                        ))}
                        <label className="aspect-[2/3] bg-hanji-white border border-dashed border-border-light rounded-sm flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors">
                          <Camera className="w-8 h-8 text-muted/30" /><span className="text-[9px] font-bold text-muted/40 mt-2">ADD CONTENT</span>
                          <input type="file" multiple accept="image/*" onChange={(e) => handleImageChange(e, 'detail')} className="hidden" />
                        </label>
                      </div>
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full bg-charcoal text-white py-6 rounded-sm hover:bg-deep-sage transition-all font-serif text-2xl flex items-center justify-center gap-4 shadow-2xl">
                      {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <CheckCircle className="w-8 h-8" />} 상품 등록 완료하기
                    </button>
                  </form>
                </motion.div>
              )}

              <div className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-hanji-white text-[10px] uppercase tracking-[0.2em] text-muted border-b border-border-light">
                    <tr><th className="px-8 py-6">상품 정보</th><th className="px-8 py-6">카테고리</th><th className="px-8 py-6 text-right">판매가</th><th className="px-8 py-6 text-right">재고</th><th className="px-8 py-6 text-center">관리</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-hanji-white/30 transition-colors group">
                        <td className="px-8 py-6"><div className="flex items-center gap-5"><div className="relative w-14 h-16 rounded-sm overflow-hidden border border-border-light bg-hanji-white"><Image src={p.imageUrl} alt={p.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" /></div><div className="space-y-1"><p className="font-serif text-lg text-charcoal">{p.name}</p><p className="text-[10px] text-muted font-mono">{p.id.slice(0,8).toUpperCase()}</p></div></div></td>
                        <td className="px-8 py-6 text-xs font-bold text-deep-sage uppercase tracking-wider">{p.category}</td>
                        <td className="px-8 py-6 text-right font-medium text-charcoal">{Number(p.price).toLocaleString()}원</td>
                        <td className="px-8 py-6 text-right"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${p.stock <= 0 ? 'bg-terracotta/10 text-terracotta' : p.stock <= 5 ? 'bg-orange-50 text-orange-600' : 'bg-charcoal/5 text-charcoal/60'}`}>{p.stock <= 0 ? '품절' : `${p.stock}개`}</span></td>
                        <td className="px-8 py-6 text-center"><div className="flex justify-center gap-3"><button onClick={() => setEditingProduct(p)} className="p-2 hover:bg-deep-sage/10 rounded-full transition-all text-muted hover:text-deep-sage"><Edit3 className="w-4 h-4" /></button><button onClick={() => handleDeleteProduct(p)} className="p-2 hover:bg-terracotta/10 rounded-full transition-all text-muted hover:text-terracotta"><Trash2 className="w-4 h-4" /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredProducts.length === 0 && <div className="py-20 text-center bg-white"><p className="text-muted italic font-light">검색 결과와 일치하는 상품이 없습니다.</p></div>}
              </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              <div className="space-y-4">
                <h1 className="font-serif text-4xl">주문 관리</h1>
                <p className="text-muted text-sm font-light">전체 주문 {orders.length}건을 확인하고 배송 상태를 관리합니다.</p>
              </div>

              <div className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-hanji-white text-[10px] uppercase tracking-[0.2em] text-muted border-b border-border-light">
                    <tr>
                      <th className="px-8 py-6">주문 일시 / ID</th>
                      <th className="px-8 py-6">주문 상품 정보</th>
                      <th className="px-8 py-6">주문자 / 연락처</th>
                      <th className="px-8 py-6 text-right">총 금액</th>
                      <th className="px-8 py-6 text-center">상태 / 운송장</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-hanji-white/30 transition-colors">
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                            <p className="text-sm text-charcoal">{new Date(o.created_at).toLocaleString('ko-KR')}</p>
                            <p className="text-[10px] text-muted font-mono">{o.id.slice(0,8).toUpperCase()}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-2">
                            {o.order_items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center gap-4 text-xs">
                                <span className="text-charcoal font-medium">· {item.products?.name || '삭제된 상품'}</span>
                                <span className="text-muted whitespace-nowrap">{item.quantity}개</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                            <p className="font-serif text-lg text-charcoal">{o.customer_name}</p>
                            <p className="text-[11px] text-muted">{o.customer_phone}</p>
                            <p className="text-[10px] text-muted truncate max-w-[150px]">{o.address}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right font-medium text-charcoal">
                          ₩{Number(o.total_price).toLocaleString()}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col items-center gap-2">
                            <select 
                              value={o.status} 
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', o.id);
                                if (!error) {
                                  setOrders(orders.map(item => item.id === o.id ? { ...item, status: newStatus } : item));
                                }
                              }}
                              className={`text-[11px] px-3 py-1.5 rounded-sm border focus:outline-none transition-all ${
                                o.status === '결제완료' ? 'border-deep-sage text-deep-sage bg-deep-sage/5' :
                                o.status === '배송중' ? 'border-blue-500 text-blue-500 bg-blue-500/5' :
                                'border-charcoal/20 text-charcoal/40 bg-charcoal/5'
                              }`}
                            >
                              <option value="결제완료">결제완료</option>
                              <option value="배송중">배송중</option>
                              <option value="배송완료">배송완료</option>
                              <option value="취소됨">취소됨</option>
                            </select>
                            
                            <div className="flex gap-1">
                              <input 
                                type="text" 
                                placeholder="운송장 입력" 
                                defaultValue={o.tracking_number}
                                onBlur={async (e) => {
                                  const val = e.target.value;
                                  if (val !== o.tracking_number) {
                                    const { error } = await supabase.from('orders').update({ tracking_number: val }).eq('id', o.id);
                                    if (!error) alert('운송장 번호가 저장되었습니다.');
                                  }
                                }}
                                className="text-[10px] w-24 border border-border-light px-2 py-1 focus:outline-none focus:border-deep-sage rounded-sm"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && (
                  <div className="py-24 text-center bg-white">
                    <p className="text-muted italic font-light">주문 내역이 아직 없습니다.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Advanced Edit Modal */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setEditingProduct(null); setMainPreview(null); setGalleryPreviews([]); setDetailPreviews([]); }} className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-4xl rounded-sm shadow-2xl p-12 overflow-y-auto max-h-[90vh]">
              <div className="absolute top-0 left-0 w-full h-1 bg-deep-sage" />
              <div className="flex justify-between items-center mb-10 pb-4 border-b border-border-light">
                <h2 className="font-serif text-3xl">상품 정보 수정</h2>
                <button onClick={() => { setEditingProduct(null); setMainPreview(null); setGalleryPreviews([]); setDetailPreviews([]); }} className="p-2 hover:bg-hanji-white rounded-full transition-colors"><X className="w-7 h-7" /></button>
              </div>
              
              <form onSubmit={handleUpdateProduct} className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Product Name</label><input required value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none focus:border-deep-sage text-lg font-serif bg-transparent" /></div>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Price</label><input required type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent" /></div>
                      <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Stock</label><input required type="number" value={editingProduct.stock} onChange={(e) => setEditingProduct({...editingProduct, stock: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent" /></div>
                    </div>
                    <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Category</label><select value={editingProduct.category} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent"><option value="농산물">농산물</option><option value="농자재">농자재</option></select></div>
                  </div>
                  <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Description</label><textarea required rows={6} value={editingProduct.description} onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full h-full bg-hanji-white/30 border border-border-light p-5 rounded-sm focus:outline-none focus:border-deep-sage resize-none text-sm leading-relaxed" /></div>
                </div>

                {/* Edit Image Upload Sections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 border-t border-border-light pt-10">
                  <div className="space-y-4">
                    <label className="text-[10px] text-muted uppercase tracking-widest font-bold flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Main Image</label>
                    <div className="relative aspect-square bg-hanji-white rounded-sm overflow-hidden border border-border-light group">
                      <Image src={mainPreview || editingProduct.imageUrl} alt="Main" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">새 이미지 선택</div>
                      <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'main')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  </div>

                  <div className="space-y-4 md:col-span-2">
                    <label className="text-[10px] text-muted uppercase tracking-widest font-bold flex items-center gap-2"><Plus className="w-3 h-3" /> Gallery Images</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                      {/* Existing Gallery Images */}
                      {editingProduct.images?.map((url: string, idx: number) => (
                        <div key={`old-${idx}`} className="relative aspect-square bg-hanji-white rounded-sm overflow-hidden border border-border-light group">
                          <Image src={url} alt="Gallery" fill className="object-cover" />
                          <button type="button" onClick={() => removeExistingImage(idx, 'gallery')} className="absolute top-1 right-1 p-1 bg-terracotta text-white rounded-full transition-all group-hover:scale-110 shadow-lg"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                      {/* New Gallery Previews */}
                      {galleryPreviews.map((src, idx) => (
                        <div key={`new-${idx}`} className="relative aspect-square bg-hanji-white rounded-sm overflow-hidden border-2 border-deep-sage/30 group">
                          <Image src={src} alt="New Gallery" fill className="object-cover" />
                          <button type="button" onClick={() => removeFile(idx, 'gallery')} className="absolute top-1 right-1 p-1 bg-charcoal text-white rounded-full"><X className="w-3 h-3" /></button>
                          <div className="absolute bottom-0 left-0 right-0 bg-deep-sage text-[8px] text-white text-center py-0.5">NEW</div>
                        </div>
                      ))}
                      <label className="aspect-square bg-hanji-white border border-dashed border-border-light rounded-sm flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors">
                        <Plus className="w-6 h-6 text-muted/30" /><input type="file" multiple accept="image/*" onChange={(e) => handleImageChange(e, 'gallery')} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-t border-border-light pt-10">
                  <label className="text-[10px] text-muted uppercase tracking-widest font-bold flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Detail Content Images</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                    {/* Existing Detail Images */}
                    {editingProduct.detail_content_images?.map((url: string, idx: number) => (
                      <div key={`old-det-${idx}`} className="relative aspect-[2/3] bg-hanji-white rounded-sm overflow-hidden border border-border-light group">
                        <Image src={url} alt="Detail" fill className="object-cover" />
                        <button type="button" onClick={() => removeExistingImage(idx, 'detail')} className="absolute top-2 right-2 p-1.5 bg-terracotta text-white rounded-full transition-all group-hover:scale-110 shadow-lg"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    {/* New Detail Previews */}
                    {detailPreviews.map((src, idx) => (
                      <div key={`new-det-${idx}`} className="relative aspect-[2/3] bg-hanji-white rounded-sm overflow-hidden border-2 border-deep-sage/30 group">
                        <Image src={src} alt="New Detail" fill className="object-cover" />
                        <button type="button" onClick={() => removeFile(idx, 'detail')} className="absolute top-2 right-2 p-1.5 bg-charcoal text-white rounded-full"><X className="w-4 h-4" /></button>
                        <div className="absolute bottom-0 left-0 right-0 bg-deep-sage text-[8px] text-white text-center py-1">NEW</div>
                      </div>
                    ))}
                    <label className="aspect-[2/3] bg-hanji-white border border-dashed border-border-light rounded-sm flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors">
                      <Camera className="w-8 h-8 text-muted/30" /><input type="file" multiple accept="image/*" onChange={(e) => handleImageChange(e, 'detail')} className="hidden" />
                    </label>
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-charcoal text-white py-6 rounded-sm hover:bg-deep-sage transition-all font-serif text-2xl flex items-center justify-center gap-4 shadow-2xl">
                  {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Save className="w-8 h-8" />} 수정 내용 저장하기
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
