/* Chapitres natifs <details> : clavier et contenu restent utilisables sans JavaScript. */
(function () {
 function init(root) { root.querySelectorAll('[data-narrative]').forEach(function (box) {
  if (box.dataset.ready) return; box.dataset.ready = 'true';
  var chapters = Array.from(box.querySelectorAll('[data-narrative-chapter]'));
  chapters.forEach(function (chapter) { chapter.addEventListener('toggle', function () {
   if (!chapter.open) return;
   chapters.forEach(function (other) { if (other !== chapter) other.open = false; });
   box.querySelectorAll('[data-narrative-image]').forEach(function (image) { image.hidden = image.dataset.narrativeImage !== chapter.dataset.narrativeChapter; });
  }); });
 }); }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); }); else init(document);
 document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();
