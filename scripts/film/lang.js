// Langue des textes incrustés : ?lang=en remplace chaque texte par sa version anglaise (attribut data-en)
// et, quand elles existent, les images de démonstration par leur version .en (liste window.EN_ASSETS,
// injectée par le script de rendu). Sans paramètre, la page reste strictement en français.
window.LANG = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "fr";
window.tr = (fr, en) => (window.LANG === "en" ? en : fr);
window.applyLang = () => {
  if (window.LANG !== "en") return;
  document.documentElement.lang = "en";
  for (const el of document.querySelectorAll("[data-en]")) el.innerHTML = el.dataset.en;
  const en = new Set(window.EN_ASSETS || []);
  for (const img of document.images) {
    const m = (img.getAttribute("src") || "").match(/^(.*\/public\/demo\/)(.+)\.(\w+)$/);
    if (m && en.has(`${m[2]}.en.${m[3]}`)) img.src = `${m[1]}${m[2]}.en.${m[3]}`;
  }
};
