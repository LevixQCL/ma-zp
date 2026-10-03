// Le journal du lendemain : il s'ouvre en plein écran (en tournoyant, comme au cinéma) à la première visite
// d'une affaire « dossier complet », puis reste punaisé au tableau et se rouvre d'un toucher.
import { S, esc } from './common.js';
import { dossierAffaire3 } from '../engine/dossier.js';
import { photoUne } from './scene-crime.js';
import { planSvg3 } from './plan3.js';
import { LIEUX } from '../engine/carte3.js';

const cle = (aff) => `mazp-journal-${S.state.seed}-${aff.n}`;
export function journalVu(aff) { try { return localStorage.getItem(cle(aff)) === '1' || !!(S.journalVus && S.journalVus[aff.n]); } catch (e) { return !!(S.journalVus && S.journalVus[aff.n]); } }
export function marquerJournalVu(aff) { S.journalVus = { ...(S.journalVus || {}), [aff.n]: true }; try { localStorage.setItem(cle(aff), '1'); } catch (e) { /* pas de stockage */ } }

/** À appeler en affichant l'écran Enquête : ouvre le journal la première fois. */
export function journalAuto(aff) {
  if (aff.prof && S.journalOuvert === undefined && !journalVu(aff)) S.journalOuvert = aff.n;
}

export function journalHtml(aff) {
  if (!aff.prof || S.journalOuvert !== aff.n) return '';
  const d = dossierAffaire3(S.state.seed, aff);
  const j = d.journal;
  const sc = LIEUX[aff.pos];
  const crop = [Math.max(0, Math.min(880 - 300, sc.x - 150)), Math.max(0, Math.min(900 - 220, sc.y - 110)), 300, 220];
  const premier = !journalVu(aff);
  return `<div class="jr-wrap ${premier ? 'jr-tourne' : ''}" role="dialog" aria-modal="true" aria-label="La Gazette du Delta">
    <article class="jr">
      <header class="jr-tete">
        <div class="jr-oreilles"><span>N° ${j.numero}</span><span>${esc(j.date)}</span><span>1,80 €</span></div>
        <h1 class="jr-titre-journal">La Gazette du Delta</h1>
        <div class="jr-devise">Quotidien régional indépendant · District Delta</div>
      </header>
      <div class="jr-une">
        <span class="jr-surtitre">${esc(j.surtitre)}</span>
        <h2 class="jr-titre">${esc(j.titre)}</h2>
        <p class="jr-chapo">${esc(j.chapo)}</p>
      </div>
      <div class="jr-grille">
        <div class="jr-col-photo">
          <figure class="jr-photo">${photoUne(d.scene, `jr${aff.n}`)}<figcaption>${esc(j.legende)}</figcaption></figure>
          <div class="jr-texte">${j.corps.map((p, k) => `<p${k === 0 ? ' class="jr-lettrine"' : ''}>${esc(p)}</p>`).join('')}</div>
        </div>
        <aside class="jr-cote">
          <div class="jr-encadre"><span class="jr-encadre-t">Ce que l’on sait</span>
            <dl>${j.encadre.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
          <figure class="jr-plan">${planSvg3(aff, { crop, id: 'jrp' })}<figcaption>Le quartier ${esc(aff.pres)}. Plan complet au tableau d’enquête.</figcaption></figure>
          <div class="jr-second"><h3>${esc(j.second.titre)}</h3><p>${esc(j.second.texte)}</p></div>
          <div class="jr-breve ${j.breve[0] === 'Circulation' ? 'jr-alerte' : ''}"><span>${esc(j.breve[0])}</span><p>${esc(j.breve[1])}</p></div>
          <div class="jr-breve"><span>${esc(j.breve2[0])}</span><p>${esc(j.breve2[1])}</p></div>
        </aside>
      </div>
      <footer class="jr-pied">
        <button type="button" class="btn primary" data-action="journal-fermer">Ouvrir le dossier</button>
        <span class="tiny">Le journal reste punaisé à ton tableau.</span>
      </footer>
    </article>
  </div>`;
}
