export default function Footer() {
  return (
    <footer className="border-t border-border-light bg-hanji-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h2 className="font-serif text-xl text-deep-sage mb-2">자연의 결</h2>
            <p className="text-sm text-muted">여백의 미가 깃든 한국적인 농산물 및 농자재 큐레이션</p>
          </div>
          <div className="text-sm text-muted text-center md:text-right">
            <p>© 2026 자연의 결. All rights reserved.</p>
            <p className="mt-1">경기도 연천군 전곡읍</p>
          </div>
        </div>
      </div>
    </footer>
  );
}