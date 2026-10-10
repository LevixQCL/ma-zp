// Saison 2 : l'écran Enquête en « dossier ouvert », dans l'esprit du nouvel HP et des énigmes.
// En haut, l'affaire en grand (photo, jours) et UNE prochaine étape. Puis le mur : les fiches de la scène
// et les suspects en polaroïds sur une ficelle, avec tes ✓ / ✕ en tampons. « Ce soir » en cases à remplir.
// Enfin le classeur (pièces, scène, plan, planques, notes) sur une feuille de papier lisible.
// Les nouvelles pièces arrivent sous enveloppe : on les ouvre une à une, et on dit ce qu'on en conclut.
import { zoneAvecAgenda } from './chef.js';
import { S, esc, icon, tabbar, myZone, zoneName, fmt1 } from './common.js';
import { portraitSuspect } from './portrait.js';
import { banniereDebrief, debriefsRecents } from './debrief.js';
import { primeHtml } from './prime.js';
import { recitAffaire } from '../engine/recit.js';
import { photoScene, photoUne, photoButin } from './scene-crime.js';
import { photoIndice, aPhoto } from './indices-photo.js';
import { dossierAffaire3 } from '../engine/dossier.js';
import { journalHtml, journalAuto } from './journal.js';
import { sceneFouilleHtml, sceneZoomHtml } from './scene-fouille.js';
import { tutoActif } from './tutoriel.js';
import { engagementsDuJour } from './engagements.js';
import { relecturesHtml, soirPlusHtml } from './enquete-plus.js';
import {
  ENQ, ELEMENTS, ELEMENT_NOM, DEMARCHES, affaire, dossierDe, texteFait, titrePiece, rebondsPublies, pointsDecouverte,
  dansMaCellule, celluleDe, demarcheDe, maxDemarchesDe, coutDemarche, REAUD, RECOUP,
} from '../engine/enquete.js';
import {
  lireCarnet, ecrireCarnet, sauvegardeCarnet, sourceDe, voisinageInfo, appuiHtml, banniereTraque, traqueHtml, etatSuspect,
  nomsAccuses, regleHtml, vuePlanques, avisMisePrix,
} from './enquete.js';
import {
  MAP, COL, preparerTableau, volet, dispo, completerFiche, resumeConstat, CONSTAT_TITRE, derniereScene, pieceSuspect,
  statutPartage, typePiece, planSvg, lieuPos, lieuxDe, planquePos, numPv, redacteur, docsOuverture, chronologie,
} from './tableau.js';
import { lieuxMons } from '../engine/meurtre-mons.js';

const NOM_EL = { occ: 'Occasion', moy: 'Moyen', mob: 'Mobile' };

// ───── Pièces lues (ouvertes sous enveloppe), gardées dans le carnet : elles suivent le joueur d'un appareil à l'autre ─────
/** Pièces arrivées au dossier que le joueur n'a pas encore ouvertes, les plus anciennes d'abord. */
export function piecesNonLues(aff, dos) {
  const c = lireCarnet(aff.n);
  const lues = c.lues || {};
  // Avant la saison 2, « sortir de la boîte » valait lecture : on ne refait pas ouvrir ce qui est déjà punaisé.
  const places = new Set(((c.tab && c.tab.places) || []).concat(((c.tab && c.tab.fiches) || []).map((e) => `c:${e}`)));
  return dos.pieces.filter((p) => p.src !== 'ouverture' && !p.doc && !lues[p.f] && !places.has(p.f))
    .sort((a, b) => a.j - b.j || (a.f < b.f ? -1 : 1));
}
/** Marque des pièces comme ouvertes (et complète la fiche de constatation d'un vol). */
export function marquerLues(n, fs) {
  const c = lireCarnet(n);
  c.lues = { ...(c.lues || {}) };
  for (const f of fs) { c.lues[f] = 1; }
  ecrireCarnet(n, c);
  for (const f of fs) { const m = /^c:(occ|moy|mob)$/.exec(f); if (m) completerFiche(m[1]); }
}

// ───── Morceaux ─────
const genreDe = (aff) => (aff.genre === 'corbeau' ? 'Lettres anonymes' : aff.meurtre ? 'Homicide' : 'Vol');

function photoHero(aff) {
  return photoHero0(aff).replace(/^<svg /, '<svg preserveAspectRatio="xMidYMid slice" ');
}
function photoHero0(aff) {
  const d3 = aff.prof ? dossierAffaire3(S.state.seed, aff) : null;
  if (d3) return photoUne(d3.scene, `e2h${aff.n}`);
  if (aff.carte) return photoUne(recitAffaire(S.state.seed, aff).scene, `e2h${aff.n}`);
  return photoUne(/vitrine|bijout|musée|galerie/i.test(aff.lieu || '') ? 'vitrine' : 'entrepot', `e2h${aff.n}`);
}

