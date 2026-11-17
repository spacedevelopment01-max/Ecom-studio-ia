/**
 * Thème unique du Studio — module « partitions » (17 novembre 2026) : les pièces qui manquaient pour tenir les moments
 * du cahier `docs/sina-savoir/theme-ordre-et-variete.md` (règle du propriétaire : « Si une section manque ou ne convient
 * pas, crée-la ou adapte-la »). Feuille : public/sections/tenue-partitions.css. Règles d'écriture :
 * docs/sina-savoir/sections-a-tenue.md.
 *
 * Pièces nouvelles (PARTITIONS_SECTIONS) :
 *  - les moments sans pièce : l'offre de première visite, les délais, l'annulation et ses conditions, la privatisation,
 *    les réalisations filtrées par type, les réseaux ;
 *  - la page contact, moment par moment : le délai de réponse, les horaires, l'adresse et sa carte, l'accès et le
 *    stationnement ;
 *  - la fiche d'un bien, moment par moment : la description, les surfaces, les équipements, les frais et charges ;
 *  - le titre d'une page (réalisations, questions) : la présentation.
 * Façons ajoutées (PARTITIONS_FACONS) : l'ouverture d'un métier de services en grande photo pleine, le titre dessus, avec
 * la ville, la zone et le téléphone cliquable (règle d'or 1 du cahier ; règle du propriétaire pour toute ouverture).
 *
 * Une pièce de ce module ne se montre JAMAIS sans sa vraie donnée (tenue-data.ts : « withTenueFaits », « withTenueReseaux »,
 * la fiche d'un bien) : un élément marqué « data-tn-fait » qui reste à compléter est retiré ; quand il n'en reste aucun,
 * la pièce entière n'est pas rendue. Aucun fait d'exemple : tout ce qui est un fait s'écrit « [À compléter : …] ».
 * Les filtres des réalisations marchent sans script (boutons radio et « :has() ») : ils partent tels quels en boutique.
 */
import { ph, sec, type Construction, type TenueSection } from "./tenue-base";

const LIEN = `href="#" onclick="return false"`;
const M = (quoi: string) => `[À compléter : ${quoi}]`;
/** Une ligne « libellé, fait » : elle s'en va tant que le fait manque. */
const FAIT = (label: string, quoi: string, suite = "") => `<li data-tn-fait><small>${label}</small><b>${M(quoi)}</b>${suite ? `<span>${suite}</span>` : ""}</li>`;
const REGLE = (label: string, quoi: string) => `<li data-tn-fait><b>${label}</b><span>${M(quoi)}</span></li>`;
const TYPE = (cle: string, quoi: string) => `<label data-tn-t="${cle}"><input type="radio" name="tn-pt-type" value="${cle}"><span>${M(quoi)}</span></label>`;
const REALISATION = (cle: string, photo: string) => `<figure data-tn-t="${cle}"><div class="tn-ph tn-cadre" ${ph(photo)}></div><figcaption><b>Nom de la réalisation</b><span>Ce qui a été fait, en une phrase.</span><small>${M("ville")} · ${M("mois et année")}</small></figcaption></figure>`;
const COMPTE = `<li><a ${LIEN}><small>Nom du réseau</small><b>${M("ton compte")}</b></a></li>`;
const PAIRE = (label: string) => `<div><dt>${label}</dt><dd>[À compléter]</dd></div>`;
const FRAIS = (label: string) => `<div data-tn-fait><dt>${label}</dt><dd>[À compléter]</dd></div>`;

