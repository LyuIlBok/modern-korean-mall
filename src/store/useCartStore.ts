import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Product } from '../data/mockData';

export interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  userId: string | null;
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setUserId: (id: string | null) => void;
  isOpen: boolean;
  toggleCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      userId: null,
      
      // 사용자 ID 설정 및 장바구니 동기화
      setUserId: (id) => {
        const currentUserId = get().userId;
        // 유저가 바뀌면 (로그인/로그아웃) 기존 장바구니 비움
        if (id !== currentUserId) {
          set({ userId: id, items: [] });
        }
      },

      addItem: (product) => set((state) => {
        const existing = state.items.find(item => item.id === product.id);
        if (existing) {
          return { items: state.items.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) };
        }
        return { items: [...state.items, { ...product, quantity: 1 }] };
      }),

      removeItem: (id) => set((state) => ({ items: state.items.filter(item => item.id !== id) })),

      updateQuantity: (id, quantity) => set((state) => ({
        items: quantity <= 0 
          ? state.items.filter(item => item.id !== id)
          : state.items.map(item => item.id === id ? { ...item, quantity } : item)
      })),

      clearCart: () => set({ items: [] }),
      
      isOpen: false,
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
