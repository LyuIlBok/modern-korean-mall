'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

/**
 * [Admin Page Entry]
 * - Prerendering 타임의 '$$typeof' 에러 및 Recharts/Framer-motion 관련 SSR 이슈를 
 *   완벽히 차단하기 위해 전체 대시보드를 클라이언트 사이드 전용으로 로드합니다.
 */
const AdminDashboard = dynamic(() => import('./AdminDashboard'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-hanji-white">
      <Loader2 className="w-10 h-10 animate-spin text-deep-sage mb-4" />
      <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted animate-pulse">
        Initializing Admin Panel...
      </p>
    </div>
  )
});

export default function AdminPage() {
  return <AdminDashboard />;
}
