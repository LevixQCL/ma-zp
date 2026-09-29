// Écrans de connexion et d'inscription.
import { S, esc, icon } from './common.js';
import { COULEURS_ZONE } from '../engine/constants.js';

export function renderLogin() {
  const demo = S.backend.mode === 'demo';
  return `<main class="center-screen">
    <div class="col" style="gap:6px;align-items:flex-start">
      <span style="color:var(--amber)">${icon('shield', 44)}</span>
      <h1 class="brand" style="font-size:46px">Ma ZP</h1>
      <p class="sub" style="font-size:14px">District Delta · jeu de gestion entre collègues</p>
    </div>
    ${S.invitation ? `<div class="card amber"><p class="small" style="margin:0;color:var(--amber-soft)"><strong style="color:var(--text)">Tu as été invité dans une partie.</strong> Connecte-toi ou crée un compte : tu y entreras directement (code ${esc(S.invitation)}).</p></div>` : ''}
    ${demo ? `
      <div class="card amber"><p class="small" style="margin:0;color:var(--amber-soft)"><strong style="color:var(--text)">Mode démo.</strong> La partie tourne sur cet appareil avec 5 zones robots. Tu peux faire avancer les tours toi-même pour tester le jeu.</p></div>
      <button class="btn primary block" data-action="demo-start">Commencer la démo</button>` : `
      <button class="btn block" data-action="login-google" style="background:#fff;color:#1f1f1f;border:none">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6C6.6 42.6 14.6 48 24 48z"/></svg>
        Continuer avec Google</button>
      <div class="divider">ou avec une adresse e-mail</div>
      <form class="col" data-form="login" style="gap:10px">
        <label class="field">Adresse e-mail<input class="text" type="email" name="email" autocomplete="email" required></label>
        <label class="field">Mot de passe (6 caractères minimum)<input class="text" type="password" name="password" autocomplete="current-password" minlength="6" required></label>
        <div class="row">
          <button class="btn primary grow" type="submit" name="mode" value="login">Se connecter</button>
          <button class="btn grow" type="submit" name="mode" value="signup">Créer un compte</button>
        </div>
        <button class="btn ghost small" type="button" data-action="reset-password">Mot de passe oublié ?</button>
      </form>`}
    <p class="tiny muted" style="margin:0">Jeu 100 % fictif. N’y encodez jamais de données de service.</p>
  </main>`;
}

export function renderInscription({ gameExists, isAdmin }) {
  if (!gameExists) {
    return `<main class="center-screen">
      <h1 class="brand">Ma ZP</h1>
      <div class="card">
        <h2 class="card-title">La partie n’a pas encore commencé</h2>
        <p class="small muted" style="margin:0">${isAdmin ? 'Tu es le maître du jeu : lance la partie pour que tes collègues puissent s’inscrire.' : 'Le maître du jeu doit d’abord lancer la partie. Reviens un peu plus tard.'}</p>
        ${isAdmin ? '<button class="btn primary block" data-action="admin-create">Lancer la partie</button>' : ''}
      </div>
      <button class="btn ghost small" data-action="logout">Se déconnecter</button>
    </main>`;
  }
  const f = S.signup || { code: '', nom: '', couleur: COULEURS_ZONE[0] };
  const pris = new Set(Object.values(S.state?.zones || {}).map((z) => z.couleur));
  return `<main class="center-screen" style="justify-content:flex-start;padding-top:32px">
    <div class="col" style="gap:4px"><span class="kicker">Prise de fonction</span><h1 class="big">Ta zone de police</h1>
    <p class="sub">Choisis le code et le nom de ta zone. Tu pourras renommer ta zone plus tard.</p></div>
    <form class="col" data-form="signup" style="gap:14px">
      <label class="field">Ton prénom ou pseudo (affiché sur la carte)<input class="text" name="pseudo" maxlength="24" required value="${esc(f.pseudo ?? ((S.user && S.user.displayName) || '').split(' ')[0])}" placeholder="Bryan"></label>
      <label class="field">Code de zone (4 chiffres)<input class="text mono" name="code" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required value="${esc(f.code)}" placeholder="5324"></label>
      <label class="field">Nom de la zone<input class="text" name="nom" maxlength="24" required value="${esc(f.nom)}" placeholder="Horizon"></label>
      <fieldset style="border:none;padding:0;margin:0" class="col">
        <legend class="small muted" style="font-weight:600;margin-bottom:6px">Couleur</legend>
        <div class="swatches">${COULEURS_ZONE.slice(0, 6).map((c) => `<button type="button" class="swatch" style="background:${c}" data-action="pick-color" data-color="${c}" aria-pressed="${f.couleur === c}" aria-label="Couleur ${c}${pris.has(c) ? ' (déjà prise)' : ''}"></button>`).join('')}</div>
        <p class="tiny muted" style="margin:4px 0 0">D’autres couleurs se débloquent au grade d’Inspecteur.</p>
      </fieldset>
      <button class="btn primary block" type="submit">Prendre mon service</button>
    </form>
  </main>`;
}
