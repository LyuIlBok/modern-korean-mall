const CACHE_NAME = 'natures-gyeol-v1';
const OFFLINE_URL = '/offline';
const PRECACHE_ASSETS = [OFFLINE_URL, '/logo_main.png', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

// Next.js 빌드 청크(JS/CSS)는 배포마다 해시가 바뀌므로 여기서 캐싱하지 않는다 —
// 잘못 캐싱하면 신규 배포 후에도 구버전 코드가 오프라인 캐시에서 계속 서빙되어
// API 계약이 어긋나는 문제로 이어질 수 있음. 네비게이션(페이지 이동)과 이미지만
// 다룬다: 오프라인일 때 최소한 안내 페이지는 뜨고, 이미 본 이미지는 재사용된다.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
          .catch(() => cached);
      })
    );
  }
});
