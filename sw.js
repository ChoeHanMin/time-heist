// 《24》 서비스워커 — 오프라인 캐싱 + 즉시 업데이트 반영
// 전략: 온라인이면 항상 네트워크에서 최신 파일을 받아오고(네트워크 우선),
// 오프라인일 때만 캐시를 사용합니다. 그래서 GitHub에 새 파일을 올리면
// 다음 접속 때 지연 없이 바로 반영됩니다.
const CACHE_NAME = 'time24-cache-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  // 새 서비스워커를 설치 즉시 활성화 (대기 없이 바로 교체)
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  // 열려있는 모든 탭을 새 서비스워커가 즉시 제어하도록 함
  self.clients.claim();
});

// 네트워크 우선 전략: 온라인이면 항상 최신 파일, 오프라인일 때만 캐시로 대체
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // 오프라인일 때만 캐시된 버전 사용
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
