// Tableau d'enquête : un grand liège où le joueur punaise lui-même les pièces de l'affaire.
// Le plan du district au centre, les fiches de constatation en haut, les photos des suspects,
// une boîte d'où l'on sort les pièces une à une, et des ficelles que l'on tire soi-même.
// Rien n'est rangé d'avance : la disposition, les ficelles et la vue sont gardées sur l'appareil.
import { zoneAvecAgenda } from './chef.js';
import { S, esc, icon, tabbar, myZone, zoneName } from './common.js';
import { hashString } from '../engine/rng.js';
import { portraitSuspect } from './portrait.js';
import { debriefsRecents } from './debrief.js';
import { recitAffaire } from '../engine/recit.js';
import { photoScene, photoUne, photoButin } from './scene-crime.js';
import {
  ENQ, ELEMENTS, ELEMENT_NOM, DEMARCHES, SOURCES, CARTE, trajet, hm, affaire, dossierDe, texteFait, titrePiece,
  ficheSuspect, fichePlanque, rebondsPublies, dejaPartagee, pointsDecouverte, dansMaCellule, zonesDuSuspect, celluleDe,
} from '../engine/enquete.js';
import { lireCarnet, ecrireCarnet, sauvegardeCarnet, demBtn, partageCtl, sourceDe, voisinageInfo, appuiHtml, coutTotal, banniereTraque, etatSuspect, accuserHtml, nomsAccuses, regleHtml } from './enquete.js';
import { engagementsDuJour } from './engagements.js';
import { LIEUX as LIEUX3, MODES, itineraire, fmtDist, nomTroncon } from '../engine/carte3.js';
import { dossierAffaire3, numeroPv } from '../engine/dossier.js';
import { planSvg3, posLieu3, PLANQUE_POS3 } from './plan3.js';
import { journalHtml, journalAuto } from './journal.js';
import { tutoActif } from './tutoriel.js';
import { planMons } from './planmons.js';
import { photoIndice, aPhoto } from './indices-photo.js';
import { sceneFouilleHtml, sceneZoomHtml } from './scene-fouille.js';
import { friseSvg, friseVolet } from './frise.js';
import { opposables, pieceReaudition, REAUD } from '../engine/enquete.js';
import { lienItineraire, lieuxMons, MODES_GMAPS } from '../engine/meurtre-mons.js';
import { demarcheDe, mandatOk, maxDemarchesDe } from '../engine/enquete.js';
import { relecturesHtml, recoupBoutons, voletRecoup, voletHypo, voletPouces, mobileHtml, soirPlusHtml } from './enquete-plus.js';

// ───── Dimensions du tableau ─────
// Version 2 : tableau élargi (2 800 de large) ; les dispositions de la version 1 sont décalées de 600 vers la droite.
const BW = 2800, BH_MIN = 2200, DECALAGE_V2 = 600;
let BH = BH_MIN; // le tableau s'allonge vers le bas quand on y range beaucoup de pièces
export const MAP = { x: 960, y: 400, w: 880, h: 900 };
// Planques : placées sur la bonne rive du canal (nord au-dessus, sud en dessous), d'après leur fiche.
const PLANQUE_POS = {
  'Cave du bistrot': [600, 505], 'Entrepôt frigorifique': [780, 110], 'Grenier d’une ferme': [115, 70], 'Parking souterrain': [335, 420],
  'Atelier désaffecté': [630, 205], 'Galerie de l’ancienne mine': [120, 255], 'Chambre sous les toits': [225, 365],
  'Péniche amarrée': [495, 665], 'Box de garage n° 12': [300, 705], 'Lavoir couvert': [450, 785], 'Ancien cinéma': [740, 725],
  'Serre abandonnée': [135, 815], 'Local de chaufferie': [620, 840], 'Cabanon de jardin': [300, 860], 'Laverie fermée': [790, 850],
};
export const planquePos = (p, aff) => (aff && aff.prof ? PLANQUE_POS3[p.nom] : PLANQUE_POS[p.nom]) || (p.rive === 'sud' ? [440, 760] : [440, 470]);
export const COL = { occ: '#2F6FD3', moy: '#C88A12', mob: '#C2302B' };
const PINS = { r: ['#FF9A93', '#D32F2F', '#7A1010'], b: ['#9CC8FF', '#2F6FD3', '#123B7A'], y: ['#FFE59A', '#E8A800', '#7A5600'], g: ['#A8F0C6', '#2E9E62', '#11502E'], w: ['#FFFFFF', '#D8D2C4', '#7D7566'] };
const PIN_EL = { occ: 'b', moy: 'y', mob: 'r' };
const DEF_POS = {
  recit: [600, 230], chrono: [2220, 220], une: [430, 800], scene: [800, 840], plainte: [250, 1480],
  'c:occ': [1080, 190], 'c:moy': [1400, 170], 'c:mob': [1720, 190],
  s0: [760, 1460], s1: [1080, 1450], s2: [1400, 1460], s3: [1720, 1450], s4: [2040, 1460],
};
// Dossier complet : le PV de premières constatations et le journal sont plus longs, on les écarte.
const DEF_POS3 = { recit: [250, 170], une: [665, 170], plainte: [250, 1010], scene: [665, 1090], frise: [2330, 1000] };
let PROF = false; // affaire affichée en dossier complet (mis à jour à chaque affichage du tableau)
let CONNUS = new Set(); // pièces opposables du dossier affiché (relectures sur le tableau)
const TUTO_KEY = 'mazp-tuto-tableau';

// ───── Disposition gardée sur l'appareil (dans le carnet de l'affaire) ─────
export function dispo(n) {
  const c = lireCarnet(n);
  const t = c.tab || {};
  let pos = t.pos || {}, vue = t.vue || null;
  if (c.tab && t.v !== 3) {
    // v1 → v2 : tableau élargi (décalage à droite) ; v2 → v3 : plan agrandi vers le bas (on descend ce qui était dessous).
    pos = Object.fromEntries(Object.entries(pos).map(([k, [x, y]]) => [k, [x + (t.v === 2 ? 0 : DECALAGE_V2), y > 1080 ? y + 220 : y]]));
    vue = null;
  }
  return { v: 3, pos, liens: t.liens || [], places: t.places || [], fiches: t.fiches || [], neuf: t.neuf || [], fixes: t.fixes || [], frise: t.frise || [], vue };
}
function ecrireDispo(n, t) { const c = lireCarnet(n); c.tab = t; ecrireCarnet(n, c); }

const posDe = (t, id) => t.pos[id] || (PROF && DEF_POS3[id]) || DEF_POS[id] || [BW / 2, BH / 2];
const rotDe = (id) => ((hashString(id) % 9) - 4) * 0.8;
// Dossier complet : le plan routier (lieux à d'autres endroits, Haut-Delta au bord est).
export const lieuxDe = (aff) => (aff.ville === 'mons' ? lieuxMons(aff) : aff.prof ? LIEUX3 : CARTE.lieux);
export const lieuPos = (aff, k) => { if (aff.ville === 'mons') { const l = lieuxMons(aff)[k]; return l ? [MAP.x + l.x, MAP.y + l.y] : null; } if (aff.prof) { const q = posLieu3(k); return q ? [MAP.x + q[0], MAP.y + q[1]] : null; } const l = CARTE.lieux[k]; return [MAP.x + l.x, MAP.y + l.y]; };
/** Documents du dossier d'ouverture (dossier complet) : un PV d'audition par suspect, rangés d'abord dans la boîte. */
export function docsOuverture(aff) { return aff.prof ? aff.suspects.map((_, i) => ({ f: `A:${i}`, j: 1, src: 'audition', doc: true })) : []; }
/** Couleur d'un mode de transport (tracé sur le plan). */
/** « à le musée » → « au musée ». */
const aLieu = (l) => (/^le /.test(l) ? `au ${l.slice(3)}` : /^les /.test(l) ? `aux ${l.slice(4)}` : `à ${l}`);
const cap1 = (x) => x.charAt(0).toUpperCase() + x.slice(1);
const COL_MODE = { moteur: '#D9480F', velo: '#1B7F4B', pied: '#5B3FA8' };
export const pieceSuspect = (f) => (/^(occ|moy|mob|A|R[a-z]):\d$/.test(f) ? Number(f.split(':')[1]) : null);

/** Point d'accroche (la punaise) d'un élément du tableau. */
function ancre(aff, t, id) {
  if (id.startsWith('L:')) { const k = id.slice(2); return lieuxDe(aff)[k] ? lieuPos(aff, k) : null; }
  if (id.startsWith('P:')) { const p = aff.planques[Number(id.slice(2))]; if (!p) return null; const [x, y] = planquePos(p, aff); return [MAP.x + x, MAP.y + y]; }
  return posDe(t, id);
}

// ───── Résumés des constatations (titres des fiches) ─────
export function resumeConstat(aff, e) {
  if (e === 'occ') return `Entrée ${hm(aff.heure)} · sortie ${hm(aff.fin)}`;
  if (e === 'moy') return { cle: 'Une vraie clé, sans effraction', code: 'Le bon code d’alarme, du premier coup', volume: 'Un utilitaire : 300 kg en un voyage' }[aff.req.moy];
  return { argent: 'L’argent, et vite', vengeance: 'La rancune envers la victime', commande: 'Une commande pour un receleur' }[aff.req.mob];
}
export const CONSTAT_DEM = { occ: 'cam', moy: 'labo', mob: 'temoin' };
export const CONSTAT_TITRE = { occ: 'L’heure exacte', moy: 'Comment on est entré', mob: 'Pourquoi on a volé' };

// ───── Objets : chaque pièce a son support ─────
export function typePiece(p, aff) {
  if (p.doc) return 'au';
  if (p.src === 'rebond') return 'jn';
  if (aff && aff.prof) return 'pv';
  const k = p.f.split(':')[0];
  return { occ: 'tk', moy: 'sc', mob: 'rv', p: 'lb' }[k] || 'lb';
}
const LARG = { tk: 150, sc: 150, rv: 160, lb: 150, jn: 170, pv: 168, au: 196 };
const ENTETE = { tk: 'Vérification d’alibi', sc: 'Scellé · moyens', rv: 'Comptes et entourage', lb: 'Rapport · planque', jn: 'La Gazette du Delta' };
// Petits PV (dossier complet) : objet et couleur selon ce qu'ils vérifient.
const PV_OBJET = { occ: 'Vérification d’alibi', moy: 'Vérification des moyens', mob: 'Comptes, téléphonie, entourage', p: 'Rapport du labo · planque', c: 'Constatations' };
const PV_COL = { occ: '#2F6FD3', moy: '#C88A12', mob: '#C2302B', p: '#6B4FB8', c: '#3E6B4F' };
/** Meurtre : la dernière pièce connue d'une série de la scène (fiche « Heure de la mort », etc.). */
export function derniereScene(aff, connus, e) {
  const seq = aff.sceneSeq[aff.fiches[e].dem];
  return seq.filter((f) => connus.has(f)).pop() || null;
}
/** Numéro de PV d'une pièce (stable). */
export const numPv = (aff, f) => numeroPv(S.state.seed, aff.n, f);
/** Qui a rédigé la pièce : ta zone, la zone qui l'a partagée, le labo… */
export function redacteur(p) {
  const st = S.state, z = myZone();
  if (p.src === 'partage' && p.de && st.zones[p.de]) return zoneName(st.zones[p.de]);
  if (p.src === 'pjf') return 'Appui PJF';
  if (p.src === 'gav') return 'Garde à vue';
  if (p.src === 'drone') return 'Survol du drone';
  if (p.src === 'rattrapage') return 'Dossier de rattrapage';
  return z ? zoneName(z) : 'ta zone';
}

/** Où en est le partage d'une pièce : reçue, connue de tous, prévue ce soir, déjà partagée ou gardée pour soi. */
export function statutPartage(p) {
  const st = S.state, d = S.draft || {};
  const nom = (u) => (st.zones[u] ? zoneName(st.zones[u]) : 'une zone');
  if (p.src === 'partage') return { k: 'recue', txt: `Reçue de ${p.de ? nom(p.de) : 'une zone'}` };
  if (p.src === 'ouverture' || p.src === 'rebond' || p.doc) return { k: 'tous', txt: 'Connue de toutes les zones' };
  const prevu = (d.partages || []).filter((x) => x.f === p.f);
  if (prevu.length) return { k: 'prevu', txt: `Partage ce soir : ${prevu.map((x) => (x.a === '*' ? 'toutes les zones' : nom(x.a))).join(', ')}` };
  const deja = [...dejaPartagee(st, S.user.uid, p.f)].filter((u) => st.zones[u]);
  if (deja.length) return { k: 'faite', txt: `Partagée avec ${deja.map(nom).join(', ')}` };
  return { k: 'gardee', txt: 'Gardée pour toi' };
}

/** Main courante de l'affaire : ce qui s'est passé, jour après jour. */
export function chronologie(aff, dos) {
  const rebonds = rebondsPublies(S.state);
  const lignes = [{ j: 1, t: `Ouverture du dossier : ${aff.titre}`, k: 'ouv' }];
  for (const r of rebonds) lignes.push({ j: r.j, t: r.titre, k: 'rebond' });
  for (const p of dos.pieces) {
    if (p.src === 'ouverture' || p.src === 'rebond') continue;
    const qui = p.src === 'partage' && p.de && S.state.zones[p.de] ? ` (de ${zoneName(S.state.zones[p.de])})` : '';
    lignes.push({ j: p.j, t: `${SOURCES[p.src] || p.src}${qui} : ${titrePiece(aff, p.f)}`, k: p.f.startsWith('c:') ? 'constat' : 'piece' });
  }
  if (dos.accuse !== null && dos.accuse !== undefined) lignes.push({ j: S.state.enquete.jour, t: `Accusation transmise : ${aff.suspects[dos.accuse].nom}`, k: 'acc' });
  return lignes.sort((a, b) => a.j - b.j);
}

/** Les questions-réponses d'une audition, en petit (au tableau) ou en grand (volet). */
export function auditionHtml(aff, i, grand = false) {
  const a = dossierAffaire3(S.state.seed, aff).auditions[i];
  if (!a) return '';
  if (grand) return `<p class="tiny muted" style="margin:0">PV n° ${esc(a.numero)} · entendu${aff.suspects[i].f ? 'e' : ''} le ${esc(a.heure.toLowerCase())}</p>${a.qr.map(([q, r]) => `<div class="pv-qr"><p class="pv-q">Q : ${esc(q)}</p><p class="pv-r">R : ${esc(r)}</p></div>`).join('')}<p class="tiny muted" style="margin:0">Lecture faite, persiste et signe.</p>`;
  return `<span class="tb-pv-bande">POLICE · DISTRICT DELTA</span><span class="tb-k">PV n° ${esc(a.numero)} · audition</span><strong class="tb-pv-qui">${esc(a.qui)}</strong><span class="tb-k">${esc(a.role)} · ${esc(a.heure)}</span>
    <div class="tb-txt tb-qr">${a.qr.map(([q, r]) => `<p><b>Q</b> ${esc(q)}</p><p><b>R</b> ${esc(r)}</p>`).join('')}</div><span class="tb-k" style="text-align:right">Lecture faite, persiste et signe.</span><span class="tb-signature">${esc(aff.suspects[i].nom)}</span>`;
}

