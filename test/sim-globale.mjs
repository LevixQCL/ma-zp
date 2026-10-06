// Simulation globale : tous les systèmes, avec des robots qui jouent « comme des humains » (assiduité,
// réactivité, esprit d'équipe variables, décisions au hasard mais plausibles). On compare la même partie
// sans les nouveautés (vagues, relève, crises) et avec, système par système puis tous ensemble.
// node test/sim-globale.mjs [nbZones=12] [graines=8]
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { botOrders } from '../js/engine/bots.js';
import { newZone, moyenneIpz, agentsDisponibles, capacite } from '../js/engine/zone.js';
import { SERVICES } from '../js/engine/constants.js';
import { makeRng } from '../js/engine/rng.js';
import { VAGUES, vagueVisee, seuilAbsorption } from '../js/engine/vagues.js';
import { RELEVE, releveRecue, relevesLancees, saisieAChoisir, ciblesTransmission } from '../js/engine/releve.js';
import { CRISE, criseCourante, planDuJour } from '../js/engine/crise.js';

const N = Number(process.argv[2] || 12), SEEDS = Number(process.argv[3] || 8);

// Profils de joueurs. assid : chance de jouer un jour donné ; reac : lit l'HP et réagit aux annonces ;
// coop : envie d'aider (relève, opération commune) ; style : répartition de base (moteur des robots).
const PROFILS = [
  { nom: 'Assidu coopératif', assid: 0.95, reac: 0.85, coop: 0.8, style: 'equilibre', enig: 0.8 },
  { nom: 'Assidu compétitif', assid: 0.95, reac: 0.8, coop: 0.25, style: 'agressif', enig: 0.85 },
  { nom: 'Régulier', assid: 0.8, reac: 0.6, coop: 0.5, style: 'equilibre', enig: 0.6 },
  { nom: 'Prudent', assid: 0.85, reac: 0.7, coop: 0.4, style: 'prudent', enig: 0.6 },
  { nom: 'Occasionnel', assid: 0.55, reac: 0.35, coop: 0.4, style: 'equilibre', enig: 0.4 },
  { nom: 'Distrait', assid: 0.45, reac: 0.2, coop: 0.3, style: 'distrait', enig: 0.3 },
  { nom: 'Spécialiste Proximité', assid: 0.9, reac: 0.6, coop: 0.5, style: 'equilibre', enig: 0.6, special: 'proximite' },
  { nom: 'Spécialiste Intervention', assid: 0.9, reac: 0.5, coop: 0.3, style: 'agressif', enig: 0.5, special: 'intervention' },
  { nom: 'Décroche (J5)', assid: 0.9, reac: 0.6, coop: 0.5, style: 'equilibre', enig: 0.5, stop: 5 },
  { nom: 'Arrive tard (J5)', assid: 0.85, reac: 0.6, coop: 0.6, style: 'equilibre', enig: 0.6, arrive: 5 },
];

/** Déplace `n` agents vers le service `s` en prenant dans les plus gros autres services. */
function deplacer(alloc, s, n) {
  for (let i = 0; i < n; i++) {
    const d = SERVICES.filter((k) => k !== s && alloc[k] > 1).sort((a, b) => alloc[b] - alloc[a])[0];
    if (!d) break;
    alloc[d]--; alloc[s]++;
  }
}

