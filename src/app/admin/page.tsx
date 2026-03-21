'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package, Plus, Image as ImageIcon, LayoutDashboard, Settings, LogOut, Loader2, ShieldAlert } from 'lucide-react';
import { products as initialProducts } from '@/data/mockData';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

// 관리자 권한을 가진 이메일 리스트 (유일복님 이메일)
const ADMIN_EMAILS = ['grow930706@gmail.com'];

export default function AdminDashboard() {
  const [products, setProducts] = useState(initialProducts);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // New product form state
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('농산물');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !ADMIN_EMAILS.includes(session.user.email || '')) {
        alert('관리자 권한이 없습니다. 메인 페이지로 이동합니다.');
        router.push('/');
      } else {
        setIsAdmin(true);
      }
      setIsCheckingAuth(false);
    };
    checkAdmin();
  }, [router]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const newProd = {
      name: newName,
      price: Number(newPrice),
      category: newCategory,
      description: newDesc,
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800'
    };

    try {
      const { data, error } = await supabase
        .from('products')
        .insert([newProd])
        .select();

      if (error) throw error;

      alert('데이터베이스에 상품이 성공적으로 등록되었습니다!');
      if (data) setProducts([data[0] as any, ...products]);
      setIsAdding(false);
      setNewName(''); setNewPrice(''); setNewDesc('');
    } catch (error: any) {
      console.error('DB 저장 오류:', error.message);
      alert('데이터베이스 오류: 테이블 설정을 확인해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hanji-white">
        <Loader2 className="w-8 h-8 animate-spin text-deep-sage" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="flex-1 flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-light bg-hanji-white flex flex-col p-8 sticky top-0 h-screen shadow-sm">
        <h2 className="font-serif text-2xl text-deep-sage mb-12">관리자 센터</h2>
        <nav className="space-y-6 flex-1">
          <button className="flex items-center gap-3 text-charcoal font-medium w-full text-left transition-colors">
            <LayoutDashboard className="w-5 h-5" /> 대시보드
          </button>
          <button className="flex items-center gap-3 text-muted hover:text-charcoal w-full text-left transition-colors">
            <Package className="w-5 h-5" /> 상품 관리
          </button>
          <button className="flex items-center gap-3 text-muted hover:text-charcoal w-full text-left transition-colors">
            <Settings className="w-5 h-5" /> 상점 설정
          </button>
        </nav>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 text-muted hover:text-terracotta w-full text-left transition-colors border-t border-border-light pt-6"
        >
          <LogOut className="w-5 h-5" /> 로그아웃
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-y-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <ShieldAlert className="w-4 h-4 text-deep-sage" />
               <span className="text-[10px] uppercase tracking-widest text-muted">Authorized Admin</span>
            </div>
            <h1 className="font-serif text-4xl mb-2">상품 관리</h1>
            <p className="text-muted text-sm">실시간 데이터베이스와 동기화된 시스템입니다.</p>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-charcoal text-white px-6 py-3 rounded-sm flex items-center gap-2 hover:bg-deep-sage transition-all shadow-md active:scale-95"
          >
            <Plus className="w-5 h-5" /> {isAdding ? '닫기' : '새 상품 등록'}
          </button>
        </div>

        {/* Add Product Form */}
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-hanji-white border border-border-light p-8 rounded-sm mb-12 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-deep-sage" />
            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-muted">상품명</label>
                  <input required value={newName} onChange={(e) => setNewName(e.target.value)} type="text" placeholder="예: 유기농 철원 오대쌀" className="w-full border-b border-border-light bg-transparent py-2 focus:outline-none focus:border-deep-sage transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-muted">판매가 (원)</label>
                  <input required value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" placeholder="0" className="w-full border-b border-border-light bg-transparent py-2 focus:outline-none focus:border-deep-sage transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-muted">카테고리</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full border-b border-border-light bg-transparent py-2 focus:outline-none focus:border-deep-sage transition-colors appearance-none cursor-pointer">
                    <option value="농산물">농산물</option>
                    <option value="농자재">농자재</option>
                  </select>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-muted">상품 상세 설명</label>
                  <textarea required value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="상품의 특징과 장점을 적어주세요." className="w-full h-32 border border-border-light bg-white/50 p-4 rounded-sm focus:outline-none focus:border-deep-sage transition-colors resize-none text-sm leading-relaxed" />
                </div>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-deep-sage text-white py-4 rounded-sm hover:bg-charcoal transition-all duration-300 font-medium flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '상품 등록 완료'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Product List Table */}
        <div className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-hanji-white text-[10px] uppercase tracking-[0.2em] text-muted border-b border-border-light">
              <tr>
                <th className="px-8 py-5 font-semibold">Product Info</th>
                <th className="px-8 py-5 font-semibold">Category</th>
                <th className="px-8 py-5 font-semibold text-right">Price</th>
                <th className="px-8 py-5 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-hanji-white/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className="relative w-14 h-16 rounded-sm overflow-hidden border border-border-light flex-shrink-0 bg-border-light/10">
                        <Image src={product.imageUrl} alt={product.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <span className="font-serif text-xl tracking-tight text-charcoal">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm">
                    <span className="px-3 py-1 bg-deep-sage/5 text-deep-sage rounded-full text-[10px] font-bold uppercase tracking-wider">{product.category}</span>
                  </td>
                  <td className="px-8 py-6 text-right font-medium tracking-tight">
                    {product.price.toLocaleString()}원
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex justify-center gap-4">
                      <button className="text-[11px] uppercase tracking-widest text-muted hover:text-charcoal transition-colors border-b border-transparent hover:border-charcoal pb-0.5">Edit</button>
                      <button className="text-[11px] uppercase tracking-widest text-muted hover:text-terracotta transition-colors border-b border-transparent hover:border-terracotta pb-0.5">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <div className="py-20 text-center text-muted font-light italic">등록된 상품이 없습니다.</div>
          )}
        </div>
      </main>
    </div>
  );
}