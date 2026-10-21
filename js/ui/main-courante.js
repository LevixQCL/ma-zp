// « Main courante de nuit » (phase de test) : l'adjoint répartit les équipes sur les appels de la nuit,
// le joueur corrige avec quelques ordres, au fil des vagues de la journée (matin, 11 h, 14 h).
// Les appels d'une vague passée partent avec l'équipe prévue à ce moment. La nuit se joue à 20 h ;
// le rapport s'affiche le lendemain. Phase de test : rien ne touche encore à la zone.
import { S, esc, myZone, tabbar } from './common.js';
import { planIso } from './plan-iso.js';
import { carteQuartiers } from '../engine/quartiers.js';
import { vehiculesDisponibles } from '../engine/zone.js';
import { MC, STATUTS, equipesDe, rappelDe, genererNuit, jouerNuit, distancesZone, vagueEnCours } from '../engine/main-courante.js';

const NS_SVG = 'http://www.w3.org/2000/svg';
const COUL = { Intervention: ['#EEF2FA', '#12306E'], Proximité: ['#1E57B8', '#E6F1FF'], Roulage: ['#E59A1F', '#2A1600'] };
const TON = { maitrise: 'v', arretee: 'v', moyen: 'a', reporte: 'a', deborde: 'r', incident: 'r' };
const FOND = { v: '#1E6B4E', a: '#9A5A12', r: '#8E2328' };
const HEURES = Array.from({ length: 13 }, (_, i) => { const m = 20 * 60 + i * 30, h = Math.floor(m / 60) % 24; return `${h} h${m % 60 ? ' 30' : ''}`; });
const hh = (s) => HEURES[Math.max(0, Math.min(12, s))];
const pl = (n) => (n > 1 ? 's' : '');

/** Le contexte de la nuit de ce tour : quartiers, équipes, appels, état sauvegardé. */
function contexte() {
  const st = S.state, me = myZone();
  const carte = carteQuartiers(st), cells = (carte.deZone[me.uid] || []).slice();
  const capitale = carte.capitale[me.uid] ?? cells[0];
  const dist = distancesZone(cells, carte.adj);
  const cle = `${st.season}-${st.turn}`;
  let mem = (S.player && S.player.mainCourante) || {};
  // Nouveau tour : la nuit précédente devient « la nuit d'hier » (pour le rapport).
  if (mem.cur && mem.cur.cle !== cle) { mem = { prev: mem.cur.cle === `${st.season}-${st.turn - 1}` ? mem.cur : mem.prev, cur: null, prevVu: false }; sauver(mem); }
  if (!mem.cur) {
    const equipes = equipesDe(me, { capitale, autre: cells.find((c) => c !== capitale), vehicules: vehiculesDisponibles(me, st.turn) });
    const appels = genererNuit(`${S.config.seed}-mc-${st.season}-${st.turn}-${me.uid}`, cells);
    mem = { ...mem, cur: { cle, appels, equipes, capitale, fixe: {}, verrou: {}, rens: [], rensVague: [], rappelFige: false, vagueVue: 0 } };
    sauver(mem);
  }
  return { st, me, carte, cells, dist, mem, n: mem.cur };
}
let tSauve = null;
function sauver(mem) {
  S.player = { ...(S.player || {}), mainCourante: mem };
  clearTimeout(tSauve);
  tSauve = setTimeout(() => { try { S.backend.savePlayer(S.user.uid, S.player); } catch (e) { console.warn(e); } }, 600);
}

