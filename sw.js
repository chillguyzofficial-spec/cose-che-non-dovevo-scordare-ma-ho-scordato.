// Funziona anche senza rete: tiene in memoria i file dell'agenda e li aggiorna quando c'è rete
const CACHE = 'agenda-v1';
const BASE = ['./', 'index.html', 'manifest.webmanifest', 'assets/css/agenda.css', 'assets/css/caratteri.css', 'assets/js/dati.js', 'assets/js/agenda.js',
  'assets/img/icon-192.png', 'assets/img/icon-512.png', 'assets/fonts/dancing-script-500.woff2', 'assets/fonts/im-fell-english-400.woff2',
  'assets/fonts/im-fell-english-400-italic.woff2', 'assets/fonts/im-fell-english-sc-400.woff2', 'assets/fonts/special-elite-400.woff2'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const rete = fetch(e.request).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
      return res;
    }).catch(() => hit);
    return hit || rete;
  }));
});
