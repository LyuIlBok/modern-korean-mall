import { create } from 'zustand';

export interface InquiryProduct {
  id: string;
  name: string;
  imageUrl: string;
  orderId?: string;
  price?: number;
}

interface ChatState {
  isOpen: boolean;
  inquiryProduct: InquiryProduct | null;
  autoSendMessage: string | null;
  toggleChat: (open?: boolean) => void;
  setInquiryProduct: (product: InquiryProduct | null) => void;
  triggerAutoSend: (message: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  inquiryProduct: null,
  autoSendMessage: null,
  toggleChat: (open) => set((state) => ({ isOpen: open !== undefined ? open : !state.isOpen })),
  setInquiryProduct: (product) => set({ inquiryProduct: product }),
  triggerAutoSend: (message) => set({ autoSendMessage: message }),
}));