function objetPiece(aff, p, rebonds) {
  const ty = typePiece(p, aff);
  if (ty === 'au') return `<div class="tb-obj tb-pvd">${auditionHtml(aff, pieceSuspect(p.f))}</div>`;
  const i = pieceSuspect(p.f);
  const qui = i !== null ? aff.suspects[i].nom.toUpperCase() : '';
  const lignes = texteFait(aff, p.f).split('\n').map((l) => `<p>${esc(l)}</p>`).join('');
  const sp = statutPartage(p);
  // Petit bouton de partage dans le coin : sa couleur dit où en est la pièce, un toucher ouvre les options.
  const tampon = sp.k === 'tous' ? '' : `<span class="tb-share tb-t-${sp.k}" title="${esc(sp.txt)}" aria-label="Partage : ${esc(sp.txt)}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>${sp.k === 'prevu' ? '<i>ce soir</i>' : ''}</span>`;
  if (ty === 'jn') {
    const r = rebonds.find((x) => x.f === p.f);
    const si = pieceSuspect(p.f);
    const photo = aPhoto(aff, p.f) ? photoIndice(aff, p.f, `j${aff.n}`) : p.f.startsWith('p:') ? photoButin(`bt${aff.n}`) : si !== null ? portraitSuspect(aff.suspects[si], si, 'tb-face tb-gris') : '';
    return `<div class="tb-obj tb-jn"><span class="tb-k">${ENTETE.jn} · J${p.j}</span><strong>${esc(r ? r.titre : titrePiece(aff, p.f))}</strong>${photo ? `<div class="tb-photo">${photo}</div>` : ''}${r && r.texte ? `<p class="tb-chapo">${esc(r.texte)}</p>` : ''}<div class="tb-txt">${lignes}</div></div>`;
  }
  if (ty === 'pv') {
    const k = p.f.split(':')[0];
    const objet = aff.meurtre && k === 'moy' ? 'Perquisition' : aff.meurtre && /^R[a-z]$/.test(k) ? 'Nouvelle audition' : aff.meurtre && (k === 'c' || k === 'r' || k === 'x' || k === 'd') ? esc(titrePiece(aff, p.f)) : PV_OBJET[k] || 'Pièce';
    const ph = aPhoto(aff, p.f) ? `<div class="tb-pv-photo">${photoIndice(aff, p.f, `b${aff.n}`)}</div>` : '';
    return `<div class="tb-obj tb-pvp" style="--c:${PV_COL[k] || (/^R/.test(k) ? '#9A2B1F' : k === 'x' ? '#1F6E8C' : k === 'd' ? '#5E574A' : '#6B4FB8')}"><span class="tb-pv-bande">PV n° ${numPv(aff, p.f)}</span><span class="tb-k">Objet : ${objet}${qui ? ` · ${esc(qui)}` : ''}</span>${ph}<div class="tb-txt">${lignes}</div>${relecturesHtml(aff, p.f, CONNUS, { petit: true })}<span class="tb-pv-sign">${esc(redacteur(p))} · J${p.j}</span>${tampon}</div>`;
  }
  if (ty === 'sc') return `<div class="tb-obj tb-sc"><span class="tb-bande"></span><span class="tb-k">${ENTETE.sc}${qui ? ` · ${esc(qui)}` : ''}</span><div class="tb-txt">${lignes}</div>${tampon}</div>`;
  return `<div class="tb-obj tb-${ty}"><span class="tb-k">${ENTETE[ty]}${qui ? ` · ${esc(qui)}` : ''} · J${p.j}</span><div class="tb-txt">${lignes}</div>${tampon}</div>`;
}

function pinHtml(c) {
  const [hi, mi, lo] = PINS[c];
  return `<span class="tb-pin" style="background:radial-gradient(circle at 35% 30%,${hi},${mi} 45%,${lo})"></span>`;
}

// ───── Plan du district ─────
export function planSvg(aff, connusOcc) {
  if (aff.ville === 'mons') return planMons(aff, { heures: connusOcc });
  if (aff.prof) return planSvg3(aff, { route: S.tabRoute && S.tabRoute.n === aff.n ? S.tabRoute : null, heures: connusOcc });
  const [fx, fy] = [CARTE.lieux[aff.pos].x, CARTE.lieux[aff.pos].y];
  const declares = [...new Set(aff.suspects.filter((s) => s.alibi.type !== 'seul').map((s) => s.alibi.pos))];
  const traits = aff.carte ? declares.map((k) => {
    const l = CARTE.lieux[k];
    const tx = l.loin ? 870 : l.x, ty = l.loin ? 670 : l.y;
    const mx = (fx + tx) / 2 + (ty - fy) * 0.12, my = (fy + ty) / 2 - (tx - fx) * 0.12;
    const t = trajet(aff.pos, k);
    return `<path d="M${fx} ${fy} Q${mx} ${my} ${tx} ${ty}" class="tb-trajet"/>
      <g transform="translate(${(fx + 2 * mx + tx) / 4} ${(fy + 2 * my + ty) / 4}) rotate(${((hashString(k) % 7) - 3) * 2})"><rect x="-30" y="-15" width="60" height="28" rx="4" class="tb-min-bg"/><text x="0" y="6" text-anchor="middle" class="tb-min">${t} min</text></g>`;
  }).join('') : '';
  return `<svg class="tb-plan" viewBox="0 0 880 900" width="880" height="900" aria-hidden="true">
    <defs>
      <pattern id="tbgrille" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="rgba(120,100,60,.10)"/></pattern>
      <linearGradient id="tbpapier" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EFE7D0"/><stop offset="1" stop-color="#E2D7B8"/></linearGradient>
      <radialGradient id="tbtache"><stop offset=".78" stop-color="rgba(120,80,30,0)"/><stop offset=".9" stop-color="rgba(120,80,30,.26)"/><stop offset="1" stop-color="rgba(120,80,30,0)"/></radialGradient>
    </defs>
    <rect width="880" height="900" fill="url(#tbpapier)"/><rect width="880" height="900" fill="url(#tbgrille)"/>
    <path d="M0 230h880M0 455h880M0 760h880M440 0v900" stroke="rgba(90,70,40,.16)" stroke-width="1.5"/>
    <g fill="#D9CCAA" stroke="#C4B48C">
      <rect x="20" y="20" width="120" height="70"/><rect x="290" y="20" width="80" height="70"/><rect x="410" y="20" width="110" height="70"/><rect x="560" y="20" width="90" height="70"/>
      <rect x="20" y="215" width="100" height="70"/><rect x="190" y="215" width="80" height="70"/><rect x="410" y="215" width="110" height="70"/><rect x="560" y="215" width="90" height="70"/><rect x="700" y="215" width="160" height="70"/>
      <rect x="20" y="420" width="120" height="60"/><rect x="190" y="340" width="80" height="140"/><rect x="560" y="340" width="90" height="70"/><rect x="560" y="420" width="90" height="60"/><rect x="740" y="420" width="120" height="40"/>
      <rect x="190" y="645" width="80" height="40"/><rect x="410" y="690" width="110" height="60"/><rect x="560" y="690" width="100" height="60"/><rect x="700" y="760" width="160" height="50"/>
      <rect x="20" y="660" width="120" height="70"/><rect x="190" y="760" width="80" height="60"/><rect x="560" y="790" width="100" height="90"/><rect x="410" y="820" width="110" height="60"/><rect x="20" y="850" width="60" height="40"/>
    </g>
    <rect x="80" y="760" width="110" height="110" rx="6" fill="#C7D6AE"/>
    <g fill="#7FA36A"><circle cx="105" cy="790" r="8"/><circle cx="160" cy="800" r="10"/><circle cx="120" cy="845" r="9"/></g>
    <rect x="290" y="330" width="230" height="150" rx="6" fill="#C7D6AE"/>
    <g fill="#7FA36A"><circle cx="320" cy="370" r="9"/><circle cx="360" cy="430" r="11"/><circle cx="480" cy="360" r="8"/><circle cx="500" cy="450" r="10"/><circle cx="420" cy="460" r="7"/></g>
    <path d="M0 585 C150 555 280 610 440 590 S700 540 880 565 L880 610 C720 590 560 640 440 632 S160 600 0 628 Z" fill="#9EC1D8"/>
    <path d="M0 585 C150 555 280 610 440 590 S700 540 880 565" fill="none" stroke="#7FA6C0" stroke-width="2"/>
    <g stroke="#FFFFFF" stroke-width="20" fill="none"><path d="M0 105h880M0 200h880M0 315h880M0 400h880M0 670h880M0 760h880M170 0v900M280 0v585M280 640v260M400 0v900M540 0v900M680 0v600M680 650v250"/></g>
    <g stroke="#CDBFA0" fill="none"><path d="M0 95h880M0 115h880M0 190h880M0 210h880M0 305h880M0 325h880M0 390h880M0 410h880M0 660h880M0 680h880M0 750h880M0 770h880M160 0v900M180 0v900M390 0v900M410 0v900M530 0v900M550 0v900"/></g>
    <g fill="#8A7A5A"><rect x="160" y="575" width="20" height="70"/><rect x="390" y="575" width="20" height="70"/><rect x="530" y="560" width="20" height="80"/></g>
    <g stroke="#FFFFFF" stroke-width="16"><path d="M170 578v64M400 578v64M540 563v74"/></g>
    <g class="tb-quartiers">
      <text x="30" y="160">HAUTS-PRÉS</text><text x="700" y="160">LES TANNEURS</text><text x="30" y="380">BÉGUINAGE</text><text x="20" y="300">TERRILS</text>
      <text x="300" y="320" class="tb-q2">PARC CENTRAL</text><text x="560" y="535">GRAND-PLACE</text><text x="300" y="470">PL. DES MARTYRS</text><text x="720" y="40">ZONING NORD</text>
      <text x="20" y="560" class="tb-rive">RIVE NORD ↑</text><text x="20" y="655" class="tb-rive">RIVE SUD ↓</text>
      <text x="430" y="660">QUAI DU CANAL</text><text x="200" y="740">QUARTIER GARE</text><text x="420" y="740">LES MOULINS</text><text x="700" y="700">FILATURES</text>
      <text x="85" y="755">CITÉ JARDIN</text><text x="560" y="785">CITÉ NOUVELLE</text><text x="200" y="890">VAL-FLEURI</text><text x="700" y="890">PORTE SUD</text>
    </g>
    <text x="760" y="590" class="tb-canal" transform="rotate(-3 760 590)">canal</text>
    ${traits}
    <circle cx="${fx}" cy="${fy}" r="46" fill="none" stroke="#B3261E" stroke-width="3" stroke-dasharray="250 40" transform="rotate(-10 ${fx} ${fy})"/>
    <text x="${fx}" y="${fy + 13}" text-anchor="middle" class="tb-croix">✕</text>
    <rect x="640" y="760" width="120" height="120" fill="url(#tbtache)"/>
    <g transform="translate(830 120)"><circle r="24" fill="#EFE7D0" stroke="#6B5B3A" stroke-width="1.5"/><path d="M0 -18L5 0L0 18L-5 0Z" fill="#6B5B3A"/><path d="M0 -18L5 0L-5 0Z" fill="#B3261E"/><text x="-4" y="-27" class="tb-n">N</text></g>
    <g transform="translate(24 880)"><path d="M0 0h100M0 -5v10M50 -3v6M100 -5v10" stroke="#3A352C" stroke-width="2"/><text x="0" y="-10" class="tb-n">0</text><text x="76" y="-10" class="tb-n">500 m</text></g>
    <text x="20" y="18" class="tb-n" style="letter-spacing:1px">DISTRICT DELTA — PLAN DU CENTRE</text>
    ${connusOcc ? `<text x="${fx}" y="${fy - 54}" text-anchor="middle" class="tb-heures">${hm(aff.heure)} → ${hm(aff.fin)}</text>` : ''}
  </svg>`;
}

// ───── Le tableau ─────
export function etatTab(aff, dos) {
  const t = dispo(aff.n);
  const pieces = [...dos.pieces.filter((p) => aff.meurtre || !p.f.startsWith('c:')), ...docsOuverture(aff)];
  const connus = new Set(dos.pieces.map((p) => p.f));
  const placees = pieces.filter((p) => t.places.includes(p.f));
  const boite = pieces.filter((p) => !t.places.includes(p.f));
  const fichesAFaire = aff.meurtre ? [] : ELEMENTS.filter((e) => connus.has(`c:${e}`) && !t.fiches.includes(e));
  return { t, pieces, placees, boite, fichesAFaire, connus };
}

