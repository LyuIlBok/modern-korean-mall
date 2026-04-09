import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  description?: string | null;
  quantity: number;
  shipping_fee: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  userId: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: (open?: boolean) => void;
  setUserId: (id: string | null) => void;
  getTotalPrice: () => number;
  getShippingFee: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      userId: null,

      addItem: (newItem) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((item) => item.id === newItem.id);

        if (existingItem) {
          set({
            items: currentItems.map((item) =>
              item.id === newItem.id
                ? { ...item, quantity: item.quantity + (newItem.quantity || 1) }
                : item
            ),
          });
        } else {
          set({ items: [...currentItems, { ...newItem, quantity: newItem.quantity || 1 }] });
        }
      },

      removeItem: (id) => {
        set({
          items: get().items.filter((item) => item.id !== id),
        });
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;
        set({
          items: get().items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      toggleCart: (open) => set((state) => ({ 
        isOpen: open !== undefined ? open : !state.isOpen 
      })),

      setUserId: (id) => set({ userId: id }),

      getTotalPrice: () => {
        const subtotal = get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const shipping = get().getShippingFee();
        return subtotal + shipping;
      },

      getShippingFee: () => {
        const items = get().items;
        if (items.length === 0) return 0;
        // 가장 높은 배송비 하나만 적용 (묶음 배송 가정)
        return Math.max(...items.map(item => item.shipping_fee || 0));
      }
    }),
    {
      name: 'boki-cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
