/**
 * Outils injectés UNIQUEMENT dans l'aperçu du studio (jamais dans l'export) :
 * bandeau d'aperçu, désignation d'un élément, conservation du défilement.
 */
export const PREVIEW_TOOLS = `
<style id="es-preview-style">
  .es-pv-bar{position:fixed;left:12px;bottom:12px;z-index:2147483000;font:500 12px/1.3 system-ui,sans-serif;background:rgba(20,18,16,.86);color:#fff;padding:7px 11px;border-radius:999px;backdrop-filter:blur(8px);pointer-events:none}
  .es-pv-hover{outline:2px dashed #2F5BEA!important;outline-offset:-2px!important;cursor:crosshair!important}
  .es-pv-picked{outline:3px solid #2F5BEA!important;outline-offset:-3px!important}
  .es-pv-label{position:fixed;z-index:2147483001;background:#2F5BEA;color:#fff;font:600 11px system-ui,sans-serif;padding:3px 8px;border-radius:6px;pointer-events:none}
</style>
<div class="es-pv-bar" aria-hidden="true">Aperçu · données de démonstration de la boutique · paiement désactivé</div>
<script>
(function(){
  var picking=false, hovered=null, label=null;
  var SEL='a,button,img,video,h1,h2,h3,h4,h5,p,li,summary,label,[data-es-block],[data-es-section]';
  function kind(tag){ return /^(a|button|summary)$/.test(tag)?'Bouton':/^h[1-5]$/.test(tag)?'Titre':/^(img|video)$/.test(tag)?'Image':/^(p|li|label)$/.test(tag)?'Texte':'Bloc'; }
  function post(m){ try{ parent.postMessage(Object.assign({source:'es-preview'},m),'*'); }catch(e){} }
  function info(el){
    var sec=el.closest('[data-es-section]'); if(!sec) return null;
    var parts=sec.getAttribute('data-es-section').split(':'); var id=parts.pop(); var tpl=parts.join(':');
    var blk=el.closest('[data-es-block]');
    var txt=(el.innerText||el.alt||'').trim().slice(0,200);
    var tag=el.tagName.toLowerCase(); var whole=el===sec;
    return {template: tpl, section:id, block: !whole && blk && sec.contains(blk) ? blk.getAttribute('data-es-block') : undefined, text: whole?undefined:txt, tag: whole?undefined:tag, kind: whole?'Section':kind(tag), type: sec.getAttribute('data-es-type')};
  }
  function clearHover(){ if(hovered){ hovered.classList.remove('es-pv-hover'); hovered=null; } if(label){ label.remove(); label=null; } }
  document.addEventListener('mouseover', function(e){
    if(!picking) return; var t=e.target.closest(SEL); if(!t) return;
    clearHover(); hovered=t; t.classList.add('es-pv-hover');
    var i=info(t); if(!i) return; label=document.createElement('div'); label.className='es-pv-label'; label.textContent=i.kind+(i.text?' · '+i.text.slice(0,32):'');
    var r=t.getBoundingClientRect(); label.style.left=Math.max(4,r.left)+'px'; label.style.top=Math.max(4,r.top-24)+'px'; document.body.appendChild(label);
  }, true);
  document.addEventListener('click', function(e){
    if(!picking) return; e.preventDefault(); e.stopPropagation();
    var t=hovered||(e.target.closest&&e.target.closest(SEL))||e.target; var i=info(t); if(!i) return;
    document.querySelectorAll('.es-pv-picked').forEach(function(x){x.classList.remove('es-pv-picked')});
    t.classList.add('es-pv-picked'); clearHover(); picking=false; post({type:'selected', selection:i});
  }, true);
  document.addEventListener('submit', function(e){
    var f=e.target; var sub=e.submitter;
    if(sub && sub.name==='checkout'){ e.preventDefault(); alert('Aperçu : le paiement est géré par Shopify sur la boutique réelle.'); }
    if(f && /contact|account/.test(f.getAttribute('action')||'')){ e.preventDefault(); alert('Aperçu : les formulaires sont traités par Shopify sur la boutique réelle.'); }
  }, true);
  document.addEventListener('keydown', function(e){ if(picking && e.key==='Escape'){ picking=false; clearHover(); post({type:'pick-cancel'}); } });
  window.addEventListener('message', function(e){
    var d=e.data||{}; if(d.source!=='es-studio') return;
    if(d.type==='pick'){ picking=!!d.on; if(!picking) clearHover(); }
    if(d.type==='unpick'){ document.querySelectorAll('.es-pv-picked').forEach(function(x){x.classList.remove('es-pv-picked')}); }
    if(d.type==='scroll'){ window.scrollTo(0, d.y||0); }
    if(d.type==='reveal-all'){ document.querySelectorAll('[data-reveal]').forEach(function(x){x.classList.add('is-in')}); }
  });
  var last=0; window.addEventListener('scroll', function(){ var n=Date.now(); if(n-last>250){ last=n; post({type:'scroll', y: window.scrollY}); } }, {passive:true});
  post({type:'ready'});
  window.addEventListener('load', function(){ post({type:'loaded', path: location.pathname, title: document.title}); });
})();
</script>`;
