// Tableau d'enquête : un grand liège où le joueur punaise lui-même les pièces de l'affaire.
// Le plan du district au centre, les fiches de constatation en haut, les photos des suspects,
// une boîte d'où l'on sort les pièces une à une, et des ficelles que l'on tire soi-même.
// Rien n'est rangé d'avance : la disposition, les ficelles et la vue sont gardées sur l'appareil.
import { S, esc, icon, tabbar, myZone, zoneName } from './common.js';
import { hashString } from '../engine/rng.js';
import { portraitSuspect } from './portrait.js';
import {
  ENQ, ELEMENTS, ELEMENT_NOM, DEMARCHES, SOURCES, CARTE, trajet, hm, affaire, dossierDe, texteFait, titrePiece,
  ficheSuspect, fichePlanque, rebondsPublies, dejaPartagee, pointsDecouverte, dansMaCellule, zonesDuSuspect,
} from '../engine/enquete.js';
import { lireCarnet, ecrireCarnet, demBtn, partageCtl, sourceDe, voisinageInfo, appuiHtml, coutTotal } from './enquete.js';

// ───── Dimensions du tableau ─────
// Version 2 : tableau élargi (2 800 de large) ; les dispositions de la version 1 sont décalées de 600 vers la droite.
const BW = 2800, BH = 2200, DECALAGE_V2 = 600;
const MAP = { x: 960, y: 400, w: 880, h: 900 };
// Planques : placées sur la bonne rive du canal (nord au-dessus, sud en dessous), d'après leur fiche.
const PLANQUE_POS = {
  'Cave du bistrot': [600, 505], 'Entrepôt frigorifique': [780, 110], 'Grenier d’une ferme': [115, 70], 'Parking souterrain': [335, 420],
  'Atelier désaffecté': [630, 205], 'Galerie de l’ancienne mine': [120, 255], 'Chambre sous les toits': [225, 365],
  'Péniche amarrée': [495, 665], 'Box de garage n° 12': [300, 705], 'Lavoir couvert': [450, 785], 'Ancien cinéma': [740, 725],
  'Serre abandonnée': [135, 815], 'Local de chaufferie': [620, 840], 'Cabanon de jardin': [300, 860], 'Laverie fermée': [790, 850],
};
const planquePos = (p) => PLANQUE_POS[p.nom] || (p.rive === 'sud' ? [440, 760] : [440, 470]);
const COL = { occ: '#2F6FD3', moy: '#C88A12', mob: '#C2302B' };
const PINS = { r: ['#FF9A93', '#D32F2F', '#7A1010'], b: ['#9CC8FF', '#2F6FD3', '#123B7A'], y: ['#FFE59A', '#E8A800', '#7A5600'], g: ['#A8F0C6', '#2E9E62', '#11502E'], w: ['#FFFFFF', '#D8D2C4', '#7D7566'] };
const PIN_EL = { occ: 'b', moy: 'y', mob: 'r' };
const DEF_POS = {
  recit: [600, 230], chrono: [2220, 220],
  'c:occ': [1080, 190], 'c:moy': [1400, 170], 'c:mob': [1720, 190],
  s0: [760, 1460], s1: [1080, 1450], s2: [1400, 1460], s3: [1720, 1450], s4: [2040, 1460],
};
const TUTO_KEY = 'mazp-tuto-tableau';

// ───── Disposition gardée sur l'appareil (dans le carnet de l'affaire) ─────
function dispo(n) {
  const c = lireCarnet(n);
  const t = c.tab || {};
  let pos = t.pos || {}, vue = t.vue || null;
  if (c.tab && t.v !== 3) {
    // v1 → v2 : tableau élargi (décalage à droite) ; v2 → v3 : plan agrandi vers le bas (on descend ce qui était dessous).
    pos = Object.fromEntries(Object.entries(pos).map(([k, [x, y]]) => [k, [x + (t.v === 2 ? 0 : DECALAGE_V2), y > 1080 ? y + 220 : y]]));
    vue = null;
  }
  return { v: 3, pos, liens: t.liens || [], places: t.places || [], fiches: t.fiches || [], neuf: t.neuf || [], vue };
}
function ecrireDispo(n, t) { const c = lireCarnet(n); c.tab = t; ecrireCarnet(n, c); }

const posDe = (t, id) => t.pos[id] || DEF_POS[id] || [BW / 2, BH / 2];
const rotDe = (id) => ((hashString(id) % 9) - 4) * 0.8;
const lieuPos = (k) => { const l = CARTE.lieux[k]; return [MAP.x + l.x, MAP.y + l.y]; };
const pieceSuspect = (f) => (/^(occ|moy|mob):\d$/.test(f) ? Number(f.split(':')[1]) : null);

