// Service worker : permet d'installer Ma ZP sur l'écran d'accueil et d'ouvrir l'appli hors ligne.
// Stratégie « réseau d'abord » : on récupère toujours la dernière version quand c'est possible.
const CACHE = 'mazp-v22';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css', './icons/icon.svg', './icons/icon-192.png',
  './js/app.js', './js/config.js', './js/data/backend.js', './js/data/local.js', './js/data/firebase.js', './js/data/resolver.js',
  './js/engine/constants.js', './js/engine/contenu.js', './js/engine/resolve.js', './js/engine/rng.js', './js/engine/time.js', './js/engine/zone.js', './js/engine/bots.js',
  './js/quests/quests.js',
  './js/ui/common.js', './js/ui/auth.js', './js/ui/hp.js', './js/ui/ordres.js', './js/ui/quete.js', './js/ui/carte.js', './js/ui/ville.js', './js/ui/enquete.js', './js/ui/fipa.js', './js/ui/guide.js', './js/ui/diplomatie.js', './js/ui/parties.js', './js/ui/blasons.js', './js/engine/rivalites.js', './js/engine/enquete.js', './js/engine/fipa.js', './js/ui/gazette.js', './js/ui/aide.js', './js/ui/prive.js', './js/ui/renfort.js', './js/ui/plan.js', './js/ui/affaires.js', './js/engine/sites.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Firebase et polices : réseau direct
  e.respondWith(
    fetch(e.request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))),
  );
});
