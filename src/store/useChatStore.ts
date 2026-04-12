import { create } from 'zustand';
import { InquiryProduct } from '@/types';

interface ChatState {
  isOpen: boolean;
  inquiryProduct: InquiryProduct | null;
  autoSendMessage: string | null;
  autoSendMessageMetadata: any | null;
  isInitializing: boolean; // 레이스 컨디션 방지용 상태
  toggleChat: (open?: boolean) => void;
  setInquiryProduct: (product: InquiryProduct | null) => Promise<void>; // 비동기 보장
  triggerAutoSend: (message: string | null, metadata?: any | null) => void;
  resetInitializing: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  inquiryProduct: null,
  autoSendMessage: null,
  autoSendMessageMetadata: null,
  isInitializing: false,

  toggleChat: (open) => set((state) => ({ isOpen: open !== undefined ? open : !state.isOpen })),

  setInquiryProduct: async (product) => {
    // 1. 초기화 상태로 진입
    set({ isInitializing: true });
    
    // 2. 상태 업데이트 (Zustand는 동기적이지만 명시적으로 처리)
    set({ inquiryProduct: product });
    
    // 3. 상태가 반영되었음을 보장하기 위해 짧은 틱을 둡니다.
    await new Promise(resolve => setTimeout(resolve, 0));
  },

  triggerAutoSend: (message, metadata = null) => set({ 
    autoSendMessage: message,
    autoSendMessageMetadata: metadata
  }),

  resetInitializing: () => set({ isInitializing: false })
}));