function ordresHumains(z, state, p, rng, stats) {
  const T = state.turn;
  const o = botOrders(z, state, p.style);
  if (!o) return null;
  const a = o.alloc;
  if (p.special) deplacer(a, p.special, 5);
  // Vague annoncée : un joueur qui lit l'HP ajoute à peu près ce qu'il faut (parfois un peu moins).
  const v = vagueVisee(state, z.uid, T);
  if (v && rng.chance(p.reac)) {
    const seuil = seuilAbsorption(v);
    let k = 0;
    while (k < 6 && capacite(z, v.domaine, a[v.domaine] + k, { turn: T, alloc: a }) < seuil) k++;
    deplacer(a, v.domaine, Math.max(0, k - (rng.chance(0.25) ? 1 : 0)));
    stats.reactions++;
  }
  // Relève reçue : on regarde son effectif, son envie d'aider, et on décide.
  const r = releveRecue(state, z.uid, T);
  if (r) {
    const dispo = agentsDisponibles(z, T);
    const vu = rng.chance(p.reac + 0.2);
    if (!vu) { /* pas vue : sans réponse */ } else if (dispo >= 14 && rng.chance(p.coop + 0.15)) o.releve = { id: r.id, choix: 'prendre', agents: rng.pick([2, 3, 3, 3, 4]) };
    else if (ciblesTransmission(state, r, T).length && rng.chance(0.25)) o.releve = { id: r.id, choix: 'transmettre', vers: rng.pick(ciblesTransmission(state, r, T)) };
    else o.releve = { id: r.id, choix: 'refuser' };
  }
  const lancees = relevesLancees(state, z.uid, T);
  if (lancees.length && rng.chance(p.coop * p.reac)) o.releveAppui = lancees.map((x) => ({ id: x.id, agents: rng.int(1, 2) }));
  const sz = saisieAChoisir(state, z.uid, T);
  if (sz && rng.chance(p.reac + 0.2)) o.saisie = { id: sz.id, part: z.vehicules < 6 && rng.chance(0.6) ? 'voiture' : 'argent' };
  // Crise : vote selon l'intérêt de sa zone, l'esprit d'équipe et un peu d'humeur.
  const c = criseCourante(state);
  if (c && c.vote === T && !c.plan && rng.chance(0.4 + p.reac * 0.6)) {
    const ir = (a.intervention + a.roulage) / Math.max(1, a.recherche * 2);
    const w = [ir > 1.3 ? 0.45 : 0.25, ir < 1.1 ? 0.45 : 0.25, p.coop * 0.8];
    const tot = w[0] + w[1] + w[2];
    let x = rng.float(0, tot);
    o.crise = x < w[0] ? 0 : x < w[0] + w[1] ? 1 : 2;
    stats.votes++;
  }
  if (planDuJour(state, T) === 'C') {
    const inscrit = !!(c.participants || {})[z.uid];
    if (inscrit && rng.chance(0.1)) o.criseC = 'non';
    else if (!inscrit && rng.chance(p.coop * p.reac * 0.5)) o.criseC = 'oui';
  }
  return o;
}

