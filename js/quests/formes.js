// Formes d'énigmes : pour les types qui finissent par se résoudre toujours de la même façon,
// d'autres « formes » du même type, qui demandent un raisonnement différent.
// Même contrat que les autres générateurs : (rng, diff) → énigme, solution unique vérifiée,
// difficulté mesurée (nombre d'éléments à croiser).

const PERSONNES = [
  ['Karim', 'm'], ['Léa', 'f'], ['Marc', 'm'], ['Sofia', 'f'], ['Julien', 'm'], ['Nadia', 'f'], ['Thomas', 'm'], ['Emma', 'f'],
  ['Hugo', 'm'], ['Inès', 'f'], ['Lucas', 'm'], ['Chloé', 'f'], ['Mehdi', 'm'], ['Sarah', 'f'], ['Kevin', 'm'], ['Laura', 'f'],
  ['Yannick', 'm'], ['Fatima', 'f'], ['Olivier', 'm'], ['Manon', 'f'],
];
const NOMBRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept'];
const et = (l) => (l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}`);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const hm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const euros = (v) => `${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`;
const e = (g) => (g === 'f' ? 'e' : '');

/** Parties de {0..n-1}, par taille croissante. */
function* parTaille(n) {
  for (let k = 1; k <= n; k++) {
    const idx = [...Array(k).keys()];
    for (;;) {
      yield idx.slice();
      let p = k - 1;
      while (p >= 0 && idx[p] === n - k + p) p--;
      if (p < 0) break;
      idx[p]++;
      for (let q = p + 1; q < k; q++) idx[q] = idx[q - 1] + 1;
    }
  }
}
/** Nombre minimal d'indices à croiser pour que la réponse ne fasse plus de doute. */
function indispensables(indices, mondes, rep, vraie) {
  for (const sub of parTaille(indices.length)) {
    const restes = mondes.filter((w) => sub.every((i) => indices[i].f(w)));
    if (restes.length && restes.every((w) => rep(w) === vraie)) return sub.length;
  }
  return indices.length + 1;
}
/** Ajoute des indices vrais jusqu'à une seule solution, puis retire ceux qui ne servent à rien. */
function reduire(rng, pool, mondes, { max = 99, filtre = () => true } = {}) {
  let reste = mondes;
  const pris = [];
  for (const c of rng.shuffle(pool)) {
    if (reste.length <= 1 || pris.length >= max) break;
    if (!filtre(c, pris)) continue;
    const r2 = reste.filter(c.f);
    if (r2.length === reste.length || !r2.length) continue;
    pris.push(c); reste = r2;
  }
  if (reste.length !== 1) return null;
  for (const c of rng.shuffle(pris.slice())) {
    const sans = pris.filter((x) => x !== c);
    if (mondes.filter((w) => sans.every((x) => x.f(w))).length === 1) pris.splice(pris.indexOf(c), 1);
  }
  return { indices: pris, solution: reste[0] };
}
function permutations(arr) {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
}

const CONTEXTES = [
  'La recette de la kermesse a disparu du bureau du comité des fêtes',
  'Le trophée du tournoi de mini-foot interzones a disparu de la vitrine du hall',
  'Les clés du local des saisies ont disparu du tableau de l’accueil',
  'La caisse de la buvette du club de basket est vide ce matin',
  'Quelqu’un a vidé la cagnotte du pot de départ du commissaire',
  'Le saxophone du chef de la fanfare a disparu de la salle de répétition',
  'Une trottinette électrique a été volée devant la médiathèque',
  'Les recettes du vide-grenier se sont envolées de la camionnette du comité',
  'Le GPS du combi de garde a disparu pendant la pause',
  'Le jambon gagnant de la tombola a disparu de la salle paroissiale',
];

// ═════════════════════════ Qui ment ? · Les alibis ═════════════════════════
// Chacun dit où il était au moment des faits (et ce qu'il a vu). Un menteur ne dit que des
// choses fausses. Il faut trouver la seule hypothèse où tous les récits tiennent ensemble.

const LIEUX_ALIBI = [
  { l: 'au café du Commerce', gerant: 'Le patron du café du Commerce', g: 'm' },
  { l: 'à la salle de sport', gerant: 'Le coach de la salle de sport', g: 'm' },
  { l: 'au cinéma', gerant: 'La caissière du cinéma', g: 'f' },
  { l: 'à la friterie', gerant: 'Le friturier', g: 'm' },
  { l: 'au club de billard', gerant: 'La gérante du billard', g: 'f' },
  { l: 'à la laverie', gerant: 'Le gardien de la laverie', g: 'm' },
];

function alibis(rng, diff) {
  const n = diff <= 2 ? 4 : diff >= 6 ? 6 : 5;
  const m = diff <= 2 ? 3 : 4;
  const L = diff >= 6 ? 2 : 1;
  const deuxPhrases = diff >= 3;
  const besoin = diff <= 1 ? 2 : diff <= 3 ? 3 : diff <= 5 ? 4 : 5;
  const nbMondes = m ** n;
  const decode = (idx) => { const w = []; for (let p = 0; p < n; p++) { w.push(idx % m); idx = Math.floor(idx / m); } return w; };
  const mondes = Array.from({ length: nbMondes }, (_, i) => decode(i));
  let meilleur = null;
  for (let essai = 0; essai < (diff >= 6 ? 120 : 400); essai++) {
    const tirage = rng.shuffle(PERSONNES).slice(0, n);
    const noms = tirage.map((t) => t[0]), g = tirage.map((t) => t[1]);
    const lieux = rng.shuffle(LIEUX_ALIBI).slice(0, m);
    const W = Array.from({ length: n }, () => rng.int(0, m - 1));
    const menteurs = rng.shuffle([...Array(n).keys()]).slice(0, L).sort((a, b) => a - b);
    // Déclarations possibles de p, sur le monde w.
    const decl = (s) => {
      const autres = [...Array(n).keys()].filter((x) => x !== s);
      const X = rng.pick(autres), k = rng.int(0, m - 1);
      return [
        { w: 3, sur: 'moi', t: `« J’étais ${lieux[k].l}. »`, f: (w) => w[s] === k },
        { w: 0.5, sur: 'moi', t: `« Je n’ai pas mis les pieds ${lieux[k].l} ce soir. »`, f: (w) => w[s] !== k },
        { w: 2, sur: 'moi', t: `« J’étais avec ${noms[X]} toute l’heure. »`, f: (w) => w[s] === w[X] },
        { w: 1, sur: 'moi', t: `« J’étais ${lieux[k].l}, et aucun des autres n’y était. »`, f: (w) => w[s] === k && w.every((v, q) => q === s || v !== k) },
        { w: 3, sur: 'autre', t: `« J’ai croisé ${noms[X]} ${lieux[k].l}. »`, f: (w) => w[s] === k && w[X] === k },
        { w: 2, sur: 'autre', t: `« ${noms[X]} était ${lieux[k].l}. »`, f: (w) => w[X] === k },
        { w: 0.7, sur: 'autre', t: `« ${noms[X]} n’était pas ${lieux[k].l}. »`, f: (w) => w[X] !== k },
      ];
    };
    const st = [];
    let ok = true;
    for (let s = 0; s < n && ok; s++) {
      const vrai = !menteurs.includes(s);
      const phrases = [];
      for (const sur of deuxPhrases ? ['moi', 'autre'] : [rng.pick(['moi', 'autre'])]) {
        let c = null;
        for (let t = 0; t < 60 && !c; t++) {
          const cand = rng.weighted(decl(s).filter((x) => x.sur === sur));
          if (cand.f(W) === vrai && !phrases.some((x) => x.t === cand.t)) c = cand;
        }
        if (!c) { ok = false; break; }
        phrases.push(c);
      }
      st.push(phrases);
    }
    if (!ok) continue;
    // Faits établis (toujours vrais) : témoignage d'un gérant sur le nombre de clients de la liste.
    const faits = [];
    const nbFaits = diff <= 2 ? 1 : diff <= 4 ? rng.int(1, 2) : rng.int(0, 1);
    for (const k of rng.shuffle([...Array(m).keys()]).slice(0, nbFaits)) {
      const c = W.filter((v) => v === k).length;
      const qui = c === 0 ? 'aucune personne de la liste n’est passée' : c === 1 ? 'une seule personne de la liste est passée' : `${NOMBRES[c]} personnes de la liste sont passées`;
      faits.push({ t: `${lieux[k].gerant} est formel${lieux[k].g === 'f' ? 'le' : ''} : ${qui} entre 21 et 22 heures.`, f: (w) => w.filter((v) => v === k).length === c });
    }
    // Statut de chacun dans chaque monde : 1 tout vrai, 0 tout faux, -1 mélange.
    const valides = mondes.filter((w) => faits.every((f) => f.f(w)));
    const statut = valides.map((w) => st.map((ph) => { const v = ph.map((x) => x.f(w)); return v.every(Boolean) ? 1 : v.every((x) => !x) ? 0 : -1; }));
    const hyps = (P) => {
      const res = new Set();
      for (const s of statut) {
        if (P.some((p) => s[p] === -1)) continue;
        const F = P.filter((p) => s[p] === 0);
        if (F.length > L) continue;
        const hors = [...Array(n).keys()].filter((p) => !P.includes(p));
        const manque = L - F.length;
        if (manque > hors.length) continue;
        if (manque === 0) res.add(F.join('-'));
        else for (const sub of parTaille(hors.length)) { if (sub.length > manque) break; if (sub.length === manque) res.add([...F, ...sub.map((i) => hors[i])].sort((a, b) => a - b).join('-')); }
        if (res.size > 1) break;
      }
      return res;
    };
    const tous = hyps([...Array(n).keys()]);
    if (tous.size !== 1 || [...tous][0] !== menteurs.join('-')) continue;
    let pas = n + 1;
    for (const P of parTaille(n)) { const h = hyps(P); if (h.size === 1) { pas = P.length; break; } }
    const r = { noms, g, lieux, W, menteurs, st, faits, pas };
    if (!meilleur || pas > meilleur.pas) meilleur = r;
    if (pas >= besoin) break;
  }
  const { noms, lieux, W, menteurs, st, faits, pas } = meilleur;
  const qui = et(menteurs.map((i) => noms[i]));
  const deux = L === 2;
  const hyps = deux ? [...parTaille(n)].filter((s) => s.length === 2) : [...Array(n).keys()].map((i) => [i]);
  const cle = (h) => h.map((i) => noms[i]).sort().join('-');
  return {
    titre: 'Qui ment ?', mode: 'choix', forme: 'alibis',
    contexte: `${rng.pick(CONTEXTES)}, entre 21 et 22 heures. ${NOMBRES[n].replace(/^./, (c) => c.toUpperCase())} personnes de l’entourage disent où elles étaient pendant toute cette heure. ${deux ? 'Deux d’entre elles mentent' : 'Une seule ment'} : un menteur ne dit que des choses fausses, les autres ne disent que la vérité. Chacun est resté toute l’heure au même endroit, forcément l’un de ces ${NOMBRES[m]} lieux : ${et(lieux.map((x) => x.l))}.`,
    elements: rng.shuffle(st.map((ph, s) => ({ label: noms[s], texte: ph.map((x) => x.t).join(' '), phrases: ph.map((x) => x.t) }))),
    indices: faits.length ? faits.map((f) => f.t) : undefined, titreIndices: 'Faits établis',
    question: deux ? 'Qui sont les deux menteurs ?' : 'Qui ment ?', _pas: pas,
    choix: deux ? rng.shuffle(hyps).map((h) => ({ id: cle(h), label: et(h.map((i) => noms[i]).sort()) })) : rng.shuffle(noms.map((x) => ({ id: x, label: x }))),
    answer: deux ? cle(menteurs) : noms[menteurs[0]],
    astuce: 'Cherche deux récits qui ne peuvent pas être vrais en même temps : l’un des deux auteurs ment. Suppose que c’est le premier, place chacun à son endroit, et vérifie que tout le reste tient.',
    explication: `${qui} ${deux ? 'mentent' : 'ment'}. Version où tout tient : ${noms.map((x, p) => `${x} ${lieux[W[p]].l}`).join(', ')}. Avec ${deux ? 'n’importe quelle autre paire' : 'n’importe quel autre menteur'}, au moins deux déclarations se contredisent.`,
  };
}

// ═════════════════════════ Qui ment ? · Demi-vérités ═════════════════════════
// Chaque suspect fait deux déclarations : une vraie, une fausse. Qui est le coupable ?
// Niveau 5 : l'un d'eux (on ne sait pas qui) dit deux vérités. Hardcore : en plus, un autre ment deux fois.

function demi(rng, diff) {
  const n = diff <= 2 ? 3 : diff <= 4 ? 4 : 5;
  const honnete = diff >= 5, double = diff >= 6;
  const besoin = diff <= 1 ? 2 : diff <= 3 ? 3 : diff <= 5 ? 4 : 5;
  let meilleur = null;
  for (let essai = 0; essai < 600; essai++) {
    const tirage = rng.shuffle(PERSONNES).slice(0, n);
    if (new Set(tirage.map((t) => t[1])).size < 2) continue;
    const noms = tirage.map((t) => t[0]), g = tirage.map((t) => t[1]);
    // Mondes : [coupable, celui qui dit deux vérités (-1 : personne), celui qui ment deux fois (-1)].
    const mondes = [];
    for (let c = 0; c < n; c++) for (let h = honnete ? 0 : -1; h < (honnete ? n : 0); h++) for (let d = double ? 0 : -1; d < (double ? n : 0); d++) if (h === -1 || d === -1 || h !== d) mondes.push([c, h, d]);
    const vrai = rng.pick(mondes);
    const [c0] = vrai;
    const phrases = (s) => {
      const autres = [...Array(n).keys()].filter((x) => x !== s);
      const [X, Y] = rng.shuffle(autres);
      const sexe = rng.pick(['m', 'f']);
      return [
        { w: 2, k: 'pasmoi', t: 'Ce n’est pas moi.', f: (c) => c !== s },
        { w: 0.4, k: 'moi', t: 'C’est moi, je l’avoue.', f: (c) => c === s },
        { w: 3, k: 'cest', x: X, t: `C’est ${noms[X]}.`, f: (c) => c === X },
        { w: 3, k: 'pas', x: X, t: `Ce n’est pas ${noms[X]}.`, f: (c) => c !== X },
        { w: 1.2, k: 'sexe', t: sexe === 'f' ? 'C’est une femme.' : 'C’est un homme.', f: (c) => g[c] === sexe },
        { w: 2, k: 'parmi', t: `C’est ${noms[X]} ou ${noms[Y]}.`, f: (c) => c === X || c === Y },
      ];
    };
    const st = [];
    for (let s = 0; s < n; s++) {
      const nbVrais = s === vrai[1] ? 2 : s === vrai[2] ? 0 : 1;
      let paire = null;
      for (let t = 0; t < 80 && !paire; t++) {
        const pool = phrases(s);
        const a = rng.weighted(pool), b = rng.weighted(pool);
        if (a.k === b.k) continue;
        // Deux phrases contraires (« c'est moi » / « ce n'est pas moi ») ne disent rien.
        const paireK = [a.k, b.k].sort().join();
        if (paireK === 'moi,pasmoi' || (paireK === 'cest,pas' && a.x === b.x)) continue;
        const deja = st.flat();
        if ([a, b].some((x) => (x.k === 'sexe' && deja.filter((y) => y.k === 'sexe').length >= 2) || (x.k === 'moi' && deja.some((y) => y.k === 'moi')))) continue;
        if ((a.f(c0) ? 1 : 0) + (b.f(c0) ? 1 : 0) !== nbVrais) continue;
        paire = rng.shuffle([a, b]);
      }
      if (!paire) break;
      st.push(paire);
    }
    if (st.length !== n) continue;
    const coherent = (P, [c, h, d]) => P.every((s) => {
      const v = (st[s][0].f(c) ? 1 : 0) + (st[s][1].f(c) ? 1 : 0);
      return v === (s === h ? 2 : s === d ? 0 : 1);
    });
    const tous = [...Array(n).keys()];
    const coupables = new Set(mondes.filter((w) => coherent(tous, w)).map((w) => w[0]));
    if (coupables.size !== 1 || !coupables.has(c0)) continue;
    let pas = n + 1;
    for (const P of parTaille(n)) { const cs = new Set(mondes.filter((w) => coherent(P, w)).map((w) => w[0])); if (cs.size === 1) { pas = P.length; break; } }
    const r = { noms, st, c0, vrai, pas };
    if (!meilleur || pas > meilleur.pas) meilleur = r;
    if (pas >= besoin) break;
  }
  const { noms, st, c0, vrai, pas } = meilleur;
  const regle = double ? 'En général, chacun dit une vérité et un mensonge. Mais l’un d’eux a dit deux vérités, et un autre deux mensonges (on ne sait pas lesquels).'
    : honnete ? 'En général, chacun dit une vérité et un mensonge. Mais l’un d’eux (on ne sait pas lequel) a dit deux vérités.'
      : 'Chacun a dit exactement une vérité et un mensonge, dans un ordre quelconque.';
  return {
    titre: 'Qui ment ?', mode: 'choix', forme: 'demi',
    contexte: `${rng.pick(CONTEXTES)}. Le coupable est l’un des ${NOMBRES[n]} suspects entendus. ${regle}`,
    elements: st.map((ph, s) => ({ label: noms[s], texte: `« ${ph[0].t} » · « ${ph[1].t} »`, phrases: ph.map((x) => `« ${x.t} »`) })),
    question: 'Qui est le coupable ?', _pas: pas,
    choix: rng.shuffle(noms.map((x) => ({ id: x, label: x }))),
    answer: noms[c0],
    astuce: 'Suppose un coupable, puis vérifie suspect par suspect qu’il a bien dit une vérité et un mensonge. Commence par celui dont les deux phrases parlent de la même personne.',
    explication: `C’est ${noms[c0]}. Alors ${st.map((ph, s) => {
      const v = ph.map((x) => x.f(c0));
      return `${noms[s]} ${v[0] && v[1] ? 'dit deux vérités' : !v[0] && !v[1] ? 'ment deux fois' : `dit vrai sur « ${ph[v[0] ? 0 : 1].t.replace(/\.$/, '')} »`}`;
    }).join(', ')}. Tout autre coupable fait tomber quelqu’un en défaut.`,
  };
}

// ═════════════════════════ Enquête de voisinage · Les arrivées ═════════════════════════
// Grille de déduction avec un ordre : qui est arrivé à quelle heure, et qu'a-t-il commandé ?
// Les témoignages parlent d'avant, d'après, de « juste après » : on raisonne sur des positions.

const BOISSONS = ['un café', 'une bière', 'un thé', 'un coca', 'une eau pétillante'];
const BOISSONS_C = ['Café', 'Bière', 'Thé', 'Coca', 'Eau'];
const BOISSONS_DE = ['de café', 'de bière', 'de thé', 'de coca', 'd’eau pétillante'];
const TEMOINS_BAR = ['La serveuse', 'Le patron', 'Un habitué', 'Le livreur', 'La voisine de comptoir', 'Le joueur de fléchettes', 'Le plongeur', 'Une cliente'];

function arrivees(rng, diff) {
  const n = diff <= 2 ? 3 : diff <= 5 ? 4 : 5;
  const seuil = diff <= 1 ? 2 : diff <= 3 ? 3 : diff === 4 ? 4 : 5;
  const perms = permutations([...Array(n).keys()]);
  const mondes = [];
  for (const pt of perms) for (const pb of perms) mondes.push([pt, pb]);
  const h0 = rng.pick([20 * 60 + 30, 21 * 60, 21 * 60 + 30]);
  const heures = Array.from({ length: n }, (_, k) => hm(h0 + 15 * k));
  let meilleur = null;
  for (let essai = 0; essai < (n >= 5 ? 25 : 70); essai++) {
    const tirage = rng.shuffle(PERSONNES).slice(0, n);
    const gens = tirage.map((t) => t[0]), g = tirage.map((t) => t[1]);
    const bi = rng.shuffle([...Array(BOISSONS.length).keys()]).slice(0, n);
    const bo = bi.map((k) => BOISSONS[k]), boC = bi.map((k) => BOISSONS_C[k]), boDe = bi.map((k) => BOISSONS_DE[k]);
    const solT = rng.pick(perms), solB = rng.pick(perms); // solT[i] = rang d'arrivée de i ; solB[i] = sa boisson
    const qui = (pb, b) => pb.indexOf(b);
    const gen = () => {
      const i = rng.int(0, n - 1), j = rng.int(0, n - 1), b = rng.int(0, n - 1), t = rng.int(0, n - 1);
      const arr = (x) => `arrivé${e(g[x])}`;
      switch (rng.int(0, 9)) {
        case 0: return i !== j && solT[i] < solT[j] ? { t: `${gens[i]} est ${arr(i)} avant ${gens[j]}.`, f: ([pt]) => pt[i] < pt[j] } : null;
        case 1: { const p = qui(solB, b); return p !== i && solT[i] === solT[p] + 1 ? { t: `${gens[i]} est ${arr(i)} juste après la personne qui a pris ${bo[b]}.`, f: ([pt, pb]) => pt[i] === pt[qui(pb, b)] + 1 } : null; }
        case 2: return solB[i] !== b ? { t: `${gens[i]} n’a pas pris ${boDe[b]}.`, f: ([, pb]) => pb[i] !== b } : null;
        case 3: return solT[i] > 0 && solT[i] < n - 1 ? { t: `${gens[i]} n’est ${arr(i)} ni en premier ni en dernier.`, f: ([pt]) => pt[i] > 0 && pt[i] < n - 1 } : null;
        case 4: { const p = qui(solB, b); return n >= 4 && p !== i && Math.abs(solT[i] - solT[p]) === 2 ? { t: `Entre ${gens[i]} et la personne qui a pris ${bo[b]}, il y a eu exactement une autre arrivée.`, f: ([pt, pb]) => Math.abs(pt[i] - pt[qui(pb, b)]) === 2 } : null; }
        case 5: { const p = qui(solB, b); return p !== j && solT[p] < solT[j] ? { t: `La personne qui a pris ${bo[b]} est arrivée avant ${gens[j]}.`, f: ([pt, pb]) => pt[qui(pb, b)] < pt[j] } : null; }
        case 6: return diff <= 2 ? { t: `${gens[i]} est ${arr(i)} à ${heures[solT[i]]}.`, f: ([pt]) => pt[i] === solT[i], pos: true } : null;
        case 7: { const p = solT.indexOf(0); return solB[p] !== b ? { t: `La première personne arrivée n’a pas pris ${boDe[b]}.`, f: ([pt, pb]) => pb[pt.indexOf(0)] !== b } : null; }
        case 8: return solT[i] !== n - 1 ? { t: `${gens[i]} n’est pas ${arr(i)} en dernier.`, f: ([pt]) => pt[i] !== n - 1 } : null;
        case 9: { const p = qui(solB, b); return solT[p] !== t ? { t: `La personne arrivée à ${heures[t]} n’a pas pris ${boDe[b]}.`, f: ([pt, pb]) => pt[qui(pb, b)] !== t } : null; }
        default: return null;
      }
    };
    let reste = mondes;
    const clues = [];
    for (let guard = 0; reste.length > 1 && guard < 800; guard++) {
      const c = gen();
      if (!c || clues.some((x) => x.t === c.t)) continue;
      if (c.pos && clues.filter((x) => x.pos).length >= 1) continue;
      const r2 = reste.filter(c.f);
      if (r2.length === reste.length) continue;
      clues.push(c); reste = r2;
    }
    if (reste.length !== 1) continue;
    if (diff >= 2) for (const c of rng.shuffle(clues.slice())) {
      const sans = clues.filter((k) => k !== c);
      if (mondes.filter((w) => sans.every((k) => k.f(w))).length === 1) clues.splice(clues.indexOf(c), 1);
    }
    if (clues.length > 9) continue;
    const questions = [];
    for (let t = 0; t < n; t++) {
      const p = solT.indexOf(t);
      questions.push({ type: 'qui', question: `Qui est arrivé à ${heures[t]} ?`, answer: gens[p], rep: ([pt]) => gens[pt.indexOf(t)] });
      if (diff >= 3) questions.push({ type: 'boisson', question: `Qu’a pris la personne arrivée à ${heures[t]} ?`, answer: boC[solB[p]], rep: ([pt, pb]) => boC[pb[pt.indexOf(t)]] });
    }
    for (let b = 0; b < n; b++) {
      const p = solB.indexOf(b);
      if (diff >= 4) questions.push({ type: 'heure', question: `À quelle heure est arrivée la personne qui a pris ${bo[b]} ?`, answer: heures[solT[p]], rep: ([pt, pb]) => heures[pt[pb.indexOf(b)]] });
    }
    for (const q of questions) q.pas = clues.length + 1;
    let restants = questions.slice();
    for (const sub of parTaille(clues.length)) {
      if (!restants.length) break;
      const restes = mondes.filter((w) => sub.every((i) => clues[i].f(w)));
      restants = restants.filter((q) => { if (restes.every((w) => q.rep(w) === q.answer)) { q.pas = sub.length; return false; } return true; });
    }
    const ok = questions.filter((x) => x.pas >= seuil);
    const cible = ok.length ? Math.min(...ok.map((x) => x.pas)) : Math.max(...questions.map((x) => x.pas));
    const q = rng.pick(questions.filter((x) => x.pas === cible));
    const r = { gens, bo, boC, solT, solB, clues, q };
    if (!meilleur || q.pas > meilleur.q.pas) meilleur = r;
    if (q.pas >= seuil) break;
  }
  const { gens, bo, boC, solT, solB, clues, q } = meilleur;
  const temoins = rng.shuffle(TEMOINS_BAR);
  const bar = rng.pick(['au bar « Le Relais »', 'au café de la Gare', 'à la brasserie du Marché', 'au snack du rond-point']);
  return {
    titre: 'Enquête de voisinage', mode: 'choix', forme: 'arrivees',
    contexte: `Un portefeuille a disparu ${bar}. ${NOMBRES[n].replace(/^./, (c) => c.toUpperCase())} clients sont arrivés l’un après l’autre, à un quart d’heure d’intervalle (${heures.join(', ')}) : ${et(gens)}. Chacun a pris une boisson différente (${bo.join(', ')}). Personne n’a regardé l’heure : les témoins se souviennent seulement de l’ordre.`,
    elements: [], indices: clues.map((c, i) => `${temoins[i % temoins.length]} : « ${c.t} »`), titreIndices: 'Auditions',
    grille: { gens, veh: heures, lieux: boC, titres: ['Qui · heure', 'Qui · boisson', 'Heure · boisson'] },
    question: q.question, _pas: q.pas,
    choix: q.type === 'qui' ? gens.map((x) => ({ id: x, label: x })) : q.type === 'boisson' ? boC.map((x) => ({ id: x, label: x })) : heures.map((x) => ({ id: x, label: x })),
    answer: q.answer,
    astuce: 'Dans la grille, chaque heure n’a qu’un client. « Juste après » et « exactement une arrivée entre » fixent des positions : essaie-les à chaque place possible.',
    explication: `Ordre d’arrivée : ${[...Array(gens.length).keys()].map((t) => { const p = solT.indexOf(t); return `${gens[p]} (${boC[solB[p]].toLowerCase()})`; }).join(' → ')}.`,
  };
}

// ═════════════════════════ Le butin · La caisse ═════════════════════════
// On connaît le nombre de billets et le total. Avec quelques détails sur la répartition,
// une seule composition est possible : raisonnement sur des nombres entiers, par élimination.

function caisse(rng, diff) {
  const coupures = diff <= 2 ? [10, 20, 50] : diff <= 4 ? [5, 10, 20, 50] : [5, 10, 20, 50, 100];
  const k = coupures.length;
  const minMondes = diff <= 1 ? 3 : diff <= 2 ? 4 : diff <= 3 ? 5 : diff <= 5 ? 8 : 12;
  const besoin = diff <= 2 ? 1 : diff <= 3 ? 2 : 3;
  for (let essai = 0; essai < 800; essai++) {
    const N = rng.int(diff <= 2 ? 8 : 12, diff <= 2 ? 14 : 22);
    const sec = Array(k).fill(0);
    for (let t = 0; t < N; t++) sec[rng.int(0, k - 1)]++;
    const T = sec.reduce((a, c, i) => a + c * coupures[i], 0);
    // Toutes les compositions de N billets qui font T euros.
    const mondes = [];
    const rec = (i, reste, somme, acc) => {
      if (i === k - 1) { if (somme + reste * coupures[i] === T) mondes.push([...acc, reste]); return; }
      for (let c = 0; c <= reste; c++) { const s2 = somme + c * coupures[i]; if (s2 > T) break; rec(i + 1, reste - c, s2, [...acc, c]); }
    };
    rec(0, N, 0, []);
    if (mondes.length < minMondes) continue;
    const C = (i) => `${coupures[i]} €`;
    const pool = [];
    if (sec.every((c) => c > 0)) pool.push({ t: 'Il y avait au moins un billet de chaque sorte.', f: (w) => w.every((c) => c > 0) });
    for (let a = 0; a < k; a++) {
      if (sec[a] === 0) pool.push({ t: `Pas un seul billet de ${C(a)}.`, f: (w) => w[a] === 0 });
      if (sec[a] > 0 && sec[a] % 2 === 0) pool.push({ t: `Le nombre de billets de ${C(a)} est pair.`, f: (w) => w[a] % 2 === 0 && w[a] > 0 });
      if (sec[a] % 2 === 1) pool.push({ t: `Le nombre de billets de ${C(a)} est impair.`, f: (w) => w[a] % 2 === 1 });
      if (sec.every((c, i) => i === a || c < sec[a])) pool.push({ t: `Les billets de ${C(a)} étaient les plus nombreux.`, f: (w) => w.every((c, i) => i === a || c < w[a]) });
      if (diff <= 1) pool.push({ t: `Les billets de ${C(a)} faisaient à eux seuls ${euros(sec[a] * coupures[a])}.`, f: (w) => w[a] === sec[a], direct: true });
      for (let b = 0; b < k; b++) {
        if (a === b) continue;
        if (sec[a] > sec[b]) pool.push({ t: `Il y avait plus de billets de ${C(a)} que de ${C(b)}.`, f: (w) => w[a] > w[b] });
        if (sec[b] > 0 && (sec[a] === 2 * sec[b] || sec[a] === 3 * sec[b])) pool.push({ t: `Il y avait ${sec[a] === 2 * sec[b] ? 'deux' : 'trois'} fois plus de billets de ${C(a)} que de ${C(b)}.`, f: (w) => w[a] === (sec[a] / sec[b]) * w[b] && w[b] > 0 });
        if (a < b && sec[a] === sec[b]) pool.push({ t: `Autant de billets de ${C(a)} que de ${C(b)}.`, f: (w) => w[a] === w[b] });
      }
    }
    const gros = coupures.map((c, i) => (c >= 50 ? i : -1)).filter((i) => i >= 0);
    if (gros.length >= 2) { const s = gros.reduce((x, i) => x + sec[i], 0); pool.push({ t: `${cap(NOMBRES[s] || String(s))} gros billet${s > 1 ? 's' : ''} (50 € ou plus) en tout.`, f: (w) => gros.reduce((x, i) => x + w[i], 0) === s }); }
    const res = reduire(rng, pool.filter((c) => c.f(sec)), mondes, { filtre: (c, pris) => !c.direct || !pris.some((x) => x.direct) });
    if (!res) continue;
    const pas = indispensables(res.indices, mondes, (w) => w.join(','), sec.join(','));
    if (pas < besoin || res.indices.length > 5) continue;
    // La coupure demandée : celle qui varie le plus entre les compositions possibles au départ.
    const cible = [...Array(k).keys()].sort((a, b) => new Set(mondes.map((w) => w[b])).size - new Set(mondes.map((w) => w[a])).size)[0];
    const ou = rng.pick(['la sacoche du livreur de la friterie', 'le tiroir-caisse du snack', 'la caisse de la buvette du club de foot', 'l’enveloppe de la tombola']);
    return {
      titre: 'Le butin', mode: 'exact', forme: 'caisse',
      contexte: `On a vidé ${ou}. Le voleur a été interpellé avec la liasse : ${N} billets pour ${euros(T)} en tout, en coupures de ${et(coupures.map((c) => `${c}`))} €. La victime se souvient de quelques détails.`,
      tableau: `<div class="ca-liasse"><span class="ca-n">${N}</span><span>billets</span><span class="ca-sep">·</span><span class="ca-n">${euros(T)}</span></div><div class="ca-coupures">${coupures.map((c) => `<span class="ca-b ca-${c}">${c} €</span>`).join('')}</div>`,
      indices: rng.shuffle(res.indices).map((c) => c.t), titreIndices: 'La victime se souvient',
      question: `Combien de billets de ${C(cible)} y avait-il ?`,
      placeholder: 'nombre', inputmode: 'numeric',
      answer: String(sec[cible]), _pas: pas,
      astuce: `Commence par les ${N} billets et les ${euros(T)} : quelles compositions sont possibles ? Puis élimine-les une à une avec chaque détail.`,
      explication: `La liasse : ${coupures.map((c, i) => `${sec[i]} × ${c} €`).join(' + ')} = ${euros(T)}, soit ${N} billets. C’est la seule composition qui colle à tous les détails.`,
    };
  }
  throw new Error('caisse : génération impossible');
}

// ═════════════════════════ Expertise · L'imprimante ═════════════════════════
// La lettre anonyme est imprimée. Une imprimante s'abîme avec le temps : un défaut apparu ne
// disparaît plus. Les pages de test des suspects sont datées : avant la lettre, l'imprimante
// coupable ne peut pas avoir PLUS de défauts ; après, elle ne peut pas en avoir MOINS.

const DEFAUTS = [
  { k: 'e', nom: 'les « e » pâles' },
  { k: 'a', nom: 'les « a » décalés vers le haut' },
  { k: 'o', nom: 'les « o » bouchés' },
  { k: 'trait', nom: 'un trait vertical' },
  { k: 'tache', nom: 'une tache d’encre dans la marge' },
  { k: 'r', nom: 'les « r » coupés' },
];
const TEXTES_TEST = ['Page de test : le chat a mangé la pomme', 'Commande : farine, beurre et sucre roux', 'Rappel : réunion des parents à onze heures', 'Facture : réparation de la porte du garage', 'Note : arroser les tomates après le repas', 'Liste : savon, café, éponges et carottes'];
const LETTRES_ANO = ['Paye ou tu le regretteras amèrement', 'On sait où tu habites, retire ta plainte', 'Dernier avertissement : rends ce que tu dois', 'Tu vas payer pour ce que tu as fait'];

function impressionSvg(texte, defs, entete, sous) {
  const D = new Set(defs);
  const w = 8.2, x0 = 16, y0 = 50;
  let s = `<svg viewBox="0 0 340 74" width="100%" role="img" aria-label="${entete}" style="display:block;border-radius:6px;background:#F7F5F0">`;
  s += `<text x="10" y="15" font-family="IBM Plex Mono,monospace" font-size="8.5" fill="#6B6152">${entete}</text>`;
  if (sous) s += `<text x="330" y="15" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="8.5" font-weight="600" fill="#3A332A">${sous}</text>`;
  if (D.has('tache')) s += '<path d="M5 34c3-4 8-2 7 2 3 1 2 6-2 6-1 4-6 3-6-1-3-1-2-6 1-7z" fill="#2A2A2A" fill-opacity=".75"/>';
  if (D.has('trait')) s += '<path d="M228 20V72" stroke="#555" stroke-width=".9" stroke-opacity=".55"/>';
  const lignes = texte.length > 36 ? [texte.slice(0, texte.lastIndexOf(' ', 36)), texte.slice(texte.lastIndexOf(' ', 36) + 1)] : [texte];
  lignes.forEach((l, li) => {
    [...l].forEach((ch, i) => {
      const c = ch.toLowerCase();
      const x = x0 + i * w, y = y0 - (lignes.length > 1 ? 12 : 0) + li * 17 - (D.has('a') && c === 'a' ? 3.2 : 0);
      const op = D.has('e') && c === 'e' ? 0.22 : 1;
      if (ch !== ' ') s += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="'Courier New',Courier,monospace" font-size="14" font-weight="600" fill="#1F1F1F" fill-opacity="${op}">${ch.replace('&', '&amp;').replace('<', '&lt;')}</text>`;
      // « r » coupés : le haut de la lettre manque (la tête d'impression a une buse bouchée).
      if (D.has('r') && c === 'r') s += `<rect x="${(x - 0.5).toFixed(1)}" y="${(y - 10).toFixed(1)}" width="${w.toFixed(1)}" height="5" fill="#F7F5F0"/>`;
      if (D.has('o') && c === 'o') s += `<ellipse cx="${(x + 4.2).toFixed(1)}" cy="${(y - 3.6).toFixed(1)}" rx="2.6" ry="3" fill="#1F1F1F"/>`;
    });
  });
  return `${s}</svg>`;
}

