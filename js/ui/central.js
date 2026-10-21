// Le central (calque « Ma zone » de la Carte) : la zone tourne en temps réel toute la journée.
// En haut un bandeau (heure à la seconde, score du jour contre l'adjoint), puis la carte avec les appels et les équipes,
// puis trois lignes « à faire » au plus. Un appel ou une équipe touché s'ouvre dans une feuille fixée en bas d'écran.
// Les consignes à l'adjoint permettent de jouer en passant rarement. Les patrouilles du soir (tour de 20 h) se règlent
// dans l'onglet Ordres.
import { S, esc, myZone, zoneName } from './common.js';
import { planIso } from './plan-iso.js';
import { carteQuartiers } from '../engine/quartiers.js';
import { vehiculesDisponibles } from '../engine/zone.js';
import { CENTRAL, STATUTS_C, SAISIES_C, CARNET_TYPES, equipesCentral, genererJournee, simuler, prevoir, distancesCentral, horloge, fouillable, chanceFouille } from '../engine/central.js';

const COUL = { Intervention: ['#EEF2FA', '#12306E'], Proximité: ['#1E57B8', '#E6F1FF'], Roulage: ['#E59A1F', '#2A1600'] };
const TON = { maitrise: 'v', arretee: 'v', moyen: 'a', deborde: 'a', incident: 'r' };
const SYM = { maitrise: '✓', arretee: '✓', moyen: '−', deborde: '!', incident: '✕' };
const pl = (n) => (n > 1 ? 's' : '');
const ETAT = { libre: 'libre', poste: 'en poste', route: 'en route', surplace: 'sur place', pause: 'en pause' };
const signe = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`;
const calme = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

/** Début de la journée de tour (ms) et instant du central (ms, décalé en démo). */
const debutJour = (st) => st.nextDeadline - CENTRAL.jour * 60000;
const maintenant = () => Date.now() + (S.cxDecalage || 0) * 60000;
/** Minute de la journée de tour (0 = 20:00 la veille). En démo, on peut avancer l'horloge. */
function minute(st) {
  return Math.max(0, Math.min(CENTRAL.jour - 1, Math.floor((maintenant() - debutJour(st)) / 60000)));
}
function contexte() {
  const st = S.state, me = myZone();
  const carte = carteQuartiers(st), cells = (carte.deZone[me.uid] || []).slice();
  const capitale = carte.capitale[me.uid] ?? cells[0];
  const dist = distancesCentral(cells, carte.adj);
  const cle = `${st.season}-${st.turn}`;
  let mem = (S.player && S.player.central) || {};
  if (mem.cle !== cle) { mem = { cle, actions: [], prev: mem.cle === `${st.season}-${st.turn - 1}` ? { cle: mem.cle, actions: mem.actions || [], equipes: mem.equipes } : null }; }
  const equipes = mem.equipes || equipesCentral(me, { capitale, autre: cells.find((c) => c !== capitale), vehicules: vehiculesDisponibles(me, st.turn) });
  if (!mem.equipes) { mem.equipes = equipes; sauver(mem); }
  const graine = (c) => `${S.config.seed}-central-${c}-${me.uid}`;
  const jour = genererJournee(graine(cle), cells);
  return { st, me, carte, cells, capitale, dist, mem, equipes, jour, graine, m: minute(st) };
}
let tSauve = null;
function sauver(mem) {
  S.player = { ...(S.player || {}), central: mem };
  clearTimeout(tSauve);
  tSauve = setTimeout(() => { try { S.backend.savePlayer(S.user.uid, S.player); } catch (e) { console.warn(e); } }, 500);
}
const nomQ = (c, q) => c.carte.nomDe(q);
const tags = (a) => a.tags.join(' · ');
const gTxt = (a) => (a.flou && !a.rens ? '?' : String(a.gReel));
/** Décompte en direct vers une minute de la journée (mis à jour chaque seconde côté client). */
const decompte = (fin, m) => `<span class="cx-dc" data-cxfin="${fin}">${fmtReste(Math.max(0, fin - m) * 60)}</span>`;
function fmtReste(sec) {
  sec = Math.max(0, Math.round(sec));
  if (sec >= 3600) return `${Math.floor(sec / 3600)} h ${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}`;
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
const libreE = (e) => e.etat === 'libre' || e.etat === 'poste';
/** Pourquoi une équipe ne peut pas recevoir d'ordre maintenant. */
function raison(c, e) {
  if (e.etat === 'pause') return `en pause jusqu’à ${horloge(e.jusqua)}`;
  if (e.etat === 'surplace') return `sur place jusqu’à ${horloge(e.jusqua)}`;
  if (e.etat === 'route') return `en route vers ${nomQ(c, e.dest)}, sur place à ${horloge(e.jusqua)}`;
  return '';
}
/** Fin d'occupation d'une équipe si elle fouille l'appel a (route : arrivée + intervention + fouille). */
function finFouille(e, a) {
  if (e.etat === 'surplace') return e.jusqua + CENTRAL.fouille;
  const g0 = a.flou && !a.rens ? 2 : a.gReel;
  return e.jusqua + CENTRAL.surPlace(g0) + CENTRAL.fouille;
}

/** Ce qu'il y a à faire maintenant, du plus urgent au moins urgent. */
function aFaire(c, s) {
  const out = [], m = c.m;
  const libres = s.equipes.filter(libreE);
  for (const a of s.appels.filter((x) => !x.statut && !x.eq && x.t <= m).sort((x, y) => y.gReel - x.gReel || x.t - y.t))
    out.push({ k: 'att', a, titre: a.titre, sous: `${esc(nomQ(c, a.cell))} · gravité ${gTxt(a)} · l’adjoint s’en charge dans ${decompte(a.t + CENTRAL.delaiAdjoint, m)}`, ton: 'r', sym: '!' });
  for (const a of s.appels.filter((x) => !x.statut && x.eq && x.t <= m)) {
    const e = s.equipes.find((q) => q.id === a.eq), p = prevoir(e, a, m, c);
    if (CENTRAL.pts[p.statut] >= 3) continue;
    if (libres.some((q) => CENTRAL.pts[prevoir(q, a, m, c).statut] > CENTRAL.pts[p.statut])) out.push({ k: 'mieux', a, titre: a.titre, sous: `${esc(e.nom)} va faire « ${STATUTS_C[p.statut]} » · une équipe libre ferait mieux`, ton: 'a', sym: '⇄' });
  }
  // Équipe sur place sur un appel fouillable : on peut fouiller, au prix de 10 minutes d'immobilisation.
  for (const a of s.appels.filter((x) => aFouiller(s, x)).slice(0, 2)) {
    const e = s.equipes.find((q) => q.id === a.eq);
    out.push({ k: 'fouille', a, titre: `Fouille possible : ${a.titre}`, sous: `${esc(e.nom)} · ${Math.round(chanceFouille(a.statut) * 100)} % de chance · indisponible jusqu’à ${horloge(finFouille(e, a))}`, ton: 'b', sym: '⌕', faire: `data-cxfouille="${a.id}"`, bouton: 'Fouiller' });
  }
  for (const n of c.jour.annonces.filter((x) => x.ta <= m && x.t > m)) out.push({ k: 'annonce', n, titre: `${n.titre} à ${horloge(n.t)}`, sous: `${esc(nomQ(c, n.cell))} · ${esc(n.texte)} · mets une équipe en poste`, ton: 'b', sym: '◷' });
  for (const e of libres.filter((x) => x.n >= CENTRAL.fatigue)) out.push({ k: 'fatigue', e, titre: `${e.nom} est usée`, sous: `${e.n} missions sans pause · une pause de ${CENTRAL.pause} min la remet d’aplomb`, ton: 'a', sym: '☕' });
  if (s.rensRestants > 0) for (const a of s.appels.filter((x) => !x.statut && x.flou && !x.rens && x.t <= m).slice(0, 1)) out.push({ k: 'rens', a, titre: `Gravité inconnue : ${a.titre}`, sous: `${esc(nomQ(c, a.cell))} · rappeler le requérant (${s.rensRestants} restant${pl(s.rensRestants)})`, ton: 'b', sym: '?', faire: `data-cxrens="${a.id}"`, bouton: 'Rappeler' });
  const tens = c.me.quartiers || {}, ann = c.jour.annonces.find((x) => x.ta <= m && x.t > m);
  const libre = s.equipes.filter((e) => e.etat === 'libre' && e.n < CENTRAL.fatigue && e.id !== s.consignes.reserve).sort((x, y) => (ann && /Bande/.test(ann.titre) ? (y.comp.includes('bande') - x.comp.includes('bande')) : 0))[0];
  if (libre) {
    const q = ann ? ann.cell : c.cells.slice().sort((x, y) => (tens[y] || 0) - (tens[x] || 0))[0];
    if (q != null && libre.ou !== q) out.push({ k: 'poste', titre: `${libre.nom} est libre`, sous: `la poster à ${esc(nomQ(c, q))}${ann && ann.cell === q ? ` avant « ${esc(ann.titre)} »` : ', le quartier le plus tendu'}`, ton: 'b', sym: '⌖', faire: `data-cxposteq="${libre.id}:${q}"`, bouton: 'Poster' });
  }
  return out;
}

/** Appel où l'équipe est sur place et peut encore fouiller. */
function aFouiller(s, a) {
  if (!fouillable(a) || a.fouille || !a.statut || a.statut === 'incident' || !a.eq) return false;
  const e = s.equipes.find((q) => q.id === a.eq);
  return !!e && e.etat === 'surplace' && e.mission === a.id;
}
const objet = (id) => `${SAISIES_C[id].ico} ${esc(SAISIES_C[id].nom)}`;

// ───── Marqueurs : une forme par état, lisible sans la couleur ─────
const LOS = (fill, sel) => `<rect x="-8.5" y="-8.5" width="17" height="17" rx="3" transform="rotate(45)" style="fill:${fill}" stroke="${sel ? '#FFB23F' : '#070B19'}" stroke-width="${sel ? 2.6 : 1.2}"/>`;
const FORME = {
  att: (a, sel) => `<circle r="15.5" fill="none" stroke="#FF6E6A" stroke-width="1.4" class="cx-pulse"/>${LOS('#D93A34', sel)}<text y="3.6" text-anchor="middle" class="cx-mt">${gTxt(a)}</text>`,
  route: (a, sel) => `${LOS('#2D6FD6', sel)}<path d="M-4.5 0H3.5M0.5 -3.5L4 0L0.5 3.5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  ok: (a, sel) => `${LOS('#1E8A5F', sel)}<path d="M-4 0.3L-1.2 3L4 -2.8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  rate: (a, sel) => `${LOS('#B86E14', sel)}<path d="M-4 0H4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`,
  incident: (a, sel) => `<rect x="-9" y="-9" width="18" height="18" rx="1.5" fill="#2A0E12" stroke="${sel ? '#FFB23F' : '#FF6E6A'}" stroke-width="2.2"/><path d="M-4 -4L4 4M4 -4L-4 4" stroke="#FF9E99" stroke-width="2" stroke-linecap="round"/>`,
};
const etatAppel = (a) => (a.statut === 'incident' ? 'incident' : a.statut ? (TON[a.statut] === 'v' ? 'ok' : 'rate') : a.eq ? 'route' : 'att');
const LIB = { att: 'en attente', route: 'équipe en route', ok: 'réglé', rate: 'raté', incident: 'incident' };
const ROND = (e, sel) => {
  const [col, ink] = COUL[e.serv];
  return `${e.etat === 'poste' ? '<circle r="14.5" fill="none" stroke="#FFC970" stroke-width="1.6" stroke-dasharray="3 2.2"/>' : ''}${e.etat === 'surplace' ? '<circle r="14" fill="none" stroke="#FFC970" stroke-width="1.6"/>' : ''}<circle r="11" fill="${col}" stroke="${sel ? '#FFB23F' : '#070B19'}" stroke-width="${sel ? 2.6 : 1.2}" ${e.etat === 'pause' ? 'opacity=".5"' : ''}/><text y="3.2" text-anchor="middle" class="cx-mt" style="fill:${ink};font-size:9px">${e.id}</text>`;
};
// Sous le nombre de tension du quartier, pour ne pas le cacher.
const DY = 16;
const PRIO = { incident: 0, att: 1, route: 2, rate: 3, ok: 4 };

