// Quiz express : 5 questions, 15 secondes chacune, alternative aux énigmes du jour.
// La progression est gardée sur l'appareil (un rechargement ne redonne pas de temps : une question
// dont le temps est écoulé compte comme ratée). Le résultat part sur l'énigme 1 (statut « quiz »,
// bonnes réponses dans « tentatives », que les règles Firestore empêchent ensuite de modifier).
import { S, esc } from './common.js';
import { CONFIG } from '../config.js';
import { QUIZ, QUIZ_THEMES, quizDuJour } from '../quests/quiz.js';

const cle = () => `mazp-quiz-${S.backend && S.backend.gameId ? S.backend.gameId() : ''}-${S.user.uid}-${S.state.season}-${S.state.turn}`;
const lire = () => { try { return JSON.parse(localStorage.getItem(cle()) || 'null'); } catch { return null; } };
const ecrire = (v) => { try { localStorage.setItem(cle(), JSON.stringify(v)); } catch { /* pas de stockage */ } };

export const serieDuJour = () => quizDuJour({ seed: CONFIG.seed, uid: S.user.uid, season: S.state.season, turn: S.state.turn });

/** Partie en cours sur cet appareil : { i, rep: [true|false…], t0, fb } ou null. */
export function quizLocal() { return lire(); }

/** Résultat enregistré (énigme 1 au statut « quiz »). */
export function quizEnregistre() {
  const r = (S.questResults || [])[0];
  return r && r.statut === 'quiz' ? r : null;
}

export function demarrerQuiz() {
  if (lire() || quizEnregistre()) return;
  ecrire({ i: 0, rep: [], t0: Date.now(), fb: null });
}

/** Le temps de la question courante est-il écoulé ? (alors : réponse ratée) */
function verifierTemps(p) {
  if (!p || p.fb || p.i >= QUIZ.questions) return p;
  if (Date.now() - p.t0 > QUIZ.secondes * 1000 + 300) { p.rep.push(false); p.fb = { choix: -1, temps: true }; ecrire(p); }
  return p;
}

/** Réponse (indice du choix, ou -1 si le temps est écoulé). */
export function repondreQuiz(choix) {
  const p = verifierTemps(lire());
  if (!p || p.fb || p.i >= QUIZ.questions) return p;
  const q = serieDuJour()[p.i];
  p.rep.push(choix === q.bonne); p.fb = { choix, temps: choix < 0 };
  ecrire(p); return p;
}

/** Question suivante ; renvoie true quand la série est finie. */
export function suivanteQuiz() {
  const p = lire();
  if (!p || !p.fb) return false;
  p.i++; p.fb = null; p.t0 = Date.now(); ecrire(p);
  return p.i >= QUIZ.questions;
}

export const bonnesReponses = (p) => (p ? p.rep.filter(Boolean).length : 0);

let minuteur = null, minuteurPour = null;
/** Programme la fin du temps de la question affichée (un seul minuteur à la fois). */
function programmer(p) {
  const id = `${cle()}:${p.i}`;
  if (minuteurPour === id) return;
  clearTimeout(minuteur); minuteurPour = id;
  const reste = Math.max(0, p.t0 + QUIZ.secondes * 1000 - Date.now());
  minuteur = setTimeout(() => { minuteurPour = null; window.dispatchEvent(new CustomEvent('mazp-quiz-temps')); }, reste + 50);
}
export function arreterMinuteur() { clearTimeout(minuteur); minuteurPour = null; }

