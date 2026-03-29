import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// 1. 인기 검색어 Top 5 조회 (최근 7일)
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('search_logs')
      .select('keyword')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (error) throw error;

    const counts: Record<string, number> = {};
    data.forEach(log => {
      const k = log.keyword.trim().toLowerCase();
      if (k) counts[k] = (counts[k] || 0) + 1;
    });

    const trending = Object.entries(counts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({ success: true, data: trending });
  } catch (err: any) {
    console.error('[Trending API Error]:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 2. 검색어 기록
export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  try {
    const { keyword } = await req.json();
    if (!keyword || keyword.trim().length < 2) return NextResponse.json({ success: false });

    const { error } = await supabase
      .from('search_logs')
      .insert([{ keyword: keyword.trim() }]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Logging API Error]:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