function marqueurs(c, s) {
  const m = c.m, parQ = {};
  const ajout = (q, x) => (parQ[q] ||= []).push(x);
  for (const a of s.appels.filter((x) => x.t <= m && (!x.statut || (x.finA != null && m - x.finA < 20)))) ajout(a.cell, { type: 'a', a, etat: etatAppel(a) });
  for (const e of s.equipes.filter((x) => x.etat !== 'route')) ajout(e.ou, { type: 'e', e });
  const halo = S.cxHalo && S.cxHalo.fin > Date.now() ? S.cxHalo.id : null;
  const vus = S.cxVus, nouveaux = new Set();
  for (const a of s.appels) if (a.t <= m && vus && !vus.has(a.id) && !a.statut) nouveaux.add(a.id);
  S.cxVus = new Set(s.appels.filter((a) => a.t <= m).map((a) => a.id));
  const out = [];
  const g = (inner, { nouveau = false, haloOn = false } = {}) => `<circle r="25" fill="transparent"/>${haloOn ? '<circle r="18" class="cx-halo"/>' : ''}<g class="cx-m${nouveau ? ' cx-new' : ''}">${inner}</g>`;
  for (const [q, items] of Object.entries(parQ)) {
    items.sort((x, y) => (x.type === 'a' ? PRIO[x.etat] : 5) - (y.type === 'a' ? PRIO[y.etat] : 5));
    if (items.length > 2) {
      // Regroupés : un badge chiffré, à la forme de l'élément le plus urgent ; le toucher ouvre la liste.
      const tete = items[0], sel = items.some((x) => (x.type === 'a' ? x.a.id === S.cxSel : x.e.id === S.cxEq)) || S.cxGroupe === q;
      const mini = tete.type === 'a' ? FORME[tete.etat](tete.a, false) : ROND(tete.e, false);
      const nAtt = items.filter((x) => x.type === 'a' && x.etat === 'att').length;
      const haloOn = halo && items.some((x) => (x.type === 'a' ? `a:${x.a.id}` : `e:${x.e.id}`) === halo);
      const nouveau = items.some((x) => x.type === 'a' && nouveaux.has(x.a.id));
      const label = `${nomQ(c, q)} : ${items.length} éléments${nAtt ? `, dont ${nAtt} appel${pl(nAtt)} en attente` : ''}. Ouvrir la liste`;
      out.push({ k: q, dx: 0, dy: DY, attr: `data-cxg="${q}" role="button" tabindex="0" aria-label="${esc(label)}"`, svg: g(`<g transform="translate(-7 0)">${mini}</g><g transform="translate(12 9)"><rect x="-9" y="-8" width="18" height="16" rx="8" fill="#0B1124" stroke="${sel ? '#FFB23F' : '#C3C9DE'}" stroke-width="${sel ? 2.2 : 1.2}"/><text y="3.6" text-anchor="middle" class="cx-mt" style="font-size:10px">${items.length}</text></g>`, { nouveau, haloOn }) });
      continue;
    }
    items.forEach((x, i) => {
      const dx = items.length === 2 ? (i ? 25 : -25) : 0;
      if (x.type === 'a') {
        const a = x.a, sel = S.cxSel === a.id;
        const label = `${a.titre}, ${nomQ(c, a.cell)}, ${LIB[x.etat]}${a.statut ? ` (${STATUTS_C[a.statut]})` : ''}`;
        out.push({ k: q, dx, dy: DY, attr: `data-cx="${a.id}" role="button" tabindex="0" aria-label="${esc(label)}"`, svg: g(FORME[x.etat](a, sel), { nouveau: nouveaux.has(a.id), haloOn: halo === `a:${a.id}` }) });
      } else {
        const e = x.e;
        out.push({ k: q, dx, dy: DY, attr: `data-cxe="${e.id}" role="button" tabindex="0" aria-label="${esc(`${e.nom}, ${ETAT[e.etat]}, ${nomQ(c, e.ou)}`)}"`, svg: g(ROND(e, S.cxEq === e.id), { haloOn: halo === `e:${e.id}` }) });
      }
    });
  }
  return out;
}
const mini = (svg, w = 26) => `<svg viewBox="-13 -13 26 26" width="${w}" height="${w}" aria-hidden="true">${svg}</svg>`;
function legendeHtml() {
  const ex = { gReel: 2, flou: false };
  const l = [[FORME.att(ex, false), 'Appel en attente (chiffre : gravité, ? si inconnue)'], [FORME.route(ex, false), 'Équipe en route'], [FORME.ok(ex, false), 'Réglé'], [FORME.rate(ex, false), 'Raté (moyen ou débordé)'], [FORME.incident(ex, false), 'Incident'],
    [ROND({ serv: 'Intervention', id: 'C1', etat: 'libre' }, false), 'Équipe (pointillé : en poste ; anneau : sur place)'],
    [`<rect x="-9" y="-8" width="18" height="16" rx="8" fill="#0B1124" stroke="#C3C9DE" stroke-width="1.2"/><text y="3.6" text-anchor="middle" class="cx-mt" style="font-size:10px">4</text>`, 'Plusieurs éléments au même endroit : touche pour la liste']];
  return `<details class="cx-leg" data-cxdet="legende" data-cxancre="legende" ${ouvert('legende', false) ? 'open' : ''}><summary>Légende de la carte</summary><div class="cx-leg-l">${l.map(([s, t]) => `<span>${mini(s)}<span>${t}</span></span>`).join('')}
    <span><span class="cx-leg-t" aria-hidden="true">56</span><span>Nombre sur un quartier : sa tension ce soir. Plus il est haut, plus le quartier chauffe (les patrouilles du soir se règlent dans l’onglet Ordres).</span></span></div></details>`;
}

