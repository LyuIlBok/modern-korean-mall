import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Language, translations } from '../lib/translations';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.ko;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'ko',
      t: translations.ko,
      setLanguage: (lang) => set({ 
        language: lang, 
        t: translations[lang] 
      }),
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