function imprimante(rng, diff) {
  const n = diff <= 1 ? 3 : diff <= 3 ? 4 : diff <= 5 ? 5 : 6;
  const nDef = diff <= 2 ? 4 : diff <= 4 ? 5 : 6;
  const defs = rng.shuffle(DEFAUTS).slice(0, nDef).map((d) => d.k);
  const nomDef = (k) => DEFAUTS.find((d) => d.k === k).nom;
  const jours = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
  const base = rng.int(3, 18);
  const date = (j) => `${jours[(j + 2) % 7]} ${String(base + j).padStart(2, '0')}/09`;
  const D = 6; // jour de la lettre
  for (let essai = 0; essai < 400; essai++) {
    const lettre = rng.shuffle(defs).slice(0, diff <= 2 ? 2 : 3);
    const hors = defs.filter((k) => !lettre.includes(k));
    const avec = (l, k) => [...l, k];
    const sans = (l, k) => l.filter((x) => x !== k);
    const coupable = rng.int(0, n - 1);
    const ech = [];
    let ok = true;
    for (let p = 0; p < n; p++) {
      const avant = diff <= 1 ? rng.chance(0.5) : rng.chance(0.5);
      const jour = avant ? rng.int(1, D - 1) : rng.int(D + 1, D + 6);
      let d;
      if (p === coupable) {
        // Le coupable : jamais exactement les défauts de la lettre (dès le niveau 2).
        if (diff <= 1) d = lettre.slice();
        else d = avant ? sans(lettre, rng.pick(lettre)) : (hors.length ? avec(lettre, rng.pick(hors)) : null);
      } else {
        // Innocent : avant la lettre avec un défaut qu'elle n'a pas, ou après sans un de ses défauts.
        const piege = diff >= 3 && rng.chance(0.6);
        if (avant) {
          if (!hors.length) { ok = false; break; }
          d = avec(piege ? lettre.slice() : sans(lettre, rng.pick(lettre)), rng.pick(hors));
        } else {
          d = sans(piege ? avec(lettre, hors.length ? rng.pick(hors) : lettre[0]) : lettre.slice(), rng.pick(lettre));
        }
      }
      if (!d) { ok = false; break; }
      ech.push({ jour, d: [...new Set(d)] });
    }
    if (!ok) continue;
    const valide = ({ jour, d }) => (jour < D ? d.every((k) => lettre.includes(k)) : lettre.every((k) => d.includes(k)));
    if (ech.filter(valide).length !== 1 || !valide(ech[coupable])) continue;
    // Pas deux pages identiques ; au moins une page « proche » qui n'est pas la bonne.
    if (new Set(ech.map((x) => `${x.jour}|${x.d.slice().sort().join()}`)).size !== n) continue;
    const gens = rng.shuffle(PERSONNES).slice(0, n).map((t) => t[0]);
    const textes = rng.shuffle(TEXTES_TEST);
    const texteLettre = rng.pick(LETTRES_ANO);
    const ordre = rng.shuffle([...Array(n).keys()]);
    return {
      titre: 'Expertise d’écriture', mode: 'choix', forme: 'imprimante',
      contexte: `Une lettre anonyme de menaces, imprimée, a été postée le ${date(D)}. On a saisi l’imprimante de ${NOMBRES[n]} suspects, avec une page de test datée. Une imprimante s’abîme avec le temps : un défaut apparu ne disparaît plus, mais de nouveaux peuvent apparaître.`,
      figures: [{ titre: 'La lettre anonyme', svg: impressionSvg(texteLettre, lettre, 'pièce à conviction', `postée le ${date(D)}`) },
        ...ordre.map((p) => ({ titre: `Échantillon de ${gens[p]}`, svg: impressionSvg(textes[p % textes.length], ech[p].d, `imprimante de ${gens[p]}`, `test du ${date(ech[p].jour)}`) }))],
      question: 'Quelle imprimante a servi pour la lettre ?',
      choix: gens.map((x) => ({ id: x, label: x })),
      answer: gens[coupable],
      astuce: 'Note les défauts de la lettre (lettres pâles, décalées, bouchées, traits, taches). Une page imprimée AVANT la lettre ne peut pas avoir un défaut de plus ; une page imprimée APRÈS ne peut pas en avoir un de moins.',
      explication: `C’est l’imprimante de ${gens[coupable]}. La lettre montre ${et(lettre.map(nomDef))}. Sa page de test, du ${date(ech[coupable].jour)}, ${ech[coupable].jour < D ? 'imprimée avant, n’a aucun défaut que la lettre n’a pas' : 'imprimée après, a tous les défauts de la lettre (et peut-être un nouveau)'}. Chaque autre page a un défaut de trop avant la lettre, ou il lui en manque un après.`,
      _pas: 2,
    };
  }
  throw new Error('imprimante : génération impossible');
}

