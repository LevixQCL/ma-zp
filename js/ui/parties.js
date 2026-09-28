// Écran « Mes parties » : ouvrir, créer ou rejoindre une partie.
import { S, esc, icon } from './common.js';

export function renderParties() {
  const b = S.backend;
  const list = S.parties || [];
  const current = b.gameId && b.gameId();
  const creees = list.filter((p) => p.owner === S.user.uid && p.id !== 'demo').length;
  const max = b.maxParties || 3;
  return `<main class="screen">
    ${S.state ? `<a href="#hp" class="row small" style="text-decoration:none;color:var(--muted)">${icon('back', 16)} HP</a>` : ''}
    <header class="col" style="gap:3px"><span class="kicker">Ma ZP</span><h1 class="big">Mes parties</h1>
      <p class="sub">Chaque partie est un district à part, avec ses joueurs, sa Gazette et son classement. Tu peux jouer dans plusieurs.</p></header>

    ${list.length ? `<section class="col" aria-label="Mes parties" style="gap:8px">
      ${list.map((p) => `<div class="card tight" ${p.id === current ? 'style="border-color:var(--amber-line)"' : ''}>
        <div class="between"><span style="font-weight:700;font-size:16px">${esc(p.nom)}</span>${p.owner === S.user.uid ? '<span class="tag" style="background:var(--amber-bg);color:var(--amber)">maître du jeu</span>' : ''}</div>
        <div class="between"><span class="small muted">Code d’invitation : <strong class="mono" style="color:var(--text)">${esc(p.code)}</strong></span>
          ${p.id === current ? '<span class="small good">partie ouverte</span>' : `<button class="btn small" data-action="party-open" data-id="${esc(p.id)}">Ouvrir</button>`}</div>
      </div>`).join('')}</section>` : `<div class="card amber"><p class="small" style="margin:0;color:var(--amber-soft)">Tu ne fais encore partie d’aucune partie. Rejoins celle d’un collègue avec son code, ou crée la tienne.</p></div>`}

    <form class="card" data-form="party-join" style="gap:10px">
      <h2 class="card-title" style="margin:0">Rejoindre une partie</h2>
      <label class="field">Code d’invitation (6 caractères)<input class="text mono" name="code" maxlength="6" required autocomplete="off" style="text-transform:uppercase;letter-spacing:3px" placeholder="K7PX2M"></label>
      <button class="btn primary block" type="submit">Rejoindre</button>
    </form>

    <form class="card" data-form="party-create" style="gap:10px">
      <h2 class="card-title" style="margin:0">Créer une partie</h2>
      <p class="small muted" style="margin:0">Tu en deviens le maître du jeu : tu la lances, tu partages son code, tu peux retirer un joueur. ${creees} sur ${max} parties créées.</p>
      <label class="field">Nom de la partie<input class="text" name="nom" maxlength="40" required placeholder="Brigade de nuit"></label>
      <button class="btn block" type="submit" ${creees >= max ? 'disabled' : ''}>${creees >= max ? `Maximum de ${max} parties atteint` : 'Créer la partie'}</button>
    </form>
    ${S.user ? `<button class="btn ghost small" data-action="logout">Se déconnecter</button>` : ''}
  </main>`;
}
