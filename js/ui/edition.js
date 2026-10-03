// Édition spéciale de la Gazette : quand le maître du jeu met l'enquête en pause (affaire retirée),
// chaque joueur voit une fois, en plein écran, la une qui salue l'identification du suspect,
// annonce la traque et la réouverture de l'enquête au prochain 20:00.
import { S, esc } from './common.js';
import { affaire } from '../engine/enquete.js';
import { formatDateBe } from '../engine/time.js';
import { portraitSuspect } from './portrait.js';

const cle = () => `mazp-edition-${S.state.seed}-${S.state.enquetePause && S.state.enquetePause.id}`;
export function editionVue() { try { return localStorage.getItem(cle()) === '1' || !!S.editionVue; } catch (e) { return !!S.editionVue; } }
export function marquerEditionVue() { S.editionVue = true; S.editionOuverte = false; try { localStorage.setItem(cle(), '1'); } catch (e) { /* pas de stockage */ } }

const nomZone = (z) => `ZP ${z.code} ${z.nom}`;
const liste = (l) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}` : l[0] || '');

/** Le contenu de l'édition spéciale, tiré de l'état (traque en cours, zones qui ont trouvé). */
export function contenuEdition(st) {
  const p = st.enquetePause;
  const tr = (st.traques || []).find((t) => !t.fini);
  const reprise = formatDateBe(p.reprise || st.nextDeadline);
  if (!tr) {
    return { titre: 'L’enquête marque une pause', chapo: `La prochaine affaire s’ouvrira ${reprise} à 20:00.`, corps: [], suspect: null };
  }
  const a = affaire(st, tr.n), s = a.suspects[a.coupable];
  const e = s.f ? 'e' : '', il = s.f ? 'elle' : 'il', le = s.f ? 'la' : 'le';
  const dec = (tr.decouvreurs || []).map((u) => st.zones[u]).filter(Boolean).map(nomZone);
  const con = (tr.contributeurs || []).map((u) => st.zones[u]).filter(Boolean).map(nomZone);
  return {
    surtitre: `Affaire « ${a.titre} »`,
    titre: `${s.nom} démasqué${e} !`,
    chapo: `${dec.length ? `Bravo à ${liste(dec)}` : 'Bravo aux enquêteurs'} : l’auteur des faits est identifié. Mandat d’arrêt délivré, ${il} se cache quelque part dans le district.`,
    corps: [
      `Les enquêteurs ont réuni le mobile, le moyen et l’occasion : ${s.nom}, ${s.role}, ${a.butin ? `est l’auteur${e} du vol (${a.butin}).` : 'est l’auteur des faits.'}`,
      con.length ? `Le parquet salue aussi ${liste(con)}, dont les pièces ont fait avancer le dossier.` : 'Toutes les zones qui ont partagé leurs pièces ont leur part dans ce succès.',
      `La traque est ouverte à toutes les zones : choisis une planque d’après les indices de ton dossier et envoie au moins quatre agents d’Intervention pour ${le} cueillir. Il reste ${tr.tours} tour${tr.tours > 1 ? 's' : ''}.`,
    ],
    suspect: s, i: a.coupable,
    annonce: `L’affaire annoncée hier soir est retirée. La nouvelle enquête s’ouvrira ${reprise} à 20:00 : place à la traque d’ici là.`,
  };
}

export function editionHtml() {
  const st = S.state;
  if (!st || !st.enquetePause || !(S.editionOuverte || !editionVue())) return '';
  const c = contenuEdition(st);
  return `<div class="jr-wrap ${editionVue() ? '' : 'jr-tourne'}" role="dialog" aria-modal="true" aria-label="La Gazette du Delta, édition spéciale">
    <article class="jr">
      <header class="jr-tete">
        <div class="jr-oreilles"><span>Édition spéciale</span><span>${esc(formatDateBe(st.lastResolvedAt || Date.now()))}</span><span>Gratuit</span></div>
        <h1 class="jr-titre-journal">La Gazette du Delta</h1>
        <div class="jr-devise">Quotidien régional indépendant · District Delta</div>
      </header>
      <div class="jr-une">
        ${c.surtitre ? `<span class="jr-surtitre">${esc(c.surtitre)}</span>` : ''}
        <h2 class="jr-titre">${esc(c.titre)}</h2>
        <p class="jr-chapo">${esc(c.chapo)}</p>
      </div>
      <div class="jr-grille">
        <div class="jr-col-photo">
          <div class="jr-texte">${c.corps.map((p, k) => `<p${k === 0 ? ' class="jr-lettrine"' : ''}>${esc(p)}</p>`).join('')}</div>
        </div>
        <aside class="jr-cote">
          ${c.suspect ? `<div class="jr-encadre ed-avis"><span class="jr-encadre-t">Avis de recherche</span>
            <div class="ed-portrait">${portraitSuspect(c.suspect, c.i, 'ed-face')}</div>
            <dl><dt>Nom</dt><dd>${esc(c.suspect.nom)}</dd><dt>Âge</dt><dd>${esc(String(c.suspect.age || '?'))} ans</dd><dt>Signalement</dt><dd>${esc(c.suspect.role)}</dd></dl></div>` : ''}
          ${c.annonce ? `<div class="jr-breve jr-alerte"><span>Enquête</span><p>${esc(c.annonce)}</p></div>` : ''}
        </aside>
      </div>
      <footer class="jr-pied">
        <button type="button" class="btn primary" data-action="edition-fermer">${c.suspect ? 'À la traque !' : 'Fermer'}</button>
      </footer>
    </article>
  </div>`;
}