// ───── Feuille du bas : appel, équipe, groupe ─────
const res = (st, prevu = false) => `<span class="cx-res ${TON[st]}">${prevu ? 'prévu : ' : ''}<i aria-hidden="true">${SYM[st]}</i> ${STATUTS_C[st]}</span>`;
function boutonFouille(c, s, a) {
  const e = s.equipes.find((q) => q.id === a.eq && q.mission === a.id && (q.etat === 'route' || q.etat === 'surplace'));
  if (!fouillable(a) || a.fouille || !e || a.statut === 'incident') return '';
  const st = a.statut || prevoir(e, a, c.m, c).statut, ch = Math.round(chanceFouille(st) * 100);
  return `<button type="button" class="cx-eq" data-cxfouille="${a.id}"><span class="cx-av neutre" aria-hidden="true">⌕</span><span class="cx-lb"><b>Fouiller</b><span>${esc(e.nom)} indisponible jusqu’à ${horloge(finFouille(e, a))} (+${CENTRAL.fouille} min) · ${ch} % de chance de trouver quelque chose${a.statut ? '' : ' si l’intervention se passe comme prévu'}</span></span></button>`;
}
function panneauAppel(c, s, a) {
  const m = c.m;
  const dispo = s.equipes.filter((e) => libreE(e) || (e.etat === 'route' && e.mission !== a.id));
  const opts = dispo.map((e) => ({ e, p: prevoir(e, a, m, c) })).sort((x, y) => CENTRAL.pts[y.p.statut] - CENTRAL.pts[x.p.statut] || x.p.arr - y.p.arr);
  const indispo = s.equipes.filter((e) => !dispo.includes(e) && e.mission !== a.id);
  const actuelle = a.eq && s.equipes.find((e) => e.id === a.eq);
  const tete = `<div class="cx-appel"><span class="cx-forme">${mini(FORME[etatAppel(a)](a, false), 30)}</span><span><b>${esc(a.titre)}</b><span class="cx-sous">${horloge(a.t)} · ${esc(nomQ(c, a.cell))} · ${a.flou && !a.rens ? 'gravité inconnue (1 ou 3)' : `gravité ${a.gReel}`} · ${esc(tags(a))}</span></span></div>`;
  const fouilleTxt = a.fouilleFaite ? (a.saisie ? `<p class="cx-info v">Fouille : ${objet(a.saisie)} ${SAISIES_C[a.saisie].acc || 'saisi'}${SAISIES_C[a.saisie].piste ? ' · une piste pour ton enquête' : ''}.</p>` : '<p class="cx-info">Fouille : rien trouvé.</p>')
    : a.fouille ? `<p class="cx-info b">Fouille ${a.statut ? 'en cours' : 'demandée : l’équipe fouillera en arrivant'}${a.fouillePar === 'consigne' ? ' (consigne)' : ''}.</p>` : '';
  const btnF = boutonFouille(c, s, a);
  if (a.statut) {
    const qui = a.eq ? `${esc(s.equipes.find((e) => e.id === a.eq).nom)}${a.par === 'adjoint' ? ' (envoyée par l’adjoint)' : ''}` : 'Personne n’est arrivé à temps';
    return `${tete}<p class="cx-info">${res(a.statut)} · ${qui}${a.finA != null ? ` · ${horloge(a.finA)}` : ''}</p>${fouilleTxt}${btnF ? `<div class="cx-eqs">${btnF}</div>` : ''}`;
  }
  const cur = actuelle ? `<p class="cx-info">${esc(actuelle.nom)}${a.par === 'adjoint' ? ' (adjoint)' : ''} en route · sur place dans ${decompte(a.arr, m)} (${horloge(a.arr)}) · ${res(prevoir(actuelle, a, m, c).statut, true)}</p>`
    : `<p class="cx-info r">Personne n’y va. L’adjoint enverra l’équipe la plus proche dans ${decompte(a.t + CENTRAL.delaiAdjoint, m)}.</p>`;
  const boutons = opts.map(({ e, p }, i) => {
    const [col, ink] = COUL[e.serv], forme = a.tags.some((t) => e.comp.includes(t));
    return `<button type="button" class="cx-eq${i === 0 ? ' meilleur' : ''}" data-cxenv="${e.id}"><span class="cx-av" style="background:${col};color:${ink}">${e.id}</span><span class="cx-lb"><b>Envoyer ${esc(e.nom)}</b><span>${forme ? 'formée · ' : ''}${e.n >= CENTRAL.fatigue ? 'usée · ' : ''}${e.etat === 'route' ? 'détournée · ' : ''}${e.id === s.consignes.reserve ? 'en réserve · ' : ''}sur place ${horloge(p.arr)}</span></span>${res(p.statut)}</button>`;
  }).join('');
  const fermees = indispo.length ? `<div class="cx-indispo"><span class="cx-sous">Indisponibles</span>${indispo.map((e) => `<span><b>${e.id}</b> ${esc(raison(c, e))}</span>`).join('')}</div>` : '';
  const rens = a.flou && !a.rens ? `<button type="button" class="cx-eq" data-cxrens="${a.id}" ${s.rensRestants <= 0 ? 'disabled' : ''}><span class="cx-av neutre" aria-hidden="true">?</span><span class="cx-lb"><b>Rappeler le requérant</b><span>${s.rensRestants <= 0 ? `plus de rappel aujourd’hui (${CENTRAL.renseignements} utilisés)` : `révèle la gravité · ${s.rensRestants} restant${pl(s.rensRestants)} aujourd’hui`}</span></span></button>` : '';
  return `${tete}${cur}${fouilleTxt}<div class="cx-eqs">${rens}${boutons || '<p class="cx-info">Aucune équipe libre pour l’instant.</p>'}${btnF}${fermees}</div>`;
}
function panneauEquipe(c, s, e) {
  const fin = e.etat === 'route' || e.etat === 'surplace' || e.etat === 'pause' ? ` jusqu’à ${horloge(e.jusqua)}` : '';
  const libre = libreE(e), r = raison(c, e);
  const raisonPause = !libre ? r : e.n === 0 ? 'déjà reposée : aucune mission depuis sa dernière pause' : `${CENTRAL.pause} min à l’hôtel de police, puis reposée`;
  const mission = e.mission && s.appels.find((a) => a.id === e.mission);
  return `<div class="cx-appel"><span class="cx-forme">${mini(ROND(e, false), 30)}</span><span><b>${esc(e.nom)}</b><span class="cx-sous">${e.serv} · ${esc(e.comp.join(', '))} · ${ETAT[e.etat]}${fin} · ${esc(nomQ(c, e.ou))} · ${e.n} mission${pl(e.n)} depuis la dernière pause${e.id === s.consignes.reserve ? ' · gardée en réserve' : ''}</span></span></div>
    ${mission ? `<button type="button" class="cx-lien" data-cx="${mission.id}">Voir son appel : ${esc(mission.titre)}</button>` : ''}
    <div class="cx-eqs">
      <button type="button" class="cx-eq" data-cxposte="${e.id}" ${libre ? '' : 'disabled'}><span class="cx-av neutre" aria-hidden="true">⌖</span><span class="cx-lb"><b>${S.cxPoste === e.id ? 'Touche un quartier sur la carte' : 'Mettre en poste'}</b><span>${libre ? `elle attend dans un quartier : sur place tout de suite s’il s’y passe quelque chose${e.comp.includes('bande') ? ' ; une bande y est cueillie à son passage' : ''}` : esc(r)}</span></span></button>
      <button type="button" class="cx-eq" data-cxpause="${e.id}" ${libre && e.n > 0 ? '' : 'disabled'}><span class="cx-av neutre" aria-hidden="true">☕</span><span class="cx-lb"><b>Pause</b><span>${esc(raisonPause)}</span></span></button>
    </div>`;
}
function panneauGroupe(c, s, q, items) {
  return `<div class="cx-appel"><span><b>${esc(nomQ(c, q))}</b><span class="cx-sous">${items.length} élément${pl(items.length)} ici · touche pour ouvrir</span></span></div><div class="cx-eqs">${items.map((x) => (x.type === 'a'
    ? `<button type="button" class="cx-eq" data-cx="${x.a.id}"><span class="cx-av vide">${mini(FORME[x.etat](x.a, false), 28)}</span><span class="cx-lb"><b>${esc(x.a.titre)}</b><span>${LIB[x.etat]}${x.a.statut ? ` · ${STATUTS_C[x.a.statut]}` : ''} · ${horloge(x.a.t)}</span></span></button>`
    : `<button type="button" class="cx-eq" data-cxe="${x.e.id}"><span class="cx-av vide">${mini(ROND(x.e, false), 28)}</span><span class="cx-lb"><b>${esc(x.e.nom)}</b><span>${ETAT[x.e.etat]}${raison(c, x.e) ? ` · ${esc(raison(c, x.e))}` : ''}</span></span></button>`)).join('')}</div>`;
}
function itemsDe(c, s, q) {
  const m = c.m;
  return [...s.appels.filter((x) => String(x.cell) === String(q) && x.t <= m && (!x.statut || (x.finA != null && m - x.finA < 20))).map((a) => ({ type: 'a', a, etat: etatAppel(a) })).sort((x, y) => PRIO[x.etat] - PRIO[y.etat]),
    ...s.equipes.filter((e) => e.etat !== 'route' && String(e.ou) === String(q)).map((e) => ({ type: 'e', e }))];
}

