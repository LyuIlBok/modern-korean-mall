import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  category?: string;
  description?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  userId: string | null;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  toggleCart: (open?: boolean) => void;
  setUserId: (id: string | null) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      userId: null,
      
      addItem: (newItem) => set((state) => {
        const itemToAdd: CartItem = {
          ...newItem,
          quantity: newItem.quantity || 1,
        } as CartItem;

        const existingItem = state.items.find((item) => item.id === itemToAdd.id);
        if (existingItem) {
          return {
            items: state.items.map((item) =>
              item.id === itemToAdd.id
                ? { ...item, quantity: item.quantity + itemToAdd.quantity }
                : item
            ),
          };
        }
        return { items: [...state.items, itemToAdd] };
      }),

      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      })),

      updateQuantity: (id, delta) => set((state) => ({
        items: state.items.map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        ),
      })),

      clearCart: () => set({ items: [] }),
      
      toggleCart: (open) => set((state) => ({ 
        isOpen: open !== undefined ? open : !state.isOpen 
      })),

      setUserId: (id) => set({ userId: id }),
    }),
    {
      name: 'boki-cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
