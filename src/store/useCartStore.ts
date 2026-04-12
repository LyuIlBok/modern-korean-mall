import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  userId: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (id: string, optionName?: string) => void;
  updateQuantity: (id: string, quantity: number, optionName?: string) => void;
  updateOption: (id: string, oldOptionName: string | undefined, newOptionName: string, newOptionPrice: number) => void;
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
        const existingItem = currentItems.find(
          (item) => item.id === newItem.id && item.optionName === newItem.optionName
        );

        if (existingItem) {
          set({
            items: currentItems.map((item) =>
              item.id === newItem.id && item.optionName === newItem.optionName
                ? { ...item, quantity: item.quantity + (newItem.quantity || 1) }
                : item
            ),
          });
        } else {
          set({ items: [...currentItems, { ...newItem, quantity: newItem.quantity || 1 }] });
        }
      },

      removeItem: (id, optionName) => {
        set({
          items: get().items.filter(
            (item) => !(item.id === id && item.optionName === optionName)
          ),
        });
      },

      updateQuantity: (id, quantity, optionName) => {
        if (quantity < 1) return;
        set({
          items: get().items.map((item) =>
            item.id === id && item.optionName === optionName ? { ...item, quantity } : item
          ),
        });
      },

      updateOption: (id, oldOptionName, newOptionName, newOptionPrice) => {
        const currentItems = get().items;
        const targetItemIndex = currentItems.findIndex(
          (item) => item.id === id && item.optionName === oldOptionName
        );

        if (targetItemIndex === -1) return;

        const updatedItems = [...currentItems];
        const targetItem = { ...updatedItems[targetItemIndex] };
        
        // Change the option
        targetItem.optionName = newOptionName;
        targetItem.optionPrice = newOptionPrice;

        // Check if an item with the new option already exists (excluding the target itself)
        const duplicateIndex = updatedItems.findIndex(
          (item, idx) => idx !== targetItemIndex && item.id === id && item.optionName === newOptionName
        );

        if (duplicateIndex !== -1) {
          // Merge quantities
          updatedItems[duplicateIndex].quantity += targetItem.quantity;
          // Remove the old row
          updatedItems.splice(targetItemIndex, 1);
        } else {
          // Just update the target
          updatedItems[targetItemIndex] = targetItem;
        }

        set({ items: updatedItems });
      },

      clearCart: () => set({ items: [] }),

      toggleCart: (open) => set((state) => ({ 
        isOpen: open !== undefined ? open : !state.isOpen 
      })),

      setUserId: (id) => set({ userId: id }),

      getTotalPrice: () => {
        const subtotal = get().items.reduce(
          (sum, item) => sum + (item.price + (item.optionPrice || 0)) * item.quantity, 
          0
        );
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
