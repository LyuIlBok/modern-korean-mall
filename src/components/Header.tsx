'use client';

import Link from 'next/link';
import { ShoppingBag, LogOut, User } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';

export default function Header() {
  const { toggleCart, items } = useCartStore();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    // 세션 정보 가져오기
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getSession();

    // 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    alert('로그아웃 되었습니다.');
  };

  return (
    <header className="sticky top-0 z-50 bg-hanji-white/90 backdrop-blur-md border-b border-border-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-serif text-2xl tracking-tighter text-deep-sage">
          자연의 결
        </Link>
        <nav className="hidden md:flex gap-8">
          <Link href="/shop" className="text-sm text-charcoal/80 hover:text-terracotta transition-colors uppercase tracking-widest">
            Shop
          </Link>
          <Link href="/about" className="text-sm text-charcoal/80 hover:text-terracotta transition-colors uppercase tracking-widest">
            About
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/admin" className="p-2 text-charcoal/60 hover:text-charcoal transition-colors" title="관리자 센터">
                <User className="w-5 h-5" />
              </Link>
              <button 
                onClick={handleLogout}
                className="text-xs text-muted hover:text-terracotta transition-colors uppercase tracking-tighter"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login" className="text-xs text-charcoal/60 hover:text-charcoal transition-colors uppercase tracking-widest">
              Login
            </Link>
          )}
          
          <button 
            onClick={toggleCart}
            className="relative p-2 text-charcoal/80 hover:text-terracotta transition-colors"
            aria-label="장바구니 열기"
          >
            <ShoppingBag className="w-6 h-6" />
            {itemCount > 0 && (
              <span className="absolute top-0 right-0 bg-terracotta text-white text-[10px] font-medium w-4 h-4 flex items-center justify-center rounded-full shadow-sm">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}