export const PARTITIONS_SECTIONS: TenueSection[] = [
  // ════════════════════════════════════════════════════════ les moments qui n'avaient aucune pièce
  sec({
    id: "tn-offre-visite", title: "L'offre de première visite", kind: "Offre · accueil d'un métier sur rendez-vous", role: "conversion", pour: "services",
    does: "L'offre que le client fait VRAIMENT à une personne qui vient pour la première fois : ses mots, ses conditions, le bouton pour réserver. Elle ne se pose que si le client a donné cette offre ; sans elle, la pièce ne s'affiche pas. Jamais une offre suggérée, jamais une remise inventée.",
    data: "l'offre de première visite donnée par le client, avec ses conditions",
    constructions: [
      { key: "encadre", label: "un encadré au double filet, centré : l'offre en grand, ses conditions, le bouton" },
      { key: "bande", label: "une bande à la couleur de la marque sur toute la largeur : l'offre à gauche, le bouton à droite sur grand écran" },
      { key: "billet", label: "un billet à talon détachable sur fond doux : « Première visite » sur le talon, l'offre et le bouton sur le billet" },
    ],
    trait: { fond: "clair", densite: "aérée", photos: 0, hauteur: 330 },
    html: `<section class="tn tn-offre-visite"><div class="tn-pt-carte"><small>Première visite</small><h2 data-tn-fait>${M("ton offre pour une première visite, avec tes mots")}</h2><p>${M("les conditions de l'offre : pour qui, jusqu'à quand")}</p><a class="tn-bt" ${LIEN} data-go="reservation">Réserver ma première visite</a></div></section>`,
  }),
  sec({
    id: "tn-delais", title: "Les délais, étape par étape", kind: "Délais · accueil et page d'une prestation sur devis", role: "services", pour: "services",
    does: "Les délais réels du client, étape par étape : le premier contact, la visite, le devis, le chantier. Elle répond à « sous quel délai ? » sans rien promettre de plus que ce que le client a dit. Une étape dont le délai manque s'en va ; sans aucun délai donné, la pièce ne s'affiche pas.",
    data: "les délais donnés par le client (rappel, visite, devis, début et durée du chantier)",
    constructions: [
      { key: "lignes", label: "une ligne par étape entre deux filets : l'étape à gauche, son délai en grand à droite" },
      { key: "frise", label: "une frise : un point par étape sur un trait, en ligne sur grand écran, en colonne sur téléphone" },
      { key: "cartes", label: "une carte de couleur douce par étape, numérotée, le délai en très grand" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 520 },
    html: `<section class="tn tn-delais"><h2>Les délais, étape par étape.</h2><p>Ce que tu peux noter dans ton agenda dès aujourd'hui.</p><ul class="tn-pt-etapes">${FAIT("Premier contact", "sous combien de temps tu rappelles", "Tu expliques ton besoin.")}${FAIT("Visite", "sous combien de temps tu viens voir", "On regarde les lieux ensemble.")}${FAIT("Devis", "sous combien de temps tu l'envoies", "Tu le reçois par écrit.")}${FAIT("Chantier", "quand il peut commencer, et combien de temps il dure", "Les travaux commencent.")}</ul></section>`,
  }),
  sec({
    id: "tn-annulation", title: "Annulation et conditions", kind: "Conditions · page d'une prestation sur rendez-vous", role: "aide", pour: "services",
    does: "Ce qui se passe quand un rendez-vous doit être annulé ou déplacé : jusqu'à quand, comment prévenir, le retard, l'acompte. Les conditions sont celles du client, mot pour mot ; une règle qu'il n'a pas donnée s'en va, et sans aucune règle la pièce ne s'affiche pas.",
    data: "les conditions d'annulation, de retard et d'acompte données par le client",
    constructions: [
      { key: "lignes", label: "les règles l'une sous l'autre, séparées par des filets, la règle en gras et sa réponse dessous" },
      { key: "cartes", label: "une carte au trait par règle, deux de front sur grand écran" },
      { key: "encadre", label: "tout dans un encadré de couleur douce ; sur grand écran, le titre reste à gauche et les règles sont à droite" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 520 },
    html: `<section class="tn tn-annulation"><div class="tn-pt-tete"><h2>Un empêchement&nbsp;?</h2><p>Ça arrive. Voici comment ça se passe.</p></div><ul class="tn-pt-regles">${REGLE("Annuler ou déplacer", "jusqu'à quand, et comment prévenir")}${REGLE("En cas de retard", "ce qui se passe si la personne arrive en retard")}${REGLE("Acompte", "s'il y en a un, et ce qu'il devient")}${REGLE("Rendez-vous manqué", "ce qui se passe")}</ul><a class="tn-pt-lien" ${LIEN} data-go="contact">Prévenir d'un changement</a></section>`,
  }),
  sec({
    id: "tn-privatisation", title: "Privatiser le lieu", kind: "Groupes · page d'un restaurant ou d'un lieu", role: "restaurant", pour: "services",
    does: "Réserver le lieu pour un groupe : ce que le client propose, pour combien de personnes, quand, avec quelles formules, et le bouton pour demander. Elle ne se pose que si le client privatise vraiment son lieu et l'a dit ; sans cela, la pièce ne s'affiche pas. La photo est celle de son lieu.",
    data: "ce que le client propose aux groupes (nombre de personnes, moments possibles, formules)",
    constructions: [
      { key: "photo-pleine", label: "une grande photo du lieu sur toute la largeur, puis une carte claire posée à cheval sur elle" },
      { key: "cote-a-cote", label: "la photo dans le cadre de la marque d'un côté, le texte et les repères de l'autre (l'un sous l'autre sur téléphone)" },
      { key: "sombre", label: "une bande sombre : le titre en grand, les trois repères en colonnes, la photo en bande étroite dessous" },
    ],
    trait: { fond: "photo", densite: "moyenne", photos: 1, hauteur: 640 },
    html: `<section class="tn tn-privatisation"><div class="tn-ph" ${ph("rs-salle.jpg")}></div><div class="tn-pt-corps"><small>Pour un groupe</small><h2>Le lieu, rien que pour vous.</h2><p data-tn-fait>${M("ce que tu proposes pour un groupe, avec tes mots")}</p><ul class="tn-pt-reperes"><li><small>Combien de personnes</small><span>${M("de combien à combien")}</span></li><li><small>Quand</small><span>${M("les jours et les moments possibles")}</span></li><li><small>Formules</small><span>${M("ce qui est proposé")}</span></li></ul><a class="tn-bt" ${LIEN} data-go="contact">Demander une privatisation</a></div></section>`,
  }),
  sec({
    id: "tn-realisations-types", title: "Les réalisations, filtrées par type", kind: "Preuves · page réalisations", role: "services", pour: "services",
    does: "Toutes les réalisations du professionnel avec leur lieu et leur date, et au-dessus des filtres par type qui marchent pour de vrai : un toucher, et il ne reste que les réalisations de ce type. Elle tient à la fois les filtres et la liste : ne pose pas « Les réalisations en photos » sur la même page. Un filtre n'existe que pour un type que le client a vraiment (deux types au moins, quatre au plus) ; sinon la liste s'affiche sans filtres. Photos du client d'abord.",
    data: "les réalisations du client (photo, titre, ce qui a été fait, ville, date) et leurs types",
    anim: "Au toucher d'un filtre, seules les réalisations de ce type restent, sans script.",
    constructions: [
      { key: "grille", label: "les filtres en pastilles, puis une grille de photos dans le cadre de la marque, la légende sous chacune" },
      { key: "bandes", label: "les filtres en onglets soulignés, puis de grandes bandes de photo l'une sous l'autre, la légende dessous" },
      { key: "liste", label: "une ligne par réalisation : petite photo à gauche, texte à droite, un filet entre les lignes ; les filtres en colonne à gauche sur grand écran" },
    ],
    trait: { fond: "clair", densite: "dense", photos: 6, hauteur: 980 },
    html: `<section class="tn tn-realisations-types"><h2>Toutes les réalisations.</h2><p class="tn-pt-aide">Choisis un type pour ne voir que ce qui ressemble à ton projet.</p><div class="tn-pt-filtres" role="group" aria-label="Filtrer par type"><label><input type="radio" name="tn-pt-type" value="tous" checked><span>Tout voir</span></label>${TYPE("a", "un premier type de réalisation")}${TYPE("b", "un deuxième type")}${TYPE("c", "un troisième type")}</div><div class="tn-galerie" data-tn-realisations>${REALISATION("a", "sv-cuisine.jpg")}${REALISATION("b", "sv-sdb.jpg")}${REALISATION("c", "sv-exterieur.jpg")}${REALISATION("a", "sv-spots.jpg")}${REALISATION("b", "sv-reno.jpg")}${REALISATION("c", "ap-murs.jpg")}</div></section>`,
  }),
  sec({
    id: "tn-reseaux", title: "Les réseaux du client", kind: "Réseaux · page contact", role: "contact",
    does: "Les VRAIS comptes du client sur les réseaux, chacun avec son lien : où le suivre, où lui écrire. Les comptes viennent de ce que le client a dit ou de son site existant ; le Studio n'en devine aucun. Sans compte connu, la pièce ne s'affiche pas.",
    data: "les comptes du client sur les réseaux (ses mots, ou son site existant)",
    constructions: [
      { key: "lignes", label: "une ligne par réseau entre deux filets : le nom du réseau, le compte en grand, une flèche" },
      { key: "pastilles", label: "de grandes pastilles à la couleur de la marque, côte à côte, le compte dedans" },
      { key: "sombre", label: "une bande sombre : le titre à gauche, les comptes en très grand à droite sur grand écran" },
    ],
    trait: { fond: "clair", densite: "aérée", photos: 0, hauteur: 360 },
    html: `<section class="tn tn-reseaux" data-tn-reseaux><div class="tn-pt-tete"><h2>On se retrouve là-bas.</h2><p>Les coulisses, les nouveautés, et une réponse quand tu écris.</p></div><ul class="tn-pt-comptes">${COMPTE}${COMPTE}${COMPTE}</ul></section>`,
  }),

  // ════════════════════════════════════════════════════════ la page contact, moment par moment
  sec({
    id: "tn-delai-reponse", title: "Le délai de réponse", kind: "Contact · sous le formulaire", role: "contact",
    does: "Quand la personne aura une réponse, moyen par moyen (téléphone, message, devis) : les délais que le client tient vraiment. Un moyen dont le délai manque s'en va ; sans aucun délai donné, la pièce ne s'affiche pas.",
    data: "les délais de réponse donnés par le client",
    constructions: [
      { key: "colonnes", label: "une colonne par moyen de contact, le délai en grand, des filets entre les colonnes (l'une sous l'autre sur téléphone)" },
      { key: "bande", label: "une bande à la couleur de la marque : le titre, puis les délais en ligne" },
    ],
    trait: { fond: "clair", densite: "aérée", photos: 0, hauteur: 340 },
    html: `<section class="tn tn-delai-reponse"><h2>Quand auras-tu une réponse&nbsp;?</h2><ul class="tn-pt-moyens">${FAIT("Par téléphone", "quand tu décroches, sous combien de temps tu rappelles")}${FAIT("Par message ou e-mail", "sous combien de temps tu réponds")}${FAIT("Pour un devis", "sous combien de temps tu l'envoies")}</ul></section>`,
  }),
  sec({
    id: "tn-horaires", title: "Les horaires seuls", kind: "Infos pratiques · page contact", role: "contact", pour: "services",
    does: "Les jours et les heures où l'on peut appeler ou passer, tels que le client les a donnés dans son profil. Pour une page contact où chaque information a sa place ; ne la pose pas avec « Horaires et accès », qui les montre déjà. Sans horaires au profil, la pièce ne s'affiche pas.",
    data: "les horaires du profil des services",
    constructions: [
      { key: "tableau", label: "le titre, puis un jour par ligne : le jour à gauche, les heures à droite, des filets" },
      { key: "encadre", label: "un encadré au trait centré, le titre à cheval sur le bord du haut" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 440 },
    html: `<section class="tn tn-horaires"><h2>Les horaires.</h2><div class="tn-pt-heures" data-tn-fait><table data-tn-horaires="jours"><tbody><tr><th>Lundi</th><td>[À compléter]</td></tr><tr><th>Mardi</th><td>[À compléter]</td></tr><tr><th>Mercredi</th><td>[À compléter]</td></tr><tr><th>Jeudi</th><td>[À compléter]</td></tr><tr><th>Vendredi</th><td>[À compléter]</td></tr><tr><th>Samedi</th><td>[À compléter]</td></tr><tr><th>Dimanche</th><td>[À compléter]</td></tr></tbody></table></div><a class="tn-tel" ${LIEN} data-tn-tel>${M("téléphone")}</a></section>`,
  }),
  sec({
    id: "tn-adresse", title: "L'adresse et sa carte", kind: "Infos pratiques · page contact", role: "contact", pour: "services",
    does: "L'adresse du client en grand, le cadre qui ouvre la vraie carte à cette adresse et le bouton d'itinéraire. Jamais un plan dessiné. Ne la pose pas avec « Horaires et accès », qui la montre déjà. Sans adresse à montrer (client qui se déplace, adresse discrète), la pièce ne s'affiche pas.",
    data: "l'adresse du profil des services, sinon celle de la fiche de l'entreprise",
    constructions: [
      { key: "carte-dessus", label: "le titre, le grand cadre de la carte, puis l'adresse et le bouton d'itinéraire dessous" },
      { key: "adresse-en-grand", label: "l'adresse en très grandes lettres et le bouton d'itinéraire, la carte à côté sur grand écran (dessous sur téléphone)" },
    ],
    trait: { fond: "clair", densite: "aérée", photos: 1, hauteur: 520 },
    html: `<section class="tn tn-adresse"><h2>Où nous trouver.</h2><div class="tn-ph" ${ph("carte-contact.jpg")}></div><div class="tn-pt-lieu"><address data-tn-adresse data-tn-fait>${M("adresse")}</address><a class="tn-bt" ${LIEN} data-tn-itineraire>Voir l'itinéraire</a></div></section>`,
  }),
  sec({
    id: "tn-venir", title: "Accès et stationnement", kind: "Infos pratiques · page contact", role: "contact", pour: "services",
    does: "Comment venir sans chercher : où se garer, l'arrêt le plus proche, l'accès sur place, le repère visible depuis la rue. Les mots du client seulement. Ne la pose pas avec « Horaires et accès », qui le dit déjà. Une ligne sans réponse s'en va ; sans aucune, la pièce ne s'affiche pas.",
    data: "ce que le client a dit de l'accès (stationnement, transports, accès sur place)",
    constructions: [
      { key: "lignes", label: "une ligne par sujet entre deux filets : le sujet à gauche, la réponse à droite" },
      { key: "cartes", label: "une carte de couleur douce par sujet, deux de front sur téléphone, quatre sur grand écran" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 420 },
    html: `<section class="tn tn-venir"><h2>Venir sans chercher.</h2><ul class="tn-pt-acces"><li data-tn-fait><small>Se garer</small><span>${M("où se garer au plus près")}</span></li><li data-tn-fait><small>En transports</small><span>${M("l'arrêt le plus proche")}</span></li><li data-tn-fait><small>Sur place</small><span>${M("étage, ascenseur, accès en fauteuil")}</span></li><li data-tn-fait><small>Le repère</small><span>${M("ce qu'on voit depuis la rue")}</span></li></ul></section>`,
  }),

  // ════════════════════════════════════════════════════════ la fiche d'un bien, moment par moment
  sec({
    id: "tn-bien-description", title: "Fiche d'un bien : la description", kind: "Fiche d'un bien · sous la galerie", role: "immobilier", pour: "services", only: "agences immobilières",
    does: "La description du bien telle que l'agence l'a écrite dans la rubrique Biens, avec une deuxième photo du bien. Pour une fiche où chaque partie a sa section ; ne la pose pas avec « Fiche d'un bien : caractéristiques », qui porte déjà la description. Sans description saisie, la pièce ne s'affiche pas.",
    data: "la description et la deuxième photo du bien mis en avant (rubrique Biens)",
    constructions: [
      { key: "avec-photo", label: "le texte d'un côté, une photo du bien dans le cadre de la marque de l'autre (l'un sous l'autre sur téléphone)" },
      { key: "colonne", label: "le texte seul en colonne étroite et centrée, sa première phrase en très grand" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 620 },
    html: `<section class="tn tn-bien-description" data-tn-bien="description"><div class="tn-pt-corps"><h2>Ce qu'on y vit.</h2><p class="tn-pt-texte" data-tn-fait>${M("la description du bien")}</p></div><div class="tn-ph tn-cadre" ${ph("im-salon.jpg")}></div></section>`,
  }),
  sec({
    id: "tn-bien-surfaces", title: "Fiche d'un bien : les surfaces", kind: "Fiche d'un bien · plans et surfaces", role: "immobilier", pour: "services", only: "agences immobilières",
    does: "Les surfaces et la distribution du bien : surface habitable, terrain, pièces, chambres, puis l'étage, la disponibilité et la référence. Seulement ce que l'agence a saisi dans la rubrique Biens. Ne la pose pas avec « Fiche d'un bien : caractéristiques ». Sans aucune mesure saisie, la pièce ne s'affiche pas.",
    data: "les mesures du bien mis en avant (rubrique Biens)",
    constructions: [
      { key: "chiffres", label: "les mesures en très grands chiffres côte à côte, puis le détail en lignes fines dessous" },
      { key: "tableau", label: "tout en lignes entre deux filets : le nom à gauche, la mesure à droite" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 420 },
    html: `<section class="tn tn-bien-surfaces" data-tn-bien="surfaces"><h2>Les surfaces.</h2><ul class="tn-pt-mesures"><li data-tn-fait><b>[À compléter]</b><small>Surface habitable</small></li><li data-tn-fait><b>[À compléter]</b><small>Terrain</small></li><li data-tn-fait><b>[À compléter]</b><small>Pièces</small></li><li data-tn-fait><b>[À compléter]</b><small>Chambres</small></li></ul><dl class="tn-pt-detail">${PAIRE("Étage")}${PAIRE("Disponibilité")}${PAIRE("Référence")}</dl></section>`,
  }),
  sec({
    id: "tn-bien-equipements", title: "Fiche d'un bien : les équipements", kind: "Fiche d'un bien · équipements", role: "immobilier", pour: "services", only: "agences immobilières",
    does: "Ce qui est déjà là dans le bien : ses équipements, ses extérieurs, s'il est meublé. Seulement ce que l'agence a saisi dans la rubrique Biens, jamais un équipement supposé. Ne la pose pas avec « Fiche d'un bien : caractéristiques ». Sans équipement saisi, la pièce ne s'affiche pas.",
    data: "les équipements et les extérieurs du bien mis en avant (rubrique Biens)",
    constructions: [
      { key: "coches", label: "une liste à coches, sur deux colonnes (trois sur grand écran)" },
      { key: "etiquettes", label: "des étiquettes au trait, posées en nuage sous le titre" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 380 },
    html: `<section class="tn tn-bien-equipements" data-tn-bien="equipements"><h2>Ce qui est déjà là.</h2><ul class="tn-pt-equip"><li data-tn-fait>${M("un équipement du bien")}</li><li data-tn-fait>${M("un équipement du bien")}</li><li data-tn-fait>${M("un équipement du bien")}</li><li data-tn-fait>${M("un équipement du bien")}</li></ul></section>`,
  }),
  sec({
    id: "tn-bien-frais", title: "Fiche d'un bien : frais et charges", kind: "Fiche d'un bien · frais et charges", role: "immobilier", pour: "services", only: "agences immobilières",
    does: "Ce que la personne paiera en plus du prix : charges, dépôt de garantie, honoraires, taxe foncière. Les montants sont ceux que l'agence a saisis dans la rubrique Biens, repris tels quels ; une ligne non saisie s'en va. Ne la pose pas avec « Fiche d'un bien : caractéristiques ». Sans aucun montant saisi, la pièce ne s'affiche pas.",
    data: "les charges, le dépôt, les honoraires et la taxe foncière du bien mis en avant (rubrique Biens)",
    constructions: [
      { key: "lignes", label: "une ligne par frais entre deux filets : son nom à gauche, son montant à droite" },
      { key: "cartes", label: "une carte de couleur douce par frais, le montant en grand, côte à côte sur grand écran" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 380 },
    html: `<section class="tn tn-bien-frais" data-tn-bien="frais"><h2>Ce qu'il faut prévoir.</h2><dl class="tn-pt-frais">${FRAIS("Charges")}${FRAIS("Dépôt")}${FRAIS("Honoraires")}${FRAIS("Taxe foncière")}</dl><p class="tn-pt-note">Ces montants sont ceux que l'agence a communiqués pour ce bien.</p></section>`,
  }),

  // ════════════════════════════════════════════════════════ le titre d'une page
  sec({
    id: "tn-presentation", title: "Présentation d'une page", kind: "Titre de page · réalisations, questions", role: "contenu",
    does: "Le haut d'une page importante qui n'a pas d'ouverture en photo (réalisations, questions) : le grand titre de la page et une phrase courte qui dit ce qu'on y trouve et pour qui. Elle porte le seul grand titre de la page : jamais sur l'accueil, jamais sous une ouverture.",
    constructions: [
      { key: "centre", label: "tout centré : un petit mot, le grand titre, la phrase, un court filet à la couleur de la marque" },
      { key: "gauche", label: "sous un filet, le titre très grand à gauche et la phrase à droite sur grand écran (dessous sur téléphone)" },
      { key: "bande", label: "une bande à la couleur de la marque sur toute la largeur, le titre et la phrase dedans" },
    ],
    trait: { fond: "clair", densite: "aérée", photos: 0, hauteur: 260 },
    html: `<section class="tn tn-presentation"><small>Nom de la page</small><h1>Le titre de la page.</h1><p>Une phrase courte qui dit ce qu'on trouve ici, et pour qui.</p></section>`,
  }),
];

/**
 * Façons ajoutées à des pièces d'autres modules. L'ouverture d'un métier de services n'avait aucune façon « grande photo
 * pleine, le titre dessus » (règle du propriétaire pour toute ouverture) : elle n'était donc permise dans aucune famille,
 * et aucune ouverture permise ne portait la ville ni le téléphone (règle d'or 1). Trois façons en photo pleine, avec le
 * métier et la ville, la zone, les horaires et le téléphone cliquable du profil (data-tn-tel, data-tn-zone…).
 */
export const PARTITIONS_FACONS: Record<string, Construction[]> = {
  "tn-ouverture-metier": [
    { key: "lieu", label: "la photo du lieu en grand, puis le titre, l'adresse et les horaires, le bouton pour réserver (salon, restaurant, cabinet)" },
    { key: "appel", label: "le téléphone en très grand sous le titre, la zone et les horaires, le bouton de devis, la photo en bande (artisan, dépannage)" },
    { key: "promesse", label: "un grand titre, puis une photo en hauteur dans le cadre de la marque, le bouton à cheval sur la photo" },
    { key: "photo-pleine", label: "photo pleine sur tout l'écran, le métier et la ville, le grand titre, le téléphone et le bouton posés en bas à gauche sur un voile sombre" },
    { key: "photo-centre", label: "photo pleine sur tout l'écran sous un voile, tout centré au milieu : le métier et la ville, le titre, le bouton, le téléphone en grand" },
    { key: "photo-bandeau", label: "photo pleine avec le titre posé dessus en bas, puis un bandeau sombre collé dessous : le téléphone en grand, la zone, les horaires, le bouton" },
  ],
};

/** Les ouvertures d'un site de services (familles.ts) : photo pleine, titre dessus, ville et téléphone cliquable. */
export const OUVERTURES_SERVICES = ["tn-ouverture-metier:photo-pleine", "tn-ouverture-metier:photo-centre", "tn-ouverture-metier:photo-bandeau"] as const;
