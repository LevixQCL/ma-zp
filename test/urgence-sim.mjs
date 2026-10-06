// Simulation de l'urgence du jour (« Bitonal ») : effet sur une saison et réglage automatique du temps cible.
// Usage : node test/urgence-sim.mjs [graines]
// Scénarios (mêmes zones, mêmes ordres de robots) :
//   témoin   tout le monde clique « Pas le temps » (aucun effet : la saison sans urgence)
//   joue     tout le monde joue chaque urgence
//   absent   personne ne joue (l'Intervention se débrouille seule)
//   mixte    la moitié joue, un quart passe, un quart ne vient pas
// Modèle de conduite d'un joueur : temps = r × trajet parfait ÷ vitesse de la combi, r propre au joueur
// (moyenne 1,22, écart 0,10 entre joueurs) + 0,07 d'une course à l'autre ; accrochages 0/1/2/3 à 50/30/15/5 %.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { moyenneIpz } from '../js/engine/zone.js';
import { incidentsDuTour, refUrgence, NIVEAUX_URGENCE } from '../js/engine/incidents.js';
import { makeRng } from '../js/engine/rng.js';

const graines = (process.argv[2] || 'u1,u2,u3,u4').split(',');
const TOURS = 28; // deux saisons
const EXTRA = [['h1', '5324', 'Horizon'], ['h2', '5330', 'Digue'], ['h3', '5340', 'Forge'], ['h4', '5350', 'Port'], ['h5', '5360', 'Gare']];

