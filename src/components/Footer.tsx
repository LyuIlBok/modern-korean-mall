export default function Footer() {
  return (
    <footer className="border-t border-border-light bg-hanji-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="lg:col-span-2">
            <h2 className="font-serif text-2xl text-deep-sage mb-4">자연의 결</h2>
            <p className="text-sm text-muted max-w-sm mb-6">
              여백의 미가 깃든 한국적인 농산물 및 농자재를 큐레이션하여 제안합니다. 본질에 집중하는 삶을 응원합니다.
            </p>
            <div className="flex gap-4">
              <span className="w-8 h-8 rounded-full bg-border-light/50 flex items-center justify-center text-charcoal hover:bg-deep-sage hover:text-white transition-colors cursor-pointer text-xs font-bold">IG</span>
              <span className="w-8 h-8 rounded-full bg-border-light/50 flex items-center justify-center text-charcoal hover:bg-deep-sage hover:text-white transition-colors cursor-pointer text-xs font-bold">FB</span>
              <span className="w-8 h-8 rounded-full bg-border-light/50 flex items-center justify-center text-charcoal hover:bg-deep-sage hover:text-white transition-colors cursor-pointer text-xs font-bold">KS</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-charcoal mb-4">고객지원</h3>
            <ul className="text-sm text-muted space-y-2">
              <li>공지사항</li>
              <li>자주 묻는 질문</li>
              <li>1:1 문의</li>
              <li>배송조회</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-charcoal mb-4">브랜드</h3>
            <ul className="text-sm text-muted space-y-2">
              <li>브랜드 철학</li>
              <li>함께하는 농부들</li>
              <li>지속가능성</li>
              <li>대량구매/협업 문의</li>
            </ul>
          </div>
        </div>
        
        {/* Business Info (Standard KR E-commerce) */}
        <div className="border-t border-border-light pt-8 text-xs text-muted leading-relaxed">
          <p className="mb-2">
            상호: 자연의 결 (Nature-Gyeol) | 대표자: 유일복 | 사업자등록번호: 123-45-67890 
            <span className="mx-2">|</span> 
            통신판매업신고: 제 2026-경기연천-0123호
          </p>
          <p className="mb-2">
            주소: 경기도 연천군 전곡읍 어느 산골길 12-34 (자연의결 물류센터)
          </p>
          <p className="mb-4">
            고객센터: 031-123-4567 | 이메일: grow930706@gmail.com | 개인정보관리책임자: 유일복
          </p>
          <div className="flex flex-wrap gap-4 pt-4 border-t border-border-light/50">
            <span className="hover:text-charcoal cursor-pointer">이용약관</span>
            <span className="font-bold hover:text-charcoal cursor-pointer">개인정보처리방침</span>
            <span className="hover:text-charcoal cursor-pointer">이메일무단수집거부</span>
            <span className="ml-auto">© 2026 자연의 결. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}