# AgriLeitner Pro

라이트너 학습법 기반 농업/공학(식물보호기사 등) 전문용어 단어장 SaaS.

- `index.html` — 메인 앱 (React 18 + Tailwind CSS, CDN 빌드, 별도 설치 없이 정적 호스팅 가능)
- `mobile/` — Capacitor 기반 iOS/Android 네이티브 래퍼

## 로컬 실행
```
npx http-server -p 5000
```
`http://localhost:5000/index.html` 접속 (Google 로그인은 `file://` 프로토콜을 지원하지 않으므로 반드시 로컬 서버를 통해 접속)

## 배포
Vercel에 이 저장소를 연결하면 정적 사이트로 바로 배포됩니다 (`vercel.json`의 `cleanUrls` 설정 포함).

## 백엔드
자세한 Supabase 프로젝트/테이블 구조는 `WORD_APP_NOTES.md` 참고.

이 프로젝트는 "복이네농장" 쇼핑몰(`modern-korean-mall`)과 별도 저장소로 운영되지만, 같은 Supabase 프로젝트를 공유하여 로그인 계정(회원)은 통합되어 있습니다.
