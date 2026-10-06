// Vagues de délinquance : ce que voit la zone visée (HP, ordres) et celle qui l'a provoquée.
import { S, esc, fmt1, myZone } from './common.js';
import { capacite } from '../engine/zone.js';
import { vagueVisee, seuilAbsorption, VAGUE_TXT, VAGUES } from '../engine/vagues.js';
import { carteQuartiers } from '../engine/quartiers.js';

/** État de la vague attendue ce soir, d'après les ordres en cours (`e` = estimations()). */
export function etatVague(e) {
  const st = S.state, z = myZone();
  const v = st && z && vagueVisee(st, z.uid, st.turn);
  if (!v || !S.draft) return null;
  const d = v.domaine, txt = VAGUE_TXT[d];
  const seuil = seuilAbsorption(v);
  const cap = (e && e.cap && e.cap[d]) || 0;
  const ok = cap >= seuil;
  // Agents à ajouter : on reprend le calcul de l'écran des ordres, agent par agent.
  let manque = 0;
  if (!ok) {
    const alloc = { ...((e && e.opx && e.opx.eff) || S.draft.alloc) };
    const base = alloc[d] || 0;
    const opts = { rythme: S.draft.rythme, turn: st.turn, alloc };
    const c0 = capacite(z, d, base, opts);
    const mult = c0 > 0 ? cap / c0 : 1;
    while (manque < 15 && capacite(z, d, base + manque, opts) * mult < seuil) manque += 1;
  }
  const lieu = carteQuartiers(st).nomDe(Number(v.cell));
  return { v, txt, seuil, cap, ok, manque, lieu, force: v.force || 1 };
}

const effetTexte = (x) => {
  const e = VAGUES.effet, f = x.force;
  return { intervention: `+${e.incidents * f} incidents`, proximite: `+${e.tension * f} de tension à ${esc(x.lieu)}`, recherche: `un dossier de ${e.dossier * f + 1} unités en plus`, roulage: `−${fmt1(e.roulageSatisf * f)} de satisfaction`, admin: `+${e.paperasse * f} dossiers de paperasse` }[x.v.domaine];
};
const gainTexte = (f) => `+${VAGUES.gain.points * f} pts, +${VAGUES.gain.moral * f} de moral, +${VAGUES.gain.satisfaction * f} de satisfaction`;

/** Ligne de la liste « avant ce soir » de l'HP. */
export function vagueTodo(e) {
  const x = etatVague(e);
  if (!x) return null;
  return {
    ok: x.ok, href: '#ordres',
    t: `Vague attendue à ${esc(x.lieu)} : ${esc(x.txt.nom)}`,
    s: x.ok ? `ton ${x.txt.court} tient (${fmt1(x.cap)} pour ${fmt1(x.seuil)} requis) : ${gainTexte(x.force)}`
      : `${x.manque ? `≈ ${x.manque} agent${x.manque > 1 ? 's' : ''} de plus en ${x.txt.court}` : `renforce ton ${x.txt.court}`} (${fmt1(x.cap)} pour ${fmt1(x.seuil)} requis) · sinon ${effetTexte(x)}`,
  };
}

/** Sous le service visé, dans les ordres. */
export function vagueServiceHtml(e, s) {
  const x = etatVague(e);
  if (!x || x.v.domaine !== s) return '';
  return `<span class="tiny ${x.ok ? 'good' : 'bad'}" style="display:block">🌊 Vague attendue (force ${x.force}) : ${fmt1(x.cap)} / ${fmt1(x.seuil)} ${x.ok ? '· tu la brises' : `· ≈ ${x.manque} agent${x.manque > 1 ? 's' : ''} de plus`}</span>`;
}

/** Alerte discrète pour la zone qui a fait fuir la délinquance hier soir. */
export function vagueEnvoyeeAlerte() {
  const st = S.state, z = myZone();
  const ve = z && z.vagueEnvoyee;
  if (!ve || ve.tour !== st.turn - 1) return null;
  const txt = VAGUE_TXT[ve.domaine];
  const vers = ve.vers && st.zones[ve.vers];
  return { cls: 'blue', titre: `C’était toi : ton ${txt.court} a fait fuir la délinquance`, texte: vers ? `elle se replie chez ${esc(vers.nom)} ce soir · personne ne sait d’où elle vient` : 'aucune zone voisine pour l’accueillir : elle s’est dispersée', href: '#carte' };
}