function elementsHtml(aff, dos, et) {
  const { t, connus } = et;
  const d = S.draft, carnet = lireCarnet(aff.n), j = S.state.enquete.jour;
  const rebonds = rebondsPublies(S.state);
  const sel = S.tabSheet && S.tabSheet.id;
  const out = [];
  const wrap = (id, w, sc, inner, pin, cls = '') => {
    const [x, y] = posDe(t, id);
    return `<div class="tb-it ${cls} ${t.fixes.includes(id) ? 'tb-fixe' : ''} ${sel === id ? 'tb-sel' : ''} ${S.tabFrom === id ? 'tb-from' : ''}" data-tid="${esc(id)}" style="left:${x - w / 2}px;top:${y + 7}px;width:${w}px;--r:${rotDe(id)}deg;--sc:${sc}">${inner}${pinHtml(pin)}${t.fixes.includes(id) ? '<span class="tb-pin2 g"></span><span class="tb-pin2 d"></span>' : ''}${t.neuf.includes(id) ? '<span class="tb-neuf">NOUVEAU</span>' : ''}</div>`;
  };
  // Fiches de constatation.
  for (const e of ELEMENTS) {
    const faite = t.fiches.includes(e);
    const attente = connus.has(`c:${e}`) && !faite;
    if (aff.meurtre) { const der = derniereScene(aff, connus, e); out.push(wrap(`c:${e}`, 124, 1.7, `<div class="tb-obj tb-fiche" style="--c:${COL[e]}"><span class="tb-k">Scène · ${esc(aff.fiches[e].titre)}</span><span class="tb-main">${der ? esc(aff.resumes[der]) : '???'}</span></div>`, PIN_EL[e])); continue; }
    out.push(wrap(`c:${e}`, 124, 1.7, `<div class="tb-obj tb-fiche" style="--c:${COL[e]}"><span class="tb-k">${ELEMENT_NOM[e]} · ${CONSTAT_TITRE[e]}</span><span class="tb-main">${faite ? esc(resumeConstat(aff, e)) : attente ? 'Résultat dans ta boîte' : '???'}</span></div>`, PIN_EL[e]));
  }
  // Procès-verbal d'ouverture : le récit de l'affaire, toujours au tableau.
  const d3 = aff.prof ? dossierAffaire3(S.state.seed, aff) : null;
  if (d3) out.push(wrap('recit', 220, 1.6, `<div class="tb-obj tb-pv"><span class="tb-pv-bande">POLICE · DISTRICT DELTA</span><span class="tb-k">PV n° ${esc(d3.pvc.numero)} · ${esc(d3.pvc.titre)}</span><strong>${esc(aff.titre)}</strong><div class="tb-txt">${d3.pvc.lignes.map((x) => `<p>${esc(x)}</p>`).join('')}</div><span class="tb-k">Affaire n° ${aff.n} · ${aff.meurtre ? (aff.libVictime || 'victime') : `plaignant${/^la /.test(aff.vic) ? 'e' : ''}`} : ${esc(d3.victime)}</span></div>`, 'w'));
  else out.push(wrap('recit', 210, 1.6, `<div class="tb-obj tb-pv"><span class="tb-pv-bande">POLICE · DISTRICT DELTA</span><span class="tb-k">Procès-verbal d’ouverture · affaire n° ${aff.n}</span><strong>${esc(aff.titre)}</strong><div class="tb-txt"><p>${esc(aff.recit)}</p></div><span class="tb-k">Plaignant${/^la /.test(aff.vic) ? 'e' : ''} : ${esc(aff.vic)} · butin : ${esc(aff.butin)}</span></div>`, 'w'));
  // Affaires ouvertes depuis le plan : la une de la Gazette, la photo de la scène et le dépôt de plainte.
  if (d3) {
    const j = d3.journal;
    out.push(wrap('une', 230, 1.6, `<div class="tb-obj tb-une"><span class="tb-une-titre">La Gazette du Delta</span><span class="tb-une-date">N° ${j.numero} · ${esc(j.date)}</span><span class="tb-k">${esc(j.surtitre)}</span><strong>${esc(j.titre)}</strong><div class="tb-photo">${photoUne(d3.scene, `un${aff.n}`)}</div><span class="tb-legende">${esc(j.legende)}</span><p class="tb-chapo">${esc(j.chapo)}</p><div class="tb-txt">${j.corps.slice(0, 2).map((x) => `<p>${esc(x)}</p>`).join('')}</div><span class="tb-lire">Lire le journal ›</span></div>`, 'w', 'tb-p-jn'));
    out.push(wrap('scene', 130, 1.7, `<div class="tb-obj tb-polo tb-scene"><div class="tb-photo">${photoScene(d3.scene, `sc${aff.n}`)}</div><span class="tb-prenom" style="font-size:13px">Scène · J1</span><span class="tb-role">${aff.meurtre ? 'touche pour fouiller · 10 plots' : 'photo du labo, plots 1 à 3'}</span></div>`, 'r'));
    if (aff.meurtre) out.push(wrap('frise', 300, 1.6, `<div class="tb-obj tb-frise"><span class="tb-k">Chronologie · ${esc((aff.jourSemaine || 'mardi'))} soir · ${t.frise.length} événement${t.frise.length > 1 ? 's' : ''}</span>${friseSvg(aff, t.frise, { mini: true })}<span class="tb-lire">Reconstituer ›</span></div>`, 'y'));
    if (d3.plainte) out.push(wrap('plainte', 190, 1.6, `<div class="tb-obj tb-pv"><span class="tb-pv-bande">POLICE · DISTRICT DELTA</span><span class="tb-k">PV n° ${esc(numPv(aff, 'plainte'))} · ${esc(d3.plainte.titre)}</span><strong class="tb-pv-qui">${esc(d3.plainte.qui)}</strong><div class="tb-txt">${d3.plainte.lignes.map((x) => `<p>${esc(x)}</p>`).join('')}</div><span class="tb-signature">${esc(d3.victime)}</span></div>`, 'w'));
  } else if (aff.carte) {
    const rc = recitAffaire(S.state.seed, aff);
    out.push(wrap('une', 230, 1.6, `<div class="tb-obj tb-une"><span class="tb-une-titre">La Gazette du Delta</span><span class="tb-une-date">Édition du matin · jour 1</span><span class="tb-k">${esc(rc.une.surtitre)}</span><strong>${esc(rc.une.titre)}</strong><div class="tb-photo">${photoUne(rc.scene, `un${aff.n}`)}</div><span class="tb-legende">${esc(rc.une.legende)}</span><p class="tb-chapo">${esc(rc.une.chapo)}</p><div class="tb-txt">${rc.une.corps.map((x) => `<p>${esc(x)}</p>`).join('')}</div></div>`, 'w', 'tb-p-jn'));
    out.push(wrap('scene', 130, 1.7, `<div class="tb-obj tb-polo tb-scene"><div class="tb-photo">${photoScene(rc.scene, `sc${aff.n}`)}</div><span class="tb-prenom" style="font-size:13px">Scène · J1</span><span class="tb-role">photo du labo, plots 1 à 3</span></div>`, 'r'));
    out.push(wrap('plainte', 180, 1.6, `<div class="tb-obj tb-pv"><span class="tb-pv-bande">POLICE · DISTRICT DELTA</span><span class="tb-k">${esc(rc.plainte.titre)} · ${esc(rc.plainte.qui)}</span><div class="tb-txt">${rc.plainte.lignes.map((x) => `<p>${esc(x)}</p>`).join('')}</div><span class="tb-signature">${esc(rc.victime)}</span></div>`, 'w'));
  }
  // Main courante : l'enquête jour après jour.
  const chrono = chronologie(aff, dos);
  out.push(wrap('chrono', 190, 1.6, `<div class="tb-obj tb-chrono"><span class="tb-spirale"></span><span class="tb-k">Main courante · jour ${j} sur ${ENQ.dureeMax}</span>${chrono.slice(-14).map((l) => `<p class="tb-mc tb-mc-${l.k}"><b>J${l.j}</b> ${esc(l.t)}</p>`).join('')}${j < ENQ.dureeMax ? `<p class="tb-mc tb-mc-attente"><b>J${j}</b> … résultats ce soir à 20:00</p>` : ''}</div>`, 'r'));
  // Photos des suspects.
  aff.suspects.forEach((s, i) => {
    const marks = ELEMENTS.map((e) => carnet.g[`${i}:${e}`] || 0);
    const exclu = etatSuspect(carnet, i, aff) === 'exclu';
    const accuse = d.accusation === i || d.accusation2 === i || dos.accuse === i || dos.accuse2 === i;
    const soir = (d.demarches || []).some((x) => x.endsWith(`:${i}`)) || d.piste === i;
    const past = ELEMENTS.map((e, k) => `<span class="tb-past" style="--c:${COL[e]}" data-v="${marks[k]}">${['', '✓', '✕'][marks[k]]}</span>`).join('');
    out.push(wrap(`s${i}`, 90, 1.9, `<div class="tb-obj tb-polo">${portraitSuspect(s, i)}<span class="tb-prenom">${esc(s.prenom)}</span><span class="tb-role">${esc(s.role)} · ${s.age} ans</span><span class="tb-pasts">${past}</span>
      ${exclu ? '<span class="tb-exclu">EXCLU</span>' : ''}${accuse ? '<span class="tb-accuse"></span>' : ''}${soir ? '<span class="tb-cesoir">ce soir</span>' : ''}</div>`, 'r'));
  });
  // Pièces punaisées.
  for (const p of et.placees) {
    const ty = typePiece(p, aff);
    out.push(wrap(p.f, LARG[ty], 1.6, objetPiece(aff, p, rebonds), ty === 'jn' ? 'w' : PIN_EL[p.f.split(':')[0]] || 'g', `tb-p-${ty}`));
  }
  // Lieux déclarés, punaisés sur le plan.
  const declares = aff.ville === 'mons' ? Object.keys(lieuxMons(aff)).filter((k) => !lieuxMons(aff)[k].repere && k !== aff.pos) : [...new Set(aff.suspects.filter((s) => s.alibi.type !== 'seul').map((s) => s.alibi.pos))];
  for (const k of declares) {
    const l = lieuxDe(aff)[k];
    const [x, y] = lieuPos(aff, k);
    const id = `L:${k}`;
    out.push(`<div class="tb-lieu ${aff.prof ? 'p3l' : ''} ${sel === id ? 'tb-sel' : ''} ${S.tabFrom === id ? 'tb-from' : ''} ${l.loin ? 'loin' : ''}" data-tid="${id}" style="left:${x}px;top:${y}px"><span class="tb-lieu-pt"></span><span class="tb-lieu-nom">${esc(l.nom)}</span></div>`);
  }
  // Planques possibles, punaisées sur leur rive, avec la marque du joueur.
  aff.planques.forEach((p, i) => {
    const [px, py] = planquePos(p, aff);
    const id = `P:${i}`, m = carnet.p[i] || 0;
    out.push(`<div class="tb-planque ${aff.prof ? 'p3l' : ''} m${m} ${sel === id ? 'tb-sel' : ''} ${S.tabFrom === id ? 'tb-from' : ''}" data-tid="${id}" style="left:${MAP.x + px}px;top:${MAP.y + py}px"><span class="tb-lieu-pt"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 11l8-6 8 6v8H4z" fill="currentColor"/></svg></span><span class="tb-lieu-nom">${esc(p.nom)}</span><span class="tb-pmark">${['', '✕', '?', '●'][m]}</span></div>`);
  });
  // Ficelles et nœuds.
  const fils = t.liens.map(([a, b]) => filHtml(aff, t, a, b)).join('');
  const ids = [...new Set(t.liens.flat())];
  const noeuds = ids.map((id) => { const p = ancre(aff, t, id); return p ? `<span class="tb-noeud" data-n="${esc(id)}" style="left:${p[0]}px;top:${p[1]}px"></span>` : ''; }).join('');
  return out.join('') + fils + noeuds;
}

function filHtml(aff, t, a, b) {
  const p1 = ancre(aff, t, a), p2 = ancre(aff, t, b);
  if (!p1 || !p2) return '';
  const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
  return `<span class="tb-fil" data-a="${esc(a)}" data-b="${esc(b)}" style="left:${p1[0]}px;top:${p1[1]}px;width:${Math.hypot(dx, dy)}px;transform:rotate(${Math.atan2(dy, dx)}rad)"></span>`;
}

// ───── Volets (en bas de l'écran) ─────
function voletSuspect(aff, dos, i, et) {
  const st = S.state, d = S.draft, s = aff.suspects[i];
  const fiche = ficheSuspect(aff, s);
  const carnet = lireCarnet(aff.n);
  const mien = dansMaCellule(st, S.user.uid, i);
  const multi = st.enquete.nbCellules > 1;
  const lignes = ELEMENTS.map((e) => {
    const f = `${e}:${i}`;
    const v = carnet.g[`${i}:${e}`] || 0;
    const connu = et.connus.has(f);
    const constat = et.connus.has(`c:${e}`);
    const dk = { occ: 'alibi', moy: 'moyens', mob: 'banque' }[e];
    return `<div class="tb-ligne" style="--c:${COL[e]}">
      <div class="col grow" style="gap:5px;min-width:0">
        <span class="tb-ligne-k">${aff.meurtre ? { occ: 'Alibi', moy: 'Perquisition', mob: 'Téléphone et comptes' }[e] : ELEMENT_NOM[e]}</span>
        ${aff.meurtre ? '' : `<span class="tiny muted">Il fallait : <span style="color:var(--text2)">${constat ? esc(resumeConstat(aff, e)) : 'pas encore constaté'}</span></span>`}
        ${connu ? `<p class="small tb-fait">${esc(texteFait(aff, f)).replace(/\n/g, '<br>')}</p>` : '<span class="small" style="color:var(--faint)">Rien au dossier.</span>'}
        ${connu ? '' : demBtn(aff, dos, `${dk}:${i}`, aff.meurtre ? { occ: 'Vérifier son alibi', moy: 'Perquisitionner', mob: 'Téléphone et comptes' }[e] : { occ: 'Vérifier son alibi', moy: 'Vérifier ses moyens', mob: 'Vérifier son mobile' }[e], { compact: true })}
        ${!connu && aff.meurtre && e === 'moy' && !mandatOk(aff, dos, i) ? '<span class="tiny muted">Le juge ne signera le mandat qu’avec une pièce sérieuse contre cette personne au dossier.</span>' : ''}
      </div>
      <button type="button" class="tb-mark" data-v="${v}" data-action="mmo-mark" data-i="${i}" data-e="${e}" aria-label="${ELEMENT_NOM[e]} de ${esc(s.nom)} : ${['pas encore établi', 'établi', 'exclu'][v]}. Changer">${['·', '✓', '✕'][v]}</button>
    </div>`;
  }).join('');
  const surPiste = d.piste === i;
  const accuse = d.accusation === i || d.accusation2 === i;
  let acc = '';
  if (dos.exclu) acc = '<span class="tiny muted">Ton accusation a été rejetée : tu ne peux plus accuser sur cette affaire.</span>';
  else if (dos.accuse !== null && dos.accuse !== undefined) acc = '<span class="tiny muted">Accusation transmise au parquet.</span>';
  else if (aff.meurtre) acc = accuse ? '<button type="button" class="btn ghost small" data-action="accuser-annuler">Annuler la confrontation</button>' : `<button type="button" class="btn outline small" data-action="tab-ouvrir" data-tid="X:${i}" style="border-color:var(--red-line);color:var(--red-soft)">Confronter ${esc(s.prenom)}</button>`;
  else if (accuse) acc = '<button type="button" class="btn ghost small" data-action="accuser-annuler">Retirer l’accusation</button>';
  else acc = accuserHtml(aff, dos, i, { cls: 'btn outline small', style: 'border-color:var(--red-line);color:var(--red-soft)' });
  const suivi = zonesDuSuspect(st, i).filter((u) => u !== S.user.uid && st.zones[u]);
  return `<div class="tb-tete">${portraitSuspect(s, i, 'tb-face tb-mini')}
      <div class="col" style="gap:2px;min-width:0"><span class="tb-titre">${esc(s.nom)}</span><span class="tiny muted">${esc(fiche.lien)}</span>
      ${multi ? `<span class="tiny ${mien ? 'good' : 'muted'}">${mien ? 'ta cellule' : 'autre cellule : vérifications au double'}</span>` : ''}</div></div>
    <p class="small tb-fiche-pub">${esc(fiche.declaration)}<br>${fiche.trajet ? `<strong>${esc(fiche.trajet)}</strong><br>` : ''}${aff.prof ? `<strong>${esc(fiche.vehicule)}</strong>` : esc(fiche.vehicule)}<br><span class="muted">${esc(fiche.rumeur)}</span></p>
    ${aff.meurtre && !dos.exclu ? `<button type="button" class="btn small ${d.reaud && d.reaud.i === i ? 'primary' : 'outline'}" data-action="tab-ouvrir" data-tid="Q:${i}">${d.reaud && d.reaud.i === i ? `✓ Réaudition prévue ce soir (face à « ${esc(nomElement(aff, d.reaud.f))} »)` : `🗣️ Le réentendre en lui opposant une pièce (${REAUD.cout} k€)`}</button>` : ''}
    ${aff.prof ? `<div class="tb-duo"><button type="button" class="btn small" data-action="tab-ouvrir" data-tid="A:${i}">📄 Lire son audition</button>${s.alibi.type !== 'seul' ? `<button type="button" class="btn small" data-action="tab-ouvrir" data-tid="L:${esc(s.alibi.pos)}">🗺️ Son trajet</button>` : ''}</div>` : ''}
    ${lignes}
    <div class="tb-duo">
      <button type="button" class="btn small ${surPiste ? 'primary' : 'outline'}" data-action="piste" data-i="${i}" aria-pressed="${surPiste}">${surPiste ? '✓ Piste prioritaire' : 'Piste prioritaire (gratuit)'}</button>
      ${acc}
    </div>
    ${!mien && suivi.length ? `<div class="row" style="gap:6px;flex-wrap:wrap"><span class="tiny muted">Suivi aussi par :</span>${suivi.map((u) => `<button type="button" class="btn small" data-action="ecrire-a" data-uid="${esc(u)}">✉ ${esc(st.zones[u].nom)}</button>`).join('')}</div>` : ''}`;
}

