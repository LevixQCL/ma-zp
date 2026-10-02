// Service worker de Ma ZP : toujours la dernière version du code, et un secours hors connexion.
// GitHub Pages laisse les navigateurs garder chaque fichier 10 minutes en cache : juste après une mise à jour,
// un appareil pouvait mélanger d'anciens et de nouveaux fichiers et rester bloqué au chargement.
// Ici, chaque fichier du jeu est revérifié auprès du serveur (réponse « inchangé » très légère s'il n'a pas bougé) ;
// sans réseau, on sert la dernière copie connue.
const CACHE = 'mazp-fichiers-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase, polices : le navigateur s'en charge
  e.respondWith((async () => {
    try {
      const frais = req.mode === 'navigate'
        ? await fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' })
        : await fetch(new Request(req, { cache: 'no-cache' }));
      if (frais.ok && frais.type === 'basic') {
        const copie = frais.clone();
        e.waitUntil(caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? url.href : req, copie)).catch(() => {}));
      }
      return frais;
    } catch (err) {
      const secours = await caches.match(req.mode === 'navigate' ? url.href : req, { ignoreSearch: req.mode === 'navigate' });
      if (secours) return secours;
      throw err;
    }
  })());
});
