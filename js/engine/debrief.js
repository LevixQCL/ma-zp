// Débrief d'affaire (« Dossier clos ») : à la fin d'une affaire, ce qui désignait l'auteur, ce qui écartait
// chaque innocent, qui a trouvé quoi et quand. Calculé une fois, à la clôture, à partir des dossiers des zones,
// puis publié dans la Gazette (state ne grossit pas).
import { dossierAffaire, faitsConnus, titrePiece, ELEMENTS } from './enquete.js';

// Pièces qui ne doivent rien au travail de la zone (données à tous, reçues ou offertes).
const NON_PROPRES = new Set(['ouverture', 'partage', 'pacte', 'rebond', 'rattrapage', 'tardif']);
const RECUES = new Set(['partage', 'pacte']);
const PLANQUE_NOM = { humidite: 'Planque · humidité du lieu', temperature: 'Planque · température', rive: 'Planque · côté de l’eau', acces: 'Planque · accès' };
const ROLE = { mob: 'Mobile', moy: 'Moyen', occ: 'Occasion' };

const titre = (aff, f) => (f.startsWith('p:') && PLANQUE_NOM[f.slice(2)]) || titrePiece(aff, f) || f;

/** Pièces clés de l'affaire : ce qui désignait l'auteur, et (vol) ce qui menait à la planque. */
export function piecesCles(aff) {
  const c = aff.coupable;
  if (aff.meurtre) return (aff.confront.decisives || []).map((f) => ({ f, role: 'Décisive' }));
  return [
    ...ELEMENTS.map((el) => ({ f: `${el}:${c}`, role: ROLE[el], constat: `c:${el}` })),
    ...['humidite', 'temperature', 'rive', 'acces'].map((a) => ({ f: `p:${a}`, role: 'Planque', planque: true })),
  ];
}

/** Pour chaque innocent : la pièce (ou le groupe de pièces) qui l'écartait. */
export function piecesDisculpantes(aff) {
  const out = [];
  aff.suspects.forEach((s, i) => {
    if (i === aff.coupable) return;
    if (aff.meurtre) {
      const l = (aff.innocente && aff.innocente[i]) || [];
      const g = l.length ? (Array.isArray(l[0]) ? l[0] : [l[0]]) : [];
      out.push({ i, fs: g });
    } else {
      const el = ELEMENTS.find((e) => !s.statut[e]);
      out.push({ i, fs: el ? [`${el}:${i}`] : [], manque: el, constat: el ? `c:${el}` : null });
    }
  });
  return out;
}

/**
 * Construit le débrief. `issue` : 'arrestation' | 'aveux' | 'fuite' | 'classee'.
 * `fin` : { jour (jour de l'enquête où l'affaire s'est jouée), decouvreurs, arreteurs, planque, mobileTrouve }.
 */