const vague = (c) => vagueEnCours(Date.now(), c.st.nextDeadline);
const nbOrdres = (n) => Object.keys(n.fixe).filter((k) => k !== '__rappel').length + (n.fixe.__rappel ? 1 : 0);
const capOrdres = (v) => MC.vagues[v].ordres;
const appelsVus = (n) => n.appels.map((a) => (a.flou && n.rens.includes(a.id) ? { ...a, flou: false, g: a.gReel } : a));
const connus = (n, v) => new Set(n.appels.filter((a) => a.vague <= v).map((a) => a.id));
function plan(c, n = c.n, { v = vague(c), reel = false, fixe = n.fixe } = {}) {
  const p = jouerNuit(reel ? n.appels : appelsVus(n), n.equipes, { fixe: { ...n.verrou, ...fixe }, connus: reel ? null : connus(n, v), prevu: !reel, dist: c.dist, capitale: n.capitale });
  for (const [id, r] of Object.entries(p.res)) r.par = fixe[id] ? 'toi' : 'adjoint';
  return p;
}
/** Les vagues passées depuis la dernière visite : leurs appels partent avec l'équipe prévue à ce moment-là. */
function transmettre(c) {
  const n = c.n, v = vague(c);
  let change = false;
  while (n.vagueVue < v) {
    const p = plan(c, n, { v: n.vagueVue });
    for (const a of [...n.appels, ...p.suites]) if (a.vague === n.vagueVue && !n.fixe[a.id] && !n.verrou[a.id] && p.res[a.id]) n.verrou[a.id] = p.res[a.id].eq || 'attente';
    if (n.fixe.__rappel) n.rappelFige = true;
    n.vagueVue++; change = true;
  }
  if (change) sauver(c.mem);
}
const transmis = (c, a) => a.vague < vague(c);
const flouVu = (n, a) => a.flou && !n.rens.includes(a.id);
const gTxt = (n, a) => (flouVu(n, a) ? '?' : a.flou ? a.gReel : a.g);