/** Écran d'une question (ou de sa correction). */
export function quizQuestionHtml() {
  const p = verifierTemps(lire());
  if (!p) return '';
  const serie = serieDuJour();
  const q = serie[Math.min(p.i, QUIZ.questions - 1)], th = QUIZ_THEMES[q.theme];
  const reste = Math.max(0, p.t0 + QUIZ.secondes * 1000 - Date.now());
  if (!p.fb) programmer(p); else arreterMinuteur();
  const points = serie.map((_, k) => `<i class="qz-pt ${k < p.rep.length ? (p.rep[k] ? 'ok' : 'ko') : k === p.i ? 'cur' : ''}"></i>`).join('');
  const fini = p.fb && p.i >= QUIZ.questions - 1;
  return `<section class="card qz" aria-label="Quiz express">
    <div class="between"><span class="kicker">Quiz express · question ${p.i + 1} sur ${QUIZ.questions}</span><span class="qz-pts" aria-label="${bonnesReponses(p)} bonne(s) réponse(s)">${points}</span></div>
    <span class="pill" style="align-self:flex-start">${th.ico} ${esc(th.nom)}</span>
    <h2 class="qz-q">${esc(q.q)}</h2>
    ${p.fb ? '' : `<div class="qz-temps" role="timer" aria-label="Temps restant"><i style="animation-duration:${reste}ms;transform:scaleX(${reste / (QUIZ.secondes * 1000)})"></i></div>`}
    <div class="qz-choix" role="group" aria-label="Réponses">${q.choix.map((c, k) => {
      const cls = p.fb ? (k === q.bonne ? 'bon' : k === p.fb.choix ? 'faux' : 'eteint') : '';
      return `<button type="button" class="qz-c ${cls}" data-action="quiz-rep" data-v="${k}" ${p.fb ? 'disabled' : ''}>${esc(c)}</button>`;
    }).join('')}</div>
    ${p.fb ? `<p class="small ${p.rep[p.rep.length - 1] ? 'ok' : ''}" style="margin:0;font-weight:700">${p.rep[p.rep.length - 1] ? '✓ Bonne réponse !' : p.fb.temps ? `⏱ Temps écoulé. C’était : ${esc(q.choix[q.bonne])}.` : `✗ Raté. C’était : ${esc(q.choix[q.bonne])}.`}</p>
      <button type="button" class="btn primary block" data-action="quiz-suivante">${fini ? 'Voir le résultat' : 'Question suivante'}</button>` : ''}
  </section>`;
}

// ───────────── Classement « Quiz » ─────────────
// Compteurs tenus par le tour de 20:00 (zone.quizCarriere). Le quiz du jour n'y est pas encore :
// pour le joueur qui vient de le finir, on l'ajoute à l'affichage (« ce soir, tu passes 2e »).
// Score = bonnes réponses moyennes sur 5, lissées : chacun part avec QUIZ_POIDS quiz fictifs à la
// moyenne du district. Ex. (moyenne 3,5) : 9 quiz à 4,3 → 4,1 ; un seul 5/5 → 3,9.
export const QUIZ_POIDS = 3, MIN_QUIZ = 3;

function compteurs(z, avecDuJour) {
  const c = z.quizCarriere || {};
  const x = { n: c.n || 0, bons: c.bons || 0, parfaits: c.parfaits || 0, serie: c.serie || 0, record: c.record || 0, jour: c.jour || 0 };
  // Une série s'arrête si le dernier quiz compté n'est pas celui d'hier soir.
  const ceSoir = Math.round((Number(S.state && S.state.nextDeadline) || 0) / 86400000);
  if (x.jour < ceSoir - 1) x.serie = 0;
  if (avecDuJour) {
    const r = quizEnregistre(), b = Math.max(0, Math.min(QUIZ.questions, Number(r && r.tentatives) || 0));
    if (r) {
      x.serie = x.n > 0 && x.jour === ceSoir - 1 ? x.serie + 1 : 1;
      x.n += 1; x.bons += b; if (b >= QUIZ.questions) x.parfaits += 1; x.record = Math.max(x.record, x.serie);
    }
  }
  return x;
}

/** Lignes du classement quiz, triées. avecDuJour : compter le quiz que je viens de finir. */
export function classementQuiz(avecDuJour = true) {
  const moi = S.user && S.user.uid;
  const zs = Object.values((S.state && S.state.zones) || {});
  const par = zs.map((z) => ({ z, ...compteurs(z, avecDuJour && z.uid === moi) })).filter((l) => l.n > 0);
  const tot = par.reduce((t, l) => [t[0] + l.bons, t[1] + l.n], [0, 0]);
  const moyenne = Math.min(4.5, Math.max(2.5, tot[1] ? tot[0] / tot[1] : 3.5));
  const lignes = par.map((l) => ({ ...l, moy: l.bons / l.n, score: (l.bons + QUIZ_POIDS * moyenne) / (l.n + QUIZ_POIDS), classe: l.n >= MIN_QUIZ }))
    .sort((a, b) => (b.classe - a.classe) || (b.score - a.score) || (b.n - a.n));
  let r = 0;
  for (const l of lignes) l.rang = l.classe ? ++r : 0;
  return { lignes, moyenne };
}

/** Mon rang (0 = pas encore classé) et mes compteurs. */
export function monRangQuiz(avecDuJour = true) {
  const { lignes } = classementQuiz(avecDuJour);
  const l = lignes.find((x) => S.user && x.z.uid === S.user.uid);
  return l ? { rang: l.rang, n: l.n, serie: l.serie, total: lignes.filter((x) => x.classe).length } : { rang: 0, n: 0, serie: 0, total: lignes.filter((x) => x.classe).length };
}

export const fmtQuiz = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
