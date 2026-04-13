'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Save, Loader2, Settings, ArrowLeft, Camera, Palette } from 'lucide-react';
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
    hero_bg_image: '',
    primary_color: '#4A5D4E',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `hero_bg_${Date.now()}.${fileExt}`;
      const filePath = `hero/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('shop_assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('shop_assets')
        .getPublicUrl(filePath);

      setSettings(prev => ({ ...prev, hero_bg_image: publicUrl }));
      addToast('이미지가 성공적으로 업로드되었습니다.', 'success');
    } catch (err) {
      console.error('Upload failed:', err);
      addToast('이미지 업로드 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

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
            <p className="text-muted font-light">메인 페이지의 히어로 섹션 및 브랜드 테마를 관리합니다.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8 bg-white p-10 rounded-sm border border-border-light shadow-sm">
          <div className="space-y-10">
            {/* Hero Section Config */}
            <div className="space-y-6">
              <h2 className="font-serif text-2xl border-b border-border-light pb-4 text-charcoal">히어로 섹션 (Hero Section)</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
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
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-muted ml-1">Hero Background Image</label>
                  <div className="relative aspect-video rounded-sm overflow-hidden border border-dashed border-border-light bg-hanji-white group">
                    {settings.hero_bg_image ? (
                      <img src={settings.hero_bg_image} alt="Hero Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted/40">
                        <Camera className="w-8 h-8 mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">No Image Selected</span>
                      </div>
                    )}
                    
                    {isUploading ? (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-deep-sage" />
                      </div>
                    ) : (
                      <label className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                          <Camera className="w-4 h-4" /> Change Background
                        </span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                  <p className="text-[9px] text-muted italic">* 권장 해상도: 1920x1080 이상, 가로형 이미지</p>
                </div>
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

            {/* Theme Config */}
            <div className="space-y-6">
              <h2 className="font-serif text-2xl border-b border-border-light pb-4 text-charcoal">브랜드 테마 (Brand Theme)</h2>
              <div className="flex items-center gap-12 p-8 bg-hanji-white/30 rounded-sm border border-border-light">
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
                    <Palette className="w-3 h-3" /> Primary Brand Color
                  </label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color"
                      value={settings.primary_color}
                      onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                      className="w-12 h-12 rounded-full border-none cursor-pointer overflow-hidden shadow-md"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-mono font-bold text-charcoal uppercase tracking-tighter">{settings.primary_color}</p>
                      <p className="text-[10px] text-muted">브랜드 메인 색상 (버튼, 아이콘 등)</p>
                    </div>
                  </div>
                </div>
              </div>
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
              모든 설정 저장하기
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