function partie(seed, mode) {
  VAGUES.actif = mode.vagues; RELEVE.actif = mode.releve; CRISE.actif = mode.crise;
  let state = createGame({ seed });
  const prof = {};
  for (let i = 0; i < N; i++) {
    const uid = `z${String(i).padStart(2, '0')}`;
    prof[uid] = PROFILS[i % PROFILS.length];
    if (!prof[uid].arrive) state.zones[uid] = newZone({ uid, code: String(5300 + i), nom: `Z${i}` }, 1);
  }
  const stats = { reactions: 0, votes: 0, perils: 0, tutelles: 0, faillites: 0, demandes: 0, joursJoueurs: 0, surcharges: 0, rapport: 0 };
  for (let t = 1; t <= 13; t++) {
    for (const [uid, p] of Object.entries(prof)) if (p.arrive === t) state.zones[uid] = newZone({ uid, code: '5399', nom: uid }, t);
    const orders = {}, quests = {};
    for (const [uid, z] of Object.entries(state.zones)) {
      const p = prof[uid];
      const rng = makeRng(`${seed}:humain:${uid}:${t}`); // mêmes tirages avec ou sans nouveautés
      if ((p.stop && t >= p.stop) || !rng.chance(p.assid)) continue;
      // Ce que le joueur doit trancher aujourd'hui (pour mesurer la charge).
      const dem = (vagueVisee(state, uid, state.turn) ? 1 : 0) + (releveRecue(state, uid, state.turn) ? 1 : 0) + (relevesLancees(state, uid, state.turn).length ? 1 : 0)
        + (saisieAChoisir(state, uid, state.turn) ? 1 : 0) + ((criseCourante(state) || {}).vote === state.turn ? 1 : 0);
      stats.demandes += dem; stats.joursJoueurs++; if (dem >= 3) stats.surcharges++;
      const o = ordresHumains(z, state, p, rng, stats);
      if (o) orders[uid] = o;
      if (rng.chance(p.enig)) quests[uid] = [{ statut: rng.chance(0.75) ? 'ok' : 'rate' }, { statut: rng.chance(0.7) ? 'ok' : 'rate', bonus: rng.pick(['moral', 'budget']) }, { statut: rng.chance(0.6) ? 'ok' : 'rate' }];
    }
    const r = resolveTurn(state, { orders, quests, nextWeekday: (t + 1) % 7 });
    state = r.state;
    for (const z of Object.values(state.zones)) { if (z.peril && z.peril.debut === t) stats.perils++; if (z.tutelle && z.tutelle.debut === t + 1) stats.tutelles++; }
    stats.faillites += (r.gazette.rivalites && r.gazette.rivalites.faillites ? r.gazette.rivalites.faillites.length : 0);
    for (const l of Object.values(r.gazette.rapports || {})) {
      stats.rapport += l.length;
      for (const x of l) {
        if (/^Relève réussie/.test(x)) stats.relCapt = (stats.relCapt || 0) + 1;
        if (/filé entre les doigts/.test(x) && /^Relève à/.test(x)) stats.relRate = (stats.relRate || 0) + 1;
        if (/^Relève déclinée/.test(x)) stats.relRefus = (stats.relRefus || 0) + 1;
        if (/^Relève sans réponse/.test(x)) stats.relSilence = (stats.relSilence || 0) + 1;
        if (/^Relève transmise/.test(x)) stats.relTrans = (stats.relTrans || 0) + 1;
        if (/^Félicitations du juge/.test(x)) stats.juge = (stats.juge || 0) + 1;
        if (/^Saisie partagée/.test(x)) stats.saisie = (stats.saisie || 0) + 0.5;
        if (/^Vague absorbée/.test(x)) stats.vAbs = (stats.vAbs || 0) + 1;
        if (/^Vague subie/.test(x)) stats.vSub = (stats.vSub || 0) + 1;
      }
    }
    { const c = criseCourante(state); if (c && c.plan && c.vote === t) { stats['plan' + c.plan] = (stats['plan' + c.plan] || 0) + 1; stats.votants = (stats.votants || 0) + c.votes.reduce((a, b) => a + b, 0); } if (c && c.plan === 'C' && c.fin === t) { const ok = (c.nuits || []).filter((x) => x.ok).length >= 2; stats[ok ? 'cOk' : 'cKo'] = (stats[ok ? 'cOk' : 'cKo'] || 0) + 1; } }
  }
  const zones = Object.entries(state.zones).map(([uid, z]) => ({ uid, p: prof[uid].nom, ipz: moyenneIpz(z), sat: z.satisfaction, moral: z.moral, crim: z.criminalite, budget: z.budget, ps: z.ps, vr: z.stats.vaguesRecues || 0, va: z.stats.vaguesAbsorbees || 0, ve: z.stats.vaguesEnvoyees || 0, rel: z.stats.releves || 0, oc: z.stats.operationsCommunes || 0 }));
  const classes = zones.filter((x) => x.ipz > 0).sort((a, b) => b.ipz - a.ipz);
  classes.forEach((x, i) => { x.rang = i + 1; });
  return { zones, stats, plans: state.crise ? 1 : 0 };
}

