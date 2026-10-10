// Incidents du jour : la carte de l'HP, et l'ouverture des mini-jeux (incident ou entraînement).
// Les mini-jeux sont des pages à part (dossier minijeux/), ouvertes en plein écran dans un cadre :
// elles renvoient leur résultat par message (start, result, close).
import { chipEntraine } from './chef.js';
import { S, esc, icon, myZone, toast, pseudoJoueur } from './common.js';
import { paramsDefi, noterNiveauDefi } from './defis.js';
import { CHALLENGE } from '../engine/challenge.js';
import { incidentsVisibles, resultatsIncidents, INCIDENTS, MALUS, GAIN, texteMalus, texteGain, difficulte, pointsJauge, INC, URGENCE, texteRisqueUrgence } from '../engine/incidents.js';
import { paramsBitonal, noterScoreBitonal, NOM_NIVEAU } from './bitonal.js';
import { vitesseCombi, vehiculesUrgence, assurerFlotte } from '../engine/flotte.js';
import { parcVehicules } from '../engine/parc.js';
import { PS } from '../engine/constants.js';
import { niveauIncidents } from '../engine/directeur.js';
import { APPUI, appuiDuJour, DIFF_EXPERTS } from '../engine/appui.js';
import { SERVICE_LABELS, DEFAULT_ALLOC } from '../engine/constants.js';
import { TOUS_SKINS, SKINS, DECOR, DECOR_DEFAUT } from '../engine/decor.js';
import { ouvrirPanneau, sceneZone, monDecorPublic, mesSkins } from './logistique.js';
import { ANNEXES_AILE } from './scene-aile.js';

/** Les mini-jeux, pour l'entraînement. */
export const MINI_JEUX = [
  { jeu: 'colis', service: 'intervention', nom: 'Colis suspect' },
  { jeu: 'bitonal', service: 'intervention', nom: 'Bitonal (urgence)' },
  // Tower defense : incident du jour de la Proximité en version courte (3 vagues), version longue au Challenge.
  { jeu: 'bouclage', service: 'proximite', nom: 'Maintien de l’ordre' },
  { jeu: 'crochetage', service: 'recherche', nom: 'Crochetage' },
  { jeu: 'depanneuse', service: 'roulage', nom: 'Dépanneuse' },
  // Plus d'incident du jour (remplacé par le Maintien de l'ordre court) : Challenge seulement.
  { jeu: 'dossier', service: 'proximite', nom: 'Dossier à relire' },
  // Appui fédéral à l'enquête (labo, RCCU) : joués quand une équipe PJF est accordée (voir engine/appui.js), et à l'entraînement.
  { jeu: 'empreintes', service: 'labo', nom: 'Empreintes', label: 'Appui PJF · Labo' },
  { jeu: 'adn', service: 'labo', nom: 'Fragment d’ADN', label: 'Appui PJF · Labo' },
  { jeu: 'reseau', service: 'rccu', nom: 'Réseau à reconnecter', label: 'Appui PJF · RCCU' },
  { jeu: 'interception', service: 'rccu', nom: 'Interception', label: 'Appui PJF · RCCU' },
];

export function mesIncidents() {
  if (!S.state || !S.user) return [];
  return incidentsVisibles(S.state, S.user.uid);
}
export const mesResultats = (liste = mesIncidents()) => resultatsIncidents(S.player, liste);

/** Agents du service : ordres validés, sinon ceux d'hier, sinon la répartition de base. */
/** Explication du niveau d'un incident : seuils du service et cran du Directeur. */
export function pourquoiIncident(service, n, aj = 0) {
  const base = DEFAULT_ALLOC[service] || 1;
  const minNormal = Math.ceil(base * 0.7 - 1e-9), minFacile = Math.ceil(base * 1.5 - 1e-9);
  const svc = SERVICE_LABELS[service] || service;
  const d = Math.max(-1, Math.min(1, Math.round(Number(aj) || 0)));
  return `${n} agent${n > 1 ? 's' : ''} au service ${svc} en service quand l’incident est tombé (ordres validés à 20:00 ; base : ${base}). Niveau fixé, changer tes ordres n’y fait rien. Moins de ${minNormal} : difficile · de ${minNormal} à ${minFacile - 1} : normal · ${minFacile} ou plus : facile.`
    + (d ? ` Le Directeur rend l’incident d’un cran plus ${d < 0 ? 'facile' : 'difficile'}, vu tes derniers mini-jeux.` : '');
}