export function construireDebrief(state, aff, issue, fin = {}) {
  const n = aff.n;
  const zones = Object.values(state.zones).filter((z) => z && z.uid);
  const dossiers = {};
  for (const z of zones) {
    let d = null;
    try { d = dossierAffaire(state, z, n); } catch (e) { d = null; }
    if (!d || !d.pieces) continue;
    const propres = d.pieces.filter((p) => !NON_PROPRES.has(p.src));
    // Zone qui n'a pas joué cette affaire : ni pièce trouvée, ni reçue, ni accusation.
    if (!propres.length && !d.pieces.some((p) => RECUES.has(p.src)) && d.accuse == null) continue;
    dossiers[z.uid] = d;
  }
  const uids = Object.keys(dossiers);
  const nom = (u) => (state.zones[u] ? `ZP ${state.zones[u].code} ${state.zones[u].nom}` : '?');

  // Qui a trouvé une pièce le premier (par son propre travail), et combien de zones l'avaient à la fin.
  const trouve = (f) => {
    let jMin = Infinity, par = [];
    for (const u of uids) {
      const p = dossiers[u].pieces.find((x) => x.f === f && !NON_PROPRES.has(x.src));
      if (!p) continue;
      const j = p.j || 1;
      if (j < jMin) { jMin = j; par = [u]; } else if (j === jMin) par.push(u);
    }
    const connue = uids.filter((u) => faitsConnus(dossiers[u]).includes(f)).length;
    const viaRebond = (aff.rebonds && Object.entries(aff.rebonds).find(([, r]) => r.f === f)) || null;
    const depart = !par.length && uids.some((u) => dossiers[u].pieces.some((x) => x.f === f && x.src === 'ouverture'));
    return { j: par.length ? jMin : (viaRebond ? Number(viaRebond[0]) : depart ? 1 : null), par, connue, rebond: !par.length && !!viaRebond, depart };
  };

  const cles = piecesCles(aff).map((k) => ({ ...k, titre: titre(aff, k.f), constatTitre: k.constat ? titre(aff, k.constat) : null, ...trouve(k.f) }));
  const accusations = {};
  for (const u of uids) { const a = dossiers[u].accuse; if (a != null && a !== aff.coupable) (accusations[a] ||= []).push(u); }
  const pistes = piecesDisculpantes(aff).map((p) => {
    const s = aff.suspects[p.i];
    const parts = p.fs.map((f) => ({ f, titre: titre(aff, f), ...trouve(f) }));
    return { i: p.i, nom: s.nom, f: !!s.f, role: s.role, manque: p.manque || null, pieces: parts, accusePar: accusations[p.i] || [] };
  });

  // Coup de théâtre du jour 3 : visait-il l'auteur ou un innocent ?
  let theatre = null;
  const r3 = aff.rebonds && aff.rebonds[3];
  if (r3 && (fin.jour || 0) >= 3) {
    const i = Number(String(r3.f).split(':')[1]);
    if (Number.isInteger(i) && aff.suspects[i]) theatre = { i, nom: aff.suspects[i].nom, juste: i === aff.coupable, titre: r3.titre };
  }

  const parZone = uids.map((u) => {
    const d = dossiers[u];
    const z = state.zones[u];
    const donnees = uids.reduce((s, v) => s + dossiers[v].pieces.filter((p) => p.de === u && RECUES.has(p.src)).length, 0);
    return {
      uid: u, nom: nom(u), couleur: z.couleur || null,
      propres: d.pieces.filter((p) => !NON_PROPRES.has(p.src)).length,
      recues: d.pieces.filter((p) => RECUES.has(p.src)).length,
      donnees,
      cles: cles.map((k, x) => (faitsConnus(d).includes(k.f) ? x : -1)).filter((x) => x >= 0),
      clesTrouvees: cles.filter((k) => k.par.includes(u)).length,
      accuse: d.accuse == null ? null : d.accuse, accuseJ: d.accuseJ || null,
      juste: d.accuse === aff.coupable && !d.exclu,
      arrete: (fin.arreteurs || []).includes(u),
    };
  }).sort((a, b) => (b.juste - a.juste) || (b.propres + b.donnees) - (a.propres + a.donnees));

  // Chronologie : premières découvertes de pièces clés, rebondissements, accusations, dénouement.
  const chrono = [];
  for (const k of cles) if (k.j && k.par.length) chrono.push({ j: k.j, t: 'cle', txt: `${k.role} : « ${k.titre} »`, zones: k.par.map(nom) });
  for (const [j, r] of Object.entries(aff.rebonds || {})) if (Number(j) <= (fin.jour || 0)) chrono.push({ j: Number(j), t: 'rebond', txt: r.titre });
  for (const z of parZone) if (z.accuse != null && !z.juste) chrono.push({ j: z.accuseJ, t: 'faux', txt: `Fausse piste : ${aff.suspects[z.accuse] ? aff.suspects[z.accuse].nom : '?'}`, zones: [z.nom] });
  if (fin.decouvreurs && fin.decouvreurs.length) chrono.push({ j: fin.jour, t: 'decouverte', txt: `${aff.suspects[aff.coupable].nom} démasqué${aff.suspects[aff.coupable].f ? 'e' : ''}`, zones: fin.decouvreurs.map(nom) });
  chrono.sort((a, b) => (a.j || 99) - (b.j || 99));

  const s = aff.suspects[aff.coupable];
  return {
    v: 1, n, titre: aff.titre, meurtre: !!aff.meurtre, cas: aff.cas || (aff.meurtre ? 'clef' : null), issue,
    jours: fin.jour || null,
    coupable: { i: aff.coupable, nom: s.nom, f: !!s.f, role: s.role },
    planque: aff.meurtre ? null : (aff.planques[aff.planque] ? { nom: aff.planques[aff.planque].nom, lieu: aff.planques[aff.planque].lieu } : null),
    mobile: aff.mobiles ? { vrai: aff.mobiles[aff.mobileVrai], trouve: fin.mobileTrouve || [] } : null,
    cles, pistes, theatre, zones: parZone, chrono,
    decouvreurs: (fin.decouvreurs || []).map(nom), arreteurs: (fin.arreteurs || []).map(nom),
    totaux: {
      zones: parZone.length,
      pieces: parZone.reduce((x, z) => x + z.propres, 0),
      partages: parZone.reduce((x, z) => x + z.donnees, 0),
      faux: parZone.filter((z) => z.accuse != null && !z.juste).length,
    },
  };
}
