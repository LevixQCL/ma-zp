// Incidents du jour : la carte de l'HP, et l'ouverture des mini-jeux (incident ou entraînement).
// Les mini-jeux sont des pages à part (dossier minijeux/), ouvertes en plein écran dans un cadre :
// elles renvoient leur résultat par message (start, result, close).
import { S, esc, icon, myZone } from './common.js';
import { incidentsVisibles, resultatsIncidents, INCIDENTS, MALUS, GAIN, texteMalus, texteGain, difficulte, pointsJauge, INC } from '../engine/incidents.js';
import { PS } from '../engine/constants.js';
import { SERVICE_LABELS, DEFAULT_ALLOC } from '../engine/constants.js';

/** Les mini-jeux, pour l'entraînement. */
export const MINI_JEUX = [
  { jeu: 'colis', service: 'intervention', nom: 'Colis suspect' },
  { jeu: 'crochetage', service: 'recherche', nom: 'Crochetage' },
  { jeu: 'depanneuse', service: 'roulage', nom: 'Dépanneuse' },
  { jeu: 'dossier', service: 'proximite', nom: 'Dossier à relire' },
  // Renfort fédéral (labo) : en test, seulement à l'entraînement pour l'instant.
  { jeu: 'empreintes', service: 'labo', nom: 'Empreintes', label: 'Labo · en test' },
  { jeu: 'adn', service: 'labo', nom: 'Fragment d’ADN', label: 'Labo · en test' },
  { jeu: 'reseau', service: 'rccu', nom: 'Réseau à reconnecter', label: 'RCCU · en test' },
  { jeu: 'tracage', service: 'rccu', nom: 'Traçage d’IP', label: 'RCCU · en test' },
];

export function mesIncidents() {
  if (!S.state || !S.user) return [];
  return incidentsVisibles(S.state, S.user.uid);
}
export const mesResultats = (liste = mesIncidents()) => resultatsIncidents(S.player, liste);