function voletConstat(aff, dos, e, et) {
  if (aff.meurtre) {
    const fi = aff.fiches[e], dm = demarcheDe(aff, fi.dem), seq = aff.sceneSeq[fi.dem];
    const connues = seq.filter((f) => et.connus.has(f));
    return `<span class="tb-ligne-k" style="color:${COL[e]}">Scène · ${esc(dm.nom)}</span><span class="tb-titre">${esc(fi.titre)}</span>
      ${connues.map((f) => `<div class="pv-qr"><p class="pv-q">${esc(titrePiece(aff, f))}</p>${aPhoto(aff, f) ? `<div class="tb-photo-grande">${photoIndice(aff, f, 'vc')}</div>` : ''}<p class="pv-r">${esc(texteFait(aff, f))}</p></div>`).join('') || '<p class="small muted" style="margin:0">Rien encore.</p>'}
      ${connues.length < seq.length ? `<p class="tiny muted" style="margin:0">${esc(dm.motif || '')} Encore ${seq.length - connues.length} résultat${seq.length - connues.length > 1 ? 's' : ''} à obtenir, un par démarche.</p>${demBtn(aff, dos, fi.dem, dm.nom)}` : '<p class="tiny muted" style="margin:0">Tout est au dossier.</p>'}`;
  }
  const f = `c:${e}`, connu = et.connus.has(f), faite = et.t.fiches.includes(e);
  const dm = DEMARCHES[CONSTAT_DEM[e]];
  let corps;
  if (faite) corps = `<p class="small tb-fait">${esc(texteFait(aff, f))}</p>`;
  else if (connu) corps = `<p class="small muted" style="margin:0">Le résultat est arrivé : il attend dans ta boîte à pièces.</p><button type="button" class="btn primary small" data-action="tab-fiche" data-e="${e}">Compléter la fiche</button>`;
  else corps = `<p class="small muted" style="margin:0">Pas encore établi. ${esc(dm.motif)} La démarche dira ${esc(dm.dit)}.</p>${demBtn(aff, dos, CONSTAT_DEM[e], dm.nom)}`;
  return `<span class="tb-ligne-k" style="--c:${COL[e]};color:${COL[e]}">${ELEMENT_NOM[e]} · constatation</span><span class="tb-titre">${faite ? esc(resumeConstat(aff, e)) : CONSTAT_TITRE[e]}</span>${corps}
    <p class="tiny muted" style="margin:0">Sans cette constatation, une vérification sur un suspect ne prouve rien.</p>`;
}

function voletPiece(aff, dos, f) {
  const doc = docsOuverture(aff).find((x) => x.f === f);
  if (doc) {
    const i = pieceSuspect(f), s = aff.suspects[i];
    return `<span class="tb-ligne-k" style="color:var(--amber)">Procès-verbal d’audition</span><span class="tb-titre">${esc(s.nom)}</span>
      <span class="tiny muted">${esc(cap1(s.role))}, ${s.age} ans · connu de toutes les zones</span>
      ${auditionHtml(aff, i, true)}
      ${recoupBoutons(aff, dossierDe(S.state, myZone()), f, dispo(aff.n).liens)}
      <div class="tb-duo"><button type="button" class="btn small" data-action="tab-ouvrir" data-tid="s${i}">Voir ${esc(s.prenom)}</button>
      ${dispo(aff.n).places.includes(f) ? `<button type="button" class="btn small ghost" data-action="tab-remettre" data-f="${esc(f)}">Remettre dans la boîte</button>` : `<button type="button" class="btn small primary" data-action="tab-sortir" data-f="${esc(f)}">Sortir de la boîte</button>`}</div>`;
  }
  const p = dos.pieces.find((x) => x.f === f);
  if (!p) return '<p class="small muted">Cette pièce n’est plus au dossier.</p>';
  const i = pieceSuspect(f);
  const partageBloc = `    <div class="tb-partage tb-t-${statutPartage(p).k}">
      <span class="tb-ligne-k">Partage</span>
      <span class="small" style="font-weight:600">${esc(statutPartage(p).txt)}</span>
      ${statutPartage(p).k === 'tous' ? '' : `${partageCtl(p)}
      <span class="tiny muted">Partager rapporte des PS et de la réputation, et des points d’enquête si ta pièce aide une zone à trouver l’auteur. ${ENQ.maxPartages} partages par soir au plus. Une zone ne reçoit qu’une pièce par soir, sauf en <strong>donnant-donnant</strong> : si vous vous envoyez chacune une pièce le même soir, les deux passent toujours.</span>`}
    </div>`;
  return `${S.tabSheet && S.tabSheet.partage ? partageBloc : ''}<span class="tb-ligne-k" style="color:var(--amber)">${esc(titrePiece(aff, f))}</span>
    <span class="tiny muted">J${p.j} · ${sourceDe(p)}</span>
    ${aPhoto(aff, f) ? `<div class="tb-photo-grande">${photoIndice(aff, f, 'vp')}</div>` : ''}
    <p class="small tb-fait">${esc(texteFait(aff, f)).replace(/\n/g, '<br>')}</p>
    ${relecturesHtml(aff, f, opposablesSet(aff, dos))}
    ${recoupBoutons(aff, dos, f, dispo(aff.n).liens)}
    ${S.tabSheet && S.tabSheet.partage ? '' : partageBloc}
    <div class="tb-duo">${i !== null ? `<button type="button" class="btn small" data-action="tab-ouvrir" data-tid="s${i}">Voir ${esc(aff.suspects[i].prenom)}</button>` : ''}
    ${dispo(aff.n).places.includes(f) ? `<button type="button" class="btn small ghost" data-action="tab-remettre" data-f="${esc(f)}">Remettre dans la boîte</button>` : `<button type="button" class="btn small primary" data-action="tab-sortir" data-f="${esc(f)}">Sortir de la boîte</button>`}</div>`;
}

/** Dossier complet : trajet par la route entre deux lieux, pour les trois moyens de transport. */
function trajetsHtml(aff, a, b) {
  const r = S.tabRoute && S.tabRoute.n === aff.n ? S.tabRoute : null;
  const lignes = Object.entries(MODES).map(([m, md]) => {
    const it = itineraire(a, b, m, aff.travaux);
    if (!it) return '';
    const on = r && r.a === a && r.b === b && r.mode === m;
    return `<button type="button" class="tb-trajet-l ${on ? 'on' : ''}" style="--c:${COL_MODE[m]}" data-action="tab-route" data-a="${esc(a)}" data-b="${esc(b)}" data-m="${m}" aria-pressed="${on}"><span>${md.icone} ${md.nom}</span><span class="tiny muted">${fmtDist(it.m)}</span><strong>${it.min} min</strong></button>`;
  }).join('');
  const trav = aff.travaux ? `<p class="tiny" style="margin:0;color:var(--red-soft)">🚧 Travaux : ${esc(nomTroncon(aff.travaux))} fermé aux voitures et deux-roues (vélos et piétons passent).</p>` : '';
  return `${lignes}${trav}<p class="tiny muted" style="margin:0">Touche un moyen de transport : l’itinéraire le plus court est tracé sur le plan. Voitures : pas de passerelle ni de zone piétonne.</p>`;
}

function voletLieu(aff, k, et) {
  if (aff.ville === 'mons') {
    const LX = lieuxMons(aff), l = LX[k];
    const nomLieu = l.nom.replace(/[←→↑↓↖↗↘↙]/g, '').replace(/·.*$/, '').trim();
    const qui = aff.suspects.filter((s) => s.alibi.pos === k);
    return `<span class="tb-ligne-k" style="color:var(--blue-soft)">${esc(l.sous || 'Mons')}</span><span class="tb-titre">${esc(l.nom)}</span>
      ${qui.map((s) => `<p class="small" style="margin:0"><strong>${esc(s.prenom)}</strong> · ${esc(ficheSuspect(aff, s).declaration)}</p>`).join('')}
      ${k === aff.pos ? '' : `<div class="tb-trajets">
        <span class="tb-trajets-t">⏱ Temps de trajet <span class="muted">· Google Maps</span></span>
        <span class="small" style="font-weight:600">${esc(nomLieu)} → ${aff.genre === 'corbeau' ? 'la scène' : 'scène du crime'}</span>
        <div class="tb-trajets-l">${MODES_GMAPS.map(([m, ic, nom]) => `<a class="btn primary" href="${lienItineraire(k, aff.pos, LX, m)}" target="_blank" rel="noopener"><span class="ic">${ic}</span>${nom}</a>`).join('')}</div>
        <span class="small" style="font-weight:600">${aff.genre === 'corbeau' ? 'La scène' : 'Scène du crime'} → ${esc(nomLieu)}</span>
        <div class="tb-trajets-l">${MODES_GMAPS.map(([m, ic, nom]) => `<a class="btn outline" href="${lienItineraire(aff.pos, k, LX, m)}" target="_blank" rel="noopener"><span class="ic">${ic}</span>${nom}</a>`).join('')}</div>
        <p class="tiny muted" style="margin:0">Compte large : la minute près n’est jamais nécessaire. En bus, Google donne les horaires d’aujourd’hui, pas ceux du soir des faits.</p>
      </div>`}
      ${et.connus.has(aff.pieceHeure || 'c:legiste2') ? `<p class="tiny muted" style="margin:0">${aff.texteHeure ? esc(aff.texteHeure) : `Le légiste : décès entre ${hm(aff.heure)} et ${hm(aff.fin)}.`}</p>` : ''}`;
  }
  if (aff.prof) {
    const l = LIEUX3[k];
    const qui = aff.suspects.filter((s) => s.alibi.type !== 'seul' && s.alibi.pos === k);
    return `<span class="tb-ligne-k" style="color:var(--blue-soft)">Lieu déclaré${l.rue ? ` · ${esc(l.rue)}` : ''}</span><span class="tb-titre">${esc(l.nom)}</span>
      ${qui.map((s) => `<p class="small" style="margin:0"><strong>${esc(s.prenom)}</strong> ${esc(ficheSuspect(aff, s).declaration.replace(/^Dit/, 'dit').replace(/\.$/, ''))} · <span class="muted">${esc(ficheSuspect(aff, s).vehicule.replace(/^Véhicule : /, ''))}</span></p>`).join('')}
      <span class="tb-ligne-k">Trajet jusqu’${esc(aLieu(aff.lieu))}</span>
      ${trajetsHtml(aff, k, aff.pos)}
      ${et.connus.has('c:occ') ? `<p class="tiny muted" style="margin:0">Les caméras : entrée à ${hm(aff.heure)}, sortie à ${hm(aff.fin)}.</p>` : '<p class="tiny muted" style="margin:0">L’heure exacte des faits viendra des caméras.</p>'}`;
  }
  const l = CARTE.lieux[k];
  const t = aff.carte ? trajet(aff.pos, k) : null;
  const qui = aff.suspects.filter((s) => s.alibi.type !== 'seul' && s.alibi.pos === k);
  return `<span class="tb-ligne-k" style="color:var(--blue-soft)">Lieu déclaré</span><span class="tb-titre">${esc(l.nom)}</span>
    ${t ? `<p class="small" style="margin:0"><strong>${t} min</strong> de trajet jusqu’à ${esc(aff.lieu)}.</p>` : ''}
    ${qui.map((s) => `<p class="small" style="margin:0">${esc(s.prenom)} ${esc(ficheSuspect(aff, s).declaration.replace(/^Dit/, 'dit'))}</p>`).join('')}
    ${et.connus.has('c:occ') ? `<p class="tiny muted" style="margin:0">Les caméras : entrée à ${hm(aff.heure)}, sortie à ${hm(aff.fin)}.</p>` : ''}`;
}

function voletPlanque(aff, dos, i) {
  const p = aff.planques[i], m = lireCarnet(aff.n).p[i] || 0;
  const indices = dos.pieces.filter((x) => x.f.startsWith('p:'));
  const MQ = [['·', 'sans marque'], ['✕', 'écartée'], ['?', 'douteuse'], ['●', 'retenue']];
  return `<span class="tb-ligne-k" style="color:#B79BFF">Planque possible · rive ${esc(p.rive)}</span><span class="tb-titre">${esc(p.nom)}</span>
    <p class="small" style="margin:0;color:var(--text2)">${esc(fichePlanque(p))}</p>
    <div class="between"><span class="small">Ta marque : <strong>${MQ[m][1]}</strong></span><button type="button" class="tb-mark" data-v="${m === 1 ? 2 : m === 3 ? 1 : 0}" data-action="carnet-mark" data-t="p" data-i="${i}" aria-label="${esc(p.nom)} : ${MQ[m][1]}. Changer la marque">${MQ[m][0]}</button></div>
    <span class="tb-ligne-k">Indices sur la planque · ${indices.length}</span>
    ${indices.map((x) => `<p class="small tb-fait">${esc(texteFait(aff, x.f))}</p>`).join('') || '<p class="tiny muted" style="margin:0">Aucun pour l’instant : les constatations relancées et le butin retrouvé en donnent.</p>'}
    <p class="tiny muted" style="margin:0">Une seule planque correspond à tous les indices. Elle servira pour l’arrestation, une fois l’auteur trouvé.</p>`;
}

function voletPlan(aff, et) {
  if (aff.ville === 'mons') {
    const LIEUX_MONS = lieuxMons(aff);
    const lieux = Object.keys(LIEUX_MONS).filter((k) => !LIEUX_MONS[k].repere && k !== aff.pos);
    return `<span class="tb-titre">Mons, le centre</span>
      <p class="small muted" style="margin:0">Croix rouge : ${esc(LIEUX_MONS[aff.pos].nom)}, ${esc(LIEUX_MONS[aff.pos].sous ? LIEUX_MONS[aff.pos].sous.split(' · ')[0] : '')}. Les rues et les monuments sont réels ; ${aff.lieuxInventes ? esc(aff.lieuxInventes) : aff.cas === 'rampe' ? 'l’étude, la brasserie, le café, le Cercle' : 'la boutique, la brasserie, le café'} et toutes les personnes de l’affaire sont inventés. Pour un temps de trajet, ouvre l’itinéraire à pied dans Google Maps.</p>
      ${lieux.map((k) => `<button type="button" class="tb-trajet-l" data-action="tab-ouvrir" data-tid="L:${k}"><span>${esc(LIEUX_MONS[k].nom)}</span><span class="tiny muted">${esc(LIEUX_MONS[k].sous || '')}</span><strong>›</strong></button>`).join('')}`;
  }
  if (aff.prof) {
    const r = S.tabRoute && S.tabRoute.n === aff.n ? S.tabRoute : { a: aff.pos, b: null };
    const opts = [aff.pos, ...[...new Set(aff.suspects.filter((s) => s.alibi.type !== 'seul').map((s) => s.alibi.pos))], ...Object.keys(LIEUX3).filter((k) => k !== aff.pos)];
    const uniq = [...new Set(opts)];
    const sel = (cle2, v) => `<select class="text" data-change="tab-route-${cle2}" style="min-height:40px;font-size:13px">${cle2 === 'b' && !v ? '<option value="">Choisir…</option>' : ''}${uniq.map((k) => `<option value="${k}" ${k === v ? 'selected' : ''}>${k === aff.pos ? '✕ ' : ''}${esc(LIEUX3[k].nom)}</option>`).join('')}</select>`;
    const declares = [...new Set(aff.suspects.filter((s) => s.alibi.type !== 'seul').map((s) => s.alibi.pos))];
    return `<span class="tb-titre">Plan routier du district</span>
      <p class="small muted" style="margin:0">Croix rouge : ${esc(aff.lieu)}. Les temps suivent la route (1 km = 2 min en voiture ou deux-roues, 4 min à vélo, 12 min à pied). Les passerelles et la zone piétonne de la Grand-Place sont réservées aux vélos et aux piétons.</p>
      <span class="tb-ligne-k">Mesurer un trajet</span>
      <label class="tiny muted">Départ ${sel('a', r.a)}</label><label class="tiny muted">Arrivée ${sel('b', r.b)}</label>
      ${r.a && r.b && r.a !== r.b ? trajetsHtml(aff, r.a, r.b) : ''}
      <span class="tb-ligne-k">Lieux déclarés par les suspects</span>
      ${declares.map((k) => `<button type="button" class="tb-trajet-l" data-action="tab-ouvrir" data-tid="L:${k}"><span>${esc(LIEUX3[k].nom)}</span><span class="tiny muted">${aff.suspects.filter((s) => s.alibi.type !== 'seul' && s.alibi.pos === k).map((s) => esc(s.prenom)).join(', ')}</span><strong>›</strong></button>`).join('')}
      ${S.tabRoute ? '<button type="button" class="btn small ghost" data-action="tab-route-effacer">Effacer le tracé</button>' : ''}`;
  }
  const declares = [...new Set(aff.suspects.filter((s) => s.alibi.type !== 'seul').map((s) => s.alibi.pos))];
  return `<span class="tb-titre">Plan du district</span>
    <p class="small muted" style="margin:0">Croix rouge : ${esc(aff.lieu)}.${aff.carte ? ' Les pointillés donnent le temps de trajet jusqu’aux lieux où les suspects disent avoir été.' : ''}</p>
    ${declares.map((k) => `<button type="button" class="tb-trajet-l" data-action="tab-ouvrir" data-tid="L:${k}"><span>${esc(CARTE.lieux[k].nom)}</span><span class="tiny muted">${aff.suspects.filter((s) => s.alibi.type !== 'seul' && s.alibi.pos === k).map((s) => esc(s.prenom)).join(', ')}</span>${aff.carte ? `<strong>${trajet(aff.pos, k)} min</strong>` : ''}</button>`).join('')}
    ${et.connus.has('c:occ') ? `<p class="tiny muted" style="margin:0">Rappel des caméras : entrée à ${hm(aff.heure)}, sortie à ${hm(aff.fin)}.</p>` : '<p class="tiny muted" style="margin:0">L’heure exacte des faits viendra des caméras.</p>'}`;
}