// ───── Consignes à l'adjoint ─────
function consignesHtml(c, s) {
  const k = s.consignes;
  const seg = (cle, choix) => `<div class="cx-seg" role="group">${choix.map(([v, t, lab]) => `<button type="button" data-cxcons="${cle}:${v}" aria-pressed="${String(k[cle] ?? '') === String(v)}"${lab ? ` aria-label="${esc(lab)}"` : ''}>${t}</button>`).join('')}</div>`;
  const res = s.equipes.find((e) => e.id === k.reserve);
  const resume = `fouille ${k.fouille === 'reussi' ? 'si réussi' : 'non'} · réserve ${res ? res.id : 'aucune'} · pause après ${k.pause}`;
  return `<details class="cx-det" id="cx-consignes" data-cxdet="consignes" data-cxancre="consignes" ${ouvert('consignes', false) ? 'open' : ''}><summary><b>Consignes à l’adjoint</b><span class="cx-sous">${resume}</span></summary>
    <p class="cx-info">Tu passes rarement ? Règle tes consignes : l’adjoint les suit toute la journée, même sans toi, et elles comptent au bilan de 20 h.</p>
    <div class="cx-cons"><span><b>Fouiller quand l’intervention est réussie</b><span class="cx-sous">l’équipe reste ${CENTRAL.fouille} min de plus sur place</span></span>${seg('fouille', [['non', 'Non'], ['reussi', 'Oui']])}</div>
    <div class="cx-cons"><span><b>Garder une équipe en réserve</b><span class="cx-sous">l’adjoint ne l’envoie que sur un appel de gravité 3 ou une bande</span></span>${seg('reserve', [['', 'Aucune'], ...s.equipes.map((e) => [e.id, e.id, e.nom])])}</div>
    <div class="cx-cons"><span><b>Pause après</b><span class="cx-sous">missions sans pause, quand rien n’attend</span></span>${seg('pause', [[2, '2'], [3, '3'], [4, '4']])}</div>
  </details>`;
}

// ───── Sections repliables : leur état survit au rafraîchissement ─────
function ouvert(cle, defaut) {
  S.cxOuverts ||= {};
  if (S.cxOuverts[cle] == null) S.cxOuverts[cle] = defaut;
  return S.cxOuverts[cle];
}
/** Carnet : ouvert d'office la toute première fois seulement (mémorisé sur l'appareil). */
function carnetParDefaut() {
  try { if (localStorage.getItem('mazp-cx-carnet-vu')) return false; localStorage.setItem('mazp-cx-carnet-vu', '1'); return true; } catch (e) { return false; }
}