/** Point d'accroche (la punaise) d'un élément du tableau. */
function ancre(aff, t, id) {
  if (id.startsWith('L:')) { const k = id.slice(2); return CARTE.lieux[k] ? lieuPos(k) : null; }
  if (id.startsWith('P:')) { const p = aff.planques[Number(id.slice(2))]; if (!p) return null; const [x, y] = planquePos(p); return [MAP.x + x, MAP.y + y]; }
  return posDe(t, id);
}

// ───── Résumés des constatations (titres des fiches) ─────
function resumeConstat(aff, e) {
  if (e === 'occ') return `Entrée ${hm(aff.heure)} · sortie ${hm(aff.fin)}`;
  if (e === 'moy') return { cle: 'Une vraie clé, sans effraction', code: 'Le bon code d’alarme, du premier coup', volume: 'Un utilitaire : 300 kg en un voyage' }[aff.req.moy];
  return { argent: 'L’argent, et vite', vengeance: 'La rancune envers la victime', commande: 'Une commande pour un receleur' }[aff.req.mob];
}
const CONSTAT_DEM = { occ: 'cam', moy: 'labo', mob: 'temoin' };
const CONSTAT_TITRE = { occ: 'L’heure exacte', moy: 'Comment on est entré', mob: 'Pourquoi on a volé' };

// ───── Objets : chaque pièce a son support ─────
function typePiece(p) {
  if (p.src === 'rebond') return 'jn';
  const k = p.f.split(':')[0];
  return { occ: 'tk', moy: 'sc', mob: 'rv', p: 'lb' }[k] || 'lb';
}
const LARG = { tk: 150, sc: 150, rv: 160, lb: 150, jn: 170 };
const ENTETE = { tk: 'Vérification d’alibi', sc: 'Scellé · moyens', rv: 'Comptes et entourage', lb: 'Rapport · planque', jn: 'La Gazette du Delta' };

/** Où en est le partage d'une pièce : reçue, connue de tous, prévue ce soir, déjà partagée ou gardée pour soi. */
function statutPartage(p) {
  const st = S.state, d = S.draft || {};
  const nom = (u) => (st.zones[u] ? zoneName(st.zones[u]) : 'une zone');
  if (p.src === 'partage') return { k: 'recue', txt: `Reçue de ${p.de ? nom(p.de) : 'une zone'}` };
  if (p.src === 'ouverture' || p.src === 'rebond') return { k: 'tous', txt: 'Connue de toutes les zones' };
  const prevu = (d.partages || []).filter((x) => x.f === p.f);
  if (prevu.length) return { k: 'prevu', txt: `Partage ce soir : ${prevu.map((x) => (x.a === '*' ? 'toutes les zones' : nom(x.a))).join(', ')}` };
  const deja = [...dejaPartagee(st, S.user.uid, p.f)].filter((u) => st.zones[u]);
  if (deja.length) return { k: 'faite', txt: `Partagée avec ${deja.map(nom).join(', ')}` };
  return { k: 'gardee', txt: 'Gardée pour toi' };
}

