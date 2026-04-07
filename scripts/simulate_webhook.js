const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. .env.local 로드
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const [key, ...val] = line.split('=');
      return [key.trim(), val.join('=').trim()];
    })
);

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  PORTONE_WEBHOOK_SECRET
} = env;

if (SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SUPABASE_SERVICE_ROLE_KEY') {
  console.error('❌ 에러: .env.local에 실제 SUPABASE_SERVICE_ROLE_KEY를 입력해주세요.');
  process.exit(1);
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runTest() {
  console.log('🚀 E2E 결제 웹훅 테스트 시작...');

  try {
    // 2. 테스트용 더미 데이터 생성 (Product & Order)
    console.log('📦 테스트용 데이터 생성 중...');
    
    // 테스트 상품 생성 (재고 10개)
    const { data: product, error: pError } = await supabase.from('products').insert([{
      name: 'E2E 테스트 상품',
      price: 1000,
      stock: 10,
      category: '테스트',
      reward_points: 50
    }]).select().single();

    if (pError) throw pError;

    // 테스트 주문 생성 (결제대기 상태)
    const { data: order, error: oError } = await supabase.from('orders').insert([{
      customer_name: '테스트유저',
      customer_phone: '010-0000-0000',
      address: '서울시 테스트구',
      total_price: 1000,
      status: '결제대기'
    }]).select().single();

    if (oError) throw oError;

    // 주문 항목 연결
    await supabase.from('order_items').insert([{
      order_id: order.id,
      product_id: product.id,
      quantity: 1,
      price: 1000
    }]);

    console.log(`✅ 테스트 준비 완료 (Order ID: ${order.id})`);

    // 3. 웹훅 페이로드 구성 (PortOne V2 규격)
    const payload = {
      paymentId: order.id,
      status: 'PAID',
      transactionId: 'tx_' + Math.random().toString(36).substr(2, 9)
    };

    const body = JSON.stringify(payload);
    
    // 4. HMAC 서명 생성
    const signature = crypto
      .createHmac('sha256', PORTONE_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    const sendWebhook = async (attempt) => {
      console.log(`\n📡 [Attempt ${attempt}] 웹훅 전송 중...`);
      const response = await fetch('http://localhost:3000/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-portone-signature': signature
        },
        body: body
      });
      const result = await response.json();
      console.log(`📩 응답 (${response.status}):`, result);
      return result;
    };

    // 5. 첫 번째 전송 (정상 처리)
    const res1 = await sendWebhook(1);
    
    // 6. 멱등성 테스트: 1초 후 두 번째 전송 (이미 처리됨으로 방어되어야 함)
    await new Promise(resolve => setTimeout(resolve, 1000));
    const res2 = await sendWebhook(2);

    // 7. 결과 검증 (DB 상태 확인)
    console.log('\n🔍 최종 데이터 정합성 확인 중...');
    const { data: updatedOrder } = await supabase.from('orders').select('status').eq('id', order.id).single();
    const { data: updatedProduct } = await supabase.from('products').select('stock').eq('id', product.id).single();

    console.log(`- 주문 상태: ${updatedOrder.status} (기대값: 결제완료)`);
    console.log(`- 상품 재고: ${updatedProduct.stock} (기대값: 9)`);

    if (updatedOrder.status === '결제완료' && updatedProduct.stock === 9 && res2.message.includes('Already')) {
      console.log('\n✨ [SUCCESS] E2E 테스트 통과! 멱등성 및 원자적 트랜잭션이 완벽하게 작동합니다.');
    } else {
      console.log('\n⚠️ [FAILURE] 테스트 결과가 기대와 다릅니다. 로그를 확인해 주세요.');
    }

    // 8. 테스트 데이터 삭제 (Cleanup)
    await supabase.from('order_items').delete().eq('order_id', order.id);
    await supabase.from('orders').delete().eq('id', order.id);
    await supabase.from('products').delete().eq('id', product.id);
    console.log('\n🧹 테스트 데이터 정리 완료.');

  } catch (err) {
    console.error('\n❌ 테스트 중 치명적 오류 발생:', err.message);
  }
}

runTest();