function menuHtml(aff) {
  const st = S.state;
  const x = (() => { const recents = new Set((S.gazettes || []).slice(0, 3)); return debriefsRecents().find((d) => recents.has(d.g)); })();
  const it = (attrs, t, s) => `<button type="button" ${attrs}><span>${t}${s ? `<small>${s}</small>` : ''}</span></button>`;
  return `<details class="fe-menu e2-menu"><summary class="e2-hbtn" aria-label="Plus d’options">⋯</summary><div class="fe-menu-l">
    ${aff.prof ? it('data-action="journal-ouvrir"', '📰 Relire le journal', 'la une du jour 1') : it('data-action="tab-ouvrir" data-tid="titre"', '📰 Les faits', 'récit et main courante')}
    ${it('data-action="tab-vue" data-v="tableau"', '📌 Mon tableau en liège', 'le grand liège, les ficelles')}
    ${it('data-action="tab-vue" data-v="liste"', '☰ Affichage en liste', 'tout sur une page')}
    ${it('data-action="tab-sync"', `↻ Synchroniser${S.carnetSync && S.carnetSync !== 'ok' && S.carnetSync !== 'encours' ? ' · ⚠' : ''}`, 'tes ✓ / ✕ et notes, sur tes autres appareils')}
    ${sauvegardeCarnet(st.enquete.n) ? it('data-action="tab-restaurer"', '⟲ Restaurer', 'le carnet de cet appareil d’avant la synchro') : ''}
    ${x ? it(`data-action="debrief-ouvrir" data-id="${esc(x.id)}"`, '📂 Dossier clos', esc(x.db.titre)) : ''}
    <a href="#guide-enquete"><span>❔ Comment fonctionne l’enquête ?</span></a>
  </div></details>`;
}

function heroHtml(aff) {
  const j = S.state.enquete.jour;
  const jours = Array.from({ length: ENQ.dureeMax }, (_, k) => `<i class="${k + 1 < j ? 'passe' : k + 1 === j ? 'ajd' : ''}"></i>`).join('');
  return `<section class="e2-hero" aria-label="L’affaire">
    <div class="e2-photo">${photoHero(aff)}</div>
    <div class="e2-hud">
      <span class="e2-k">Affaire n° ${aff.n} · ${esc(genreDe(aff))}${aff.ville === 'mons' ? ' · Mons' : ''}</span>
      <span class="grow"></span>
      ${aff.prof ? '<button type="button" class="e2-hbtn" data-action="journal-ouvrir" aria-label="Relire le journal">📰</button>' : ''}
      ${menuHtml(aff)}
    </div>
    <div class="e2-titre">
      <h1>${esc(aff.titre)}</h1>
      <div class="e2-jours" aria-label="Jour ${j} sur ${ENQ.dureeMax}"><span class="e2-jt">Jour ${j}<small>/${ENQ.dureeMax}</small></span><span class="e2-pts">${jours}</span><span class="e2-dec" title="Points si tu trouves l’auteur ce soir">🔎 ${pointsDecouverte(j)} pts ce soir</span></div>
    </div>
  </section>`;
}

/** La prochaine étape : un seul gros bouton, comme « Avant 20:00 » à l'HP. */
function prochaineEtape(aff, dos, et, nonLues) {
  const st = S.state, d = S.draft, carnet = lireCarnet(aff.n);
  const dem = d.demarches || [], max = maxDemarchesDe(st, zoneAvecAgenda());
  const tr = (st.traques || []).find((t) => !t.fini);
  if (tr && !(d.traque && d.traque.n === tr.n)) return { t: 'Traque : choisis la planque', s: `${affaire(st, tr.n).suspects[affaire(st, tr.n).coupable].nom} est en fuite`, a: 'data-action="e2-ancre" data-id="traque"' };
  if (nonLues.length) return { t: `Ouvrir ${nonLues.length > 1 ? `les ${nonLues.length} nouvelles pièces` : 'la nouvelle pièce'}`, s: 'arrivées au dossier · dis ce que tu en conclus', a: 'data-action="e2-lire"', env: true };
  if (dos.exclu) return { t: 'Affaire retirée', s: 'tes pièces partagées peuvent encore rapporter', a: 'data-action="e2-onglet" data-t="pieces"', fini: true };
  if (dos.accuse !== null && dos.accuse !== undefined) return { t: 'Accusation transmise', s: 'résultat ce soir à 20:00', fini: true };
  if (d.accusation !== null && d.accusation !== undefined) return { t: `${aff.meurtre ? 'Confrontation prête' : 'Accusation prête'} : ${nomsAccuses(aff, d, 'prenom')}`, s: 'elle part à 20:00 avec tes ordres', fini: true };
  const constats = aff.meurtre ? ELEMENTS.filter((e) => derniereScene(aff, et.connus, e)).length : ELEMENTS.filter((e) => et.connus.has(`c:${e}`)).length;
  const constatsPrevues = dem.filter((x) => !x.includes(':') && ['cam', 'labo', 'temoin', ...(aff.meurtre ? ELEMENTS.map((e) => aff.fiches[e].dem) : [])].includes(x)).length;
  const nA = aff.variante === 'complices' ? 2 : 1;
  const enLice = aff.suspects.map((_, i) => i).filter((i) => etatSuspect(carnet, i, aff) !== 'exclu');
  if (dem.length < max && constats + constatsPrevues < 3 && !aff.meurtre) return { t: 'Établir la scène', s: `${3 - constats} constatation${3 - constats > 1 ? 's' : ''} à demander · ${dem.length}/${max} démarches`, a: 'data-action="e2-choix"' };
  if (dem.length < max) return { t: `Choisir tes démarches · ${dem.length}/${max}`, s: dem.length ? 'encore une place pour ce soir' : 'une pièce de plus par démarche, à 20:00', a: 'data-action="e2-choix"' };
  if (enLice.length === nA && !dos.exclu) return { t: `${aff.meurtre ? 'Confronter' : 'Accuser'} ${enLice.map((i) => aff.suspects[i].prenom).join(' et ')} ?`, s: 'il ne reste que lui dans ton carnet · une seule chance', a: `data-action="tab-ouvrir" data-tid="s${enLice[0]}"` };
  return { t: 'Tout est prêt pour 20:00', s: 'résultats ce soir, sous enveloppe', fini: true };
}

