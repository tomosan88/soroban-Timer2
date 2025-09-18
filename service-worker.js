// キャッシュの名前（バージョン）
const CACHE_NAME = 'soroban-timer-v2';//今日から寒くなるようだ

// オフライン時に利用できるようにキャッシュするファイルのリスト
const urlsToCache = [
  '.', // index.html
  'index.html',
  'style.css',
  'script.js',
  'timer-worker.js',
  'manifest.json',
  'audio/lstart.wav',
  'audio/lstop.wav',
  'audio/hstart.wav',
  'audio/hstop.wav',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// --- 1. インストール処理 ---
// service-workerがインストールされたときに一度だけ実行される
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // 指定されたファイルをすべてキャッシュに追加する
        return cache.addAll(urlsToCache);
      })
  );
});

// --- 2. 古いキャッシュの削除 ---
// service-workerが有効化（activate）されたときに実行される
self.addEventListener('activate', (event) => {
    // このservice-workerが有効になったら、他の古いバージョンのキャッシュは不要になる
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                // 全てのキャッシュをループで確認
                cacheNames.map((cacheName) => {
                    // もし現在のキャッシュ名(CACHE_NAME)と異なっていたら
                    if (cacheName !== CACHE_NAME) {
                        // その古いキャッシュを削除する
                        console.log('古いキャッシュを削除:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// --- 3. ファイル取得の制御 ---
// ページが何かファイル（画像やJSなど）を要求するたびに実行される
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // まずキャッシュに一致する要求があるか確認する
    caches.match(event.request)
      .then((response) => {
        // キャッシュにあれば、それを返す (オフラインでも動作する理由)
        if (response) {
          return response;
        }
        // キャッシュになければ、通常通りネットワークから取得しにいく
        return fetch(event.request);
      })
  );
});