function voletDoc(aff, id) {
  if (aff.prof && id === 'recit') {
    const d3 = dossierAffaire3(S.state.seed, aff);
    return `<span class="tb-ligne-k" style="color:var(--amber)">PV n° ${esc(d3.pvc.numero)}</span><span class="tb-titre">${esc(d3.pvc.titre)}</span>${d3.pvc.lignes.map((x) => `<p class="small" style="margin:0;line-height:1.5">${esc(x)}</p>`).join('')}
      ${regleHtml(aff)}
      <span class="pill amber" style="align-self:flex-start">Jour ${S.state.enquete.jour} sur ${ENQ.dureeMax} · découverte ce soir : ${pointsDecouverte(S.state.enquete.jour)} pts</span>
      <button type="button" class="btn small" data-action="journal-ouvrir">📰 Relire le journal</button>
      <a class="small" href="#guide-enquete">Comment fonctionne l’enquête ?</a>`;
  }
  const rc = recitAffaire(S.state.seed, aff);
  if (id === 'une') return `<span class="tb-ligne-k" style="color:var(--amber)">La Gazette du Delta · jour 1</span><span class="tb-titre">${esc(rc.une.titre)}</span><div class="tb-photo-grande">${photoUne(rc.scene, 'unv')}</div><p class="small" style="margin:0;font-weight:600">${esc(rc.une.chapo)}</p>${rc.une.corps.map((x) => `<p class="small" style="margin:0;line-height:1.5">${esc(x)}</p>`).join('')}`;
  if (id === 'scene') return `<span class="tb-ligne-k" style="color:var(--amber)">Photo de la scène · labo, jour 1</span><span class="tb-titre">${esc(aff.lieu.charAt(0).toUpperCase() + aff.lieu.slice(1))}</span><div class="tb-photo-grande">${photoScene(rc.scene, 'scv')}</div><p class="small muted" style="margin:0">Les plots 1 à 3 marquent les endroits relevés par le labo. La façon d’entrer, l’heure exacte et le mobile restent à établir : ce sont les constatations.</p>`;
  return `<span class="tb-ligne-k" style="color:var(--amber)">${esc(rc.plainte.titre)}</span><span class="tb-titre">${esc(rc.plainte.qui)}</span>${rc.plainte.lignes.map((x) => `<p class="small" style="margin:0;line-height:1.5">${esc(x)}</p>`).join('')}`;
}

function voletFaits(aff) {
  const j = S.state.enquete.jour;
  return `<span class="tb-ligne-k" style="color:var(--amber)">Affaire n° ${aff.n} · jour ${j} sur ${ENQ.dureeMax}</span><span class="tb-titre">${esc(aff.titre)}</span>
    <p class="small" style="margin:0;color:var(--text2);line-height:1.5">${esc(aff.recit)}</p>
    ${regleHtml(aff)}
    <span class="pill amber" style="align-self:flex-start">Découverte ce soir : ${pointsDecouverte(j)} pts</span>
    ${rebondsPublies(S.state).map((r) => `<div class="card amber tight"><span class="kicker">Jour ${r.j} · rebondissement</span><span style="font-weight:700">${esc(r.titre)}</span><span class="small" style="color:var(--amber-soft)">${esc(r.texte)}</span></div>`).join('')}
    <span class="tb-ligne-k">Main courante</span>
    ${chronologie(aff, dossierDe(S.state, myZone())).map((l) => `<p class="small" style="margin:0"><strong style="color:var(--amber)">J${l.j}</strong> · ${esc(l.t)}</p>`).join('')}
    <a class="small" href="#guide-enquete">Comment fonctionne l’enquête ?</a>`;
}

/** Pièces opposables (dossier + documents publics), en ensemble. */
export const opposablesSet = (aff, dos) => new Set(opposables(aff, dos));

/** Nom d'un élément opposable en confrontation. */
export function nomElement(aff, f) {
  if (f === 'doc:journal') return 'Le journal du lendemain';
  if (f === 'doc:pvc') return 'PV de premières constatations';
  return titrePiece(aff, f);
}
/** Meurtre : la confrontation. On choisit trois éléments du dossier à opposer au suspect. */
/** Meurtre : réentendre un suspect en lui opposant un élément du dossier (une réaudition par soir). */
function voletReaud(aff, dos, i) {
  const d = S.draft, s = aff.suspects[i];
  const choix = d.reaud && d.reaud.i === i ? d.reaud.f : null;
  const tous = [...opposables(aff, dos)].filter((f) => f !== `A:${i}` || true);
  const ligne = (f) => {
    const on = choix === f;
    const fait = aff.reactions && aff.reactions[i] && aff.reactions[i][f] && !pieceReaudition(aff, dos, i, f);
    return `<button type="button" class="tb-trajet-l ${on ? 'on' : ''}" style="--c:var(--amber)" data-action="reaud-piece" data-i="${i}" data-f="${esc(f)}" aria-pressed="${on}" ${fait || !mandatOk(aff, dos, i) ? 'disabled' : ''}><span>${esc(nomElement(aff, f))}</span><strong>${on ? '✓' : fait ? 'déjà fait' : ''}</strong></button>`;
  };
  return `<span class="tb-ligne-k" style="color:var(--amber)">Réaudition · ${REAUD.cout} k€ · une par soir</span><span class="tb-titre">${esc(s.nom)}</span>
    ${mandatOk(aff, dos, i) ? '' : '<p class="small" style="margin:0;color:var(--red-soft)">Le magistrat n’autorisera la réaudition qu’avec une pièce sérieuse contre cette personne au dossier (comme pour la perquisition).</p>'}
    <p class="small muted" style="margin:0">Choisis l’élément à lui mettre sous les yeux. Certains le feront parler, d’autres non : « rien à ajouter » ne prouve rien. Résultat ce soir à 20:00.</p>
    ${tous.map(ligne).join('')}
    ${d.reaud ? '<button type="button" class="btn small ghost" data-action="reaud-annuler">Annuler la réaudition</button>' : ''}`;
}

function voletConfront(aff, dos, i, et) {
  const d = S.draft, s = aff.suspects[i];
  const choix = d.confront || [];
  const docs = ['doc:journal', 'doc:pvc', ...aff.suspects.map((_, k) => `A:${k}`)];
  const pieces = dos.pieces.map((p) => p.f);
  const ligne = (f) => {
    const on = choix.includes(f);
    return `<button type="button" class="tb-trajet-l ${on ? 'on' : ''}" style="--c:var(--red-soft)" data-action="confront-piece" data-f="${esc(f)}" aria-pressed="${on}" ${!on && choix.length >= 3 ? 'disabled' : ''}><span>${esc(nomElement(aff, f))}</span><strong>${on ? '✓' : ''}</strong></button>`;
  };
  if (dos.exclu || (dos.accuse !== null && dos.accuse !== undefined)) return '<p class="small muted">Tu ne peux plus confronter personne sur cette affaire.</p>';
  return `<span class="tb-ligne-k" style="color:var(--red-soft)">Confrontation · ${choix.length} / 3</span><span class="tb-titre">${esc(s.nom)}</span>
    <p class="small muted" style="margin:0">Choisis les trois éléments qui le mettent face à ses contradictions. Mal choisis, il nie et repart libre (−1 de réputation) : tu pourras recommencer un autre jour. Mauvaise personne : le parquet te retire l’affaire.</p>
    <span class="tb-ligne-k">Connus de tous</span>${docs.map(ligne).join('')}
    <span class="tb-ligne-k">Ton dossier · ${pieces.length}</span>${pieces.map(ligne).join('') || '<p class="tiny muted" style="margin:0">Aucune pièce pour l’instant.</p>'}
    ${mobileHtml(aff)}
    <button type="button" class="btn primary" data-action="confront-valider" data-i="${i}" ${choix.length === 3 ? '' : 'disabled'}>Confronter ${esc(s.prenom)} à 20:00</button>`;
}

function voletBoite(aff, et) {
  const j = S.state.enquete.jour;
  const lignes = [
    ...et.fichesAFaire.map((e) => `<div class="tb-boite-l nouveau"><span class="tb-vign tb-vign-fiche" style="--c:${COL[e]}"></span><div class="col grow" style="gap:2px;min-width:0"><span class="tb-ligne-k" style="color:var(--red-soft)">Constatation · ${ELEMENT_NOM[e]}</span><span class="small" style="font-weight:600">${CONSTAT_TITRE[e]} : le résultat est là</span></div><button type="button" class="btn primary small" data-action="tab-fiche" data-e="${e}">Compléter la fiche</button></div>`),
    ...et.boite.map((p) => {
      const nv = p.j >= j - 1;
      return `<div class="tb-boite-l ${nv ? 'nouveau' : ''}"><span class="tb-vign tb-vign-${typePiece(p, aff)}"></span><div class="col grow" style="gap:2px;min-width:0"><span class="tb-ligne-k" style="color:${nv ? 'var(--red-soft)' : 'var(--amber)'}">${nv ? 'Nouveau · ' : ''}J${p.j} · ${sourceDe(p)}</span><button type="button" class="tb-lien" data-action="tab-ouvrir" data-tid="${esc(p.f)}">${esc(titrePiece(aff, p.f))}</button><span class="tiny tb-t-${statutPartage(p).k}">${esc(statutPartage(p).txt)}</span></div><button type="button" class="btn primary small" data-action="tab-sortir" data-f="${esc(p.f)}">Sortir</button></div>`;
    }),
  ];
  return `<div class="between" style="gap:8px;padding-right:44px"><span class="tb-titre" style="padding-right:0">Boîte à pièces</span>${lignes.length > 1 ? '<button type="button" class="btn small ghost" data-action="tab-tout-sortir">Tout sortir</button>' : ''}</div>
    <p class="tiny muted" style="margin:0">${lignes.length ? 'Sors une pièce : elle est punaisée au milieu de ton écran, glisse-la où tu veux.' : 'La boîte est vide : tout est sur ton tableau.'} Les nouvelles pièces arrivent ici chaque soir à 20:00.</p>
    ${lignes.join('')}`;
}

/** Ma cellule d'enquête : les zones avec qui je travaille et les suspects que nous suivons. */
function celluleHtml(aff) {
  const st = S.state, e = st.enquete;
  if (!e || !(e.nbCellules > 1)) return '';
  const moi = S.user.uid, c = celluleDe(st, moi);
  const zones = Object.values(st.zones).filter((x) => x.uid !== moi && (x.toursSansOrdres || 0) < 3 && celluleDe(st, x.uid) === c);
  const suspects = aff.suspects.map((s2, i) => (dansMaCellule(st, moi, i) ? s2.prenom : null)).filter(Boolean);
  return `<div class="tb-cellule"><span class="tb-ligne-k">🕵️ Ta cellule · ${e.nbCellules} cellules dans le district</span>
    <span class="small"><strong>Avec toi :</strong> ${zones.length ? zones.map((x) => esc(zoneName(x))).join(', ') : '<span class="muted">personne d’autre pour l’instant</span>'}</span>
    <span class="small"><strong>Vos suspects :</strong> ${esc(suspects.join(', '))} <span class="tiny muted">(les autres coûtent le double)</span></span>
    <span class="tiny muted">Partagez-vous les démarches sur la radio pour ne pas payer deux fois la même.</span></div>`;
}

function voletSoir(aff, dos) {
  const d = S.draft, z = myZone();
  const dem = d.demarches || [];
  const v = voisinageInfo(aff);
  const nomDem = (x) => { const [k, i] = x.split(':'); const dm = demarcheDe(aff, k); return i !== undefined ? `${dm.nom} · ${aff.suspects[Number(i)].prenom}` : dm.nom; };
  return `<div class="between" style="padding-right:44px"><span class="tb-titre" style="padding-right:0">Ce soir</span><span class="small muted">reste ${Math.round((z.budget - engagementsDuJour(d, z).total) * 10) / 10} k€</span></div>
    ${regleHtml(aff)}
    ${celluleHtml(aff)}
    <span class="tb-ligne-k">Démarches · ${dem.length} / ${maxDemarchesDe(S.state, zoneAvecAgenda())}</span>
    ${dem.map((x) => `<div class="tb-boite-l"><span class="small grow" style="font-weight:600">${esc(nomDem(x))}</span><button type="button" class="btn small ghost" data-action="dem-toggle" data-k="${esc(x)}" aria-label="Retirer ${esc(nomDem(x))}">✕</button></div>`).join('') || '<p class="tiny muted" style="margin:0">Touche une photo ou une fiche du tableau pour choisir une démarche.</p>'}
    <div class="voisinage"><span class="small"><strong>Voisinage</strong> · ${v.n} agent${v.n > 1 ? 's' : ''} en Recherche${v.nom ? ` · piste : <strong>${esc(v.nom)}</strong>` : ''} : ${esc(v.txt)}</span></div>
    ${appuiHtml()}
    ${aff.meurtre && d.reaud ? `<div class="tb-boite-l"><span class="small grow" style="font-weight:600">Réaudition · ${esc(aff.suspects[d.reaud.i].prenom)}, face à « ${esc(nomElement(aff, d.reaud.f))} »</span><button type="button" class="btn small ghost" data-action="reaud-annuler" aria-label="Annuler la réaudition">✕</button></div>` : ''}
    ${aff.recoupements || aff.hypothese ? soirPlusHtml(aff) : ''}
    ${d.accusation !== null && d.accusation !== undefined ? `<p class="small" style="margin:0;color:var(--red-soft)">${aff.meurtre ? `Confrontation prête : ${esc(aff.suspects[d.accusation].nom)}, avec ${(d.confront || []).map((f) => `« ${esc(nomElement(aff, f))} »`).join(', ')}.` : `Accusation prête contre ${esc(nomsAccuses(aff, d))}.`}</p>` : ''}
    <span class="tb-ligne-k">Partages · ${(d.partages || []).length} / ${ENQ.maxPartages}</span>
    ${(d.partages || []).map((x) => `<div class="tb-boite-l"><div class="col grow" style="gap:2px;min-width:0"><button type="button" class="tb-lien" data-action="tab-ouvrir" data-tid="${esc(x.f)}">${esc(titrePiece(aff, x.f))}</button><span class="tiny muted">vers ${x.a === '*' ? 'toutes les zones' : esc(S.state.zones[x.a] ? zoneName(S.state.zones[x.a]) : '?')}</span></div><button type="button" class="btn small ghost" data-action="partage-annuler" data-f="${esc(x.f)}" aria-label="Annuler ce partage">✕</button></div>`).join('') || '<p class="tiny muted" style="margin:0">Aucun partage prévu. Touche une pièce (sur le tableau ou dans la boîte) pour la partager.</p>'}
    <p class="tiny muted" style="margin:0">Tout part avec tes ordres : pense à valider. Résultats à 20:00, dans ta boîte à pièces.</p>`;
}

