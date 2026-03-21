'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Image as ImageIcon, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { products as initialProducts } from '@/data/mockData';
import Image from 'next/image';

export default function AdminDashboard() {
  const [products, setProducts] = useState(initialProducts);
  const [isAdding, setIsAdding] = useState(false);

  // New product form state
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('농산물');
  const [newDesc, setNewDesc] = useState('');

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProd = {
      id: `p${Date.now()}`,
      name: newName,
      price: Number(newPrice),
      category: newCategory as any,
      description: newDesc,
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800' // Default placeholder
    };
    setProducts([newProd, ...products]);
    setIsAdding(false);
    // Reset form
    setNewName(''); setNewPrice(''); setNewDesc('');
    alert('상품이 성공적으로 등록되었습니다.');
  };

  return (
    <div className="flex-1 flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-light bg-hanji-white flex flex-col p-8 sticky top-0 h-screen">
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
        <button className="flex items-center gap-3 text-muted hover:text-terracotta w-full text-left transition-colors border-t border-border-light pt-6">
          <LogOut className="w-5 h-5" /> 로그아웃
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-y-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="font-serif text-4xl mb-2">상품 관리</h1>
            <p className="text-muted">총 {products.length}개의 상품이 등록되어 있습니다.</p>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-deep-sage text-white px-6 py-3 rounded-sm flex items-center gap-2 hover:bg-deep-sage/90 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-5 h-5" /> {isAdding ? '닫기' : '새 상품 등록'}
          </button>
        </div>

        {/* Add Product Form */}
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-hanji-white border border-border-light p-8 rounded-sm mb-12 shadow-sm"
          >
            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest text-muted">상품명</label>
                  <input required value={newName} onChange={(e) => setNewName(e.target.value)} type="text" className="w-full border-b border-border-light bg-transparent py-2 focus:outline-none focus:border-charcoal transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest text-muted">판매가 (원)</label>
                  <input required value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" className="w-full border-b border-border-light bg-transparent py-2 focus:outline-none focus:border-charcoal transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest text-muted">카테고리</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full border-b border-border-light bg-transparent py-2 focus:outline-none focus:border-charcoal transition-colors appearance-none">
                    <option value="농산물">농산물</option>
                    <option value="농자재">농자재</option>
                  </select>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest text-muted">상품 설명</label>
                  <textarea required value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="w-full h-32 border border-border-light bg-transparent p-3 rounded-sm focus:outline-none focus:border-charcoal transition-colors resize-none" />
                </div>
                <button type="submit" className="w-full bg-charcoal text-white py-4 rounded-sm hover:bg-deep-sage transition-colors font-medium">등록 완료하기</button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Product List Table */}
        <div className="bg-white border border-border-light rounded-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-hanji-white text-xs uppercase tracking-widest text-muted border-b border-border-light">
              <tr>
                <th className="px-6 py-4 font-medium">상품 정보</th>
                <th className="px-6 py-4 font-medium">카테고리</th>
                <th className="px-6 py-4 font-medium text-right">가격</th>
                <th className="px-6 py-4 font-medium text-center">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-hanji-white/50 transition-colors group">
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12 rounded-sm overflow-hidden border border-border-light flex-shrink-0">
                        <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                      </div>
                      <span className="font-serif text-lg">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-sm">
                    <span className="px-2 py-1 bg-border-light/40 rounded-sm text-xs font-medium text-muted">{product.category}</span>
                  </td>
                  <td className="px-6 py-6 text-right font-medium">
                    {product.price.toLocaleString()}원
                  </td>
                  <td className="px-6 py-6 text-center">
                    <button className="text-xs text-muted hover:text-charcoal transition-colors border-b border-muted hover:border-charcoal pb-0.5">수정</button>
                    <button className="text-xs text-muted hover:text-terracotta transition-colors border-b border-muted hover:border-terracotta pb-0.5 ml-4">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}