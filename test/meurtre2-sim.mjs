// Simulation de l'affaire de la Rampe : en combien de jours quatre profils obtiennent-ils les aveux ?
// Usage : node test/meurtre2-sim.mjs
// 2 démarches + 1 réaudition + 1 recoupement par soir, rebondissements des jours 3 et 5, 40 % de chance d'une pièce de
// voisinage. La confrontation se juge sur les pièces du matin. Trois situations :
//  · seule : la zone joue seule, sans aucune autre source ;
//  · + bonus : en plus, une pièce libre par énigme réussie (bonus « indice », 1 jour sur 2), appui PJF (1 jour sur 4),
//    incidents et Directeur (1 jour sur 8) ;
//  · équipe : + bonus, et trois collègues de cellule qui enquêtent au hasard et partagent chaque soir
//    (au plus 2 pièces reçues par soir, comme dans le jeu).
// Profils : parfait (soupçonne Grégoire dès son audition), moyen (suit d'abord les leurres), parieur (confronte au hasard le 1er jour),
// prudent (ne confronte que quand un seul suspect reste ET qu'il a deux décisives).
import { affaireMeurtreRampe } from '../js/engine/meurtre-rampe.js';
import { pieceDemarche, confrontationOk, mandatOk, pieceReaudition, candidats, pieceRecoupement, ENQ } from '../js/engine/enquete.js';
import { makeRng } from '../js/engine/rng.js';

let aff = affaireMeurtreRampe(1);
let PUBLICS = ['doc:journal', 'doc:pvc', 'A:0', 'A:1', 'A:2', 'A:3', 'A:4'];
// Variante à six suspects (« --six ») : un sixième innocent, écarté par son alibi seul (« simple »)
// ou seulement par son alibi ET l'heure de la mort (« paire », comme Élodie).
function avecSixieme(mode) {
  const a = affaireMeurtreRampe(1);
  a.suspects = [...a.suspects, { ...a.suspects[2], nom: 'Sixième', prenom: 'Sixième', coupable: false }];
  a.faits = [...a.faits, 'occ:5', 'mob:5', 'moy:5'];
  a.libres = [...a.libres, 'occ:5', 'mob:5'];
  a.charges = { ...a.charges, 5: ['mob:5', 'c:agenda'] };
  a.innocente = { ...a.innocente, 5: mode === 'paire' ? [['occ:5', 'c:legiste2']] : ['occ:5'] };
  return a;
}
const opp = (d) => new Set([...d.pieces.map((p) => p.f), ...PUBLICS]);
const ORDRE_FORT = ['x:wifi', 'moy:1', 'Rb:4', 'x:liste', 'Ra:1', 'Rd:1', 'occ:4', 'x:heure', 'mob:1', 'doc:journal'];

function choixConfront(d, rng, fort) {
  const dispo = [...opp(d)];
  if (fort) return ORDRE_FORT.filter((f) => dispo.includes(f)).slice(0, 3);
  return rng.shuffle(dispo).slice(0, 3);
}

/** Un collègue qui enquête sans plan : deux démarches utiles au hasard par soir, plus ses propres bonus. */
function collegue(rng) {
  const d = { pieces: [] };
  const toutes = ['labo', 'cam', 'temoin', ...aff.suspects.map((_, i) => i).flatMap((i) => ['alibi', 'banque', 'moyens'].map((k) => `${k}:${i}`))];
  return {
    d,
    soir(j, bonus) {
      const faites = [];
      for (const x of rng.shuffle(toutes.slice())) { if (faites.length >= 2) break; const f = pieceDemarche(aff, d, x); if (f && !faites.includes(f)) faites.push(f); }
      for (const f of faites) d.pieces.push({ f, j });
      if (bonus && rng.chance(0.6)) { const l = aff.libres.filter((f) => !d.pieces.some((p) => p.f === f)); if (l.length) d.pieces.push({ f: rng.pick(l), j }); }
    },
  };
}

