# 자연의 결(모던 한국 농산물 큐레이션) 쇼핑몰 - 이번 세션 수정사항 커밋/푸시 스크립트
# 사용법: word_app 폴더에서 PowerShell로 이 파일을 실행하세요.
#   cd "C:\Users\유일복\Desktop\word_app"
#   .\commit_mall_updates.ps1
#
# 이 스크립트가 하는 일:
#   1. 남아있는 .git\index.lock 제거 (Claude 샌드박스가 만든 뒤 못 지우는 락파일)
#   2. 이번 세션에서 실제로 수정/추가한 파일만 골라서 git add
#      (레포에 섞여있는 무관한 CRLF 변경 파일 수백 개는 건드리지 않습니다)
#   3. 커밋 + origin/main 푸시 (Vercel이 자동 재배포)

Set-Location -Path $PSScriptRoot

Write-Host "1) 잔여 lock 파일 정리..." -ForegroundColor Cyan
Remove-Item ".git\index.lock" -Force -ErrorAction SilentlyContinue

Write-Host "2) 변경 파일 스테이징..." -ForegroundColor Cyan
$files = @(
  # 재고 예약/복원, 배송비, GoTrueClient 분리, 관리자 권한 통일
  "src/app/actions/product.ts",
  "src/app/api/admin/orders/[id]/route.ts",
  "src/app/api/admin/stats/route.ts",
  "src/app/api/admin/notices/route.ts",
  "src/app/api/admin/members/route.ts",
  "src/app/api/admin/products/route.ts",
  "src/app/api/admin/unified-members/route.ts",
  "src/app/api/coupons/verify/route.ts",
  "src/app/api/orders/cancel/route.ts",
  "src/app/api/orders/guest-lookup/route.ts",
  "src/app/api/webhook/_shared.ts",
  "src/app/api/webhook/portone/route.ts",
  "src/app/api/webhook/route.ts",
  "src/app/admin/AdminDashboard.tsx",
  "src/app/admin/SalesChart.tsx",
  "src/app/admin/chat/page.tsx",
  "src/app/admin/members/page.tsx",
  "src/app/admin/notices/page.tsx",
  "src/app/admin/orders/page.tsx",
  "src/app/checkout/CheckoutInternal.tsx",
  "src/app/guest-order/page.tsx",
  "src/app/mypage/page.tsx",
  "src/app/order-success/page.tsx",
  "src/app/shop/[id]/ProductDetailClient.tsx",
  "src/lib/config.ts",
  "src/lib/supabaseClient.ts",
  "src/lib/supabaseAdmin.ts",
  "supabase/migrations/20260801_add_stock_reservation_for_orders.sql",
  "supabase/migrations/20260801_fix_trigger_function_grants.sql",
  "supabase/migrations/20260801_security_advisor_cleanup.sql",

  # 오늘 개발 요청서(가독성/더미데이터/링크/헤더/SEO) 반영분
  "src/app/page.tsx",
  "src/app/cart/page.tsx",
  "src/app/shop/page.tsx",
  "src/app/support/refund/page.tsx",
  "src/app/privacy",
  "src/app/terms",
  "src/components/Footer.tsx",
  "src/components/Header.tsx",
  "src/components/ProductCard.tsx",
  "src/types/index.ts"
)

foreach ($f in $files) {
  if (Test-Path $f) {
    git add -- "$f"
  } else {
    Write-Host "  (건너뜀 - 없음) $f" -ForegroundColor DarkYellow
  }
}

Write-Host "3) 스테이징 결과:" -ForegroundColor Cyan
git status --short

Write-Host "4) 커밋..." -ForegroundColor Cyan
git commit -m "쇼핑몰 고도화: 재고예약, 배송비 통일, 보안 정리, 히어로 가독성, 카테고리 더미값, 개인정보/이용약관 페이지 추가, 헤더/푸터 UX 개선"

Write-Host "5) 푸시..." -ForegroundColor Cyan
git push

Write-Host "완료! Vercel이 자동으로 재배포합니다." -ForegroundColor Green