// ═════════════════════════ Le cadenas · Le digicode ═════════════════════════
// Les touches usées trahissent les chiffres du code ; reste à trouver leur ordre avec
// ce que l'indicateur a remarqué. Raisonnement sur des positions, pas sur des essais.

function digicode(rng, diff) {
  const len = diff <= 2 ? 3 : diff <= 5 ? 4 : 5;
  const besoin = diff <= 1 ? 1 : diff <= 3 ? 2 : diff <= 5 ? 3 : 4;
  for (let essai = 0; essai < 600; essai++) {
    const chiffres = rng.shuffle([...Array(10).keys()]).slice(0, len).sort((a, b) => a - b);
    const mondes = permutations(chiffres);
    const sec = rng.pick(mondes);
    const pos = (w, d) => w.indexOf(d);
    const rangs = ['premier', 'deuxième', 'troisième', 'quatrième', 'cinquième'];
    const pool = [];
    for (const a of chiffres) for (const b of chiffres) {
      if (a === b) continue;
      if (pos(sec, b) === pos(sec, a) + 1) pool.push({ t: `Le ${b} est tapé juste après le ${a}.`, f: (w) => pos(w, b) === pos(w, a) + 1 });
      if (pos(sec, a) < pos(sec, b) && Math.abs(pos(sec, a) - pos(sec, b)) > 1) pool.push({ t: `Le ${a} est tapé avant le ${b}.`, f: (w) => pos(w, a) < pos(w, b) });
      if (a < b && Math.abs(pos(sec, a) - pos(sec, b)) > 1) pool.push({ t: `Le ${a} et le ${b} ne sont pas côte à côte.`, f: (w) => Math.abs(pos(w, a) - pos(w, b)) > 1 });
    }
    for (const a of chiffres) for (let k = 0; k < len; k++) if (pos(sec, a) !== k) pool.push({ t: `Le ${a} n’est pas le ${rangs[k]} chiffre.`, f: (w) => pos(w, a) !== k });
    if (sec[0] % 2) pool.push({ t: 'Le code commence par un chiffre impair.', f: (w) => w[0] % 2 === 1 }); else pool.push({ t: 'Le code commence par un chiffre pair.', f: (w) => w[0] % 2 === 0 });
    if (sec[len - 1] % 2 === 0) pool.push({ t: 'Le code, lu comme un nombre, est pair.', f: (w) => w[len - 1] % 2 === 0 });
    pool.push(sec[0] > sec[len - 1] ? { t: 'Le premier chiffre est plus grand que le dernier.', f: (w) => w[0] > w[len - 1] } : { t: 'Le premier chiffre est plus petit que le dernier.', f: (w) => w[0] < w[len - 1] });
    if (len >= 4) pool.push({ t: `Les deux chiffres du milieu font ${sec[1] + sec[2]} ensemble.`.replace('du milieu', len === 4 ? 'du milieu' : 'en 2e et 3e position'), f: (w) => w[1] + w[2] === sec[1] + sec[2] });
    const monte = sec.every((v, i) => i === 0 || v > sec[i - 1]), descend = sec.every((v, i) => i === 0 || v < sec[i - 1]);
    if (monte || descend) continue; // trop évident
    const res = reduire(rng, pool, mondes, { max: diff >= 6 ? 7 : 6 });
    if (!res) continue;
    const pas = indispensables(res.indices, mondes, (w) => w.join(''), sec.join(''));
    if (pas < besoin) continue;
    const lieu = rng.pick(['de la porte du local à vélos', 'de l’entrée de service de la bijouterie', 'du local technique du parking', 'du hall de l’immeuble du suspect', 'de la réserve de la pharmacie']);
    const source = rng.pick(['Un voisin a observé le suspect taper le code', 'Une caméra a filmé la main du suspect, sans voir l’écran', 'Le gardien a entendu les bips et a vu une partie des gestes']);
    return {
      titre: 'Le cadenas', mode: 'exact', forme: 'digicode',
      contexte: `Le digicode ${lieu}. À la poudre, ${NOMBRES[len]} touches sont usées : le code utilise ces ${NOMBRES[len]} chiffres, une fois chacun. ${source}.`,
      clavier: chiffres,
      indices: rng.shuffle(res.indices).map((c) => c.t), titreIndices: 'Ce qu’on sait',
      question: `Quel est le code à ${len} chiffres ?`,
      placeholder: '0'.repeat(len), inputmode: 'numeric',
      answer: sec.join(''), _pas: pas,
      astuce: 'Pose les chiffres usés sous des cases numérotées et place d’abord ceux que « juste après » soude ensemble : ils se déplacent en bloc.',
      explication: `Le code est ${sec.join('')}. C’est le seul ordre des touches usées qui respecte tout ce qu’on sait.`,
    };
  }
  throw new Error('digicode : génération impossible');
}

