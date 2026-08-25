/* Zenit — service worker
   Estrategia: app-shell cacheado (cache-first con revalidación en segundo plano)
   para que la PWA abra offline; red-primero para todo lo externo. */

const VERSION = 'zenit-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegaciones: siempre servimos el shell para que funcione offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});

/* Recordatorios locales: la app programa avisos vía postMessage y el SW los
   muestra aunque la pestaña esté cerrada (mientras el navegador lo mantenga vivo). */
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'notify') {
    self.registration.showNotification(d.title || 'Zenit', {
      body: d.body || '',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: d.tag || 'zenit',
      renotify: true,
      silent: !!d.silent,
      data: { url: d.url || './' }
    });
  }
  if (d.type === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('push', (e) => {
  let p = { title: 'Zenit', body: '' };
  try { p = e.data ? e.data.json() : p; } catch (_) { p.body = e.data ? e.data.text() : ''; }
  e.waitUntil(self.registration.showNotification(p.title, {
    body: p.body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    data: { url: p.url || './' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow(target);
    })
  );
});
