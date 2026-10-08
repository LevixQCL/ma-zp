/* Socle commun des mini-jeux Ma ZP (démo) : menu, tuto, résultat, jauge skins, sons, toasts. */
const $ = id => document.getElementById(id);
const rand = (a,b) => a + Math.random()*(b-a);
const randi = (a,b) => Math.floor(rand(a,b+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const shuffle = arr => { const a=arr.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };

const ICONS = {
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.4" fill="currentColor"/></svg>',
  alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="8" width="17" height="12" rx="2.5"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3.5 13h17"/><circle cx="17" cy="16.5" r="1" fill="currentColor"/></svg>',
  car:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16.5h14v-4l-2-5H7l-2 5z"/><path d="M5 12.5h14"/><circle cx="8" cy="16.5" r="1.8"/><circle cx="16" cy="16.5" r="1.8"/></svg>',
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5V8h4"/><path d="M9 12.5h6M9 16h4"/></svg>',
  sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h9"/></svg>',
  print:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6.5 8.5a6.5 6.5 0 0 1 11 0"/><path d="M5.5 13c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5c0 1.6-.2 3.1-.6 4.5"/><path d="M8.5 19.5c-.6-1.9-1-4-1-6.5a4.5 4.5 0 0 1 9 0c0 2.2-.4 4.3-1.1 6"/><path d="M12 12.5c0 3 .5 5.7 1.4 8"/><path d="M10.6 21c-.7-1.7-1.1-3.6-1.1-5.5"/></svg>',
  dna:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M7 3c0 6 10 6 10 12s-10 3-10 6"/><path d="M17 3c0 6-10 6-10 12s10 3 10 6"/><path d="M8.5 6.5h7M9 17.5h6M8 11.5h3M13 11.5h3"/></svg>',
  net:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/></svg>',
  trace:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="18" r="2"/><circle cx="12" cy="7" r="2"/><circle cx="19" cy="15" r="2"/><path d="M6.2 16.3l4.6-7.6M13.4 8.6l4.3 4.8"/><path d="M19 3v4M17 5h4"/></svg>',
  barrage:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="6" rx="1.5"/><path d="M8 7l-3 6M13 7l-3 6M18 7l-3 6"/><path d="M6 13v6M18 13v6M4 19h4M16 19h4"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cross:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>'
};

const Shell = (() => {
  let G = null;
  const st = {diff:'normal', tuto:false, gauge:46, sound:true, mode:'menu', timeLeft:0, timeTotal:1, timerOn:false, timerRate:1, onTimeout:null};
  const store = {
    get(k,d){try{const v=localStorage.getItem(G.key+'.'+k);return v===null?d:JSON.parse(v)}catch(e){return d}},
    set(k,v){try{localStorage.setItem(G.key+'.'+k,JSON.stringify(v))}catch(e){}}
  };
  let ac=null;
  function blip(freq,dur,type='square',vol=.06){
    if(!st.sound) return;
    try{
      ac = ac || new (window.AudioContext||window.webkitAudioContext)();
      const o=ac.createOscillator(), g=ac.createGain();
      o.type=type; o.frequency.value=freq; g.gain.value=vol;
      g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime+dur);
      o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime+dur);
    }catch(e){}
  }
  const good = () => { blip(1200,.06,'square',.05); buzz(15); };
  const bad  = () => { blip(130,.18,'sawtooth',.06); buzz([30,40,30]); };
  const win  = () => { blip(660,.12,'triangle',.08); setTimeout(()=>blip(990,.25,'triangle',.08),120); buzz(60); };
  function buzz(p){ try{ navigator.vibrate && navigator.vibrate(p) }catch(e){} }
  let tt=0;
  function toast(txt,kind='info'){ const t=$('toast'); t.textContent=txt; t.className='toast show '+kind; clearTimeout(tt); tt=setTimeout(()=>t.className='toast '+kind,850); }
  function shake(el){ el=el||$('stage'); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  function showCard(html){ $('card').innerHTML=html; $('overlay').hidden=false; $('card').scrollTop=0; const c=$('card'); c.style.animation='none'; void c.offsetWidth; c.style.animation=''; }
  function hide(){ $('overlay').hidden=true; }
  function renderGauge(){ $('gfill').style.width=(st.gauge/50*100)+'%'; $('gtext').textContent=st.gauge; }

  function coach(step,total,html){
    const c=$('coach'); c.hidden=false;
    const dots=Array.from({length:total},(_,i)=>`<i class="${i<step?'on':''}"></i>`).join('');
    c.innerHTML=`<div class="av">CP</div><div class="body"><div class="step"><span class="dots" aria-label="Étape ${step} sur ${total}">${dots}</span><button class="skip" id="skipTuto">Passer le tuto</button></div><div>${html}</div></div>`;
    $('skipTuto').onclick=endTuto;
  }
  function hideCoach(){ $('coach').hidden=true; }
  const hero = sub => `<div class="hero"><div class="badge">${document.querySelector('.top .badge').innerHTML}</div><div><div class="eyebrow">${sub}</div></div></div>`;

  // Intégration dans Ma ZP : ?mode=incident (incident du jour, un seul essai), ?mode=renfort (renfort PJF pour
  // l'enquête, un seul essai, sans jauge) ou ?mode=train (entraînement).
  const Q = new URLSearchParams(location.search);
  const MODE = ['incident','train','renfort'].includes(Q.get('mode')) ? Q.get('mode') : null;
  const RENF = MODE==='renfort';
  const INC = MODE==='incident' || RENF;
  const escH = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function post(type, data={}){ try{ if(window.parent!==window) window.parent.postMessage({source:'mazp-mj', jeu:G.key, id:Q.get('id'), type, ...data}, location.origin); }catch(e){} }
  let joue=false, fini=false;

  // ───── Challenge (l'entraînement aux mini-jeux dans Ma ZP) : niveaux 1 → ∞, trois erreurs et la course s'arrête. ─────
  // Le record de la partie (et son détenteur) arrive par l'adresse ; chaque niveau réussi est signalé à Ma ZP.
  const DEFI = { rec: Math.max(0, Number(Q.get('rec'))||0), recNom: Q.get('recNom')||'', moi: Math.max(0, Number(Q.get('moi'))||0), erreurs: 3 };
  let run = null; // { niveau, erreurs, reussis } pendant une course
  /**
   * Réglages d'un niveau : du niveau 1 (plus doux que « facile ») au niveau 10 (= « difficile »), en passant par
   * facile (4) et normal (7) ; au-delà, chaque réglage continue de se serrer au même rythme que de normal à difficile,
   * en multipliant (au moins 3 % par niveau). Le temps, lui, tend vers un plancher jouable par un très bon joueur. Bornes par jeu.
   */
  function cfgNiveau(n){
    const F=G.diffs.facile, N=G.diffs.normal, D=G.diffs.difficile, B=G.bornes||{};
    const out={label:`Niveau ${n}`, niveau:n, defi:true};
    const val=(f,m,d,k)=>{
      if(n<=10){
        const pts=[[1,f+(f-m)*0.5],[4,f],[7,m],[10,d]];
        for(let i=0;i<3;i++){ const [a,va]=pts[i],[b,vb]=pts[i+1]; if(n<=b) return va+(vb-va)*(n-a)/(b-a); }
      }
      let r = m>0&&d>0 ? Math.pow(d/m,1/3) : 1;
      if(r===1 && k==='time') r=0.95;
      else if(r!==1 && Math.abs(r-1)<0.03) r = r>1?1.03:0.97;
      // Le temps s'approche de son plancher sans l'atteindre (un temps qu'un très bon joueur tient encore) :
      // ce sont la précision et la complexité qui finissent par départager.
      if(k==='time'){ const lo=(B.time&&B.time[0])||0; if(lo>0 && d>lo) return lo+(d-lo)*Math.pow(Math.min(r,.93),n-10); }
      return d*Math.pow(r,n-10);
    };
    const borne=(v,b,k,d,ent)=>{ const [lo,hi]=b||(k==='time'?[Math.max(15,d*0.3),Infinity]:[-Infinity,Infinity]); v=Math.min(hi,Math.max(lo,v)); return ent?Math.round(v):Math.round(v*1000)/1000; };
    const cles=new Set([...Object.keys(F),...Object.keys(N),...Object.keys(D)]);
    for(const k of cles){
      if(k==='agents'||k==='label') continue;
      const f=F[k], m=N[k], d=D[k];
      const ref = d!==undefined?d:m!==undefined?m:f;
      if(f===undefined||m===undefined||d===undefined){ // réglage propre aux niveaux durs
        if(d!==undefined && n>=10) out[k]=d; else if(m!==undefined && n>=7) out[k]=m; else if(f!==undefined && n<7) out[k]=f;
        continue;
      }
      if(typeof ref==='number') out[k]=borne(val(f,m,d,k),B[k],k,d,[f,m,d].every(Number.isInteger));
      else if(Array.isArray(ref)) out[k]=ref.map((_,i)=>borne(val(f[i],m[i],d[i],k),B[k]&&B[k][i],k,d[i],[f[i],m[i],d[i]].every(Number.isInteger)));
      else out[k] = n>=10?d:n>=7?m:f;
    }
    return G.niveau ? G.niveau(n,out) : out;
  }
  const eyebrow = t => { const eb=document.querySelector('.top .eyebrow'); if(eb) eb.textContent=t; };
  const eyebrowBase = () => (RENF?'Appui PJF · ':INC?'Incident du jour · ':G&&G.evt?'Événement · ':MODE==='train'?'Challenge · ':'')+G.serviceShort;
  const recLigne = () => DEFI.rec ? `Record de la partie : <b>niveau ${DEFI.rec}</b>${DEFI.recNom?` par ${escH(DEFI.recNom)}`:''}.` : 'Pas encore de record dans la partie : le premier niveau réussi le crée.';
  // Course en cours gardée sur l'appareil : on peut quitter le mini-jeu (ou être coupé) et reprendre au même niveau,
  // avec les mêmes cœurs. Un niveau quitté en cours de route est simplement rejoué. La sauvegarde vaut pour ce joueur
  // et pour la semaine du Challenge en cours (la prime du dimanche ne doit pas hériter d'une course de la semaine passée).
  const CLE_RUN = `defiRun.${Q.get('u')||'anon'}`;
  const sauverRun = () => { if(MODE==='train' && run) store.set(CLE_RUN, {...run, sem:Q.get('sem')||'', at:Date.now()}); };
  const oublierRun = () => store.set(CLE_RUN, null);
  function runSauvee(){
    const r = MODE==='train' ? store.get(CLE_RUN, null) : null;
    if(!r || !(r.niveau>1 || r.erreurs>0)) return null;
    if((r.sem||'') !== (Q.get('sem')||'')) { oublierRun(); return null; }
    return r;
  }
  function startDefi(){ oublierRun(); run={niveau:1, erreurs:0, reussis:0}; jouerNiveau(); }
  function reprendreDefi(){ const r=runSauvee(); if(!r) return startDefi(); run={niveau:r.niveau, erreurs:r.erreurs, reussis:r.reussis||r.niveau-1}; jouerNiveau(); }
  function jouerNiveau(){
    sauverRun();
    hide(); hideCoach(); st.mode='play';
    eyebrow(`Challenge · niv. ${run.niveau} · ${'♥'.repeat(DEFI.erreurs-run.erreurs)}${'♡'.repeat(run.erreurs)}`);
    G.onPlay(cfgNiveau(run.niveau)); toast(`Niveau ${run.niveau}`);
  }
  function resultDefi({ok, stats, details}){
    st.timerOn=false; st.mode='result';
    const n=run.niveau;
    post('result',{ok, defi:true}); // compté comme une partie d'entraînement
    const detailHtml = details && details.length && !ok ? `<div class="debrief-list"><b>Ce qui s’est mal passé</b><ul>${details.map(d=>`<li><span>${d}</span></li>`).join('')}</ul></div>` : '';
    const coeurs = `${'♥'.repeat(DEFI.erreurs-run.erreurs)}${'♡'.repeat(run.erreurs)}`;
    if(ok){
      run.reussis=n; run.niveau=n+1; sauverRun();
      const record = n>DEFI.rec, perso = n>DEFI.moi;
      post('defi',{niveau:n});
      if(record){ DEFI.rec=n; DEFI.recNom='toi'; } if(perso) DEFI.moi=n;
      showCard(`<div class="verdict ok">${ICONS.check}</div><h2>Niveau ${n} réussi</h2>
        <div class="stats">${stats.slice(0,2).map(([a,b])=>`<div class="stat"><span>${a}</span><b>${b}</b></div>`).join('')}<div class="stat"><span>Erreurs</span><b class="coeurs">${coeurs}</b></div></div>
        ${record?'<div class="skin">Nouveau record de la partie ! Ton nom s’affiche sur la tuile du challenge.</div>':perso?'<p class="small">Nouveau record personnel.</p>':''}
        <p class="small">Le niveau ${n+1} sera un peu plus dur.</p>
        <div class="row"><button class="btn primary" id="suite">Niveau ${n+1}</button><button class="btn" id="stop">Terminer la course</button></div>
        ${MODE==='train'?`<p class="small" style="opacity:.75">Besoin de partir ? Quitte le jeu : ta course reprendra au niveau ${n+1}.</p>`:''}`);
      $('suite').onclick=jouerNiveau; $('stop').onclick=()=>confirmerFin(n+1);
      return;
    }
    run.erreurs++; sauverRun();
    if(run.erreurs>=DEFI.erreurs){ finDefi(detailHtml); return; }
    const reste=DEFI.erreurs-run.erreurs;
    showCard(`<div class="verdict bad">${ICONS.cross}</div><h2>Niveau ${n} raté</h2>
      <p class="small">Encore <b>${reste} erreur${reste>1?'s':''}</b> permise${reste>1?'s':''} <span class="coeurs">${'♥'.repeat(DEFI.erreurs-run.erreurs)}${'♡'.repeat(run.erreurs)}</span>.</p>${detailHtml}
      <div class="row"><button class="btn primary" id="suite">Retenter le niveau ${n}</button><button class="btn" id="stop">Terminer la course</button></div>
      ${MODE==='train'?`<p class="small" style="opacity:.75">Besoin de partir ? Quitte le jeu : ta course reprendra au niveau ${n}.</p>`:''}`);
    $('suite').onclick=jouerNiveau; $('stop').onclick=()=>confirmerFin(n);
  }
  // « Terminer la course » efface la progression : on demande confirmation (un clic de travers ne doit rien coûter).
  function confirmerFin(prochain){
    const row=$('stop') && $('stop').parentNode; if(!row) return finDefi();
    const box=document.createElement('div'); box.className='confirm-fin'; box.setAttribute('role','alertdialog'); box.setAttribute('aria-label','Confirmer la fin de la course');
    box.innerHTML=`<p class="small"><b>Terminer la course ?</b> Ta progression sera perdue : la prochaine course repartira du niveau 1${prochain>1?` au lieu du niveau ${prochain}`:''}.</p>
      <div class="row"><button class="btn primary" id="garder">Non, je continue</button><button class="btn danger" id="confStop">Oui, terminer</button></div>`;
    row.replaceWith(box);
    $('garder').onclick=()=>{ box.replaceWith(row); };
    $('confStop').onclick=()=>finDefi();
    $('garder').focus();
  }
  function finDefi(detailHtml=''){
    st.timerOn=false; st.mode='result';
    const k=run?run.reussis:0; run=null; oublierRun(); eyebrow(eyebrowBase());
    showCard(`${hero('Challenge')}<h2>Fin de la course</h2>
      <div class="stats"><div class="stat"><span>Niveaux réussis</span><b>${k}</b></div><div class="stat"><span>Ton record</span><b>${DEFI.moi}</b></div><div class="stat"><span>Record partie</span><b>${DEFI.rec}</b></div></div>
      ${typeof detailHtml==='string'?detailHtml:''}
      <p class="small">${recLigne()}</p>
      <div class="row"><button class="btn primary" id="encore">Nouvelle course</button><button class="btn" id="tomenu">Menu</button></div>`);
    $('encore').onclick=startDefi; $('tomenu').onclick=menu;
  }
  const unite = n => `${n} ${G.unit ? G.unit[n>1?1:0] : (n>1?'agents':'agent')}`;
  const effectif = () => { const d=G.diffs[st.diff]; const n=Number(Q.get('agents')); return unite(Number.isFinite(n)&&Q.get('agents')!==null?n:d.agents); };
  const effLabel = () => G.effLabel || `Effectif ${G.serviceShort} sur place`;

  function menu(){
    if(INC && fini){ post('close'); return; }
    st.mode='menu'; st.timerOn=false; hideCoach(); G.onMenu && G.onMenu();
    if(run){ run=null; eyebrow(eyebrowBase()); }
    const touch=matchMedia('(pointer:coarse)').matches;
    // Tuto déjà vu (ou en option) : petit bouton discret au-dessus de l'action principale, pas un second gros bouton.
    const tutoSeul = () => `<button class="tuto-mini" id="tuto" type="button"><i aria-hidden="true">?</i>${st.tuto?'Revoir le tuto':'Tuto'}</button>`;
    // Guide illustré (si le mini-jeu en a un) : petit bouton à côté du tuto, sur tous les écrans de départ.
    const guideMini = () => G.guide ? `<button class="tuto-mini" id="guideBtn" type="button"><i aria-hidden="true">i</i>Comment jouer</button>` : '';
    const tutoMini = () => G.guide ? `<div class="minis">${guideMini()}${tutoSeul()}</div>` : tutoSeul();
    const tutoBtns = (goLbl) => st.tuto
      ? `<button class="btn primary" id="go">${goLbl}</button>`
      : `<button class="btn primary" id="tuto">Commencer le tuto</button><button class="btn" id="go">${RENF?'Commencer sans tuto':INC?'Intervenir sans tuto':'Jouer directement'}</button>`;
    // Événement d'actualité (lancé depuis Ma ZP) : une seule partie, réglage normal, puis invitation au Challenge.
    if(G.evt && !INC){
      showCard(`
        ${hero('Événement · '+G.service)}
        <h2>${G.headline}</h2>
        ${G.story}
        ${tutoMini()}<div class="row"><button class="btn primary" id="evtGo">${G.evt.go||'Jouer'}</button></div>
        ${(!touch && G.desktopHint)?`<p class="small">${G.desktopHint}</p>`:''}
        <p class="demo">Une partie en difficulté normale, sans effet sur ta zone.</p>`);
      $('evtGo').onclick=jouerEvt; $('tuto').onclick=startTuto; brancherGuide();
      return;
    }
    if(INC){
      const d=G.diffs[st.diff];
      showCard(`
        ${hero((RENF?'Appui PJF · ':'Incident du jour · ')+G.serviceShort)}
        <h2>${G.headline}</h2>
        ${G.story}
        <div class="lbl2">${effLabel()}</div>
        <div class="seg seg1"><button aria-pressed="true" tabindex="-1"><span class="ppl">${'<i></i>'.repeat(Math.max(1,Math.min(12,Number(Q.get('agents'))||d.agents)))}</span><b>${effectif()}</b>${d.label}</button></div>
        ${Q.get('pourquoi')?`<p class="small" style="opacity:.8">${escH(Q.get('pourquoi'))}</p>`:''}
        <p class="small">${RENF?`Un seul essai. Réussi : ${escH(Q.get('gain')||'une pièce pour ton enquête')}. Raté ou abandonné : ${escH(Q.get('malus')||'pas de pièce')}.`:`Un seul essai. Réussi : ${escH(Q.get('gain')||'un bonus')} et des points de jauge des skins. Raté ou abandonné : ${escH(Q.get('malus')||G.malus)}. Tout s’applique à 20:00.`}</p>
        ${st.tuto?tutoMini():guideMini()?`<div class="minis">${guideMini()}</div>`:''}<div class="row">${tutoBtns(RENF?'Commencer':'Intervenir')}</div>
        <button class="btn small" id="later" style="align-self:center">Plus tard</button>
        ${(!touch && G.desktopHint)?`<p class="small">${G.desktopHint}</p>`:''}`);
    } else if(MODE==='train'){
      // Dans Ma ZP, l'entraînement aux mini-jeux, c'est le challenge : les premiers niveaux servent d'échauffement.
      const reprise=runSauvee();
      showCard(`
        ${hero('Challenge · '+G.service)}
        <h2>${G.headline}</h2>
        ${G.story}
        <div class="defi-box"><div><b>🏆 Challenge</b><span>Du niveau 1 (tout doux) à aussi haut que possible : chaque niveau est un peu plus dur. Trois erreurs et la course s’arrête.</span><span>${recLigne()}${DEFI.moi?` Ton record : niveau ${DEFI.moi}.`:''}</span></div></div>
        ${tutoMini()}
        ${reprise?`<div class="row"><button class="btn primary" id="defiReprise">Reprendre au niveau ${reprise.niveau} <span class="coeurs" style="color:inherit;opacity:.8;margin-left:6px">${'♥'.repeat(DEFI.erreurs-reprise.erreurs)}${'♡'.repeat(reprise.erreurs)}</span></button></div>
        <div class="row"><button class="btn" id="defiGo">Recommencer au niveau 1</button></div>`
        :`<div class="row"><button class="btn primary" id="defiGo">Lancer le challenge</button></div>`}
        ${(!touch && G.desktopHint)?`<p class="small">${G.desktopHint}</p>`:''}
        <p class="demo">Sans effet sur ta zone : ton meilleur niveau s’affiche sur la tuile du Challenge.</p>`);
      $('tuto').onclick=startTuto; $('defiGo').onclick=startDefi; if(reprise) $('defiReprise').onclick=reprendreDefi; brancherGuide();
      return;
    } else {
      const seg=Object.entries(G.diffs).map(([k,d])=>`<button data-k="${k}" aria-pressed="${k===st.diff}"><span class="ppl">${'<i></i>'.repeat(d.agents)}</span><b>${G.unit ? unite(d.agents) : ({difficile:'Sous-effectif',normal:'Effectif de base',facile:'Renforcé'})[k]}</b>${d.label}</button>`).join('');
      showCard(`
        ${hero('Ma ZP · '+G.service)}
        <h2>${G.headline}</h2>
        ${G.story}
        <div class="lbl2">${effLabel()}</div>
        <div class="seg" id="seg">${seg}</div>
        <p class="small">${G.diffHint}</p>
        ${st.tuto?tutoMini():guideMini()?`<div class="minis">${guideMini()}</div>`:''}<div class="row">${tutoBtns('Jouer')}</div>
        ${(!touch && G.desktopHint)?`<p class="small">${G.desktopHint}</p>`:''}
        <p class="demo">Démo jouable, rien n'est enregistré dans ta partie Ma ZP.</p>`);
      $('seg').onclick=e=>{const b=e.target.closest('button'); if(!b) return; st.diff=b.dataset.k; store.set('diff',st.diff);
        [...$('seg').children].forEach(x=>x.setAttribute('aria-pressed',x.dataset.k===st.diff));};
    }
    $('go').onclick=play; $('tuto').onclick=startTuto;
    if($('later')) $('later').onclick=()=>post('close');
    brancherGuide();
  }
  function brancherGuide(){ if($('guideBtn')) $('guideBtn').onclick=guide; }
  function guide(){ hideCoach(); showCard(`${hero('Comment jouer')}${G.guide()}<div class="row"><button class="btn primary" id="guideBack">Compris</button></div>`);
    $('guideBack').onclick=menu; G.onGuide && G.onGuide(); }
  function play(){
    if(INC){ if(fini) return; if(!joue){ joue=true; post('start'); } }
    hide(); hideCoach(); st.mode='play'; G.onPlay(G.diffs[st.diff]);
  }
  function jouerEvt(){ hide(); hideCoach(); st.mode='play'; G.onPlay(G.evt.cfg()); }
  function resultEvt({ok, stats, details}){
    st.timerOn=false; st.mode='result'; post('result',{ok, defi:true});
    const detailHtml = details && details.length && !ok ? `<div class="debrief-list"><b>Ce qui s’est mal passé</b><ul>${details.map(d=>`<li><span>${d}</span></li>`).join('')}</ul></div>` : '';
    showCard(`<div class="verdict ${ok?'ok':'bad'}">${ok?ICONS.check:ICONS.cross}</div><h2>${ok?G.winTitle:G.loseTitle}</h2>
      <div class="stats">${stats.slice(0,3).map(([a,b])=>`<div class="stat"><span>${a}</span><b>${b}</b></div>`).join('')}</div>
      ${detailHtml}
      <div class="defi-box"><div><b>${G.evt.finTitre||'Tu as aimé ce jeu ?'}</b><span>${G.evt.fin}</span></div></div>
      <div class="row"><button class="btn primary" id="evtFin">Retour à ma zone</button><button class="btn" id="evtAgain">${ok?'Rejouer':'Réessayer'}</button></div>`);
    $('evtFin').onclick=()=>post('close'); $('evtAgain').onclick=jouerEvt;
  }
  function startTuto(){ hide(); st.mode='tuto'; st.timerOn=false; G.onTuto(); }
  function endTuto(){
    st.tuto=true; store.set('tuto',true); hideCoach(); st.mode='menu'; st.timerOn=false; G.onMenu && G.onMenu();
    showCard(`${hero('Tutoriel terminé')}<h2>Les règles en bref</h2><ul>${G.rules.map(r=>`<li><span>${r}</span></li>`).join('')}</ul>
      <div class="row"><button class="btn primary" id="go">${INC?'Intervenir':MODE==='train'?'Lancer le challenge':'Lancer une partie'}</button><button class="btn" id="tomenu">${INC?'Plus tard':'Menu'}</button></div>`);
    $('go').onclick=G.evt&&!INC?jouerEvt:MODE==='train'?startDefi:play; $('tomenu').onclick=INC?()=>post('close'):menu;
  }
  function startTimer(sec,onTimeout){ st.timeLeft=sec; st.timeTotal=sec; st.timerOn=true; st.timerRate=1; st.onTimeout=onTimeout; }
  function stopTimer(){ st.timerOn=false; }
  function fmt(s){ s=Math.max(0,Math.ceil(s)); return s>=60? Math.floor(s/60)+':'+String(s%60).padStart(2,'0') : String(s); }

  function result({ok, stats, faults, malus, note, details, bonusPts=0}){
    if(run && !INC){ resultDefi({ok, stats, details}); return; }
    if(G.evt && !INC){ resultEvt({ok, stats, details}); return; }
    st.timerOn=false; st.mode='result';
    let pts=0, skin=false;
    if(ok) pts=(faults===0?2:1)+(bonusPts||0); // bonusPts : défi bonus réussi (Maintien de l'ordre)
    if(INC){
      fini=true; post('result',{ok, fautes:faults, pts, ...(bonusPts>0?{bonus:true}:{})});
      if(ok && !RENF){ st.gauge+=pts; renderGauge(); }
    } else if(MODE!=='train' && ok){ st.gauge+=pts; if(st.gauge>=50){st.gauge-=50; skin=true;} store.set('gauge',st.gauge); renderGauge(); }
    const statHtml=stats.map(([a,b])=>`<div class="stat"><span>${a}</span><b>${b}</b></div>`).join('')+(MODE==='train'||RENF?'':`<div class="stat pts"><span>Jauge skins</span><b>${ok?'+'+pts:'+0'}</b></div>`);
    const boutons = INC ? `<button class="btn primary" id="mjBack">${RENF?'Retour à l’enquête':'Retour au commissariat'}</button>`
      : `<button class="btn primary" id="again">${ok?'Rejouer':'Réessayer'}</button><button class="btn" id="tomenu">Menu</button>`;
    const detailHtml = details && details.length ? `<div class="debrief-list"><b>${ok?'Tes erreurs':'Ce qui s’est mal passé'}</b><ul>${details.map(d=>`<li><span>${d}</span></li>`).join('')}</ul></div>` : '';
    const noteInc = RENF ? (ok ? 'Analyse réussie : la pièce arrivera dans ton dossier d’enquête à 20:00.' : '') : INC ? (ok ? `Résultat enregistré : ${escH(Q.get('gain')||'ton bonus')} et +${pts} sur la jauge des skins, à 20:00.${st.gauge>=50?' Ta jauge sera pleine ce soir : un nouveau skin t’attend.':''}` : '') : '';
    showCard(ok?`
      <div class="verdict ok">${ICONS.check}</div>
      <h2>${G.winTitle}</h2>
      <div class="stats">${statHtml}</div>
      ${skin?`<div class="skin">Jauge pleine : le skin « ${G.skin} » est débloqué pour ton commissariat.</div>`:''}
      ${detailHtml}
      <p class="small">${INC?noteInc:MODE==='train'?'Entraînement : rien ne compte pour ta zone.':(note || (faults===0?'Sans faute : double point.':'Termine sans erreur pour gagner +2.'))}</p>
      <div class="row">${boutons}</div>`
    :`
      <div class="verdict bad">${ICONS.cross}</div>
      <h2>${G.loseTitle}</h2>
      <div class="stats">${statHtml}</div>
      ${detailHtml}
      ${MODE==='train'?'<p class="small">Entraînement : aucune conséquence.</p>':RENF?'<div class="malus"><b>Pas de pièce</b> · L’analyse n’a rien donné : l’équipe repart. Tu peux redemander un appui pour demain.</div>':`<div class="malus"><b>Malus</b> · ${escH(INC&&Q.get('malus')?Q.get('malus')+' (appliqué à 20:00)':(malus||G.malus))}</div>`}
      <div class="row">${boutons}</div>`);
    if(INC) $("mjBack").onclick=()=>post("close"); else { $('again').onclick=play; $('tomenu').onclick=menu; }
  }

  const CIRC = 2*Math.PI*21;
  let last=performance.now();
  function frame(ts){
    const dt=Math.min(.05,(ts-last)/1000); last=ts;
    if(st.timerOn){ st.timeLeft-=dt*st.timerRate; if(st.timeLeft<=0){ st.timeLeft=0; st.timerOn=false; st.onTimeout && st.onTimeout(); } }
    // G.ownTimer : le mini-jeu gère lui-même l'anneau du haut (Maintien de l'ordre : compte à rebours entre les vagues)
    if(!G.ownTimer){
      const playing = st.mode==='play';
      $('timer').textContent = playing ? fmt(st.timeLeft) : '–';
      const frac = playing ? Math.max(0,st.timeLeft/st.timeTotal) : 1;
      $('ringval').style.strokeDashoffset = CIRC*(1-frac);
      $('ring').classList.toggle('warn', playing && st.timeLeft<10);
    }
    if(!st.pause) G.onFrame && G.onFrame(dt, ts/1000);
    requestAnimationFrame(frame);
  }

  function init(cfg){
    G=cfg;
    st.diff=store.get('diff','normal'); st.tuto=store.get('tuto',false); st.gauge=store.get('gauge',46);
    if(INC){ if(G.diffs[Q.get('diff')]) st.diff=Q.get('diff'); st.gauge=Math.max(0,Number(Q.get('jauge'))||0); }
    if(MODE==='train' || RENF) $('gaugeRow').hidden=true;
    $('ringval').style.strokeDasharray=CIRC;
    renderGauge();
    $('sound').onclick=()=>{ st.sound=!st.sound; $('sound').classList.toggle('off',!st.sound); $('sound').setAttribute('aria-label',st.sound?'Couper le son':'Activer le son'); };
    if(MODE){
      document.body.classList.add('embed');
      eyebrow(eyebrowBase());
      // Dans Ma ZP : la barre « Retour à ma zone » ferme le mini-jeu ; le bouton du haut du jeu ferait doublon.
      const b=$('menuBtn'); b.hidden=true; b.style.display='none';
      window.addEventListener('message', e=>{ const d=e.data; if(e.origin!==location.origin || !d || d.source!=='mazp' || d.type!=='quitter') return;
        if(INC && joue && !fini && st.mode==='play') askQuit(); else post('close'); });
    } else $('menuBtn').onclick=menu;
    document.addEventListener('contextmenu',e=>e.preventDefault());
    G.onInit && G.onInit();
    menu();
    requestAnimationFrame(frame);
  }
  function askQuit(){
    const was=st.timerOn; st.timerOn=false; st.pause=true;
    showCard(RENF?`<h2>Renvoyer l’équipe ?</h2><p>Tu n’as qu’un essai : si tu quittes maintenant, pas de pièce, et l’équipe repart.</p>
      <div class="row"><button class="btn primary" id="stay">Continuer</button><button class="btn" id="quit">Abandonner</button></div>`:`<h2>Abandonner l’incident ?</h2><p>Tu n’as qu’un essai : si tu quittes maintenant, l’incident compte comme raté et le malus tombera à 20:00.</p>
      <div class="row"><button class="btn primary" id="stay">Continuer</button><button class="btn" id="quit">Abandonner</button></div>`);
    $('stay').onclick=()=>{ hide(); st.timerOn=was; st.pause=false; };
    $('quit').onclick=()=>{ fini=true; post('result',{ok:false, fautes:1, pts:0, abandon:true}); post('close'); };
  }
  return {init, st, blip, good, bad, win, buzz, toast, shake, coach, hideCoach, endTuto, startTimer, stopTimer, result, menu, fmt, cfgNiveau, get enDefi(){ return !!run; },
    // Tests automatisés : lancer directement un niveau du défi (sans effet : rien n'est enregistré avant une réussite).
    _essaiNiveau(n){ run={niveau:n, erreurs:0, reussis:0}; jouerNiveau(); }};
})();
