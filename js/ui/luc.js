// Événement « Rattrape Luc » : un mini-jeu clin d'œil (poursuite au grappin sur l'E19, puis contrôle routier).
// Il ne revient que de temps en temps (en moyenne une fois par semaine, jamais deux jours de suite), et jamais en même
// temps que l'urgence Bitonal du jour : tant que l'urgence est tombée et pas encore traitée, Luc ne se montre pas.
// La première fois, il apparaît dès la connexion. Pour le fun : aucun effet sur la zone, seulement un record de la
// partie (défi « luc », sans prime de la semaine) et un titre.
import { S, esc } from './common.js';
import { mesIncidents } from './incidents.js';
import { recordDefi, monRecordDefi } from './defis.js';

export const LUC = { jeu: 'luc', nom: 'Rattrape Luc', chance: 16, ouvre: 7 };
const H = 3600e3;

function h32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const tire = (st, T) => h32(`${st.seed}:s${st.season}:t${T}:luc`) % 100 < LUC.chance;
/** Jour de Luc pour toute la partie : tiré au sort, jamais deux jours de suite. */
export const jourDeLuc = (st, T) => tire(st, T) && !tire(st, T - 1);

const uid = () => (S.user && S.user.uid) || 'anon';
const jourCle = (st) => `s${st.season}t${st.turn}`;
const lire = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const ecrire = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* pas de stockage */ } };
const clePremier = () => `mazp-luc-premier-${uid()}`;
const clePop = (st) => `mazp-luc-pop-${uid()}-${jourCle(st)}`;
const cleJoue = (st) => `mazp-luc-joue-${uid()}-${jourCle(st)}`;

/** L'urgence du jour est-elle ouverte et pas encore traitée ? (Luc attend alors qu'elle soit réglée.) */
function urgenceEnCours(st, now) {
  const id = `s${st.season}t${st.turn}-u`;
  const u = mesIncidents().find((i) => i.urgence && i.id === id);
  if (!u || now < u.ouvre || now > u.ferme) return false;
  const inc = S.player && S.player.incidents;
  const r = inc && inc.cle === jourCle(st) && inc.r ? inc.r[id] : null;
  return !r;
}

/** Luc est-il sur l'E19 maintenant pour ce joueur ? */
export function lucVisible(now = Date.now()) {
  const st = S.state;
  if (!st || !S.user || !st.zones || !st.zones[S.user.uid] || !st.nextDeadline) return false;
  if (now > st.nextDeadline) return false;
  const premier = lire(clePremier());
  const aujourdhui = premier === jourCle(st) || (!premier) || jourDeLuc(st, st.turn);
  if (!aujourdhui) return false;
  // Jour tiré au sort : à partir de 7 h ; première apparition : tout de suite.
  if (premier && premier !== jourCle(st) && now < st.nextDeadline - 24 * H + LUC.ouvre * H) return false;
  if (urgenceEnCours(st, now)) return false;
  if (!premier) ecrire(clePremier(), jourCle(st));
  return true;
}

const meilleurDuJour = () => { const st = S.state; return st ? Math.floor(Number(lire(cleJoue(st))) || 0) : 0; };
/** Fin d'une partie de l'événement : meilleur nombre de manches gagnées aujourd'hui (sur cet appareil). */
export function noterLuc(manches) {
  const st = S.state; if (!st) return;
  const n = Math.max(0, Math.floor(Number(manches) || 0));
  if (n >= meilleurDuJour()) ecrire(cleJoue(st), String(n));
}

function recordTxt() {
  const r = recordDefi(LUC.jeu), moi = S.user && S.user.uid;
  if (!r) return 'Pas encore de record dans la partie.';
  return `Record de la partie : ${esc(r.uid === moi ? 'toi' : r.nom)}, ${r.niveau} manche${r.niveau > 1 ? 's' : ''}.`;
}

/** Fenêtre d'alerte (une fois par jour de Luc et par appareil). */
export function ouvrirLuc(lancer) {
  const st = S.state; if (st) ecrire(clePop(st), '1');
  document.querySelector('.aide-wrap')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'aide-wrap';
  wrap.innerHTML = `<div class="aide card" role="dialog" aria-modal="true" aria-labelledby="luc-titre">
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><span class="kicker">Alerte radio · Événement</span><h2 id="luc-titre" class="aide-titre">🚨 Luc sur l’E19</h2></div>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <p class="small" style="margin:0;line-height:1.45">Luc vient d’être flashé bien au-dessus des 120, direction Valenciennes. Ta voiture banalisée a reçu un grappin « à l’américaine » : rattrape-le avant la frontière.</p>
    <div class="col" style="gap:10px">${[
      ['🪝', 'Le grappin', 'cale-toi derrière lui, vise sa roue arrière, puis tiens bon quand il se débat.'],
      ['📻', 'La herse', 'les collègues la posent sur sa file : roule à côté de lui pour qu’il ne puisse pas l’éviter.'],
      ['🗯️', 'Ses excuses', 'au contrôle, il va contester. Trouve la bonne réponse avant qu’il s’emporte.'],
    ].map(([ico, t, x]) => `<div class="row" style="gap:10px;align-items:flex-start"><span aria-hidden="true" style="font-size:22px;line-height:1.1">${ico}</span>
      <span class="small" style="line-height:1.4"><strong>${t}</strong><br><span class="muted">${x}</span></span></div>`).join('')}</div>
    <p class="tiny muted" style="margin:0">Pour le plaisir : aucun effet sur ta zone. ${recordTxt()} Luc repasse de temps en temps.</p>
    <button class="btn primary block" data-go>🚔 Prendre la chasse</button>
    <button class="btn ghost small block" data-close>Plus tard (jusqu’à 20:00)</button>
  </div>`;
  const fermer = () => { wrap.remove(); document.removeEventListener('keydown', echap); };
  const echap = (e) => { if (e.key === 'Escape') fermer(); };
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-go]')) { e.stopPropagation(); fermer(); lancer(); return; }
    if (e.target === wrap || e.target.closest('[data-close]')) { e.stopPropagation(); fermer(); }
  });
  document.addEventListener('keydown', echap);
  document.body.appendChild(wrap);
}

/** À l'ouverture du jeu (HP affichée) : l'alerte, une fois par jour de Luc. */
export function lucAuBesoin(lancer) {
  const st = S.state;
  if (S.lucMontre || S.tuto != null || document.querySelector('.aide-wrap, .mj-wrap') || !lucVisible() || lire(clePop(st))) return false;
  S.lucMontre = true;
  setTimeout(() => ouvrirLuc(lancer), 400);
  return true;
}

/** Ligne de la carte « Aujourd'hui » de l'HP, tant que Luc est sur l'E19. */
export function lucLigne() {
  if (!lucVisible()) return '';
  const fait = meilleurDuJour(), joue = lire(cleJoue(S.state)) != null, perso = monRecordDefi(LUC.jeu);
  const sous = joue ? `Ton meilleur aujourd’hui : ${fait} manche${fait > 1 ? 's' : ''}${perso ? ` · ton record : ${perso}` : ''}` : 'Événement · flashé bien au-dessus des 120, jusqu’à 20:00';
  return `<div class="inc-row inc-actu"><span class="inc-ico" aria-hidden="true" style="font-size:18px">🏎️</span>
    <span class="col grow" style="gap:1px;min-width:0"><span style="font-weight:700">Luc sur l’E19</span><span class="tiny muted">${sous}</span></span>
    <button class="btn ${joue ? 'ghost' : 'primary'} small" data-action="luc-jouer">${joue ? 'Rejouer' : 'Prendre la chasse'}</button></div>`;
}
