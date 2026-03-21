'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, LayoutDashboard, Settings, LogOut, Loader2, 
  ShieldAlert, ShoppingCart, Truck, CheckCircle, Search, Filter, Image as ImageIcon,
  MessageSquare, Send, User
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

const ADMIN_EMAILS = ['grow930706@gmail.com'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'qna' | 'dashboard'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // Chat/QnA State
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

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

  const updateOrderStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
      alert('상태가 업데이트되었습니다.');
    } catch (error: any) { alert(`업데이트 실패: ${error.message}`); }
  };

  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center bg-hanji-white text-deep-sage">불러오는 중...</div>;
  if (!isAdmin) return null;

  return (
    <div className="flex-1 flex min-h-screen bg-white">
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
                      <tr key={p.id} className="hover:bg-hanji-white/50 transition-colors">
                        <td className="px-8 py-6"><div className="flex items-center gap-5"><div className="relative w-12 h-14 rounded-sm overflow-hidden border border-border-light"><Image src={p.imageUrl} alt={p.name} fill className="object-cover" /></div><span className="font-serif text-lg">{p.name}</span></div></td>
                        <td className="px-8 py-6 text-xs font-bold text-deep-sage">{p.category}</td>
                        <td className="px-8 py-6 text-right font-medium">{p.price.toLocaleString()}원</td>
                        <td className="px-8 py-6 text-center text-[11px] text-muted hover:text-charcoal cursor-pointer">Edit</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="font-serif text-4xl mb-12">주문 관리</h1>
              <div className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm">
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
                        <td className="px-8 py-6 text-center"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${o.status === '배송중' ? 'bg-deep-sage/10 text-deep-sage' : 'bg-charcoal/10 text-charcoal'}`}>{o.status}</span></td>
                        <td className="px-8 py-6 text-center"><div className="flex justify-center gap-2">
                          {o.status === '결제완료' && <button onClick={() => updateOrderStatus(o.id, '배송중')} className="p-2 hover:bg-deep-sage/10 text-deep-sage rounded-full"><Truck className="w-4 h-4" /></button>}
                          {o.status === '배송중' && <button onClick={() => updateOrderStatus(o.id, '배송완료')} className="p-2 hover:bg-green-100 text-green-700 rounded-full"><CheckCircle className="w-4 h-4" /></button>}
                        </div></td>
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
              <div className="flex-1 flex gap-8 min-h-0">
                {/* Chat List */}
                <div className="w-1/3 bg-white border border-border-light rounded-sm overflow-y-auto shadow-sm">
                  {[
                    { id: '1', name: '김철수', last: '배송 언제 되나요?', time: '10:30 AM', unread: true },
                    { id: '2', name: '이영희', last: '상품 너무 좋아요!', time: '어제', unread: false },
                  ].map(chat => (
                    <div key={chat.id} onClick={() => setSelectedChat(chat.id)} className={`p-6 border-b border-border-light cursor-pointer hover:bg-hanji-white transition-colors ${selectedChat === chat.id ? 'bg-hanji-white' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-serif text-lg">{chat.name}</span>
                        <span className="text-[10px] text-muted">{chat.time}</span>
                      </div>
                      <p className="text-sm text-muted line-clamp-1">{chat.last}</p>
                      {chat.unread && <div className="mt-2 w-2 h-2 bg-deep-sage rounded-full" />}
                    </div>
                  ))}
                </div>
                {/* Chat View */}
                <div className="flex-1 bg-hanji-white border border-border-light rounded-sm flex flex-col shadow-sm">
                  {selectedChat ? (
                    <>
                      <div className="p-6 border-b border-border-light bg-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-deep-sage/10 flex items-center justify-center"><User className="w-5 h-5 text-deep-sage" /></div>
                        <div><h3 className="font-serif text-xl">김철수 님과의 대화</h3><p className="text-[10px] text-deep-sage uppercase tracking-widest">Customer ID: {selectedChat}</p></div>
                      </div>
                      <div className="flex-1 p-8 overflow-y-auto space-y-6">
                        <div className="flex justify-start"><div className="max-w-[70%] bg-white border border-border-light p-4 rounded-2xl rounded-tl-none text-sm shadow-sm">배송 언제 되나요? 쌀이 똑 떨어졌어요!</div></div>
                        <div className="flex justify-end"><div className="max-w-[70%] bg-charcoal text-white p-4 rounded-2xl rounded-tr-none text-sm shadow-md">안녕하세요 김철수 고객님! 오늘 오후 발송 예정입니다. 조금만 기다려주세요!</div></div>
                      </div>
                      <div className="p-6 bg-white border-t border-border-light">
                        <div className="flex gap-3 relative">
                          <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="답장을 입력하세요..." className="flex-1 bg-hanji-white px-5 py-3 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-deep-sage pr-12" />
                          <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-charcoal text-white rounded-full flex items-center justify-center hover:bg-deep-sage transition-colors"><Send className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted">
                      <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                      <p className="font-serif italic text-lg">대화방을 선택해 주세요</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
