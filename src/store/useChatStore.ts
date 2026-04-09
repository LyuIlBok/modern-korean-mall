import { create } from 'zustand';

export interface InquiryProduct {
  id: string;
  name: string;
  imageUrl: string;
  orderId?: string;
}

interface ChatState {
  isOpen: boolean;
  inquiryProduct: InquiryProduct | null;
  toggleChat: (open?: boolean) => void;
  setInquiryProduct: (product: InquiryProduct | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  inquiryProduct: null,
  toggleChat: (open) => set((state) => ({ isOpen: open !== undefined ? open : !state.isOpen })),
  setInquiryProduct: (product) => set({ inquiryProduct: product }),
}));
