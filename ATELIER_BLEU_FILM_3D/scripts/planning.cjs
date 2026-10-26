// Planning du film : place chaque phrase de la voix off dans le temps (durées réelles lues dans narration/phrases.json)
// en laissant avant chaque phrase le temps des transitions et des plans de lecture. Écrit montage/timeline.json,
// que la scène 3D, la musique, les bruitages et le mixage lisent tous : changer la voix suffit à recaler tout le film.
//   node scripts/planning.cjs
const fs = require("fs"), path = require("path");
const P = path.resolve(__dirname, "..");
const voix = JSON.parse(fs.readFileSync(path.join(P, "narration/phrases.json"), "utf8"));

// Temps (s) laissé AVANT chaque phrase, et ce qui s'y passe à l'image.
const AVANT = {
  p01: [1.0, "le rouleau géant entre dans le cadre"],
  p02: [2.2, "la surface se plie en façade, l'enseigne ATELIER BLEU s'allume"],
  p03: [0.5, "les morceaux dispersés (site, visuels, communication)"],
  p04: [1.4, "la façade s'ouvre, la caméra entre ; l'écran du studio se pose"],
  p05: [2.5, "lecture du formulaire rempli, puis traversée de la lettre B"],
  p06: [3.6, "composition Logo / Couleurs / Typographie, résultat sur l'enseigne et les documents, le bâtiment se déplie"],
  p07: [2.0, "fin de lecture du site, plongée dans la photo de la réalisation"],
  p08: [2.6, "composition d'ensemble des trois supports, puis l'écran de modification"],
  p09: [3.4, "le support se met à jour (résultat tenu), sortie du bâtiment"],
  p10: [0.5, ""],
  p11: [0.5, ""],
  p12: [1.0, "les volumes s'alignent autour du nom"],
  p13: [0.4, ""],
};
const FIN = 2.6; // tenue du plan final et résolution de la musique

let t = 0;
const phrases = {};
for (const ph of voix.phrases) {
  const [avant, image] = AVANT[ph.id];
  t += avant;
  const mots = {};
  for (const [m, v] of Object.entries(ph.reperes || {})) if (!m.startsWith("_")) mots[m] = +(t + v).toFixed(3);
  phrases[ph.id] = { debut: +t.toFixed(3), fin: +(t + ph.duree).toFixed(3), texte: ph.texte, fichier: ph.fichier, mots, avant: image };
  t += ph.duree;
}
const duree = +(t + FIN).toFixed(3);
const out = { source_voix: voix.source, duree, ips: 30, phrases };
fs.writeFileSync(path.join(P, "montage/timeline.json"), JSON.stringify(out, null, 2));
for (const [id, p] of Object.entries(phrases)) console.log(id, p.debut.toFixed(2).padStart(6), "→", p.fin.toFixed(2).padStart(6), " ", p.texte);
console.log("durée du film :", duree, "s");
