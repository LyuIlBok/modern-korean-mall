'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { 
  Package, Plus, LayoutDashboard, LogOut, Loader2, 
  ShoppingCart, Truck, CheckCircle,
  MessageSquare, Users, Trash2, Edit3, X, TrendingUp, Bell, Camera, Search, 
  DollarSign, Save, CreditCard, Wallet, Image as ImageIcon
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { CONFIG } from '@/lib/config';

// Recharts 관련 Prerendering 에러를 방지하기 위해 SalesChart를 클라이언트 사이드에서만 렌더링
const SalesChart = dynamic(() => import('./SalesChart'), { 
  ssr: false,
  loading: () => (
    <div className="h-[400px] flex items-center justify-center bg-white border border-border-light rounded-sm">
      <Loader2 className="w-8 h-8 animate-spin text-deep-sage" />
    </div>
  )
});

export const viewport = { width: 'device-width', initialScale: 1 };

type ActiveTab = 'products' | 'orders' | 'qna' | 'dashboard' | 'restock';

interface AdminProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  shipping_fee: number;
  category: string;
  description: string;
  imageUrl: string;
  images: string[];
  detail_content_images: string[];
  reward_points: number;
  discount_rate: number;
  is_sold_out: boolean;
  created_at: string;
  specs?: {
    origin?: string;
    producer?: string;
  };
}

interface AdminOrderItem {
  quantity: number;
  price: number;
  products: {
    name: string;
  } | null;
}

interface AdminOrder {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  total_price: number;
  status: string;
  payment_method: string;
  memo?: string;
  tracking_number?: string;
  order_items: AdminOrderItem[];
}

interface AdminRestockAlert {
  id: string;
  created_at: string;
  product_id: string;
  user_id: string;
  products: {
    name: string;
    imageUrl: string;
    stock: number;
  } | null;
  profiles: {
    email: string;
    full_name: string;
  } | null;
}

interface SidebarItem {
  id: ActiveTab | 'chat' | 'members';
  label: string;
  icon: any;
  path?: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [restockAlerts, setRestockAlerts] = useState<AdminRestockAlert[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('전체');

  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);