function ctaHtml(e) {
  const tag = e.a ? 'button type="button"' : 'div';
  return `<${tag} class="hs-cta e2-cta ${e.fini ? 'fini' : ''} ${e.env ? 'env' : ''}" ${e.a || ''}>
    <span class="hs-cta-t">${e.env ? '<span class="e2-env" aria-hidden="true"></span>' : e.fini ? `${icon('check', 18)} ` : ''}${esc(e.t)}</span><span class="hs-cta-s">${esc(e.s)}</span></${e.a ? 'button' : 'div'}>`;
}

/** Le mur : les trois fiches de la scène, puis les suspects en polaroïds sur une ficelle. */
function murHtml(aff, dos, et, nonLues) {
  const st = S.state, d = S.draft, carnet = lireCarnet(aff.n);
  const dem = d.demarches || [];
  const fiches = ELEMENTS.map((e) => {
    let titre, txt, vide = false;
    if (aff.meurtre) {
      const der = derniereScene(aff, et.connus, e);
      titre = aff.fiches[e].titre; txt = der && nonLues.some((p) => p.f === der) ? 'résultat arrivé ✉' : der ? aff.resumes[der] : (dem.includes(aff.fiches[e].dem) ? 'demandé ce soir' : 'à établir'); vide = !der;
    } else {
      const ok = et.connus.has(`c:${e}`) && !nonLues.some((p) => p.f === `c:${e}`);
      titre = CONSTAT_TITRE[e]; txt = et.connus.has(`c:${e}`) && !ok ? 'résultat arrivé ✉' : ok ? resumeConstat(aff, e) : (dem.includes({ occ: 'cam', moy: 'labo', mob: 'temoin' }[e]) ? 'demandé ce soir' : 'à établir'); vide = !ok;
    }
    return `<button type="button" class="e2-fiche ${vide ? 'vide' : ''}" style="--c:${COL[e]}" data-action="tab-ouvrir" data-tid="c:${e}"><span class="e2-fk">${NOM_EL[e]}</span><span class="e2-ft">${esc(titre)}</span><span class="e2-fv">${esc(txt)}</span></button>`;
  }).join('');
  // Plusieurs groupes d'enquête : les suspects sur qui ma zone enquête directement portent un ruban « ma zone » (les autres coûtent le double).
  const cellules = !!(st.enquete && st.enquete.nbCellules > 1);
  const polo = (i) => {
    const s = aff.suspects[i];
    const etat = etatSuspect(carnet, i, aff);
    const accuse = d.accusation === i || d.accusation2 === i || dos.accuse === i || dos.accuse2 === i;
    const soir = dem.filter((x) => x.endsWith(`:${i}`)).length + (d.piste === i ? 1 : 0);
    const neuf = nonLues.filter((p) => pieceSuspect(p.f) === i).length;
    const mien = cellules && dansMaCellule(st, S.user.uid, i);
    const sceaux = ELEMENTS.map((e) => { const v = carnet.g[`${i}:${e}`] || 0; return `<i class="v${v}" style="--c:${COL[e]}" title="${NOM_EL[e]} : ${['pas encore établi', 'établi', 'exclu'][v]}">${['', '✓', '✕'][v]}</i>`; }).join('');
    return `<button type="button" class="e2-polo ${etat} ${accuse ? 'accuse' : ''}" style="--r:${((i * 37) % 7) - 3}deg" data-action="tab-ouvrir" data-tid="s${i}" aria-label="${esc(s.nom)}, ${etat === 'exclu' ? 'exclu' : etat === 'complet' ? 'trois éléments établis' : 'en lice'}${mien ? ', ta zone enquête sur lui' : ''}">
      <span class="e2-pince" aria-hidden="true"></span>
      <span class="e2-ph">${portraitSuspect(s, i, 'tb-face')}${etat === 'exclu' ? '<svg class="e2-croix" viewBox="0 0 100 100" aria-hidden="true"><path d="M14 18 L86 84 M84 14 L18 86"/></svg>' : ''}${accuse ? '<svg class="e2-cercle" viewBox="0 0 120 120" aria-hidden="true"><path d="M60 8 C 100 6 116 40 112 66 C 106 104 60 116 30 102 C 4 88 2 46 22 24 C 34 12 52 8 70 10"/></svg>' : ''}</span>
      <span class="e2-pn">${esc(s.prenom)}</span><span class="e2-pr">${esc(s.role)}</span>
      <span class="e2-sceaux">${sceaux}</span>
      ${mien ? '<span class="e2-cel" title="Ta zone enquête directement sur ce suspect : démarches au prix normal">🔎 ma zone</span>' : ''}${neuf ? `<span class="e2-neuf">${neuf}</span>` : ''}${soir ? '<span class="e2-cesoir">ce soir</span>' : ''}
    </button>`;
  };
  // Une ficelle par rangée de trois (cinq sur ordinateur) : la photo du milieu descend avec le creux de la ficelle.
  const n = aff.suspects.length;
  const rangs = [];
  for (let k = 0; k < n; k += 3) rangs.push(aff.suspects.map((_, i) => i).slice(k, k + 3));
  const ficelle = '<svg class="e2-corde" viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true"><path d="M-4 6 Q150 44 304 6"/></svg>';
  return `<section class="e2-mur" aria-label="Le mur des suspects">
    <div class="e2-fiches">${fiches}</div>
    <div class="e2-rangs mobile">${rangs.map((r) => `<div class="e2-rang n${r.length}">${ficelle}${r.map(polo).join('')}</div>`).join('')}</div>
    <div class="e2-rangs pc"><div class="e2-rang n${n}">${ficelle}${aff.suspects.map((_, i) => polo(i)).join('')}</div></div>
    <p class="e2-leg">${ELEMENTS.map((e) => `<span><i style="--c:${COL[e]}"></i>${NOM_EL[e]}</span>`).join('')}<span class="e2-leg-t">· touche un visage</span></p>
    ${cellules ? celluleLigne(aff) : ''}
  </section>`;
}