// ═════════════════════════ Chronologie · Sans montre ═════════════════════════
// Plus d'écarts en minutes : les témoins ne se souviennent que de l'ordre (avant, juste après,
// entre les deux…). C'est de la logique de positions, pas du calcul.

const FAITS_ORDRE = [
  'L’alarme de la bijouterie se déclenche', 'Une riveraine appelle le 101', 'Une camionnette démarre en trombe',
  'La lumière s’éteint dans l’arrière-boutique', 'Un chien aboie longuement', 'Un livreur de pizzas sonne chez le voisin',
  'L’éclairage public de la rue s’éteint', 'Un bruit de verre brisé retentit', 'Un scooter sans phare remonte la rue',
  'Une portière claque', 'Deux silhouettes cagoulées traversent la rue', 'Le dernier bus passe à l’arrêt',
];
const TEMOINS_ORDRE = ['La voisine du dessus', 'Le livreur', 'Un étudiant à sa fenêtre', 'Le chauffeur de taxi', 'La pharmacienne de garde', 'Un joggeur', 'Le gardien de nuit', 'Une cliente du night-shop'];

function sansMontre(rng, diff) {
  const n = diff <= 2 ? 4 : diff <= 4 ? 5 : 6;
  const besoin = diff <= 1 ? 2 : diff <= 3 ? 3 : diff <= 5 ? 4 : 5;
  const L = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, n);
  const mondes = permutations([...Array(n).keys()]); // w[k] = rang de la lettre k
  for (let essai = 0; essai < 500; essai++) {
    const sec = rng.pick(mondes);
    const pool = [];
    const rang = ['en premier', 'en deuxième', 'en troisième', 'en quatrième', 'en cinquième', 'en sixième'];
    for (let a = 0; a < n; a++) {
      if (sec[a] !== 0 && sec[a] !== n - 1) pool.push({ t: `${L[a]} n’est ni le premier fait ni le dernier.`, f: (w) => w[a] !== 0 && w[a] !== n - 1 });
      if (sec[a] !== 0) pool.push({ t: `${L[a]} n’est pas le premier fait.`, f: (w) => w[a] !== 0 });
      if (sec[a] !== n - 1) pool.push({ t: `${L[a]} n’est pas le dernier fait.`, f: (w) => w[a] !== n - 1 });
      if (diff <= 2) pool.push({ t: `${L[a]} s’est produit ${rang[sec[a]]}.`, f: (w) => w[a] === sec[a], direct: true });
      for (let b = 0; b < n; b++) {
        if (a === b) continue;
        if (sec[b] === sec[a] + 1) pool.push({ t: `${L[b]} a eu lieu juste après ${L[a]}, sans rien entre les deux.`, f: (w) => w[b] === w[a] + 1 });
        if (sec[a] < sec[b] && sec[b] - sec[a] > 1) pool.push({ t: `${L[a]} s’est produit avant ${L[b]}.`, f: (w) => w[a] < w[b] });
        if (a < b && Math.abs(sec[a] - sec[b]) >= 2) { const k = Math.abs(sec[a] - sec[b]) - 1; pool.push({ t: `Entre ${L[a]} et ${L[b]}, il s’est passé exactement ${NOMBRES[k]} autre${k > 1 ? 's' : ''} fait${k > 1 ? 's' : ''}.`, f: (w) => Math.abs(w[a] - w[b]) - 1 === k }); }
        for (let c = b + 1; c < n; c++) {
          if (c === a) continue;
          if (sec[a] > sec[b] && sec[a] > sec[c]) pool.push({ t: `${L[a]} s’est produit après ${L[b]} et après ${L[c]}.`, f: (w) => w[a] > w[b] && w[a] > w[c] });
          if ((sec[a] - sec[b]) * (sec[a] - sec[c]) < 0) pool.push({ t: `${L[a]} s’est produit entre ${L[b]} et ${L[c]}.`, f: (w) => (w[a] - w[b]) * (w[a] - w[c]) < 0 });
        }
      }
    }
    const res = reduire(rng, pool, mondes, { max: n + 2, filtre: (c, pris) => !c.direct || !pris.some((x) => x.direct) });
    if (!res) continue;
    const pas = indispensables(res.indices, mondes, (w) => w.join(), sec.join());
    if (pas < besoin) continue;
    const faits = rng.shuffle(FAITS_ORDRE).slice(0, n);
    const temoins = rng.shuffle(TEMOINS_ORDRE);
    const bon = [...Array(n).keys()].map((r) => L[sec.indexOf(r)]).join('');
    let exemple;
    do { exemple = rng.shuffle(L).join(''); } while (exemple === bon || exemple === L.join(''));
    return {
      titre: 'Chronologie', mode: 'exact', forme: 'sansmontre',
      contexte: 'Cette nuit, personne n’a regardé l’heure. Les témoins se souviennent seulement de ce qui s’est passé avant ou après. Remets les faits dans l’ordre.',
      elements: L.map((l, k) => ({ label: l, texte: faits[k] })),
      indices: res.indices.map((c, i) => `${temoins[i % temoins.length]} : « ${c.t} »`), titreIndices: 'Témoignages',
      question: 'Dans quel ordre les faits se sont-ils produits ?', _pas: pas,
      consigne: `Tape les ${n} lettres dans l’ordre chronologique, du premier au dernier (ex. : ${exemple}).`,
      placeholder: 'Les lettres dans l’ordre', lettres: L.join(''),
      answer: bon,
      astuce: 'Les « juste après » collent deux faits en un bloc. Place les blocs, puis essaie les positions qui restent avec les autres témoignages.',
      explication: `L’ordre est ${bon.split('').join(' → ')}. C’est le seul qui respecte tous les témoignages.`,
    };
  }
  throw new Error('sans montre : génération impossible');
}