export function centralHtml({ surCarte = '' } = {}) {
  const c = contexte(), m = c.m;
  const s = simuler(c.jour, c.equipes, c.mem.actions, m, c);
  const adj = simuler(c.jour, c.equipes, [], m, c);
  const liste = aFaire(c, s);
  const sel = S.cxSel && s.appels.find((a) => a.id === S.cxSel && a.t <= m);
  const eqSel = S.cxEq && s.equipes.find((e) => e.id === S.cxEq);
  const grp = S.cxGroupe != null && !sel && !eqSel ? itemsDe(c, s, S.cxGroupe) : null;
  if (grp && grp.length < 2) S.cxGroupe = null;
  const tens = c.me.quartiers || {};
  const quartier = S.quartierSel != null && c.cells.includes(Number(S.quartierSel)) ? String(S.quartierSel)
    : c.me.pointChaud && c.cells.includes(Number(c.me.pointChaud.cell)) ? String(c.me.pointChaud.cell) : String(c.cells.slice().sort((x, y) => (tens[y] || 0) - (tens[x] || 0))[0]);
  const iso = planIso(c.st, c.me, { vue: 'mazone', sel: sel ? sel.cell : eqSel ? eqSel.ou : S.cxGroupe != null ? S.cxGroupe : quartier, extra: marqueurs(c, s) });
  const gain = s.pts - adj.pts;
  const demo = S.backend && S.backend.mode === 'demo';
  // Bandeau : l'heure qui avance, le score du jour contre l'adjoint, les consignes et l'aide.
  const sec = Math.floor(((maintenant() - debutJour(c.st)) % 60000) / 1000);
  const bandeau = `<div class="cx-tete" data-cxancre="tete">
      <span class="cx-h1"><span class="cx-heure" aria-label="Heure du central"><b data-cxh>${horloge(m)}</b><small data-cxs>:${String(Math.max(0, sec)).padStart(2, '0')}</small></span><span class="cx-sous">toi ${signe(s.pts)} · adjoint ${signe(adj.pts)}</span></span>
      <span class="cx-score" title="Points du jour : toi contre l’adjoint seul"><b class="${gain > 0 ? 'v' : gain < 0 ? 'r' : ''}">${signe(gain)}</b><span class="cx-sous">sur l’adjoint</span></span>
      <span class="cx-outils"><button type="button" class="cx-ico-b" data-cxouvrir="consignes" aria-label="Consignes à l’adjoint">⚙</button><button type="button" class="cx-ico-b" data-cxouvrir="regles" aria-label="Comment ça marche">?</button></span>
    </div>${demo ? '<div class="cx-demo"><span class="cx-sous">Démo</span><button type="button" data-cxtemps="10">+10 min</button><button type="button" data-cxtemps="60">+1 h</button></div>' : ''}`;
  const ligne = (x) => {
    const sym = `<span class="cx-sym ${x.ton}" aria-hidden="true">${x.sym || '•'}</span>`;
    return x.faire ? `<div class="cx-todo ${x.ton}">${sym}<span class="cx-txt"><b>${esc(x.titre)}</b><span class="cx-sous">${x.sous}</span></span><button type="button" class="cx-go" ${x.faire}>${x.bouton}</button></div>`
      : `<button type="button" class="cx-todo ${x.ton}" ${x.a ? `data-cx="${x.a.id}"` : x.e ? `data-cxe="${x.e.id}"` : x.n ? `data-cxq="${x.n.cell}"` : `data-cxq="${x.q}"`}>${sym}<span class="cx-txt"><b>${esc(x.titre)}</b><span class="cx-sous">${x.sous}</span></span><span class="cx-chev" aria-hidden="true">›</span></button>`;
  };
  const tout = S.cxTout;
  const lignes = (tout ? liste : liste.slice(0, 3)).map(ligne).join('');
  const todos = `<section class="cx-todos" data-cxancre="todos" aria-label="À faire"><h2 class="cx-h">À faire${liste.length ? ` · ${liste.length}` : ''}</h2>${lignes || '<p class="cx-info">Rien d’urgent. Place une équipe en poste dans un quartier tendu, ou règle tes consignes pour la journée.</p>'}${liste.length > 3 ? `<button type="button" class="cx-lien" data-cxtout="1">${tout ? 'Réduire' : `Voir tout (${liste.length})`}</button>` : ''}</section>`;
  const bande = s.equipes.map((e) => {
    const [col, ink] = COUL[e.serv], info = e.etat === 'route' ? `→ ${esc(nomQ(c, e.dest))} ${horloge(e.jusqua)}` : e.etat === 'surplace' || e.etat === 'pause' ? `jusqu’à ${horloge(e.jusqua)}` : esc(nomQ(c, e.ou));
    return `<button type="button" class="cx-chip ${e.etat} ${S.cxEq === e.id ? 'sel' : ''}" data-cxe="${e.id}"><span class="cx-av" style="background:${col};color:${ink}">${e.id}</span><span><b>${ETAT[e.etat]}${e.id === s.consignes.reserve ? ' · réserve' : ''}</b><span>${info}</span></span>${e.n >= CENTRAL.fatigue ? '<i title="usée" aria-label="usée">●</i>' : ''}</button>`;
  }).join('');
  const regle = s.journal.slice().reverse();
  const journal = regle.length ? regle.map((j) => { const a = s.appels.find((x) => x.id === j.id);
    if (j.k === 'saisie') return `<div class="cx-jl"><span class="cx-sous">${horloge(j.m)}</span><span>${objet(j.obj)} ${SAISIES_C[j.obj].acc || 'saisi'} · ${esc(nomQ(c, a.cell))} · ${j.eq}</span><span class="cx-res v">+${j.pts}</span></div>`;
    if (j.k === 'fouille') return `<div class="cx-jl"><span class="cx-sous">${horloge(j.m)}</span><span class="cx-sous">Fouille sans résultat · ${esc(nomQ(c, a.cell))} · ${j.eq}</span><span></span></div>`;
    return `<div class="cx-jl"><span class="cx-sous">${horloge(j.m)}</span><span>${esc(a.titre)} · ${esc(nomQ(c, a.cell))}${j.eq ? ` · ${j.eq}` : ''}</span>${res(j.statut)}</div>`; }).join('') : '<p class="cx-info">Rien de réglé pour l’instant.</p>';
  const nbReg = regle.filter((j) => !j.k).length;
  // Feuille du bas : appel, équipe, groupe ou pose en poste.
  const contenu = S.cxPoste && s.equipes.some((e) => e.id === S.cxPoste) ? `<div class="cx-appel"><span><b>Mettre en poste</b><span class="cx-sous">Touche sur la carte le quartier où ${esc(s.equipes.find((e) => e.id === S.cxPoste).nom)} doit attendre.</span></span></div>`
    : sel ? panneauAppel(c, s, sel) : eqSel ? panneauEquipe(c, s, eqSel) : grp && grp.length > 1 ? panneauGroupe(c, s, S.cxGroupe, grp) : '';
  const feuille = contenu ? `<div class="cx-feuille" id="cx-feuille" role="dialog" aria-label="Détail"><div class="cx-feuille-in">${contenu}</div><button type="button" class="cx-fermer" data-cxfermer="1" aria-label="Fermer">✕</button></div><div class="cx-espace" aria-hidden="true"></div>` : '';
  const msg = S.cxMsg && S.cxMsg.fin > Date.now() ? S.cxMsg.txt : '';
  return `${STYLE}
    ${bandeau}
    <div class="cv-carte cx-carte" data-cxancre="carte">${iso}${surCarte}</div>
    ${legendeHtml()}
    ${todos}
    <div class="cx-bande" data-cxancre="bande">${bande}</div>
    ${consignesHtml(c, s)}
    <details class="cx-det" data-cxdet="journal" data-cxancre="journal" ${ouvert('journal', false) ? 'open' : ''}><summary><b>Journal du jour</b><span class="cx-sous">${nbReg} appel${pl(nbReg)} réglé${pl(nbReg)}</span></summary><div class="cx-journal">${journal}</div></details>
    ${carnetHtml(c, s, adj)}
    ${hier(c)}
    <details class="cx-det" id="cx-regles" data-cxdet="regles" data-cxancre="regles" ${ouvert('regles', false) ? 'open' : ''}><summary><b>Comment ça marche</b></summary><div class="cx-regles">
      <p><b>Compté à 20 h.</b> Le calcul du tour rejoue ta journée : ton carnet, tes saisies, les trophées et le classement du central. Sans toi, l’adjoint dispatche au bout de ${CENTRAL.delaiAdjoint} minutes en suivant tes consignes.</p>
      <p><b>Les appels tombent toute la journée.</b> Envoie l’équipe la plus adaptée : formée à ce qui se passe et sur place dans le quart d’heure, elle maîtrise (+3). Sinon moyen (+1), débordé (−1) ; un appel qui attend s’aggrave d’un cran toutes les ${CENTRAL.aggravation} min, au-delà de la gravité 3 c’est l’incident (−3). Une bande n’est arrêtée que par le contrôle (+4).</p>
      <p><b>Tu peux détourner</b> une équipe en route vers un appel plus grave. <b>Une équipe s’use</b> : à sa 4e mission sans pause, son résultat baisse d’un cran ; ${CENTRAL.repos} min sans mission ou une pause la reposent. <b>En poste</b>, elle attend dans un quartier : sur place tout de suite s’il s’y passe quelque chose.</p>
      <p><b>Fouiller</b> immobilise l’équipe ${CENTRAL.fouille} minutes de plus : pendant ce temps elle ne prend aucun appel. La chance de trouver quelque chose dépend du résultat (${Math.round(chanceFouille('maitrise') * 100)} % si maîtrisé, ${Math.round(chanceFouille('arretee') * 100)} % sur une bande arrêtée, ${Math.round(chanceFouille('moyen') * 100)} % si moyen). Une saisie vaut +1 (+2 si rare). La police saisit, le juge confisque : à 20 h, les biens saisis remplissent la jauge ; à ${CENTRAL.confiscation}, un lot confisqué passe à la salle des ventes et la moitié du prix revient à ta zone. Un téléphone, une carte ou un carnet donne une pièce de plus à ton enquête.</p>
      <p><b>Consignes à l’adjoint</b> (⚙) : fouiller quand l’intervention est réussie, garder une équipe en réserve pour les appels graves, mettre en pause après 2, 3 ou 4 missions. C’est la façon de jouer quand on passe rarement.</p>
      <p><b>Classement.</b> Chaque journée rapporte ton écart sur ton propre adjoint, de 0 à +${CENTRAL.plafondJour} points de classement : être là toute la journée ne fait pas tout.</p>
      <p><b>Ce qui est mal réglé revient</b> une heure plus tard, plus grave. Un appel sur trois est flou : rappeler le requérant révèle sa gravité (${CENTRAL.renseignements} fois par jour). Les événements annoncés le sont une heure avant.</p>
    </div></details>
    ${feuille}
    <div class="cx-msg" id="cx-msg" role="status" aria-live="polite">${msg ? `<span>${esc(msg)}</span>` : ''}</div>`;
}
/** Le carnet du central : objets trouvés, jauge de confiscation, appels réglés, trophées, classement de la saison. */
function carnetHtml(c, s, adj) {
  const cx = c.me.central || { types: {}, saisies: {}, interp: 0, jauge: 0, jours: 0, gainSaison: 0 };
  const parToi = (a) => a.par === 'toi' || a.par === 'poste';
  const ajd = { saisies: s.appels.filter((a) => a.saisie).map((a) => a.saisie), regles: s.appels.filter((a) => (a.statut === 'maitrise' || a.statut === 'arretee') && parToi(a)).map((a) => a.base || a.titre) };
  const nSz = Object.values(cx.saisies || {}).reduce((t, n) => t + n, 0);
  const ids = Object.keys(SAISIES_C), trouves = ids.filter((id) => (cx.saisies || {})[id] || ajd.saisies.includes(id));
  const raresReste = ids.filter((id) => SAISIES_C[id].rare && !trouves.includes(id)).length;
  const album = trouves.map((id) => { const o = SAISIES_C[id], n = (cx.saisies || {})[id] || 0, auj = ajd.saisies.filter((x) => x === id).length;
    return `<div class="cx-obj${o.rare ? ' rare' : ''}"><span class="cx-ico" aria-hidden="true">${o.ico}</span><b>${esc(o.nom)}</b><span>${n ? `×${n}` : ''}${auj ? `${n ? ' · ' : ''}+${auj} aujourd’hui` : ''}${o.piste ? ' · piste' : ''}</span></div>`; }).join('');
  const typesOk = CARNET_TYPES.filter((t) => (cx.types || {})[t] || ajd.regles.includes(t)).length;
  const types = CARNET_TYPES.map((t) => { const n = (cx.types || {})[t] || 0, auj = ajd.regles.filter((x) => x === t).length;
    return `<div class="cx-typ ${n || auj ? 'ok' : ''}"><span aria-hidden="true">${n || auj ? '✓' : '·'}</span><span>${esc(t)}</span><span class="cx-sous">${n ? `×${n}` : ''}${auj ? ` +${auj} aujourd’hui` : ''}</span></div>`; }).join('');
  const jauge = Math.min(CENTRAL.confiscation, cx.jauge || 0), jaugeAuj = ajd.saisies.reduce((t, id) => t + SAISIES_C[id].val, 0);
  const st = c.st, zones = Object.entries(st.zones || {}).filter(([, z]) => z.central && z.central.s === st.season && z.central.joursSaison > 0)
    .sort((x, y) => y[1].central.gainSaison - x[1].central.gainSaison);
  const classement = zones.length ? zones.slice(0, 3).map(([u, z], i) => `<div class="cx-cl ${u === c.me.uid ? 'moi' : ''}"><span>${i + 1}</span><span>${esc(zoneName(z))}</span><span class="cx-sous">${z.central.joursSaison} j</span><b>+${z.central.gainSaison}</b></div>`).join('')
    : '<p class="cx-info">Personne n’est encore classé : le premier bilan tombe ce soir à 20 h.</p>';
  const gain = s.pts - adj.pts, compte = Math.max(0, Math.min(CENTRAL.plafondJour, gain));
  const troph = [['Main sûre', 'saisies au central', nSz, 150], ['Tour de contrôle', 'journées de suite à +15 sur l’adjoint', cx.serie15 || 0, 3], ['Carnet complet', 'types d’appel réglés toi-même', typesOk, CARNET_TYPES.length]]
    .map(([n, t, v, max]) => `<div class="cx-tr ${v >= max ? 'ok' : ''}"><span><b>${n}</b><span class="cx-sous">${t}</span></span><span class="cx-tr-v">${Math.min(v, max)}/${max}</span><span class="cx-barre" aria-hidden="true"><i style="width:${Math.round(100 * Math.min(1, v / max))}%"></i></span></div>`).join('');
  const parDefaut = S.cxOuverts && S.cxOuverts.carnet != null ? S.cxOuverts.carnet : carnetParDefaut();
  return `<details class="cx-det" data-cxdet="carnet" data-cxancre="carnet" ${ouvert('carnet', parDefaut) ? 'open' : ''}><summary><b>Carnet du central</b><span class="cx-sous">${trouves.length}/${ids.length} objets · ${nSz} saisie${pl(nSz)} au carnet${ajd.saisies.length ? ` (+${ajd.saisies.length} aujourd’hui)` : ''} · ${cx.interp || 0} interpellation${pl(cx.interp || 0)} · ${cx.jours || 0} jour${pl(cx.jours || 0)} joué${pl(cx.jours || 0)}</span></summary>
    <h4 class="cx-h">Objets trouvés · ${trouves.length}/${ids.length}</h4>${album ? `<div class="cx-album">${album}</div>` : '<p class="cx-info">Aucun objet pour l’instant : fais fouiller une équipe sur place.</p>'}
    ${raresReste ? `<p class="cx-info">${raresReste} saisie${pl(raresReste)} rare${pl(raresReste)} encore à découvrir.</p>` : ''}
    <h4 class="cx-h">Biens saisis, confisqués puis vendus</h4><div class="cx-jauge" role="img" aria-label="Jauge de confiscation : ${jauge} sur ${CENTRAL.confiscation}"><i style="width:${Math.round(100 * jauge / CENTRAL.confiscation)}%"></i>${jaugeAuj ? `<i class="auj" style="width:${Math.round(100 * Math.min(CENTRAL.confiscation - jauge, jaugeAuj) / CENTRAL.confiscation)}%"></i>` : ''}</div>
    <p class="cx-info">${jauge}${jaugeAuj ? ` + ${jaugeAuj} aujourd’hui` : ''} / ${CENTRAL.confiscation} : la police saisit, le juge confisque. À ${CENTRAL.confiscation}, un lot passe à la salle des ventes et la moitié du prix revient à ta zone.</p>
    <h4 class="cx-h">Trophées du central</h4><div class="cx-trs">${troph}</div>
    <h4 class="cx-h">Appels réglés toi-même · ${typesOk}/${CARNET_TYPES.length}</h4><div class="cx-types">${types}</div>
    <h4 class="cx-h">Classement du central · saison ${st.season}</h4><p class="cx-info">Points de classement : une journée compte de 0 à +${CENTRAL.plafondJour} (ton écart sur ton propre adjoint). Aujourd’hui : ${signe(gain)}, compterait +${compte}.</p><div class="cx-class">${classement}</div><p class="cx-info"><a href="#classement-central">Voir le classement complet dans Classements</a></p>
  </details>`;
}
function hier(c) {
  const prev = c.mem.prev;
  if (!prev || !prev.equipes) return '';
  const jour = genererJournee(c.graine(prev.cle), c.cells);
  const s = simuler(jour, prev.equipes, prev.actions, CENTRAL.jour - 1, c), adj = simuler(jour, prev.equipes, [], CENTRAL.jour - 1, c);
  const inc = s.journal.filter((j) => j.statut === 'incident').length, sz = s.appels.filter((a) => a.saisie);
  return `<details class="cx-det" data-cxdet="hier" data-cxancre="hier" ${ouvert('hier', false) ? 'open' : ''}><summary><b>Hier : ${signe(s.pts)} points</b><span class="cx-sous">${prev.actions.length} ordre${pl(prev.actions.length)} · ${inc} incident${pl(inc)} · ${sz.length} saisie${pl(sz.length)} · l’adjoint seul aurait fait ${signe(adj.pts)}</span></summary>${sz.length ? `<p class="cx-info">${sz.map((a) => objet(a.saisie)).join(' · ')}</p>` : ''}</details>`;
}