function jouer(profil, graine, { bonus = false, equipe = 0 } = {}) {
  const rng = makeRng(`sim2:${profil}:${graine}:${bonus}:${equipe}`);
  const collegues = Array.from({ length: equipe }, (_, k) => collegue(makeRng(`col:${graine}:${k}`)));
  const d = { pieces: [] };
  const a = (f, j) => { if (!d.pieces.some((p) => p.f === f)) d.pieces.push({ f, j }); };
  const six = aff.suspects.length > 5;
  const ordre = profil === 'parfait' ? [1, 4, 0, 2, 3, ...(six ? [5] : [])] : profil === 'moyen' ? rng.shuffle([0, 2, 3, ...(six ? [5] : [])]).concat(rng.shuffle([1, 4])) : rng.shuffle(aff.suspects.map((_, i) => i));
  let rep = 0;
  for (let j = 1; j <= 7; j++) {
    if (j === 3) a('r:tel', j);
    if (j === 5) a('r:mireille', j);
    const restants = candidats(aff, d.pieces.map((p) => p.f)).suspects;
    const dec = aff.confront.decisives.filter((f) => opp(d).has(f)).length;
    let cible = null;
    if (profil === 'parieur' && j === 1) cible = ordre[0];
    else if (profil === 'parfait' && dec >= 2) cible = 1;
    else if (restants.length === 1 && (profil !== 'prudent' || dec >= 2)) cible = restants[0];
    else if (profil === 'moyen' && j >= 6) cible = ordre.find((i) => restants.includes(i));
    if (cible !== null) {
      const choix = choixConfront(d, rng, profil !== 'parieur');
      if (cible !== aff.coupable) return { jour: null, echec: `écarté au jour ${j} (${aff.suspects[cible].prenom})` };
      if (confrontationOk(aff, cible, choix)) return { jour: j, rep };
      rep -= 1;
    }
    // Démarches du soir : un peu de scène, puis les suspects encore possibles dans l'ordre de soupçon.
    const vise = ordre.filter((i) => candidats(aff, d.pieces.map((p) => p.f)).suspects.includes(i));
    const envies = [];
    const scene = profil === 'parfait' ? ['cam', 'temoin', 'labo'] : rng.shuffle(['cam', 'temoin', 'labo']);
    envies.push(...scene.filter((k) => pieceDemarche(aff, d, k)).slice(0, profil === 'moyen' ? 1 : 1));
    // Alibis d'abord, puis téléphonie et comptes, puis perquisitions (sur mandat).
    for (const k of ['alibi', 'banque', 'moyens']) for (const i of vise) envies.push(`${k}:${i}`);
    const faites = [];
    for (const x of envies) { if (faites.length >= 2) break; const f = pieceDemarche(aff, d, x); if (f && !faites.includes(f)) faites.push(f); }
    // Réaudition : la pièce la plus parlante sur un suspect visé (le parfait la trouve, les autres une fois sur deux).
    let r = null;
    // Une réaudition qui fait tomber un mensonge décisif (même d'un suspect déjà blanchi, comme Thibault) d'abord.
    const decisive = aff.suspects.map((_, i) => i).flatMap((i) => (mandatOk(aff, d, i) ? [...opp(d)].map((f) => pieceReaudition(aff, d, i, f)).filter((p) => p && aff.confront.decisives.includes(p)) : []));
    if (decisive.length && (profil === 'parfait' || profil === 'prudent' || rng.chance(0.5))) r = decisive[0];
    if (!r) for (const i of vise) {
      if (!mandatOk(aff, d, i)) continue;
      const essais = [...opp(d)].filter((f) => pieceReaudition(aff, d, i, f));
      const bonne = profil === 'parfait' ? essais[0] : rng.chance(0.5) ? essais[0] : null;
      if (bonne) { r = pieceReaudition(aff, d, i, bonne); break; }
    }
    // Recoupement : le parfait trouve une bonne paire ; le moyen une fois sur trois ; les autres une fois sur cinq.
    let x = null;
    const tous = [...opp(d)];
    const paires = [];
    for (let p = 0; p < tous.length; p++) for (let q = p + 1; q < tous.length; q++) if (pieceRecoupement(aff, d, tous[p], tous[q])) paires.push([tous[p], tous[q]]);
    const tente = profil === 'parfait' ? 1 : profil === 'moyen' ? 0.33 : 0.2;
    if (paires.length && rng.chance(tente)) x = pieceRecoupement(aff, d, ...paires[0]);
    for (const f of faites) a(f, j);
    if (r) a(r, j);
    if (x) a(x, j);
    // Déclic.
    for (const dc of aff.declics) if (dc.si.every((f) => d.pieces.some((p) => p.f === f))) a(dc.f, j);
    const libre = () => { const libres = aff.libres.filter((f) => !d.pieces.some((p) => p.f === f)); if (libres.length) a(rng.pick(libres), j); };
    if (rng.chance(0.4)) libre();
    if (bonus) { if (rng.chance(0.5)) libre(); if (rng.chance(0.25)) libre(); if (rng.chance(0.125)) libre(); }
    // Partages des collègues : chacun envoie une pièce que la zone n'a pas ; elle en traite 2 au plus.
    let recus = 0;
    for (const c of collegues) {
      c.soir(j, bonus);
      const neuves = c.d.pieces.filter((p) => !d.pieces.some((q) => q.f === p.f));
      if (neuves.length && recus < 2) { a(rng.pick(neuves).f, j); recus += 1; }
    }
  }
  return { jour: null, echec: 'affaire classée' };
}

const SIX = process.argv.includes('--six') ? (process.argv.includes('paire') ? 'paire' : 'simple') : null;
if (SIX) { ENQ.nbSuspects = 6; aff = avecSixieme(SIX); PUBLICS = [...PUBLICS, 'A:5']; console.log(`Six suspects (sixième écarté ${SIX === 'paire' ? 'par son alibi + l’heure de la mort' : 'par son alibi seul'})`); }
for (const [nom, opts] of [['seule', {}], ['+ bonus', { bonus: true }], ['équipe de 4', { bonus: true, equipe: 3 }]]) {
  console.log(`— ${nom}`);
  for (const profil of ['parfait', 'moyen', 'parieur', 'prudent']) {
  const res = Array.from({ length: 400 }, (_, g) => jouer(profil, g, opts));
  const ok = res.filter((x) => x.jour);
  const dist = [1, 2, 3, 4, 5, 6, 7].map((j) => ok.filter((x) => x.jour === j).length);
  const ecartes = res.filter((x) => x.echec && x.echec.startsWith('écarté')).length;
  console.log(`${profil.padEnd(8)} résolue ${String(Math.round(ok.length / 4)).padStart(3)} %  · jour moyen ${ok.length ? (ok.reduce((t, x) => t + x.jour, 0) / ok.length).toFixed(1) : '—'} · par jour J1..J7 ${dist.join(' ')} · écartés ${Math.round(ecartes / 4)} %`);
}
}
