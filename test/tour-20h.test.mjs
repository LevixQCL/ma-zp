// Tour de 20:00 (20 oct. 2026) :
// 1. Sur Firebase, un appareil n'essaie jamais de calculer le tour avant le secours (heure limite + DELAI_SECOURS),
//    même si la partie n'a jamais eu la marque tourServeur (avant : essai dès 20:00, refusé par les règles,
//    bandeau « permission-denied » chez les joueurs). La démo, la tâche planifiée et le MJ qui force calculent tout de suite.
// 2. La tâche lancée en avance attend la bonne heure limite (attenteAvantTour).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolvePending, DELAI_SECOURS } from '../js/data/resolver.js';
import { createGame } from '../js/engine/resolve.js';
import { attenteAvantTour, MARGE_ATTENTE } from '../outils/serveur/attente.mjs';

const MIN = 60000;

function faux(mode, deadline) {
  const etat = createGame({ seed: 'tour-20h', turnDeadline: deadline });
  delete etat.tourServeur; // partie qui n'a jamais été calculée par la tâche planifiée (Partie1 le 20 oct.)
  const b = { mode, lectures: 0, ecrit: 0,
    async getState() { b.lectures++; return etat; }, async getAllOrders() { return {}; }, async getAllQuests() { return {}; }, async getPlayers() { return {}; },
    async commitResolution() { b.ecrit++; return true; } };
  return { b, etat };
}

// 1a. Firebase, 3 minutes après 20:00 : l'appareil attend, sans rien lire ni écrire.
{
  const t0 = Date.parse('2026-10-20T18:00:00Z');
  const { b, etat } = faux('firebase', t0);
  const n = await resolvePending(b, { now: () => t0 + 3 * MIN, maxTurns: 1, state: etat });
  assert.equal(n, 0);
  assert.equal(b.ecrit, 0, 'un appareil a essayé d’enregistrer le tour avant le secours');
  assert.equal(b.lectures, 0, 'lecture inutile de l’état avant le secours');
}
// 1b. Firebase, après le secours : l'appareil calcule.
{
  const t0 = Date.parse('2026-10-20T18:00:00Z');
  const { b } = faux('firebase', t0);
  assert.equal(await resolvePending(b, { now: () => t0 + DELAI_SECOURS + MIN, maxTurns: 1 }), 1);
}
// 1c. Démo, tâche planifiée, MJ qui force : tout de suite après l'heure limite.
for (const [mode, opts] of [['demo', {}], ['serveur', { serveur: true }], ['firebase', { sansDelai: true }]]) {
  const t0 = Date.parse('2026-10-20T18:00:00Z');
  const { b } = faux(mode, t0);
  assert.equal(await resolvePending(b, { now: () => t0 + MIN, maxTurns: 1, ...opts }), 1, `${mode} ${JSON.stringify(opts)} doit calculer à l'heure`);
}

// 2. Attente de la tâche lancée en avance.
{
  const h20 = Date.parse('2026-10-21T18:00:00Z');
  assert.equal(attenteAvantTour([h20], h20 - 90 * MIN), 90 * MIN + MARGE_ATTENTE, 'partie à 90 min : attend jusqu’à 20:00:05');
  assert.equal(attenteAvantTour([h20 + 86400e3, h20], h20 - 30 * MIN), 30 * MIN + MARGE_ATTENTE, 'prend l’heure limite la plus proche');
  assert.equal(attenteAvantTour([h20], h20 - 4 * 3600e3), 0, 'heure limite à 4 h : pas d’attente');
  assert.equal(attenteAvantTour([h20], h20 + MIN), 0, 'heure limite passée : calcul immédiat');
  assert.equal(attenteAvantTour([null, undefined, h20], h20 - MIN), MIN + MARGE_ATTENTE, 'partie sans état ignorée');
  assert.equal(attenteAvantTour([], h20), 0);
}

// 3. La tâche en avance existe, part avant 20:00 aux deux heures (été, hiver) et passe --attendre.
{
  const y = readFileSync(new URL('../.github/workflows/veille-20h.yml', import.meta.url), 'utf8');
  assert.match(y, /cron: '17 16 \* \* \*'/);
  assert.match(y, /cron: '17 17 \* \* \*'/);
  assert.match(y, /tour\.mjs --attendre/);
  const timeout = Number((y.match(/timeout-minutes: (\d+)/) || [])[1]);
  assert.ok(timeout >= 180 + 10, 'la tâche doit pouvoir attendre 3 h');
}

console.log('tour-20h : OK');