const MODES = {
  'aucune nouveauté': { vagues: false, releve: false, crise: false },
  'vagues seules': { vagues: true, releve: false, crise: false },
  'relève seule': { vagues: false, releve: true, crise: false },
  'crises seules': { vagues: false, releve: false, crise: true },
  'tout activé': { vagues: true, releve: true, crise: true },
};
const res = {};
for (const [nom, mode] of Object.entries(MODES)) {
  const parProfil = {}, glob = { ipz: [], sat: 0, moral: 0, crim: 0, budget: 0, n: 0 }, st = {};
  for (let s = 0; s < SEEDS; s++) {
    const g = partie(`glob-${N}-${s}`, mode);
    for (const [k, v] of Object.entries(g.stats)) st[k] = (st[k] || 0) + v;
    for (const z of g.zones) {
      const a = (parProfil[z.p] ||= { ipz: 0, rang: 0, n: 0, nr: 0, vr: 0, va: 0, ve: 0, rel: 0, oc: 0, sat: 0 });
      if (z.ipz > 0) { a.ipz += z.ipz; a.n++; a.rang += z.rang; a.nr++; }
      a.vr += z.vr; a.va += z.va; a.ve += z.ve; a.rel += z.rel; a.oc += z.oc; a.sat += z.sat; a.cnt = (a.cnt || 0) + 1;
      if (z.ipz > 0) { glob.ipz.push(z.ipz); glob.sat += z.sat; glob.moral += z.moral; glob.crim += z.crim; glob.budget += z.budget; glob.n++; }
    }
  }
  res[nom] = { parProfil, glob, st };
}
const f = (x) => Math.round(x * 10) / 10;
const ecart = (l) => { const m = l.reduce((a, b) => a + b, 0) / l.length; return Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / l.length); };
console.log(`\n=== ${N} zones, ${SEEDS} saisons de 13 tours ===`);
console.table(Object.entries(res).map(([nom, r]) => ({
  mode: nom, 'IPZ moyen': f(r.glob.ipz.reduce((a, b) => a + b, 0) / r.glob.n), 'écart-type IPZ': f(ecart(r.glob.ipz)),
  'écart 1er-dernier': f(Math.max(...r.glob.ipz) - Math.min(...r.glob.ipz)), satisfaction: f(r.glob.sat / r.glob.n), moral: f(r.glob.moral / r.glob.n), criminalité: f(r.glob.crim / r.glob.n), 'budget k€': f(r.glob.budget / r.glob.n),
  'périls/saison': f(r.st.perils / SEEDS), 'tutelles/saison': f(r.st.tutelles / SEEDS), 'lignes de rapport/zone/jour': f(r.st.rapport / (SEEDS * 13 * N)),
})));
const base = res['aucune nouveauté'].parProfil, tout = res['tout activé'].parProfil;
console.log('\nPar profil (tout activé, comparé à sans nouveauté)');
console.table(PROFILS.map((p) => {
  const b = base[p.nom], t = tout[p.nom];
  return { profil: p.nom, 'IPZ sans': f(b.ipz / b.n), 'IPZ avec': f(t.ipz / t.n), 'écart': f(t.ipz / t.n - b.ipz / b.n), 'rang sans': f(b.rang / b.nr), 'rang avec': f(t.rang / t.nr),
    'vagues reçues': f(t.vr / t.cnt), 'brisées': f(t.va / t.cnt), 'envoyées': f(t.ve / t.cnt), 'relèves prises': f(t.rel / t.cnt), 'op. communes': f(t.oc / t.cnt) };
}));
for (const nom of ['vagues seules', 'relève seule', 'crises seules']) {
  const r = res[nom].parProfil;
  console.log(`${nom.padEnd(14)} : ` + PROFILS.map((p) => `${p.nom.split(' ')[0].slice(0, 6)} ${f(r[p.nom].ipz / r[p.nom].n - base[p.nom].ipz / base[p.nom].n)}`).join(' · '));
}
const t = res['tout activé'].st;
console.log(`Crises (tout activé, ${SEEDS} saisons) : plans A ${t.planA || 0}, B ${t.planB || 0}, C ${t.planC || 0} (réussies ${t.cOk || 0}, ratées ${t.cKo || 0}) ; votants moyens ${f((t.votants || 0) / ((t.planA || 0) + (t.planB || 0) + (t.planC || 0)))} sur ${N}`);
console.log(`Relèves : capturées ${t.relCapt || 0}, ratées ${t.relRate || 0}, déclinées ${t.relRefus || 0}, sans réponse ${t.relSilence || 0}, transmises ${t.relTrans || 0} ; félicitations ${t.juge || 0}, saisies ${t.saisie || 0}`);
console.log(`Vagues : brisées ${t.vAbs || 0}, subies ${t.vSub || 0} (${f((t.vAbs + t.vSub) / (SEEDS * 13))} par soir)`);
console.log(`\nCharge (tout activé) : ${f(t.demandes / t.joursJoueurs)} décision(s) nouvelle(s) par joueur et par jour joué ; ${f(100 * t.surcharges / t.joursJoueurs)} % des jours avec 3 ou plus ; réactions aux vagues ${t.reactions}, votes ${t.votes}`);