/** Agents du service : ordres validés, sinon ceux d'hier, sinon la répartition de base. */
function agentsService(service) {
  const z = myZone();
  const a = (S.savedOrders && S.savedOrders.alloc) || (z && z.dernierOrdre && z.dernierOrdre.alloc) || DEFAULT_ALLOC;
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

export function incidentsHtml() {
  const liste = mesIncidents();
  if (!liste.length) return '';
  const res = mesResultats(liste), now = Date.now();
  const { base, plus } = jaugeDuJour();
  const prochain = liste.find((i) => etat(i, res[i.id], now) === 'avenir');
  const lignes = liste.filter((i) => etat(i, res[i.id], now) !== 'avenir').map((i) => {
    const e = etat(i, res[i.id], now), r = res[i.id];
    const svc = `<span class="tiny muted">${SERVICE_LABELS[i.service]}</span>`;
    if (e === 'ouvert') return `<div class="inc-row inc-ouvert"><span class="inc-ico" aria-hidden="true">${icon('alert', 18)}</span>
      <span class="col grow" style="gap:1px;min-width:0"><span style="font-weight:700">${esc(i.titre)}</span><span class="tiny muted">${SERVICE_LABELS[i.service]} · encore <span data-inc-fin="${i.ferme}">${duree(i.ferme - now)}</span> pour intervenir</span></span>
      <button class="btn primary small" data-action="incident" data-id="${esc(i.id)}">Intervenir</button></div>`;
    if (e === 'joue') {
      const ok = r.statut === 'ok';
      return `<div class="inc-row"><span class="inc-ico ${ok ? 'ok' : 'bad'}" aria-hidden="true">${icon(ok ? 'check' : 'alert', 16)}</span>
        <span class="col grow" style="gap:1px;min-width:0"><span style="font-weight:600">${esc(i.titre)}</span>${svc}</span>
        <span class="pill ${ok ? 'green' : 'red'}">${ok ? `Réussi · +${pointsJauge(r)}` : r.statut === 'abandon' ? 'Abandonné' : 'Raté'}</span></div>`;
    }
    return `<div class="inc-row"><span class="inc-ico" aria-hidden="true">${icon('clock', 16)}</span>
      <span class="col grow" style="gap:1px;min-width:0"><span style="font-weight:600">${esc(i.titre)}</span><span class="tiny muted">${SERVICE_LABELS[i.service]} · non traité : ton équipe s’en charge seule, résultat à 20:00</span></span></div>`;
  });
  return `<section class="card" id="hp-incidents" aria-label="Incidents du jour" style="gap:8px;scroll-margin-top:16px">
    <div class="between"><span class="kicker">Incidents du jour</span><a class="tiny" href="#guide-incidents">Comment ça marche ?</a></div>
    ${lignes.join('')}
    ${prochain ? `<div class="inc-row inc-attente"><span class="inc-ico" aria-hidden="true">${icon('clock', 16)}</span><span class="col grow" style="gap:1px"><span style="font-weight:600">${lignes.length ? 'Un autre incident va tomber' : 'Un incident va tomber aujourd’hui'}</span><span class="tiny muted">sur un de tes services, dans <strong class="mono" data-inc-cd="${prochain.ouvre}">${duree(prochain.ouvre - now)}</strong> · il restera ouvert ${INC.ouverture / 3600000} heures</span></span></div>`
      : !lignes.some((l) => l.includes('inc-ouvert')) ? '<p class="tiny muted" style="margin:0">Plus d’incident aujourd’hui. Les prochains tombent demain, entre 7 h et 19 h.</p>' : ''}
    <div class="between small"><span class="row muted" style="gap:6px">${icon('star', 14)} Jauge des skins</span>
      <span class="row" style="gap:8px"><span role="img" aria-label="${base} sur ${INC.jauge}" style="width:90px;height:5px;background:var(--line);border-radius:3px;display:inline-block;overflow:hidden"><span style="display:block;width:${Math.min(100, (base / INC.jauge) * 100)}%;height:5px;background:var(--amber)"></span></span>
      <span class="mono">${base}/${INC.jauge}${plus ? ` <span class="ok">+${plus}</span>` : ''}</span></span></div>
  </section>`;
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
export function ouvrirMiniJeu(jeu, { mode = 'train', inc = null, onFin = () => {}, onEntrainement = () => {} } = {}) {
  document.querySelector('.mj-wrap')?.remove();
  const p = new URLSearchParams({ mode });
  if (mode === 'incident' && inc) {
    const n = agentsService(inc.service), { base, plus } = jaugeDuJour();
    p.set('id', inc.id); p.set('agents', String(n)); p.set('diff', difficulte(inc.service, n));
    p.set('jauge', String(base + plus)); p.set('malus', texteMalus(MALUS[inc.service].plein)); p.set('gain', `${texteGain(GAIN[inc.service])}, +${PS.queteOk} PS`);
  }
  const wrap = document.createElement('div');
  wrap.className = 'mj-wrap';
  wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true');
  wrap.innerHTML = `<iframe src="minijeux/${jeu}.html?${p}" title="Mini-jeu ${esc((MINI_JEUX.find((m) => m.jeu === jeu) || {}).nom || '')}" allow="autoplay; fullscreen"></iframe>`;
  const fermer = () => { window.removeEventListener('message', recevoir); wrap.remove(); document.body.classList.remove('mj-ouvert'); onFin(); };
  async function recevoir(e) {
    const d = e.data;
    if (e.origin !== location.origin || !d || d.source !== 'mazp-mj') return;
    try {
      if (mode === 'incident' && inc && d.id === inc.id) {
        if (d.type === 'start') await enregistrer(inc.id, { statut: 'abandon', fautes: 1 });
        if (d.type === 'result') await enregistrer(inc.id, { statut: d.ok ? 'ok' : d.abandon ? 'abandon' : 'rate', fautes: Number(d.fautes) || 0 });
      }
      if (mode === 'train' && d.type === 'result' && !d.abandon) onEntrainement({ minijeux: 1 });
    } catch (err) { console.warn('Résultat de l’incident non enregistré', err); }
    if (d.type === 'close') fermer();
  }
  window.addEventListener('message', recevoir);
  document.body.appendChild(wrap);
  document.body.classList.add('mj-ouvert');
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