/** Sous le mur : les suspects sur qui ma zone enquête directement, avec quelles zones, et la règle du prix. */
function celluleLigne(aff) {
  const st = S.state, moi = S.user.uid, c = celluleDe(st, moi);
  const zones = Object.values(st.zones).filter((x) => x.uid !== moi && (x.toursSansOrdres || 0) < 3 && celluleDe(st, x.uid) === c);
  const miens = aff.suspects.map((s2, i) => (dansMaCellule(st, moi, i) ? s2.prenom : null)).filter(Boolean);
  return `<p class="e2-cel-l"><span>🔎 <strong>Ta zone enquête sur ${esc(miens.length > 1 ? `${miens.slice(0, -1).join(', ')} et ${miens[miens.length - 1]}` : miens.join(''))}</strong>${zones.length ? `, avec ${zones.map((x) => esc(zoneName(x))).join(', ')}` : ''}.</span>
    <span class="muted">Les démarches sur les autres suspects coûtent le double. Répartissez-vous le travail sur la radio.</span></p>`;
}

/** Ce soir : les démarches en cases à remplir, la piste du voisinage, l'appui fédéral, les partages. */
function ceSoirHtml(aff, dos) {
  const st = S.state, d = S.draft, z = myZone();
  const dem = d.demarches || [], max = maxDemarchesDe(st, zoneAvecAgenda());
  const reste = z.budget - engagementsDuJour(d, z).total;
  const nomDem = (x) => { const [k, i] = x.split(':'); const dm = demarcheDe(aff, k); return i !== undefined ? [dm.nom, aff.suspects[Number(i)].prenom, Number(i)] : [dm.nom, aff.meurtre ? 'la scène' : 'constatation', null]; };
  const cases = Array.from({ length: max }, (_, k) => {
    const x = dem[k];
    if (!x) return `<button type="button" class="e2-case vide" data-action="e2-choix"><span class="e2-plus">+</span><span>Choisir une démarche</span></button>`;
    const [nom, qui, i] = nomDem(x);
    const prix = coutDemarche(st, S.user.uid, x);
    return `<div class="e2-case"><span class="e2-ct">${i !== null ? portraitSuspect(aff.suspects[i], i, 'tb-face e2-mini') : '<span class="e2-cs">🔍</span>'}<span class="col" style="gap:0;min-width:0"><strong>${esc(nom)}</strong><span class="tiny">${esc(qui)} · ${prix ? `${fmt1(prix)} k€` : `${demarcheDe(aff, x.split(':')[0]).agents} agents`}</span></span></span>
      <button type="button" class="e2-cx" data-action="dem-toggle" data-k="${esc(x)}" aria-label="Retirer ${esc(nom)} ${esc(qui)}">✕</button></div>`;
  }).join('');
  const v = voisinageInfo(aff);
  const vCourt = v.x <= 0 ? 'aucune chance' : v.x < 1 ? `${Math.round(v.x * 100)} %` : `1 pièce${v.x % 1 > 0.05 ? ` + ${Math.round((v.x % 1) * 100)} %` : ''}`;
  const carnet = lireCarnet(aff.n);
  const enLice = aff.suspects.map((_, i) => i).filter((i) => etatSuspect(carnet, i, aff) !== 'exclu');
  const pistes = enLice.map((i) => `<button type="button" class="chip ${d.piste === i ? 'on' : ''}" data-action="piste" data-i="${i}" aria-pressed="${d.piste === i}">${esc(aff.suspects[i].prenom)}${d.piste === i ? ' ✓' : ''}</button>`).join('');
  const parts = d.partages || [];
  const extras = [];
  if (aff.meurtre && d.reaud) extras.push(`<div class="tb-boite-l"><span class="small grow" style="font-weight:600">Réaudition · ${esc(aff.suspects[d.reaud.i].prenom)}</span><button type="button" class="btn small ghost" data-action="reaud-annuler" aria-label="Annuler la réaudition">✕</button></div>`);
  // Démarches toutes choisies : la carte se replie sur un résumé (on la rouvre pour changer, régler la piste ou l'appui).
  const ouvert = S.ouverts && S.ouverts['e2-soir'];
  if (dem.length >= max && !ouvert && !(S.tuto != null)) {
    const resume = dem.map((x) => { const [nom, qui] = nomDem(x); return `${esc(nom)} <span class="muted">· ${esc(qui)}</span>`; }).join('<br>');
    return `<section class="card e2-soir e2-soir-pli" aria-label="Ce soir">
      <button type="button" class="pli-ligne" data-action="e2-soir-ouvrir" aria-expanded="false">
        <span class="col grow" style="gap:3px;min-width:0;text-align:left"><span class="kicker">Ce soir à 20:00 · ${dem.length}/${max} démarches</span>
          <span class="small" style="font-weight:600;line-height:1.35">${resume}</span>
          <span class="tiny muted">${d.piste !== null && d.piste !== undefined && aff.suspects[d.piste] ? `piste : ${esc(aff.suspects[d.piste].prenom)} · ` : ''}${parts.length ? `${parts.length} partage${parts.length > 1 ? 's' : ''} · ` : ''}reste ${fmt1(reste)} k€ · touche pour modifier, piste, appui</span></span>
        <span class="pli-ok">${icon('check', 14)}</span>${icon('chevron', 16)}</button>
    </section>`;
  }
  return `<section class="card e2-soir" aria-label="Ce soir">
    <div class="between"><h2 class="e2-h2">Ce soir à 20:00</h2><span class="small muted">reste ${fmt1(reste)} k€${dem.length >= max ? ' · <button type="button" class="lien tiny" data-action="e2-soir-replier">replier</button>' : ''}</span></div>
    <div class="e2-cases">${cases}</div>
    <div class="e2-ligne"><span class="e2-li">🏘</span><span class="col grow" style="gap:4px;min-width:0"><span class="small"><strong>Voisinage</strong> · ${v.n} agent${v.n > 1 ? 's' : ''} en Recherche · <span class="${v.x >= 0.5 ? 'ok' : v.x > 0 ? '' : 'bad'}">${vCourt}</span></span>
      <span class="e2-pistes"><span class="tiny muted" style="white-space:nowrap">Piste :</span>${pistes}</span></span></div>
    <div class="e2-ligne"><span class="e2-li">🧪</span><span class="col grow" style="gap:4px;min-width:0">${appuiHtml({ compact: true })}</span></div>
    <div class="e2-ligne"><span class="e2-li">📤</span><span class="col grow" style="gap:2px;min-width:0"><span class="small"><strong>Partages</strong> · ${parts.length} / ${ENQ.maxPartages}</span>
      <span class="tiny muted">${parts.length ? parts.map((x) => `${esc(titrePiece(aff, x.f))} → ${x.a === '*' ? 'toutes' : esc(st.zones[x.a] ? zoneName(st.zones[x.a]) : '?')}`).join(' · ') : 'Ouvre une pièce du classeur pour la partager : PS et points d’enquête si elle aide.'}</span></span></div>
    ${extras.join('')}
    ${aff.recoupements || aff.hypothese ? soirPlusHtml(aff) : ''}
  </section>`;
}