/** Agents du service en service aujourd'hui : figés dans l'incident (jamais les ordres en cours d'édition). */
function agentsService(service, inc) {
  if (inc && Number.isFinite(inc.agents)) return inc.agents;
  const z = myZone();
  const a = (z && z.dernierOrdre && z.dernierOrdre.alloc) || DEFAULT_ALLOC;
  return a[service] || 0;
}

/** 'avenir' | 'ouvert' | 'joue' | 'clos' */
export function etat(inc, res, now = Date.now()) {
  if (res) return 'joue';
  if (now < inc.ouvre) return 'avenir';
  if (now < inc.ferme) return 'ouvert';
  return 'clos';
}

/** Durée lisible : « 2 h 05 » ou « 12 min ». */
export function duree(ms) {
  const m = Math.max(0, Math.ceil(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
}

/** Points de jauge gagnés aujourd'hui (pas encore comptés : ils le seront à 20:00). */
export function jaugeDuJour() {
  const z = myZone();
  const res = Object.values(mesResultats());
  return { base: (z && z.jaugeIncidents) || 0, plus: res.reduce((s, r) => s + pointsJauge(r), 0) };
}

/** Incident ouvert et pas encore joué (pour la liste « à faire »). */
export function incidentEnCours() {
  const res = mesResultats();
  return mesIncidents().find((i) => etat(i, res[i.id]) === 'ouvert') || null;
}

/** Signature de l'état des incidents : sert à redessiner l'HP quand un incident s'ouvre ou se ferme. */
export const signatureIncidents = () => { const res = mesResultats(); return mesIncidents().map((i) => etat(i, res[i.id])).join(','); };

/** `avant` : lignes ajoutées en tête (HP allégée : l'événement du jour) ; `titre` : titre de la carte. */
/** `nu` : seulement les lignes (HP : section « Aujourd'hui »), sans carte ni jauge. */
export function incidentsHtml({ avant = '', titre = 'Incidents du jour', nu = false } = {}) {
  const liste = mesIncidents();
  const appuiRow = ligneAppuiHp();
  if (!liste.length && !appuiRow && !avant) return '';
  const res = mesResultats(liste), now = Date.now();
  const { base, plus } = jaugeDuJour();
  const prochain = liste.find((i) => etat(i, res[i.id], now) === 'avenir');
  const lignes = liste.filter((i) => etat(i, res[i.id], now) !== 'avenir').map((i) => {
    const e = etat(i, res[i.id], now), r = res[i.id];
    const svc = `<span class="tiny muted">${SERVICE_LABELS[i.service]}</span>`;
    if (e === 'ouvert') return `<div class="inc-row inc-ouvert${i.urgence ? ' inc-urgence' : ''}"><span class="inc-ico" aria-hidden="true">${i.urgence ? '🚨' : icon('alert', 18)}</span>
      <span class="col grow" style="gap:1px;min-width:0"><span style="font-weight:700">${esc(i.titre)}</span><span class="tiny muted">${i.urgence ? `Urgence · combi à ${Math.round(31 * 3.6 * (i.vit || 1))} km/h` : SERVICE_LABELS[i.service]}${i.pression ? ' · en plus (IPZ élevé)' : ''} · encore <span data-inc-fin="${i.ferme}">${duree(i.ferme - now)}</span> pour intervenir</span>${chipEntraine(i.urgence ? 'intervention' : i.service)}</span>
      <button class="btn primary small" data-action="incident" data-id="${esc(i.id)}">Intervenir</button></div>`;
    if (e === 'joue') {
      const ok = r.statut === 'ok';
      const passe = r.statut === 'passe';
      return `<div class="inc-row"><span class="inc-ico ${passe ? '' : ok ? 'ok' : 'bad'}" aria-hidden="true">${icon(passe ? 'clock' : ok ? 'check' : 'alert', 16)}</span>
        <span class="col grow" style="gap:1px;min-width:0"><span style="font-weight:600">${esc(i.titre)}</span>${i.urgence ? `<span class="tiny muted">Urgence${r.score ? ` · ${Number(r.score).toLocaleString('fr-BE')} points` : ''}</span>` : svc}</span>
        <span class="pill ${r.statut === 'passe' ? '' : ok ? 'green' : 'red'}">${r.statut === 'passe' ? 'Pas le temps · sans effet' : ok ? `${i.urgence ? 'À temps' : 'Réussi'} · +${pointsJauge(r)}` : r.statut === 'abandon' ? 'Abandonné' : i.urgence ? (r.raison === 'hs' ? 'Accrochages · cabossé' : 'Trop tard') : 'Raté'}</span></div>`;
    }
    return `<div class="inc-row"><span class="inc-ico" aria-hidden="true">${icon('clock', 16)}</span>
      <span class="col grow" style="gap:1px;min-width:0"><span style="font-weight:600">${esc(i.titre)}</span><span class="tiny muted">${i.urgence ? 'Urgence' : SERVICE_LABELS[i.service]} · non traité : ton équipe s’en charge seule, résultat à 20:00</span></span></div>`;
  });
  const attente = prochain ? `<div class="inc-row inc-attente"><span class="inc-ico" aria-hidden="true">${icon('clock', 16)}</span><span class="col grow" style="gap:1px"><span style="font-weight:600">${prochain.urgence ? '🚨 Une urgence va tomber aujourd’hui' : lignes.length ? 'Un autre incident va tomber' : 'Un incident va tomber aujourd’hui'}</span><span class="tiny muted">${prochain.urgence ? 'des collègues demanderont du renfort' : 'sur un de tes services'}, dans <strong class="mono" data-inc-cd="${prochain.ouvre}">${duree(prochain.ouvre - now)}</strong> · ouvert jusqu’à 20:00</span></span></div>` : '';
  if (nu) return `${avant}${appuiRow}${lignes.join('')}${attente}`;
  return `<section class="card" id="hp-incidents" aria-label="Incidents du jour" style="gap:8px;scroll-margin-top:16px">
    <div class="between"><span class="kicker">${titre}</span><a class="tiny" href="#guide-incidents">${avant ? 'Les incidents ?' : 'Comment ça marche ?'}</a></div>
    ${avant}${appuiRow}${lignes.join('')}
    ${prochain ? attente
      : !lignes.some((l) => l.includes('inc-ouvert')) ? '<p class="tiny muted" style="margin:0">Plus d’incident aujourd’hui. Les prochains tombent demain, entre 6 h et 12 h, et restent ouverts jusqu’à 20:00.</p>' : ''}
    <button type="button" class="between small jauge-btn" data-action="jauge-skins" aria-label="Jauge des skins : voir ce que tu peux gagner"><span class="row muted" style="gap:6px">${icon('star', 14)} Jauge des skins</span>
      <span class="row" style="gap:8px"><span role="img" aria-label="${base} sur ${INC.jauge}" style="width:90px;height:5px;background:var(--line);border-radius:3px;display:inline-block;overflow:hidden"><span style="display:block;width:${Math.min(100, (base / INC.jauge) * 100)}%;height:5px;background:var(--amber)"></span></span>
      <span class="mono">${base}/${INC.jauge}${plus ? ` <span class="ok">+${plus}</span>` : ''}</span></span>${icon('chevron', 12)}</button>
  </section>`;
}

/** Jauge des skins en une ligne (HP). */
export function jaugeSkinsLigne() {
  const { base, plus } = jaugeDuJour();
  return `<button type="button" class="hp-jauge" data-action="jauge-skins" aria-label="Jauge des skins : ${base} sur ${INC.jauge}, voir ce que tu peux gagner">${icon('star', 14)}<span>Jauge des skins</span>
    <span class="hp-jauge-barre" aria-hidden="true"><i style="width:${Math.min(100, (base / INC.jauge) * 100)}%"></i></span><b class="mono">${base}/${INC.jauge}${plus ? ` <span class="ok">+${plus}</span>` : ''}</b></button>`;
}

/** Met à jour les comptes à rebours sans redessiner l'écran. */
export function majComptesIncidents() {
  const now = Date.now();
  document.querySelectorAll('[data-inc-cd]').forEach((el) => { el.textContent = duree(Number(el.dataset.incCd) - now); });
  document.querySelectorAll('[data-inc-fin]').forEach((el) => { el.textContent = duree(Number(el.dataset.incFin) - now); });
}

async function enregistrer(id, res) {
  const st = S.state;
  const cur = (S.player && S.player.incidents && S.player.incidents.r) || {};
  // Une réponse donnée ne change plus (sauf l'abandon provisoire posé au lancement).
  if (cur[id] && cur[id].statut !== 'abandon') return;
  // On ne garde que les résultats des incidents encore visibles (ceux du jour et les reportés d'hier).
  const garder = new Set(mesIncidents().map((i) => i.id));
  const r = Object.fromEntries(Object.entries(cur).filter(([k]) => garder.has(k)));
  const incidents = { cle: `s${st.season}t${st.turn}`, r: { ...r, [id]: { ...res, at: Date.now() } } };
  S.player = { ...(S.player || {}), incidents };
  await S.backend.savePlayer(S.user.uid, S.player);
}

/**
 * Ouvre un mini-jeu en plein écran.
 * @param {string} jeu        colis | crochetage | depanneuse | dossier
 * @param {object} o          { mode: 'incident'|'train', inc, onFin }
 */
/** Gain affiché d'un incident : sans affaire en cours, l'indice de la Recherche devient +2 k€ (comme à la résolution). */
function gainAffiche(service) {
  const g = GAIN[service];
  if (g && g.indice && !(S.state && S.state.enquete && !S.state.enquetePause)) return '+2 k€ (pas d’enquête en cours)';
  return texteGain(g);
}

/** Records par quartier d'un mini-jeu à cartes : { [carte]: { rec: { nom, score }, moi } } (premier arrivé en cas d'égalité). */
export function recordsQuartiers(jeu) {
  const out = {}, moi = S.user && S.user.uid;
  for (const [uid, p] of Object.entries(S.players || {})) {
    if (!p || p.retire) continue;
    const q = p.quartiers && p.quartiers[jeu]; if (!q) continue;
    for (const [m, e] of Object.entries(q)) {
      const sc = Math.floor(Number(e && e.s) || 0); if (sc <= 0) continue;
      const o = out[m] || (out[m] = {});
      if (uid === moi) o.moi = sc;
      if (!o.rec || sc > o.rec.score || (sc === o.rec.score && (e.at || 0) < o.rec.at)) o.rec = { nom: uid === moi ? 'toi' : pseudoJoueur(uid), score: sc, at: e.at || 0 };
    }
  }
  return out;
}
/** Enregistre un quartier réussi s'il bat le meilleur score personnel sur ce quartier. */
async function noterQuartier(jeu, m, score) {
  const sc = Math.floor(Number(score) || 0), k = String(Math.floor(Number(m)));
  if (!S.user || !S.backend || sc <= 0 || !/^\d+$/.test(k)) return;
  const p = { ...(S.player || {}) }, q = { ...((p.quartiers || {})[jeu] || {}) };
  if (q[k] && q[k].s >= sc) return;
  q[k] = { s: sc, at: Date.now() };
  p.quartiers = { ...(p.quartiers || {}), [jeu]: q };
  S.player = p;
  S.players = { ...(S.players || {}), [S.user.uid]: { ...((S.players || {})[S.user.uid] || {}), quartiers: p.quartiers } };
  await S.backend.savePlayer(S.user.uid, p);
}

export function ouvrirMiniJeu(jeu, { mode = 'train', inc = null, appui = null, evt = null, onFin = () => {}, onEntrainement = () => {}, onDefi = () => {} } = {}) {
  document.querySelector('.mj-wrap')?.remove();
  if (jeu === 'tracage') jeu = 'interception'; // appui accordé avant le remplacement du traçage d'IP
  const p = new URLSearchParams({ mode });
  if (jeu === 'bitonal') {
    const v = mode === 'incident' && inc && Number.isFinite(inc.vit) ? { mult: inc.vit, frein: inc.frein || 1, etat: inc.etat, prepa: inc.prepa || 0, cabosse: !!inc.cabosse } : vitesseCombi(myZone());
    for (const [k, val] of Object.entries(paramsBitonal(v))) p.set(k, val);
    // Véhicules au choix : ceux disponibles quand l'urgence est tombée (ou, à l'entraînement, ceux d'aujourd'hui).
    const z = myZone(), T = S.state.turn;
    if (z) {
      assurerFlotte(z);
      const noms = Object.fromEntries(parcVehicules(z, T).map((x) => [x.slot, x.nom]));
      const l = mode === 'incident' && inc && Array.isArray(inc.vehicules) ? inc.vehicules : vehiculesUrgence(z, T);
      p.set('vh', JSON.stringify(l.map((x) => ({ s: x.slot, n: noms[x.slot] || 'Véhicule', m: x.m, e: x.etat, c: x.cabosse ? 1 : 0, v: x.mult, f: x.frein, a: x.accel, x: x.maniab, p: x.pv }))));
    }
    if (inc && inc.seed) p.set('seed', String(inc.seed));
    // Urgence : temps cible figé quand elle est tombée (ajusté chaque nuit sur les courses de la partie).
    if (inc && inc.urgence && Number.isFinite(inc.cible) && inc.diff) { p.set(`c_${inc.diff}`, String(inc.cible)); p.set(`k_${inc.diff}`, String(inc.courses || 0)); }
  }
  if (mode === 'incident' && inc) {
    const n = agentsService(inc.service, inc), { base, plus } = jaugeDuJour();
    const aj = Number.isFinite(inc.ajust) ? inc.ajust : niveauIncidents(myZone());
    p.set('id', inc.id); p.set('agents', String(n)); p.set('diff', difficulte(inc.service, n, aj));
    p.set('pourquoi', pourquoiIncident(inc.service, n, aj));
    p.set('jauge', String(base + plus));
    if (inc.urgence) { p.set('malus', texteRisqueUrgence()); p.set('gain', `+${URGENCE.gain.moral} de moral, +${PS.queteOk} PS, jauge des skins`); }
    else { p.set('malus', inc.pression ? 'aucun : incident en plus, facultatif' : `au pire ${texteMalus(MALUS[inc.service].leger)}, et jamais plus que si tu n’y vas pas : ton équipe peut encore rattraper le coup`); p.set('gain', inc.pression ? `+${PS.queteOk} PS et la jauge des skins doublée (incident en plus : ta zone est très en vue)` : `${gainAffiche(inc.service)}, +${PS.queteOk} PS`); }
  }
  if (mode === 'renfort' && appui) {
    const u = APPUI.unites[appui.unite];
    const ex = Math.max(1, Math.min(3, appui.experts || 2));
    p.set('id', appui.id); p.set('agents', String(ex)); p.set('diff', DIFF_EXPERTS[ex]);
    const [un, des] = appui.unite === 'rccu' ? ['enquêteur', 'enquêteurs'] : ['expert', 'experts'];
    p.set('pourquoi', `2 ${des} de base${(appui.pourquoi || []).map((r) => ` · ${r}`).join('')}. 1 ${un} : difficile, 2 : normal, 3 : facile.`);
    p.set('gain', `une pièce ${appui.unite === 'labo' ? 'sur les moyens' : 'sur le mobile ou l’occasion'} d’un suspect, au dossier à 20:00`);
    p.set('malus', `pas de pièce, l’équipe ${u.court} repart`);
  }
  if (mode === 'train') for (const [k, v] of Object.entries(paramsDefi(jeu))) p.set(k, v);
  if (evt) p.set('evt', evt); // événement d'actualité : scénario du mini-jeu
  const wrap = document.createElement('div');
  wrap.className = 'mj-wrap';
  wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true');
  const nomJeu = (MINI_JEUX.find((m) => m.jeu === jeu) || {}).nom || (jeu === 'luc' ? 'Rattrape Luc' : '');
  const enjeu = mode === 'incident' || mode === 'renfort';
  // Barre du haut : un gros bouton « Retour » toujours visible, commun à tous les mini-jeux.
  wrap.innerHTML = `<div class="mj-barre"><button type="button" class="mj-retour" aria-label="Quitter le mini-jeu et revenir à ma zone"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Retour à ma zone</button><span class="mj-nom">${esc(nomJeu)}</span></div>
    <iframe src="minijeux/${jeu}.html?${p}" title="Mini-jeu ${esc(nomJeu)}" allow="autoplay; fullscreen"></iframe>`;
  let enCours = false; // incident ou appui lancé et pas encore terminé
  // Maintien de l'ordre : les cortèges marchent sur NOTRE hôtel de police, avec ses skins (dessin de l'HP, sans le décor autour).
  if (jeu === 'bouclage') {
    try {
      const z = myZone();
      if (z) {
        // Le mini-jeu redessine l'hôtel de police dans son propre style (vue de trois quarts) avec nos couleurs :
        // façade (ou skin de bâtiment), enseigne néon, nombre d'étages et nom de la zone.
        const d = { ...DECOR_DEFAUT, ...(monDecorPublic(z) || {}) }, sb = (mesSkins(z).choix || {}).batiment;
        const skinB = sb && SKINS.batiment.options[sb], fac = skinB ? skinB.jour : (DECOR.facade.options[d.facade] || DECOR.facade.options.beton).jour;
        const neon = DECOR.neon.options[d.neon] || DECOR.neon.options.bleu;
        const hp = { nom: z.nom, b: (z.batiments && z.batiments.bureaux) || 1, facade: fac, neon: { lettre: neon.lettre, halo: neon.halo }, skin: skinB ? skinB.nom : '' };
        // Petits avantages venus de la zone (stand de tir, drone, atelier, équipement, combis en état) et records par quartier.
        const T = S.state.turn, parc = parcVehicules(z, T).filter((v) => v.etat !== 'atelier' && v.type !== 'anonyme');
        const zone = { tir: !!(z.infra && z.infra.tir), atelier: !!(z.infra && z.infra.garage), drone: (z.lots || []).some((l) => (l.id || l) === 'drone'),
          equip: (z.equip && z.equip.intervention) || 1, combis: parc.length };
        const fr = wrap.querySelector('iframe');
        fr.addEventListener('load', () => fr.contentWindow && fr.contentWindow.postMessage({ source: 'mazp-parent', type: 'hp', hp, zone, quartiers: recordsQuartiers('bouclage') }, location.origin));
      }
    } catch (e) { /* le mini-jeu garde son hôtel de ville */ }
  }
  const fermer = () => { window.removeEventListener('message', recevoir); wrap.remove(); document.body.classList.remove('mj-ouvert'); onFin(); };
  // Partie d'incident ou d'appui en cours : le jeu met en pause et demande confirmation (un seul essai), puis se ferme lui-même.
  wrap.querySelector('.mj-retour').addEventListener('click', () => {
    const fen = wrap.querySelector('iframe').contentWindow;
    if (enCours && enjeu && fen) fen.postMessage({ source: 'mazp', type: 'quitter' }, location.origin); else fermer();
  });
  async function recevoir(e) {
    const d = e.data;
    if (e.origin !== location.origin || !d || d.source !== 'mazp-mj') return;
    if (d.type === 'start') enCours = true;
    if (d.type === 'result') enCours = false;
    try {
      if (mode === 'incident' && inc && d.id === inc.id) {
        if (d.type === 'start') await enregistrer(inc.id, { statut: 'abandon', fautes: 1 });
        if (d.type === 'result' && inc.urgence) {
          const niv = ['facile', 'normal', 'difficile'].includes(d.niveau) ? d.niveau : null;
          await enregistrer(inc.id, { statut: d.passe ? 'passe' : d.ok ? 'ok' : d.abandon ? 'abandon' : 'rate', fautes: Math.max(0, Math.min(3, Number(d.fautes) || 0)), ...(d.raison === 'hs' ? { raison: 'hs' } : {}), ...(Number.isFinite(Number(d.temps)) && d.temps > 0 ? { temps: Math.round(Number(d.temps) * 10) / 10 } : {}), ...(Number.isInteger(d.vehicule) && (inc.vehicules || []).some((x) => x.slot === d.vehicule) ? { vehicule: d.vehicule } : {}), ...(d.score ? { score: Math.floor(Number(d.score) || 0) } : {}), ...(niv ? { niveau: niv } : {}) });
          if (!d.passe && niv && d.score > 0 && await noterScoreBitonal(niv, d.score)) toast(`Nouveau meilleur score de la partie en ${NOM_NIVEAU[niv].toLowerCase()} : ${Math.floor(d.score).toLocaleString('fr-BE')} !`);
        } else if (d.type === 'result') await enregistrer(inc.id, { statut: d.ok ? 'ok' : d.abandon ? 'abandon' : 'rate', fautes: Number(d.fautes) || 0, ...(d.ok && d.bonus === true ? { bonus: true } : {}) });
      }
      if (mode === 'train' && d.type === 'result' && !d.abandon) onEntrainement({ minijeux: 1 });
      if (mode === 'train' && d.type === 'quartier' && d.jeu === jeu) await noterQuartier(jeu, d.map, d.score);
      // Bitonal au Challenge : la course compte pour les meilleurs scores, comme une urgence (sauf arrêt forcé).
      if (mode === 'train' && jeu === 'bitonal' && d.type === 'result' && !d.abandon && d.raison !== 'hs') {
        const niv = ['facile', 'normal', 'difficile'].includes(d.niveau) ? d.niveau : null;
        if (niv && d.score > 0 && await noterScoreBitonal(niv, d.score)) toast(`Nouveau meilleur score de la partie en ${NOM_NIVEAU[niv].toLowerCase()} : ${Math.floor(d.score).toLocaleString('fr-BE')} !`);
      }
      // Défi d'endurance : chaque niveau réussi peut battre le record personnel (et celui de la partie).
      if (mode === 'train' && d.type === 'defi' && d.jeu === jeu) { onDefi(d.niveau); const rec = await noterNiveauDefi(jeu, d.niveau); if (rec) toast(jeu === 'luc' ? `Nouveau record de la partie : Luc rattrapé ${d.niveau} fois de suite !` : `Nouveau record de la partie : ${nomJeu || jeu}, niveau ${d.niveau} !`); }
      if (mode === 'renfort' && appui && d.id === appui.id) {
        if (d.type === 'start') await enregistrerAppui(appui.id, 'abandon');
        if (d.type === 'result') await enregistrerAppui(appui.id, d.ok ? 'ok' : d.abandon ? 'abandon' : 'rate');
      }
    } catch (err) { console.warn('Résultat de l’incident non enregistré', err); }
    if (d.type === 'close') fermer();
  }
  window.addEventListener('message', recevoir);
  document.body.appendChild(wrap);
  document.body.classList.add('mj-ouvert');
}

/** Résultat du mini-jeu d'appui fédéral (profil du joueur), lu à la résolution de 20:00. */
async function enregistrerAppui(id, statut) {
  const cur = S.player && S.player.appui;
  if (cur && cur.id === id && cur.statut !== 'abandon') return; // une réponse donnée ne change plus
  S.player = { ...(S.player || {}), appui: { id, statut, at: Date.now() } };
  await S.backend.savePlayer(S.user.uid, S.player);
}

/** Appui obtenu pour aujourd'hui et son résultat éventuel. */
export function monAppui() {
  const a = S.state && S.user ? appuiDuJour(S.state, S.state.zones[S.user.uid]) : null;
  if (!a) return null;
  const r = S.player && S.player.appui && S.player.appui.id === a.id ? S.player.appui : null;
  return { ...a, res: r, nomJeu: (MINI_JEUX.find((m) => m.jeu === (a.jeu === 'tracage' ? 'interception' : a.jeu)) || {}).nom || a.jeu };
}

/** Lance le mini-jeu de l'appui du jour (un seul essai). */
export function lancerAppui(onFin) {
  const a = monAppui();
  if (!a) return 'Pas d’équipe PJF pour toi aujourd’hui.';
  if (a.res) return 'Analyse déjà faite.';
  ouvrirMiniJeu(a.jeu, { mode: 'renfort', appui: a, onFin });
  return null;
}

/** Ligne de l'HP : une équipe PJF attend son analyse. */
function ligneAppuiHp() {
  const a = monAppui();
  if (!a || a.res) return '';
  const u = APPUI.unites[a.unite];
  return `<div class="inc-row inc-ouvert"><span class="inc-ico" aria-hidden="true">${icon('loupe', 18)}</span>
      <span class="col grow" style="gap:1px;min-width:0"><span style="font-weight:700">Appui ${esc(u.court)} : ${esc(a.nomJeu)}</span><span class="tiny muted">Enquête · l’équipe attend ton analyse jusqu’à 20:00</span></span>
      <button class="btn primary small" data-action="appui-jouer">Analyser</button></div>`;
}

/** Lance l'incident demandé, s'il est bien ouvert et pas encore joué. */
export function lancerIncident(id, onFin) {
  const inc = mesIncidents().find((i) => i.id === id);
  if (!inc) return 'Incident introuvable.';
  const e = etat(inc, mesResultats()[inc.id]);
  if (e === 'joue') return 'Incident déjà traité.';
  if (e !== 'ouvert') return e === 'avenir' ? 'Cet incident n’est pas encore tombé.' : 'Trop tard : cet incident est clos.';
  ouvrirMiniJeu(inc.jeu, { mode: 'incident', inc, onFin });
  return null;
}

export { INCIDENTS };

/** Fenêtre « Jauge des skins » : comment elle se remplit et tous les skins à gagner (aperçu au toucher). */
export function ouvrirJaugeSkins(apercu = null) {
  const z = myZone();
  if (!z) return;
  const { base, plus } = jaugeDuJour();
  const own = new Set(z.skins || []);
  const manquants = TOUS_SKINS.filter((s) => !own.has(`${s.cat}:${s.id}`)).length;
  const sk = apercu ? TOUS_SKINS.find((s) => `${s.cat}:${s.id}` === apercu) : null;
  const sansAile = sk && sk.cat === 'aile' && !ANNEXES_AILE.some((k) => z.infra && z.infra[k]);
  const parCat = Object.keys(SKINS).filter((c) => c !== 'fete').map((cat) => {
    const l = TOUS_SKINS.filter((s) => s.cat === cat);
    return `<div class="col" style="gap:6px"><span class="tiny muted">${esc(SKINS[cat].titre)}</span><div class="decor-opts">${l.map((s) => {
      const k = `${s.cat}:${s.id}`, a = own.has(k);
      return `<button type="button" class="decor-opt${apercu === k ? ' on' : ''}${a ? '' : ' verrou'}" data-action="jauge-apercu" data-k="${esc(k)}" aria-pressed="${apercu === k}"><span>${esc(s.nom)}</span><span class="cond">${a ? `${icon('check', 11)} à toi` : `${icon('lock', 11)} à gagner`}</span></button>`;
    }).join('')}</div></div>`;
  }).join('');
  ouvrirPanneau(`<div class="col" style="gap:10px">
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><h2 id="aide-titre" class="aide-titre" style="margin:0">Jauge des skins</h2>
      <span class="tiny muted">${own.size ? `${TOUS_SKINS.length - manquants} skin${TOUS_SKINS.length - manquants > 1 ? 's' : ''} sur ${TOUS_SKINS.length}` : `${TOUS_SKINS.length} skins à collectionner`}</span></div>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <div class="between small"><span><strong>${base}</strong> / ${INC.jauge}${plus ? ` <span class="ok">+${plus} ce soir</span>` : ''}</span>
      <span role="img" aria-label="${base} sur ${INC.jauge}" style="flex:1;max-width:60%;height:8px;background:var(--line);border-radius:4px;overflow:hidden"><span style="display:block;width:${Math.min(100, (base / INC.jauge) * 100)}%;height:8px;background:var(--amber)"></span></span></div>
    <p class="small" style="margin:0">Chaque incident du jour réussi en jouant remplit la jauge : <strong>+2 sans faute</strong>, +1 avec des fautes. Une prime du Challenge (meilleur niveau de la semaine sur un mini-jeu) ajoute <strong>+${CHALLENGE.jauge}</strong>. À ${INC.jauge}, tu gagnes <strong>un skin au hasard parmi ceux que tu n’as pas encore</strong>${manquants ? '' : ' (tu les as tous : la jauge pleine rapporte +5 k€)'}. Il s’équipe dans « Personnaliser mon commissariat » et les autres zones le voient.</p>
    ${sk ? `<div class="card amber tight" style="gap:6px"><span class="kicker">Aperçu · ${esc(SKINS[sk.cat].titre)}</span><span style="font-weight:700">${esc(sk.nom)}</span><span class="tiny" style="color:var(--amber-soft)">${esc(sk.texte || '')}</span>
      <div class="scene-voisin">${sceneZone(sansAile ? { ...z, infra: { ...(z.infra || {}), sport: true } } : z, S.state, monDecorPublic(z), { [sk.cat]: sk.id })}</div>
      ${sansAile ? '<span class="tiny muted">L’aile apparaît avec ta première annexe (aperçu avec une salle de sport).</span>' : ''}</div>`
      : '<p class="tiny muted" style="margin:0">Touche un skin pour le voir sur ton commissariat.</p>'}
    ${parCat}
  </div>`);
}