  // New Product States
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('100');
  const [newShippingFee, setNewShippingFee] = useState('0');
  const [newCategory, setNewCategory] = useState('농산물');
  const [newDesc, setNewDesc] = useState('');
  const [newRewardPoints, setNewRewardPoints] = useState('0');
  const [newDiscountRate, setNewDiscountRate] = useState('0');
  const [newOrigin, setNewOrigin] = useState('경기도 연천군');
  const [newProducer, setNewProducer] = useState('농업회사법인 복이네농장(주)');
  
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session || !session.user.email || !CONFIG.ADMIN_EMAILS.includes(session.user.email)) {
        router.replace('/');
        return;
      }

      setIsAdmin(true);
      
      const [productsRes, ordersRes, alertsRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*, order_items(*, products(name))').order('created_at', { ascending: false }),
        supabase.from('restock_alerts').select('*, products(name, imageUrl, stock), profiles(email, full_name)').order('created_at', { ascending: false })
      ]);

      if (productsRes.data) setProducts(productsRes.data as AdminProduct[]);
      if (ordersRes.data) setOrders(ordersRes.data as AdminOrder[]);
      if (alertsRes.data) setRestockAlerts(alertsRes.data as AdminRestockAlert[]);
      
    } catch (err) { 
      console.error('Admin data fetch failed:', err);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [router]);

  // Realtime Subscriptions
  useEffect(() => {
    if (!isAdmin) return;

    const ordersChannel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          fetchData();
        } else if (payload.eventType === 'UPDATE') {
          const newOrder = payload.new as AdminOrder;
          setOrders(prev => prev.map(o => o.id === newOrder.id ? { ...o, ...newOrder } : o));
        }
      })
      .subscribe();

    const productsChannel = supabase
      .channel('admin-products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const newProduct = payload.new as AdminProduct;
          setProducts(prev => prev.map(p => p.id === newProduct.id ? { ...p, ...newProduct } : p));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [isAdmin, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === '전체' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

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

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPrice || !newDesc) return alert('필수 정보를 입력해 주세요.');

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let customImageUrl = 'https://images.unsplash.com/photo-1542838132-92c53300491e';

      if (mainImage) {
        customImageUrl = await uploadFile(mainImage, 'main');
      }

      const productPayload = {
        name: newName, 
        price: Number(newPrice || 0), 
        stock: Number(newStock || 0), 
        shipping_fee: Number(newShippingFee || 0),
        category: newCategory, 
        description: newDesc, 
        imageUrl: customImageUrl,
        is_sold_out: Number(newStock || 0) <= 0,
        reward_points: Number(newRewardPoints || 0),
        discount_rate: Number(newDiscountRate || 0),
        specs: { origin: newOrigin, producer: newProducer }
      };

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productData: productPayload, adminToken: session?.user?.id })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      alert('상품이 등록되었습니다!');
      setIsAdding(false);
      
      // Reset form
      setNewName(''); setNewPrice(''); setNewStock('100'); setNewShippingFee('0');
      setNewDesc(''); setNewRewardPoints('0'); setNewDiscountRate('0');
      setMainImage(null); setMainPreview(null);

      fetchData(); 
    } catch (error: unknown) { 
      const msg = error instanceof Error ? error.message : 'Unknown error';
      alert(msg); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let finalMainUrl = editingProduct.imageUrl;
      
      if (mainImage) {
        finalMainUrl = await uploadFile(mainImage, 'main');
      }

      const productPayload = {
        name: editingProduct.name, 
        price: Number(editingProduct.price || 0), 
        stock: Number(editingProduct.stock || 0), 
        shipping_fee: Number(editingProduct.shipping_fee || 0),
        category: editingProduct.category, 
        description: editingProduct.description, 
        imageUrl: finalMainUrl,
        reward_points: Number(editingProduct.reward_points || 0),
        discount_rate: Number(editingProduct.discount_rate || 0),
        is_sold_out: Number(editingProduct.stock || 0) <= 0,
        specs: editingProduct.specs
      };

      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: editingProduct.id, productData: productPayload, adminToken: session?.user?.id })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      alert('상품 정보가 수정되었습니다.');
      setEditingProduct(null);
      setMainImage(null); setMainPreview(null);
      fetchData();
    } catch (err: unknown) { 
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(msg); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const removeExistingImage = (idx: number) => {
    if (!editingProduct) return;
    const newImages = (editingProduct.images || []).filter((_, i) => i !== idx);
    setEditingProduct({ ...editingProduct, images: newImages });
  };

  const handleDeleteProduct = async (product: AdminProduct) => {
    if (!confirm(`'${product.name}' 상품을 정말로 삭제하시겠습니까?`)) return;
    
    try {
      if (product.imageUrl && product.imageUrl.includes('product-images')) {
        const urlParts = product.imageUrl.split('product-images/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('product-images').remove([filePath]);
        }
      }
      const { error } = await supabase.from('products').delete().eq('id', product.id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== product.id));
      alert('상품이 삭제되었습니다.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`삭제 실패: ${msg}`);
    }
  };

  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center bg-hanji-white text-deep-sage uppercase text-xs">Loading Dashboard...</div>;
  if (!isAdmin) return null;

  const totalSales = orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  const pendingOrdersCount = orders.filter(o => o.status === '결제완료').length;

  const sidebarItems: SidebarItem[] = [
    { id: 'dashboard', label: '운영 현황', icon: TrendingUp },
    { id: 'products', label: '상품 관리', icon: Package },
    { id: 'orders', label: '주문 관리', icon: ShoppingCart },
    { id: 'restock', label: '재입고 알림', icon: Bell },
    { id: 'chat', label: '실시간 상담', icon: MessageSquare, path: '/admin/chat' },
    { id: 'members', label: '회원 관리', icon: Users, path: '/admin/members' },
  ];

  return (
    <div className="flex-1 flex min-h-screen bg-hanji-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-light bg-white flex flex-col p-8 sticky top-0 h-screen shadow-sm">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-deep-sage rounded-sm flex items-center justify-center text-white"><LayoutDashboard className="w-6 h-6" /></div>
          <h2 className="font-serif text-xl text-charcoal">관리자 센터</h2>
        </div>
        <nav className="space-y-4 flex-1">
          {sidebarItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => item.path ? router.push(item.path) : setActiveTab(item.id as ActiveTab)} 
              className={`flex items-center gap-3 w-full p-3 rounded-sm transition-all text-sm ${activeTab === item.id ? 'bg-deep-sage text-white font-bold shadow-md' : 'text-muted hover:bg-hanji-white'}`}
            >
              <item.icon className="w-4 h-4" /> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="flex items-center gap-3 text-muted hover:text-terracotta pt-6 font-medium text-sm border-t border-border-light"><LogOut className="w-4 h-4" /> 로그아웃</button>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-12">
              <div className="flex justify-between items-end">
                <div className="space-y-4">
                  <h1 className="font-serif text-4xl text-charcoal">운영 현황</h1>
                  <p className="text-muted text-sm font-light">복이네농장의 실시간 비즈니스 성과를 분석합니다.</p>
                </div>
              </div>
              <SalesChart />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-10 rounded-sm shadow-sm border border-border-light flex justify-between items-center"><div className="space-y-2"><p className="text-[10px] text-muted uppercase tracking-widest">Total Sales</p><h3 className="text-3xl font-serif text-charcoal">₩{totalSales.toLocaleString()}</h3></div><DollarSign className="w-8 h-8 text-deep-sage opacity-20" /></div>
                <div className="bg-white p-10 rounded-sm shadow-sm border border-border-light flex justify-between items-center"><div className="space-y-2"><p className="text-[10px] text-muted uppercase tracking-widest">Total Orders</p><h3 className="text-3xl font-serif text-charcoal">{orders.length}건</h3></div><ShoppingCart className="w-8 h-8 text-deep-sage opacity-20" /></div>
                <div className="bg-white p-10 rounded-sm shadow-sm border border-border-light flex justify-between items-center"><div className="space-y-2"><p className="text-[10px] text-muted uppercase tracking-widest">Pending Ship</p><h3 className="text-3xl font-serif text-charcoal">{pendingOrdersCount}건</h3></div><Truck className="w-8 h-8 text-terracotta opacity-20" /></div>
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
                          <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Shipping Fee (KRW)</label><input required value={newShippingFee} onChange={(e) => setNewShippingFee(e.target.value)} type="number" placeholder="배송비" className="w-full border-b border-border-light py-2 focus:outline-none" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold text-deep-sage">Reward Points (₩)</label><input value={newRewardPoints} onChange={(e) => setNewRewardPoints(e.target.value)} type="number" placeholder="지급 적립금" className="w-full border-b border-border-light py-2 focus:outline-none font-bold" /></div>
                          <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold text-terracotta">Discount Rate (%)</label><input value={newDiscountRate} onChange={(e) => setNewDiscountRate(e.target.value)} type="number" placeholder="할인율" className="w-full border-b border-border-light py-2 focus:outline-none font-bold" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Origin</label><input value={newOrigin} onChange={(e) => setNewOrigin(e.target.value)} placeholder="원산지" className="w-full border-b border-border-light py-2 focus:outline-none" /></div>
                          <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Producer</label><input value={newProducer} onChange={(e) => setNewProducer(e.target.value)} placeholder="생산자" className="w-full border-b border-border-light py-2 focus:outline-none" /></div>
                        </div>
                        <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Stock</label><input required value={newStock} onChange={(e) => setNewStock(e.target.value)} type="number" placeholder="수량" className="w-full border-b border-border-light py-2 focus:outline-none" /></div>
                        <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Category</label><select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent"><option value="농산물">농산물</option><option value="농자재">농자재</option></select></div>
                      </div>
                      <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Description</label><textarea required value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="상품에 대한 상세한 설명을 적어주세요." className="w-full h-full min-h-[200px] bg-hanji-white/30 border border-border-light p-5 rounded-sm focus:outline-none focus:border-deep-sage resize-none text-sm leading-relaxed" /></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 border-t border-border-light pt-10">
                      <div className="space-y-4">
                        <label className="text-[10px] text-muted uppercase tracking-widest font-bold flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Main Image</label>
                        <div className="relative aspect-square bg-hanji-white rounded-sm overflow-hidden border border-border-light group">
                          {mainPreview ? (
                            <Image src={mainPreview} alt="Main" fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted/30"><Camera className="w-8 h-8 mb-2" /><span className="text-[9px] font-bold">대표 이미지</span></div>
                          )}
                          <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
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
                    <tr><th className="px-8 py-6">상품 정보</th><th className="px-8 py-6">카테고리</th><th className="px-8 py-6 text-right">판매가 / 배송비</th><th className="px-8 py-6 text-right">재고</th><th className="px-8 py-6 text-center">관리</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-hanji-white/30 transition-colors group">
                        <td className="px-8 py-6"><div className="flex items-center gap-5"><div className="relative w-14 h-16 rounded-sm overflow-hidden border border-border-light bg-hanji-white"><Image src={p.imageUrl} alt={p.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" /></div><div className="space-y-1"><p className="font-serif text-lg text-charcoal">{p.name}</p><p className="text-[10px] text-muted font-mono">{p.id.slice(0,8).toUpperCase()}</p></div></div></td>
                        <td className="px-8 py-6 text-xs font-bold text-deep-sage uppercase tracking-wider">{p.category}</td>
                        <td className="px-8 py-6 text-right">
                          <div className="space-y-1">
                            <p className="font-medium text-charcoal">{Number(p.price).toLocaleString()}원</p>
                            <p className="text-[10px] text-muted">배송비: {Number(p.shipping_fee).toLocaleString()}원</p>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${p.stock <= 0 ? 'bg-terracotta/10 text-terracotta' : p.stock <= 5 ? 'bg-orange-50 text-orange-600' : 'bg-charcoal/5 text-charcoal/60'}`}>{p.stock <= 0 ? '품절' : `${p.stock}개`}</span></td>
                        <td className="px-8 py-6 text-center"><div className="flex justify-center gap-3"><button onClick={() => setEditingProduct(p)} className="p-2 hover:bg-deep-sage/10 rounded-full transition-all text-muted hover:text-deep-sage"><Edit3 className="w-4 h-4" /></button><button onClick={() => handleDeleteProduct(p)} className="p-2 hover:bg-terracotta/10 rounded-full transition-all text-muted hover:text-terracotta"><Trash2 className="w-4 h-4" /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              <div className="space-y-4">
                <h1 className="font-serif text-4xl">주문 관리</h1>
                <p className="text-muted text-sm font-light">전체 주문 {orders.length}건을 관리합니다.</p>
              </div>
              <div className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-hanji-white text-[10px] uppercase tracking-[0.2em] text-muted border-b border-border-light">
                    <tr><th className="px-8 py-6">주문 일시 / ID</th><th className="px-8 py-6">상품 정보</th><th className="px-8 py-6">결제 수단</th><th className="px-8 py-6 text-right">총 금액</th><th className="px-8 py-6 text-center">상태</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-hanji-white/30 transition-colors">
                        <td className="px-8 py-6"><div className="space-y-1"><p className="text-sm text-charcoal">{new Date(o.created_at).toLocaleString()}</p><p className="text-[10px] text-muted font-mono">{o.id.slice(0,8).toUpperCase()}</p></div></td>
                        <td className="px-8 py-6"><div className="space-y-1">{o.order_items?.map((item, idx) => (<p key={idx} className="text-xs text-charcoal">· {item.products?.name} ({item.quantity}개)</p>))}</div></td>
                        <td className="px-8 py-6 text-xs text-muted">
                          <div className="flex items-center gap-2">
                            {o.payment_method === 'card' ? <><CreditCard className="w-3.5 h-3.5" /> 카드결제</> : <><Wallet className="w-3.5 h-3.5" /> 무통장</>}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right font-medium">₩{Number(o.total_price).toLocaleString()}</td>
                        <td className="px-8 py-6">
                          <select value={o.status} onChange={async (e) => {
                            const newStatus = e.target.value;
                            const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', o.id);
                            if (!error) setOrders(prev => prev.map(item => item.id === o.id ? { ...item, status: newStatus } : item));
                          }} className="text-[11px] border border-border-light px-2 py-1 rounded-sm focus:outline-none">
                            <option value="결제완료">결제완료</option><option value="배송준비중">배송준비중</option><option value="배송중">배송중</option><option value="배송완료">배송완료</option><option value="취소됨">취소됨</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'restock' && (
            <motion.div key="restock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              <div className="space-y-4">
                <h1 className="font-serif text-4xl">재입고 알림 신청</h1>
                <p className="text-muted text-sm font-light">품절 상품에 대한 {restockAlerts.length}건의 알림 요청이 있습니다.</p>
              </div>
              <div className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-hanji-white text-[10px] uppercase tracking-[0.2em] text-muted border-b border-border-light">
                    <tr><th className="px-8 py-6">신청 일시</th><th className="px-8 py-6">상품 정보</th><th className="px-8 py-6">신청자 정보</th><th className="px-8 py-6 text-center">현재 재고</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {restockAlerts.map((a) => (
                      <tr key={a.id} className="hover:bg-hanji-white/30 transition-colors">
                        <td className="px-8 py-6 text-xs text-muted">{new Date(a.created_at).toLocaleString()}</td>
                        <td className="px-8 py-6"><div className="flex items-center gap-4"><div className="relative w-10 h-12 rounded-sm overflow-hidden bg-hanji-white"><Image src={a.products?.imageUrl || ''} alt="" fill className="object-cover" /></div><p className="text-sm font-medium">{a.products?.name}</p></div></td>
                        <td className="px-8 py-6"><p className="text-sm text-charcoal">{a.profiles?.full_name}</p><p className="text-[10px] text-muted">{a.profiles?.email}</p></td>
                        <td className="px-8 py-6 text-center"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${a.products?.stock && a.products.stock > 0 ? 'bg-green-50 text-green-600' : 'bg-terracotta/10 text-terracotta'}`}>{a.products?.stock || 0}개</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingProduct(null)} className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-4xl rounded-sm shadow-2xl p-12 overflow-y-auto max-h-[90vh]">
              <div className="absolute top-0 left-0 w-full h-1 bg-deep-sage" />
              <div className="flex justify-between items-center mb-10 pb-4 border-b border-border-light">
                <h2 className="font-serif text-3xl">상품 정보 수정</h2>
                <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-hanji-white rounded-full transition-colors"><X className="w-7 h-7" /></button>
              </div>
              <form onSubmit={handleUpdateProduct} className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Product Name</label><input required value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none focus:border-deep-sage text-lg font-serif bg-transparent" /></div>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Price</label><input required type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent" /></div>
                      <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Shipping Fee</label><input required type="number" value={editingProduct.shipping_fee || 0} onChange={(e) => setEditingProduct({...editingProduct, shipping_fee: Number(e.target.value)})} className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent" /></div>
                    </div>
                    <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Stock</label><input required type="number" value={editingProduct.stock} onChange={(e) => setEditingProduct({...editingProduct, stock: Number(e.target.value)})} className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent" /></div>
                    <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Category</label><select value={editingProduct.category} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none bg-transparent"><option value="농산물">농산물</option><option value="농자재">농자재</option></select></div>
                  </div>
                  <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest font-bold">Description</label><textarea required rows={6} value={editingProduct.description} onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full h-full bg-hanji-white/30 border border-border-light p-5 rounded-sm focus:outline-none focus:border-deep-sage resize-none text-sm leading-relaxed" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 border-t border-border-light pt-10">
                  <div className="space-y-4">
                    <label className="text-[10px] text-muted uppercase tracking-widest font-bold flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Main Image</label>
                    <div className="relative aspect-square bg-hanji-white rounded-sm overflow-hidden border border-border-light group">
                      <Image src={mainPreview || editingProduct.imageUrl} alt="Main" fill className="object-cover" />
                      <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  </div>
                  <div className="space-y-4 md:col-span-2">
                    <label className="text-[10px] text-muted uppercase tracking-widest font-bold flex items-center gap-2"><Plus className="w-3 h-3" /> Gallery Images</label>
                    <div className="grid grid-cols-4 gap-4">
                      {editingProduct.images?.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-sm overflow-hidden border border-border-light group">
                          <Image src={url} alt="" fill className="object-cover" />
                          <button type="button" onClick={() => removeExistingImage(idx)} className="absolute top-1 right-1 p-1 bg-terracotta text-white rounded-full"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
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
