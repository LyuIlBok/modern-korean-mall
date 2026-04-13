'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Save, Loader2, Settings, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToastStore } from '@/store/useToastStore';
import Button from '@/components/ui/Button';
import Link from 'next/link';

interface SiteSetting {
  key: string;
  value: string;
}

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    hero_subtitle: '',
    hero_title: '',
    hero_description: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSubmitting] = useState(false);
  const { addToast } = useToastStore();
  const router = useRouter();

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('*');
        
        if (error) throw error;
        
        if (data) {
          const settingsMap: Record<string, string> = {};
          data.forEach((item: SiteSetting) => {
            settingsMap[item.key] = item.value;
          });
          setSettings(prev => ({ ...prev, ...settingsMap }));
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
        addToast('설정을 불러오는 중 오류가 발생했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [addToast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('site_settings')
        .upsert(updates);

      if (error) throw error;

      addToast('설정이 성공적으로 저장되었습니다.', 'success');
      router.refresh();
    } catch (err) {
      console.error('Failed to save settings:', err);
      addToast('설정 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hanji-white">
        <Loader2 className="w-10 h-10 animate-spin text-deep-sage" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hanji-white p-8 md:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Link href="/admin" className="text-muted hover:text-charcoal flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" /> 대시보드로 돌아가기
            </Link>
            <h1 className="font-serif text-4xl text-charcoal flex items-center gap-4">
              <Settings className="w-10 h-10 text-deep-sage" /> 사이트 환경 설정
            </h1>
            <p className="text-muted font-light">메인 페이지의 히어로 섹션 등 주요 콘텐츠를 관리합니다.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8 bg-white p-10 rounded-sm border border-border-light shadow-sm">
          <div className="space-y-6">
            <h2 className="font-serif text-2xl border-b border-border-light pb-4 text-charcoal">히어로 섹션 (Hero Section)</h2>
            
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-muted ml-1">Hero Subtitle</label>
              <input 
                type="text"
                value={settings.hero_subtitle}
                onChange={e => setSettings({ ...settings, hero_subtitle: e.target.value })}
                className="w-full bg-hanji-white/30 border border-border-light px-6 py-4 rounded-sm focus:border-deep-sage outline-none transition-all font-medium"
                placeholder="농업회사법인 복이네농장의 프리미엄 브랜드"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-muted ml-1">Hero Main Title</label>
              <input 
                type="text"
                value={settings.hero_title}
                onChange={e => setSettings({ ...settings, hero_title: e.target.value })}
                className="w-full bg-hanji-white/30 border border-border-light px-6 py-4 rounded-sm focus:border-deep-sage outline-none transition-all font-serif text-xl"
                placeholder="바른 땅이 내어준 정직한 산물, 자연의 결"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-muted ml-1">Hero Description</label>
              <textarea 
                value={settings.hero_description}
                onChange={e => setSettings({ ...settings, hero_description: e.target.value })}
                className="w-full bg-hanji-white/30 border border-border-light px-6 py-4 rounded-sm focus:border-deep-sage outline-none transition-all h-32 resize-none leading-relaxed"
                placeholder="경기도 연천의 비옥한 토양과 맑은 물이 키워낸 가장 순수한 농산물과 바른 농자재를 제안합니다."
              />
            </div>
          </div>

          <div className="pt-8 border-t border-border-light flex justify-end">
            <Button 
              type="submit" 
              isLoading={isSaving}
              size="lg"
              leftIcon={<Save className="w-5 h-5" />}
              className="px-12"
            >
              설정 저장하기
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
