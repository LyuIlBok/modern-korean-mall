'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { 
  Megaphone, Plus, Trash2, Edit3, X, Save, 
  CheckCircle2, AlertCircle, Loader2, ArrowLeft,
  ToggleLeft, ToggleRight, Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminFetch } from '@/lib/adminFetch';

interface Notice {
  id: string;
  title: string;
  content: string;
  category: 'UPDATE' | 'EVENT' | 'NOTICE';
  is_popup: boolean;
  is_active: boolean;
  created_at: string;
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'UPDATE' as Notice['category'],
    is_popup: false,
    is_active: true
  });

  const router = useRouter();

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/');
        return;
      }
      setIsAuthReady(true);

      const res = await adminFetch('/api/admin/notices');
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 403) router.replace('/');
        throw new Error(json.error);
      }
      setNotices(json.data as Notice[]);
    } catch (error) {
      console.error('Error fetching notices:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const handleOpenModal = (notice?: Notice) => {
    if (notice) {
      setEditingNotice(notice);
      setFormData({
        title: notice.title,
        content: notice.content,
        category: notice.category,
        is_popup: notice.is_popup,
        is_active: notice.is_active
      });
    } else {
      setEditingNotice(null);
      setFormData({
        title: '',
        content: '',
        category: 'UPDATE',
        is_popup: false,
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthReady) return;
    setIsSaving(true);

    try {
      const res = await adminFetch('/api/admin/notices', {
        method: editingNotice ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingNotice?.id, ...formData }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      alert('공지사항이 저장되었습니다.');
      setIsModalOpen(false);
      fetchNotices();
    } catch (error: any) {
      alert('저장 실패: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?') || !isAuthReady) return;
    try {
      const res = await adminFetch(`/api/admin/notices?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setNotices(notices.filter(n => n.id !== id));
    } catch (error: any) {
      alert('삭제 실패: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-hanji-white p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center bg-white p-6 rounded-sm border border-border-light shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className="p-2 hover:bg-hanji-white rounded-full transition-all">
              <ArrowLeft className="w-5 h-5 text-charcoal" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-deep-sage text-white rounded-sm flex items-center justify-center">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-charcoal">공지 및 업데이트 관리</h1>
                <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Announcement & Patch Notes</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-charcoal text-white px-6 py-3 rounded-sm flex items-center gap-2 hover:bg-deep-sage transition-all shadow-lg font-bold text-xs uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        </div>

        <div className="bg-white rounded-sm border border-border-light shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-hanji-white/50 text-[10px] uppercase tracking-[0.2em] text-muted border-b border-border-light">
              <tr>
                <th className="px-8 py-5">상태/구분</th>
                <th className="px-8 py-5">제목</th>
                <th className="px-8 py-5 text-center">팝업여부</th>
                <th className="px-8 py-5 text-right">작성일</th>
                <th className="px-8 py-5 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light/50">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-deep-sage" /></td></tr>
              ) : notices.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-muted italic">등록된 공지사항이 없습니다.</td></tr>
              ) : (
                notices.map((notice) => (
                  <tr key={notice.id} className="hover:bg-hanji-white/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${notice.is_active ? 'bg-green-500' : 'bg-muted/30'}`} />
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          notice.category === 'UPDATE' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          notice.category === 'EVENT' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-charcoal/5 text-charcoal/60 border-charcoal/10'
                        }`}>
                          {notice.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-medium text-charcoal">{notice.title}</td>
                    <td className="px-8 py-6 text-center">
                      {notice.is_popup ? <Layout className="w-4 h-4 text-deep-sage mx-auto" /> : <span className="text-muted/20">-</span>}
                    </td>
                    <td className="px-8 py-6 text-right text-xs text-muted">{new Date(notice.created_at).toLocaleDateString()}</td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenModal(notice)} className="p-2 hover:bg-deep-sage/10 text-muted hover:text-deep-sage rounded-full"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(notice.id)} className="p-2 hover:bg-terracotta/10 text-muted hover:text-terracotta rounded-full"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-sm shadow-2xl p-10 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-border-light">
                <h2 className="font-serif text-2xl">{editingNotice ? '공지 수정' : '새 공지 작성'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:rotate-90 transition-transform"><X className="w-6 h-6" /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as Notice['category']})} className="w-full bg-hanji-white/50 border border-border-light px-4 py-3 rounded-sm text-sm focus:border-deep-sage outline-none transition-all">
                      <option value="UPDATE">UPDATE (패치노트)</option>
                      <option value="EVENT">EVENT (이벤트)</option>
                      <option value="NOTICE">NOTICE (일반공지)</option>
                    </select>
                  </div>
                  <div className="flex gap-6 items-end pb-3 px-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={formData.is_popup} onChange={e => setFormData({...formData, is_popup: e.target.checked})} className="w-4 h-4 accent-deep-sage" />
                      <span className="text-[11px] font-bold text-muted group-hover:text-charcoal transition-colors">메인 팝업 노출</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4 accent-deep-sage" />
                      <span className="text-[11px] font-bold text-muted group-hover:text-charcoal transition-colors">공개 여부</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">Title</label>
                  <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="공지 제목을 입력하세요" className="w-full bg-hanji-white/30 border border-border-light px-4 py-4 rounded-sm text-sm focus:border-deep-sage outline-none transition-all font-medium" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">Content</label>
                  <textarea required value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} rows={10} placeholder="상세 내용을 입력하세요 (줄바꿈이 반영됩니다)" className="w-full bg-hanji-white/30 border border-border-light px-4 py-4 rounded-sm text-sm focus:border-deep-sage outline-none transition-all resize-none font-light leading-relaxed" />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border border-border-light text-xs font-bold text-muted hover:bg-hanji-white transition-all uppercase tracking-widest rounded-sm">Cancel</button>
                  <button type="submit" disabled={isSaving} className="flex-1 bg-charcoal text-white py-4 rounded-sm hover:bg-deep-sage transition-all flex items-center justify-center gap-3 font-bold shadow-xl disabled:opacity-50 uppercase tracking-widest">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Announcement
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
