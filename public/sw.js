// Service worker mínimo de PESOS: permite instalar la app.
// No guarda datos en caché, así siempre se ve la versión más nueva.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})