import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Language, translations } from '../lib/translations';
import { ko } from '../lib/translations/ko'; // Import ko by default for initial state

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: typeof ko;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'ko',
      t: ko,
      setLanguage: async (lang) => {
        const t = await translations[lang]();
        set({ 
          language: lang, 
          t: t as any
        });
      },
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => localStorage),
      // Skip persisting 't' as it's large and should be loaded based on 'language'
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Trigger a reload of translations after rehydration to ensure 't' matches 'language'
          state.setLanguage(state.language);
        }
      },
    }
  )
);

