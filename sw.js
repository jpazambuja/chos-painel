/* CH.OSEN — service worker
   Estratégia: navegação = rede primeiro (sempre busca versão nova; resolve o cache preguiçoso
   do GitHub Pages) com fallback offline; estáticos do mesmo domínio = cache primeiro. */
const CACHE = 'chosen-v1';

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navegação (abrir o app): rede primeiro, revalidando; se offline, usa a última versão salva
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
        const cache = await caches.open(CACHE);
        cache.put('app-shell', fresh.clone());
        return fresh;
      } catch (err) {
        const hit = await caches.match('app-shell');
        return hit || Response.error();
      }
    })());
    return;
  }

  // Estáticos do próprio site (ícones, manifest): cache primeiro
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) { const cache = await caches.open(CACHE); cache.put(req, res.clone()); }
      return res;
    })());
  }
});