// ───── Le classeur ─────
/** Une pièce en grand, sur papier : titre, photo, texte, relectures, partage. */
function docHtml(aff, p, { nouveau = false, partage = true } = {}) {
  const k = p.f.split(':')[0];
  const i = pieceSuspect(p.f);
  const sp = statutPartage(p);
  const ph = aPhoto(aff, p.f) ? `<div class="e2-dph" data-action="tab-ouvrir" data-tid="${esc(p.f)}">${photoIndice(aff, p.f, `e2d${p.f.replace(/[^a-z0-9]/gi, '')}`)}</div>` : k === 'p' && !aff.prof ? `<div class="e2-dph">${photoButin(`e2b${aff.n}`)}</div>` : '';
  const k2 = p.f.split(':')[1];
  const col = COL[k] || (k === 'c' && COL[k2] ? COL[k2] : k === 'p' ? '#6B4FB8' : k === 'c' ? '#3E6B4F' : '#8A7A5A');
  const qui = i !== null && aff.suspects[i] && !titrePiece(aff, p.f).includes(aff.suspects[i].prenom) ? aff.suspects[i].nom : '';
  return `<article class="e2-doc ${nouveau ? 'neuf' : ''}" style="--c:${col}">
    <div class="e2-dt"><span class="e2-dk">${aff.prof ? `PV n° ${esc(numPv(aff, p.f))} · ` : ''}J${p.j} · ${sourceDe(p)}</span>${nouveau ? '<span class="e2-tampon">Nouveau</span>' : ''}</div>
    <h3 class="e2-dh">${esc(titrePiece(aff, p.f))}${qui ? ` <span class="e2-dq">· ${esc(qui)}</span>` : ''}</h3>
    ${ph}
    <div class="e2-dtx">${esc(texteFait(aff, p.f)).split('\n').map((l) => `<p>${l}</p>`).join('')}</div>
    ${relecturesHtml(aff, p.f, preparerConnus(aff))}
    ${partage && sp.k !== 'tous' ? `<div class="e2-dp"><span class="tiny tb-t-${sp.k}">${esc(sp.txt)}</span><button type="button" class="btn small ghost" data-action="tab-partager" data-f="${esc(p.f)}">Partager…</button></div>` : ''}
  </article>`;
}
let CONNUS2 = null;
const preparerConnus = () => CONNUS2 || new Set();