// ═════════════════════════ La filature · À rebours ═════════════════════════
// Le suspect a été interpellé ; on a le compte rendu de son trajet, mais pas son point de
// départ. Il faut remonter le chemin à l'envers, en inversant chaque virage.

const REPERES = ['la Gare', 'l’Église', 'la Pharmacie', 'le Parc', 'l’École', 'la Banque', 'le Marché', 'la Poste', 'le Stade', 'la Piscine', 'le Cinéma', 'la Mairie'];
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const NOM_DIR = ['le nord', 'l’est', 'le sud', 'l’ouest'];

function rebours(rng, diff) {
  const N = 5;
  const nMoves = diff <= 1 ? 3 : diff <= 2 ? 4 : diff <= 3 ? 5 : diff <= 4 ? 6 : diff <= 5 ? 7 : 8;
  const dansPlan = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
  for (let essai = 0; essai < 800; essai++) {
    let x = rng.int(0, N - 1), y = rng.int(0, N - 1), d = rng.int(0, 3);
    const start = { x, y, d };
    const etapes = [];
    let ok = true;
    for (let m = 0; m < nMoves; m++) {
      const tourne = m === 0 ? 'droit' : rng.pick(diff >= 4 ? ['gauche', 'droite', 'gauche', 'droite', 'demi'] : ['gauche', 'droite']);
      const nd = tourne === 'gauche' ? (d + 3) % 4 : tourne === 'droite' ? (d + 1) % 4 : tourne === 'demi' ? (d + 2) % 4 : d;
      const pas = rng.int(1, 2);
      const nx = x + DIRS[nd][0] * pas, ny = y + DIRS[nd][1] * pas;
      if (!dansPlan(nx, ny)) { ok = false; break; }
      etapes.push({ tourne, pas }); x = nx; y = ny; d = nd;
    }
    if (!ok || (x === start.x && y === start.y)) continue;
    const fin = { x, y, d };
    // Remonter sans inverser les virages : le piège classique.
    const remonter = (inverse) => {
      let xx = fin.x, yy = fin.y, dd = fin.d;
      for (let k = etapes.length - 1; k >= 0; k--) {
        const e2 = etapes[k];
        xx -= DIRS[dd][0] * e2.pas; yy -= DIRS[dd][1] * e2.pas;
        const t = e2.tourne;
        const inv = inverse ? t : t === 'gauche' ? 'droite' : t === 'droite' ? 'gauche' : t;
        dd = inv === 'gauche' ? (dd + 1) % 4 : inv === 'droite' ? (dd + 3) % 4 : inv === 'demi' ? (dd + 2) % 4 : dd;
      }
      return { x: xx, y: yy };
    };
    const faux = remonter(false);
    const cles = new Set([`${start.x},${start.y}`, `${fin.x},${fin.y}`]);
    const lieux = [{ x: start.x, y: start.y }];
    if (dansPlan(faux.x, faux.y) && !cles.has(`${faux.x},${faux.y}`)) { lieux.push(faux); cles.add(`${faux.x},${faux.y}`); }
    const nLieux = diff <= 2 ? 5 : diff >= 6 ? 9 : 7;
    for (let g = 0; lieux.length < nLieux && g < 100; g++) {
      const p = { x: rng.int(0, N - 1), y: rng.int(0, N - 1) };
      if (!cles.has(`${p.x},${p.y}`)) { cles.add(`${p.x},${p.y}`); lieux.push(p); }
    }
    const noms = rng.shuffle(REPERES).slice(0, lieux.length);
    lieux.forEach((l, k) => { l.nom = noms[k]; });
    const S = 46, M = 26, W = (N - 1) * S + 2 * M;
    const cx = (v) => M + v * S;
    let svg = `<svg class="fi-plan" viewBox="0 0 ${W} ${W}" width="100%" role="img" aria-label="Plan du quartier" data-depart="${cx(fin.x)},${cx(fin.y)}" style="display:block;border-radius:8px;background:#172131">`;
    for (let k = 0; k < N; k++) svg += `<line x1="${cx(0)}" y1="${cx(k)}" x2="${cx(N - 1)}" y2="${cx(k)}" stroke="#3B4E6E" stroke-width="7" stroke-linecap="round"/><line x1="${cx(k)}" y1="${cx(0)}" x2="${cx(k)}" y2="${cx(N - 1)}" stroke="#3B4E6E" stroke-width="7" stroke-linecap="round"/>`;
    svg += '<polyline class="fi-trace" points="" fill="none"/>';
    for (let a = 0; a < N; a++) for (let b2 = 0; b2 < N; b2++) svg += `<circle class="fi-x" cx="${cx(a)}" cy="${cx(b2)}" r="15"/>`;
    for (const l of rng.shuffle(lieux)) svg += `<circle class="fi-lieu" data-action="quest-pick" data-v="${l.nom}" cx="${cx(l.x)}" cy="${cx(l.y)}" r="6" fill="#FFB23F" stroke="#0C1124" stroke-width="1.5"/><text x="${cx(l.x)}" y="${cx(l.y) - 10}" text-anchor="middle" font-family="Instrument Sans,sans-serif" font-weight="600" font-size="9.5" fill="#EEF3F8" paint-order="stroke" stroke="#172131" stroke-width="3">${l.nom.replace(/^l’|^la |^le /, '').replace(/^./, (c) => c.toUpperCase())}</text>`;
    const ang = [0, 90, 180, 270][fin.d];
    svg += `<g transform="translate(${cx(fin.x)} ${cx(fin.y)}) rotate(${ang})"><circle r="9" fill="#FF6E6A" stroke="#0C1124" stroke-width="1.5"/><path d="M0 -6L4.5 3H-4.5Z" fill="#0C1124"/></g>`;
    svg += `<text x="${W - 8}" y="14" text-anchor="end" font-family="Instrument Sans,sans-serif" font-size="9" fill="#9FB0C0">N ↑</text></svg>`;
    const phrase = (e2, k) => {
      const n = e2.pas === 1 ? 'jusqu’au carrefour suivant' : 'deux carrefours plus loin';
      if (k === 0) return `Il part tout droit, ${n}.`;
      if (e2.tourne === 'demi') return `Il fait demi-tour et marche ${n}.`;
      return `Il tourne à ${e2.tourne}, puis continue ${n}.`;
    };
    return {
      titre: 'La filature', mode: 'choix', forme: 'rebours',
      contexte: `Le suspect vient d’être interpellé au point rouge, alors qu’il marchait vers ${NOM_DIR[fin.d]} (la flèche). Le compte rendu de filature décrit tout son trajet, dans l’ordre, de son point de vue à lui… mais la première page, celle du point de départ, a été perdue.`,
      figures: [{ titre: 'Plan du quartier', svg }],
      indices: etapes.map(phrase), titreIndices: 'Compte rendu (dans l’ordre du trajet)',
      question: 'D’où le suspect est-il parti ?',
      choix: rng.shuffle(lieux).map((l) => ({ id: l.nom, label: l.nom.replace(/^./, (c) => c.toUpperCase()) })),
      answer: noms[0],
      astuce: 'Pars du point rouge et lis le compte rendu de la fin vers le début. En marche arrière, un virage à gauche se défait par un virage à droite.',
      explication: `Il était parti de ${noms[0]}. ${dansPlan(faux.x, faux.y) && (faux.x !== start.x || faux.y !== start.y) ? 'Piège : en remontant sans inverser gauche et droite, on se retrouve ailleurs.' : ''}`.trim(),
      _pas: nMoves,
    };
  }
  throw new Error('rebours : génération impossible');
}

