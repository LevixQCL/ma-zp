// Simulation de l'affaire de Mons : en combien de jours trois profils de joueurs obtiennent-ils les aveux ?
// Usage : node test/meurtre-sim.mjs
// Profils : parfait (repère l'assassin dès le journal), moyen (suit les leurres), parieur (accuse au hasard le 1er jour),
// malin (fouille le bureau, puis parie le 2e jour avec les meilleurs documents publics).
// Une zone seule, 2 démarches par soir, 1 réaudition par soir, la confrontation se juge sur les pièces du matin.
import { affaireMeurtre } from '../js/engine/meurtre-mons.js';
import { pieceDemarche, confrontationOk, mandatOk, pieceReaudition, candidats } from '../js/engine/enquete.js';
import { makeRng } from '../js/engine/rng.js';

const aff = affaireMeurtre(1);
const PUBLICS = ['doc:journal', 'doc:pvc', 'A:0', 'A:1', 'A:2', 'A:3', 'A:4'];
const opp = (d) => new Set([...d.pieces.map((p) => p.f), ...PUBLICS]);

const confrontOk = (i, pieces) => confrontationOk(aff, i, pieces);
const reaudOk = (d, i) => mandatOk(aff, d, i);

/** Les meilleurs éléments à opposer (le joueur choisit bien s'il est « fort », au hasard sinon). */
function choixConfront(d, i, rng, fort) {
  const dispo = [...opp(d)].filter((f) => f.startsWith('doc:') || /^(c|r|occ|moy|mob|R[a-z]):/.test(f));
  if (fort) {
    const ord = ['occ:2', 'moy:2', 'Rg:2', 'Rb:2', 'Ra:2', 'c:cam', 'doc:journal', 'doc:pvc', 'c:cafe', 'c:agenda'];
    return ord.filter((f) => dispo.includes(f)).slice(0, 3);
  }
  return rng.shuffle(dispo).slice(0, 3);
}

function jouer(profil, graine) {
  const rng = makeRng(`sim:${profil}:${graine}`);
  const d = { pieces: [] };
  const a = (f, j) => d.pieces.push({ f, j });
  // Ordre de soupçon : le parfait voit tout de suite la statuette ; le moyen suit les leurres.
  const ordre = profil === 'parfait' ? [2, 0, 1, 4, 3] : profil === 'parieur' || profil === 'malin' ? rng.shuffle([0, 1, 2, 3, 4]) : rng.shuffle([0, 1, 4]).concat(rng.shuffle([2, 3]));
  let rep = 0;
  for (let j = 1; j <= 7; j++) {
    // 1. Confrontation du matin.
    const restants = candidats(aff, d.pieces.map((p) => p.f)).suspects;
    let cible = null;
    if (profil === 'parieur' && j === 1) cible = ordre[0];
    else if (profil === 'malin' && j === 2) cible = ordre[0];
    else if (profil === 'parfait' && j >= 2) cible = 2;
    else if (restants.length === 1) cible = restants[0];
    else if (profil !== 'parfait' && j >= 6) cible = ordre.find((i) => restants.includes(i));
    if (cible !== null) {
      const choix = choixConfront(d, cible, rng, profil !== 'parieur' || j > 1);
      if (cible !== aff.coupable) return { jour: null, echec: `écarté au jour ${j} (${aff.suspects[cible].prenom})` };
      if (confrontOk(cible, choix)) return { jour: j, rep };
      rep -= 1;
    }
    // 2. Démarches du soir : la scène d'abord (le parfait va droit au bureau), puis les suspects dans l'ordre de soupçon.
    const envies = [];
    const scene = profil === 'parfait' ? ['temoin', 'cam', 'labo'] : ['labo', 'cam', 'temoin'];
    const vise = ordre.filter((i) => candidats(aff, d.pieces.map((p) => p.f)).suspects.includes(i));
    for (const i of vise) for (const k of ['alibi', 'moyens', 'banque']) envies.push(`${k}:${i}`);
    if (profil === 'malin' && j === 1) envies.unshift('temoin');
    else if (profil !== 'parfait' || j > 1) envies.unshift(...scene.filter((k) => pieceDemarche(aff, d, k)).slice(0, profil === 'moyen' ? 1 : 0));
    else envies.unshift('temoin');
    const faites = [];
    for (const x of envies) { if (faites.length >= 2) break; const f = pieceDemarche(aff, d, x); if (f && !faites.includes(f)) faites.push(f); }
    // 3. Réaudition : face à la pièce la plus parlante qu'on a sur le premier suspect visé.
    let r = null;
    for (const i of vise) {
      if (!reaudOk(d, i)) continue;
      const essais = [...opp(d)].filter((f) => pieceReaudition(aff, d, i, f));
      const bonne = profil === 'parfait' ? essais[0] : rng.chance(0.5) ? essais[0] : null;
      if (bonne) { r = pieceReaudition(aff, d, i, bonne); break; }
    }
    for (const f of faites) a(f, j);
    if (r) a(r, j);
    // Voisinage : 40 % de chance d'une pièce libre au hasard.
    if (rng.chance(0.4)) { const libres = aff.libres.filter((f) => !d.pieces.some((p) => p.f === f)); if (libres.length) a(rng.pick(libres), j); }
  }
  return { jour: null, echec: 'affaire classée' };
}

for (const profil of ['parfait', 'moyen', 'parieur', 'malin']) {
  const res = Array.from({ length: 400 }, (_, g) => jouer(profil, g));
  const ok = res.filter((x) => x.jour);
  const dist = [1, 2, 3, 4, 5, 6, 7].map((j) => ok.filter((x) => x.jour === j).length);
  const ecartes = res.filter((x) => x.echec && x.echec.startsWith('écarté')).length;
  console.log(`${profil.padEnd(8)} résolue ${String(Math.round(ok.length / 4)).padStart(3)} %  · jour moyen ${ok.length ? (ok.reduce((t, x) => t + x.jour, 0) / ok.length).toFixed(1) : '—'} · par jour J1..J7 ${dist.join(' ')} · écartés ${Math.round(ecartes / 4)} %`);
}
