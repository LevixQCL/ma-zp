// Enquête en direct, côté appareil : mes actions de la journée (démarches, réauditions, recoupements, confrontations),
// rejouées sur mon dossier exactement comme le calcul de 20:00 le fera (js/engine/enquete-direct.js).
// L'écran montre les pièces arrivées, celles en route (avec l'heure d'arrivée) et le verdict des confrontations en étapes.
import { S, esc, myZone, toast } from './common.js';
import { affaire, dossierDe, titrePiece, demarcheDe, lireDemarche, coutDemarche } from '../engine/enquete.js';
import { rejouer, dossierA, enqueteursDe, enCoursMax, dureeDemarche, etapeVerdict, texteVerdict, DIRECT, DELAI_VERDICT } from '../engine/enquete-direct.js';

const MIN = 60000;
const hm = (t) => new Date(t).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });
const cleTour = () => (S.state ? `${S.state.season}-${S.state.turn}` : '');

/** Charge mes actions du tour en cours (une fois par tour, ou à la demande). */
export async function chargerActionsEnquete(force = false) {
  if (!S.state || !S.user || !S.backend || !S.backend.getMesActionsEnquete) return;
  if (!force && S.enqActionsCle === cleTour()) return;
  const cle = cleTour();
  try {
    const l = await S.backend.getMesActionsEnquete(S.user.uid, S.state.season, S.state.turn);
    if (cle === cleTour()) { S.enqActions = l || []; S.enqActionsCle = cle; S.enqLive = null; }
  } catch (e) { console.warn('Actions d’enquête illisibles :', e.message); }
}
export const actionsDuJour = () => (S.enqActionsCle === cleTour() ? S.enqActions || [] : []);

/** La journée rejouée (mise en cache tant que les actions ne changent pas). */
export function journeeLive() {
  const st = S.state, z = myZone();
  if (!st || !st.enquete || !z) return null;
  const acts = actionsDuJour();
  const cle = `${cleTour()}:${acts.length}:${acts.length ? acts[acts.length - 1].at : 0}:${st.enquete.n}`;
  if (S.enqLive && S.enqLive.cle === cle) return S.enqLive.r;
  const r = rejouer({ state: st, z, agents: enqueteursDe(z), budget: Number(z.budget) || 0, limite: Number(st.nextDeadline) || Infinity }, dossierDe(st, z), acts);
  S.enqLive = { cle, r };
  return r;
}

/** Mon dossier tel qu'il est maintenant : les pièces arrivées (celles en route n'y sont pas encore). */
export function dossierVu(t = Date.now()) {
  const r = journeeLive();
  if (!r) return S.state && S.state.enquete && myZone() ? dossierDe(S.state, myZone()) : null;
  const d = dossierA(r.dossier, t);
  // Verdict pas encore tombé : l'issue reste secrète (suspense), le dossier reste « ouvert ».
  if (d.accuseT > t) return { ...d, accuse: null, accuse2: null, exclu: false };
  return d;
}
/** Le suspect est-il relâché (verdict tombé, nouvelle confrontation impossible avant l'heure dite) ? Renvoie l'heure ou 0. */
export function relacheJusqua(i, t = Date.now()) {
  const r = journeeLive(), h = r && r.dossier.relache && r.dossier.relache[i];
  return h && h > t && h - DIRECT.relache * MIN <= t ? h : 0;
}
/** Une confrontation attend son verdict. */
export const verdictEnAttente = (t = Date.now()) => { const c = confrontationDuJour(); return !!c && !etapeVerdict(c, t).fini; };
/** Mon dossier complet, pièces en route comprises (pour savoir ce qui est déjà demandé). */
export function dossierComplet() {
  const r = journeeLive();
  return r ? r.dossier : dossierDe(S.state, myZone());
}
/** Pièces en route (démarche lancée, résultat pas encore arrivé). */
export function piecesEnRoute(t = Date.now()) {
  const r = journeeLive();
  return r ? r.dossier.pieces.filter((p) => p.dispo > t) : [];
}
/** Démarches qui occupent les enquêteurs maintenant (réauditions et recoupements à part). */
export function enquetesEnCours(t = Date.now()) {
  return piecesEnRoute(t).filter((p) => Object.hasOwn(DIRECT.duree, p.src) && p.src !== 'reaud' && p.src !== 'recoup');
}
/** Confrontation dont le verdict n'est pas encore tombé, ou tombé il y a moins d'une heure. */
export function confrontationDuJour(t = Date.now()) {
  const r = journeeLive();
  const l = r ? r.confrontations : [];
  return l.length ? l[l.length - 1] : null;
}
export const dejaUtilisees = () => { const r = journeeLive(); const l = r ? r.lancees : []; return { dem: l.filter((x) => x.k !== 'reaud' && x.k !== 'recoup').length, reaud: l.filter((x) => x.k === 'reaud').length, recoup: l.filter((x) => x.k === 'recoup').length }; };
export const budgetEnquete = () => { const r = journeeLive(); return (Number(myZone() && myZone().budget) || 0) - (r ? r.depense : 0); };

