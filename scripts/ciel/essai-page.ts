/**
 * Page d'essai du ciel, hors du Studio : la même constellation (même moteur, mêmes styles) sur trois projets inventés,
 * pour l'essayer sur de vrais téléphones avant toute fusion. Montée par `scripts/ciel/essai.mts`. Aucun appel à l'IA.
 */
import { formeDe, formeUnique, type Forme } from "@/lib/ciel/forme";
import { ETAT_LIBELLE, placesDuCiel, soleilDe, type EtatEtoile } from "@/lib/ciel/vue";
import { monterCiel, type Astre, type Ciel } from "@/components/studio/ciel/moteur";

const ETAPES = ["Faire connaissance", "La marque", "Les angles", "L'activité", "Le site", "La mise en ligne", "La communication", "La publicité", "Dans la durée"];
const PROMESSES = [
  "SINA apprend à connaître ton projet, avec tes mots.", "Ton nom, ton logo, tes couleurs : ton image de marque complète.", "Trois façons de donner envie à tes clients. Tu choisis.",
  "Tes produits ou tes prestations, tes prix, tes coordonnées.", "Ton site, conçu pour ta marque.", "Ton site publié, à ton adresse.", "Tes publications, prêtes et programmées.",
  "Tes campagnes préparées, prêtes à lancer.", "SINA suit ton projet avec toi et propose des améliorations.",
];
type Projet = { id: string; nom: string; palette: string[] | null; etats: EtatEtoile[]; sina: number | null; phrase: string | null; direct: boolean; compte: string; fiche?: [string, string][]; marque?: { nom: string; slogan: string }; angle?: { titre: string; promesse: string } };
const e = (faites: number, suivante?: EtatEtoile): EtatEtoile[] => ETAPES.map((_, i) => (i < faites ? "fait" : i === faites && suivante ? suivante : "avenir"));
const PROJETS: Record<string, Projet> = {
  jour: { id: "essai-coaching", nom: "Mon projet de coaching", palette: null, etats: e(0, "cours"), sina: 0, phrase: "On avance ensemble sur « Faire connaissance »", direct: true, compte: "Étape 1 sur 9",
    fiche: [["Ce que tu proposes", "Des séances de coaching pour reprendre le sport après 50 ans"]] },
  chantier: { id: "essai-menuiserie", nom: "Copeau", palette: ["#D9A066", "#7A4A22", "#2B1D12", "#FBE7CF"], etats: e(2, "avis"), sina: 2, phrase: "« Les angles » attend ton avis", direct: true, compte: "Étape 3 sur 9",
    fiche: [["Ce que tu proposes", "Escaliers, bibliothèques et cuisines en bois massif, sur mesure"], ["Tes clients", "Des familles qui rénovent une maison ancienne"], ["Ta zone", "Quarante kilomètres autour de l'atelier"]],
    marque: { nom: "Copeau", slogan: "Le bois qui restera dans la famille." } },
  livre: { id: "essai-fleurs", nom: "Les Séchées de Margaux", palette: ["#9DB08A", "#4E5B3C", "#C98F5A", "#E8EFD9"], etats: e(9), sina: 6, phrase: "Je prépare ta publication de demain", direct: false, compte: "Toutes tes étoiles sont allumées",
    fiche: [["Ce que tu proposes", "Des bouquets de fleurs séchées, faits à la main"], ["Tes clientes", "Celles qui veulent des fleurs qui durent"]],
    marque: { nom: "Les Séchées de Margaux", slogan: "Le bouquet qui sera encore là au printemps." }, angle: { titre: "Le bouquet du mariage, gardé pour toujours", promesse: "Les fleurs du grand jour, encore là dans dix ans." } },
};
// Chaque forme est comparée aux précédentes, comme dans le Studio.
const FORMES: Record<string, Forme> = {};
{ const faites: Forme[] = []; for (const p of Object.values(PROJETS)) { FORMES[p.id] = formeUnique(p.id, faites).forme; faites.push(FORMES[p.id]); } }

const h = (html: string) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const scene = document.getElementById("scene")!, lu = document.getElementById("qualite-lue")!;
let moment = "livre", qualite: "auto" | "pleine" | "allegee" = "auto", ciel: Ciel | null = null;

