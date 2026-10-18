/* Offres : sélection seulement. Le serveur d'aperçu ou la plateforme décide du prix du panier. */
(function () {
 'use strict';
 function init(root) {
  root.querySelectorAll('[data-purchase]').forEach(function (box) {
   if (box.dataset.ready) return; box.dataset.ready = 'true';
   var variants = JSON.parse(box.querySelector('[data-purchase-variants]').textContent), strings = JSON.parse(box.querySelector('[data-purchase-strings]').textContent);
   var radios = Array.from(box.querySelectorAll('.purchase__offers input[type=radio]')), selected = radios.find(function (r) { return r.checked; }) || radios[0], retained = [], area = box.querySelector('[data-offer-variants]'), button = box.querySelector('[data-purchase-add]'), error = box.querySelector('[data-purchase-error]');
   if (!selected) return;
   var scope=box.closest('[data-main-product],[data-featured-product]'),quick=scope?box.querySelector('[data-purchase-quick]'):null,quickAdd=quick&&quick.querySelector('[data-quick-add]'),busy=false;
   // Une présentation d'accueil ne crée pas une seconde barre fixe.
   function quickVisibility(){
    if(!quick)return;
    var rect=button.getBoundingClientRect(),footer=document.querySelector('.es-footer'),footerTop=footer?footer.getBoundingClientRect().top:Infinity;
    var editing=box.contains(document.activeElement)&&document.activeElement.matches('input,select,textarea'),overlay=document.querySelector('dialog[open],[data-cart-drawer].is-open')||document.body.classList.contains('menu-open');
    var focusedGallery=document.activeElement.closest('[data-gallery]'),errorRect=error.hidden?null:error.getBoundingClientRect();
    var scopeRect=scope.getBoundingClientRect(),outside=scope.hasAttribute('data-featured-product')&&(scopeRect.top>innerHeight*.45||scopeRect.bottom<0);
    quick.hidden=innerWidth>=750||outside||editing||!!focusedGallery||!!overlay||(rect.top<innerHeight&&rect.bottom>0)||!!(errorRect&&errorRect.top<innerHeight&&errorRect.bottom>0)||footerTop<innerHeight;
    document.body.classList.toggle('has-purchase-quick',innerWidth<750&&!outside);
   }
   if(quick){var queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;quickVisibility();});}
    ['scroll','resize','focusin','focusout'].forEach(function(name){window.addEventListener(name,schedule,{passive:true});});
    new MutationObserver(schedule).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open','class']});
    quick.querySelector('[data-quick-options]').addEventListener('click',function(e){e.preventDefault();var options=box.querySelector('.purchase__offers');options.focus({preventScroll:true});options.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});
   }
   var requestedVariant=new URLSearchParams(location.search).get('variant');if(variants.some(function(v){return String(v.id)===requestedVariant&&v.available;}))retained[0]=requestedVariant;
   var params=new URLSearchParams(location.search),requestedOffer=radios.find(function(r){return r.value===params.get('offer');}),requestedItems=(params.get('variants')||'').split(',');
   if(requestedOffer&&requestedItems.length===+requestedOffer.dataset.quantity&&requestedItems.every(function(id){return variants.some(function(v){return String(v.id)===id&&v.available;});})){selected=requestedOffer;retained=requestedItems;}
   function money(n) { return new Intl.NumberFormat(box.dataset.language || 'fr', { style: 'currency', currency: box.dataset.currency || 'EUR' }).format(n / 100); }
   function priceFor(r) {
    var count = +r.dataset.quantity, sum = 0;
    for (var i = 0; i < count; i++) { var v = variants.find(function (v) { return String(v.id) === retained[i]; }) || variants.find(function (v) { return v.available; }) || variants[0]; if (v.price == null) return null; sum += v.price; }
    var total = r.hasAttribute('data-fixed-total') ? +r.dataset.fixedTotal : Math.round(sum * (100 - +r.dataset.discount) / 100);
    if (!Number.isSafeInteger(total) || total < 0) return null;
    return { base: sum, total: total, count: count };
   }
   function update() {
    retained = Array.from(area.querySelectorAll('select')).map(function (s) { return s.value; });
    radios.forEach(function (r) { var p = priceFor(r), card = r.closest('label'); card.classList.toggle('is-selected', r === selected); card.querySelector('[data-offer-total]').textContent = p ? money(p.total) : strings.unavailable; card.querySelector('[data-offer-unit]').textContent = p ? money(Math.round(p.total / p.count)) + ' ' + strings.unit : ''; var save = card.querySelector('[data-offer-saving]'); save.hidden = !p || p.base <= p.total; save.textContent = p && p.base > p.total ? strings.save + ' ' + money(p.base - p.total) : ''; });
    var p = priceFor(selected); box.querySelector('[data-purchase-total]').textContent = p ? money(p.total) : strings.unavailable;
    var selection=selected.closest('label').querySelector('.purchase__offer-copy>strong').textContent+' · '+retained.map(function(id){var v=variants.find(function(v){return String(v.id)===id;});return v?v.title:'';}).join(' + ');
    box.querySelector('[data-purchase-price]').textContent=p?money(p.total):strings.unavailable;box.querySelector('[data-purchase-selection]').textContent=selection;
    var detail=scope&&scope.querySelector('[data-product-detail]');if(detail){var url=new URL(detail.href);url.searchParams.set('offer',selected.value);url.searchParams.set('variants',retained.join(','));url.searchParams.set('variant',retained[0]);detail.href=url.href;}
    var unit=scope&&scope.querySelector('[data-unit-price]'),first=variants.find(function(v){return String(v.id)===retained[0];});if(unit)unit.textContent=first&&first.price!=null?money(first.price):strings.unavailable;
    var counts = {}; retained.forEach(function(id) { counts[id] = (counts[id] || 0) + 1; });
    button.disabled = busy || !p || !retained.length || retained.some(function (id) { var v = variants.find(function (v) { return String(v.id) === id; }); return !v || !v.available || (v.inventory_management && v.inventory_quantity < counts[id]); });
    if(quick){quick.querySelector('[data-quick-total]').textContent=p?money(p.total):strings.unavailable;quick.querySelector('[data-quick-selection]').textContent=selection;quickAdd.disabled=button.disabled;quickVisibility();}
    box.querySelectorAll('[data-gift]').forEach(function (g) { var eligible = +selected.dataset.quantity >= +g.dataset.threshold, available = g.dataset.available === 'true' && (!g.dataset.stock || +g.dataset.stock >= +g.dataset.giftQuantity); g.classList.toggle('is-unlocked', eligible && available); g.querySelector('[data-gift-state]').textContent = !available ? strings.unavailable : eligible ? strings.included : strings.locked + ' ' + g.dataset.threshold + ' ' + strings.items; });
   }
   function announce() { var v = variants.find(function(v){return String(v.id)===retained[0];}); box.dispatchEvent(new CustomEvent('es:offer-variant',{bubbles:true,detail:v})); box.querySelectorAll('[data-finish-id]').forEach(function(r){r.checked=r.value===retained[0];}); }
   var finishes=box.querySelector('[data-purchase-finishes]'),colorNode=box.querySelector('[data-purchase-colors]'),colors={};
   if(colorNode) String(JSON.parse(colorNode.textContent)||'').split(/\n/).forEach(function(line){var cut=line.lastIndexOf('=');if(cut>0&&/^#[0-9a-f]{6}$/i.test(line.slice(cut+1).trim()))colors[line.slice(0,cut).trim()]=line.slice(cut+1).trim();});
   if(finishes)finishes.className='purchase__finish-options';
   if(finishes) variants.forEach(function(v){var label=document.createElement('label'),input=document.createElement('input'),dot=document.createElement('i'),text=document.createElement('span');label.className='purchase__finish';dot.className='purchase__swatch';input.type='radio';input.name='finish-'+radios[0].name;input.value=v.id;input.dataset.finishId=v.id;input.disabled=!v.available;dot.setAttribute('aria-hidden','true');if(colors[v.title])dot.style.backgroundColor=colors[v.title];text.textContent=v.title;label.append(input,dot,text);finishes.append(label);input.addEventListener('change',function(){retained=Array.from(area.querySelectorAll('select')).map(function(s){return s.value;});retained[0]=String(v.id);choose();announce();});});
   function choose() {
    area.replaceChildren(); selected.checked = true;
    for (var i = 0; i < +selected.dataset.quantity; i++) {
     var label = document.createElement('label'), select = document.createElement('select'), span = document.createElement('span'); span.textContent = (i + 1) + ' / ' + selected.dataset.quantity; label.append(span, select);
     variants.forEach(function (v) { var option = document.createElement('option'); option.value = v.id; option.textContent = v.title + (!v.available ? ' — ' + strings.unavailable : ''); option.disabled = !v.available; select.append(option); });
     select.value = retained[i] || String((variants.find(function (v) { return v.available; }) || variants[0]).id); select.addEventListener('change', function(){update();announce();}); area.append(label);
    }
    update();announce();
   }
   radios.forEach(function (r) { r.addEventListener('change', function () { selected = r; choose(); }); }); choose();
   function add() {
    if(busy||button.disabled)return;
    error.hidden = true; busy=true;update(); button.setAttribute('aria-busy', 'true');if(quickAdd)quickAdd.setAttribute('aria-busy','true');
    var nativeItems = []; retained.forEach(function (id) { var line = nativeItems.find(function (item) { return item.id === +id; }); if (line) line.quantity++; else nativeItems.push({ id: +id, quantity: 1 }); });
    var payload = box.dataset.preview === 'true' ? { offer: selected.value, target: box.dataset.target, variants: retained.map(Number) } : { items: nativeItems };
    fetch(box.dataset.addUrl + '.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) }).then(function (r) { return r.json().then(function (data) { if (!r.ok) throw new Error(data.description || data.error || strings.unavailable); return data; }); }).then(function () { window.location.assign(box.dataset.cartUrl); }).catch(function (e) { error.textContent = e.message; error.hidden = false;error.tabIndex=-1;error.focus(); }).finally(function () { busy=false;button.removeAttribute('aria-busy');if(quickAdd)quickAdd.removeAttribute('aria-busy'); update(); });
   }
   button.addEventListener('click',add);if(quickAdd)quickAdd.addEventListener('click',add);
  });
 }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); }); else init(document);
 document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();
