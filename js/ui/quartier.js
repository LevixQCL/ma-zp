// « Le Quartier » : le non-droit joué sur un plateau 3 × 3 (le QG au centre, l'anneau autour, une tuile par secteur).
// Tout est compté et visible : barricades à casser 🔨, « ? » à révéler 🔦, attaques annoncées à arrêter 🛡.
import { S, esc, myZone } from './common.js';
import { ND } from '../engine/constants.js';
import { nomSecteur } from '../engine/nondroit.js';
import { ville } from './ville.js';
import { CONFIG } from '../config.js';
import { quartierActif, assurerQuartier, bilanQuartier, attaquable, coupsDe, experts, totalBar, planQuartier, Q } from '../engine/quartier.js';
import { portraitLieutenant, portraitParrain, PORTRAITS_PRETS, RENSEIGNEMENTS } from '../engine/milieu.js';
import { annoncesND, rolesDe, agentsND } from './nondroit.js';

export { quartierActif };
export const SERV_Q = {
  desc: { ic: '🔨', verbe: 'Casser', nom: 'Intervention', c: '#FF6E6A' },
  rep: { ic: '🔦', verbe: 'Révéler', nom: 'Recherche', c: '#B79CFF' },
  bouc: { ic: '🛡️', verbe: 'Protéger', nom: 'Proximité', c: '#63B0FF' },
};

// L'état vu par l'écran : converti à la volée tant que le premier calcul de « Le Quartier » n'est pas passé (même calcul que le serveur).
let cache = { st: null, v: null };
export function vueQ() {
  const st = S.state;
  if (!st || !st.nonDroit) return null;
  if (st.nonDroit.quartier && st.nonDroit.intentions && st.nonDroit.intentions.nuit === st.turn && Object.values(st.nonDroit.secteurs).every((s) => Number.isFinite(s.bar))) return st;
  if (cache.st !== st) { const c = JSON.parse(JSON.stringify(st)); assurerQuartier(c); cache = { st, v: c }; }
  return cache.v;
}

