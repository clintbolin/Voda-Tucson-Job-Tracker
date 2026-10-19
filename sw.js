// Voda Job Tracker — service worker
// Caches the app shell so it opens instantly and works even with a weak or
// dropped signal. Data itself (jobs, payments, etc.) still needs a live
// connection to sync with the Google Sheet backend — this only makes the
// APP ITSELF available offline, not new data.
const CACHE_NAME = 'voda-job-tracker-v2';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never cache calls to the Google Apps Script backend — that data must
  // always be fresh, not served from a stale cache.
  if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
    return;
  }
  // The app page itself always checks GitHub for the newest version (skipping
  // the browser's 10-minute saved copy), so a new upload shows up on the next
  // open/refresh. The saved copy is only used when there's no signal.
  const isPage = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  event.respondWith(
    fetch(event.request, isPage ? { cache: 'no-cache' } : undefined)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
