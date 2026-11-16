/**
 * Thème unique du Studio (lot 4, référence partie 15) — module « metiers » : ses pièces nouvelles (METIERS_SECTIONS) et les
 * façons de bâtir ajoutées à des pièces d'autres modules (METIERS_FACONS : identifiant de la pièce → ses constructions,
 * la première étant le rendu d'origine). Feuille : public/sections/tenue-metiers.css. Règles : docs/sina-savoir/sections-a-tenue.md.
 *
 * Les six styles de page de services s'appuient sur ces pièces : la fiche d'un bien immobilier (galerie, caractéristiques,
 * étiquettes énergie, quartier, demande de visite), la liste et la recherche de biens, la carte d'un restaurant et la
 * réservation de table, le rendez-vous en trois temps (prestation, intervenant, créneau), l'inscription à un atelier.
 *
 * Vraies données, posées par le Studio (custom-theme/tenue-data.ts ; les lignes d'exemple gardent exactement cette forme) :
 *  - data-tn-biens (racine) : les cartes <a class="tn-bien"> de <div class="tn-cartes-b"> ; avec la valeur « filtres »,
 *    chaque carte porte aussi son projet, son type, sa ville et son prix (filtre immédiat de tenue-metiers.js), et les
 *    listes data-tn-biens-types et data-tn-biens-villes reçoivent les types et les villes réellement présents.
 *  - data-tn-bien="galerie|caracteristiques|energie|quartier|visite" (racine) : le bien de la fiche (celui mis en avant,
 *    sinon le premier bien publié) ; data-tn-biens-choix (<select>) : les biens que l'on peut visiter.
 *  - data-tn-carte (racine) : les rubriques <article class="tn-rubrique"> de <div class="tn-rubriques">, un <li> par plat.
 *  - data-tn-prestations-options, data-tn-equipe-options : les choix du rendez-vous en trois temps.
 *  - data-tn-horaires, data-tn-adresse, data-tn-tel : comme partout (réservation de table).
 * Rien n'est inventé : sans bien, sans carte ou sans équipe, la pièce garde ses lignes d'exemple, annoncées « À compléter ».
 */
import { ph, sec, type Construction, type TenueSection } from "./tenue-base";

/** Lien d'exemple : il ne mène nulle part tant que le Studio n'a pas posé sa page. */
const LIEN = `href="#" onclick="return false"`;
/** Carte d'un bien : photo et statut, type et ville, titre, surface et pièces, prix. */
const BIEN = (photo: string, statut: string, type: string, titre: string) => `<a class="tn-bien" ${LIEN} data-go="bien"><div class="tn-ph tn-cadre" ${ph(photo)}><i>${statut}</i></div><small>${type} · [À compléter : ville]</small><b>${titre}</b><span>[À compléter : surface, pièces, chambres]</span><em>[À compléter : prix]</em></a>`;
const BIENS = `${BIEN("im-maison.jpg", "À vendre", "Maison", "Maison avec jardin")}${BIEN("im-salon.jpg", "À vendre", "Appartement", "Appartement traversant")}${BIEN("im-1.jpg", "À louer", "Maison", "Maison de village")}`;
/** Plat d'une carte : nom, description, prix, allergènes. */
const PLAT = (nom: string, texte: string) => `<li><b>${nom}</b><span>${texte}</span><em>[À compléter : prix]</em><small>Allergènes : [À compléter]</small></li>`;
/** Choix d'un groupe (bouton radio caché, étiquette dessinée). */
const CHOIX = (name: string, value: string, label: string, on = false) => `<label><input type="radio" name="${name}" value="${value}"${on ? " checked" : ""}><span>${label}</span></label>`;
/** Les sept lettres d'une étiquette énergie. */
const LETTRES = ["A", "B", "C", "D", "E", "F", "G"].map((l) => `<li data-l="${l}"><span>${l}</span></li>`).join("");
const ETIQUETTE = (cls: string, titre: string, sous: string, bas: string, haut: string) => `<figure class="tn-etiquette ${cls}"><figcaption><b>${titre}</b><small>${sous}</small></figcaption><div class="tn-barreaux"><i>${bas}</i><ol>${LETTRES}</ol><i>${haut}</i></div><p class="tn-classe">Classe : <strong>non communiquée</strong></p></figure>`;