/** Une action du joueur, horodatée à la minute du central. */
function agir(x) {
  const c = contexte();
  const act = { ...x, t: c.m };
  c.mem.actions = [...(c.mem.actions || []), act];
  sauver(c.mem);
  // Copie horodatée par le serveur : c'est elle qui compte au calcul de 20 h (en démo, le document joueur suffit).
  if (S.backend && S.backend.saveCentralAction) S.backend.saveCentralAction(S.user.uid, c.st.season, c.st.turn, act).catch((e) => console.warn('Action du central non notée :', e.message));
  retour(x);
}
/** Ce que l'action a donné : message éphémère et halo sur le marqueur concerné. */
function retour(x) {
  let txt = '', id = null;
  try {
    const c = contexte(), s = simuler(c.jour, c.equipes, c.mem.actions, c.m, c);
    const e = x.e && s.equipes.find((q) => q.id === x.e), a = x.a && s.appels.find((q) => q.id === x.a);
    if (x.k === 'envoi' && e && a) { txt = a.eq === e.id ? `${e.nom} envoyée · sur place à ${horloge(a.arr)} · prévu : ${STATUTS_C[prevoir(e, a, c.m, c).statut]}` : `${e.nom} n’a pas pu partir`; id = `a:${a.id}`; }
    else if (x.k === 'fouille' && a) { const q = s.equipes.find((w) => w.id === a.eq); txt = a.fouille ? `Fouille lancée · ${q ? `${q.nom} indisponible jusqu’à ${horloge(q.etat === 'surplace' ? q.jusqua : finFouille(q, a))}` : ''}` : 'Fouille impossible maintenant'; id = `a:${a.id}`; }
    else if (x.k === 'poste' && e) { txt = e.etat === 'poste' ? `${e.nom} en poste à ${nomQ(c, e.ou)}` : `${e.nom} n’a pas pu être mise en poste`; id = `e:${e.id}`; }
    else if (x.k === 'pause' && e) { txt = e.etat === 'pause' ? `${e.nom} en pause jusqu’à ${horloge(e.jusqua)}` : `${e.nom} n’a pas pu partir en pause`; id = `e:${e.id}`; }
    else if (x.k === 'rens' && a) { txt = a.rens ? `Requérant rappelé : gravité ${a.gReel}` : 'Rappel impossible'; id = `a:${a.id}`; }
    else if (x.k === 'consigne') { const k = s.consignes; txt = `Consigne notée · fouille ${k.fouille === 'reussi' ? 'si réussi' : 'non'} · réserve ${k.reserve || 'aucune'} · pause après ${k.pause}`; }
  } catch (err) { console.warn(err); }
  if (txt) S.cxMsg = { txt, fin: Date.now() + 4000 };
  if (id) S.cxHalo = { id, fin: Date.now() + 2600 };
}

// ───── Rafraîchissement, ancrage de lecture, horloge à la seconde ─────
/** Repère de lecture : la section visible la plus haute et sa position à l'écran. */
function noterAncre() {
  const els = [...document.querySelectorAll('main.carte-v3 [data-cxancre]')];
  let best = null;
  for (const el of els) { const r = el.getBoundingClientRect(); if (r.bottom > 60) { best = { id: el.dataset.cxancre, top: r.top }; break; } }
  S.cxAncre = best;
}
function restaurerAncre() {
  const a = S.cxAncre; S.cxAncre = null;
  if (!a) return;
  const el = document.querySelector(`main.carte-v3 [data-cxancre="${a.id}"]`);
  if (el) { const d = el.getBoundingClientRect().top - a.top; if (Math.abs(d) > 1) window.scrollBy(0, d); }
}
let rendu = null, minuterie = null, dernier = 0, minuteRendue = -1;
function redessiner() { noterAncre(); rendu(); }
/** L'horloge et les décomptes avancent chaque seconde ; l'écran est recalculé toutes les 20 s et à chaque minute. */
function tic() {
  const tete = document.querySelector('main.carte-v3 .cx-tete');
  if (!tete || !S.state) { clearInterval(minuterie); minuterie = null; return; }
  const st = S.state, ms = maintenant() - debutJour(st), m = Math.max(0, Math.min(CENTRAL.jour - 1, Math.floor(ms / 60000)));
  const h = tete.querySelector('[data-cxh]'), sc = tete.querySelector('[data-cxs]');
  if (h) h.textContent = horloge(m);
  if (sc) sc.textContent = `:${String(Math.max(0, Math.floor((ms % 60000) / 1000))).padStart(2, '0')}`;
  for (const d of document.querySelectorAll('main.carte-v3 [data-cxfin]')) d.textContent = fmtReste((Number(d.dataset.cxfin) * 60000 - ms) / 1000);
  const occupe = document.querySelector('.feuille, .aide-wrap, .mj-wrap');
  if (!occupe && (Date.now() - dernier >= 20000 || (minuteRendue >= 0 && m !== minuteRendue))) redessiner();
}