export function volet(aff, dos, et) {
  const sh = S.tabSheet;
  if (!sh) return '';
  let corps = '';
  if (sh.k === 's') corps = voletSuspect(aff, dos, Number(sh.id.slice(1)), et);
  else if (sh.k === 'c') corps = voletConstat(aff, dos, sh.id.slice(2), et);
  else if (sh.k === 'p') corps = voletPiece(aff, dos, sh.id);
  else if (sh.k === 'lieu') corps = voletLieu(aff, sh.id.slice(2), et);
  else if (sh.k === 'planque') corps = voletPlanque(aff, dos, Number(sh.id.slice(2)));
  else if (sh.k === 'plan') corps = voletPlan(aff, et);
  else if (sh.k === 'faits') corps = voletFaits(aff);
  else if (sh.k === 'doc') corps = voletDoc(aff, sh.id);
  else if (sh.k === 'boite') corps = voletBoite(aff, et);
  else if (sh.k === 'soir') corps = voletSoir(aff, dos);
  else if (sh.k === 'confront') corps = voletConfront(aff, dos, Number(sh.id.slice(2)), et);
  else if (sh.k === 'reaud') corps = voletReaud(aff, dos, Number(sh.id.slice(2)));
  else if (sh.k === 'frise') corps = friseVolet(aff, opposables(aff, dos), dispo(aff.n).frise);
  else if (sh.k === 'recoup') corps = voletRecoup(aff, dos, sh.id.slice(4));
  else if (sh.k === 'hypo') corps = voletHypo(aff, dos);
  else if (sh.k === 'pouce') corps = voletPouces(aff);
  else if (sh.k === 'choix') corps = voletChoix(aff, dos, et);
  return `<section class="tb-volet tb-ui" aria-label="Détail">
    <div class="tb-poignee"></div>
    <button type="button" class="tb-fermer" data-action="tab-fermer" aria-label="Fermer">${icon('x', 18)}</button>
    <div class="tb-volet-corps">${fixable(sh.id) && !S.e2Rendu ? boutonFixer(sh.id) : ''}${corps}</div></section>`;
}

const fixable = (id) => /^(s\d|c:|recit$|chrono$|une$|scene$|plainte$)/.test(id) || dispo(S.state.enquete.n).places.includes(id);
function boutonFixer(id) {
  const f = dispo(S.state.enquete.n).fixes.includes(id);
  return `<button type="button" class="tb-fixer ${f ? 'on' : ''}" data-action="tab-fixer" data-tid="${esc(id)}" aria-pressed="${f}">${f ? '📌 Épinglée : ne bouge plus · libérer' : '📌 Épingler ici (ne bouge plus en glissant)'}</button>`;
}
/** Épingle ou libère un élément : épinglé, il ne se déplace plus (glisser dessus fait défiler le tableau) ; les ficelles marchent toujours. */
export function basculerFixe(id) {
  const n = S.state.enquete.n, t = dispo(n);
  t.fixes = t.fixes.includes(id) ? t.fixes.filter((x) => x !== id) : [...t.fixes, id];
  ecrireDispo(n, t);
  return t.fixes.includes(id);
}

// ───── Mini tuto ─────
const TUTO = [
  { titre: 'Ton tableau d’enquête', texte: 'Tout ce que tu sais de l’affaire, punaisé au mur. C’est toi qui le ranges : rien n’est trié d’avance.', ou: 'centre' },
  { titre: 'Promène-toi dessus', texte: 'Glisse le liège pour te déplacer. Pince à deux doigts (ou la molette sur ordinateur) pour zoomer. Ce bouton montre tout le tableau.', ou: 'bas', spot: 'fit' },
  { titre: 'La boîte à pièces', texte: 'Chaque soir à 20:00, les nouvelles pièces arrivent ici. Sors-les une à une et punaise-les où tu veux : près d’un suspect, sur le plan…', ou: 'haut', spot: 'boite' },
  { titre: 'Touche pour agir', texte: 'Touche une photo, une fiche ou un lieu du plan : tu vois ce qu’on sait, tu coches ✓ ou ✕, et tu lances tes démarches. Le plan donne les temps de trajet : un trou dans un alibi ne suffit pas si la route est trop longue. Tu peux aussi l’épingler 📌 : il ne bougera plus quand tu fais défiler.', ou: 'centre' },
  { titre: 'Tire tes ficelles', texte: 'Pose le doigt sur une punaise et glisse jusqu’à un autre élément : la ficelle s’accroche toute seule à la punaise la plus proche. Pour en retirer une, attrape-la et tire-la hors de sa ligne : elle se décroche.', ou: 'bas', spot: 'fil' },
  { titre: 'Ce soir', texte: 'Démarches, piste, appui fédéral : tout part avec tes ordres à 20:00. Tu préfères l’affichage en liste ? Il est derrière ce bouton.', ou: 'haut', spot: 'soir' },
];
export function tutoTableauVu() { try { return localStorage.getItem(TUTO_KEY) === '1'; } catch (e) { return !!S.tutoTabVu; } }
function tutoHtml() {
  if (S.tabTuto === undefined || S.tabTuto === null) return '';
  const k = S.tabTuto, step = TUTO[k];
  return `<div class="tb-tuto tb-ui tb-tuto-${step.ou}" role="dialog" aria-label="Tuto du tableau">
    <div class="tb-tuto-bulle">
      <span class="tb-ligne-k" style="color:var(--amber)">${k + 1} / ${TUTO.length}</span>
      <span class="tb-titre">${step.titre}</span>
      <p class="small" style="margin:0;line-height:1.5">${step.texte}</p>
      <div class="between"><button type="button" class="btn ghost small" data-action="tab-tuto-fin">Passer</button>
      <button type="button" class="btn primary small" data-action="${k + 1 < TUTO.length ? 'tab-tuto-suite' : 'tab-tuto-fin'}">${k + 1 < TUTO.length ? 'Suivant' : 'C’est parti'}</button></div>
    </div></div>`;
}

/** Hauteur du tableau : la taille de base, ou plus si des éléments ont été rangés plus bas. */
function hauteurTableau(aff, t) {
  const ids = [...t.places, ...aff.suspects.map((_, i) => `s${i}`), 'recit', 'chrono', ...(aff.carte ? ['une', 'scene', 'plainte'] : [])];
  return Math.max(BH_MIN, ...ids.map((id) => posDe(t, id)[1] + tailleDe(id)[1] + 80));
}

/** Prépare l'état partagé du tableau (dossier complet, pièces opposables) pour un affichage hors liège. */
export function preparerTableau(aff, dos) {
  PROF = !!aff.prof;
  CONNUS = opposablesSet(aff, dos);
  return etatTab(aff, dos);
}

/** Choisir une démarche pour ce soir : la scène d'abord, puis chaque suspect (ta cellule et ceux encore en lice d'abord). */
function voletChoix(aff, dos, et) {
  const st = S.state, d = S.draft, carnet = lireCarnet(aff.n);
  const dem = d.demarches || [], max = maxDemarchesDe(st, zoneAvecAgenda());
  let scene = '';
  if (aff.meurtre) {
    scene = ELEMENTS.map((e) => { const fi = aff.fiches[e], dm = demarcheDe(aff, fi.dem), seq = aff.sceneSeq[fi.dem]; const kn = seq.filter((f) => et.connus.has(f)).length;
      return kn < seq.length ? `<div class="e2-ch-l" style="--c:${COL[e]}"><span class="e2-ch-k">${esc(fi.titre)} · ${kn}/${seq.length}</span>${demBtn(aff, dos, fi.dem, dm.nom)}</div>` : ''; }).join('');
  } else {
    scene = ELEMENTS.filter((e) => !et.connus.has(`c:${e}`)).map((e) => { const dm = DEMARCHES[CONSTAT_DEM[e]];
      return `<div class="e2-ch-l" style="--c:${COL[e]}"><span class="e2-ch-k">${ELEMENT_NOM[e]} · ${esc(CONSTAT_TITRE[e])}</span>${demBtn(aff, dos, CONSTAT_DEM[e], dm.nom)}</div>`; }).join('');
  }
  const rang = (i) => (etatSuspect(carnet, i, aff) === 'exclu' ? 2 : 0) + (dansMaCellule(st, S.user.uid, i) ? 0 : 1);
  const ordre = aff.suspects.map((_, i) => i).sort((x, y) => rang(x) - rang(y) || x - y);
  const multi = st.enquete.nbCellules > 1;
  const sus = ordre.map((i) => {
    const s = aff.suspects[i], exclu = etatSuspect(carnet, i, aff) === 'exclu', mien = dansMaCellule(st, S.user.uid, i);
    return `<div class="e2-ch-s ${exclu ? 'exclu' : ''}">
      <div class="e2-ch-qui">${portraitSuspect(s, i, 'tb-face e2-mini')}<span class="col" style="gap:0;min-width:0"><strong>${esc(s.nom)}</strong><span class="tiny muted">${exclu ? 'exclu dans ton carnet' : multi && !mien ? 'autre cellule : prix double' : esc(s.role)}</span></span></div>
      <div class="dem-row">${demBtn(aff, dos, `alibi:${i}`, aff.meurtre ? 'Alibi' : 'Son alibi', { compact: true })}${demBtn(aff, dos, `moyens:${i}`, aff.meurtre ? 'Perquisition' : 'Ses moyens', { compact: true })}${demBtn(aff, dos, `banque:${i}`, aff.meurtre ? 'Tél., comptes' : 'Son mobile', { compact: true })}</div></div>`;
  }).join('');
  return `<div class="between" style="padding-right:44px"><span class="tb-titre" style="padding-right:0">Démarches de ce soir</span><span class="small muted">${dem.length} / ${max}</span></div>
    <p class="tiny muted" style="margin:0">Chaque démarche rapporte une pièce à 20:00. ${aff.meurtre ? 'La scène d’abord : elle dit ce qui compte.' : 'Les constatations d’abord : sans elles, une vérification ne prouve rien.'}</p>
    ${scene ? `<span class="tb-ligne-k">${aff.meurtre ? 'La scène' : 'Constatations'}</span>${scene}` : ''}
    <span class="tb-ligne-k">Les suspects</span>${sus}
    ${dem.length >= max ? '<p class="small" style="margin:0;color:var(--amber-soft)">Toutes tes démarches du jour sont choisies. Touche « demandé ✓ » pour en retirer une.</p>' : ''}`;
}

// ───── Écran ─────
export function renderTableau() {
  S.e2Rendu = false;
  const st = S.state, z = myZone();
  const aff = affaire(st, st.enquete.n);
  const dos = dossierDe(st, z);
  PROF = !!aff.prof;
  CONNUS = opposablesSet(aff, dos);
  const et = etatTab(aff, dos);
  BH = hauteurTableau(aff, et.t);
  const d = S.draft;
  const nbBoite = et.boite.length + et.fichesAFaire.length;
  const neuf = et.fichesAFaire.length || et.boite.some((p) => p.j >= st.enquete.jour - 1);
  const fil = S.tabMode === 'fil';
  // Pendant la visite guidée : ni le journal plein écran ni le tuto du tableau par-dessus.
  if (!tutoActif()) journalAuto(aff);
  if (S.tabTuto === undefined && !tutoTableauVu() && !tutoActif()) S.tabTuto = 0;
  const spot = S.tabTuto !== null && S.tabTuto !== undefined ? TUTO[S.tabTuto].spot : null;
  const sp = (k) => (spot === k ? 'tb-spot' : '');
  const traque = (st.traques || []).length;
  return `<main class="tb-ecran ${S.tabSheet ? 'volet-ouvert' : ''} ${S.ordersDirty ? 'sale' : ''}">
    <div id="tb-vp" class="tb-vp ${fil ? 'mode-fil' : ''}">
      <div id="tb-fond" class="tb-fond" style="width:${BW}px;height:${BH}px" aria-hidden="true"></div>
      <div id="tb-board" class="tb-board" style="width:${BW}px;height:${BH}px">
        <div class="tb-cadre"></div><div class="tb-liege"></div>
        <div class="tb-etiquette" data-tid="titre" style="left:${BW / 2 - 240}px"><span class="tb-scotch g"></span><span class="tb-scotch d"></span>
          <span class="tb-n">DOSSIER N° ${aff.n} · JOUR ${st.enquete.jour} / ${ENQ.dureeMax}</span><span class="tb-dossier">${esc(aff.titre.toUpperCase())}</span></div>
        <div class="tb-map" data-tid="plan" style="left:${MAP.x}px;top:${MAP.y}px;width:${MAP.w}px;height:${MAP.h}px">${planSvg(aff, aff.meurtre ? et.connus.has(aff.pieceHeure || 'c:legiste2') : et.t.fiches.includes('occ'))}
          ${['tl', 'tr', 'bl', 'br'].map((c) => `<span class="tb-mpin ${c}"></span>`).join('')}</div>
        ${elementsHtml(aff, dos, et)}
      </div>
    </div>
    <div class="tb-haut tb-ui">
      <button type="button" class="tb-chip" data-action="tab-ouvrir" data-tid="titre">J${st.enquete.jour}/${ENQ.dureeMax}<span class="tb-fic"> · ${et.t.liens.length} ficelle${et.t.liens.length > 1 ? 's' : ''}</span></button>
      ${sauvegardeCarnet(st.enquete.n) ? '<button type="button" class="tb-chip tb-pc" data-action="tab-restaurer" title="Remettre le tableau tel qu’il était sur cet appareil avant la dernière synchro">⟲ restaurer</button>' : ''}
      <button type="button" class="tb-chip ${S.carnetSync && S.carnetSync !== 'ok' && S.carnetSync !== 'encours' ? '' : 'tb-pc'}" data-action="tab-sync" aria-label="Synchroniser le tableau avec mes autres appareils" title="Synchroniser avec mes autres appareils" ${S.carnetSync && S.carnetSync !== 'ok' ? 'style="color:var(--red-soft)"' : ''}>${S.carnetSync === 'encours' ? '↻ …' : S.carnetSync && S.carnetSync !== 'ok' ? `⚠ non synchronisé${S.carnetSync === 'permission-denied' ? ' (règles Firebase)' : ''} · réessayer` : '↻'}</button>
      ${traque ? '<button type="button" class="tb-chip rouge" data-action="traque-voir">Traque en cours</button>' : ''}
      ${(() => { const recents = new Set((S.gazettes || []).slice(0, 3)); const x = debriefsRecents().find((d) => recents.has(d.g)); return x ? `<button type="button" class="tb-chip" data-action="debrief-ouvrir" data-id="${esc(x.id)}" title="Débrief de « ${esc(x.db.titre)} »">📂<span class="tb-fic"> Dossier clos</span></button>` : ''; })()}
      <span class="grow"></span>
      <button type="button" class="tb-rond" data-action="tab-vue" data-v="liste" aria-label="Affichage en liste">${icon('liste', 18)}</button>
      <button type="button" class="tb-chip ${sp('boite')}" data-action="tab-volet" data-k="boite" aria-label="Boîte à pièces, ${nbBoite} à ranger">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l2-5h14l2 5"/><rect x="3" y="9" width="18" height="11" rx="1.5"/><path d="M9 13h6"/></svg>${nbBoite}${neuf ? '<span class="tb-dot"></span>' : ''}</button>
      ${aff.coupsDePouce ? '<button type="button" class="tb-rond" data-action="tab-ouvrir" data-tid="pouce" aria-label="Coups de pouce" title="Coups de pouce">💡</button>' : ''}
      <button type="button" class="tb-chip ambre ${sp('soir')}" data-action="tab-volet" data-k="soir"><span class="tb-soir-l">Ce soir </span><span class="tb-compte">${(d.demarches || []).length}/${maxDemarchesDe(S.state, zoneAvecAgenda())}</span></button>
    </div>
    ${traque && S.banTraqueVue !== st.turn ? `<div class="tb-banniere">${banniereTraque(st, { tableau: true })}<button type="button" class="tb-rond tb-ban-x" data-action="tb-ban-fermer" aria-label="Fermer">✕</button></div>` : ''}
    <div id="tb-aide" class="tb-aide" ${fil ? '' : 'hidden'}>${S.tabFrom ? 'Touche l’élément à relier' : 'Glisse d’un élément à l’autre · touche une ficelle pour la couper'}</div>
    <div class="tb-outils tb-ui">
      <button type="button" class="tb-o ${fil ? '' : 'on'}" data-action="tab-mode" data-v="main" aria-label="Main : déplacer et ouvrir" aria-pressed="${!fil}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11V5a1.5 1.5 0 0 1 3 0v5M12 10V4a1.5 1.5 0 0 1 3 0v6M15 10V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2.5-4a1.5 1.5 0 0 1 2.5-1.6L9 13"/></svg></button>
      <button type="button" class="tb-o rouge ${fil ? 'on' : ''} ${sp('fil')}" data-action="tab-mode" data-v="fil" aria-label="Tirer une ficelle" aria-pressed="${fil}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M7 7.5c4 2 6 7 10 9"/></svg></button>
      <button type="button" class="tb-o" data-action="tab-ranger" aria-label="Ranger le tableau (tri automatique)" title="Ranger le tableau"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/></svg></button>
      <span class="tb-sep"></span>
      <button type="button" class="tb-o" data-action="tab-zoom" data-d="-1" aria-label="Dézoomer"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg></button>
      <button type="button" class="tb-o ${sp('fit')}" data-action="tab-fit" aria-label="Vue d’ensemble"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
      <button type="button" class="tb-o" data-action="tab-zoom" data-d="1" aria-label="Zoomer"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg></button>
      <button type="button" class="tb-o" data-action="tab-tuto" aria-label="Revoir le tuto du tableau">?</button>
    </div>
    ${volet(aff, dos, et)}
    ${S.journalOuvert === aff.n ? '' : tutoHtml()}
    ${journalHtml(aff)}
    ${sceneFouilleHtml(aff)}
  </main>${tabbar('enquete')}${sceneZoomHtml(aff)}`;
}

