'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, LogOut, User, Menu, X, Leaf, Search } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { toggleCart, items, setUserId } = useCartStore();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setUserId(currentUser?.id ?? null); // 장바구니 유저 ID 설정
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setUserId(currentUser?.id ?? null); // 장바구니 유저 ID 설정
    });

    return () => subscription.unsubscribe();
  }, [setUserId]);

  // 검색창 열릴 때 포커스
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    alert('로그아웃 되었습니다.');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const navLinks = [
    { name: 'Shop', href: '/shop' },
    { name: 'About', href: '/about' },
    { name: 'Cart', href: '/cart' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-hanji-white/90 backdrop-blur-md border-b border-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Menu & Search */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-charcoal/80 hover:text-deep-sage transition-colors"
              aria-label="메뉴 열기"
            >
              <Menu className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-charcoal/80 hover:text-deep-sage transition-colors"
              aria-label="검색 열기"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          <Link href="/" className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0">
            <div className="relative h-10 w-32">
              <Image 
                src="/logo.bmp" 
                alt="자연의 결" 
                fill 
                className="object-contain"
                priority
              />
            </div>
          </Link>

          <nav className="hidden md:flex gap-8">
            {navLinks.filter(link => link.name !== 'Cart').map(link => (
              <Link key={link.name} href={link.href} className="text-sm text-charcoal/80 hover:text-terracotta transition-colors uppercase tracking-widest">
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Right: User & Cart */}
          <div className="flex items-center gap-1 sm:gap-4">
            {user ? (
              <div className="flex items-center gap-1 sm:gap-3">
                <Link href="/mypage" className="p-2 text-charcoal/60 hover:text-charcoal transition-colors hidden sm:block" title="마이페이지">
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

        {/* Search Overlay */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-x-0 top-full bg-white border-b border-border-light shadow-xl p-4 md:p-8"
            >
              <form onSubmit={handleSearch} className="max-w-3xl mx-auto relative">
                <input 
                  ref={searchInputRef}
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="무엇을 찾으시나요? (예: 오대쌀, 호미)"
                  className="w-full bg-hanji-white border-none focus:ring-0 text-xl md:text-3xl font-serif py-4 pr-12 placeholder:text-muted/30"
                />
                <button type="submit" className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-deep-sage">
                  <Search className="w-8 h-8" />
                </button>
                <div className="mt-4 flex gap-4 text-xs text-muted">
                  <span>추천:</span>
                  <button type="button" onClick={() => {setSearchQuery('쌀'); }} className="hover:text-charcoal">#쌀</button>
                  <button type="button" onClick={() => {setSearchQuery('호미'); }} className="hover:text-charcoal">#호미</button>
                  <button type="button" onClick={() => {setSearchQuery('친환경'); }} className="hover:text-charcoal">#친환경</button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
            />
            
            {/* Drawer */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-[280px] bg-hanji-white shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-6 border-b border-border-light">
                <Link href="/" onClick={() => setIsMenuOpen(false)}>
                  <div className="relative h-8 w-24">
                    <Image 
                      src="/logo.bmp" 
                      alt="자연의 결" 
                      fill 
                      className="object-contain"
                    />
                  </div>
                </Link>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 text-muted hover:text-charcoal">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1 px-6 py-12 space-y-8">
                {navLinks.map((link) => (
                  <Link 
                    key={link.name} 
                    href={link.href} 
                    onClick={() => setIsMenuOpen(false)}
                    className="block text-2xl font-serif text-charcoal hover:text-deep-sage transition-colors"
                  >
                    {link.name === 'Shop' ? '만물상' : link.name === 'About' ? '이야기' : '장바구니'}
                    <span className="block text-[10px] uppercase tracking-[0.2em] text-muted mt-1 font-sans">{link.name}</span>
                  </Link>
                ))}
              </nav>

              <div className="p-6 border-t border-border-light">
                {user ? (
                  <div className="flex flex-col gap-4">
                    <p className="text-xs text-muted">{user.email}님 반가워요</p>
                    <button 
                      onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                      className="text-sm font-medium text-terracotta w-fit"
                    >
                      로그아웃
                    </button>
                  </div>
                ) : (
                  <Link 
                    href="/login" 
                    onClick={() => setIsMenuOpen(false)}
                    className="text-sm font-medium text-charcoal border-b border-charcoal/20 pb-1"
                  >
                    로그인하고 시작하기
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
