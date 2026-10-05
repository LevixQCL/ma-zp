// Carte « Mise à prix » (choix de la récompense), affichée dans les Ordres et la vue liste de l'enquête.
import { S, esc, icon, myZone } from './common.js';
import { PRIME, PRIME_LABELS } from '../engine/enquete.js';
import { SERVICES, SERVICE_LABELS, NIVEAU_MAX } from '../engine/constants.js';

/** Carte « Mise à prix » : la zone a arrêté l'auteur et choisit sa récompense (avec ses ordres du jour). */
export function primeHtml({ tableau = false } = {}) {
  const z = myZone(), p = z && z.primeAChoisir;
  if (!p) return '';
  const d = S.draft || {}, choix = d.prime || '';
  const btn = (k, v, sous) => `<button type="button" class="dem compact" data-action="prime-choix" data-v="${v}" aria-pressed="${choix === v}"><span class="l">${PRIME_LABELS[k].ico} ${esc(PRIME_LABELS[k].nom)}</span><span class="p">${esc(sous || PRIME_LABELS[k].effet)}</span></button>`;
  const formation = SERVICES.map((s) => {
    const max = (z.niveaux[s] || 1) >= NIVEAU_MAX;
    return `<button type="button" class="chip ${choix === `formation:${s}` ? 'on' : ''}" data-action="prime-choix" data-v="formation:${s}" ${max ? 'disabled' : ''} aria-pressed="${choix === `formation:${s}`}">${esc(SERVICE_LABELS[s])} ${z.niveaux[s] || 1} → ${max ? 'max' : (z.niveaux[s] || 1) + 1}</button>`;
  }).join('');
  return `<section class="card amber tight ${tableau ? 'tb-ui' : ''}" style="gap:8px" aria-label="Mise à prix">
    <span class="kicker" style="color:var(--amber-soft)">Mise à prix · affaire « ${esc(p.titre)} »</span>
    <span style="font-weight:700">${esc(p.suspect)} est sous les verrous : choisis ta récompense</span>
    <div class="choices" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">${btn('confiscation', 'confiscation')}${btn('renfort', 'renfort')}</div>
    <div class="col" style="gap:4px"><span class="small"><strong>${PRIME_LABELS.formation.ico} ${esc(PRIME_LABELS.formation.nom)}</strong> · +1 niveau, sans agent absent :</span>
      <div class="row" style="gap:6px;flex-wrap:wrap">${formation}</div></div>
    <span class="tiny muted">${choix ? `${icon('check', 12)} Choix enregistré avec tes ordres : appliqué à 20:00.` : `À choisir avant 20:00, avec tes ordres. Sans choix : confiscation (+${PRIME.confiscation} k€).`}</span>
  </section>`;
}