// Plateau : chaque secteur de l'anneau prend la case la plus proche de sa direction depuis le QG ; la case qui reste montre le Parrain.
const CASES = [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
let dispo = null;
export function dispositionQ(nd) {
  const cles = Object.keys(nd.secteurs).sort((a, b) => Number(a) - Number(b)).join(',');
  if (dispo && dispo.cles === cles) return dispo.cases;
  const v = ville(CONFIG.seed), qg = Object.keys(nd.secteurs).find((k) => nd.secteurs[k].coeur);
  const c0 = v.cells[Number(qg)].c, cases = new Array(9).fill(null);
  cases[4] = qg;
  const ang = (dx, dy) => Math.atan2(dy, dx);
  const anneau = Object.keys(nd.secteurs).filter((k) => k !== qg).map((k) => { const c = v.cells[Number(k)].c; return { k, a: ang(c[0] - c0[0], c[1] - c0[1]) }; });
  const libres = CASES.map((d, i) => ({ i, a: ang(d[0], d[1]) })).filter((x) => x.i !== 4);
  const diff = (a, b) => { const d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };
  // Glouton : la paire (secteur, case) la plus proche d'abord.
  const paires = anneau.flatMap((s) => libres.map((c) => ({ s, c, d: diff(s.a, c.a) }))).sort((x, y) => x.d - y.d);
  const pris = new Set(), places = new Set();
  for (const p of paires) if (!pris.has(p.s.k) && !places.has(p.c.i)) { cases[p.c.i] = p.s.k; pris.add(p.s.k); places.add(p.c.i); }
  dispo = { cles, cases };
  return cases;
}

/** Qui est sur chaque secteur ce soir : moi (brouillon) et les zones annoncées à la radio. [{ u, zone, r, moi }] */
export function presencesQ(k) {
  const st = S.state;
  return (annoncesND()[k] || []).map((a) => ({ u: a.uid, zone: st.zones[a.uid], r: a.r || { rep: 0, desc: a.n, bouc: 0 }, moi: !!a.moi })).filter((x) => x.zone);
}

const flic = (role, socle, cls = '') => {
  const c = (SERV_Q[role] || SERV_Q.desc).c;
  return `<svg class="${cls}" viewBox="0 0 40 48" aria-hidden="true"><ellipse cx="20" cy="43.5" rx="14" ry="4" fill="${socle}"/><path d="M10 42c0-9 4-14 10-14s10 5 10 14z" fill="#1E3570"/>
    <rect x="10.2" y="31" width="5" height="5" rx="1.2" fill="${c}"/><rect x="10.5" y="37" width="19" height="2.4" rx="1" fill="#0E1430"/>
    <circle cx="20" cy="21" r="6.6" fill="#F0C7A2"/><path d="M12.6 17.6q7.4-10 14.8 0z" fill="#1A2A5C"/><rect x="12.6" y="15.4" width="14.8" height="2.4" fill="#F2F4FA" opacity=".85"/>
    <path d="M11.4 18.2h17.2q-.4 1.6-2 1.6h-13.2q-1.6 0-2-1.6z" fill="#0B1230"/><circle cx="20" cy="13.3" r="1.3" fill="#FFC970"/></svg>`;
};
const portrait = (src) => `<span class="qz-pt" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="15" r="7" fill="#0E0B12"/><path d="M5 40c1-10 7-15 15-15s14 5 15 15z" fill="#0E0B12"/></svg>${PORTRAITS_PRETS ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
const couleur = (z) => (z && z.couleur) || '#9AA3C7';
const pl = (n) => (n > 1 ? 's' : '');

function barricadesHtml(s, b) {
  if (s.statut === 'repris') return '';
  const n = s.bar || 0, cassees = Math.min(b.coups, b.vu ? b.total : n);
  const tot = b.vu ? b.total : n, MAXI = 14;
  let h = '';
  if (tot <= MAXI) {
    for (let i = 0; i < n; i++) h += `<span class="qz-bar ${i < cassees ? 'cassee' : ''}"></span>`;
    if (s.cache && b.vu) for (let i = 0; i < s.cache; i++) h += `<span class="qz-bar revelee ${n + i < cassees ? 'cassee' : ''}"></span>`;
  } else h += `<span class="qz-bar"></span><b class="qz-nb">${Math.max(0, tot - cassees)}</b><span class="qz-sur">/${tot}</span>`;
  if (!b.vu) h += '<span class="qz-bar cachee" title="0, 1 ou 2 barricades cachées">?</span>';
  return `<span class="qz-bars" aria-label="${tot} barricade${pl(tot)}${b.vu ? '' : ' visibles, plus peut-être 1 ou 2 cachées'}">${h}</span>`;
}

function tuileHtml(st, k, sel) {
  const nd = st.nonDroit, s = nd.secteurs[k], ps = presencesQ(k), b = bilanQuartier(st, k, ps.map((x) => ({ ...x, zone: x.zone })));
  const ferme = s.statut === 'milieu' && !attaquable(nd, k);
  const cls = s.coeur ? `qg${ferme ? ' loin' : ''}` : s.statut === 'repris' ? 'repris' : 'tenu';
  const it = nd.intentions || {}, att = (it.attaques || {})[k], renf = (it.renforts || {})[k];
  const menace = att ? `<span class="qz-menace" title="Attaque annoncée ce soir">⚔ ${att}</span>` : renf && s.statut === 'milieu' ? `<span class="qz-menace renfort" title="Barricades ajoutées cette nuit s'il ne tombe pas">+${renf} 🧱</span>` : '';
  let etat;
  if (s.statut === 'repris') etat = att ? (b.manque ? `<span class="qz-etat r">🛡 ${b.bouc}/${att} · il en manque ${b.manque}</span>` : `<span class="qz-etat v">🛡 ${b.bouc}/${att} · tiendra</span>`) : '<span class="qz-etat b">repris ✓</span>';
  else if (ferme) etat = `<span class="qz-etat g">🔒 ${ND.coeurSeuil} secteurs repris pour ouvrir</span>`;
  else if (b.statut === 'tombe') etat = '<span class="qz-etat v">tombe ce soir ✓</span>';
  else if (b.statut === 'peutetre') etat = '<span class="qz-etat a">tombe… sauf si « ? »</span>';
  else if (b.statut === 'manque') etat = `<span class="qz-etat a">il manque ${b.manque} 🔨${b.vu ? '' : ' + ?'}</span>`;
  else etat = `<span class="qz-etat g">${b.sait} 🔨 pour tomber${b.vu ? '' : ' + ?'}</span>`;
  const pions = ps.flatMap((x) => ['bouc', 'rep', 'desc'].flatMap((r) => Array.from({ length: Math.min(6, x.r[r] || 0) }, () => `<span class="qz-mini${x.moi ? ' moi' : ''}" title="${esc(x.zone.nom)} · ${SERV_Q[r].nom}">${flic(r, couleur(x.zone))}</span>`))).slice(0, 12).join('');
  const lt = s.lieutenant, pt = s.coeur ? portraitParrain(nd.parrain && nd.parrain.nom) : portraitLieutenant(s.milieu);
  return `<button type="button" class="qz-tuile ${cls} ${sel === k ? 'sel' : ''}" data-action="qz-sel" data-c="${k}" aria-pressed="${sel === k}" aria-label="${esc(nomSecteur(k))}">
    <span class="qz-nom">${esc(nomSecteur(k))}</span>
    ${s.statut === 'milieu' && (s.coeur || (lt && lt.etat === 'libre')) ? `<span class="qz-lt">${portrait(pt)}</span>` : ''}
    ${menace}${ferme ? '<span class="qz-cadenas" aria-hidden="true">🔒</span>' : ''}
    ${barricadesHtml(s, b)}
    <span class="qz-pions">${pions}</span>
    ${etat}
  </button>`;
}

function tuileParrain(st) {
  const nd = st.nonDroit, p = nd.parrain, n = Object.keys(nd.dossier || {}).length, NR = Object.keys(RENSEIGNEMENTS).length;
  if (!p) return '<div class="qz-tuile vide" aria-hidden="true"></div>';
  return `<div class="qz-tuile parrain ${p.tombe ? 'tombe' : ''}"><span class="qz-nom">${p.tombe ? 'Tombé' : 'Le Parrain'}</span>${portrait(portraitParrain(p.nom))}
    <span class="qz-p-nom">${esc(p.nom)}</span><span class="qz-p-dos" title="Chaque renseignement retire ${Q.parRens} barricade au QG">📁 ${n}/${NR} · −${n * Q.parRens} 🧱 au QG</span></div>`;
}

/** La fiche du secteur choisi : ce qui arrivera ce soir, et mes agents (un stepper par verbe). */
function ficheHtml(st, k, me) {
  const nd = st.nonDroit, s = nd.secteurs[k], ps = presencesQ(k), b = bilanQuartier(st, k, ps);
  const mes = rolesDe(k), it = nd.intentions || {};
  const ferme = s.statut === 'milieu' && !attaquable(nd, k);
  const lt = s.lieutenant;
  const tete = `<div class="qz-f-tete">${s.statut === 'repris' ? '<span class="qz-f-ico" aria-hidden="true">🏠</span>' : portrait(s.coeur ? portraitParrain(nd.parrain && nd.parrain.nom) : portraitLieutenant(s.milieu))}
    <div><h3>${esc(nomSecteur(k))}</h3><span class="small muted">${s.statut === 'repris' ? 'Repris · les habitants sont revenus' : s.coeur ? `QG de ${esc((nd.parrain && nd.parrain.nom) || 'du Parrain')}` : lt && lt.etat === 'libre' ? `Tenu par ${esc(lt.nom)}` : 'Tenu par le milieu'}</span></div></div>`;
  let corps = '';
  if (s.statut === 'repris') {
    corps = b.att
      ? `<div class="qz-msg r">⚔ <b>Le milieu attaque ici ce soir avec ${b.att}.</b> Chaque Proximité 🛡 arrête une attaque.</div>
         <div class="qz-compte"><span class="ic bl">🛡️</span><span><b>${b.bouc}</b> / ${b.att} boucliers</span></div>
         ${b.manque ? `<div class="qz-msg a">Il manque <b>${b.manque} Proximité</b>, sinon ${esc(nomSecteur(k))} est reperdu.</div>` : '<div class="qz-msg v"><b>Ça tiendra.</b> L’attaque sera repoussée.</div>'}`
      : '<div class="qz-msg g">Repris. Aucune attaque annoncée ce soir : inutile d’y laisser du monde.</div>';
    if (b.inutiles) corps += `<div class="qz-msg a">${b.inutiles} agent${pl(b.inutiles)} ici ne protège${b.inutiles > 1 ? 'nt' : ''} rien : seule la Proximité tient un secteur.</div>`;
  } else if (ferme) {
    const n = Object.values(nd.secteurs).filter((x) => !x.coeur && x.statut === 'repris').length;
    corps = `<div class="qz-msg g">🔒 <b>Le QG est fermé.</b> Il s’ouvre quand ${ND.coeurSeuil} secteurs de l’anneau sont repris (${n}/${ND.coeurSeuil}). Chaque lieutenant arrêté parle : un renseignement = une barricade de moins ici.</div>`;
  } else {
    const tot = b.vu ? b.total : b.visibles;
    const cacheL = !b.vu ? '<div class="qz-compte"><span class="ic vi">🔦</span><span><b>?</b> 0, 1 ou 2 barricades cachées. Une Recherche te le dit tout de suite.</span></div>'
      : s.cache ? `<div class="qz-compte"><span class="ic vi">🔦</span><span>Repéré : <b>${s.cache}</b> barricade${pl(s.cache)} cachée${pl(s.cache)} en plus.</span></div>` : '';
    const msg = b.statut === 'tombe' ? `<div class="qz-msg v"><b>Le secteur tombe ce soir.</b>${lt && lt.etat === 'libre' ? ` ${esc(lt.nom)} sera arrêté.` : ''}</div>`
      : b.statut === 'peutetre' ? '<div class="qz-msg a"><b>Ça tombe… si le « ? » est vide.</b> Une Recherche pour en être sûr, ou deux Interventions de plus.</div>'
      : b.statut === 'manque' ? `<div class="qz-msg a">Il manque <b>${b.manque} coup${pl(b.manque)} 🔨</b>${b.vu ? '' : ', et peut-être plus (« ? »)'}. Les barricades cassées restent cassées.</div>`
      : `<div class="qz-msg g">Personne ce soir. Il faut <b>${b.sait} coup${pl(b.sait)} 🔨</b>${b.vu ? '' : ' + le « ? »'}.</div>`;
    corps = `<div class="qz-compte"><span class="ic rd">🧱</span><span><b>${tot}</b> barricade${pl(tot)}${b.vu ? '' : ' visibles'} · <b>${b.coups}</b> coup${pl(b.coups)} 🔨 posé${pl(b.coups)}</span></div>${cacheL}${msg}`;
    if (b.renfort) corps += `<div class="qz-msg a">Le milieu ajoutera <b>+${b.renfort} barricade${pl(b.renfort)}</b> cette nuit s’il ne tombe pas.</div>`;
    if (b.inutiles) corps += `<div class="qz-msg a">${b.inutiles} Proximité ici ne casse${b.inutiles > 1 ? 'nt' : ''} rien : elle protège les secteurs repris.</div>`;
  }
  // Qui y va ce soir.
  const qui = ps.length ? `<div class="qz-qui">${ps.map((x) => `<span><i style="background:${couleur(x.zone)}"></i>${x.moi ? 'toi' : esc(x.zone.nom)} · ${['desc', 'rep', 'bouc'].filter((r) => x.r[r]).map((r) => `${x.r[r]} ${SERV_Q[r].ic}`).join(' ')}</span>`).join('')}</div>` : '';
  // Mes agents : seulement les verbes utiles ici.
  const verbes = s.statut === 'repris' ? ['bouc'] : ferme ? [] : b.vu && !mes.rep ? ['desc'] : ['desc', 'rep'];
  for (const r of ['desc', 'rep', 'bouc']) if (mes[r] && !verbes.includes(r)) verbes.push(r);
  const ex = experts(me);
  const aide = { desc: `1 agent = 1 barricade${ex ? ` · tes ${ex} premier${pl(ex)} compte${ex > 1 ? 'nt' : ''} double (formation)` : ''}`, rep: 'lève le « ? » pour tout le monde', bouc: '1 agent = 1 attaque arrêtée' };
  const steppers = verbes.map((r) => `<div class="qz-step"><span class="qz-step-ic" style="--c:${SERV_Q[r].c}">${flic(r, couleur(me))}</span>
    <span class="qz-step-t"><b>${SERV_Q[r].ic} ${SERV_Q[r].verbe}</b><span>${SERV_Q[r].nom} · ${aide[r]}</span></span>
    <span class="qz-step-n"><button type="button" class="btn small" data-action="nd-role" data-c="${k}" data-r="${r}" data-d="-1" aria-label="Un ${SERV_Q[r].nom} de moins" ${mes[r] ? '' : 'disabled'}>−</button><b>${mes[r] || 0}</b><button type="button" class="btn small" data-action="nd-role" data-c="${k}" data-r="${r}" data-d="1" aria-label="Un ${SERV_Q[r].nom} de plus">+</button></span></div>`).join('');
  const n = (mes.rep || 0) + (mes.desc || 0) + (mes.bouc || 0);
  const radio = n ? `<button type="button" class="btn small ghost" data-action="nd-appel" data-c="${k}">📻 Annoncer sur la radio</button>` : '';
  const hier = (s.hier || []).filter((h) => S.state.zones[h.u]);
  const hierL = hier.length ? `<p class="tiny muted" style="margin:0">Hier soir : ${hier.map((h) => `${esc(S.state.zones[h.u].nom)} (${h.r ? ['desc', 'rep', 'bouc'].filter((r) => h.r[r]).map((r) => `${h.r[r]} ${SERV_Q[r].ic}`).join(' ') : h.n})`).join(', ')}.</p>` : '';
  return `<section class="card qz-fiche nd-fiche" id="nd-${k}" aria-label="Fiche du secteur">${tete}${corps}${qui}${steppers ? `<div class="qz-steps">${steppers}</div>` : ''}${radio}${hierL}</section>`;
}

/** Le plateau complet (carte du non-droit en mode « Le Quartier »). */
export function plateauQHtml() {
  const st = vueQ(), me = myZone();
  if (!st || !me) return '';
  const nd = st.nonDroit, cases = dispositionQ(nd);
  const sel = S.secteurSel != null && nd.secteurs[S.secteurSel] ? String(S.secteurSel) : cases.find((k) => k && attaquable(nd, k)) || cases.find(Boolean);
  const tuiles = cases.map((k) => (k ? tuileHtml(st, k, sel) : tuileParrain(st))).join('');
  const r = Object.values(nd.secteurs).filter((x) => !x.coeur && x.statut === 'repris').length, NA = Object.values(nd.secteurs).filter((x) => !x.coeur).length;
  const it = nd.intentions || {}, att = Object.entries(it.attaques || {}), renf = Object.entries(it.renforts || {}).filter(([k]) => nd.secteurs[k].statut === 'milieu');
  const annonce = att.length || renf.length ? `<div class="qz-annonce"><b>Ce soir, le milieu annonce :</b> ${[...att.map(([k, n]) => `⚔ ${n} sur ${esc(nomSecteur(k))}`), ...renf.map(([k, n]) => `+${n} 🧱 sur ${esc(nomSecteur(k))}`)].join(' · ')}</div>` : '';
  return `<div class="qz">
    <div class="qz-haut"><span class="qz-progres" aria-label="${r} secteurs repris sur ${NA}">Repris ${Array.from({ length: NA }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('')} ${r}/${NA}</span><span class="tiny muted">20:00 · tout se règle d’un coup</span></div>
    ${annonce}
    <div class="qz-plateau">${tuiles}</div>
  </div>`;
}

/** Sous le plateau : la fiche du secteur choisi et mes agents. */
export function corpsQHtml() {
  const st = vueQ(), me = myZone();
  if (!st || !me || !S.draft) return '';
  const nd = st.nonDroit, cases = dispositionQ(nd);
  const sel = S.secteurSel != null && nd.secteurs[S.secteurSel] ? String(S.secteurSel) : cases.find((k) => k && attaquable(nd, k)) || cases.find(Boolean);
  const n = agentsND();
  const mes = Object.entries(S.draft.secteurs || {}).filter(([, v]) => v > 0);
  return `<div class="qz-moi">
      <div class="between" style="gap:8px;flex-wrap:wrap"><span class="small"><b>Tes agents ce soir : ${n}/${ND.maxTotal}</b>${mes.length ? ` · ${mes.map(([k]) => esc(nomSecteur(k))).join(', ')}` : ''}</span>
      <span class="row" style="gap:6px"><button type="button" class="btn small" data-action="qz-auto">✨ Placer pour moi</button>${n ? '<button type="button" class="btn small ghost" data-action="qz-vider">Tout reprendre</button>' : ''}</span></div>
    </div>
    ${ficheHtml(st, sel, me)}
    <details class="qz-regles"><summary class="small">Les règles en 20 secondes</summary>
      <p class="small">🔨 <b>Intervention</b> : un agent casse une barricade (les mieux formés comptent double). Quand il n’en reste plus, le secteur tombe et son lieutenant est arrêté. Les barricades cassées restent cassées : on peut s’y mettre sur plusieurs soirs.</p>
      <p class="small">🔦 <b>Recherche</b> : lève le « ? » (0, 1 ou 2 barricades cachées) pour tout le monde.</p>
      <p class="small">🛡 <b>Proximité</b> : protège un secteur repris. Le milieu annonce le matin où il attaquera le soir et avec combien : un bouclier arrête un point d’attaque. Sinon, le secteur est reperdu.</p>
      <p class="small">La prime de chaque prise est partagée selon les barricades cassées par chacun ; l’affiche « ARRÊTÉ » du lieutenant est tirée au sort (un coup = un billet). Le QG s’ouvre à ${ND.coeurSeuil} secteurs repris ; chaque lieutenant interrogé lui retire une barricade.</p>
    </details>`;
}

/** « Placer pour moi » : le placement de l'adjoint, à partir de ce que les autres zones ont annoncé. Renvoie { k: { rep, desc, bouc } }. */
export function planPourMoi(n = 6) {
  const st = vueQ(), me = myZone();
  if (!st || !me) return {};
  const ann = {};
  for (const [k, l] of Object.entries(annoncesND())) for (const a of l) {
    if (a.moi || !st.zones[a.uid]) continue;
    const x = (ann[k] ||= { rep: 0, desc: 0, bouc: 0, coups: 0 });
    for (const r of ['rep', 'desc', 'bouc']) x[r] += (a.r && a.r[r]) || 0;
    x.coups += coupsDe(st.zones[a.uid], (a.r && a.r.desc) || 0);
  }
  return planQuartier(me, st, n, ann).roles;
}

/** Secteurs que je peux faire tomber ce soir avec 1 à 4 coups de plus (pour l'HP) et secteurs repris dont l'attaque n'est pas couverte. */
export function alertesQ() {
  const st = vueQ(), me = myZone();
  if (!st || !me || !S.draft) return { tombent: [], danger: [] };
  const nd = st.nonDroit, tombent = [], danger = [];
  for (const k of Object.keys(nd.secteurs)) {
    const s = nd.secteurs[k], b = bilanQuartier(st, k, presencesQ(k));
    if (s.statut === 'repris' && b.att && b.manque) danger.push({ k, n: b.manque, att: b.att });
    else if (s.statut === 'milieu' && attaquable(nd, k) && b.statut !== 'tombe' && b.coups > 0 && b.manque <= 4) tombent.push({ k, n: b.manque });
  }
  return { tombent: tombent.sort((a, b) => a.n - b.n), danger };
}
export { totalBar };