/** Pourquoi cette démarche ne peut pas partir maintenant (ou null), et ce qu'elle coûte. */
export function etatDemarche(aff, x, t = Date.now()) {
  const st = S.state, z = myZone();
  const ld = lireDemarche(x);
  if (!ld) return { raison: 'inconnue' };
  const complet = dossierComplet();
  const enRoute = complet && complet.pieces.find((p) => p.src === ld.k && p.dispo > t && (ld.i === null || Number(String(p.f).split(':')[1]) === ld.i));
  if (enRoute) return { enRoute, raison: `arrive à ${hm(enRoute.dispo)}` };
  const prix = coutDemarche(st, z.uid, x);
  if (t + 5 * MIN > Number(st.nextDeadline)) return { prix, raison: 'calcul de 20:00' };
  const u = dejaUtilisees();
  if (u.dem >= DIRECT.parTour) return { prix, raison: `${DIRECT.parTour} par jour` };
  if (enquetesEnCours(t).length >= enCoursMax(enqueteursDe(z))) return { prix, raison: 'enquêteurs occupés' };
  if (prix > budgetEnquete()) return { prix, raison: 'budget' };
  return { prix, raison: null, duree: dureeDemarche(ld.k, enqueteursDe(z)) };
}

async function envoyer(action, message) {
  const st = S.state;
  if (!S.backend.saveEnqueteAction) { toast('Enquête en direct indisponible sur cette version.'); return false; }
  // Affiché tout de suite (heure de l'appareil), puis remplacé par l'heure du serveur.
  S.enqActions = [...actionsDuJour(), { ...action, at: Date.now() }]; S.enqActionsCle = cleTour(); S.enqLive = null;
  try {
    await S.backend.saveEnqueteAction(S.user.uid, st.season, st.turn, action);
    if (message) toast(message);
    chargerActionsEnquete(true).then(() => S.rerender && S.rerender());
    return true;
  } catch (e) {
    S.enqActions = actionsDuJour().slice(0, -1); S.enqLive = null;
    toast(/permission/i.test(String(e && (e.code || e.message))) ? 'Refusé : le tour de 20:00 est en cours. Réessaie dans quelques minutes.' : `Démarche non envoyée : ${e.message || e}`);
    return false;
  }
}

/** Lance une démarche maintenant. */
export async function lancerDemarche(x) {
  const aff = affaire(S.state, S.state.enquete.n), e = etatDemarche(aff, x);
  if (e.raison) { toast(`Impossible maintenant : ${e.raison}.`); return false; }
  const ld = lireDemarche(x), nom = demarcheDe(aff, ld.k).nom;
  return envoyer({ k: 'dem', x }, `${nom} lancée : résultat vers ${hm(Date.now() + e.duree * MIN)}.`);
}
/** Réaudition d'un suspect face à une pièce (affaire de meurtre). */
export async function lancerReaudition(i, f) {
  if (dejaUtilisees().reaud >= DIRECT.reaudParTour) { toast('Une réaudition par jour.'); return false; }
  const aff = affaire(S.state, S.state.enquete.n), s = aff.suspects[i];
  return envoyer({ k: 'reaud', i, f }, `${s.prenom} est reconvoqué${s.f ? 'e' : ''} : PV d’audition vers ${hm(Date.now() + dureeDemarche('reaud', enqueteursDe(myZone())) * MIN)}.`);
}
/** Recoupement de deux pièces. */
export async function lancerRecoupement(a, b) {
  if (dejaUtilisees().recoup >= DIRECT.recoupParTour) { toast('Un recoupement par jour.'); return false; }
  return envoyer({ k: 'recoup', a, b }, `Recoupement lancé : réponse vers ${hm(Date.now() + dureeDemarche('recoup', enqueteursDe(myZone())) * MIN)}.`);
}
/** Confrontation (meurtre : avec trois pièces ; vol : accusation devant le parquet). */
export async function lancerConfrontation({ i, i2 = null, pieces = null, mobile = null }) {
  const t = Date.now();
  if (t + DELAI_VERDICT * MIN > Number(S.state.nextDeadline)) { toast(`Le parquet ferme ${DELAI_VERDICT} minutes avant 20:00. Reprends après le calcul.`); return false; }
  const r = journeeLive();
  if (r && r.dossier.relache && r.dossier.relache[i] > t) { toast(`Relâché : tu pourras reconvoquer à ${hm(r.dossier.relache[i])}.`); return false; }
  const a = { k: 'confront', i };
  if (Number.isInteger(i2)) a.i2 = i2;
  if (Array.isArray(pieces) && pieces.length) a.pieces = pieces.slice(0, 3);
  if (Number.isInteger(mobile)) a.mobile = mobile;
  S.verdictOuvert = true;
  return envoyer(a, null);
}

