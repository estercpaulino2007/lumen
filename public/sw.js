// Service Worker mínimo: deja disponible la pantalla de brigada sin conexión (en build de producción).
const C = 'lumen-shell-v1';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(['/brigada'])).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.startsWith('/api/')) return; // nunca se cachean datos ni documentos
  if (u.pathname.startsWith('/_next/static/') || u.pathname === '/brigada') {
    e.respondWith(caches.open(C).then(async (c) => { try { const r = await fetch(e.request); c.put(e.request, r.clone()); return r; } catch { return (await c.match(e.request)) || Response.error(); } }));
  }
});