function ongletPieces(aff, dos, nonLues) {
  const j = S.state.enquete.jour;
  const filtre = S.piecesFiltre || 'toutes';
  const groupe = (p) => (p.f.startsWith('c:') ? 'scene' : p.f.startsWith('p:') ? 'planques' : pieceSuspect(p.f) !== null ? `s${pieceSuspect(p.f)}` : 'autres');
  const nl = new Set(nonLues.map((p) => p.f));
  const tri = dos.pieces.slice().sort((x, y) => y.j - x.j || (x.f < y.f ? -1 : 1))
    .filter((p) => filtre === 'toutes' || (filtre === 'nouvelles' ? p.j >= j - 1 : groupe(p) === filtre));
  const nb = (g) => dos.pieces.filter((p) => groupe(p) === g).length;
  const f = (k, l, n) => `<button type="button" class="chip ${filtre === k ? 'on' : ''}" data-action="pieces-filtre" data-v="${k}">${l}${n !== undefined ? ` <span class="muted">${n}</span>` : ''}</button>`;
  const auditions = aff.prof ? `<div class="e2-auds"><span class="e2-sk">PV d’audition · connus de toutes les zones</span><div class="e2-aud-l">${aff.suspects.map((s, i) => `<button type="button" class="e2-aud" data-action="tab-ouvrir" data-tid="A:${i}">${portraitSuspect(s, i, 'tb-face e2-mini')}<span>${esc(s.prenom)}</span></button>`).join('')}</div></div>` : '';
  return `${auditions}
    <div class="e2-chips">${f('toutes', 'Toutes', dos.pieces.length)}${nb('scene') ? f('scene', aff.meurtre ? 'Scène' : 'Constatations', nb('scene')) : ''}${aff.suspects.map((s, i) => (nb(`s${i}`) ? f(`s${i}`, esc(s.prenom), nb(`s${i}`)) : '')).join('')}${nb('planques') ? f('planques', 'Planques', nb('planques')) : ''}${nb('autres') ? f('autres', 'Autres', nb('autres')) : ''}</div>
    ${tri.map((p) => docHtml(aff, p, { nouveau: nl.has(p.f) })).join('') || `<p class="small muted" style="margin:0">${dos.pieces.length ? 'Aucune pièce dans ce filtre.' : 'Pas encore de pièce : choisis tes démarches, elles arrivent ce soir à 20:00.'}</p>`}`;
}

function ongletScene(aff, dos, et) {
  const d3 = aff.prof ? dossierAffaire3(S.state.seed, aff) : null;
  const rc = !d3 && aff.carte ? recitAffaire(S.state.seed, aff) : null;
  const docs = [];
  docs.push(`<button type="button" class="e2-vign" data-action="tab-ouvrir" data-tid="recit"><span class="e2-vi">📄</span><span><strong>${d3 ? esc(d3.pvc.titre) : 'Procès-verbal d’ouverture'}</strong><small>${d3 ? `PV n° ${esc(d3.pvc.numero)}` : 'le récit des faits'}</small></span></button>`);
  if (d3 || rc) docs.push(`<button type="button" class="e2-vign" data-action="tab-ouvrir" data-tid="scene"><span class="e2-vi ph">${photoScene((d3 || rc).scene, `e2s${aff.n}`)}</span><span><strong>${aff.meurtre ? 'Fouiller la scène' : 'Photo de la scène'}</strong><small>${aff.meurtre ? 'touche les plots' : 'le labo, jour 1'}</small></span></button>`);
  if ((d3 && d3.plainte) || rc) docs.push(`<button type="button" class="e2-vign" data-action="tab-ouvrir" data-tid="plainte"><span class="e2-vi">🖋</span><span><strong>${esc((d3 ? d3.plainte : rc.plainte).titre)}</strong><small>${esc((d3 ? d3.plainte : rc.plainte).qui)}</small></span></button>`);
  if (aff.meurtre && aff.evenements) docs.push(`<button type="button" class="e2-vign" data-action="tab-ouvrir" data-tid="frise"><span class="e2-vi">🕰</span><span><strong>Chronologie</strong><small>${dispo(aff.n).frise.length} événement${dispo(aff.n).frise.length > 1 ? 's' : ''} posé${dispo(aff.n).frise.length > 1 ? 's' : ''}</small></span></button>`);
  const fiches = ELEMENTS.map((e) => {
    if (aff.meurtre) {
      const fi = aff.fiches[e], seq = aff.sceneSeq[fi.dem], kn = seq.filter((f) => et.connus.has(f));
      return `<button type="button" class="e2-cst" style="--c:${COL[e]}" data-action="tab-ouvrir" data-tid="c:${e}"><span class="e2-fk">${esc(fi.titre)} · ${kn.length}/${seq.length}</span>${kn.length ? kn.map((f) => `<span class="small"><strong>${esc(titrePiece(aff, f))}</strong> · ${esc(aff.resumes[f] || '')}</span>`).join('') : '<span class="small muted">Rien encore · touche pour demander</span>'}</button>`;
    }
    const ok = et.connus.has(`c:${e}`);
    return `<button type="button" class="e2-cst" style="--c:${COL[e]}" data-action="tab-ouvrir" data-tid="c:${e}"><span class="e2-fk">${NOM_EL[e]} · ${esc(CONSTAT_TITRE[e])}</span><span class="small">${ok ? esc(resumeConstat(aff, e)) : '<span class="muted">Pas encore établi · touche pour demander</span>'}</span></button>`;
  }).join('');
  const rebonds = rebondsPublies(S.state);
  return `<p class="small" style="margin:0;line-height:1.5">${esc(aff.recit)}</p>
    ${regleHtml(aff)}
    <div class="e2-vigns">${docs.join('')}</div>
    <span class="e2-sk">${aff.meurtre ? 'Ce que dit la scène' : 'Ce qu’il fallait pour commettre les faits'}</span>
    ${fiches}
    ${rebonds.length ? `<span class="e2-sk">Rebondissements</span>${rebonds.map((r) => `<div class="e2-rebond"><span class="e2-fk">Jour ${r.j}</span><strong>${esc(r.titre)}</strong><span class="small">${esc(r.texte)}</span></div>`).join('')}` : ''}
    <details class="e2-mc"><summary class="e2-sk">Main courante ${icon('chevron', 14)}</summary>${chronologie(aff, dos).map((l) => `<p class="small" style="margin:0"><strong>J${l.j}</strong> · ${esc(l.t)}</p>`).join('')}</details>`;
}

