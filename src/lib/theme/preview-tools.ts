/**
 * Outils injectés UNIQUEMENT dans l'aperçu du studio (jamais dans l'export) :
 * bandeau d'aperçu, désignation d'un élément, conservation du défilement.
 * Textes dans la langue de l'interface du studio.
 */
import { pick, type Lang } from "../i18n";

export const previewTools = (lang: Lang, business: "products" | "services" = "products") => {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  return `
<style id="es-preview-style">
  .es-pv-bar{position:fixed;left:12px;bottom:12px;z-index:2147483000;font:500 12px/1.3 system-ui,sans-serif;background:rgba(20,18,16,.86);color:#fff;padding:7px 11px;border-radius:999px;backdrop-filter:blur(8px);pointer-events:none}
  .es-pv-hover{outline:2px dashed #2F5BEA!important;outline-offset:-2px!important;cursor:crosshair!important}
  .es-pv-picked{outline:3px solid #2F5BEA!important;outline-offset:-3px!important}
  .es-pv-focus{outline:3px solid #2F5BEA!important;outline-offset:-3px!important;transition:outline-color .6s}
  .es-pv-focus-out{outline-color:transparent!important}
  .es-pv-label{position:fixed;z-index:2147483001;background:#2F5BEA;color:#fff;font:600 11px system-ui,sans-serif;padding:3px 8px;border-radius:6px;pointer-events:none}
</style>
<div class="es-pv-bar" aria-hidden="true">${business === "services" ? t("Aperçu du site · formulaires et réservations désactivés", "Website preview · forms and booking disabled") : t("Aperçu · données de démonstration de la boutique · paiement désactivé", "Preview · store demo data · checkout disabled")}</div>
<script>
(function(){
  var picking=false, hovered=null, label=null;
  var SEL='img,video,.es-placeholder,a,button,h1,h2,h3,h4,h5,p,li,summary,label,[data-es-block],[data-es-section]';
  function kind(tag){ return /^(a|button|summary)$/.test(tag)?'${t("Bouton", "Button")}':/^h[1-5]$/.test(tag)?'${t("Titre", "Heading")}':/^(img|video)$/.test(tag)?'Image':/^(p|li|label)$/.test(tag)?'${t("Texte", "Text")}':'${t("Bloc", "Block")}'; }
  function role(tag){ return /^(a|button|summary)$/.test(tag)?'button':/^h[1-5]$/.test(tag)?'heading':/^(p|li|label)$/.test(tag)?'text':'other'; }
  /* Adresse précise de l'élément dans sa section (balises et rangs) : seul lui reçoit un style. */
  function pathOf(el, sec){ var segs=[]; var n=el; while(n && n!==sec){ var p=n.parentElement; if(!p) return ''; segs.unshift(n.tagName.toLowerCase()+':nth-child('+(Array.prototype.indexOf.call(p.children,n)+1)+')'); n=p; } return n===sec && segs.length<=25 ? segs.join(' > ') : ''; }
  function post(m){ try{ parent.postMessage(Object.assign({source:'es-preview'},m),'*'); }catch(e){} }
  function info(el){
    var sec=el.closest('[data-es-section]'); if(!sec) return null;
    var parts=sec.getAttribute('data-es-section').split(':'); var id=parts.pop(); var tpl=parts.join(':');
    var blk=el.closest('[data-es-block]');
    var txt=(el.innerText||el.alt||'').trim().slice(0,200);
    var tag=el.tagName.toLowerCase(); var whole=el===sec;
    var media=/^(img|video)$/.test(tag)||(el.classList&&el.classList.contains('es-placeholder'));
    var src=!whole&&media?(tag==='video'?(el.currentSrc||el.getAttribute('src')||(el.querySelector('source')&&el.querySelector('source').getAttribute('src'))||el.getAttribute('poster')||''):(el.currentSrc||el.getAttribute('src')||'')):'';
    return {template: tpl, section:id, src: src?String(src).slice(0,600):undefined, block: !whole && blk && sec.contains(blk) ? blk.getAttribute('data-es-block') : undefined, text: whole?undefined:txt, tag: whole?undefined:tag, kind: whole?'Section':(media?'Image':kind(tag)), type: sec.getAttribute('data-es-type'), path: whole?undefined:pathOf(el, sec), role: whole?undefined:role(tag)};
  }
  /* Image recouverte (dégradé, calque de texte) : sous le pointeur, l'image passe avant le conteneur. */
  function pick(e){ var t=e.target.closest&&e.target.closest(SEL); if(t && t.matches('[data-es-block],[data-es-section]') && document.elementsFromPoint){ var st=document.elementsFromPoint(e.clientX,e.clientY); for(var k=0;k<st.length;k++){ var m=st[k]; if(m.matches&&m.matches('img,video,.es-placeholder')&&t.contains(m)) return m; if(m===t) break; } } return t; }
  function clearHover(){ if(hovered){ hovered.classList.remove('es-pv-hover'); hovered=null; } if(label){ label.remove(); label=null; } }
  document.addEventListener('mouseover', function(e){
    if(!picking) return; var t=pick(e); if(!t) return;
    clearHover(); hovered=t; t.classList.add('es-pv-hover');
    var i=info(t); if(!i) return; label=document.createElement('div'); label.className='es-pv-label'; label.textContent=i.kind+(i.text?' · '+i.text.slice(0,32):'');
    var r=t.getBoundingClientRect(); label.style.left=Math.max(4,r.left)+'px'; label.style.top=Math.max(4,r.top-24)+'px'; document.body.appendChild(label);
  }, true);
  document.addEventListener('click', function(e){
    if(!picking) return; e.preventDefault(); e.stopPropagation();
    var t=hovered||pick(e)||e.target; var i=info(t); if(!i) return;
    document.querySelectorAll('.es-pv-picked').forEach(function(x){x.classList.remove('es-pv-picked')});
    t.classList.add('es-pv-picked'); clearHover(); picking=false; post({type:'selected', selection:i});
  }, true);
  document.addEventListener('submit', function(e){
    var f=e.target; var sub=e.submitter;
    if(sub && sub.name==='checkout'){ e.preventDefault(); alert(${JSON.stringify(t("Aperçu : le paiement est géré par Shopify sur la boutique réelle.", "Preview: checkout is handled by Shopify on the live store."))}); }
    if(f && /contact|account/.test(f.getAttribute('action')||'')){ e.preventDefault(); alert(${JSON.stringify(t("Aperçu : les formulaires sont traités par Shopify sur la boutique réelle.", "Preview: forms are processed by Shopify on the live store."))}); }
  }, true);
  document.addEventListener('keydown', function(e){ if(picking && e.key==='Escape'){ picking=false; clearHover(); post({type:'pick-cancel'}); } });
  window.addEventListener('message', function(e){
    var d=e.data||{}; if(d.source!=='es-studio') return;
    if(d.type==='pick'){ picking=!!d.on; if(!picking) clearHover(); }
    if(d.type==='unpick'){ document.querySelectorAll('.es-pv-picked').forEach(function(x){x.classList.remove('es-pv-picked')}); }
    if(d.type==='scroll'){ window.scrollTo(0, d.y||0); }
    if(d.type==='reveal-all'){ document.querySelectorAll('[data-reveal]').forEach(function(x){x.classList.add('is-in')}); }
    if(d.type==='replay'){ replay(); }
    if(d.type==='focus'){ focusSection(String(d.section||'')); }
  });
  /* Section choisie dans la structure du studio : défilement jusqu'à elle et surlignage bref. */
  var focusTimer=0;
  function focusSection(id){
    var el=null; document.querySelectorAll('[data-es-section]').forEach(function(x){ var v=x.getAttribute('data-es-section')||''; if(!el && v.slice(v.lastIndexOf(':')+1)===id) el=x; });
    if(!el){ post({type:'focus-missing', section:id}); return; }
    el.querySelectorAll('[data-reveal]').forEach(function(x){x.classList.add('is-in')});
    var hdr=document.querySelector('.shopify-section-group-header-group, header'); var off=(hdr && getComputedStyle(hdr).position!=='static' && hdr.getBoundingClientRect().height<200) ? hdr.getBoundingClientRect().height : 0;
    if(el.closest('.shopify-section-group-header-group')) off=0;
    window.scrollTo({top:Math.max(0, el.getBoundingClientRect().top+window.scrollY-off), behavior:'smooth'});
    document.querySelectorAll('.es-pv-focus').forEach(function(x){x.classList.remove('es-pv-focus','es-pv-focus-out')});
    el.classList.add('es-pv-focus'); clearTimeout(focusTimer);
    focusTimer=setTimeout(function(){ el.classList.add('es-pv-focus-out'); setTimeout(function(){ el.classList.remove('es-pv-focus','es-pv-focus-out'); },700); },1800);
  }
  /* Rejoue les apparitions : retour en haut, éléments masqués, puis défilement lent de toute la page. */
  var replaying=0;
  function replay(){
    cancelAnimationFrame(replaying);
    var items=[].slice.call(document.querySelectorAll('[data-reveal]'));
    items.forEach(function(x){x.classList.remove('is-in')});
    document.documentElement.classList.add('motion-ready');
    window.scrollTo({top:0,behavior:'instant'});
    var io=new IntersectionObserver(function(es){es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } })},{rootMargin:'0px 0px -8% 0px',threshold:0.08});
    items.forEach(function(x){io.observe(x)});
    var max=document.documentElement.scrollHeight-innerHeight; if(max<=0) return;
    var dur=Math.min(16000, Math.max(5000, max*2.2)), t0=0;
    function step(t){ if(!t0) t0=t+600; var k=Math.min(1, Math.max(0,(t-t0)/dur)); window.scrollTo({top:max*(k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2),behavior:'instant'}); if(k<1) replaying=requestAnimationFrame(step); else post({type:'replay-done'}); }
    replaying=requestAnimationFrame(step);
  }
  ['wheel','touchstart','keydown'].forEach(function(ev){ window.addEventListener(ev, function(){ cancelAnimationFrame(replaying); }, {passive:true}); });
  var last=0; window.addEventListener('scroll', function(){ var n=Date.now(); if(n-last>250){ last=n; post({type:'scroll', y: window.scrollY}); } }, {passive:true});
  post({type:'ready'});
  window.addEventListener('load', function(){ post({type:'loaded', path: location.pathname, title: document.title}); });
})();
</script>`;
};

/** Outils de l'aperçu en français (compatibilité). */
export const PREVIEW_TOOLS = previewTools("fr");