export const METIERS_SECTIONS: TenueSection[] = [
  // ---------------------------------------------------------------- immobilier
  sec({
    id: "tn-biens", title: "Les biens à vendre et à louer", kind: "Biens · accueil et page des biens", role: "immobilier", pour: "services", only: "agences immobilières",
    authentic: "tes biens",
    does: "Les biens de l'agence en cartes : la photo, le statut (à vendre, à louer, vendu, loué), le type et la ville, la surface, les pièces, le prix ou le loyer. Chaque carte mène à la fiche du bien. Les biens sont ceux que le client a saisis dans sa rubrique Biens, publiés par lui : jamais un bien, une photo ni un prix inventés ; un bien vendu garde sa mention et perd son prix. Sans bien publié, la pièce ne se pose pas. Exemple : une agence immobilière.",
    data: "les biens publiés de la rubrique Biens (photo, type, ville, surface, pièces, prix ou loyer, statut)",
    constructions: [
      { key: "grille", label: "une grille de cartes : la photo dans le cadre de la marque, le statut dessus, le prix sous le titre (trois par ligne sur ordinateur)" },
      { key: "liste", label: "une liste éditoriale : une ligne par bien, la photo à gauche, le titre en grand, le prix aligné à droite" },
      { key: "vedette", label: "un bien vedette en très grand, sa fiche posée sur le bas de la photo, les autres en petites cartes dessous" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 3, hauteur: 1100 },
    html: `<section class="tn tn-biens" data-tn-biens><h2>Nos biens<br>du moment.</h2><p>Visités, mesurés et photographiés par l'agence. Poussez la porte de celui qui vous ressemble.</p><div class="tn-cartes-b">${BIENS}</div><a class="tn-suite" ${LIEN} data-go="biens">Voir tous les biens</a></section>`,
  }),
  sec({
    id: "tn-recherche-biens", title: "Chercher un bien", kind: "Recherche · accueil et page des biens", role: "immobilier", pour: "services", only: "agences immobilières",
    authentic: "tes biens",
    does: "Le visiteur dit ce qu'il cherche (acheter ou louer, le type de bien, la ville, son budget) et la liste des biens se resserre aussitôt, avec le nombre de biens trouvés. Les types et les villes proposés sont ceux des biens réellement publiés. Sans script (dans la boutique en ligne), tous les biens restent listés et le formulaire envoie la recherche à l'agence, qui rappelle. Biens du client seulement, jamais inventés. Exemple : une agence immobilière.",
    data: "les biens publiés de la rubrique Biens, leurs types, leurs villes et leurs prix (filtres)",
    anim: "La liste se resserre dès qu'un filtre change.",
    constructions: [
      { key: "barre", label: "les filtres en barre au-dessus des biens (sur une ligne sur ordinateur), puis les biens en grille" },
      { key: "volet", label: "les filtres dans un volet de couleur douce (à gauche sur ordinateur), les biens en lignes à côté" },
    ],
    trait: { fond: "clair", densite: "dense", photos: 3, hauteur: 1500 },
    html: `<section class="tn tn-recherche-biens" data-tn-biens="filtres"><h2>Trouvez<br>votre adresse.</h2><p>Dites-nous ce que vous cherchez : la liste se resserre.</p><form class="tn-filtres-b" onsubmit="return false"><div class="tn-moment" role="radiogroup" aria-label="Votre projet"><span>Votre projet</span>${CHOIX("projet", "vente", "Acheter", true)}${CHOIX("projet", "location", "Louer")}</div><label class="tn-choix"><span>Type de bien</span><select name="type" data-tn-biens-types><option value="">Tous les types</option><option value="maison">Maison</option><option value="appartement">Appartement</option></select></label><label class="tn-choix"><span>Ville</span><select name="ville" data-tn-biens-villes><option value="">Toutes les villes</option></select></label><label><span>Budget maximum, en euros</span><input type="number" name="budget" min="0" step="1000" inputmode="numeric"></label><button type="submit" class="tn-bt">Chercher</button></form><p class="tn-trouves" aria-live="polite">Tous les biens de l'agence</p><div class="tn-cartes-b">${BIENS}</div><p class="tn-aucun" hidden>Aucun bien ne correspond pour l'instant. Élargissez la recherche, ou confiez-la à l'agence : elle vous prévient dès qu'un bien arrive.</p></section>`,
  }),
  sec({
    id: "tn-bien-galerie", title: "Fiche d'un bien : galerie et prix", kind: "Fiche d'un bien · haut de la fiche", role: "immobilier", pour: "services", only: "agences immobilières",
    authentic: "tes biens",
    does: "Le haut de la fiche d'un bien : son type, sa ville, son titre, son prix ou son loyer, sa référence, ses photos, ses trois chiffres clés (surface, pièces, chambres) et le bouton de visite. Tout vient du bien saisi par le client dans sa rubrique Biens (celui qu'il a mis en avant, sinon le premier publié) : photos, prix et surfaces ne sont jamais inventés. À poser en premier sur la page d'un bien, suivie des caractéristiques, des étiquettes énergie, du quartier et de la demande de visite. Exemple : une agence immobilière.",
    data: "le bien de la fiche : photos, type, ville, titre, prix ou loyer, référence, surface, pièces, chambres",
    constructions: [
      { key: "mosaique", label: "une mosaïque : la première photo en grand, les autres en carreaux à côté ; le titre et le prix au-dessus" },
      { key: "defile", label: "les photos en hauteur qui défilent du doigt, le titre et le prix dessous" },
      { key: "affiche", label: "une seule grande photo en pleine largeur, la fiche (titre, prix, chiffres) posée à cheval dessus, les autres photos en vignettes" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 5, hauteur: 980 },
    html: `<section class="tn tn-bien-galerie" data-tn-bien="galerie"><div class="tn-haut-b"><small class="tn-sur">Maison · [À compléter : ville, quartier]</small><h1>Maison avec jardin.</h1><em class="tn-prix-bien">[À compléter : prix]</em><span class="tn-ref">Référence : [À compléter]</span></div><div class="tn-photos"><div class="tn-ph" ${ph("im-maison.jpg")}></div><div class="tn-ph" ${ph("im-salon.jpg")}></div><div class="tn-ph" ${ph("im-cuisine.jpg")}></div><div class="tn-ph" ${ph("im-chambre.jpg")}></div><div class="tn-ph" ${ph("im-2.jpg")}></div></div><ul class="tn-cles"><li><b>[À compléter]</b><small>Surface</small></li><li><b>[À compléter]</b><small>Pièces</small></li><li><b>[À compléter]</b><small>Chambres</small></li></ul><a class="tn-bt" ${LIEN} data-go="visite">Demander une visite</a></section>`,
  }),
  sec({
    id: "tn-bien-caracteristiques", title: "Fiche d'un bien : caractéristiques", kind: "Fiche d'un bien · sous la galerie", role: "immobilier", pour: "services", only: "agences immobilières",
    authentic: "tes biens",
    does: "La description du bien et toutes ses caractéristiques, ligne par ligne : surface, terrain, pièces, chambres, étage, extérieurs, disponibilité, charges, honoraires, taxe foncière, puis ses atouts. Seules les lignes que le client a renseignées s'affichent : une valeur absente ne s'invente pas et sa ligne s'en va. Exemple : une agence immobilière.",
    data: "le bien de la fiche : description, surface, terrain, pièces, chambres, étage, extérieurs, disponibilité, charges, honoraires, taxe foncière, atouts",
    constructions: [
      { key: "lignes", label: "la description, puis un tableau à traits fins : le nom à gauche, la valeur à droite (côte à côte sur ordinateur)" },
      { key: "chiffres", label: "les caractéristiques en carreaux de couleur douce, la valeur en grand, puis la description et les atouts" },
    ],
    trait: { fond: "clair", densite: "dense", photos: 0, hauteur: 820 },
    html: `<section class="tn tn-bien-caracteristiques" data-tn-bien="caracteristiques"><h2>Le bien en détail.</h2><p class="tn-descr">[À compléter : la description du bien]</p><dl class="tn-carac"><div><dt>Surface habitable</dt><dd>[À compléter]</dd></div><div><dt>Terrain</dt><dd>[À compléter]</dd></div><div><dt>Pièces</dt><dd>[À compléter]</dd></div><div><dt>Chambres</dt><dd>[À compléter]</dd></div><div><dt>Extérieurs</dt><dd>[À compléter]</dd></div><div><dt>Disponibilité</dt><dd>[À compléter]</dd></div><div><dt>Honoraires</dt><dd>[À compléter]</dd></div><div><dt>Taxe foncière</dt><dd>[À compléter]</dd></div></dl><ul class="tn-atouts-b"><li>[À compléter : un atout du bien]</li><li>[À compléter : un atout du bien]</li></ul></section>`,
  }),
  sec({
    id: "tn-bien-energie", title: "Fiche d'un bien : étiquettes énergie", kind: "Fiche d'un bien · diagnostic", role: "immobilier", pour: "services", only: "agences immobilières",
    authentic: "tes biens",
    does: "Les deux étiquettes du diagnostic du bien, dessinées comme sur le diagnostic : la consommation d'énergie (DPE) et les émissions de gaz à effet de serre (GES), de A à G, la classe du bien mise en avant. La classe vient du diagnostic saisi par le client ; absente, l'étiquette dit « non communiquée » et aucune lettre n'est mise en avant, jamais une classe supposée. Une classe F ou G ajoute la mention due dans une annonce. Les couleurs des lettres sont celles du diagnostic, pas celles de la marque. Exemple : une agence immobilière.",
    data: "le bien de la fiche : classe énergie (DPE) et classe climat (GES) du diagnostic",
    constructions: [
      { key: "echelles", label: "deux échelles en escalier, de A à G, la classe du bien sortie en grand avec sa flèche (côte à côte sur ordinateur)" },
      { key: "reglettes", label: "deux réglettes horizontales de sept cases, la case du bien agrandie, la classe écrite en grand à côté" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 860 },
    html: `<section class="tn tn-bien-energie" data-tn-bien="energie"><h2>Énergie et climat.</h2><p>Les deux étiquettes du diagnostic, telles que le diagnostiqueur les a établies.</p><div class="tn-etiquettes">${ETIQUETTE("tn-dpe", "Consommation d'énergie", "Diagnostic de performance énergétique", "Logement économe", "Logement énergivore")}${ETIQUETTE("tn-ges", "Émissions de gaz à effet de serre", "Indice d'émission de gaz à effet de serre", "Peu d'émissions", "Émissions très importantes")}</div><p class="tn-note">Date du diagnostic : [À compléter]<br>Dépenses annuelles d'énergie estimées : [À compléter]</p></section>`,
  }),
  sec({
    id: "tn-bien-quartier", title: "Fiche d'un bien : le quartier", kind: "Fiche d'un bien · autour du bien", role: "immobilier", pour: "services", only: "agences immobilières",
    authentic: "tes biens",
    does: "Ce que l'on vit autour du bien : quelques phrases sur le quartier, une photo du quartier, et les repères du quotidien (école, commerces, transports) avec leur distance. Le texte, la photo et les repères sont ceux que le client a saisis pour ce bien : une distance ne s'invente jamais, un repère sans valeur s'en va. Jamais un plan dessiné. Exemple : une agence immobilière.",
    data: "le bien de la fiche : texte du quartier, photo du quartier, repères et distances",
    constructions: [
      { key: "photo", label: "la photo du quartier dans le cadre de la marque, puis le texte et les repères en lignes (côte à côte sur ordinateur)" },
      { key: "reperes", label: "les repères en très grand, l'un sous l'autre, leur distance à droite ; le texte et la photo en bande ensuite" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 760 },
    html: `<section class="tn tn-bien-quartier" data-tn-bien="quartier"><h2>La vie du quartier.</h2><p class="tn-texte-q">[À compléter : le quartier en quelques phrases]</p><div class="tn-ph tn-cadre" ${ph("im-quartier.jpg")}></div><ul class="tn-reperes-q"><li><b>École</b><span>[À compléter : distance]</span></li><li><b>Commerces</b><span>[À compléter : distance]</span></li><li><b>Transports</b><span>[À compléter : distance]</span></li></ul></section>`,
  }),
  sec({
    id: "tn-bien-visite", title: "Fiche d'un bien : demander une visite", kind: "Fiche d'un bien · bas de la fiche et page visite", role: "immobilier", pour: "services", only: "agences immobilières",
    authentic: "tes biens",
    does: "Un vrai formulaire, sans script, pour demander à visiter un bien : le bien (liste des biens que l'on peut visiter), le jour souhaité, le moment de la journée, le nom, le téléphone, l'e-mail, un mot. Le rappel du bien (photo, titre, ville, prix) est posé à côté. C'est une DEMANDE : l'agence rappelle pour fixer l'heure, et la pièce le dit ; elle ne promet aucun créneau. Exemple : une agence immobilière.",
    data: "le bien de la fiche (photo, titre, ville, prix) et la liste des biens que l'on peut visiter",
    constructions: [
      { key: "fiche", label: "le rappel du bien (photo, titre, prix) d'un côté, le formulaire de l'autre" },
      { key: "encadre", label: "le formulaire dans un encadré de couleur douce, le rappel du bien en une ligne au-dessus, sa photo en vignette" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 980 },
    html: `<section class="tn tn-bien-visite" data-tn-bien="visite"><div class="tn-rappel"><div class="tn-ph tn-cadre" ${ph("im-salon.jpg")}></div><small>Votre visite</small><b class="tn-nom-b">Maison avec jardin</b><span class="tn-lieu-b">[À compléter : ville]</span><em class="tn-prix-bien">[À compléter : prix]</em></div><div class="tn-demande"><h2>Venez le voir.</h2><p>Proposez un jour : l'agence vous rappelle pour fixer l'heure de la visite.</p><form onsubmit="return false"><label class="tn-choix"><span>Le bien</span><select name="bien" data-tn-biens-choix><option>Maison avec jardin</option><option>Appartement traversant</option></select></label><label><span>Le jour souhaité</span><input type="date" name="jour" required></label><div class="tn-moment" role="radiogroup" aria-label="Le moment de la visite"><span>Plutôt</span>${CHOIX("moment", "matin", "Le matin", true)}${CHOIX("moment", "apres-midi", "L'après-midi")}${CHOIX("moment", "soir", "En soirée")}</div><label><span>Votre nom</span><input type="text" name="nom" autocomplete="name" required></label><label><span>Votre téléphone</span><input type="tel" name="telephone" autocomplete="tel" required></label><label><span>Votre e-mail</span><input type="email" name="email" autocomplete="email" required></label><label><span>Un mot pour l'agence (facultatif)</span><textarea name="mot" rows="2"></textarea></label><button type="submit" class="tn-bt">Demander une visite</button><p class="tn-note">C'est une demande : la visite est fixée quand l'agence vous a rappelé.</p></form></div></section>`,
  }),
  // ---------------------------------------------------------------- restaurant
  sec({
    id: "tn-carte", title: "La carte du restaurant", kind: "Carte · accueil et page carte", role: "restaurant", pour: "services", only: "restaurants, traiteurs, salons de thé",
    does: "La carte, rubrique par rubrique : pour chaque plat, son nom, sa description, son prix et ses allergènes, tels que le restaurateur les a saisis dans sa rubrique Carte. Un plat indisponible ou en brouillon n'apparaît pas. Un prix absent reste « [À compléter] » ; les allergènes ne sont jamais déduits ni complétés par le Studio : la ligne ne s'affiche que s'il les a donnés. Trois écritures de carte selon la maison : à colonnes, à l'ancienne avec points de conduite, en cartes. Exemple : un restaurant.",
    data: "les rubriques et les plats publiés de la rubrique Carte (nom, description, prix, allergènes, végétarien)",
    constructions: [
      { key: "colonnes", label: "les rubriques en colonnes, le nom de chaque rubrique en grand, le prix à droite de chaque plat" },
      { key: "conduite", label: "une carte centrée à l'ancienne : un filet de chaque côté du nom des rubriques, des points de conduite entre le plat et son prix" },
      { key: "cartes", label: "une carte de couleur douce par rubrique, ses plats dedans, le prix aligné à droite" },
    ],
    trait: { fond: "clair", densite: "dense", photos: 0, hauteur: 1200 },
    html: `<section class="tn tn-carte" data-tn-carte><h2>La carte.</h2><p>Cuisinée chaque matin, avec ce que la saison donne.</p><div class="tn-rubriques"><article class="tn-rubrique"><h3>Les entrées</h3><ul>${PLAT("Le velouté du moment", "Légumes de saison, crème, herbes fraîches.")}${PLAT("L'œuf parfait", "Champignons poêlés, jus réduit.")}</ul></article><article class="tn-rubrique"><h3>Les plats</h3><ul>${PLAT("Le poisson du jour", "Légumes rôtis, beurre citronné.")}${PLAT("La volaille rôtie", "Purée maison, jus au thym.")}</ul></article><article class="tn-rubrique"><h3>Les desserts</h3><ul>${PLAT("La tarte du moment", "Fruits de saison, crème crue.")}${PLAT("Le chocolat", "Mousse, fleur de sel, sablé.")}</ul></article></div><p class="tn-note">Les allergènes sont indiqués par le restaurant, plat par plat.<br>Carte du [À compléter : date de la carte]</p><a class="tn-bt" ${LIEN} data-go="reservation">Réserver une table</a></section>`,
  }),
  sec({
    id: "tn-reserver-table", title: "Réserver une table", kind: "Réservation · accueil et page réservation", role: "restaurant", pour: "services", only: "restaurants, salons de thé",
    does: "Un vrai formulaire, sans script, pour demander une table : la date, l'heure, le nombre de couverts, le nom, le téléphone, une précision (allergie, poussette, anniversaire). Les jours et les heures d'ouverture, l'adresse et le téléphone du restaurant sont ceux du projet : « [À compléter] » sinon. C'est une DEMANDE : le restaurant confirme lui-même, et la pièce le dit ; elle ne promet aucune table. Exemple : un restaurant.",
    data: "les horaires, l'adresse et le téléphone du projet",
    constructions: [
      { key: "photo", label: "la photo de la salle en grand, le formulaire dans un panneau clair posé dessus, les horaires dessous" },
      { key: "encadre", label: "un encadré centré aux traits fins, comme un carton de réservation, la photo de la salle en bande au-dessus" },
      { key: "horaires", label: "deux colonnes : les horaires réels, l'adresse et le téléphone d'un côté, le formulaire de l'autre, la photo en bande" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 1100 },
    html: `<section class="tn tn-reserver-table"><div class="tn-ph" ${ph("rs-salle.jpg")}></div><div class="tn-boite"><h2>Réserver une table.</h2><p>Dites-nous quand vous venez et combien vous serez. Nous vous confirmons la table nous-mêmes.</p><form onsubmit="return false"><div class="tn-trio"><label><span>La date</span><input type="date" name="date" required></label><label><span>L'heure</span><input type="time" name="heure" required></label><label><span>Couverts</span><input type="number" name="couverts" min="1" inputmode="numeric" required></label></div><label><span>Votre nom</span><input type="text" name="nom" autocomplete="name" required></label><label><span>Votre téléphone</span><input type="tel" name="telephone" autocomplete="tel" required></label><label><span>Une précision (facultatif)</span><textarea name="precision" rows="2"></textarea></label><button type="submit" class="tn-bt">Demander cette table</button><p class="tn-note">C'est une demande : la table est réservée quand le restaurant vous l'a confirmée.</p></form></div><div class="tn-pratique-t"><h3>Les horaires</h3><table data-tn-horaires="jours"><tbody><tr><th>Lundi</th><td>[À compléter]</td></tr><tr><th>Mardi</th><td>[À compléter]</td></tr><tr><th>Mercredi</th><td>[À compléter]</td></tr><tr><th>Jeudi</th><td>[À compléter]</td></tr><tr><th>Vendredi</th><td>[À compléter]</td></tr><tr><th>Samedi</th><td>[À compléter]</td></tr><tr><th>Dimanche</th><td>[À compléter]</td></tr></tbody></table><address data-tn-adresse>[À compléter : adresse]</address><a class="tn-tel" ${LIEN} data-tn-tel>[À compléter : téléphone]</a></div></section>`,
  }),
  // ---------------------------------------------------------------- rendez-vous complet, ateliers
  sec({
    id: "tn-rdv-complet", title: "Rendez-vous en trois temps", kind: "Rendez-vous · page rendez-vous", role: "services", pour: "services",
    authentic: "ton équipe",
    does: "Le rendez-vous complet, sans script : un, la prestation (chaque prestation avec sa durée et son prix) ; deux, la personne (les vraies personnes de l'équipe, ou « sans préférence ») ; trois, le créneau (le jour souhaité et le moment de la journée) ; puis le nom et le téléphone. Les prestations viennent de la rubrique Prestations et Rendez-vous ; les prénoms de l'équipe viennent du client, jamais inventés : sans eux, prends la demande de rendez-vous simple (tn-rdv). C'est une DEMANDE : le professionnel confirme le créneau, et la pièce le dit. Exemple : un salon de coiffure.",
    data: "les prestations de la rubrique Prestations et Rendez-vous (nom, durée, prix) ; les prénoms et les spécialités de l'équipe donnés par le client",
    constructions: [
      { key: "etapes", label: "trois temps l'un sous l'autre, un grand chiffre devant chacun, les choix en lignes à cocher" },
      { key: "colonnes", label: "trois cartes de couleur douce, une par temps (côte à côte sur ordinateur), les coordonnées dessous" },
    ],
    trait: { fond: "clair", densite: "dense", photos: 0, hauteur: 1300 },
    html: `<section class="tn tn-rdv-complet"><h2>Ton rendez-vous,<br>en trois temps.</h2><p>Choisis ta prestation, la personne et le moment. Le salon te confirme le créneau.</p><form onsubmit="return false"><fieldset class="tn-temps"><legend>La prestation</legend><div class="tn-moment tn-options" role="radiogroup" aria-label="La prestation" data-tn-prestations-options><label><input type="radio" name="prestation" value="Coupe et coiffage" checked><span><b>Coupe et coiffage</b><small>Durée : [À compléter]</small><em>[À compléter : prix]</em></span></label><label><input type="radio" name="prestation" value="Coupe, soin et coiffage"><span><b>Coupe, soin et coiffage</b><small>Durée : [À compléter]</small><em>[À compléter : prix]</em></span></label><label><input type="radio" name="prestation" value="Couleur complète"><span><b>Couleur complète</b><small>Durée : [À compléter]</small><em>[À compléter : prix]</em></span></label></div></fieldset><fieldset class="tn-temps"><legend>Avec qui</legend><div class="tn-moment tn-options tn-qui" role="radiogroup" aria-label="Avec qui" data-tn-equipe-options><label><input type="radio" name="avec" value="Sans préférence" checked><span><b>Sans préférence</b><small>La première personne disponible</small></span></label><label><input type="radio" name="avec" value="Première personne de l'équipe"><span><b>[À compléter : prénom]</b><small>Coupe et coiffage</small></span></label><label><input type="radio" name="avec" value="Deuxième personne de l'équipe"><span><b>[À compléter : prénom]</b><small>Couleur et balayage</small></span></label></div></fieldset><fieldset class="tn-temps"><legend>Le créneau</legend><label><span>Le jour souhaité</span><input type="date" name="jour" required></label><div class="tn-moment tn-quand" role="radiogroup" aria-label="Le moment de la journée"><span>Plutôt</span>${CHOIX("moment", "matin", "Le matin", true)}${CHOIX("moment", "midi", "À midi")}${CHOIX("moment", "apres-midi", "L'après-midi")}${CHOIX("moment", "soir", "En soirée")}</div></fieldset><div class="tn-coord"><label><span>Ton prénom et ton nom</span><input type="text" name="nom" autocomplete="name" required></label><label><span>Ton téléphone</span><input type="tel" name="telephone" autocomplete="tel" required></label></div><button type="submit" class="tn-bt">Demander ce rendez-vous</button><p class="tn-note">C'est une demande : le salon te rappelle pour confirmer le jour, l'heure et la personne.</p></form></section>`,
  }),
  sec({
    id: "tn-inscription", title: "Inscription à un atelier ou à un cours", kind: "Inscription · page atelier, page inscription", role: "services", pour: "services",
    does: "Un vrai formulaire, sans script, pour s'inscrire à un atelier, à un stage ou à un cours : l'atelier (liste déroulante), la date choisie, le nombre de places, le nom, le téléphone, l'e-mail. Il complète « Prochaines dates » (tn-agenda), qui montre les dates et les places restantes, et « Planning de la semaine » (tn-planning). Les ateliers de la liste sont ceux du client ; le prix et ce qu'il comprend s'écrivent « [À compléter] » tant qu'il ne les a pas donnés. C'est une DEMANDE : la place est gardée quand le professionnel a confirmé. Exemple : un atelier de sophrologie en petit groupe.",
    constructions: [
      { key: "billet", label: "un billet : le talon de couleur douce avec ce que l'atelier comprend, le formulaire sur l'autre volet, une ligne de pointillés entre les deux" },
      { key: "photo", label: "la photo de l'atelier dans le cadre de la marque, le formulaire à côté (dessous sur téléphone)" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 1040 },
    html: `<section class="tn tn-inscription"><div class="tn-talon"><div class="tn-ph tn-cadre" ${ph("bi-atelier.jpg")}></div><h2>Prends ta place.</h2><p>En petit groupe, assis en cercle. Tu viens comme tu es, tu repars plus léger.</p><ul class="tn-compris"><li><small>Le prix</small><span>[À compléter : prix par personne]</span></li><li><small>Compris</small><span>[À compléter : ce qui est fourni sur place]</span></li><li><small>Le groupe</small><span>[À compléter : nombre de places]</span></li></ul></div><form onsubmit="return false"><label class="tn-choix"><span>L'atelier</span><select name="atelier"><option>Respirer avant de dormir</option><option>Apprivoiser le trac</option><option>La pause de midi</option></select></label><div class="tn-duo"><label><span>La date choisie</span><input type="date" name="date" required></label><label><span>Places</span><input type="number" name="places" min="1" inputmode="numeric" required></label></div><label><span>Ton prénom et ton nom</span><input type="text" name="nom" autocomplete="name" required></label><label><span>Ton téléphone</span><input type="tel" name="telephone" autocomplete="tel" required></label><label><span>Ton e-mail</span><input type="email" name="email" autocomplete="email" required></label><button type="submit" class="tn-bt">Demander ma place</button><p class="tn-note">C'est une demande : ta place est gardée quand l'atelier te l'a confirmée.</p></form></section>`,
  }),
];

/**
 * Façons de bâtir ajoutées aux pièces des métiers de services (tenue-services.ts). La première clé de chaque liste est le
 * rendu d'origine de la pièce : aucune règle ne la cible. Les suivantes sont dessinées dans tenue-metiers.css.
 */
export const METIERS_FACONS: Record<string, Construction[]> = {
  "tn-aides": [
    { key: "fiches", label: "une fiche de couleur douce par prestation : le prix plein, l'aide déduite, ce qu'il reste à payer en bas" },
    { key: "tableau", label: "un tableau à traits fins : une ligne par prestation, trois colonnes (prix plein, aide, reste à payer)" },
    { key: "reste", label: "ce qu'il reste à payer en très grand pour chaque prestation, le prix plein et l'aide en petit dessous" },
  ],
  "tn-urgence": [
    { key: "bandeau", label: "un bandeau sombre : la question, puis le numéro en très grand" },
    { key: "ligne", label: "une bande claire entre deux traits : la question à gauche, le numéro en grand à droite (sur une ligne sur ordinateur)" },
    { key: "carton", label: "un carton de couleur douce posé dans la page, le numéro au centre dans un cartouche sombre" },
  ],
  "tn-retrait": [
    { key: "liste", label: "une liste de plats, la vignette à gauche, la quantité à droite, puis le jour du retrait" },
    { key: "vignettes", label: "les plats en grandes vignettes, la photo au-dessus du nom ; le retrait dans un encadré de couleur douce" },
  ],
  "tn-vitrine": [
    { key: "ardoise", label: "une ardoise sombre, les fournées écrites dessus" },
    { key: "etiquettes", label: "sur fond clair, une étiquette par produit, comme celles posées devant les pains, l'heure de fournée en bas" },
    { key: "lignes", label: "sur fond clair, une liste à points de conduite : le produit à gauche, ses heures de fournée à droite" },
  ],
  "tn-origines": [
    { key: "tableau", label: "un tableau : la viande à gauche, son pays à droite" },
    { key: "fiches", label: "une petite fiche de couleur douce par viande, son pays en dessous (quatre par ligne sur ordinateur)" },
    { key: "mention", label: "une mention courte sous la carte : les viandes et leur pays à la suite, sans grand titre" },
  ],
  "tn-rdv": [
    { key: "colonne", label: "une seule colonne, sous une bande de photo du lieu" },
    { key: "photo", label: "le formulaire à côté d'une grande photo du lieu dans le cadre de la marque" },
    { key: "encadre", label: "le formulaire dans un encadré de couleur douce, la photo du lieu en médaillon à cheval sur son bord" },
  ],
  "tn-devis": [
    { key: "courte", label: "quatre champs seulement, à côté du titre sur ordinateur" },
    { key: "etapes", label: "trois étapes numérotées (le projet, le lieu, les coordonnées), avec la description et le type de logement" },
    { key: "bande", label: "une bande sombre : le titre en clair dessus, le formulaire court dans une carte claire (à droite sur ordinateur)" },
  ],
  "tn-zone": [
    { key: "vue", label: "une vue de la ville ou de la région d'abord, dans le cadre de la marque, puis les villes en liste sur deux colonnes" },
    { key: "villes", label: "les villes en très grand, l'une sous l'autre, la vue de la région ensuite" },
    { key: "etiquettes", label: "la vue de la région en bande pleine largeur, les villes en étiquettes à la suite, le téléphone dessous" },
  ],
  "tn-deroule": [
    { key: "chiffres", label: "les étapes l'une sous l'autre, un grand chiffre devant chacune" },
    { key: "frise", label: "une frise : des pastilles numérotées reliées par un trait (en ligne sur ordinateur)" },
    { key: "cartes", label: "une carte de couleur douce par étape, son grand chiffre dans le coin (quatre côte à côte sur ordinateur)" },
  ],
  "tn-avant-apres": [
    { key: "cote-a-cote", label: "les deux photos côte à côte, de même taille, chacune avec son étiquette" },
    { key: "incruste", label: "la photo « après » en grand, la photo « avant » en vignette posée sur son coin" },
    { key: "decale", label: "les deux photos en grand, décalées et à cheval l'une sur l'autre : « avant » à gauche, « après » plus grande à droite, la légende dessous" },
  ],
  "tn-agenda": [
    { key: "liste", label: "une liste à traits, la date en tête de chaque ligne" },
    { key: "prochain", label: "la prochaine date en grand dans un bloc de couleur douce, les suivantes en liste dessous" },
    { key: "billets", label: "un billet par date : la date sur le talon de couleur douce, le titre, les places restantes et l'inscription sur le volet" },
  ],
};