// ═════════════════════════ Les horaires · Les badges ═════════════════════════
// Journal des badges d'un bâtiment : on badge pour entrer dans une pièce, pas pour en sortir.
// Qui a pu se trouver dans la salle des archives pendant le vol ?

const PORTES = ['Hall d’entrée', 'Cafétéria', 'Parking', 'Salle de réunion'];

function badges(rng, diff) {
  const n = diff <= 1 ? 3 : diff <= 2 ? 4 : diff <= 4 ? 5 : 6;
  const trajet = diff <= 2 ? 2 : 3;
  const numeros = diff >= 5;
  for (let essai = 0; essai < 400; essai++) {
    const T1 = rng.int(13 * 60 + 40, 15 * 60), T2 = T1 + rng.pick([8, 10, 12]);
    const gens = rng.shuffle(PERSONNES).slice(0, n).map((t) => t[0]);
    const coupable = rng.int(0, n - 1);
    const evts = []; // { p, t, porte }
    const ajoute = (p, t, porte) => evts.push({ p, t, porte });
    const autrePorte = () => rng.pick(PORTES);
    // Rôles des innocents : parti trop tôt, arrivé trop tard, jamais entré, entré puis badgé ailleurs pendant.
    const roles = rng.shuffle(['tot', 'tard', 'jamais', 'ailleurs', 'tot', 'tard']);
    for (let p = 0; p < n; p++) {
      if (p === coupable) {
        const a = diff <= 2 ? rng.int(T1 + 1, T2 - 2) : rng.int(T1 - 14, T1 - 2);
        ajoute(p, a - rng.int(6, 20), rng.pick(['Hall d’entrée', 'Parking']));
        ajoute(p, a, 'Archives');
        if (rng.chance(0.7)) ajoute(p, T2 + trajet + rng.int(1, 9), autrePorte());
        continue;
      }
      const role = roles[p % roles.length];
      if (role === 'tot') {
        // Entré avant, mais a badgé ailleurs trop tôt pour avoir encore été là à T1.
        const b = T1 + trajet - rng.int(1, 4);
        const a = b - trajet - rng.int(3, 15);
        ajoute(p, a - rng.int(5, 15), 'Hall d’entrée'); ajoute(p, a, 'Archives'); ajoute(p, b, autrePorte());
      } else if (role === 'tard') {
        const a = T2 + rng.int(1, 6);
        ajoute(p, a - rng.int(trajet + 1, 12), autrePorte()); ajoute(p, a, 'Archives');
      } else if (role === 'jamais') {
        const t = rng.int(T1 - 10, T2 + 5);
        ajoute(p, t - rng.int(8, 20), 'Hall d’entrée'); ajoute(p, t, rng.pick(['Cafétéria', 'Salle de réunion']));
      } else {
        // Badge ailleurs pendant tout le créneau : impossible d'être aux archives.
        const a = T1 - rng.int(15, 30);
        const b = a + trajet + rng.int(1, 5);
        ajoute(p, a, 'Archives'); ajoute(p, b, autrePorte());
        if (b > T1 - trajet) continue;
        ajoute(p, rng.int(T1 - trajet + 1, T1 + 2), autrePorte()); ajoute(p, rng.int(T2 - 2, T2 + trajet - 1), autrePorte());
      }
    }
    // Vérification : qui a pu être dans les archives à un moment de [T1, T2] ?
    const peut = (p) => {
      const mes = evts.filter((x) => x.p === p).sort((a, b) => a.t - b.t);
      return mes.some((x, k) => {
        if (x.porte !== 'Archives' || x.t > T2) return false;
        const suite = mes[k + 1];
        // Présent de x.t jusqu'à (badge suivant − trajet) : faut-il chevaucher [T1, T2] ?
        return !suite || suite.t - trajet >= T1;
      });
    };
    // Pas d'égalité limite : on garde une marge d'une minute partout.
    const limite = gens.some((_, p) => { const mes = evts.filter((x) => x.p === p).sort((a, b) => a.t - b.t); return mes.some((x, k) => x.porte === 'Archives' && (x.t === T2 || (mes[k + 1] && mes[k + 1].t - trajet === T1))); });
    if (limite) continue;
    const possibles = gens.map((_, p) => p).filter(peut);
    if (possibles.length !== 1 || possibles[0] !== coupable) continue;
    // Deux badges de la même personne trop rapprochés : incohérent.
    const incoherent = gens.some((_, p) => { const mes = evts.filter((x) => x.p === p).sort((a, b) => a.t - b.t); return mes.some((x, k) => k && x.t - mes[k - 1].t < trajet); });
    if (incoherent) continue;
    const num = gens.map(() => String(rng.int(1000, 9899)));
    if (new Set(num).size !== n) continue;
    const lignes = evts.slice().sort((a, b) => a.t - b.t || a.p - b.p);
    const tableau = `<table class="horaire bd"><tr><th>Heure</th><th>${numeros ? 'Badge' : 'Personne'}</th><th>Porte</th></tr>${lignes.map((x) => `<tr class="${x.porte === 'Archives' ? 'bd-arch' : ''}"><td class="mono">${hm(x.t)}</td><td${numeros ? ' class="mono"' : ''}>${numeros ? `n° ${num[x.p]}` : gens[x.p]}</td><td>${x.porte}</td></tr>`).join('')}</table>${numeros ? `<p class="tiny muted" style="margin:6px 0 0">Registre des badges : ${rng.shuffle(gens.map((g, p) => `${g} n° ${num[p]}`)).join(' · ')}</p>` : ''}`;
    return {
      titre: 'Les horaires', mode: 'choix', forme: 'badges',
      contexte: `Un ordinateur portable a disparu de la salle des archives entre ${hm(T1)} et ${hm(T2)}. Dans ce bâtiment, on badge pour entrer dans une pièce, jamais pour en sortir. Entre deux portes, il faut au moins ${trajet} minutes de marche. Une seule personne a pu se trouver dans les archives pendant ce créneau.`,
      tableau, titreTableau: 'Journal des badges',
      question: 'Qui a pu voler l’ordinateur ?',
      choix: rng.shuffle(gens.map((x) => ({ id: x, label: x }))),
      answer: gens[coupable],
      astuce: `Pour chaque passage aux Archives, cherche le badge suivant de la même personne : elle a quitté les archives au plus tard ${trajet} minutes avant. Était-elle encore là à ${hm(T1)} ?`,
      explication: `C’est ${gens[coupable]} : entré${PERSONNES.find((t) => t[0] === gens[coupable])[1] === 'f' ? 'e' : ''} aux archives à ${hm(evts.find((x) => x.p === coupable && x.porte === 'Archives').t)}, sans badge ailleurs qui l’en fasse sortir avant ${hm(T1)}. Les autres sont entrés trop tard, ressortis trop tôt, ou n’y sont jamais allés.`,
      _pas: 2,
    };
  }
  throw new Error('badges : génération impossible');
}