// ───── Contrôleur : déplacement, zoom, glisser, toucher ─────
let ctl = null;
const vpTaille = () => { const vp = document.getElementById('tb-vp'); return vp ? [vp.clientWidth, vp.clientHeight] : [390, 760]; };
function vueEnsemble() {
  const [w, h] = vpTaille();
  const s = Math.min(w / (BW + 80), (h - 140) / (BH + 80));
  return { s, tx: (w - BW * s) / 2, ty: 70 + (h - 140 - BH * s) / 2 };
}
/** Vue d'arrivée : le plan et les suspects, à une taille lisible. */
function vueDepart() {
  const [w] = vpTaille();
  const s = Math.min(0.55, w / 1150);
  return { s, tx: w / 2 - (BW / 2) * s, ty: 70 - 30 * s };
}
function appliquer(v, anim = false) {
  const b = document.getElementById('tb-board');
  if (!b) return;
  const tr = `translate(${v.tx}px,${v.ty}px) scale(${v.s})`;
  const tn = anim ? 'transform .35s cubic-bezier(.2,.8,.2,1)' : 'none';
  b.style.transition = tn;
  b.style.transform = tr;
  // Fond uni synchronisé : évite les carrés noirs pendant que le GSM peint les tuiles du tableau.
  const f = document.getElementById('tb-fond');
  if (f) { f.style.transition = tn; f.style.transform = tr; f.style.width = `${BW}px`; f.style.height = `${BH}px`; }
}
function borner(v) {
  const [w, h] = vpTaille();
  const s = Math.max(0.12, Math.min(2.2, v.s));
  const mx = w * 0.6, my = h * 0.6;
  return { s, tx: Math.min(mx, Math.max(w - BW * s - mx, v.tx)), ty: Math.min(my, Math.max(h - BH * s - my, v.ty)) };
}
function sauverVue() {
  const n = S.state.enquete.n, t = dispo(n);
  t.vue = S.tabV; ecrireDispo(n, t);
}
function zoomAutour(x, y, s2, anim) {
  const v = S.tabV;
  const bx = (x - v.tx) / v.s, by = (y - v.ty) / v.s;
  S.tabV = borner({ s: s2, tx: x - bx * s2, ty: y - by * s2 });
  appliquer(S.tabV, anim);
}

export function tableauZoom(d) { const [w, h] = vpTaille(); zoomAutour(w / 2, h / 2, S.tabV.s * (d > 0 ? 1.35 : 1 / 1.35), true); sauverVue(); }
export function tableauEnsemble() { S.tabV = vueEnsemble(); appliquer(S.tabV, true); sauverVue(); }

/** Cadre la vue sur un élément avant d'ouvrir son volet (l'élément reste visible au-dessus). */
function cadrer(id) {
  if (!document.getElementById('tb-vp')) return; // écran Enquête en dossier (saison 2) : pas de liège à cadrer
  const st = S.state, aff = affaire(st, st.enquete.n), t = dispo(aff.n);
  const [w0] = vpTaille();
  // Sur ordinateur, le volet s'ouvre à droite : on cadre dans la partie gauche.
  const w = window.matchMedia && window.matchMedia('(min-width: 1000px) and (hover: hover) and (pointer: fine)').matches ? w0 - 440 : w0;
  let v;
  if (id === 'plan' || (aff.prof && id.startsWith('L:'))) { const s = Math.min(1, (w - 20) / MAP.w); v = { s, tx: (w - MAP.w * s) / 2 - MAP.x * s, ty: 64 - MAP.y * s }; }
  else if (id === 'titre') return;
  else { if (!/^(s\d|c:|L:|P:|recit|chrono|une|scene|plainte|frise)/.test(id) && !t.places.includes(id)) return; const p = ancre(aff, t, id); if (!p) return; const s = Math.max(S.tabV.s, 0.85); v = { s, tx: w / 2 - p[0] * s, ty: 80 - p[1] * s }; }
  S.tabV = borner(v);
  appliquer(S.tabV, true);
  sauverVue();
}

export function ouvrirVolet(id, rerender, { partage = false } = {}) {
  const aff = affaire(S.state, S.state.enquete.n);
  if (aff.prof && id === 'une') { S.journalOuvert = aff.n; S.tabSheet = null; rerender(); return; }
  if (aff.prof && id.startsWith('L:')) S.tabRoute = { n: aff.n, a: id.slice(2), b: aff.pos, mode: (S.tabRoute && S.tabRoute.mode) || 'moteur' };
  if (aff.meurtre && id === 'scene') { S.sceneOuverte = aff.n; S.tabSheet = null; rerender(); return; }
  const k = id.startsWith('rec|') ? 'recoup' : id === 'hypo' ? 'hypo' : id === 'pouce' ? 'pouce' : id === 'frise' ? 'frise' : id.startsWith('Q:') ? 'reaud' : id.startsWith('X:') ? 'confront' : aff.prof && id === 'recit' ? 'doc' : id === 'titre' || id === 'recit' || id === 'chrono' ? 'faits' : id === 'une' || id === 'scene' || id === 'plainte' ? 'doc' : id === 'plan' ? 'plan' : id.startsWith('L:') ? 'lieu' : id.startsWith('P:') ? 'planque' : /^c:(occ|moy|mob)$/.test(id) ? 'c' : /^s\d$/.test(id) ? 's' : 'p';
  cadrer(id);
  S.tabSheet = { k, id, partage };
  if (!document.getElementById('tb-vp')) { rerender(); return; } // dossier (saison 2) : rien à cadrer
  setTimeout(rerender, id === 'titre' ? 0 : 280);
}

/** Pièce sortie de la boîte : punaisée au milieu de l'écran, à glisser ensuite. */
export function sortirPiece(f) {
  const n = S.state.enquete.n, t = dispo(n);
  const [w, h] = vpTaille();
  const v = S.tabV || vueDepart();
  const k = t.places.length % 5;
  const x = Math.max(100, Math.min(BW - 100, (w / 2 - v.tx) / v.s + (k - 2) * 30));
  const y = Math.max(60, Math.min(BH - 260, (h * 0.32 - v.ty) / v.s + (k % 2) * 24));
  t.pos[f] = [x, y];
  if (!t.places.includes(f)) t.places.push(f);
  if (!t.neuf.includes(f)) t.neuf.push(f);
  ecrireDispo(n, t);
}
/** Taille réelle d'un élément du tableau (mesurée à l'écran), ou estimée s'il n'y est pas encore. */
function tailleDe(id, grand = false) {
  const el = document.querySelector(`.tb-it[data-tid="${CSS.escape(id)}"]`);
  if (el && el.offsetHeight) { const sc = parseFloat(el.style.getPropertyValue('--sc')) || 1; return [el.offsetWidth * sc, el.offsetHeight * sc]; }
  return /^(recit|chrono|une|plainte)$/.test(id) ? [420, 600] : grand ? [280, 520] : [250, 330];
}

/** Punaise les éléments `ids` dans les coins libres (hors plan, documents, suspects et `garder`).
 *  `zone` classe les emplacements (le plus petit d'abord) ; à égalité : ligne par ligne si `lignes`, sinon colonne par colonne. */
function caser(aff, t, ids, garder, { grands = new Set(), zone = zoneSortie, lignes = false } = {}) {
  const MARGE = 22;
  const boite = (id, [x, y]) => { const [w, h] = tailleDe(id, grands.has(id)); return [x - w / 2 - MARGE, y - 26, x + w / 2 + MARGE, y + h + MARGE]; };
  const pris = [[MAP.x - 20, MAP.y - 20, MAP.x + MAP.w + 20, MAP.y + MAP.h + 20], [BW / 2 - 260, 0, BW / 2 + 260, 120]];
  const fixes = ['recit', 'chrono', ...aff.suspects.map((_, i) => `s${i}`), 'c:occ', 'c:moy', 'c:mob', ...(aff.carte ? ['une', 'scene', 'plainte'] : []), ...(aff.meurtre ? ['frise'] : []), ...garder].filter((id) => !ids.includes(id));
  for (const id of fixes) pris.push(boite(id, posDe(t, id)));
  const libre = (r) => r[0] >= 0 && r[2] <= BW && r[3] <= BH + 900 && !pris.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
  const a = [];
  for (let y = 50; y <= BH + 600; y += 20) for (let x = 150; x <= BW - 150; x += 290) a.push([x, y]);
  a.sort((p, q) => zone(p) - zone(q) || (lignes || zone(p) === 1 ? p[1] - q[1] || p[0] - q[0] : p[0] - q[0] || p[1] - q[1]));
  ids.forEach((f, i) => {
    const slot = a.find((c) => libre(boite(f, c)));
    t.pos[f] = slot || [BW / 2 + ((i % 5) - 2) * 40, BH - 400];
    if (slot) pris.push(boite(f, slot));
    if (!DOCS.includes(f) && !t.places.includes(f)) t.places.push(f);
  });
}
const DOCS = ['recit', 'chrono', 'une', 'scene', 'plainte'];
// Sortie de la boîte : d'abord à droite du plan, puis en bas, puis à gauche, enfin ce qui reste (et jamais sous le bord du tableau actuel).
const zoneSortie = ([x, y]) => (y > BH - 300 ? 9 : x > MAP.x + MAP.w && y >= MAP.y - 100 ? 0 : y >= 1700 ? 1 : x < MAP.x && y >= MAP.y ? 2 : 3);

/** « Tout sortir » : chaque pièce de la boîte et chaque fiche à compléter est punaisée dans un coin libre du tableau. */
export function toutSortir() {
  const st = S.state, aff = affaire(st, st.enquete.n);
  const et = etatTab(aff, dossierDe(st, myZone()));
  const t = et.t;
  for (const e of et.fichesAFaire) { if (!t.fiches.includes(e)) t.fiches.push(e); if (!t.neuf.includes(`c:${e}`)) t.neuf.push(`c:${e}`); }
  const ids = et.boite.map((p) => p.f);
  caser(aff, t, ids, t.places, { grands: new Set(et.boite.filter((p) => ['jn', 'au'].includes(typePiece(p, aff))).map((p) => p.f)) });
  for (const f of ids) if (!t.neuf.includes(f)) t.neuf.push(f);
  ecrireDispo(aff.n, t);
  return ids.length + et.fichesAFaire.length;
}

/** « Ranger » : toutes les pièces punaisées sont replacées proprement, groupées par suspect puis par jour.
 *  Les ficelles suivent (elles relient des éléments, pas des positions) ; aucune n'est ajoutée ni retirée. */
export function rangerTableau() {
  const st = S.state, aff = affaire(st, st.enquete.n);
  const et = etatTab(aff, dossierDe(st, myZone()));
  const t = et.t, fx = new Set(t.fixes);
  const bouge = (id) => !fx.has(id);
  const MARGE = 14;
  const jn = new Set(et.placees.filter((p) => ['jn', 'au'].includes(typePiece(p, aff))).map((p) => p.f));
  const boite = (id, [x, y]) => { const [w, h] = tailleDe(id, jn.has(id)); return [x - w / 2 - MARGE, y - 26, x + w / 2 + MARGE, y + h + MARGE]; };
  // 1. Le cadre : le récit en haut à gauche, la main courante en haut à droite, les fiches au-dessus du plan.
  if (bouge('recit')) t.pos.recit = [250, 60];
  if (bouge('chrono')) t.pos.chrono = [BW - 150, 60];
  for (const e of ELEMENTS) if (bouge(`c:${e}`)) t.pos[`c:${e}`] = DEF_POS[`c:${e}`].slice();
  const pris = [[MAP.x - 20, MAP.y - 20, MAP.x + MAP.w + 20, MAP.y + MAP.h + 20], [BW / 2 - 260, 0, BW / 2 + 260, 120]];
  const ajoute = (id) => pris.push(boite(id, posDe(t, id)));
  ['recit', 'chrono', 'c:occ', 'c:moy', 'c:mob', ...t.fixes].forEach(ajoute);
  const libre = (r) => r[0] >= 0 && r[2] <= BW && !pris.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
  // 2. Les suspects en colonnes de part et d'autre du plan (3 à gauche, 2 à droite), leurs pièces empilées sous la photo.
  const COLS = [175, 475, 775, MAP.x + MAP.w + 180, MAP.x + MAP.w + 480];
  const ORDRE = { A: -1, occ: 0, moy: 1, mob: 2 };
  const aSuspect = new Set();
  let bas = 0;
  aff.suspects.forEach((_, i) => {
    const x = COLS[i] ?? MAP.x + 150 + (i - COLS.length) * 290;
    const pile = [`s${i}`, ...et.placees.filter((p) => pieceSuspect(p.f) === i).sort((p, q) => ORDRE[p.f.split(':')[0]] - ORDRE[q.f.split(':')[0]] || p.j - q.j).map((p) => p.f)];
    let y = MAP.y;
    for (const id of pile) {
      if (id !== `s${i}`) aSuspect.add(id);
      if (!bouge(id)) continue;
      while (!libre(boite(id, [x, y])) && y < 5000) y += 20;
      t.pos[id] = [x, y]; ajoute(id);
      y += tailleDe(id, jn.has(id))[1] + 34;
      bas = Math.max(bas, y);
    }
  });
  // 3. Sous le plan : la une, la scène, la plainte, puis les planques et le reste, en lignes.
  const reste = [...(aff.carte ? ['une', 'scene', 'plainte'] : []), ...et.placees.filter((p) => !aSuspect.has(p.f)).map((p) => p.f)].filter(bouge);
  BH = Math.max(BH_MIN, bas + 60);
  const sousPlan = ([x, y]) => (y < MAP.y + MAP.h ? 5 : x >= MAP.x - 40 && x <= MAP.x + MAP.w + 40 ? 0 : 1);
  caser(aff, t, reste, [...aff.suspects.map((_, i) => `s${i}`), ...aSuspect, ...t.fixes], { grands: jn, zone: sousPlan, lignes: true });
  ecrireDispo(aff.n, t);
  return et.placees.length;
}
export function completerFiche(e) {
  const n = S.state.enquete.n, t = dispo(n);
  if (!t.fiches.includes(e)) t.fiches.push(e);
  const id = `c:${e}`;
  if (!t.neuf.includes(id)) t.neuf.push(id);
  ecrireDispo(n, t);
}
export function remettrePiece(f) {
  const n = S.state.enquete.n, t = dispo(n);
  t.places = t.places.filter((x) => x !== f);
  t.liens = t.liens.filter(([a, b]) => a !== f && b !== f);
  t.neuf = t.neuf.filter((x) => x !== f);
  t.fixes = t.fixes.filter((x) => x !== f);
  ecrireDispo(n, t);
}
/** Tire ou coupe une ficelle entre a et b. */
export function basculerFil(a, b) {
  const n = S.state.enquete.n, t = dispo(n);
  const k = t.liens.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
  t.liens = k >= 0 ? t.liens.filter((_, q) => q !== k) : [...t.liens, [a, b]];
  ecrireDispo(n, t);
}
/** Chronologie : place ou retire un événement sur la frise. */
export function basculerFrise(id) {
  const n = S.state.enquete.n, t = dispo(n);
  t.frise = t.frise.includes(id) ? t.frise.filter((x) => x !== id) : [...t.frise, id];
  ecrireDispo(n, t);
}
export function marquerTutoVu() { S.tutoTabVu = true; try { localStorage.setItem(TUTO_KEY, '1'); } catch (e) { /* pas de stockage */ } }