function el(t, a = {}, txt) { let h = `<${t}`; for (const [k, v] of Object.entries(a)) h += ` ${k}="${String(v).replace(/"/g, '&quot;')}"`; return `${h}>${txt != null ? esc(String(txt)) : ''}</${t}>`; }
function frise(c, p, sel) {
  const n = c.n, v = vague(c), W = 380, X0 = 72, PAS = (W - X0 - 4) / 12, x = (s) => X0 + s * PAS;
  const eqs = n.fixe.__rappel ? [...n.equipes, rappelDe(n.capitale)] : n.equipes, H = 52 + eqs.length * 19 + 4;
  let h = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Frise de la nuit : appels et équipes"><defs><pattern id="mc-hach" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#141B33"/><line x1="0" y1="0" x2="0" y2="6" stroke="#29345A" stroke-width="3"/></pattern></defs>`;
  for (let k = 0; k <= 6; k++) h += el('line', { x1: x(2 * k), y1: 14, x2: x(2 * k), y2: H - 2, stroke: 'rgba(190,205,255,.1)' }) + el('text', { x: x(2 * k), y: 10, 'text-anchor': k === 6 ? 'end' : k === 0 ? 'start' : 'middle', class: 'mc-h' }, HEURES[2 * k]);
  h += el('text', { x: 0, y: 35, class: 'mc-l' }, 'Appels');
  if (v < 2) { const de = v === 0 ? 4 : 8; h += el('rect', { x: x(de), y: 18, width: x(12) - x(de), height: 30, rx: 5, fill: 'url(#mc-hach)' }) + el('text', { x: x(12) - 3, y: 46, 'text-anchor': 'end', class: 'mc-h' }, v === 0 ? 'suite à 11 h et 14 h' : 'suite à 14 h'); }
  const vis = [...n.appels.filter((a) => a.vague <= v), ...p.suites], tot = {}, par = {};
  for (const a of vis) tot[a.s] = (tot[a.s] || 0) + 1;
  for (const a of vis) {
    const k = par[a.s] = (par[a.s] || 0) + 1, m = tot[a.s], dy = m === 1 ? 0 : m === 2 ? (k === 1 ? -9 : 9) : [-11, 0, 11][Math.min(2, k - 1)];
    const r = p.res[a.id], ton = r ? TON[r.statut] : 'a';
    h += `<g class="mc-ap" data-mc="${a.id}" transform="translate(${x(a.s).toFixed(1)} ${33 + dy})" opacity="${transmis(c, a) ? 0.5 : 1}" role="button" tabindex="0" aria-label="${esc(a.titre)}, ${hh(a.s)}"><circle r="${m === 1 ? 13 : 9}" fill="transparent"/><rect x="-6.3" y="-6.3" width="12.6" height="12.6" rx="3" transform="rotate(45)" fill="${FOND[ton]}" stroke="${sel === a.id ? '#FFB23F' : '#070B19'}" stroke-width="${sel === a.id ? 2.6 : 1}" ${a.parent ? 'stroke-dasharray="2 1.5"' : ''}/><text y="3.3" text-anchor="middle" class="mc-g">${gTxt(n, a)}</text></g>`;
  }
  if (sel) { const a = vis.find((q) => q.id === sel); if (a) h += el('line', { x1: x(a.s), y1: 46, x2: x(a.s), y2: H - 2, stroke: '#FFB23F', 'stroke-width': 1.3, 'stroke-dasharray': '3 2' }); }
  eqs.forEach((e, i) => {
    const y = 60 + i * 19, [col, ink] = COUL[e.serv];
    h += el('circle', { cx: 9, cy: y, r: 8, fill: col }) + el('text', { x: 9, y: y + 3.3, 'text-anchor': 'middle', class: 'mc-av', fill: ink }, e.id) + el('text', { x: 21, y: y + 3.8, class: 'mc-l' }, e.nom.replace('Patrouille', 'Patr.').replace(' (heures sup.)', ''));
    for (const [d, f, aid] of p.occ[e.id] || []) {
      const moi = p.res[aid] && p.res[aid].par === 'toi', s2 = aid === sel;
      h += el('rect', { x: x(d) + 1, y: y - 6.5, width: Math.max(6, x(Math.min(12, f)) - x(d) - 2), height: 13, rx: 6.5, fill: moi ? '#2D6FD6' : 'rgba(150,160,191,.14)', stroke: s2 ? '#FFB23F' : moi ? '#2D6FD6' : '#96A0BF', 'stroke-width': s2 ? 1.8 : 1, 'stroke-dasharray': moi ? 'none' : '3 2' });
    }
  });
  return `${h}</svg>`;
}
function marqueurs(c, p, sel) {
  const n = c.n, v = vague(c), parQ = {}, out = [];
  for (const a of [...n.appels.filter((q) => q.vague <= v), ...p.suites]) {
    const k = parQ[a.cell] = (parQ[a.cell] || 0) + 1, off = [[0, 0], [15, -5], [-15, -5], [0, -15]][(k - 1) % 4];
    const r = p.res[a.id], ton = r ? TON[r.statut] : 'a';
    out.push({ k: a.cell, dx: off[0], dy: off[1], attr: `data-mc="${a.id}"`, svg: `<circle r="12" fill="transparent"/><rect x="-6.5" y="-6.5" width="13" height="13" rx="3" transform="rotate(45)" fill="${FOND[ton]}" stroke="${sel === a.id ? '#FFB23F' : '#070B19'}" stroke-width="${sel === a.id ? 2.4 : 1}"/><text y="3.2" text-anchor="middle" style="font:800 8.5px var(--body, sans-serif);fill:#FFF3E0">${gTxt(n, a)}</text>` });
  }
  return out;
}
function pourquoi(e, a, r) {
  if (r.statut === 'arretee') return 'le contrôle intercepte la bande';
  const b = [];
  if (!a.tags.some((t) => e.comp.includes(t))) b.push('pas formée');
  if (r.retard > 1) b.push(`arrive ${r.retard * 30} min après`);
  if (r.fatigue) b.push('3e intervention');
  if (r.g >= 3) b.push('gravité 3');
  return b.length ? b.join(' · ') : 'formée, sur place à temps';
}
const pill = (r) => `<span class="mc-res ${TON[r.statut]}">${STATUTS[r.statut]}</span>`;
function tiroir(c, p, sel) {
  const n = c.n, v = vague(c), reste = capOrdres(v) - nbOrdres(n);
  if (!sel) {
    const rp = !!n.fixe.__rappel;
    return `<p class="small muted" style="margin:0">Touche un losange (frise ou carte) pour voir l’équipe envoyée et la changer.</p>
      <button type="button" class="mc-eq ${rp ? 'choisi' : ''}" data-mce="rappel" ${(!rp && reste < 1) || n.rappelFige ? 'disabled' : ''}><span class="mc-avb" style="background:#EEF2FA;color:#12306E">R1</span><span class="mc-lb"><b>${rp ? (n.rappelFige ? 'Équipe rappelée pour la nuit' : 'Équipe rappelée · retoucher pour annuler') : 'Rappeler une équipe en heures sup.'}</b><span>une équipe de plus pour la nuit · 1 ordre</span></span></button>`;
  }
  const a = [...n.appels, ...p.suites].find((q) => q.id === sel), r = p.res[a.id], fixe = n.fixe[a.id], fige = transmis(c, a);
  const eqs = (n.fixe.__rappel ? [...n.equipes, rappelDe(n.capitale)] : n.equipes).slice().sort((x, y) => a.tags.some((t) => y.comp.includes(t)) - a.tags.some((t) => x.comp.includes(t)));
  const opts = eqs.map((e) => {
    const pr = plan(c, n, { fixe: { ...n.fixe, [a.id]: e.id } }).res[a.id];
    const actuel = r.eq === e.id, adjoint = !fixe && actuel, bloque = !fixe && !actuel && reste <= 0, [col, ink] = COUL[e.serv];
    const forme = a.tags.some((x) => e.comp.includes(x));
    return `<button type="button" class="mc-eq ${actuel ? 'choisi' : ''} ${adjoint ? 'adj' : ''}" data-mce="${e.id}" ${bloque || fige ? 'disabled' : ''} aria-pressed="${actuel}"><span class="mc-avb" style="background:${col};color:${ink}">${e.id}</span><span class="mc-lb"><b>${esc(e.nom)}</b><span>${adjoint ? 'adjoint · ' : actuel ? 'ton ordre · ' : ''}${forme ? 'formée · ' : ''}${pr.fatigue ? 'fatiguée · ' : ''}sur place ${hh(pr.arr)}</span></span>${actuel ? `${pill(pr)}<span class="mc-pq">${pourquoi(e, a, pr)}</span>` : ''}</button>`;
  }).join('');
  const att = plan(c, n, { fixe: { ...n.fixe, [a.id]: 'attente' } }).res[a.id];
  const rens = flouVu(n, a) && !fige ? `<button type="button" class="mc-eq" data-mce="renseigner" ${n.rensVague.includes(v) ? 'disabled' : ''}><span class="mc-avb" style="background:#2A3150;color:#FFC970">?</span><span class="mc-lb"><b>Se renseigner</b><span>un coup de fil par vague · gratuit</span></span></button>` : '';
  const rap = n.fixe.__rappel || n.rappelFige ? '' : `<button type="button" class="mc-eq" data-mce="rappel" ${reste < 1 || fige ? 'disabled' : ''}><span class="mc-avb" style="background:#EEF2FA;color:#12306E">R1</span><span class="mc-lb"><b>Rappeler une équipe</b><span>heures sup. · 1 ordre</span></span></button>`;
  const nom = c.carte.nomDe(a.cell);
  return `<div class="mc-appel"><span><b>${esc(a.titre)}</b><span class="small muted">${hh(a.s)} · ${esc(nom)} · ${flouVu(n, a) ? 'gravité inconnue (prévue à 2)' : `gravité ${gTxt(n, a)}${n.rens.includes(a.id) ? ' (renseignée)' : ''}`}${a.suite && !a.parent ? ' · peut reprendre' : ''}${!fige && a.vague === v && v < 2 ? ` · part à ${MC.vagues[v + 1].h} h` : ''}</span></span><span class="mc-tags">${a.tags.map((x) => `<span class="mc-tag ${r.eq && [...n.equipes, rappelDe(n.capitale)].find((e) => e.id === r.eq).comp.includes(x) ? 'ok' : ''}">${x}</span>`).join('')}</span></div>
    <div class="mc-eqs">${opts}${rens}${rap}<button type="button" class="mc-eq ${fixe === 'attente' ? 'choisi' : ''}" data-mce="attente" ${(!fixe && reste <= 0) || fige ? 'disabled' : ''}><span class="mc-avb" style="background:#2A3150;color:#C3C9DE">—</span><span class="mc-lb"><b>Reporter</b><span>${a.tags.includes('bande') || gTxt(n, a) === 3 ? 'incident (−3)' : flouVu(n, a) ? '−1, ou −3 si grave' : 'à demain, −1 point'}</span></span>${fixe === 'attente' ? pill(att) : ''}</button></div>
    ${a.parent ? `<p class="small muted" style="margin:0">N’arrive que si l’appel de ${hh(a.s - 4)} est mal réglé.</p>` : ''}${fige ? `<p class="small muted" style="margin:0">Transmis aux équipes : il fallait le corriger avant ${MC.vagues[a.vague + 1].h} h.</p>` : ''}`;
}
/** Rapport de la nuit d'hier (calculé avec la vraie gravité des appels flous). */
function rapportHier(c) {
  const prev = c.mem.prev;
  if (!prev) return '';
  const fake = { ...c, n: prev };
  const p = plan(fake, prev, { reel: true, v: 2 }), adj = jouerNuit(prev.appels, prev.equipes, { fixe: { ...prev.verrou }, dist: c.dist, capitale: prev.capitale }).pts;
  const ord = Object.keys(prev.fixe).length + prev.rens.length;
  const lignes = [...prev.appels, ...p.suites].sort((x, y) => x.s - y.s).map((a) => { const r = p.res[a.id]; return `<div class="mc-ligne"><span class="muted">${hh(a.s)}</span><span>${esc(a.titre)}${a.flou ? ` (gravité ${a.gReel})` : ''}<br><span class="small muted">${r.eq ? esc([...prev.equipes, rappelDe(prev.capitale)].find((e) => e.id === r.eq).nom) : 'personne'}${prev.fixe[a.id] ? ' (ton ordre)' : ''}${r.fatigue ? ' · fatiguée' : ''}</span></span>${pill(r)}</div>`; }).join('');
  return `<details class="mc-hier" ${c.mem.prevVu ? '' : 'open'}><summary><b>Nuit d’hier : ${p.pts >= 0 ? '+' : ''}${p.pts} point${Math.abs(p.pts) > 1 ? 's' : ''}</b><span class="small muted">${ord ? `${ord} correction${pl(ord)} · ` : 'aucune correction · '}l’adjoint seul aurait fait ${adj >= 0 ? '+' : ''}${adj}</span></summary><div class="mc-lignes">${lignes}</div></details>`;
}

export function renderMainCourante() {
  const c = contexte();
  transmettre(c);
  const n = c.n, v = vague(c), p = plan(c);
  const sel = S.mcSel && [...n.appels.filter((a) => a.vague <= v), ...p.suites].some((a) => a.id === S.mcSel) ? S.mcSel : null;
  const cap = capOrdres(v), used = nbOrdres(n), adj = plan(c, n, { fixe: {} }).pts;
  const jauge = Array.from({ length: 4 }, (_, i) => `<i class="${i < used ? 'pris' : i < cap ? '' : 'ferme'}"></i>`).join('');
  const prochaine = v < 2 ? `prochaine vague à ${MC.vagues[v + 1].h} h` : 'dernière vague · la nuit se joue à 20 h';
  const coach = S.mcAlerte || (sel ? 'Choisis une équipe : regarde le total de la nuit en bas. Une correction coûte un ordre.'
    : used ? `${v < 2 ? `À ${MC.vagues[v + 1].h} h, les appels d’avant ${v === 0 ? '22 h' : '0 h'} partent aux équipes. ` : ''}${cap - used > 0 ? 'Tu peux encore corriger.' : 'Plus d’ordre libre.'}`
      : 'L’adjoint a déjà tout réparti. Vert : maîtrisé, orange : moyen, rouge : raté. Touche un losange pour changer d’équipe.');
  const iso = planIso(c.st, c.me, { vue: 'mazone', sel: sel ? [...n.appels, ...p.suites].find((a) => a.id === sel).cell : null, extra: marqueurs(c, p, sel) });
  return `<main class="screen mc">
    ${STYLE}
    <header class="mc-haut"><div><h1 class="big" style="margin:0">Main courante de nuit</h1><span class="small muted">${connus(n, v).size} appel${pl(connus(n, v).size)} connu${pl(connus(n, v).size)} sur ${n.appels.length} · ${prochaine}</span></div>
      <div class="mc-jauge"><span class="p">${jauge}</span><span>${Math.max(0, cap - used)} ordre${cap - used > 1 ? 's' : ''} libre${cap - used > 1 ? 's' : ''}</span></div></header>
    <p class="mc-test">Phase de test : la nuit n’agit pas encore sur ta zone. Dis ce que tu en penses à la radio.</p>
    ${rapportHier(c)}
    <p class="mc-coach">${esc(coach)}</p>
    <div class="mc-frise">${frise(c, p, sel)}</div>
    <div class="mc-carte">${iso}</div>
    <div class="mc-tiroir" id="mc-tiroir">${tiroir(c, p, sel)}</div>
    <div class="mc-bas"><div><b>${p.pts >= 0 ? '+' : ''}${p.pts} points prévus</b><span class="small muted">adjoint seul : ${adj >= 0 ? '+' : ''}${adj}</span></div>
      <details class="mc-regles"><summary>Règles</summary>
        <p><b>L’adjoint a déjà réparti tes équipes</b> ; tu corriges avec peu d’ordres (2 le matin, +1 à 11 h, +1 à 14 h). À chaque vague, les appels de la précédente partent aux équipes.</p>
        <p><b>Résultat</b> : formée et sur place dans la demi-heure, l’équipe maîtrise (+3). Sinon moyen (+1), débordé (−1), incident (−3) ; une bande n’est arrêtée que par le contrôle (+4). Chaque heure d’attente aggrave d’un cran ; à sa 3e intervention, une équipe fatiguée baisse d’un cran.</p>
        <p><b>Ce que tu rates revient</b> : une rixe ou un tapage mal réglé reprend deux heures plus tard, plus grave. Un appel sur trois est flou (gravité 1 ou 3) : un coup de fil gratuit par vague pour se renseigner.</p>
        <p class="small muted">Tes équipes viennent de ta zone : combis selon tes véhicules, formations selon tes niveaux.</p>
      </details></div>
  </main>${tabbar('carte')}`;
}

/** Ordres : imposer une équipe, reporter, se renseigner, rappeler. */
function choisir(c, sel, eid) {
  const n = c.n, v = vague(c), p0 = plan(c);
  S.mcAlerte = null;
  if (eid === 'rappel') {
    if (n.rappelFige) return;
    if (n.fixe.__rappel) { delete n.fixe.__rappel; for (const k of Object.keys(n.fixe)) if (n.fixe[k] === 'R1') delete n.fixe[k]; }
    else if (capOrdres(v) - nbOrdres(n) >= 1) n.fixe.__rappel = true;
    sauver(c.mem); return;
  }
  if (!sel) return;
  const a = [...n.appels, ...p0.suites].find((q) => q.id === sel);
  if (!a || transmis(c, a)) return;
  if (eid === 'renseigner') { if (a.flou && !n.rens.includes(a.id) && !n.rensVague.includes(v)) { n.rens.push(a.id); n.rensVague.push(v); sauver(c.mem); } return; }
  const r = p0.res[a.id];
  if (n.fixe[a.id] === eid) delete n.fixe[a.id];
  else if (!n.fixe[a.id] && r.eq === eid) return;
  else if (n.fixe[a.id] || nbOrdres(n) < capOrdres(v)) {
    n.fixe[a.id] = eid;
    const sans = { ...n.fixe }; delete sans[a.id];
    if (eid !== 'attente' && plan(c, n, { fixe: sans }).res[a.id].eq === eid) delete n.fixe[a.id];
  }
  // Un ordre posé sur une reprise qui n'existe plus est rendu.
  const p1 = plan(c);
  for (const k of Object.keys(n.fixe)) if (k !== '__rappel' && !p1.res[k] && !n.appels.some((q) => q.id === k)) delete n.fixe[k];
  // Ce que l'ordre dégrade ailleurs.
  const rang = { arretee: 5, maitrise: 4, moyen: 3, reporte: 2, deborde: 1, incident: 0 };
  const bits = [];
  for (const [id, x] of Object.entries(p1.res)) { if (id === a.id || !p0.res[id] || rang[x.statut] >= rang[p0.res[id].statut]) continue; const q = [...n.appels, ...p1.suites].find((z) => z.id === id); if (q) bits.push(`${q.titre.split(' :')[0].toLowerCase()} de ${hh(q.s)} passe à « ${STATUTS[x.statut]} »`); }
  for (const q of p1.suites) if (!p0.suites.some((z) => z.id === q.id)) bits.push(`${q.titre.split(' :')[0].toLowerCase()} reprendra à ${hh(q.s)}`);
  S.mcAlerte = bits.length ? `Attention : ${bits.slice(0, 2).join(', ')}.` : null;
  sauver(c.mem);
}

/** Branche les touchers de l'écran (appelé après chaque affichage). */
export function monterMainCourante(rerender) {
  const m = document.querySelector('main.mc');
  if (!m || m.dataset.monte) return;
  m.dataset.monte = '1';
  const hier = m.querySelector('.mc-hier');
  if (hier) hier.addEventListener('toggle', () => { const c = contexte(); if (!c.mem.prevVu) { c.mem.prevVu = true; sauver(c.mem); } });
  m.addEventListener('click', (e) => {
    const ap = e.target.closest('[data-mc]');
    if (ap) {
      e.preventDefault(); e.stopPropagation();
      S.mcAlerte = null; S.mcSel = S.mcSel === ap.dataset.mc ? null : ap.dataset.mc;
      rerender();
      const t = document.getElementById('mc-tiroir');
      if (t && t.getBoundingClientRect().top > innerHeight - 140) t.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    const b = e.target.closest('[data-mce]');
    if (b && !b.disabled) { e.preventDefault(); choisir(contexte(), S.mcSel, b.dataset.mce); rerender(); }
  }, true);
  m.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-mc]')) { e.preventDefault(); e.target.closest('[data-mc]').dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
}

/** Ligne d'entrée dans la Carte (calque Ma zone). */
export function entreeMainCourante() {
  const st = S.state, me = myZone();
  if (!st || !me) return '';
  let info = '';
  try { const c = contexte(); const v = vague(c); info = `${connus(c.n, v).size} appel${pl(connus(c.n, v).size)} connu${pl(connus(c.n, v).size)} · ${Math.max(0, capOrdres(v) - nbOrdres(c.n))} ordre${capOrdres(v) - nbOrdres(c.n) > 1 ? 's' : ''} libre${capOrdres(v) - nbOrdres(c.n) > 1 ? 's' : ''}${c.mem.prev && !c.mem.prevVu ? ' · rapport d’hier' : ''}`; } catch (e) { console.warn(e); }
  return `<style>.mc-entree{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:#141B33;border:1px solid rgba(255,178,63,.45);color:inherit;text-decoration:none;margin-bottom:8px}.mc-entree > span:nth-child(2){flex:1;display:flex;flex-direction:column;min-width:0}.mc-entree b{font-size:14.5px}.mc-entree span span{font-size:12px;color:#96A0BF}</style><a class="mc-entree" href="#nuit"><span aria-hidden="true">🌙</span><span><b>Main courante de nuit</b><span>${esc(info)} · en test</span></span><span aria-hidden="true">›</span></a>`;
}

const STYLE = `<style>
.mc{display:flex;flex-direction:column;gap:10px;padding-bottom:150px}
.mc-haut{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
.mc-jauge{display:flex;flex-direction:column;align-items:flex-end;gap:3px;font-size:11px;color:var(--muted,#96A0BF)}
.mc-jauge .p{display:flex;gap:4px}.mc-jauge i{width:14px;height:14px;border-radius:50%;background:#FFB23F}.mc-jauge i.pris{background:transparent;border:2px solid #FFB23F}.mc-jauge i.ferme{background:transparent;border:2px dashed #29345A}
.mc-test{margin:0;font-size:12.5px;color:#C3C9DE;padding:6px 10px;border-radius:10px;border:1px dashed #29345A}
.mc-coach{margin:0;padding:8px 10px;border-radius:10px;background:rgba(255,178,63,.13);border:1px solid rgba(255,178,63,.3);font-size:13.5px;min-height:40px}
.mc-frise svg{width:100%;height:auto;display:block;font-family:inherit}
.mc-h{font-size:10.5px;font-weight:700;fill:#96A0BF}.mc-l{font-size:10.5px;font-weight:700;fill:#EDF0FA}.mc-g{font-size:9px;font-weight:800;fill:#FFF3E0}.mc-av{font-size:8px;font-weight:800}
.mc-ap{cursor:pointer}
.mc-carte svg{width:100%;height:auto;display:block;max-height:40vh}
.mc-tiroir{display:flex;flex-direction:column;gap:6px;padding:10px;border-radius:14px;background:#141B33;border:1px solid #29345A}
.mc-appel{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.mc-appel b{display:block;font-size:15px}
.mc-tags{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}.mc-tag{font:700 11px var(--body,sans-serif);padding:2px 7px;border-radius:999px;background:#1C2442;color:#C3C9DE}.mc-tag.ok{background:rgba(61,211,154,.13);color:#3DD39A}
.mc-eqs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
.mc-eq{appearance:none;display:grid;grid-template-columns:28px minmax(0,1fr);gap:3px 7px;align-items:center;width:100%;min-height:48px;padding:6px 7px;border-radius:11px;border:1px solid #29345A;background:#1C2442;color:#EDF0FA;font:inherit;text-align:left;cursor:pointer}
.mc-eq:disabled{opacity:.45;cursor:default}.mc-eq.choisi{border-color:#FFB23F;background:rgba(255,178,63,.1)}.mc-eq.adj:not(.choisi){border-style:dashed}
.mc-avb{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font:800 10.5px var(--body,sans-serif)}
.mc-lb{min-width:0}.mc-lb b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mc-lb span{display:block;font-size:11.5px;color:#96A0BF;line-height:1.3}
.mc-res{grid-column:1/-1;justify-self:start;font:700 11.5px var(--body,sans-serif);padding:2px 7px;border-radius:999px;border:1.5px dashed currentColor}.mc-res.v{color:#3DD39A}.mc-res.a{color:#FFB23F}.mc-res.r{color:#FF6E6A}
.mc-pq{grid-column:1/-1;font-size:11.5px;color:#C3C9DE}
.mc-bas{position:sticky;bottom:calc(64px + env(safe-area-inset-bottom,0px));z-index:5;display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:14px;background:rgba(8,12,27,.96);border:1px solid #29345A}
.mc-bas > div b{display:block;font-size:17px}
.mc-regles summary{cursor:pointer;font-size:13px;color:#9DCBFF}.mc-regles p{font-size:13px;margin:6px 0 0;color:#C3C9DE}
.mc-hier{border-radius:14px;background:#141B33;border:1px solid #29345A;padding:10px 12px}.mc-hier summary{cursor:pointer;display:flex;flex-direction:column}
.mc-lignes{display:flex;flex-direction:column;gap:7px;margin-top:8px}.mc-ligne{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:8px;align-items:center;font-size:13px}.mc-ligne .mc-res{grid-column:auto;border-style:solid}
.mc-entree{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:#141B33;border:1px solid rgba(255,178,63,.45);color:inherit;text-decoration:none;margin-bottom:8px}
.mc-entree > span:nth-child(2){flex:1;display:flex;flex-direction:column;min-width:0}.mc-entree b{font-size:14.5px}.mc-entree span span{font-size:12px;color:#96A0BF}
</style>`;
