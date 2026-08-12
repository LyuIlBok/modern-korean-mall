import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem } from '@/types';
import { supabase } from '@/lib/supabaseClient';

// cart_items는 option_name이 아니라 product_options.id를 참조하는 option_id 컬럼을 쓰고,
// (user_id, product_id, option_id)에 대한 unique 제약조건도 없습니다(login/page.tsx의
// syncGuestData와 동일한 제약). 그래서 로컬 상태 변경 후 해당 상품(+옵션)의 "최종 상태"를
// 조회해 있으면 update/insert, 로컬에서 사라졌으면(삭제/병합) delete하는 방식으로 맞춥니다.
async function syncCartItemToServer(userId: string, productId: string, optionName: string | undefined) {
  try {
    let optionId: string | null = null;
    if (optionName) {
      const { data: optionRow } = await supabase
        .from('product_options')
        .select('id')
        .eq('product_id', productId)
        .eq('option_name', optionName)
        .maybeSingle();
      optionId = optionRow?.id ?? null;
    }

    let existingQuery = supabase
      .from('cart_items')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId);
    existingQuery = optionId ? existingQuery.eq('option_id', optionId) : existingQuery.is('option_id', null);
    const { data: existing, error: selectError } = await existingQuery.maybeSingle();
    if (selectError) throw selectError;

    const localItem = useCartStore
      .getState()
      .items.find((item) => item.id === productId && item.optionName === optionName);

    if (localItem) {
      const { error } = existing
        ? await supabase.from('cart_items').update({ quantity: localItem.quantity }).eq('id', existing.id)
        : await supabase
            .from('cart_items')
            .insert({ user_id: userId, product_id: productId, option_id: optionId, quantity: localItem.quantity });
      if (error) throw error;
    } else if (existing) {
      const { error } = await supabase.from('cart_items').delete().eq('id', existing.id);
      if (error) throw error;
    }
  } catch (error) {
    console.error('Cart server sync error:', error);
  }
}

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

        const userId = get().userId;
        if (userId) syncCartItemToServer(userId, newItem.id, newItem.optionName);
      },

      removeItem: (id, optionName) => {
        set({
          items: get().items.filter(
            (item) => !(item.id === id && item.optionName === optionName)
          ),
        });

        const userId = get().userId;
        if (userId) syncCartItemToServer(userId, id, optionName);
      },

      updateQuantity: (id, quantity, optionName) => {
        if (quantity < 1) return;
        set({
          items: get().items.map((item) =>
            item.id === id && item.optionName === optionName ? { ...item, quantity } : item
          ),
        });

        const userId = get().userId;
        if (userId) syncCartItemToServer(userId, id, optionName);
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

        const userId = get().userId;
        if (userId) {
          syncCartItemToServer(userId, id, oldOptionName);
          syncCartItemToServer(userId, id, newOptionName);
        }
      },

      clearCart: () => {
        const userId = get().userId;
        set({ items: [] });
        if (userId) {
          supabase
            .from('cart_items')
            .delete()
            .eq('user_id', userId)
            .then(({ error }) => {
              if (error) console.error('Cart clear sync error:', error);
            });
        }
      },

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