/** Branche les touchers du central (après chaque affichage), l'horloge et le rafraîchissement. */
export function monterCentral(rerender) {
  const tete = document.querySelector('main.carte-v3 .cx-tete');
  const main = tete && tete.closest('main');
  if (!main) { clearInterval(minuterie); minuterie = null; return; }
  rendu = rerender; dernier = Date.now();
  try { minuteRendue = minute(S.state); } catch (e) { minuteRendue = -1; }
  restaurerAncre();
  // Feuille du bas : la page peut défiler sous elle, et l'élément touché reste visible au-dessus.
  const f = document.getElementById('cx-feuille'), esp = main.querySelector('.cx-espace');
  if (f && esp) esp.style.height = `${f.offsetHeight + 12}px`;
  if (f && S.cxVoir) {
    const cible = main.querySelector(S.cxVoir);
    if (cible) { const r = cible.getBoundingClientRect(), haut = f.getBoundingClientRect().top; if (r.bottom > haut - 12 || r.top < 70) window.scrollBy(0, r.top + r.height / 2 - Math.max(140, haut * 0.45)); }
  }
  S.cxVoir = null;
  const msg = document.getElementById('cx-msg');
  if (msg) { msg.classList.toggle('haut', !!f); if (S.cxMsg) setTimeout(() => { if (S.cxMsg && S.cxMsg.fin <= Date.now()) { S.cxMsg = null; const el = document.getElementById('cx-msg'); if (el) el.innerHTML = ''; } }, Math.max(0, S.cxMsg.fin - Date.now()) + 50); }
  if (!minuterie) minuterie = setInterval(tic, 1000);
  if (main.dataset.cxMonte) return;
  main.dataset.cxMonte = '1';
  main.addEventListener('toggle', (e) => { const d = e.target; if (d && d.dataset && d.dataset.cxdet) (S.cxOuverts ||= {})[d.dataset.cxdet] = d.open; }, true);
  main.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (S.cxSel || S.cxEq || S.cxGroupe != null || S.cxPoste)) { S.cxSel = null; S.cxEq = null; S.cxGroupe = null; S.cxPoste = null; redessiner(); return; }
    const t = e.target.closest && e.target.closest('g[role="button"]');
    if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); t.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
  main.addEventListener('click', (e) => {
    const t = e.target.closest('[data-cxposteq],[data-cxfouille],[data-cx],[data-cxe],[data-cxg],[data-cxq],[data-cxenv],[data-cxrens],[data-cxposte],[data-cxpause],[data-cxfermer],[data-cxtemps],[data-cxcons],[data-cxouvrir],[data-cxtout],[data-action="quartier"]');
    if (!t || t.disabled) return;
    const d = t.dataset;
    // En train de poser une équipe : le quartier touché la reçoit.
    if (S.cxPoste && (d.action === 'quartier' || d.cxq || d.cxg)) { e.preventDefault(); e.stopPropagation(); const eq = S.cxPoste; agir({ k: 'poste', e: eq, q: Number(d.c ?? d.cxq ?? d.cxg) }); S.cxPoste = null; S.cxEq = null; redessiner(); return; }
    if (d.action === 'quartier') { S.cxSel = null; S.cxEq = null; S.cxGroupe = null; return; } // la fiche du quartier (patrouilles du soir)
    e.preventDefault(); e.stopPropagation();
    const fermer = () => { S.cxSel = null; S.cxEq = null; S.cxGroupe = null; S.cxPoste = null; };
    if (d.cx) { const on = S.cxSel !== d.cx; fermer(); if (on) { S.cxSel = d.cx; S.cxVoir = `[data-cx="${d.cx}"][role]`; } }
    else if (d.cxe) { const on = S.cxEq !== d.cxe; fermer(); if (on) { S.cxEq = d.cxe; S.cxVoir = `[data-cxe="${d.cxe}"][role]`; } }
    else if (d.cxg) { const on = S.cxGroupe !== d.cxg; fermer(); if (on) { S.cxGroupe = d.cxg; S.cxVoir = `[data-cxg="${d.cxg}"]`; } }
    else if (d.cxq) { S.quartierSel = d.cxq; fermer(); }
    else if (d.cxenv) { agir({ k: 'envoi', a: S.cxSel, e: d.cxenv }); }
    else if (d.cxrens) agir({ k: 'rens', a: d.cxrens });
    else if (d.cxfouille) agir({ k: 'fouille', a: d.cxfouille });
    else if (d.cxposteq) { const [eq, q] = d.cxposteq.split(':'); agir({ k: 'poste', e: eq, q: Number(q) }); }
    else if (d.cxposte) S.cxPoste = S.cxPoste === d.cxposte ? null : d.cxposte;
    else if (d.cxpause) { agir({ k: 'pause', e: d.cxpause }); S.cxEq = null; }
    else if (d.cxcons) {
      const [cle, v] = d.cxcons.split(':'), c = contexte(), cur = simuler(c.jour, c.equipes, c.mem.actions, c.m, c).consignes;
      const val = cle === 'pause' ? Number(v) : cle === 'reserve' ? (v || null) : v;
      if (cur[cle] !== val) agir({ k: 'consigne', c: { ...cur, [cle]: val } });
    }
    else if (d.cxouvrir) { (S.cxOuverts ||= {})[d.cxouvrir] = true; rendu(); const el = document.getElementById(`cx-${d.cxouvrir}`); if (el) el.scrollIntoView({ block: 'start', behavior: calme() ? 'auto' : 'smooth' }); return; }
    else if (d.cxtout) S.cxTout = !S.cxTout;
    else if (d.cxfermer) fermer();
    else if (d.cxtemps) S.cxDecalage = (S.cxDecalage || 0) + Number(d.cxtemps);
    redessiner();
  }, true);
}

/** Pastille de l'onglet Carte : appels sans équipe et fouilles possibles. */
export function aFaireCentral() {
  try {
    const c = contexte(), s = simuler(c.jour, c.equipes, c.mem.actions, c.m, c);
    return s.appels.filter((a) => !a.statut && !a.eq && a.t <= c.m).length + s.appels.filter((a) => aFouiller(s, a)).length;
  } catch (e) { return 0; }
}