/** Formes de chaque type : la première est la forme d'origine (générée par quests.js). */
export const FORMES = {
  quiment: [{ id: 'classique', nom: 'Classique' }, { id: 'alibis', nom: 'Les alibis', gen: alibis }, { id: 'demi', nom: 'Demi-vérités', gen: demi }],
  grille: [{ id: 'classique', nom: 'Véhicules et lieux' }, { id: 'arrivees', nom: 'Les arrivées', gen: arrivees }],
  butin: [{ id: 'classique', nom: 'Les objets' }, { id: 'caisse', nom: 'La caisse', gen: caisse }],
  ecriture: [{ id: 'classique', nom: 'Manuscrite' }, { id: 'imprimante', nom: 'L’imprimante', gen: imprimante }],
  cadenas: [{ id: 'classique', nom: 'Les essais' }, { id: 'digicode', nom: 'Le digicode', gen: digicode }],
  chronologie: [{ id: 'classique', nom: 'Les écarts' }, { id: 'sansmontre', nom: 'Sans montre', gen: sansMontre }],
  filature: [{ id: 'classique', nom: 'Où est-il allé ?' }, { id: 'rebours', nom: 'À rebours', gen: rebours }],
  horaires: [{ id: 'classique', nom: 'Le bus' }, { id: 'badges', nom: 'Les badges', gen: badges }],
};
