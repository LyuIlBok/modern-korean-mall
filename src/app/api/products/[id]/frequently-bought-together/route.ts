import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * [cowork] 개인화 추천 트랙 — "이 상품을 산 사람들이 함께 구매한 상품".
 *
 * 별도 추천 테이블/알고리즘 없이 `get_frequently_bought_together` SQL 함수(같은
 * 결제완료류 주문에 함께 담긴 상품을 빈도순 집계)만으로 계산합니다. 로그인 여부와
 * 무관하게 상품상세 페이지 누구에게나 보여줄 수 있는 정보라 인증 없이 공개.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: '상품 ID가 필요합니다.' }, { status: 400 });
    }

    const { data: related, error: rpcError } = await supabaseAdmin.rpc('get_frequently_bought_together', {
      p_product_id: productId,
      p_limit: 6,
    });
    if (rpcError) throw rpcError;

    if (!related || related.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const productIds = related.map((r: { product_id: string }) => r.product_id);
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, category, imageUrl, stock, is_sold_out, discount_rate')
      .in('id', productIds)
      .eq('is_active', true);

    if (productsError) throw productsError;

    const productMap = new Map((products ?? []).map((p) => [p.id, p]));
    // RPC가 이미 co_purchase_count 내림차순으로 정렬해서 준 순서를 그대로 유지.
    const ordered = related
      .map((r: { product_id: string }) => productMap.get(r.product_id))
      .filter((p: unknown): p is NonNullable<typeof p> => Boolean(p));

    return NextResponse.json({ success: true, data: ordered });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Frequently Bought Together API Error]:', msg);
    return NextResponse.json({ error: '추천 상품을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