/** À appeler après chaque affichage de l'écran : branche les gestes sur le tableau. */
/** Barre du haut : on la resserre par paliers tant qu'elle déborde (petit écran, grande police système). */
function ajusterHaut() {
  const h = document.querySelector('.tb-haut');
  if (!h) return;
  h.classList.remove('serre1', 'serre2', 'serre3');
  for (const c of ['serre1', 'serre2', 'serre3']) { if (h.scrollWidth <= h.clientWidth + 1) break; h.classList.add(c); }
}
let ecouteHaut = false;

export function monterTableau(rerender) {
  const vp = document.getElementById('tb-vp');
  if (!vp) { ctl = null; return; }
  ajusterHaut();
  if (!ecouteHaut) { ecouteHaut = true; addEventListener('resize', ajusterHaut); if (document.fonts) document.fonts.ready.then(ajusterHaut).catch(() => {}); }
  const st = S.state, n = st.enquete.n;
  if (!S.tabV || S.tabVn !== n) { S.tabV = dispo(n).vue || vueDepart(); S.tabVn = n; }
  S.tabV = borner(S.tabV);
  appliquer(S.tabV);
  const pts = {};
  let g = null;
  const local = (e) => { const r = vp.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const board = document.getElementById('tb-board');
  const majFils = (id) => {
    const aff = affaire(st, n), t = dispo(n);
    if (g && g.t === 'item') t.pos[id] = g.pos;
    board.querySelectorAll('.tb-fil').forEach((el) => {
      if (el.dataset.a !== id && el.dataset.b !== id) return;
      const p1 = ancre(aff, t, el.dataset.a), p2 = ancre(aff, t, el.dataset.b);
      const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
      el.style.left = `${p1[0]}px`; el.style.top = `${p1[1]}px`; el.style.width = `${Math.hypot(dx, dy)}px`; el.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    });
    const nd = board.querySelector(`.tb-noeud[data-n="${CSS.escape(id)}"]`);
    if (nd && g && g.pos) { nd.style.left = `${g.pos[0]}px`; nd.style.top = `${g.pos[1]}px`; }
  };
  const reliable = (id) => !!id && id !== 'titre' && id !== 'plan';
  const basculerLien = (a, b) => { basculerFil(a, b); S.tabFrom = null; rerender(); };
  // Cible d'une ficelle : l'élément sous le doigt, sinon la punaise la plus proche (aimantée à 70 px).
  const cibleSous = (cx, cy, from) => {
    const sous = document.elementFromPoint(cx, cy);
    const el = sous && sous.closest && sous.closest('[data-tid]');
    if (el && reliable(el.dataset.tid) && el.dataset.tid !== from && board.contains(el)) return el;
    const r = vp.getBoundingClientRect(), v = S.tabV;
    let best = null, dmin = 70;
    board.querySelectorAll('.tb-it[data-tid], .tb-lieu[data-tid], .tb-planque[data-tid]').forEach((x) => {
      const id = x.dataset.tid;
      if (!reliable(id) || id === from) return;
      const p = ancre(affaire(st, n), dispo(n), id);
      if (!p) return;
      const d = Math.hypot(r.left + v.tx + p[0] * v.s - cx, r.top + v.ty + p[1] * v.s - cy);
      if (d < dmin) { dmin = d; best = x; }
    });
    return best;
  };
  const majFilTmp = (gg) => {
    const v = S.tabV;
    const p1 = gg.p1, bx = (gg.x - v.tx) / v.s, by = (gg.y - v.ty) / v.s;
    let p2 = [bx, by];
    if (gg.cible) { const q = ancre(affaire(st, n), dispo(n), gg.cible); if (q) p2 = q; }
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    Object.assign(gg.tmp.style, { left: `${p1[0]}px`, top: `${p1[1]}px`, width: `${Math.hypot(dx, dy)}px`, transform: `rotate(${Math.atan2(dy, dx)}rad)` });
  };
  // Pendant qu'on tire une ficelle, le tableau défile tout seul quand le doigt approche du bord.
  const defileBord = () => {
    if (!g || g.t !== 'fil') return;
    const [w, h] = vpTaille(), m = 56;
    let dx = 0, dy = 0;
    if (g.x < m) dx = (m - g.x) / 4; else if (g.x > w - m) dx = -(g.x - (w - m)) / 4;
    if (g.y < m + 50) dy = (m + 50 - g.y) / 4; else if (g.y > h - m - 90) dy = -(g.y - (h - m - 90)) / 4;
    if (dx || dy) { S.tabV = borner({ s: S.tabV.s, tx: S.tabV.tx + dx, ty: S.tabV.ty + dy }); appliquer(S.tabV); majFilTmp(g); }
    g.raf = requestAnimationFrame(defileBord);
  };
  const fin = () => {
    const gg = g; g = null;
    if (!gg) return;
    if (gg.t === 'item' && gg.moved) {
      const t = dispo(n);
      t.pos[gg.id] = gg.pos; t.neuf = t.neuf.filter((x) => x !== gg.id);
      ecrireDispo(n, t);
      gg.el.classList.remove('tb-drag');
      const tag = gg.el.querySelector('.tb-neuf'); if (tag) tag.remove();
      return;
    }
    if (gg.t === 'fil') {
      cancelAnimationFrame(gg.raf);
      if (gg.tmp) gg.tmp.remove();
      if (gg.cibleEl) gg.cibleEl.classList.remove('tb-cible');
      if (gg.fromEl) gg.fromEl.classList.remove('tb-cible');
      if (gg.moved) {
        if (gg.cible) basculerLien(gg.from, gg.cible);
        else sauverVue();
        return;
      }
    }
    if (gg.t === 'arrache') {
      gg.segs.forEach((x) => x.remove());
      gg.el.style.visibility = '';
      // Ficelle tirée loin de sa ligne : elle se décroche. Un simple toucher la coupe en mode ficelle.
      if (gg.casse || (!gg.moved && S.tabMode === 'fil')) basculerLien(gg.a, gg.b);
      else if (gg.moved) sauverVue();
      return;
    }
    if (gg.moved) { sauverVue(); return; }
    // Un simple toucher.
    const id = gg.tid;
    if (S.tabMode === 'fil') {
      if (!id || id === 'titre' || id === 'plan') return;
      if (!S.tabFrom) { S.tabFrom = id; rerender(); return; }
      if (S.tabFrom === id) { S.tabFrom = null; rerender(); return; }
      basculerLien(S.tabFrom, id);
      return;
    }
    if (id) { ouvrirVolet(id, rerender, { partage: !!gg.share }); return; }
    if (S.tabSheet) { S.tabSheet = null; rerender(); }
  };
  vp.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.tb-ui')) return;
    const [x, y] = local(e);
    pts[e.pointerId] = [x, y];
    try { vp.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
    const ids = Object.values(pts);
    if (ids.length >= 2) {
      const [a, b] = ids, v = S.tabV;
      if (g && g.el) g.el.classList.remove('tb-drag');
      if (g && g.t === 'arrache') { g.segs.forEach((x) => x.remove()); g.el.style.visibility = ''; }
      if (g && g.t === 'fil') { cancelAnimationFrame(g.raf); if (g.tmp) g.tmp.remove(); if (g.fromEl) g.fromEl.classList.remove('tb-cible'); if (g.cibleEl) g.cibleEl.classList.remove('tb-cible'); }
      g = { t: 'pinch', moved: true, d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, s0: v.s, bx: ((a[0] + b[0]) / 2 - v.tx) / v.s, by: ((a[1] + b[1]) / 2 - v.ty) / v.s };
      return;
    }
    // Une punaise passe avant une ficelle qui la recouvre.
    const sous = document.elementsFromPoint ? document.elementsFromPoint(e.clientX, e.clientY) : [e.target];
    const punaise = sous.find((x) => x.matches && x.matches('.tb-pin, .tb-lieu-pt'));
    const fil = punaise ? null : e.target.closest('.tb-fil:not(.tb-fil-tmp)');
    if (fil) {
      const aff = affaire(st, n), t = dispo(n);
      g = { t: 'arrache', a: fil.dataset.a, b: fil.dataset.b, el: fil, p1: ancre(aff, t, fil.dataset.a), p2: ancre(aff, t, fil.dataset.b), sx: x, sy: y, segs: [], casse: false, moved: false };
      return;
    }
    const el = (punaise || (e.target.closest('.tb-fil') ? sous.find((x) => x.closest && x.closest('[data-tid]') && !x.closest('.tb-fil')) : e.target) || e.target).closest('[data-tid]');
    const tid = el ? el.dataset.tid : null;
    const mobile = el && el.classList.contains('tb-it');
    const surPunaise = !!punaise;
    if (reliable(tid) && (S.tabMode === 'fil' || surPunaise)) {
      // Tirer une ficelle : en mode ficelle depuis n'importe quel élément, ou depuis une punaise en mode main.
      const tmp = document.createElement('span');
      tmp.className = 'tb-fil tb-fil-tmp';
      board.appendChild(tmp);
      el.classList.add('tb-cible');
      g = { t: 'fil', from: tid, fromEl: el, tid, sx: x, sy: y, x, y, p1: ancre(affaire(st, n), dispo(n), tid), tmp, cible: null, cibleEl: null, moved: false };
      return;
    }
    if (mobile && S.tabMode !== 'fil' && !dispo(n).fixes.includes(tid)) {
      const p = posDe(dispo(n), tid);
      g = { t: 'item', id: tid, tid, el, share: !!e.target.closest('.tb-share'), sx: x, sy: y, ox: p[0], oy: p[1], pos: p, moved: false };
    } else {
      g = { t: 'pan', tid, sx: x, sy: y, tx0: S.tabV.tx, ty0: S.tabV.ty, moved: false };
    }
  });
  vp.addEventListener('pointermove', (e) => {
    if (!g || !(e.pointerId in pts)) return;
    const [x, y] = local(e);
    pts[e.pointerId] = [x, y];
    if (!g.moved && Math.hypot(x - g.sx, y - g.sy) > 7) g.moved = true;
    if (!g.moved) return;
    if (g.t === 'pinch') {
      const [a, b] = Object.values(pts);
      if (!b) return;
      const s = Math.max(0.12, Math.min(2.2, g.s0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / g.d0));
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      S.tabV = borner({ s, tx: mx - g.bx * s, ty: my - g.by * s });
      appliquer(S.tabV);
    } else if (g.t === 'pan') {
      S.tabV = borner({ s: S.tabV.s, tx: g.tx0 + x - g.sx, ty: g.ty0 + y - g.sy });
      appliquer(S.tabV);
    } else if (g.t === 'arrache') {
      // La ficelle suit le doigt, accrochée à ses deux punaises ; au-delà de 45 px de sa ligne, elle lâche.
      const v = S.tabV, f = [(x - v.tx) / v.s, (y - v.ty) / v.s];
      if (!g.segs.length) {
        g.el.style.visibility = 'hidden';
        for (let k = 0; k < 2; k++) { const sg = document.createElement('span'); sg.className = 'tb-fil tb-fil-tire'; board.appendChild(sg); g.segs.push(sg); }
      }
      const [a, b] = [g.p1, g.p2];
      const lx = b[0] - a[0], ly = b[1] - a[1], l2 = lx * lx + ly * ly || 1;
      const u = Math.max(0, Math.min(1, ((f[0] - a[0]) * lx + (f[1] - a[1]) * ly) / l2));
      const dist = Math.hypot(f[0] - (a[0] + u * lx), f[1] - (a[1] + u * ly)) * v.s;
      g.casse = dist > 45;
      [[a, f], [f, b]].forEach(([p, q], k) => {
        const dx = q[0] - p[0], dy = q[1] - p[1];
        Object.assign(g.segs[k].style, { left: `${p[0]}px`, top: `${p[1]}px`, width: `${Math.hypot(dx, dy)}px`, transform: `rotate(${Math.atan2(dy, dx)}rad)` });
        g.segs[k].classList.toggle('casse', g.casse);
      });
    } else if (g.t === 'fil') {
      g.x = x; g.y = y;
      const c = cibleSous(e.clientX, e.clientY, g.from);
      const cid = c ? c.dataset.tid : null;
      if (cid !== g.cible) {
        if (g.cibleEl) g.cibleEl.classList.remove('tb-cible');
        g.cible = cid; g.cibleEl = c;
        if (c) { c.classList.add('tb-cible'); if (navigator.vibrate) try { navigator.vibrate(8); } catch (err) { /* rien */ } }
      }
      majFilTmp(g);
      if (!g.raf) g.raf = requestAnimationFrame(defileBord);
    } else if (g.t === 'item') {
      const s = S.tabV.s;
      const nx = Math.max(40, Math.min(BW - 40, g.ox + (x - g.sx) / s));
      const ny = Math.max(20, Math.min(BH - 300, g.oy + (y - g.sy) / s));
      g.pos = [nx, ny];
      const w = parseFloat(g.el.style.width);
      g.el.style.left = `${nx - w / 2}px`; g.el.style.top = `${ny + 7}px`;
      g.el.classList.add('tb-drag');
      majFils(g.id);
    }
  });
  const leve = (e) => {
    delete pts[e.pointerId];
    if (Object.keys(pts).length) {
      if (g && g.t === 'pinch') { const [x, y] = Object.values(pts)[0]; g = { t: 'pan', moved: true, sx: x, sy: y, tx0: S.tabV.tx, ty0: S.tabV.ty }; }
      return;
    }
    fin();
  };
  vp.addEventListener('pointerup', leve);
  vp.addEventListener('pointercancel', leve);
  vp.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [x, y] = local(e);
    zoomAutour(x, y, S.tabV.s * (e.deltaY < 0 ? 1.12 : 1 / 1.12), false);
    clearTimeout(ctl); ctl = setTimeout(sauverVue, 400);
  }, { passive: false });
}

