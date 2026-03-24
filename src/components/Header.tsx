'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, LogOut, User, Menu, X, Leaf, Search, Heart, Globe, TrendingUp, Sparkles } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useHasMounted } from '@/hooks/useHasMounted';

export default function Header() {
  const { toggleCart, items, setUserId: setCartUserId } = useCartStore();
  const { setUserId: setWishUserId, items: wishItems } = useWishlistStore();
  const { language, setLanguage, t } = useLanguageStore();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const hasMounted = useHasMounted();
  
  const itemCount = hasMounted ? items.reduce((total, item) => total + item.quantity, 0) : 0;
  const wishCount = hasMounted ? wishItems.length : 0;

  const popularKeywords = language === 'ko' 
    ? ['연천 오대쌀', '꿀고구마', '무쇠 가마솥', '햅쌀', '유기농']
    : ['Rice', 'Sweet Potato', 'Iron Pot', 'Organic', 'New Harvest'];

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      const uid = currentUser?.id ?? null;
      setCartUserId(uid);
      setWishUserId(uid);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      const uid = currentUser?.id ?? null;
      setCartUserId(uid);
      setWishUserId(uid);
    });

    return () => subscription.unsubscribe();
  }, [setCartUserId, setWishUserId]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      alert(language === 'ko' ? '로그아웃 중 오류가 발생했습니다.' : 'Error during logout.');
    } else {
      alert(language === 'ko' ? '로그아웃 되었습니다.' : 'Logged out successfully.');
      router.push('/');
      router.refresh();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const quickSearch = (word: string) => {
    router.push(`/shop?q=${encodeURIComponent(word)}`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const navLinks = [
    { name: t?.common?.shop || 'Shop', href: '/shop', key: 'Shop' },
    { name: t?.common?.about || 'About', href: '/about', key: 'About' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-hanji-white/90 backdrop-blur-md border-b border-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
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
            
            <div className="hidden lg:flex items-center ml-4 bg-white border border-border-light rounded-full p-0.5 shadow-sm">
              <button onClick={() => setLanguage('ko')} className={`px-3 py-1 text-[9px] font-bold rounded-full transition-all ${language === 'ko' ? 'bg-charcoal text-white' : 'text-muted hover:text-charcoal'}`}>KO</button>
              <button onClick={() => setLanguage('en')} className={`px-3 py-1 text-[9px] font-bold rounded-full transition-all ${language === 'en' ? 'bg-charcoal text-white' : 'text-muted hover:text-charcoal'}`}>EN</button>
            </div>
          </div>

          <Link href="/" className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0">
            <div className="relative h-16 w-72 sm:w-80">
              <Image src="/logo_main.png" alt="자연의 결" fill className="object-contain" priority quality={100} />
            </div>
          </Link>

          <nav className="hidden md:flex gap-8">
            {navLinks.map(link => (
              <Link key={link.key} href={link.href} className="text-xs text-charcoal/80 hover:text-terracotta transition-colors uppercase tracking-[0.2em] font-medium">
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-4">
            <Link href="/mypage?tab=wishlist" className="relative p-2 text-charcoal/60 hover:text-terracotta transition-colors" title="관심 상품">
              <Heart className="w-5 h-5" />
              {wishCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-terracotta rounded-full shadow-sm" />}
            </Link>

            {user ? (
              <div className="flex items-center gap-1 sm:gap-3">
                <Link href="/mypage" className="p-2 text-charcoal/60 hover:text-charcoal transition-colors hidden sm:block" title="마이페이지"><User className="w-5 h-5" /></Link>
                <button onClick={handleLogout} className="text-[10px] text-muted hover:text-terracotta transition-colors uppercase tracking-tighter">{t?.common?.logout || 'Logout'}</button>
              </div>
            ) : (
              <Link href="/login" className="text-[10px] text-charcoal/60 hover:text-charcoal transition-colors uppercase tracking-widest">{t?.common?.login || 'Login'}</Link>
            )}
            
            <button onClick={toggleCart} className="relative p-2 text-charcoal/80 hover:text-terracotta transition-colors" aria-label="장바구니 열기">
              <ShoppingBag className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 bg-terracotta text-white text-[10px] font-medium w-4 h-4 flex items-center justify-center rounded-full shadow-sm">{itemCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Search Overlay Enhanced */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-x-0 top-full bg-white border-b border-border-light shadow-2xl z-50"
            >
              <div className="max-w-4xl mx-auto p-8 md:p-16">
                <form onSubmit={handleSearch} className="relative mb-12">
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t?.common?.searchPlaceholder || 'Search...'}
                    className="w-full bg-transparent border-b-2 border-border-light focus:border-deep-sage transition-colors text-2xl md:text-5xl font-serif py-6 pr-12 focus:outline-none placeholder:text-muted/20"
                  />
                  <button type="submit" className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-deep-sage hover:scale-110 transition-transform">
                    <Search className="w-10 h-10" />
                  </button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div>
                    <h4 className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted font-bold mb-6">
                      <TrendingUp className="w-3 h-3" /> Popular Keywords
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {popularKeywords.map(word => (
                        <button 
                          key={word} 
                          onClick={() => quickSearch(word)}
                          className="px-4 py-2 bg-hanji-white hover:bg-deep-sage hover:text-white border border-border-light rounded-full text-xs transition-all duration-300"
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted font-bold mb-6">
                      <Sparkles className="w-3 h-3" /> Recommended
                    </h4>
                    <div className="space-y-4">
                      <button onClick={() => quickSearch('Produce')} className="flex items-center justify-between w-full group text-left">
                        <span className="font-serif text-lg group-hover:text-deep-sage transition-colors">{t?.shop?.category1 || 'Produce'}</span>
                        <span className="text-[10px] text-muted opacity-0 group-hover:opacity-100 transition-opacity">EXPLORE →</span>
                      </button>
                      <button onClick={() => quickSearch('Materials')} className="flex items-center justify-between w-full group text-left border-t border-border-light pt-4">
                        <span className="font-serif text-lg group-hover:text-deep-sage transition-colors">{t?.shop?.category2 || 'Materials'}</span>
                        <span className="text-[10px] text-muted opacity-0 group-hover:opacity-100 transition-opacity">EXPLORE →</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsSearchOpen(false)} className="absolute top-8 right-8 p-2 text-muted hover:text-charcoal hover:rotate-90 transition-all duration-300">
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute inset-y-0 left-0 w-[280px] bg-hanji-white shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-6 py-6 border-b border-border-light">
                <Link href="/" onClick={() => setIsMenuOpen(false)}>
                  <div className="relative h-8 w-32"><Image src="/logo_main.png" alt="자연의 결" fill className="object-contain" /></div>
                </Link>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 text-muted hover:text-charcoal"><X className="w-6 h-6" /></button>
              </div>
              <nav className="flex-1 px-6 py-12 space-y-8">
                {navLinks.map((link) => (
                  <Link key={link.key} href={link.href} onClick={() => setIsMenuOpen(false)} className="block text-2xl font-serif text-charcoal hover:text-deep-sage transition-colors">
                    {link.name}<span className="block text-[10px] uppercase tracking-[0.2em] text-muted mt-1 font-sans">{link.key}</span>
                  </Link>
                ))}
                <div className="pt-8 border-t border-border-light">
                  <p className="text-[10px] uppercase tracking-widest text-muted mb-4">Language</p>
                  <div className="flex gap-4">
                    <button onClick={() => setLanguage('ko')} className={`text-sm font-medium ${language === 'ko' ? 'text-charcoal border-b border-charcoal' : 'text-muted'}`}>한국어 (KO)</button>
                    <button onClick={() => setLanguage('en')} className={`text-sm font-medium ${language === 'en' ? 'text-charcoal border-b border-charcoal' : 'text-muted'}`}>English (EN)</button>
                  </div>
                </div>
              </nav>
              <div className="p-6 border-t border-border-light">
                {user ? (
                  <div className="flex flex-col gap-4">
                    <p className="text-xs text-muted">{user.email}</p>
                    <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="text-sm font-medium text-terracotta w-fit">{t?.common?.logout || 'Logout'}</button>
                  </div>
                ) : (
                  <Link href="/login" onClick={() => setIsMenuOpen(false)} className="text-sm font-medium text-charcoal border-b border-charcoal/20 pb-1">{t?.common?.login || 'Login'}</Link>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
