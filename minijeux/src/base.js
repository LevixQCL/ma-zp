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
  const unite = n => `${n} ${G.unit ? G.unit[n>1?1:0] : (n>1?'agents':'agent')}`;
  const effectif = () => { const d=G.diffs[st.diff]; const n=Number(Q.get('agents')); return unite(Number.isFinite(n)&&Q.get('agents')!==null?n:d.agents); };
  const effLabel = () => G.effLabel || `Effectif ${G.serviceShort} sur place`;

  function menu(){
    if(INC && fini){ post('close'); return; }
    st.mode='menu'; st.timerOn=false; hideCoach(); G.onMenu && G.onMenu();
    const touch=matchMedia('(pointer:coarse)').matches;
    const tutoBtns = (goLbl) => st.tuto
      ? `<button class="btn primary" id="go">${goLbl}</button><button class="btn" id="tuto">Revoir le tuto</button>`
      : `<button class="btn primary" id="tuto">Commencer le tuto</button><button class="btn" id="go">${RENF?'Commencer sans tuto':INC?'Intervenir sans tuto':'Jouer directement'}</button>`;
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
        <div class="row">${tutoBtns(RENF?'Commencer':'Intervenir')}</div>
        <button class="btn small" id="later" style="align-self:center">Plus tard</button>
        ${(!touch && G.desktopHint)?`<p class="small">${G.desktopHint}</p>`:''}`);
    } else {
      const seg=Object.entries(G.diffs).map(([k,d])=>`<button data-k="${k}" aria-pressed="${k===st.diff}"><span class="ppl">${'<i></i>'.repeat(d.agents)}</span><b>${G.unit ? unite(d.agents) : ({difficile:'Sous-effectif',normal:'Effectif de base',facile:'Renforcé'})[k]}</b>${d.label}</button>`).join('');
      showCard(`
        ${hero((MODE==='train'?'Entraînement · ':'Ma ZP · ')+G.service)}
        <h2>${G.headline}</h2>
        ${G.story}
        <div class="lbl2">${effLabel()}</div>
        <div class="seg" id="seg">${seg}</div>
        <p class="small">${G.diffHint} ${G.unit ? `En vrai, l’équipe PJF compte 2 ${G.unit[1]}, +1 si une autre équipe est restée libre ce soir-là, +1 si ta Recherche est renforcée (−1 si elle est en sous-effectif).` : 'En vrai, le niveau dépend des agents du service dans tes ordres, comparés à la répartition de base.'}</p>
        <div class="row">${tutoBtns('Jouer')}</div>
        ${(!touch && G.desktopHint)?`<p class="small">${G.desktopHint}</p>`:''}
        <p class="demo">${MODE==='train'?'Entraînement : rien ne compte pour ta zone.':'Démo jouable, rien n\'est enregistré dans ta partie Ma ZP.'}</p>`);
      $('seg').onclick=e=>{const b=e.target.closest('button'); if(!b) return; st.diff=b.dataset.k; store.set('diff',st.diff);
        [...$('seg').children].forEach(x=>x.setAttribute('aria-pressed',x.dataset.k===st.diff));};
    }
    $('go').onclick=play; $('tuto').onclick=startTuto;
    if($('later')) $('later').onclick=()=>post('close');
  }
  function play(){
    if(INC){ if(fini) return; if(!joue){ joue=true; post('start'); } }
    hide(); hideCoach(); st.mode='play'; G.onPlay(G.diffs[st.diff]);
  }
  function startTuto(){ hide(); st.mode='tuto'; st.timerOn=false; G.onTuto(); }
  function endTuto(){
    st.tuto=true; store.set('tuto',true); hideCoach(); st.mode='menu'; st.timerOn=false; G.onMenu && G.onMenu();
    showCard(`${hero('Tutoriel terminé')}<h2>Les règles en bref</h2><ul>${G.rules.map(r=>`<li><span>${r}</span></li>`).join('')}</ul>
      <div class="row"><button class="btn primary" id="go">${INC?'Intervenir':'Lancer une partie'}</button><button class="btn" id="tomenu">${INC?'Plus tard':'Menu'}</button></div>`);
    $('go').onclick=play; $('tomenu').onclick=INC?()=>post('close'):menu;
  }
  function startTimer(sec,onTimeout){ st.timeLeft=sec; st.timeTotal=sec; st.timerOn=true; st.timerRate=1; st.onTimeout=onTimeout; }
  function stopTimer(){ st.timerOn=false; }
  function fmt(s){ s=Math.max(0,Math.ceil(s)); return s>=60? Math.floor(s/60)+':'+String(s%60).padStart(2,'0') : String(s); }

  function result({ok, stats, faults, malus, note, details}){
    st.timerOn=false; st.mode='result';
    let pts=0, skin=false;
    if(ok) pts=faults===0?2:1;
    if(INC){
      fini=true; post('result',{ok, fautes:faults, pts});
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
    const playing = st.mode==='play';
    $('timer').textContent = playing ? fmt(st.timeLeft) : '–';
    const frac = playing ? Math.max(0,st.timeLeft/st.timeTotal) : 1;
    $('ringval').style.strokeDashoffset = CIRC*(1-frac);
    $('ring').classList.toggle('warn', playing && st.timeLeft<10);
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
      const eb=document.querySelector('.top .eyebrow'); if(eb) eb.textContent=(RENF?'Appui PJF · ':INC?'Incident du jour · ':'Entraînement · ')+G.serviceShort;
      // Dans Ma ZP : le bouton du haut ferme le mini-jeu.
      const b=$('menuBtn'); b.innerHTML=ICONS.cross; b.setAttribute('aria-label','Fermer');
      b.onclick=()=>{ if(INC && joue && !fini && st.mode==='play'){ askQuit(); return; } if(MODE==='train' && st.mode!=='menu'){ menu(); return; } post('close'); };
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
  return {init, st, blip, good, bad, win, buzz, toast, shake, coach, hideCoach, endTuto, startTimer, stopTimer, result, menu, fmt};
})();
