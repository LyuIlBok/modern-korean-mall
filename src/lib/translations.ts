import { Language } from '@/types';

export const translations = {
  ko: () => import('./translations/ko').then(m => m.ko),
  en: () => import('./translations/en').then(m => m.en),
};