/** Main courante de l'affaire : ce qui s'est passé, jour après jour. */
function chronologie(aff, dos) {
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

function objetPiece(aff, p, rebonds) {
  const ty = typePiece(p);
  const i = pieceSuspect(p.f);
  const qui = i !== null ? aff.suspects[i].nom.toUpperCase() : '';
  const lignes = texteFait(aff, p.f).split('\n').map((l) => `<p>${esc(l)}</p>`).join('');
  const sp = statutPartage(p);
  // Petit bouton de partage dans le coin : sa couleur dit où en est la pièce, un toucher ouvre les options.
  const tampon = sp.k === 'tous' ? '' : `<span class="tb-share tb-t-${sp.k}" title="${esc(sp.txt)}" aria-label="Partage : ${esc(sp.txt)}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>${sp.k === 'prevu' ? '<i>ce soir</i>' : ''}</span>`;
  if (ty === 'jn') {
    const r = rebonds.find((x) => x.f === p.f);
    return `<div class="tb-obj tb-jn"><span class="tb-k">${ENTETE.jn} · J${p.j}</span><strong>${esc(r ? r.titre : titrePiece(aff, p.f))}</strong>${r && r.texte ? `<p class="tb-chapo">${esc(r.texte)}</p>` : ''}<div class="tb-txt">${lignes}</div></div>`;
  }
  if (ty === 'sc') return `<div class="tb-obj tb-sc"><span class="tb-bande"></span><span class="tb-k">${ENTETE.sc}${qui ? ` · ${esc(qui)}` : ''}</span><div class="tb-txt">${lignes}</div>${tampon}</div>`;
  return `<div class="tb-obj tb-${ty}"><span class="tb-k">${ENTETE[ty]}${qui ? ` · ${esc(qui)}` : ''} · J${p.j}</span><div class="tb-txt">${lignes}</div>${tampon}</div>`;
}

function pinHtml(c) {
  const [hi, mi, lo] = PINS[c];
  return `<span class="tb-pin" style="background:radial-gradient(circle at 35% 30%,${hi},${mi} 45%,${lo})"></span>`;
}

// ───── Plan du district ─────
function planSvg(aff, connusOcc) {
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
function etatTab(aff, dos) {
  const t = dispo(aff.n);
  const pieces = dos.pieces.filter((p) => !p.f.startsWith('c:'));
  const connus = new Set(dos.pieces.map((p) => p.f));
  const placees = pieces.filter((p) => t.places.includes(p.f));
  const boite = pieces.filter((p) => !t.places.includes(p.f));
  const fichesAFaire = ELEMENTS.filter((e) => connus.has(`c:${e}`) && !t.fiches.includes(e));
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
    return `<div class="tb-it ${cls} ${sel === id ? 'tb-sel' : ''} ${S.tabFrom === id ? 'tb-from' : ''}" data-tid="${esc(id)}" style="left:${x - w / 2}px;top:${y + 7}px;width:${w}px;--r:${rotDe(id)}deg;--sc:${sc}">${inner}${pinHtml(pin)}${t.neuf.includes(id) ? '<span class="tb-neuf">NOUVEAU</span>' : ''}</div>`;
  };
  // Fiches de constatation.
  for (const e of ELEMENTS) {
    const faite = t.fiches.includes(e);
    const attente = connus.has(`c:${e}`) && !faite;
    out.push(wrap(`c:${e}`, 124, 1.7, `<div class="tb-obj tb-fiche" style="--c:${COL[e]}"><span class="tb-k">${ELEMENT_NOM[e]} · ${CONSTAT_TITRE[e]}</span><span class="tb-main">${faite ? esc(resumeConstat(aff, e)) : attente ? 'Résultat dans ta boîte' : '???'}</span></div>`, PIN_EL[e]));
  }
  // Procès-verbal d'ouverture : le récit de l'affaire, toujours au tableau.
  out.push(wrap('recit', 210, 1.6, `<div class="tb-obj tb-pv"><span class="tb-pv-bande">POLICE · DISTRICT DELTA</span><span class="tb-k">Procès-verbal d’ouverture · affaire n° ${aff.n}</span><strong>${esc(aff.titre)}</strong><div class="tb-txt"><p>${esc(aff.recit)}</p></div><span class="tb-k">Plaignant${/^la /.test(aff.vic) ? 'e' : ''} : ${esc(aff.vic)} · butin : ${esc(aff.butin)}</span></div>`, 'w'));
  // Main courante : l'enquête jour après jour.
  const chrono = chronologie(aff, dos);
  out.push(wrap('chrono', 190, 1.6, `<div class="tb-obj tb-chrono"><span class="tb-spirale"></span><span class="tb-k">Main courante · jour ${j} sur ${ENQ.dureeMax}</span>${chrono.slice(-14).map((l) => `<p class="tb-mc tb-mc-${l.k}"><b>J${l.j}</b> ${esc(l.t)}</p>`).join('')}${j < ENQ.dureeMax ? `<p class="tb-mc tb-mc-attente"><b>J${j}</b> … résultats ce soir à 20:00</p>` : ''}</div>`, 'r'));
  // Photos des suspects.
  aff.suspects.forEach((s, i) => {
    const marks = ELEMENTS.map((e) => carnet.g[`${i}:${e}`] || 0);
    const exclu = marks.includes(2);
    const accuse = d.accusation === i || dos.accuse === i;
    const soir = (d.demarches || []).some((x) => x.endsWith(`:${i}`)) || d.piste === i;
    const past = ELEMENTS.map((e, k) => `<span class="tb-past" style="--c:${COL[e]}" data-v="${marks[k]}">${['', '✓', '✕'][marks[k]]}</span>`).join('');
    out.push(wrap(`s${i}`, 90, 1.9, `<div class="tb-obj tb-polo">${portraitSuspect(s, i)}<span class="tb-prenom">${esc(s.prenom)}</span><span class="tb-role">${esc(s.role)} · ${s.age} ans</span><span class="tb-pasts">${past}</span>
      ${exclu ? '<span class="tb-exclu">EXCLU</span>' : ''}${accuse ? '<span class="tb-accuse"></span>' : ''}${soir ? '<span class="tb-cesoir">ce soir</span>' : ''}</div>`, 'r'));
  });
  // Pièces punaisées.
  for (const p of et.placees) {
    const ty = typePiece(p);
    out.push(wrap(p.f, LARG[ty], 1.6, objetPiece(aff, p, rebonds), ty === 'jn' ? 'w' : PIN_EL[p.f.split(':')[0]] || 'g', `tb-p-${ty}`));
  }
  // Lieux déclarés, punaisés sur le plan.
  const declares = [...new Set(aff.suspects.filter((s) => s.alibi.type !== 'seul').map((s) => s.alibi.pos))];
  for (const k of declares) {
    const l = CARTE.lieux[k];
    const [x, y] = lieuPos(k);
    const id = `L:${k}`;
    out.push(`<div class="tb-lieu ${sel === id ? 'tb-sel' : ''} ${S.tabFrom === id ? 'tb-from' : ''} ${l.loin ? 'loin' : ''}" data-tid="${id}" style="left:${x}px;top:${y}px"><span class="tb-lieu-pt"></span><span class="tb-lieu-nom">${esc(l.nom)}</span></div>`);
  }
  // Planques possibles, punaisées sur leur rive, avec la marque du joueur.
  aff.planques.forEach((p, i) => {
    const [px, py] = planquePos(p);
    const id = `P:${i}`, m = carnet.p[i] || 0;
    out.push(`<div class="tb-planque m${m} ${sel === id ? 'tb-sel' : ''} ${S.tabFrom === id ? 'tb-from' : ''}" data-tid="${id}" style="left:${MAP.x + px}px;top:${MAP.y + py}px"><span class="tb-lieu-pt"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 11l8-6 8 6v8H4z" fill="currentColor"/></svg></span><span class="tb-lieu-nom">${esc(p.nom)}</span><span class="tb-pmark">${['', '✕', '?', '●'][m]}</span></div>`);
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
        <span class="tb-ligne-k">${ELEMENT_NOM[e]}</span>
        <span class="tiny muted">Il fallait : <span style="color:var(--text2)">${constat ? esc(resumeConstat(aff, e)) : 'pas encore constaté'}</span></span>
        ${connu ? `<p class="small tb-fait">${esc(texteFait(aff, f)).replace(/\n/g, '<br>')}</p>` : '<span class="small" style="color:var(--faint)">Rien au dossier.</span>'}
        ${connu ? '' : demBtn(aff, dos, `${dk}:${i}`, { occ: 'Vérifier son alibi', moy: 'Vérifier ses moyens', mob: 'Vérifier son mobile' }[e], { compact: true })}
      </div>
      <button type="button" class="tb-mark" data-v="${v}" data-action="mmo-mark" data-i="${i}" data-e="${e}" aria-label="${ELEMENT_NOM[e]} de ${esc(s.nom)} : ${['pas encore établi', 'établi', 'exclu'][v]}. Changer">${['·', '✓', '✕'][v]}</button>
    </div>`;
  }).join('');
  const surPiste = d.piste === i;
  const accuse = d.accusation === i;
  let acc = '';
  if (dos.exclu) acc = '<span class="tiny muted">Ton accusation a été rejetée : tu ne peux plus accuser sur cette affaire.</span>';
  else if (dos.accuse !== null && dos.accuse !== undefined) acc = '<span class="tiny muted">Accusation transmise au parquet.</span>';
  else acc = accuse ? '<button type="button" class="btn ghost small" data-action="accuser-annuler">Retirer l’accusation</button>' : `<button type="button" class="btn outline small" data-action="accuser" data-i="${i}" style="border-color:var(--red-line);color:var(--red-soft)">Accuser ${esc(s.prenom)}</button>`;
  const suivi = zonesDuSuspect(st, i).filter((u) => u !== S.user.uid && st.zones[u]);
  return `<div class="tb-tete">${portraitSuspect(s, i, 'tb-face tb-mini')}
      <div class="col" style="gap:2px;min-width:0"><span class="tb-titre">${esc(s.nom)}</span><span class="tiny muted">${esc(fiche.lien)}</span>
      ${multi ? `<span class="tiny ${mien ? 'good' : 'muted'}">${mien ? 'ta cellule' : 'autre cellule : vérifications au double'}</span>` : ''}</div></div>
    <p class="small tb-fiche-pub">${esc(fiche.declaration)}<br>${fiche.trajet ? `<strong>${esc(fiche.trajet)}</strong><br>` : ''}${esc(fiche.vehicule)}<br><span class="muted">${esc(fiche.rumeur)}</span></p>
    ${lignes}
    <div class="tb-duo">
      <button type="button" class="btn small ${surPiste ? 'primary' : 'outline'}" data-action="piste" data-i="${i}" aria-pressed="${surPiste}">${surPiste ? '✓ Piste prioritaire' : 'Piste prioritaire (gratuit)'}</button>
      ${acc}
    </div>
    ${!mien && suivi.length ? `<div class="row" style="gap:6px;flex-wrap:wrap"><span class="tiny muted">Suivi aussi par :</span>${suivi.map((u) => `<button type="button" class="btn small" data-action="ecrire-a" data-uid="${esc(u)}">✉ ${esc(st.zones[u].nom)}</button>`).join('')}</div>` : ''}`;
}

function voletConstat(aff, dos, e, et) {
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
  const p = dos.pieces.find((x) => x.f === f);
  if (!p) return '<p class="small muted">Cette pièce n’est plus au dossier.</p>';
  const i = pieceSuspect(f);
  const partageBloc = `    <div class="tb-partage tb-t-${statutPartage(p).k}">
      <span class="tb-ligne-k">Partage</span>
      <span class="small" style="font-weight:600">${esc(statutPartage(p).txt)}</span>
      ${statutPartage(p).k === 'tous' ? '' : `${partageCtl(p)}
      <span class="tiny muted">Partager rapporte des PS et de la réputation, et des points d’enquête si ta pièce aide une zone à trouver l’auteur. ${ENQ.maxPartages} partages par soir au plus.</span>`}
    </div>`;
  return `${S.tabSheet && S.tabSheet.partage ? partageBloc : ''}<span class="tb-ligne-k" style="color:var(--amber)">${esc(titrePiece(aff, f))}</span>
    <span class="tiny muted">J${p.j} · ${sourceDe(p)}</span>
    <p class="small tb-fait">${esc(texteFait(aff, f)).replace(/\n/g, '<br>')}</p>
    ${S.tabSheet && S.tabSheet.partage ? '' : partageBloc}
    <div class="tb-duo">${i !== null ? `<button type="button" class="btn small" data-action="tab-ouvrir" data-tid="s${i}">Voir ${esc(aff.suspects[i].prenom)}</button>` : ''}
    ${dispo(aff.n).places.includes(f) ? `<button type="button" class="btn small ghost" data-action="tab-remettre" data-f="${esc(f)}">Remettre dans la boîte</button>` : `<button type="button" class="btn small primary" data-action="tab-sortir" data-f="${esc(f)}">Sortir de la boîte</button>`}</div>`;
}

function voletLieu(aff, k, et) {
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
  const declares = [...new Set(aff.suspects.filter((s) => s.alibi.type !== 'seul').map((s) => s.alibi.pos))];
  return `<span class="tb-titre">Plan du district</span>
    <p class="small muted" style="margin:0">Croix rouge : ${esc(aff.lieu)}.${aff.carte ? ' Les pointillés donnent le temps de trajet jusqu’aux lieux où les suspects disent avoir été.' : ''}</p>
    ${declares.map((k) => `<button type="button" class="tb-trajet-l" data-action="tab-ouvrir" data-tid="L:${k}"><span>${esc(CARTE.lieux[k].nom)}</span><span class="tiny muted">${aff.suspects.filter((s) => s.alibi.type !== 'seul' && s.alibi.pos === k).map((s) => esc(s.prenom)).join(', ')}</span>${aff.carte ? `<strong>${trajet(aff.pos, k)} min</strong>` : ''}</button>`).join('')}
    ${et.connus.has('c:occ') ? `<p class="tiny muted" style="margin:0">Rappel des caméras : entrée à ${hm(aff.heure)}, sortie à ${hm(aff.fin)}.</p>` : '<p class="tiny muted" style="margin:0">L’heure exacte des faits viendra des caméras.</p>'}`;
}

function voletFaits(aff) {
  const j = S.state.enquete.jour;
  return `<span class="tb-ligne-k" style="color:var(--amber)">Affaire n° ${aff.n} · jour ${j} sur ${ENQ.dureeMax}</span><span class="tb-titre">${esc(aff.titre)}</span>
    <p class="small" style="margin:0;color:var(--text2);line-height:1.5">${esc(aff.recit)}</p>
    <span class="pill amber" style="align-self:flex-start">Découverte ce soir : ${pointsDecouverte(j)} pts</span>
    ${rebondsPublies(S.state).map((r) => `<div class="card amber tight"><span class="kicker">Jour ${r.j} · rebondissement</span><span style="font-weight:700">${esc(r.titre)}</span><span class="small" style="color:var(--amber-soft)">${esc(r.texte)}</span></div>`).join('')}
    <span class="tb-ligne-k">Main courante</span>
    ${chronologie(aff, dossierDe(S.state, myZone())).map((l) => `<p class="small" style="margin:0"><strong style="color:var(--amber)">J${l.j}</strong> · ${esc(l.t)}</p>`).join('')}
    <a class="small" href="#guide-enquete">Comment fonctionne l’enquête ?</a>`;
}

function voletBoite(aff, et) {
  const j = S.state.enquete.jour;
  const lignes = [
    ...et.fichesAFaire.map((e) => `<div class="tb-boite-l nouveau"><span class="tb-vign tb-vign-fiche" style="--c:${COL[e]}"></span><div class="col grow" style="gap:2px;min-width:0"><span class="tb-ligne-k" style="color:var(--red-soft)">Constatation · ${ELEMENT_NOM[e]}</span><span class="small" style="font-weight:600">${CONSTAT_TITRE[e]} : le résultat est là</span></div><button type="button" class="btn primary small" data-action="tab-fiche" data-e="${e}">Compléter la fiche</button></div>`),
    ...et.boite.map((p) => {
      const nv = p.j >= j - 1;
      return `<div class="tb-boite-l ${nv ? 'nouveau' : ''}"><span class="tb-vign tb-vign-${typePiece(p)}"></span><div class="col grow" style="gap:2px;min-width:0"><span class="tb-ligne-k" style="color:${nv ? 'var(--red-soft)' : 'var(--amber)'}">${nv ? 'Nouveau · ' : ''}J${p.j} · ${sourceDe(p)}</span><button type="button" class="tb-lien" data-action="tab-ouvrir" data-tid="${esc(p.f)}">${esc(titrePiece(aff, p.f))}</button><span class="tiny tb-t-${statutPartage(p).k}">${esc(statutPartage(p).txt)}</span></div><button type="button" class="btn primary small" data-action="tab-sortir" data-f="${esc(p.f)}">Sortir</button></div>`;
    }),
  ];
  return `<span class="tb-titre">Boîte à pièces</span>
    <p class="tiny muted" style="margin:0">${lignes.length ? 'Sors une pièce : elle est punaisée au milieu de ton écran, glisse-la où tu veux.' : 'La boîte est vide : tout est sur ton tableau.'} Les nouvelles pièces arrivent ici chaque soir à 20:00.</p>
    ${lignes.join('')}`;
}

function voletSoir(aff, dos) {
  const d = S.draft, z = myZone();
  const dem = d.demarches || [];
  const v = voisinageInfo(aff);
  const nomDem = (x) => { const [k, i] = x.split(':'); const dm = DEMARCHES[k]; return i !== undefined ? `${dm.nom} · ${aff.suspects[Number(i)].prenom}` : dm.nom; };
  return `<div class="between" style="padding-right:44px"><span class="tb-titre" style="padding-right:0">Ce soir</span><span class="small muted">reste ${Math.round((z.budget - coutTotal(d)) * 10) / 10} k€</span></div>
    <span class="tb-ligne-k">Démarches · ${dem.length} / ${ENQ.maxDemarches}</span>
    ${dem.map((x) => `<div class="tb-boite-l"><span class="small grow" style="font-weight:600">${esc(nomDem(x))}</span><button type="button" class="btn small ghost" data-action="dem-toggle" data-k="${esc(x)}" aria-label="Retirer ${esc(nomDem(x))}">✕</button></div>`).join('') || '<p class="tiny muted" style="margin:0">Touche une photo ou une fiche du tableau pour choisir une démarche.</p>'}
    <div class="voisinage"><span class="small"><strong>Voisinage</strong> · ${v.n} agent${v.n > 1 ? 's' : ''} en Recherche${v.nom ? ` · piste : <strong>${esc(v.nom)}</strong>` : ''} : ${esc(v.txt)}</span></div>
    ${appuiHtml()}
    ${d.accusation !== null && d.accusation !== undefined ? `<p class="small" style="margin:0;color:var(--red-soft)">Accusation prête contre ${esc(aff.suspects[d.accusation].nom)}.</p>` : ''}
    <span class="tb-ligne-k">Partages · ${(d.partages || []).length} / ${ENQ.maxPartages}</span>
    ${(d.partages || []).map((x) => `<div class="tb-boite-l"><div class="col grow" style="gap:2px;min-width:0"><button type="button" class="tb-lien" data-action="tab-ouvrir" data-tid="${esc(x.f)}">${esc(titrePiece(aff, x.f))}</button><span class="tiny muted">vers ${x.a === '*' ? 'toutes les zones' : esc(S.state.zones[x.a] ? zoneName(S.state.zones[x.a]) : '?')}</span></div><button type="button" class="btn small ghost" data-action="partage-annuler" data-f="${esc(x.f)}" aria-label="Annuler ce partage">✕</button></div>`).join('') || '<p class="tiny muted" style="margin:0">Aucun partage prévu. Touche une pièce (sur le tableau ou dans la boîte) pour la partager.</p>'}
    <p class="tiny muted" style="margin:0">Tout part avec tes ordres : pense à valider. Résultats à 20:00, dans ta boîte à pièces.</p>`;
}

function volet(aff, dos, et) {
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
  else if (sh.k === 'boite') corps = voletBoite(aff, et);
  else if (sh.k === 'soir') corps = voletSoir(aff, dos);
  return `<section class="tb-volet tb-ui" aria-label="Détail">
    <div class="tb-poignee"></div>
    <button type="button" class="tb-fermer" data-action="tab-fermer" aria-label="Fermer">${icon('x', 18)}</button>
    <div class="tb-volet-corps">${corps}</div></section>`;
}

// ───── Mini tuto ─────
const TUTO = [
  { titre: 'Ton tableau d’enquête', texte: 'Tout ce que tu sais de l’affaire, punaisé au mur. C’est toi qui le ranges : rien n’est trié d’avance.', ou: 'centre' },
  { titre: 'Promène-toi dessus', texte: 'Glisse le liège pour te déplacer. Pince à deux doigts (ou la molette sur ordinateur) pour zoomer. Ce bouton montre tout le tableau.', ou: 'bas', spot: 'fit' },
  { titre: 'La boîte à pièces', texte: 'Chaque soir à 20:00, les nouvelles pièces arrivent ici. Sors-les une à une et punaise-les où tu veux : près d’un suspect, sur le plan…', ou: 'haut', spot: 'boite' },
  { titre: 'Touche pour agir', texte: 'Touche une photo, une fiche ou un lieu du plan : tu vois ce qu’on sait, tu coches ✓ ou ✕, et tu lances tes démarches. Le plan donne les temps de trajet : un trou dans un alibi ne suffit pas si la route est trop longue.', ou: 'centre' },
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

// ───── Écran ─────
export function renderTableau() {
  const st = S.state, z = myZone();
  const aff = affaire(st, st.enquete.n);
  const dos = dossierDe(st, z);
  const et = etatTab(aff, dos);
  const d = S.draft;
  const nbBoite = et.boite.length + et.fichesAFaire.length;
  const neuf = et.fichesAFaire.length || et.boite.some((p) => p.j >= st.enquete.jour - 1);
  const fil = S.tabMode === 'fil';
  if (S.tabTuto === undefined && !tutoTableauVu()) S.tabTuto = 0;
  const spot = S.tabTuto !== null && S.tabTuto !== undefined ? TUTO[S.tabTuto].spot : null;
  const sp = (k) => (spot === k ? 'tb-spot' : '');
  const traque = (st.traques || []).length;
  return `<main class="tb-ecran ${S.tabSheet ? 'volet-ouvert' : ''} ${S.ordersDirty ? 'sale' : ''}">
    <div id="tb-vp" class="tb-vp ${fil ? 'mode-fil' : ''}">
      <div id="tb-board" class="tb-board" style="width:${BW}px;height:${BH}px">
        <div class="tb-cadre"></div><div class="tb-liege"></div>
        <div class="tb-etiquette" data-tid="titre" style="left:${BW / 2 - 240}px"><span class="tb-scotch g"></span><span class="tb-scotch d"></span>
          <span class="tb-n">DOSSIER N° ${aff.n} · JOUR ${st.enquete.jour} / ${ENQ.dureeMax}</span><span class="tb-dossier">${esc(aff.titre.toUpperCase())}</span></div>
        <div class="tb-map" data-tid="plan" style="left:${MAP.x}px;top:${MAP.y}px;width:${MAP.w}px;height:${MAP.h}px">${planSvg(aff, et.t.fiches.includes('occ'))}
          ${['tl', 'tr', 'bl', 'br'].map((c) => `<span class="tb-mpin ${c}"></span>`).join('')}</div>
        ${elementsHtml(aff, dos, et)}
      </div>
    </div>
    <div class="tb-haut tb-ui">
      <button type="button" class="tb-chip" data-action="tab-ouvrir" data-tid="titre">J${st.enquete.jour} / ${ENQ.dureeMax} · ${et.t.liens.length} ficelle${et.t.liens.length > 1 ? 's' : ''}</button>
      ${traque ? '<button type="button" class="tb-chip rouge" data-action="tab-vue" data-v="liste">Traque en cours</button>' : ''}
      <span class="grow"></span>
      <button type="button" class="tb-rond" data-action="tab-vue" data-v="liste" aria-label="Affichage en liste">${icon('liste', 18)}</button>
      <button type="button" class="tb-chip ${sp('boite')}" data-action="tab-volet" data-k="boite" aria-label="Boîte à pièces, ${nbBoite} à ranger">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l2-5h14l2 5"/><rect x="3" y="9" width="18" height="11" rx="1.5"/><path d="M9 13h6"/></svg>${nbBoite}${neuf ? '<span class="tb-dot"></span>' : ''}</button>
      <button type="button" class="tb-chip ambre ${sp('soir')}" data-action="tab-volet" data-k="soir">Ce soir <span class="tb-compte">${(d.demarches || []).length}/${ENQ.maxDemarches}</span></button>
    </div>
    <div id="tb-aide" class="tb-aide" ${fil ? '' : 'hidden'}>${S.tabFrom ? 'Touche l’élément à relier' : 'Glisse d’un élément à l’autre · touche une ficelle pour la couper'}</div>
    <div class="tb-outils tb-ui">
      <button type="button" class="tb-o ${fil ? '' : 'on'}" data-action="tab-mode" data-v="main" aria-label="Main : déplacer et ouvrir" aria-pressed="${!fil}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11V5a1.5 1.5 0 0 1 3 0v5M12 10V4a1.5 1.5 0 0 1 3 0v6M15 10V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2.5-4a1.5 1.5 0 0 1 2.5-1.6L9 13"/></svg></button>
      <button type="button" class="tb-o rouge ${fil ? 'on' : ''} ${sp('fil')}" data-action="tab-mode" data-v="fil" aria-label="Tirer une ficelle" aria-pressed="${fil}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M7 7.5c4 2 6 7 10 9"/></svg></button>
      <span class="tb-sep"></span>
      <button type="button" class="tb-o" data-action="tab-zoom" data-d="-1" aria-label="Dézoomer"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg></button>
      <button type="button" class="tb-o ${sp('fit')}" data-action="tab-fit" aria-label="Vue d’ensemble"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
      <button type="button" class="tb-o" data-action="tab-zoom" data-d="1" aria-label="Zoomer"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg></button>
      <button type="button" class="tb-o" data-action="tab-tuto" aria-label="Revoir le tuto du tableau">?</button>
    </div>
    ${volet(aff, dos, et)}
    ${tutoHtml()}
  </main>${tabbar('enquete')}`;
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
  b.style.transition = anim ? 'transform .35s cubic-bezier(.2,.8,.2,1)' : 'none';
  b.style.transform = `translate(${v.tx}px,${v.ty}px) scale(${v.s})`;
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
  const st = S.state, aff = affaire(st, st.enquete.n), t = dispo(aff.n);
  const [w0] = vpTaille();
  // Sur ordinateur, le volet s'ouvre à droite : on cadre dans la partie gauche.
  const w = window.matchMedia && window.matchMedia('(min-width: 1000px) and (hover: hover) and (pointer: fine)').matches ? w0 - 440 : w0;
  let v;
  if (id === 'plan') { const s = Math.min(1, (w - 20) / MAP.w); v = { s, tx: (w - MAP.w * s) / 2 - MAP.x * s, ty: 64 - MAP.y * s }; }
  else if (id === 'titre') return;
  else { if (!/^(s\d|c:|L:|P:|recit|chrono)/.test(id) && !t.places.includes(id)) return; const p = ancre(aff, t, id); if (!p) return; const s = Math.max(S.tabV.s, 0.85); v = { s, tx: w / 2 - p[0] * s, ty: 80 - p[1] * s }; }
  S.tabV = borner(v);
  appliquer(S.tabV, true);
  sauverVue();
}

export function ouvrirVolet(id, rerender, { partage = false } = {}) {
  const k = id === 'titre' || id === 'recit' || id === 'chrono' ? 'faits' : id === 'plan' ? 'plan' : id.startsWith('L:') ? 'lieu' : id.startsWith('P:') ? 'planque' : id.startsWith('c:') ? 'c' : /^s\d$/.test(id) ? 's' : 'p';
  cadrer(id);
  S.tabSheet = { k, id, partage };
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
  ecrireDispo(n, t);
}
/** Tire ou coupe une ficelle entre a et b. */
export function basculerFil(a, b) {
  const n = S.state.enquete.n, t = dispo(n);
  const k = t.liens.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
  t.liens = k >= 0 ? t.liens.filter((_, q) => q !== k) : [...t.liens, [a, b]];
  ecrireDispo(n, t);
}
export function marquerTutoVu() { S.tutoTabVu = true; try { localStorage.setItem(TUTO_KEY, '1'); } catch (e) { /* pas de stockage */ } }

/** À appeler après chaque affichage de l'écran : branche les gestes sur le tableau. */
export function monterTableau(rerender) {
  const vp = document.getElementById('tb-vp');
  if (!vp) { ctl = null; return; }
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
    if (mobile && S.tabMode !== 'fil') {
      const p = dispo(n).pos[tid] || DEF_POS[tid] || [0, 0];
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
      const ny = Math.max(20, Math.min(BH - 120, g.oy + (y - g.sy) / s));
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