const STYLE = `<style>
.cx-sous{font-size:12px;color:var(--muted);font-weight:500}
.cx-tete{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:8px 10px;border-radius:14px;background:var(--surface);border:1px solid var(--line)}
.cx-h1{display:flex;flex-direction:column;min-width:0}.cx-heure{font-variant-numeric:tabular-nums;white-space:nowrap}.cx-heure b{font:800 20px var(--display)}.cx-heure small{font-size:13px;color:var(--muted);font-weight:600}
.cx-score{display:flex;flex-direction:column;align-items:center;text-align:center;min-width:0}.cx-score b{font:800 18px var(--display);font-variant-numeric:tabular-nums}.cx-score b.v{color:var(--green)}.cx-score b.r{color:var(--red)}
.cx-outils{display:flex;gap:6px}.cx-ico-b{appearance:none;width:44px;height:44px;border-radius:12px;border:1px solid var(--line);background:var(--surface2);color:var(--amber-hi);font:700 18px var(--body);cursor:pointer}
.cx-demo{display:flex;gap:6px;align-items:center;justify-content:flex-end;margin-top:-6px}.cx-demo button{appearance:none;border:1px dashed var(--amber-line);background:var(--surface2);color:var(--amber);border-radius:10px;padding:8px 12px;min-height:36px;font:700 13px var(--body);cursor:pointer}
.cx-carte{margin-top:-4px}.cx-carte svg{max-height:52vh}
.cx-mt{font:800 10px var(--body,sans-serif);fill:#FFF8EC;pointer-events:none}
[data-cx][role],[data-cxe][role],[data-cxg]{outline:none}[data-cx][role]:focus-visible .cx-m,[data-cxe][role]:focus-visible .cx-m,[data-cxg]:focus-visible .cx-m{filter:drop-shadow(0 0 3px #FFB23F)}
.cx-pulse{animation:cxp 1.4s ease-in-out infinite}@keyframes cxp{50%{opacity:.15}}
.cx-halo{fill:none;stroke:#FFC970;stroke-width:3;animation:cxHalo 1.3s ease-out 2 both;transform-box:fill-box;transform-origin:center}@keyframes cxHalo{from{opacity:1;transform:scale(.6)}to{opacity:0;transform:scale(1.5)}}
.cx-new{animation:cxNew .7s cubic-bezier(.2,.9,.3,1.4) both;transform-box:fill-box;transform-origin:center}@keyframes cxNew{from{transform:scale(.2);opacity:0}to{transform:scale(1);opacity:1}}
@media (prefers-reduced-motion: reduce){.cx-pulse,.cx-new{animation:none}.cx-halo{animation:none;opacity:1}}
.cx-leg{margin-top:-8px}.cx-leg summary{cursor:pointer;font-size:13px;color:var(--blue-soft);padding:8px 2px;min-height:28px}
.cx-leg-l{display:grid;grid-template-columns:1fr;gap:4px;padding:2px 0 4px}.cx-leg-l > span{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text2)}.cx-leg-l svg{flex:none}
.cx-leg-t{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#F0A43A;color:#1C1100;font:800 12px var(--body)}
.cx-h{margin:0 0 6px;font:700 12px var(--body);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.cx-todos{display:flex;flex-direction:column;gap:6px}
.cx-todo{appearance:none;width:100%;text-align:left;display:flex;align-items:center;gap:10px;padding:8px 10px;min-height:52px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--text);font:inherit;cursor:pointer;box-sizing:border-box}
div.cx-todo{cursor:default}.cx-txt{display:flex;flex-direction:column;min-width:0;flex:1}.cx-txt b{font-size:14px;color:var(--text)}
.cx-sym{flex:none;width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font:800 14px var(--body);background:var(--surface2);color:var(--text2)}
.cx-sym.r{background:var(--red-bg);color:var(--red);border:1px solid var(--red-line)}.cx-sym.a{background:var(--amber-bg);color:var(--amber);border:1px solid var(--amber-line)}.cx-sym.b{background:var(--blue-bg);color:var(--blue-soft)}.cx-sym.v{background:rgba(61,211,154,.1);color:var(--green)}
.cx-chev{flex:none;color:var(--muted);font-size:20px}
.cx-go{appearance:none;flex:none;border:1px solid var(--line);border-radius:10px;background:var(--surface2);color:var(--text);font:700 13px var(--body);padding:10px 12px;min-height:44px;cursor:pointer}
.cx-lien{appearance:none;align-self:flex-start;border:0;background:none;color:var(--blue-soft);font:600 13px var(--body);padding:10px 2px;min-height:44px;cursor:pointer;text-align:left}
.cx-dc{font-variant-numeric:tabular-nums;font-weight:700;color:var(--text2)}
.cx-info{margin:0;font-size:13px;color:var(--text2)}.cx-info.r{color:var(--red-soft)}.cx-info.v{color:var(--green)}.cx-info.b{color:var(--blue-soft)}
.cx-feuille{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(98px + env(safe-area-inset-bottom));z-index:12;width:calc(100% - 16px);max-width:464px;box-sizing:border-box;max-height:min(50vh,440px);display:flex;flex-direction:column;border-radius:18px;background:var(--surface);border:1px solid var(--amber-line);box-shadow:0 -12px 40px -8px rgba(0,0,0,.75);animation:cxMonte .22s ease-out both}
.cx-feuille-in{overflow-y:auto;overscroll-behavior:contain;padding:12px 12px 12px;display:flex;flex-direction:column;gap:8px}
.cx-fermer{appearance:none;position:absolute;top:4px;right:4px;width:44px;height:44px;border:0;border-radius:12px;background:none;color:var(--muted);font:700 16px var(--body);cursor:pointer}
@keyframes cxMonte{from{transform:translate(-50%,24px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
@media (prefers-reduced-motion: reduce){.cx-feuille{animation:none}}
.cx-appel{display:flex;gap:10px;align-items:flex-start;padding-right:40px}.cx-appel > span:last-child{display:flex;flex-direction:column;min-width:0}.cx-appel b{font-size:15px}.cx-forme{flex:none;line-height:0;padding-top:2px}
.cx-eqs{display:flex;flex-direction:column;gap:6px}
.cx-eq{appearance:none;display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:8px;align-items:center;min-height:52px;padding:6px 10px 6px 8px;border-radius:12px;border:1px solid var(--line);background:var(--surface2);color:var(--text);font:inherit;text-align:left;cursor:pointer}
.cx-eq.meilleur{border-color:var(--amber-line)}
.cx-eq:disabled{cursor:default;background:transparent;border-style:dashed}.cx-eq:disabled .cx-lb b{color:var(--muted)}.cx-eq:disabled .cx-av{opacity:.5}
.cx-av{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font:800 12px var(--body);flex:none}.cx-av.neutre{background:var(--surface3);color:var(--amber-hi);font-size:16px}
.cx-indispo{display:flex;flex-direction:column;gap:2px;padding:6px 2px 0;border-top:1px dashed var(--line)}.cx-indispo > span:not(.cx-sous){font-size:12.5px;color:var(--muted)}.cx-indispo b{color:var(--text2)}.cx-av.vide{background:none;width:30px;height:30px}
.cx-lb{min-width:0}.cx-lb b{display:block;font-size:14px}.cx-lb span{display:block;font-size:12px;color:var(--muted)}
.cx-res{font:700 12px var(--body);white-space:nowrap}.cx-res i{font-style:normal}.cx-res.v{color:var(--green)}.cx-res.a{color:var(--amber)}.cx-res.r{color:var(--red)}
.cx-bande{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin:0 -16px;padding-left:16px;padding-right:16px;scrollbar-width:none}
.cx-chip{appearance:none;flex:none;display:flex;align-items:center;gap:6px;min-height:48px;padding:5px 10px 5px 6px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--text);font:inherit;text-align:left;cursor:pointer;position:relative}
.cx-chip.sel{border-color:var(--amber)}.cx-chip > span:last-of-type{display:flex;flex-direction:column}.cx-chip b{font-size:12.5px}.cx-chip span span{font-size:12px;color:var(--muted);white-space:nowrap}
.cx-chip.route b{color:var(--blue-soft)}.cx-chip.surplace b{color:var(--amber-hi)}.cx-chip.pause b{color:var(--muted)}.cx-chip i{position:absolute;top:3px;right:5px;color:#FF9A3C;font-style:normal;font-size:12px}
.cx-det{border-radius:14px;background:var(--surface);border:1px solid var(--line);padding:10px 12px}.cx-det summary{cursor:pointer;display:flex;flex-direction:column;min-height:40px;justify-content:center}.cx-det summary b{font-size:15px}
.cx-det[open] > summary{margin-bottom:8px}
.cx-cons{display:flex;flex-direction:column;gap:6px;padding:10px 0;border-top:1px solid var(--hair)}.cx-cons > span{display:flex;flex-direction:column}.cx-cons b{font-size:14px}
.cx-seg{display:flex;flex-wrap:wrap;gap:4px}.cx-seg button{appearance:none;flex:1 0 auto;min-width:44px;min-height:40px;padding:6px 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface2);color:var(--text2);font:700 13px var(--body);cursor:pointer}
.cx-seg button[aria-pressed="true"]{background:var(--amber-bg);border-color:var(--amber);color:var(--amber-hi)}
.cx-journal{display:flex;flex-direction:column;gap:6px}.cx-jl{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:8px;align-items:center;font-size:13px}
.cx-regles p{font-size:13px;color:var(--text2);margin:0 0 8px}
.cx-det .cx-h{margin:14px 0 6px}
.cx-album{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px}
.cx-obj{display:flex;flex-direction:column;align-items:center;text-align:center;gap:1px;padding:7px 4px;border-radius:11px;background:var(--surface2);border:1px solid var(--line);min-width:0}
.cx-obj.rare{border-color:var(--amber);background:linear-gradient(#2A2238,var(--surface2))}
.cx-obj b{font-size:12px;line-height:1.2}.cx-obj span:last-child{font-size:12px;color:var(--muted)}.cx-ico{font-size:22px;line-height:1.2}
.cx-jauge{position:relative;display:flex;height:10px;border-radius:99px;background:var(--surface2);border:1px solid var(--line);overflow:hidden;margin-bottom:6px}.cx-jauge i{display:block;height:100%;background:var(--green)}.cx-jauge i.auj{background:repeating-linear-gradient(45deg,var(--green) 0 4px,#1E6B4E 4px 8px)}
.cx-trs{display:flex;flex-direction:column;gap:8px}.cx-tr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;align-items:center}.cx-tr > span:first-child{display:flex;flex-direction:column}.cx-tr b{font-size:13.5px}.cx-tr-v{font:700 13px var(--body);font-variant-numeric:tabular-nums;color:var(--text2)}
.cx-tr.ok b,.cx-tr.ok .cx-tr-v{color:var(--green)}.cx-barre{grid-column:1/-1;height:6px;border-radius:99px;background:var(--surface2);overflow:hidden}.cx-barre i{display:block;height:100%;background:var(--amber)}.cx-tr.ok .cx-barre i{background:var(--green)}
.cx-types{display:flex;flex-direction:column;gap:3px}.cx-typ{display:grid;grid-template-columns:16px minmax(0,1fr) auto;gap:6px;font-size:13px;color:var(--muted)}.cx-typ.ok{color:var(--text)}.cx-typ.ok span:first-child{color:var(--green)}
.cx-class{display:flex;flex-direction:column;gap:3px;margin-top:6px}.cx-cl{display:grid;grid-template-columns:18px minmax(0,1fr) auto auto;gap:8px;align-items:center;font-size:13px;padding:4px 6px;border-radius:8px}.cx-cl.moi{background:var(--amber-bg)}
.cx-msg{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(92px + env(safe-area-inset-bottom));z-index:13;width:calc(100% - 32px);max-width:440px;display:flex;justify-content:center;pointer-events:none}
.cx-msg.haut{bottom:auto;top:calc(12px + env(safe-area-inset-top))}
.cx-msg span{background:var(--text);color:var(--bg);padding:10px 16px;border-radius:14px;font:600 13.5px var(--body);box-shadow:var(--float);text-align:center;animation:cxMsg .25s ease-out both}
@keyframes cxMsg{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.cx-msg span{animation:none}}
</style>`;
