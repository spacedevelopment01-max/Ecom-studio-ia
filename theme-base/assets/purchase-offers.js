/* Offres : sélection seulement. Le serveur d'aperçu ou la plateforme décide du prix du panier. */
(function () {
 'use strict';
 function init(root) {
  root.querySelectorAll('[data-purchase]').forEach(function (box) {
   if (box.dataset.ready) return; box.dataset.ready = 'true';
   var variants = JSON.parse(box.querySelector('[data-purchase-variants]').textContent), strings = JSON.parse(box.querySelector('[data-purchase-strings]').textContent);
   var radios = Array.from(box.querySelectorAll('input[type=radio]')), selected = radios.find(function (r) { return r.checked; }) || radios[0], retained = [], area = box.querySelector('[data-offer-variants]'), button = box.querySelector('[data-purchase-add]'), error = box.querySelector('[data-purchase-error]');
   if (!selected) return;
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
    var counts = {}; retained.forEach(function(id) { counts[id] = (counts[id] || 0) + 1; });
    button.disabled = !p || !retained.length || retained.some(function (id) { var v = variants.find(function (v) { return String(v.id) === id; }); return !v || !v.available || (v.inventory_management && v.inventory_quantity < counts[id]); });
    box.querySelectorAll('[data-gift]').forEach(function (g) { var eligible = +selected.dataset.quantity >= +g.dataset.threshold, available = g.dataset.available === 'true' && (!g.dataset.stock || +g.dataset.stock >= +g.dataset.giftQuantity); g.classList.toggle('is-unlocked', eligible && available); g.querySelector('[data-gift-state]').textContent = !available ? strings.unavailable : eligible ? strings.included : strings.locked + ' ' + g.dataset.threshold + ' ' + strings.items; });
   }
   function choose() {
    area.replaceChildren(); selected.checked = true;
    for (var i = 0; i < +selected.dataset.quantity; i++) {
     var label = document.createElement('label'), select = document.createElement('select'), span = document.createElement('span'); span.textContent = (i + 1) + ' / ' + selected.dataset.quantity; label.append(span, select);
     variants.forEach(function (v) { var option = document.createElement('option'); option.value = v.id; option.textContent = v.title + (!v.available ? ' — ' + strings.unavailable : ''); option.disabled = !v.available; select.append(option); });
     select.value = retained[i] || String((variants.find(function (v) { return v.available; }) || variants[0]).id); select.addEventListener('change', update); area.append(label);
    }
    update();
   }
   radios.forEach(function (r) { r.addEventListener('change', function () { selected = r; choose(); }); }); choose();
   button.addEventListener('click', function () {
    error.hidden = true; button.disabled = true; button.setAttribute('aria-busy', 'true');
    var nativeItems = []; retained.forEach(function (id) { var line = nativeItems.find(function (item) { return item.id === +id; }); if (line) line.quantity++; else nativeItems.push({ id: +id, quantity: 1 }); });
    var payload = box.dataset.preview === 'true' ? { offer: selected.value, target: box.dataset.target, variants: retained.map(Number) } : { items: nativeItems };
    fetch(box.dataset.addUrl + '.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) }).then(function (r) { return r.json().then(function (data) { if (!r.ok) throw new Error(data.description || data.error || strings.unavailable); return data; }); }).then(function () { window.location.assign(box.dataset.cartUrl); }).catch(function (e) { error.textContent = e.message; error.hidden = false; }).finally(function () { button.removeAttribute('aria-busy'); update(); });
   });
  });
 }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); }); else init(document);
 document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();
