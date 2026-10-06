/**
 * Intro animée (écran d'ouverture) E-COM STUDIO IA : copie exacte de ecom-studio-ia-intro-site.html, fourni tel quel
 * (ne pas réécrire ; un test vérifie que les deux sont identiques). Insérée par <IntroSplash /> juste après <body>.
 */
export const INTRO_HTML = String.raw`<!-- ===== Intro ECOM STUDIO IA : à coller juste après <body> ===== -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@300;800&family=Manrope:wght@500;600&display=swap" rel="stylesheet">
<style>
#ecs-splash{position:fixed;inset:0;z-index:2147483000;overflow:hidden;color:#fff;font-family:Manrope,system-ui,-apple-system,'Segoe UI',sans-serif;
  background:radial-gradient(ellipse 90vmax 70vmax at 50% 50%,#0B2148 0%,#06142B 55%,#030b1a 100%);
  transition:opacity .6s ease,transform .7s cubic-bezier(.7,0,.3,1),filter .6s}
#ecs-splash.ecs-out{opacity:0;transform:scale(1.06);filter:blur(10px);pointer-events:none}
#ecs-splash *{box-sizing:border-box}
#ecs-splash .ecs-aur{position:absolute;border-radius:50%;filter:blur(90px);opacity:.5;mix-blend-mode:screen;pointer-events:none}
#ecs-splash .ecs-a1{width:70vmax;height:70vmax;left:-25vmax;top:-30vmax;background:#1747a6}
#ecs-splash .ecs-a2{width:60vmax;height:60vmax;right:-25vmax;bottom:-25vmax;background:#0b7d8f}
#ecs-splash canvas{position:absolute;inset:0;width:100%;height:100%}
#ecs-splash .ecs-it{position:absolute;left:0;top:0;will-change:transform,opacity;
  transition:transform .5s cubic-bezier(.75,0,.95,.35),opacity .5s ease-in,filter .5s}
#ecs-splash .ecs-pop{opacity:0;filter:blur(6px);transition:opacity .3s,filter .5s}
#ecs-splash .ecs-pop.ecs-in{opacity:1;transform:none;filter:none}
#ecs-splash .ecs-tile{width:clamp(48px,7vmin,92px);height:clamp(48px,7vmin,92px);border-radius:28%;display:flex;align-items:center;justify-content:center;position:relative;
  box-shadow:0 12px 30px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.35)}
#ecs-splash .ecs-tile::after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(160deg,rgba(255,255,255,.3),rgba(255,255,255,0) 45%)}
#ecs-splash .ecs-tile svg{width:46%;height:46%;position:relative;z-index:1}
#ecs-splash .ecs-pill{font-weight:600;font-size:clamp(12px,2vmin,22px);padding:.7em 1.2em;border-radius:999px;white-space:nowrap;color:#eef5ff;
  background:rgba(160,200,255,.08);border:1.5px solid rgba(170,205,255,.22)}
#ecs-splash .ecs-pill i{display:inline-block;width:.5em;height:.5em;border-radius:50%;margin-right:.55em;vertical-align:.1em}
#ecs-splash .ecs-core{position:absolute;left:50%;top:50%;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;background:#fff;
  box-shadow:0 0 50px 24px rgba(110,180,255,.85),0 0 120px 50px rgba(51,225,217,.4);opacity:0;transform:scale(0);transition:opacity .3s,transform .5s cubic-bezier(.7,0,.9,.4)}
#ecs-splash .ecs-core.ecs-in{opacity:1;transform:scale(1.4)}
#ecs-splash .ecs-core.ecs-gone{opacity:0;transform:scale(6);transition:opacity .2s,transform .2s}
#ecs-splash .ecs-flash{position:absolute;inset:0;opacity:0;pointer-events:none;background:radial-gradient(circle at 50% 50%,#fff 0%,rgba(160,210,255,.85) 15%,rgba(40,100,220,0) 55%)}
#ecs-splash .ecs-flash.ecs-in{animation:ecsFlash .9s ease-out}
@keyframes ecsFlash{0%{opacity:0}8%{opacity:1}100%{opacity:0}}
#ecs-splash .ecs-wave{position:absolute;left:50%;top:50%;width:14vmin;height:14vmin;margin:-7vmin 0 0 -7vmin;border-radius:50%;opacity:0;pointer-events:none;
  border:2px solid rgba(255,255,255,.9);box-shadow:0 0 30px rgba(77,163,255,.9),inset 0 0 30px rgba(51,225,217,.6)}
#ecs-splash .ecs-wave.ecs-in{animation:ecsWave 1.1s cubic-bezier(.1,.7,.2,1)}
@keyframes ecsWave{0%{opacity:1;transform:scale(.1)}100%{opacity:0;transform:scale(14)}}
#ecs-splash .ecs-hero{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 5vw;pointer-events:none}
#ecs-splash .ecs-mark{width:clamp(56px,10vmin,120px);height:auto;opacity:0;transform:scale(.3) rotate(-90deg);transition:opacity .4s,transform .8s cubic-bezier(.2,1.4,.4,1)}
#ecs-splash.ecs-show .ecs-mark{opacity:1;transform:none}
#ecs-splash .ecs-ttl{font-family:Unbounded,system-ui,sans-serif;font-weight:800;font-size:clamp(30px,7.2vw,112px);line-height:1.08;letter-spacing:.015em;
  margin:.4em 0 .3em;display:flex;flex-wrap:wrap;justify-content:center}
#ecs-splash .ecs-ttl span{display:inline-block;opacity:0;transform:translateY(.4em) scale(1.4);filter:blur(14px);text-shadow:0 0 30px rgba(90,170,255,.55);
  transition:opacity .45s,transform .7s cubic-bezier(.2,1.2,.4,1),filter .5s}
#ecs-splash .ecs-ttl .ecs-sp{width:.36em}
#ecs-splash .ecs-ttl .ecs-ia{background:linear-gradient(120deg,#FFD27A,#33E1D9);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none}
#ecs-splash.ecs-show .ecs-ttl span{opacity:1;transform:none;filter:none;transition-delay:calc(var(--i) * .028s)}
#ecs-splash .ecs-sub{font-weight:500;font-size:clamp(14px,2.6vw,36px);color:#cfe1fb;opacity:0;transform:translateY(12px);transition:opacity .5s .5s,transform .6s .5s}
#ecs-splash.ecs-show .ecs-sub{opacity:1;transform:none}
#ecs-splash .ecs-line{width:0;height:2px;margin-top:1.4em;border-radius:2px;background:linear-gradient(90deg,transparent,#33E1D9,#4DA3FF,#FFD27A,transparent);transition:width .8s .7s}
#ecs-splash.ecs-show .ecs-line{width:min(60vw,560px)}
#ecs-splash .ecs-skip{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));font:600 14px Manrope,system-ui,sans-serif;
  color:#cfe1fb;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:9px 16px;cursor:pointer}
#ecs-splash .ecs-skip:focus-visible{outline:2px solid #33E1D9;outline-offset:2px}
@media not all and (orientation:portrait) and (max-width:600px){#ecs-splash .ecs-tile{width:clamp(64px,10.5vmin,130px);height:clamp(64px,10.5vmin,130px)}#ecs-splash .ecs-pill{font-size:clamp(15px,2.6vmin,28px)}}
#ecs-splash .ecs-rays{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity .6s}
#ecs-splash .ecs-rays line{stroke:rgba(140,200,255,.35);stroke-width:1.5;stroke-dasharray:4 10}
#ecs-splash .ecs-rays.ecs-in{opacity:1}
#ecs-splash .ecs-rays.ecs-gone{opacity:0;transition:opacity .3s}
@media (orientation:portrait) and (max-width:600px){#ecs-splash .ecs-tile{width:clamp(50px,13vw,68px);height:clamp(50px,13vw,68px)}#ecs-splash .ecs-pill{font-size:clamp(13px,3.6vw,16px)}#ecs-splash .ecs-sub{font-size:clamp(16px,4.6vw,22px);max-width:20em}#ecs-splash .ecs-skip{font-size:13px}}
@media (orientation:portrait){#ecs-splash .ecs-ttl{font-size:clamp(30px,10.5vw,96px)}#ecs-splash .ecs-ttl .ecs-br{flex-basis:100%;height:0}#ecs-splash .ecs-ttl .ecs-ia{font-size:1.3em}}
@media (orientation:landscape){#ecs-splash .ecs-ttl .ecs-br{width:.36em}}
</style>
<div id="ecs-splash" aria-label="ECOM STUDIO IA, la plateforme tout-en-un du e-commerce">
  <div class="ecs-aur ecs-a1"></div><div class="ecs-aur ecs-a2"></div>
  <canvas></canvas>
  <svg class="ecs-rays" aria-hidden="true"></svg>
  <div class="ecs-items"></div>
  <div class="ecs-core"></div><div class="ecs-wave"></div><div class="ecs-flash"></div>
  <div class="ecs-hero">
    <svg class="ecs-mark" viewBox="0 0 100 100" aria-hidden="true">
      <defs><linearGradient id="ecs-mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#33E1D9"/><stop offset=".55" stop-color="#4DA3FF"/><stop offset="1" stop-color="#FFD27A"/></linearGradient></defs>
      <path d="M50 4 89.8 27v46L50 96 10.2 73V27z" fill="rgba(77,163,255,.12)" stroke="url(#ecs-mg)" stroke-width="4" stroke-linejoin="round"/>
      <path d="M50 24l5.6 16.2L72 46l-16.4 5.8L50 68l-5.6-16.2L28 46l16.4-5.8z" fill="url(#ecs-mg)"/>
      <circle cx="70" cy="28" r="4" fill="#FFD27A"/>
    </svg>
    <div class="ecs-ttl" role="heading" aria-level="1"></div>
    <div class="ecs-sub">La plateforme tout-en-un du e-commerce</div>
    <div class="ecs-line"></div>
  </div>
  <button class="ecs-skip" type="button">Passer</button>
</div>
<script>
(function(){
  var S=document.getElementById('ecs-splash');if(!S)return;
  /* Mettre ONCE à false pour rejouer l'intro à chaque visite */
  var ONCE=true;
  try{if(ONCE&&sessionStorage.getItem('ecsSeen')){S.remove();return}}catch(e){}
  var html=document.documentElement,prevOverflow=html.style.overflow;html.style.overflow='hidden';
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timers=[],done=false,raf;
  function later(ms,fn){timers.push(setTimeout(fn,ms))}
  function finish(){if(done)return;done=true;timers.forEach(clearTimeout);S.classList.add('ecs-out');
    try{sessionStorage.setItem('ecsSeen','1')}catch(e){}
    setTimeout(function(){cancelAnimationFrame(raf);html.style.overflow=prevOverflow;S.remove()},750)}
  S.querySelector('.ecs-skip').addEventListener('click',finish);
  document.addEventListener('keydown',function k(e){if(e.key==='Escape'){finish();document.removeEventListener('keydown',k)}});

  /* titre */
  var T='ECOM STUDIO IA',ttl=S.querySelector('.ecs-ttl'),h='';
  for(var i=0;i<T.length;i++){var c=T[i];
    if(c===' ')h+=i===11?'<span class="ecs-br"></span>':'<span class="ecs-sp" style="--i:'+i+'"></span>';
    else h+='<span class="'+(i>=12?'ecs-ia':'')+'" style="--i:'+i+'" aria-hidden="true">'+c+'</span>'}
  ttl.innerHTML=h;ttl.setAttribute('aria-label',T);

  if(reduce){S.classList.add('ecs-show');later(1600,finish);return}

  /* éléments */
  var ico={
    spark:'<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2l2.2 6.3L21 10l-6.8 1.7L12 18l-2.2-6.3L3 10l6.8-1.7z"/></svg>',
    hex:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z"/><circle cx="12" cy="12" r="3.2"/></svg>',
    bag:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/></svg>',
    img:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m3 16 5-5 4 4 3-3 6 6"/></svg>',
    doc:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
    grid:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12"/></svg>',
    seo:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5"/></svg>',
    pen:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><path d="M4 20h4L19.5 8.5l-4-4L4 16z"/></svg>'};
  var G=['#4DA3FF,#1d4fd8','#33E1D9,#1677c9','#FFD27A,#e39a2f','#6fd0ff,#2a62e8','#2ad4b0,#0e7c9c','#8cc2ff,#3557d6','#3ee6c3,#1b8fd9','#5ab8ff,#14408f'];
  var items=[['t','spark'],['p','Shopify','#7fd36a'],['t','hex'],['p','Canva','#33e1d9'],['t','bag'],['p','TikTok','#fff'],['t','img'],['p','WooCommerce','#8cc2ff'],
             ['t','doc'],['p','Instagram','#FFD27A'],['t','grid'],['p','CapCut','#d9ecff'],['t','seo'],['p','Facebook','#4DA3FF'],['t','pen'],['p','PrestaShop','#33e1d9']];
  var box=S.querySelector('.ecs-items'),els=[],W=innerWidth,H=innerHeight,n=items.length,ti=0;
  /* points répartis sur un rectangle arrondi, près des bords */
  var ph=W<H&&W<=600,pts=[];
  var pills=items.filter(function(i){return i[0]==='p'}),tiles=items.filter(function(i){return i[0]==='t'});
  if(!ph){
    /* ordinateur : étoile à 8 branches (icônes sur les pointes, pastilles dans les creux) */
    var rays=S.querySelector('.ecs-rays');rays.setAttribute('viewBox','0 0 '+W+' '+H);var rh='';
    for(var k=0;k<16;k++){var outer=k%2===0,a=-Math.PI/2+k*Math.PI/8,
      rx=W*(outer?.41:.26),ry=H*(outer?.39:.25),px=W/2+Math.cos(a)*rx,py=H/2+Math.sin(a)*ry;
      pts.push({x:px,y:py,ord:k,item:outer?tiles[k/2]:pills[(k-1)/2]});
      if(outer)rh+='<line x1="'+W/2+'" y1="'+H/2+'" x2="'+px+'" y2="'+py+'"/>'}
    rays.innerHTML=rh;
  }else{
    /* téléphone : cadre le long des bords */
    var L=W*.17,R=W*.83,Tp=H*.12,B=H*.88,ew=R-L,eh=B-Tp,per=2*(ew+eh);
    for(var k=0;k<n;k++){var d=(k+.5)/n*per,x,y,edge;
      if(d<ew){x=L+d;y=Tp;edge='h'}else if(d<ew+eh){x=R;y=Tp+(d-ew);edge='v'}
      else if(d<2*ew+eh){x=R-(d-ew-eh);y=B;edge='h'}else{x=L;y=B-(d-2*ew-eh);edge='v'}
      pts.push({x:x,y:y,long:(edge==='h')===(ew>=eh),ord:k})}
    pts.sort(function(a,b){return (b.long-a.long)||(a.ord-b.ord)});
    pts.forEach(function(p,k){p.item=k<pills.length?pills[k]:tiles[k-pills.length]});
    pts.sort(function(a,b){return a.ord-b.ord});
  }
  var far=Math.max(W,H)*.75;
  pts.forEach(function(pt){
    var it=pt.item||tiles.pop()||pills.pop(),wrap=document.createElement('div');wrap.className='ecs-it';
    wrap.innerHTML=it[0]==='t'?'<div class="ecs-pop ecs-tile" style="background:linear-gradient(140deg,'+G[ti++%G.length]+')">'+ico[it[1]]+'</div>'
                              :'<div class="ecs-pop ecs-pill"><i style="background:'+it[2]+'"></i>'+it[1]+'</div>';
    box.appendChild(wrap);
    var w=wrap.firstChild.offsetWidth,h=wrap.firstChild.offsetHeight;
    var x=Math.max(12,Math.min(W-w-12,pt.x-w/2)),y=Math.max(12,Math.min(H-h-12,pt.y-h/2));
    var vx=pt.x-W/2,vy=pt.y-H/2,vl=Math.hypot(vx,vy)||1,rot=(Math.random()<.5?-1:1)*(18+Math.random()*20);
    wrap._end='translate('+x+'px,'+y+'px)';
    wrap.style.transition='none';
    wrap.style.transform='translate('+(x+vx/vl*far)+'px,'+(y+vy/vl*far)+'px) rotate('+rot+'deg)';
    els.push(wrap)});
  box.offsetWidth;

  /* particules */
  var cv=S.querySelector('canvas'),cx=cv.getContext('2d'),dpr=Math.min(2,devicePixelRatio||1);
  cv.width=W*dpr;cv.height=H*dpr;cx.scale(dpr,dpr);
  var COLS=['#4DA3FF','#33E1D9','#ffffff','#9fd0ff','#FFD27A'],P=[],phase='drift',N=Math.round(Math.min(160,W*H/9000));
  for(var j=0;j<N;j++)P.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,r:Math.random()*1.8+.4,c:COLS[j%5],a:Math.random(),tw:Math.random()*6,ta:1});
  function frame(t){cx.clearRect(0,0,W,H);cx.globalCompositeOperation='lighter';
    for(var q=0;q<P.length;q++){var p=P[q];
      if(phase==='gather'){var dx=W/2-p.x,dy=H/2-p.y,d=Math.hypot(dx,dy)+1;p.vx+=dx/d*1.4;p.vy+=dy/d*1.4;p.vx*=.92;p.vy*=.92;p.ta=d<30?0:1}
      else{var dm=phase==='burst'?.95:.99;p.vx*=dm;p.vy*=dm;p.ta=1}
      p.x+=p.vx;p.y+=p.vy;p.a+=(p.ta-p.a)*.1;
      var al=p.a*(.55+.45*Math.sin(t/600+p.tw));
      cx.globalAlpha=al*.18;cx.fillStyle=p.c;cx.beginPath();cx.arc(p.x,p.y,p.r*4,0,7);cx.fill();
      cx.globalAlpha=al;cx.beginPath();cx.arc(p.x,p.y,p.r,0,7);cx.fill()}
    cx.globalAlpha=1;raf=requestAnimationFrame(frame)}
  raf=requestAnimationFrame(frame);

  /* timeline (≈ 4 s) */
  later(200,function(){S.querySelector('.ecs-rays').classList.add('ecs-in')});
  els.forEach(function(el,k){later(80+k*70,function(){
    el.style.transition='transform .75s cubic-bezier(.16,1,.3,1)';el.style.transform=el._end;el.firstChild.classList.add('ecs-in')})});
  later(1850,function(){var ry=S.querySelector('.ecs-rays');ry.classList.remove('ecs-in');ry.classList.add('ecs-gone');phase='gather';els.forEach(function(el){
    el.style.transition='transform .5s cubic-bezier(.75,0,.95,.35) '+(Math.random()*.1)+'s,opacity .5s ease-in,filter .5s';
    el.style.transform='translate('+(W/2)+'px,'+(H/2)+'px) scale(.04)';el.style.opacity='0';el.style.filter='blur(4px)'})});
  later(2050,function(){S.querySelector('.ecs-core').classList.add('ecs-in')});
  later(2400,function(){var c=S.querySelector('.ecs-core');c.classList.remove('ecs-in');c.classList.add('ecs-gone');
    S.querySelector('.ecs-flash').classList.add('ecs-in');S.querySelector('.ecs-wave').classList.add('ecs-in');
    P.forEach(function(p){var a=Math.random()*6.283,s=2+Math.random()*16;p.x=W/2;p.y=H/2;p.vx=Math.cos(a)*s;p.vy=Math.sin(a)*s;p.a=1});phase='burst';
    S.classList.add('ecs-show')});
  later(4100,finish);
})();
</script>
<!-- ===== fin de l'intro ===== -->
`;