/** Bandeau « en cours » : démarches en route, avec l'heure d'arrivée et une barre de progression. */
export function enCoursHtml(aff, { compact = false } = {}) {
  const t = Date.now(), l = piecesEnRoute(t);
  const z = myZone(), max = enCoursMax(enqueteursDe(z)), occ = enquetesEnCours(t).length, u = dejaUtilisees();
  const lignes = l.map((p) => {
    const tot = Math.max(1, p.dispo - p.lance), part = Math.min(1, Math.max(0, (t - p.lance) / tot));
    const nom = p.src === 'reaud' ? 'Réaudition' : p.src === 'recoup' ? 'Recoupement' : demarcheDe(aff, p.src).nom;
    return `<div class="ed-ligne"><div class="ed-l"><span class="ed-nom">${esc(nom)}</span><span class="ed-h">${hm(p.dispo)}</span></div><div class="ed-barre" role="progressbar" aria-valuenow="${Math.round(part * 100)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.round(part * 100)}%"></span></div></div>`;
  }).join('');
  return `<section class="ed-encours ${compact ? 'compact' : ''}" aria-label="Démarches en cours">
    <div class="ed-tete"><span class="ed-titre">Enquêteurs</span><span class="ed-info">${occ}/${max} occupés · ${u.dem}/${DIRECT.parTour} démarches aujourd’hui</span></div>
    ${lignes || '<p class="ed-vide">Personne sur le terrain. Lance une démarche : sa pièce arrive en une à trois heures.</p>'}
  </section>`;
}

/** Fenêtre du verdict : les étapes de l'audition, puis le verdict. */
export function verdictHtml() {
  const c = confrontationDuJour();
  if (!c || !S.verdictOuvert) return '';
  const aff = affaire(S.state, S.state.enquete.n), s = aff.suspects[c.i];
  const t = Date.now(), e = etapeVerdict(c, t);
  const etapes = DIRECT.verdict.map((x, k) => {
    const fait = (t - c.at) / MIN >= x.m, cur = e.t === x.t && !e.fini;
    return `<li class="${fait ? 'fait' : ''} ${cur ? 'cur' : ''}"><span class="pt"></span><span>${esc(x.t)}</span>${k < DIRECT.verdict.length - 1 ? `<span class="h">${hm(c.at + x.m * MIN)}</span>` : `<span class="h">${hm(c.fin)}</span>`}</li>`;
  }).join('');
  const issue = e.fini ? `<div class="vd-issue ${c.issue === 'aveux' || c.issue === 'identifie' ? 'ok' : c.issue === 'refus' ? 'neutre' : 'ko'}">${esc(texteVerdict(S.state, c))}</div>
    <p class="vd-note">${c.issue === 'aveux' || c.issue === 'identifie' ? 'Les points, la mise à prix et la Gazette tombent à 20:00.' : c.issue === 'innocent' ? 'Tu peux encore partager tes pièces avec les autres zones.' : ''}</p>` : `<p class="vd-attente">Verdict dans ${e.reste} min. Tu peux fermer : il t’attendra ici.</p>`;
  return `<div class="vd-wrap" role="dialog" aria-modal="true" aria-label="Confrontation">
    <div class="vd-carte">
      <span class="vd-kicker">${aff.meurtre ? 'Confrontation' : 'Devant le parquet'}</span>
      <h2 class="vd-titre">${esc(s.nom)}${Number.isInteger(c.i2) && aff.suspects[c.i2] ? ` et ${esc(aff.suspects[c.i2].nom)}` : ''}</h2>
      <ol class="vd-etapes">${etapes}</ol>
      ${issue}
      <button type="button" class="btn ${e.fini ? 'primary' : 'ghost'} block" data-action="verdict-fermer">${e.fini ? 'Compris' : 'Fermer'}</button>
    </div>
  </div>`;
}
/** Petit rappel d'une confrontation en cours (sur l'écran Enquête et l'accueil). */
export function verdictRappel() {
  const c = confrontationDuJour();
  if (!c) return '';
  const t = Date.now(), e = etapeVerdict(c, t);
  if (e.fini && t - c.fin > 3 * 3600000) return '';
  const aff = affaire(S.state, S.state.enquete.n);
  return `<button type="button" class="vd-rappel ${e.fini ? 'fini' : ''}" data-action="verdict-ouvrir">${e.fini ? `Verdict : ${esc(aff.suspects[c.i].prenom)}` : `${esc(e.t)} · ${e.reste} min`}</button>`;
}
/** Ce qui est arrivé aujourd'hui (pièces revenues, verdict tombé) : signature de la pastille de l'onglet Enquête. */
export function signatureEnquete(t = Date.now()) {
  const r = journeeLive();
  if (!r) return '';
  const arrivees = r.lancees.filter((l) => l.fin <= t).length, c = r.confrontations[r.confrontations.length - 1];
  const v = c && etapeVerdict(c, t).fini ? 1 : 0;
  return arrivees || v ? `${arrivees}:${v}` : '';
}
/** Il se passe quelque chose de visible à la minute près (barres, verdict) : l'écran se redessine. */
export const enDirectActif = () => piecesEnRoute().length > 0 || (confrontationDuJour() && !etapeVerdict(confrontationDuJour(), Date.now()).fini);
export { hm as heureBe };