function ongletPlan(aff, et) {
  const sel = S.tabSheet && S.tabSheet.id;
  const pins = [], liste = [];
  const declares = aff.ville === 'mons' ? Object.keys(lieuxMons(aff)).filter((k) => !lieuxMons(aff)[k].repere && k !== aff.pos) : [...new Set(aff.suspects.filter((s) => s.alibi.type !== 'seul').map((s) => s.alibi.pos))];
  for (const k of declares) {
    const l = lieuxDe(aff)[k]; const q = lieuPos(aff, k);
    if (!l || !q) continue;
    const x = q[0] - MAP.x, y = q[1] - MAP.y;
    const no = pins.length + 1, nom = l.nom.replace(/[←→↑↓↖↗↘↙]/g, '').replace(/·.*$/, '').trim();
    const qui = aff.suspects.filter((x) => x.alibi && x.alibi.pos === k).map((x) => x.prenom);
    pins.push(`<button type="button" class="e2-pin ${sel === `L:${k}` ? 'on' : ''}" style="left:${(x / 880) * 100}%;top:${(y / 900) * 100}%" data-action="tab-ouvrir" data-tid="L:${esc(k)}" aria-label="${esc(nom)}"><i>${no}</i></button>`);
    liste.push(`<button type="button" class="e2-lieu" data-action="tab-ouvrir" data-tid="L:${esc(k)}"><i>${no}</i><span class="grow"><strong>${esc(nom)}</strong>${qui.length ? `<small>${esc(qui.join(', '))}</small>` : ''}</span><span aria-hidden="true">›</span></button>`);
  }
  if (!aff.meurtre) aff.planques.forEach((p, i) => {
    const [x, y] = planquePos(p, aff); const m = lireCarnet(aff.n).p[i] || 0;
    pins.push(`<button type="button" class="e2-pin planque m${m}" style="left:${(x / 880) * 100}%;top:${(y / 900) * 100}%" data-action="tab-ouvrir" data-tid="P:${i}"><i>⌂</i></button>`);
    liste.push(`<button type="button" class="e2-lieu planque m${m}" data-action="tab-ouvrir" data-tid="P:${i}"><i>⌂</i><span class="grow"><strong>${esc(p.nom)}</strong><small>planque possible${m === 1 ? ' · écartée' : m === 3 ? ' · retenue' : ''}</small></span><span aria-hidden="true">›</span></button>`);
  });
  const heures = aff.meurtre ? et.connus.has(aff.pieceHeure || 'c:legiste2') : et.connus.has('c:occ');
  return `<div class="e2-plan">${planSvg(aff, heures)}${pins.join('')}</div>
    <p class="tiny muted" style="margin:0">Croix rouge : la scène. Touche un lieu : qui dit y avoir été, et le temps de trajet${aff.ville === 'mons' ? ' (Google Maps)' : ''}.</p>
    <div class="e2-lieux">${liste.join('')}</div>
    ${aff.prof && aff.ville !== 'mons' ? '<button type="button" class="btn small" data-action="tab-ouvrir" data-tid="plan">Mesurer un trajet</button>' : ''}`;
}

function ongletNotes(aff) {
  const c = lireCarnet(aff.n);
  return `<label class="e2-sk" for="carnet-notes">Tes notes <span style="font-weight:500;text-transform:none;letter-spacing:0">· suivent sur tes autres appareils</span></label>
    <textarea id="carnet-notes" data-notes="${aff.n}" rows="12" class="notes" placeholder="Hypothèses, heures à comparer, qui a menti…">${esc(c.notes || '')}</textarea>`;
}

function classeurHtml(aff, dos, et, nonLues) {
  const tabs = [
    ['pieces', 'Pièces', `${dos.pieces.length} au dossier`, nonLues.length ? 'al' : ''],
    ['scene', aff.meurtre ? 'Scène' : 'Faits', aff.meurtre ? 'récit, scène' : 'récit, constats', ''],
    ['plan', 'Plan', aff.ville === 'mons' ? 'Mons' : 'le district', ''],
    ...(aff.meurtre ? [] : [['planques', 'Planques', `${aff.planques.length} lieux`, '']]),
    ['notes', 'Notes', lireCarnet(aff.n).notes ? 'à relire' : 'vide', ''],
  ];
  const t = tabs.some(([k]) => k === S.e2Onglet) ? S.e2Onglet : 'pieces';
  let corps;
  if (t === 'scene') corps = ongletScene(aff, dos, et);
  else if (t === 'plan') corps = ongletPlan(aff, et);
  else if (t === 'planques') corps = vuePlanques(aff, dos);
  else if (t === 'notes') corps = ongletNotes(aff);
  else corps = ongletPieces(aff, dos, nonLues);
  return `<section class="e2-classeur" id="e2-classeur" aria-label="Le dossier">
    <div class="classeur" role="tablist" style="--n:${tabs.length}">${tabs.map(([k, l, s, pt]) => `<button type="button" class="ong" role="tab" aria-selected="${t === k}" data-action="e2-onglet" data-t="${k}"><span class="t">${pt ? `<i class="pt ${pt}"></i>` : ''}${l}</span><span class="d">${esc(s)}</span></button>`).join('')}</div>
    <div class="feuille e2-feuille">${corps}</div>
  </section>`;
}

