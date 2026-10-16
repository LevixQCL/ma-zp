// Coups de filet : le résultat vu sur l'appareil est celui du tour, les agents sont retirés, les gains versés une fois,
// les actions forgées ou hors délai sont ignorées.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { FILET, rejouer, vueFilet, agentsPourHeures, etapeImpossible } from '../js/engine/filet.js';

const H = 3600 * 1000, J = 24 * H, T0 = Date.UTC(2026, 9, 5, 18);
let ok = 0;
const test = (nom, f) => { f(); ok++; console.log(`✓ ${nom}`); };

function partie(seed = 'ft') {
  const st = createGame({ seed });
  st.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
  st.zones.voisin = newZone({ uid: 'voisin', code: '5301', nom: 'Canal' }, 1);
  st.nextDeadline = T0; st.lastResolvedAt = T0 - J;
  return st;
}
const ordres = { moi: { alloc: { intervention: 8, proximite: 4, recherche: 4, roulage: 2, admin: 2 } } };
function tour(st, log) {
  const r = resolveTurn(st, { orders: JSON.parse(JSON.stringify(ordres)), players: { moi: { filet: { log } } } });
  const n = r.state; n.lastResolvedAt = n.nextDeadline; n.nextDeadline += J;
  return n;
}

test('premier soir : cibles tirées, rien à payer', () => {
  const st = tour(partie(), []);
  const f = st.zones.moi.filet;
  assert.equal(f.cibles.length, FILET.cibles);
  assert.equal(f.op, null);
  assert.equal(f.s, 0);
});

test('le résultat vu sur l\'appareil est celui du tour, et les agents sont retirés', () => {
  let st = tour(partie('ft2'), []);
  const c = st.zones.moi.filet.cibles[1];
  const t1 = st.nextDeadline - 12 * H;
  const log = [{ s: 1, k: 'ouvrir', c: c.id, at: t1 }, { s: 2, k: 'filature', d: 6, at: t1 + 1 }];
  const vue = vueFilet(st, st.zones.moi, { filet: { log } }, t1 + 7 * H); // filature finie sur l'appareil
  assert.ok(vue.op && !vue.op.en, 'étape finie');
  const st2 = tour(st, log);
  const f = st2.zones.moi.filet;
  assert.equal(f.s, 2);
  assert.equal(f.op.r, vue.op.r, 'mêmes renseignements');
  assert.equal(f.op.alerte, vue.op.alerte, 'même alerte');
  // 2 agents × 6 h = 12 heures-agents = 1 agent retiré de la Recherche
  assert.ok(st2.zones.moi.rapport.some((l) => /1 agent de Recherche mobilisé/.test(l)), st2.zones.moi.rapport.join('\n'));
  assert.equal(agentsPourHeures(24), 2); assert.equal(agentsPourHeures(4), 1); assert.equal(agentsPourHeures(0), 0);
});

test('les ordres d\'origine ne sont pas modifiés (ordres par défaut du lendemain)', () => {
  let st = tour(partie('ft3'), []);
  const c = st.zones.moi.filet.cibles[0];
  const t1 = st.nextDeadline - 12 * H;
  const log = [{ s: 1, k: 'ouvrir', c: c.id, at: t1 }, { s: 2, k: 'filature', d: 12, at: t1 + 1 }];
  const st2 = tour(st, log);
  assert.equal(st2.zones.moi.dernierOrdre.alloc.recherche, 4);
});

test('actions forgées ou hors délai ignorées', () => {
  let st = tour(partie('ft4'), []);
  const c = st.zones.moi.filet.cibles[0];
  const t1 = st.nextDeadline - 5 * H;
  const log = [
    { s: 1, k: 'ouvrir', c: 'inconnue', at: t1 },             // cible inexistante
    { s: 1, k: 'ouvrir', c: c.id, at: st.lastResolvedAt - 1 }, // avant le dernier tour
    { s: 1, k: 'ouvrir', c: c.id, at: t1 },
    { s: 2, k: 'interpellation', at: t1 + 1 },                 // sans renseignement
    { s: 2, k: 'filature', d: 5, at: t1 + 2 },                 // durée inconnue
    { s: 2, k: 'filature', d: 2, at: t1 + 3 },
    { s: 3, k: 'filature', d: 2, at: t1 + 4 },                 // étape déjà en cours
  ];
  const { fil, acceptees } = rejouer(st, st.zones.moi, st.zones.moi.filet, log, st.nextDeadline, { depuis: st.lastResolvedAt });
  assert.equal(acceptees.length, 2);
  assert.equal(fil.s, 2);
});