function normale(r, m, sd) { const u = Math.max(1e-9, r.next()), v = r.next(); return m + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function saison(graine, scenario) {
  const H = 3600 * 1000, d0 = Date.UTC(2026, 9, 2, 18, 0, 0);
  let state = createGame({ seed: graine, turnDeadline: d0 });
  const players = {};
  for (const b of BOT_PROFILES) players[b.uid] = { ...b };
  for (const [uid, code, nom] of EXTRA) players[uid] = { uid, code, nom, style: 'equilibre' };
  const styles = Object.fromEntries(Object.values(players).map((p) => [p.uid, p.style || 'equilibre']));
  state = resolveTurn(state, { players }).state;
  state.nextDeadline = d0 + 24 * H;
  const rs = makeRng(`${graine}:joueurs`);
  const uids = Object.keys(state.zones);
  const talent = Object.fromEntries(uids.map((u) => [u, normale(rs, 1.22, 0.1)]));
  const role = Object.fromEntries(uids.map((u, k) => [u, scenario === 'mixte' ? ['joue', 'joue', 'passe', 'absent'][k % 4] : scenario === 'temoin' ? 'passe' : scenario === 'absent' ? 'absent' : 'joue']));
  const st = { courses: 0, aTemps: 0, hs: 0, blesses: 0, cabosses: 0, parNiv: {}, marges: [] };
  const rc = makeRng(`${graine}:${scenario}:courses`);
  for (let t = 0; t < TOURS; t++) {
    const orders = {};
    for (const u of uids) { const o = botOrders(state.zones[u], state, styles[u]); if (o) orders[u] = o; }
    for (const u of uids) {
      const inc = incidentsDuTour(state, u).find((i) => i.urgence);
      delete players[u].incidents;
      if (!inc || role[u] === 'absent') continue;
      let res;
      if (role[u] === 'passe') res = { statut: 'passe', fautes: 0 };
      else {
        const x = rc.next(), hits = x < 0.5 ? 0 : x < 0.8 ? 1 : x < 0.95 ? 2 : 3;
        if (hits === 3) res = { statut: 'rate', raison: 'hs', fautes: 3 };
        else {
          const r = Math.max(1.02, normale(rc, talent[u], 0.07)) + hits * 0.04;
          const temps = Math.round(r * refUrgence(inc.diff) / inc.vit * 10) / 10;
          res = { statut: temps <= inc.cible ? 'ok' : 'rate', fautes: hits, temps, niveau: inc.diff };
        }
        st.courses++; if (res.statut === 'ok') st.aTemps++;
        if (res.temps && res.temps * inc.vit <= inc.cible) st.neuve = (st.neuve || 0) + 1; if (res.raison === 'hs') st.hs++;
        const p = (st.parNiv[inc.diff] ||= { n: 0, ok: 0 }); p.n++; if (res.statut === 'ok') p.ok++;
      }
      players[u].incidents = { cle: inc.id.split('-')[0], r: { [inc.id]: res } };
    }
    const r = resolveTurn(state, { orders, players });
    state = r.state;
    state.nextDeadline = d0 + (t + 2) * 24 * H;
    for (const u of uids) for (const l of state.zones[u].rapport || []) {
      if (!l.startsWith('Urgence ·')) continue;
      if (l.includes('collègue est blessé')) st.blesses++;
      if (l.includes('rentre cabossée')) st.cabosses++;
    }
    st.marges.push(NIVEAUX_URGENCE.map((n) => (state.urgenceCible && state.urgenceCible[n] ? state.urgenceCible[n].marge : null)));
  }
  const zs = uids.map((u) => state.zones[u]);
  const moy = (f) => zs.reduce((s, z) => s + f(z), 0) / zs.length;
  return { st, ipz: moy((z) => moyenneIpz(z)), moral: moy((z) => z.moral), usure: moy((z) => z.usure), zones: zs.length };
}

const lignes = [];
const agreg = {};
for (const sc of ['temoin', 'joue', 'absent', 'mixte']) {
  const a = (agreg[sc] = { ipz: 0, moral: 0, usure: 0, courses: 0, aTemps: 0, hs: 0, blesses: 0, cabosses: 0, n: 0, zones: 0, parNiv: {}, marges: [] });
  for (const g of graines) {
    const r = saison(g, sc);
    a.ipz += r.ipz; a.moral += r.moral; a.usure += r.usure; a.n++; a.zones += r.zones;
    for (const k of ['courses', 'aTemps', 'hs', 'blesses', 'cabosses', 'neuve']) a[k] = (a[k] || 0) + (r.st[k] || 0);
    for (const [n, v] of Object.entries(r.st.parNiv)) { const p = (a.parNiv[n] ||= { n: 0, ok: 0 }); p.n += v.n; p.ok += v.ok; }
    a.marges.push(r.st.marges);
  }
  const jours = a.zones * TOURS;
  lignes.push({
    scénario: sc, 'IPZ moyen': (a.ipz / a.n).toFixed(1), moral: (a.moral / a.n).toFixed(1), 'usure parc': `${(a.usure / a.n).toFixed(1)} %`,
    'à temps': a.courses ? `${Math.round((100 * a.aTemps) / a.courses)} %` : '–',
    'à temps (combi neuve)': a.courses ? `${Math.round((100 * a.neuve) / a.courses)} %` : '–',
    'blessés / zone / saison': ((a.blesses / jours) * 14).toFixed(2), 'cabossés / zone / saison': ((a.cabosses / jours) * 14).toFixed(2),
  });
}
console.log(`Urgence du jour : ${graines.length} graines × ${TOURS} jours × ${8} zones (bots + 5 joueurs « équilibrés »)`);
console.table(lignes);
const j = agreg.joue;
console.log('Taux à temps par niveau (tout le monde joue) :', Object.fromEntries(Object.entries(j.parNiv).map(([n, v]) => [n, `${Math.round((100 * v.ok) / v.n)} % sur ${v.n}`])));
// Évolution de la marge (première graine) : jours 1, 7, 14, 21, 28.
const m = j.marges[0];
console.log('Marge (facile, normal, difficile) au fil des jours :', [0, 6, 13, 20, 27].map((d) => `J${d + 1} ${m[d].map((x) => (x == null ? '–' : x.toFixed(2))).join('/')}`).join(' · '));