// ───── Enveloppes : ouvrir les nouvelles pièces une à une ─────
function lectureHtml(aff, dos, nonLues) {
  if (!S.e2Lire) return '';
  const p = nonLues[0];
  if (!p) { S.e2Lire = false; return ''; }
  const total = S.e2LireTotal || nonLues.length;
  const k = total - nonLues.length + 1;
  const i = pieceSuspect(p.f), e = (p.f.match(/^(occ|moy|mob):\d$/) || [])[1];
  let avis = '';
  if (i !== null && e && aff.suspects[i]) {
    const v = lireCarnet(aff.n).g[`${i}:${e}`] || 0;
    const s = aff.suspects[i];
    const b = (val, t) => `<button type="button" class="e2-av ${v === val ? 'on' : ''} v${val}" data-action="e2-marque" data-i="${i}" data-e="${e}" data-v="${val}" aria-pressed="${v === val}">${t}</button>`;
    avis = `<div class="e2-avis" style="--c:${COL[e]}"><span class="e2-sk" style="color:var(--c)">${NOM_EL[e]} de ${esc(s.prenom)} · ton avis</span>
      <div class="e2-avb">${b(1, `✓ ${e === 'occ' ? 'Il a pu y être' : e === 'moy' ? 'Il en avait les moyens' : 'Il avait un mobile'}`.replace('Il ', s.f ? 'Elle ' : 'Il '))}${b(2, '✕ Ça l’exclut')}${b(0, '· Pas sûr')}</div>
      <span class="tiny muted">Seul ton carnet le retient. ${aff.meurtre ? '' : 'Le coupable est le seul à réunir les trois ✓.'}</span></div>`;
  }
  return `<div class="e2-lire-voile" role="dialog" aria-modal="true" aria-label="Nouvelle pièce">
    <div class="e2-lire">
      <div class="e2-lt"><span class="e2-k">${k > total ? '' : `Nouvelle pièce · ${k} sur ${total}`}</span><button type="button" class="e2-hbtn" data-action="e2-lire-fin" aria-label="Fermer">✕</button></div>
      <div class="e2-pli">${docHtml(aff, p, { nouveau: true, partage: false })}</div>
      ${avis}
      <div class="e2-lb">
        <button type="button" class="btn ghost" data-action="e2-lire-partager" data-f="${esc(p.f)}">Partager…</button>
        <button type="button" class="btn primary grow" data-action="e2-suivante" data-f="${esc(p.f)}">${nonLues.length > 1 ? 'Classer · pièce suivante ›' : 'Classer au dossier'}</button>
      </div>
      ${nonLues.length > 2 ? '<button type="button" class="e2-toutes" data-action="e2-tout-classer">Tout classer sans lire</button>' : ''}
    </div>
  </div>`;
}

// ───── Écran ─────
export function renderEnqueteDossier() {
  const st = S.state, z = myZone();
  const aff = affaire(st, st.enquete.n);
  const dos = dossierDe(st, z);
  const et = preparerTableau(aff, dos);
  S.e2Rendu = true;
  CONNUS2 = new Set([...et.connus, ...(aff.prof ? docsOuverture(aff).map((x) => x.f) : [])]);
  if (!tutoActif()) journalAuto(aff);
  const nonLues = piecesNonLues(aff, dos);
  const j = st.enquete.jour;
  const rebonds = rebondsPublies(st).filter((r) => r.j === j);
  const traques = (st.traques || []).filter((t) => !t.fini);
  const sheet = S.tabSheet ? `<div class="bs-voile" data-action="tab-fermer"></div><div class="e2-volet">${volet(aff, dos, et)}</div>` : '';
  return `<main class="screen enq2">
    ${primeHtml()}${traques.length && S.banTraqueVue !== st.turn ? banniereTraque(st) : ''}${banniereDebrief()}
    ${heroHtml(aff)}
    ${ctaHtml(prochaineEtape(aff, dos, et, nonLues))}
    ${rebonds.map((r) => `<section class="card amber tight e2-reb"><span class="kicker">Jour ${r.j} · rebondissement</span><span style="font-weight:700">${esc(r.titre)}</span><span class="small" style="color:var(--amber-soft)">${esc(r.texte)}</span></section>`).join('')}
    ${traques.map(traqueHtml).join('')}
    <div class="e2-cols">
      <div class="e2-col">${murHtml(aff, dos, et, nonLues)}${ceSoirHtml(aff, dos)}</div>
      <div class="e2-col">${classeurHtml(aff, dos, et, nonLues)}</div>
    </div>
    ${S.savedOrders && !S.ordersDirty ? `<p class="tiny muted" style="margin:0;text-align:center">${icon('check', 14)} Choix enregistrés avec tes ordres du tour.</p>` : ''}
  </main>${sheet}${lectureHtml(aff, dos, nonLues)}${journalHtml(aff)}${sceneFouilleHtml(aff)}${tabbar('enquete')}${sceneZoomHtml(aff)}`;
}
