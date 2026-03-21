'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, LayoutDashboard, Settings, LogOut, Loader2, 
  ShieldAlert, ShoppingCart, Truck, CheckCircle, Search, Filter, Image as ImageIcon,
  MessageSquare, Send, User, Trash2, Edit3, X, TrendingUp, DollarSign
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

const ADMIN_EMAILS = ['grow930706@gmail.com'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'qna' | 'dashboard'>('dashboard');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // Editing state
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // New product form state
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('농산물');
  const [newDesc, setNewDesc] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !ADMIN_EMAILS.includes(session.user.email || '')) {
        alert('관리자 권한이 없습니다.');
        router.push('/');
        return;
      }
      setIsAdmin(true);
      
      const { data: prodData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (prodData) setProducts(prodData);
      
      const { data: orderData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (orderData) setOrders(orderData);
      
      setIsCheckingAuth(false);
    };
    fetchData();
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let imageUrl = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800';
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `products/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
        imageUrl = publicUrl;
      }
      const { data, error } = await supabase.from('products').insert([{
        name: newName, price: Number(newPrice), category: newCategory, description: newDesc, imageUrl
      }]).select();
      if (error) throw error;
      alert('상품이 등록되었습니다!');
      if (data) setProducts([data[0], ...products]);
      setIsAdding(false);
      setNewName(''); setNewPrice(''); setNewDesc(''); setImageFile(null); setImagePreview(null);
    } catch (error: any) { alert(`오류: ${error.message}`); } finally { setIsLoading(false); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('정말로 이 상품을 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
      alert('상품이 삭제되었습니다.');
    } catch (error: any) { alert(`삭제 실패: ${error.message}`); }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.from('products').update({
        name: editingProduct.name,
        price: Number(editingProduct.price),
        category: editingProduct.category,
        description: editingProduct.description
      }).eq('id', editingProduct.id);
      if (error) throw error;
      setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
      setEditingProduct(null);
      alert('상품 정보가 수정되었습니다.');
    } catch (error: any) { alert(`수정 실패: ${error.message}`); } finally { setIsLoading(false); }
  };

  const updateOrderStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
      alert('상태가 업데이트되었습니다.');
    } catch (error: any) { alert(`업데이트 실패: ${error.message}`); }
  };

  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center bg-hanji-white text-deep-sage tracking-widest uppercase text-xs">Connecting to Dashboard...</div>;
  if (!isAdmin) return null;

  const totalSales = orders.reduce((sum, o) => sum + o.total_price, 0);
  const pendingOrders = orders.filter(o => o.status === '결제완료').length;

  return (
    <div className="flex-1 flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-light bg-hanji-white flex flex-col p-8 sticky top-0 h-screen shadow-sm">
        <h2 className="font-serif text-2xl text-deep-sage mb-12">관리자 센터</h2>
        <nav className="space-y-6 flex-1 text-sm">
          <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3 w-full text-left font-medium ${activeTab === 'dashboard' ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}><LayoutDashboard className="w-4 h-4" /> 대시보드</button>
          <button onClick={() => setActiveTab('products')} className={`flex items-center gap-3 w-full text-left font-medium ${activeTab === 'products' ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}><Package className="w-4 h-4" /> 상품 관리</button>
          <button onClick={() => setActiveTab('orders')} className={`flex items-center gap-3 w-full text-left font-medium ${activeTab === 'orders' ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}><ShoppingCart className="w-4 h-4" /> 주문 관리</button>
          <button onClick={() => setActiveTab('qna')} className={`flex items-center gap-3 w-full text-left font-medium ${activeTab === 'qna' ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}><MessageSquare className="w-4 h-4" /> 문의 관리</button>
        </nav>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="flex items-center gap-3 text-muted hover:text-terracotta border-t border-border-light pt-6 font-medium text-sm"><LogOut className="w-4 h-4" /> 로그아웃</button>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              <h1 className="font-serif text-4xl mb-12 text-charcoal">운영 현황</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-hanji-white p-8 border border-border-light rounded-sm">
                  <p className="text-[10px] uppercase tracking-widest text-muted mb-4">Total Sales</p>
                  <div className="flex items-end justify-between">
                    <h3 className="text-3xl font-serif text-charcoal">₩{totalSales.toLocaleString()}</h3>
                    <TrendingUp className="w-6 h-6 text-deep-sage opacity-40" />
                  </div>
                </div>
                <div className="bg-hanji-white p-8 border border-border-light rounded-sm">
                  <p className="text-[10px] uppercase tracking-widest text-muted mb-4">Total Orders</p>
                  <div className="flex items-end justify-between">
                    <h3 className="text-3xl font-serif text-charcoal">{orders.length}건</h3>
                    <ShoppingCart className="w-6 h-6 text-deep-sage opacity-40" />
                  </div>
                </div>
                <div className="bg-hanji-white p-8 border border-border-light rounded-sm">
                  <p className="text-[10px] uppercase tracking-widest text-muted mb-4">Pending Shipment</p>
                  <div className="flex items-end justify-between">
                    <h3 className="text-3xl font-serif text-charcoal">{pendingOrders}건</h3>
                    <Truck className="w-6 h-6 text-terracotta opacity-40" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-12 border border-border-light rounded-sm text-center">
                <p className="text-muted italic">실시간 판매 분석 그래프가 준비 중입니다.</p>
              </div>
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div key="products" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex justify-between items-center mb-12">
                <h1 className="font-serif text-4xl">상품 관리</h1>
                <button onClick={() => setIsAdding(!isAdding)} className="bg-charcoal text-white px-6 py-3 rounded-sm flex items-center gap-2 hover:bg-deep-sage transition-all">{isAdding ? '닫기' : '새 상품 등록'}</button>
              </div>
              {isAdding && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-hanji-white border border-border-light p-8 rounded-sm mb-12 shadow-sm relative">
                  <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <input required value={newName} onChange={(e) => setNewName(e.target.value)} type="text" placeholder="상품명" className="w-full border-b border-border-light bg-transparent py-2 focus:outline-none focus:border-deep-sage" />
                      <input required value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" placeholder="판매가 (원)" className="w-full border-b border-border-light bg-transparent py-2 focus:outline-none focus:border-deep-sage" />
                      <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full border-b border-border-light bg-transparent py-2 focus:outline-none focus:border-deep-sage cursor-pointer">
                        <option value="농산물">농산물</option><option value="농자재">농자재</option>
                      </select>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="relative w-20 h-24 bg-white border border-border-light rounded-sm overflow-hidden">{imagePreview ? <Image src={imagePreview} alt="Preview" fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted/30"><ImageIcon className="w-6 h-6" /></div>}</div>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs text-muted" />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <textarea required value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="상품 상세 설명" className="w-full h-32 border border-border-light bg-white/50 p-4 rounded-sm focus:outline-none focus:border-deep-sage resize-none text-sm" />
                      <button type="submit" disabled={isLoading} className="w-full bg-deep-sage text-white py-4 rounded-sm hover:bg-charcoal transition-all font-medium">{isLoading ? '처리 중...' : '상품 등록 완료'}</button>
                    </div>
                  </form>
                </motion.div>
              )}
              <div className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-hanji-white text-[10px] uppercase tracking-[0.2em] text-muted border-b border-border-light">
                    <tr><th className="px-8 py-5">Product Info</th><th className="px-8 py-5">Category</th><th className="px-8 py-5 text-right">Price</th><th className="px-8 py-5 text-center">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-hanji-white/50 transition-colors group">
                        <td className="px-8 py-6"><div className="flex items-center gap-5"><div className="relative w-12 h-14 rounded-sm overflow-hidden border border-border-light"><Image src={p.imageUrl} alt={p.name} fill className="object-cover" /></div><span className="font-serif text-lg">{p.name}</span></div></td>
                        <td className="px-8 py-6 text-xs font-bold text-deep-sage">{p.category}</td>
                        <td className="px-8 py-6 text-right font-medium">{p.price.toLocaleString()}원</td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex justify-center gap-3">
                            <button onClick={() => setEditingProduct(p)} className="p-2 hover:text-deep-sage transition-colors"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-2 hover:text-terracotta transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
{activeTab === 'orders' && (
  <motion.div key="orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    <div className="flex justify-between items-center mb-12">
      <h1 className="font-serif text-4xl">주문 관리</h1>
      <button 
        onClick={() => {
          const headers = ['Order ID', 'Customer Name', 'Phone', 'Total Price', 'Status', 'Date'];
          const rows = orders.map(o => [
            o.id, o.customer_name, o.customer_phone, o.total_price, o.status, new Date(o.created_at).toLocaleDateString()
          ]);
          const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
          const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `orders_${new Date().toLocaleDateString()}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }}
        className="bg-deep-sage text-white px-6 py-2 rounded-sm text-xs uppercase tracking-widest hover:bg-charcoal transition-all shadow-sm flex items-center gap-2"
      >
        Excel Download
      </button>
    </div>
    <div className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm">
...

                <table className="w-full text-left border-collapse">
                  <thead className="bg-hanji-white text-[10px] uppercase tracking-[0.2em] text-muted border-b border-border-light">
                    <tr><th className="px-8 py-5">Order ID</th><th className="px-8 py-5">Customer</th><th className="px-8 py-5 text-right">Total</th><th className="px-8 py-5 text-center">Status</th><th className="px-8 py-5 text-center">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-hanji-white/50 transition-colors text-sm">
                        <td className="px-8 py-6 font-serif">{o.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-8 py-6">{o.customer_name}<br/><span className="text-[10px] text-muted">{o.customer_phone}</span></td>
                        <td className="px-8 py-6 text-right font-medium">{o.total_price.toLocaleString()}원</td>
                        <td className="px-8 py-6 text-center"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${o.status === '배송중' ? 'bg-deep-sage/10 text-deep-sage' : o.status === '배송완료' ? 'bg-green-50 text-green-600' : 'bg-charcoal/10 text-charcoal'}`}>{o.status}</span></td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex justify-center gap-2">
                            {o.status === '결제완료' && <button onClick={() => updateOrderStatus(o.id, '배송중')} className="p-2 hover:bg-deep-sage/10 text-deep-sage rounded-full"><Truck className="w-4 h-4" /></button>}
                            {o.status === '배송중' && <button onClick={() => updateOrderStatus(o.id, '배송완료')} className="p-2 hover:bg-green-100 text-green-700 rounded-full"><CheckCircle className="w-4 h-4" /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'qna' && (
            <motion.div key="qna" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="h-[calc(100vh-100px)] flex flex-col">
              <h1 className="font-serif text-4xl mb-8">문의 관리</h1>
              <p className="text-muted italic">실시간 채팅 리스트가 준비 중입니다.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingProduct(null)} className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-2xl rounded-sm shadow-2xl p-12 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-deep-sage" />
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-serif text-3xl">상품 정보 수정</h2>
                <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-hanji-white rounded-full"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleUpdateProduct} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-muted">Product Name</label>
                    <input required value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none focus:border-deep-sage" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-muted">Price</label>
                    <input required type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none focus:border-deep-sage" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-muted">Category</label>
                    <select value={editingProduct.category} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none focus:border-deep-sage">
                      <option value="농산물">농산물</option><option value="농자재">농자재</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-muted">Description</label>
                    <textarea required rows={5} value={editingProduct.description} onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full border border-border-light p-4 text-sm focus:outline-none focus:border-deep-sage resize-none bg-hanji-white/30" />
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full bg-charcoal text-white py-4 hover:bg-deep-sage transition-all font-medium">수정 내용 저장</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
