import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUser } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * [cowork] 개인화 추천 트랙 1단계 — "최근 본 상품" 기록/조회.
 *
 * 로그인 사용자 전용(비로그인 세션 트래킹은 범위 밖 — 필요해지면 localStorage 기반
 * 클라이언트 전용 구현을 프론트에서 별도로 붙이는 게 더 간단합니다).
 *
 * POST { productId }: 조회 기록. 같은 상품 재조회 시 upsert로 viewed_at만 갱신하고
 * 행이 계속 쌓이지 않게 함(product_views에 (user_id, product_id) unique 제약).
 * GET: 최근 조회한 상품 목록(최신순, 기본 10개, 품절/비활성 상품 제외)을 상품 정보와
 * 함께 반환.
 */
export async function POST(request: Request) {
  try {
    const user = await verifyUser(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const productId = typeof body?.productId === 'string' ? body.productId : null;
    if (!productId) {
      return NextResponse.json({ error: 'productId가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('product_views')
      .upsert(
        { user_id: user.userId, product_id: productId, viewed_at: new Date().toISOString() },
        { onConflict: 'user_id,product_id' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    // 조회 기록은 부가 기능이라 실패해도 사용자 경험을 막을 필요는 없지만, 원인 파악을
    // 위해 서버 로그는 남깁니다.
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Recently Viewed POST Error]:', msg);
    return NextResponse.json({ error: '기록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await verifyUser(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit'));
    const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 50 ? Math.floor(limitParam) : 10;

    const { data: views, error: viewsError } = await supabaseAdmin
      .from('product_views')
      .select('product_id, viewed_at')
      .eq('user_id', user.userId)
      .order('viewed_at', { ascending: false })
      .limit(limit);

    if (viewsError) throw viewsError;
    if (!views || views.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const productIds = views.map((v) => v.product_id);
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, category, imageUrl, stock, is_sold_out, discount_rate')
      .in('id', productIds)
      .eq('is_active', true);

    if (productsError) throw productsError;

    const productMap = new Map((products ?? []).map((p) => [p.id, p]));
    // 최근 조회 순서를 그대로 유지하면서, 비활성/삭제된 상품은 결과에서 제외.
    const ordered = views
      .map((v) => productMap.get(v.product_id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));

    return NextResponse.json({ success: true, data: ordered });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Recently Viewed GET Error]:', msg);
    return NextResponse.json({ error: '조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
