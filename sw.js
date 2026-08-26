/* Zenit — service worker
   Estrategia: app-shell cacheado (cache-first con revalidación en segundo plano)
   para que la PWA abra offline; red-primero para todo lo externo. */

/* Cambiar en cada deploy: al activarse, el service worker borra todo caché
   que no lleve esta marca, y así no sobrevive nada de la versión anterior. */
const VERSION = 'zenit-2026-08-25';
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
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((cs) => cs.forEach((c) => c.postMessage({ type: 'version-nueva' })))
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegaciones: red primero, y el shell guardado como respaldo offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      redPrimero(req, './index.html')
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  /* El código de la app va a la red primero.
     Antes iba al caché primero y devolvía la copia vieja: un deploy nuevo
     no se veía hasta la segunda o tercera recarga, porque el HTML se
     actualizaba pero seguía apuntando al CSS y al JS guardados. La red
     tiene tres segundos; si no contesta, se sirve lo guardado y la app
     sigue andando sin señal. */
  if (esCodigo(url.pathname)) {
    e.respondWith(redPrimero(req).catch(() => caches.match(req)));
    return;
  }

  /* Lo pesado e inmutable —el motor lunar, las texturas, los íconos— va al
     caché primero: son megabytes que no cambian entre deploys, y pedirlos
     de nuevo cada vez sería tirar la carga rápida a la basura. Igual se
     revalida en segundo plano. */
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copia = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});

/* Un archivo es "código de la app" si puede cambiar en cualquier deploy. */
function esCodigo(path) {
  if (path.startsWith('/vendor/') || path.startsWith('/icons/')) return false;
  return /\.(js|css|webmanifest)$/.test(path) || path.endsWith('/');
}

/* Red primero con techo de tiempo: sin el techo, una conexión que acepta la
   conexión pero nunca responde deja la app colgada en blanco en vez de caer
   al caché. */
function redPrimero(req, claveCache) {
  const conTecho = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 3000);
    fetch(req).then((res) => { clearTimeout(t); resolve(res); },
                    (err) => { clearTimeout(t); reject(err); });
  });
  return conTecho.then((res) => {
    if (res && res.status === 200) {
      const copia = res.clone();
      caches.open(VERSION).then((c) => c.put(claveCache || req, copia));
    }
    return res;
  });
}

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