test('une opération menée jusqu\'au bout est payée une seule fois, puis passe à l\'historique', () => {
  // On cherche une graine où l'opération réussit, en jouant comme un joueur appliqué.
  for (let g = 0; g < 40; g++) {
    let st = tour(partie(`ft5-${g}`), []);
    const c = st.zones.moi.filet.cibles[0]; // 1 suspect
    const log = [];
    let s = 0;
    const jouer = (at) => {
      const { fil } = rejouer(st, st.zones.moi, st.zones.moi.filet, log, at, { depuis: st.lastResolvedAt });
      const op = fil.op;
      if (!op) { if (fil.cibles.some((x) => x.id === c.id)) log.push({ s: ++s, k: 'ouvrir', c: c.id, at }); return; }
      if (op.fini || op.en) return;
      if (op.r < 2) log.push({ s: ++s, k: 'filature', d: 12, at });
      else if (op.sol < 60) log.push({ s: ++s, k: 'recoupement', d: 12, at });
      else log.push({ s: ++s, k: 'interpellation', at });
    };
    let paye = null;
    const avantPts = [];
    for (let t = 0; t < 6 && !paye; t++) {
      jouer(st.nextDeadline - 13 * H); jouer(st.nextDeadline - 13 * H + 1);
      const st2 = tour(st, log);
      const l = st2.zones.moi.rapport.find((x) => /Coup de filet « .* » : .*interpellé/.test(x));
      if (l) paye = { st2, l };
      avantPts.push(st2.zones.moi.filet.hist.length);
      st = st2;
    }
    if (!paye) continue;
    const z = paye.st2.zones.moi;
    assert.equal(z.filet.op, null);
    assert.equal(z.filet.hist.length, 1);
    assert.equal(z.filet.hist[0].fini, 'reussie');
    assert.equal(z.filet.faits, 1);
    // Le soir suivant : rien n'est payé deux fois.
    const st3 = tour(paye.st2, log);
    assert.ok(!st3.zones.moi.rapport.some((x) => /Coup de filet « .* » : .*interpellé/.test(x)));
    assert.equal(st3.zones.moi.filet.hist.length, 1);
    return;
  }
  assert.fail('aucune opération réussie sur 40 graines');
});

test('plafond par semaine', () => {
  let st = tour(partie('ft6'), []);
  st.zones.moi.filet.faits = FILET.maxSemaine;
  const c = st.zones.moi.filet.cibles[0];
  const { acceptees } = rejouer(st, st.zones.moi, st.zones.moi.filet, [{ s: 1, k: 'ouvrir', c: c.id, at: st.nextDeadline - H }], st.nextDeadline, { depuis: st.lastResolvedAt });
  assert.equal(acceptees.length, 0);
});

test('plafond d\'agents par jour : une 2e étape de 12 h le même jour est refusée', () => {
  let st = tour(partie('ft7'), []);
  const c = st.zones.moi.filet.cibles[0];
  const t1 = st.nextDeadline - 26 * H + 3 * H; // matin : deux étapes de 12 h ne tiennent pas avant 20:00, mais le jeu doit refuser la 2e
  st.lastResolvedAt = t1 - H;
  const log = [{ s: 1, k: 'ouvrir', c: c.id, at: t1 }, { s: 2, k: 'filature', d: 12, at: t1 + 1 }, { s: 3, k: 'recoupement', d: 12, at: t1 + 12 * H + 1 }, { s: 3, k: 'recoupement', d: 6, at: t1 + 12 * H + 2 }];
  const { acceptees } = rejouer(st, st.zones.moi, st.zones.moi.filet, log, t1 + 23 * H, { depuis: st.lastResolvedAt });
  const k = acceptees.map((e) => `${e.k}${e.d || ''}`);
  // 12 h de filature (2 agents) + 12 h de recoupement (2) = 4 > 3 : refusé ; 6 h (1 de plus) : accepté, si le recoupement est possible
  assert.ok(!k.includes('recoupement12'), k.join(','));
  assert.equal(FILET.maxAgentsJour, 3);
  // Directement : opération avec un renseignement, 24 heures-agents de Recherche déjà engagées.
  const fil = { op: { cible: c, r: 2, sol: 0, alerte: 0, en: null, fini: null } };
  assert.match(etapeImpossible(fil, 'recoupement', 12, c, t1, { recherche: 24 }) || '', /plus assez d’agents/);
  assert.equal(etapeImpossible(fil, 'recoupement', 6, c, t1, { recherche: 24 }), null);
  assert.match(etapeImpossible(fil, 'interpellation', 0, c, t1, { recherche: 24 }) || '', /plus assez d’agents/);
});

console.log(`${ok} tests OK`);