function monter() {
  ciel?.detruire();
  const p = PROJETS[moment], autres = Object.values(PROJETS).filter((o) => o.id !== p.id), places = placesDuCiel(autres.map((o) => o.id));
  const libelle = (i: number) => (p.sina === i && p.etats[i] !== "avis" ? "SINA y travaille" : ETAT_LIBELLE[p.etats[i]].fr);
  scene.innerHTML = "";
  const racine = h(`<section class="ciel" data-ciel aria-label="La constellation de ${esc(p.nom)}">
    <canvas aria-hidden="true"></canvas>
    <header class="ciel-titre"><p>${p.direct ? "<i aria-hidden='true'></i>Ton projet, en direct" : "Ton projet"}</p><h2>${esc(p.nom)}</h2><p class="ciel-compte">${p.compte}</p></header>
    <ol class="ciel-etoiles" aria-label="Les étapes de ton projet">${ETAPES.map((nom, i) => `<li><button type="button" class="ciel-etoile" data-etoile="${i + 1}" data-etat="${p.etats[i]}" ${p.sina === i ? 'data-ici=""' : ""} aria-expanded="false"><span><b>${nom}</b><small>${libelle(i)}</small></span></button></li>`).join("")}</ol>
    <div class="ciel-astres">
      <button type="button" class="ciel-astre" data-astre="${p.id}" data-type="moi"><span>${esc(p.nom)}<small>Mon projet</small></span></button>
      <button type="button" class="ciel-astre" data-astre="nouveau" data-type="nouveau"><span>Nouveau projet<small>Clique pour l'allumer</small></span></button>
      ${autres.map((o) => `<button type="button" class="ciel-astre" data-astre="${o.id}" data-type="mien" data-aller="${Object.keys(PROJETS).find((k) => PROJETS[k] === o)}"><span>${esc(o.nom)}<small>Mon projet</small></span></button>`).join("")}
    </div>
    ${p.phrase ? `<p class="ciel-dit"><em>Sina</em><span>${esc(p.phrase)}</span></p>` : ""}
    <div class="ciel-vue" role="group" aria-label="Vue du ciel">
      <button type="button" data-v="+" aria-label="Zoomer">+</button><button type="button" data-v="-" aria-label="Dézoomer">−</button>
      <button type="button" data-pivot data-v="g" aria-label="Pivoter vers la gauche">↺</button><button type="button" data-pivot data-v="d" aria-label="Pivoter vers la droite">↻</button>
      <button type="button" class="ciel-vue-t" data-v="moi">Mon projet</button><button type="button" class="ciel-vue-t" data-v="tout">Tout mon ciel</button>
    </div>
    <p class="ciel-aide" aria-hidden="true"><span class="ciel-aide-o">Glisse pour te promener, molette pour zoomer, Maj et glisser pour pivoter</span><span class="ciel-aide-t">Glisse pour te promener, pince pour zoomer et pivoter</span></p>
    <aside class="ciel-volet" data-volet hidden></aside>
  </section>`);
  scene.append(racine);
  const astres: Astre[] = [
    { id: p.id, type: "moi", x: 0, y: 0, couleurs: soleilDe(p.palette), forme: FORMES[p.id], etats: p.etats },
    { id: "nouveau", type: "nouveau", x: 640, y: -330, couleurs: null, forme: formeDe("nouveau projet"), etats: [] },
    ...autres.map((o): Astre => ({ id: o.id, type: "mien", ...places[o.id], couleurs: soleilDe(o.palette), forme: FORMES[o.id], etats: o.etats })),
  ];
  const c = monterCiel(racine, { astres, sina: p.sina }, { leger: qualite === "auto" ? "auto" : qualite === "allegee", surLeger: () => { lu.textContent = "Version allégée"; } });
  ciel = c;
  lu.textContent = c.leger ? "Version allégée" : "Version complète";
  const volet = racine.querySelector<HTMLElement>("[data-volet]")!;
  const fermer = () => { volet.hidden = true; racine.querySelectorAll("[data-etoile]").forEach((b) => b.setAttribute("aria-expanded", "false")); c.ouvrir(null); };
  const ouvrir = (i: number) => {
    const etat = p.etats[i], rien = etat === "avenir";
    const blocs = rien ? "" : i === 0 && p.fiche ? `<div class="ciel-bloc"><p class="ciel-bloc-t">Ce que tu as dit à SINA</p><dl>${p.fiche.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join("")}</dl></div>`
      : i === 1 && p.marque ? `<div class="ciel-bloc ciel-marque"><div><p class="ciel-mot">${esc(p.marque.nom)}</p><p>${esc(p.marque.slogan)}</p><div class="ciel-nuancier">${(p.palette ?? []).map((k) => `<i style="background:${k}"></i>`).join("")}</div></div></div>`
      : i === 2 && p.angle ? `<div class="ciel-bloc"><p class="ciel-bloc-t">L'angle que tu as choisi</p><p class="ciel-mot">${esc(p.angle.titre)}</p><p>${esc(p.angle.promesse)}</p></div>` : "";
    volet.innerHTML = `<button type="button" class="ciel-fermer">✕ Retour au ciel</button><p class="ciel-etat" data-etat="${etat}">${libelle(i)}</p><h3>${ETAPES[i]}</h3>${blocs || `<p class="ciel-promesse">${PROMESSES[i]}</p>`}${!rien && i > 0 && i < 8 ? `<p class="ciel-note">Dans le Studio, un bouton ouvre ici l'espace qui va avec cette étoile.</p>` : ""}`;
    volet.hidden = false; volet.querySelector<HTMLElement>(".ciel-fermer")!.addEventListener("click", fermer);
    racine.querySelectorAll("[data-etoile]").forEach((b, j) => b.setAttribute("aria-expanded", String(j === i)));
    c.ouvrir(i);
  };
  racine.querySelectorAll<HTMLElement>("[data-etoile]").forEach((b, i) => b.addEventListener("click", () => (b.getAttribute("aria-expanded") === "true" ? fermer() : ouvrir(i))));
  racine.querySelectorAll<HTMLElement>("[data-v]").forEach((b) => b.addEventListener("click", () => { const v = b.dataset.v!; if (v === "+") c.zoom(1.4); else if (v === "-") c.zoom(1 / 1.4); else if (v === "g") c.tourner(-Math.PI / 8); else if (v === "d") c.tourner(Math.PI / 8); else { fermer(); c.cadrer(v as "moi" | "tout"); } }));
  racine.querySelector<HTMLElement>('[data-type="moi"]')!.addEventListener("click", () => c.cadrer("moi"));
  racine.querySelectorAll<HTMLElement>("[data-aller]").forEach((b) => b.addEventListener("click", () => choisir("moment", b.dataset.aller!)));
  racine.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !volet.hidden) fermer(); });
}
function choisir(groupe: string, valeur: string) {
  if (groupe === "moment") moment = valeur; else qualite = valeur as typeof qualite;
  document.querySelectorAll<HTMLElement>(`[data-groupe="${groupe}"] button`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.valeur === valeur)));
  monter();
}
document.querySelectorAll<HTMLElement>("[data-groupe] button").forEach((b) => b.addEventListener("click", () => choisir(b.parentElement!.dataset.groupe!, b.dataset.valeur!)));
monter();
