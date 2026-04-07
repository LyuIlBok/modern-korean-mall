import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Product } from '../data/mockData';
import { supabase } from '../lib/supabaseClient';

interface WishlistState {
  items: Product[];
  userId: string | null;
  setUserId: (id: string | null) => void;
  toggleWish: (product: Product) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  syncWithSupabase: () => Promise<void>;
}

interface WishlistItem {
  products: Product | null;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      userId: null,

      setUserId: (id) => {
        set({ userId: id });
        if (id) {
          get().syncWithSupabase();
        }
      },

      isInWishlist: (productId) => {
        return get().items.some(item => item.id === productId);
      },

      toggleWish: async (product) => {
        const userId = get().userId;
        const isCurrentlyIn = get().isInWishlist(product.id);
        
        // 로컬 상태 먼저 업데이트 (즉각적 반응)
        if (isCurrentlyIn) {
          set({ items: get().items.filter(item => item.id !== product.id) });
        } else {
          set({ items: [...get().items, product] });
        }

        // 로그인 상태면 Supabase와 동기화
        if (userId) {
          try {
            if (isCurrentlyIn) {
              await supabase
                .from('wishlists')
                .delete()
                .eq('user_id', userId)
                .eq('product_id', product.id);
            } else {
              await supabase
                .from('wishlists')
                .insert([{ user_id: userId, product_id: product.id }]);
            }
          } catch (error) {
            console.error('Wishlist sync error:', error);
          }
        }
      },

      syncWithSupabase: async () => {
        const userId = get().userId;
        if (!userId) return;

        try {
          const { data, error } = await supabase
            .from('wishlists')
            .select('products(*)')
            .eq('user_id', userId);
          
          if (error) throw error;
          
          if (data) {
            const products = (data as unknown as WishlistItem[])
              .map((item) => item.products)
              .filter((p): p is Product => p !== null);
            set({ items: products });
          }
        } catch (error) {
          console.error('Wishlist fetch error:', error);
        }
      }
    }),
    {
      name: 'wishlist-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
