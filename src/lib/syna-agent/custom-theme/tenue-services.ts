/**
 * Sections à tenue des métiers de services (thème sur mesure). Feuille : public/sections/tenue-services.css. Règles d'écriture :
 * docs/sina-savoir/sections-a-tenue.md. Gratuit, sans IA.
 *
 * Chaque section prend l'exemple d'un métier précis (salon de coiffure, électricien, restaurant, chambres d'hôtes…) et le
 * dit. Rien n'y est inventé : prix, durées, horaires, villes, téléphone, dates, qualifications s'écrivent « [À compléter : …] ».
 * Toute photo du balisage reste visible dans TOUTES les constructions de sa section (une photo présente est une photo
 * créée, donc payée : elle n'est jamais cachée par une construction).
 *
 * Vraies données, posées par le Studio (les lignes d'exemple gardent exactement cette forme) :
 *  - data-tn-prestations (racine) : <ul class="tn-liste-p"> de lignes <li><b>Nom</b><span>Durée : …</span><i>prix</i></li> ;
 *    une ligne de rubrique, facultative, s'écrit <li class="tn-rub"><small>Rubrique</small></li>.
 *  - data-tn-prestations-choix (<select>) : une <option> par prestation.
 *  - data-tn-tel : le numéro de téléphone (texte du lien, et son adresse d'appel) ; data-tn-adresse : l'adresse en une ligne.
 *  - data-tn-horaires="ligne" : les horaires résumés en une ligne ; data-tn-horaires="jours" (<table>) : une ligne
 *    <tr><th>Jour</th><td>heures</td></tr> par jour.
 *  - data-tn-zone="ligne" : la zone en une ligne ; data-tn-zone="villes" (<ul>) : un <li> par ville.
 *  - data-tn-itineraire : le lien d'itinéraire vers l'adresse.
 *  - listes dont les lignes gardent la forme de l'exemple : data-tn-agenda (ateliers), data-tn-planning (jours et cours),
 *    data-tn-retrait (plats à emporter), data-tn-vitrine (fournées), data-tn-origines (viandes), data-tn-realisations,
 *    data-tn-equipe (intervenants), data-tn-vendus (biens vendus).
 */
import { VOLET, ph, sec, type TenueSection } from "./tenue-base";

/** Lien d'exemple : il ne mène nulle part tant que le Studio n'a pas posé sa page. */
const LIEN = `href="#" onclick="return false"`;
/** Ligne d'une prestation : nom, durée (ou description), prix. */
const PRESTA = (nom: string) => `<li><b>${nom}</b><span>Durée : [À compléter]</span><i>[À compléter : prix]</i></li>`;

export const SERVICES_SECTIONS: TenueSection[] = [
  sec({
    id: "tn-ouverture-metier", title: "Ouverture d'un métier de services", kind: "Ouverture · accueil", role: "ouverture", pour: "services",
    does: "Le premier écran d'un site de services : il dit le métier, la ville et l'action du métier (réserver, appeler, demander un devis), avec un numéro qui s'appelle d'un toucher. Trois constructions selon ce que le visiteur cherche d'abord : le lieu, le numéro ou la promesse. L'adresse, les horaires, la zone et le téléphone viennent du projet ; ce qui manque s'écrit « [À compléter] ». Exemple : un salon de coiffure.",
    data: "l'adresse, les horaires, la zone et le téléphone du projet",
    constructions: [
      { key: "lieu", label: "la photo du lieu en grand, puis le titre, l'adresse et les horaires, le bouton pour réserver (salon, restaurant, cabinet)" },
      { key: "appel", label: "le téléphone en très grand sous le titre, la zone et les horaires, le bouton de devis, la photo en bande (artisan, dépannage)" },
      { key: "promesse", label: "un grand titre, puis une photo en hauteur dans le cadre de la marque, le bouton à cheval sur la photo" },
    ],
    trait: { fond: "clair", densite: "aérée", photos: 1, hauteur: 760 },
    html: `<section class="tn tn-ouverture-metier"><div class="tn-ph" ${ph("be-coupe.jpg")}></div><div class="tn-corps"><small>Salon de coiffure · [À compléter : ville]</small><h1>Le temps<br>de souffler.</h1><p>Une coupe pensée pour toi, un soin, un café. Tu ressors léger, sans avoir regardé l'heure.</p><a class="tn-tel" ${LIEN} data-tn-tel>[À compléter : téléphone]</a><ul class="tn-reperes"><li class="tn-adr"><small>Adresse</small><span data-tn-adresse>[À compléter : adresse]</span></li><li class="tn-hor"><small>Horaires</small><span data-tn-horaires="ligne">[À compléter : jours et heures d'ouverture]</span></li><li class="tn-zon"><small>Zone</small><span data-tn-zone="ligne">[À compléter : villes desservies]</span></li></ul><a class="tn-bt" ${LIEN} data-go="reservation">Prendre rendez-vous</a></div></section>`,
  }),
  sec({
    id: "tn-prestations", title: "Les prestations et leurs prix", kind: "Prestations · accueil et page prestations", role: "services", pour: "services",
    does: "La liste des prestations avec, pour chacune, son nom, sa durée et son prix : la première chose que cherche le visiteur d'un salon, d'un cabinet ou d'un restaurant. Les lignes viennent de la rubrique Prestations et Rendez-vous ; un prix ou une durée absents restent « [À compléter] », jamais inventés. Pour un restaurant, la ligne porte le plat, sa description et son prix. Exemple : un salon de coiffure.",
    data: "les prestations de la rubrique Prestations et Rendez-vous",
    constructions: [
      { key: "liste", label: "une liste à traits fins, le prix aligné à droite, la photo du lieu dans le cadre de la marque" },
      { key: "cartes", label: "la photo du lieu en bande, puis une carte par prestation, sur deux colonnes" },
      { key: "carte", label: "une carte centrée par rubriques, comme la carte d'un restaurant, la photo en médaillon" },
    ],
    trait: { fond: "clair", densite: "dense", photos: 1, hauteur: 900 },
    html: `<section class="tn tn-prestations" data-tn-prestations><h2>La carte du salon.</h2><p>Chaque rendez-vous commence par un vrai échange, devant le miroir.</p><div class="tn-ph" ${ph("be-salon.jpg")}></div><ul class="tn-liste-p"><li class="tn-rub"><small>Les coupes</small></li>${PRESTA("Coupe et coiffage")}${PRESTA("Coupe, soin et coiffage")}<li class="tn-rub"><small>La couleur</small></li>${PRESTA("Couleur complète")}${PRESTA("Balayage")}</ul><a class="tn-bt" ${LIEN} data-go="reservation">Prendre rendez-vous</a></section>`,
  }),
  sec({
    id: "tn-tarifs", title: "Grille de tarifs en tableau", kind: "Tarifs · page tarifs ou prestations", role: "services", pour: "services",
    does: "Un tableau de prix à plusieurs colonnes, quand le prix dépend d'un second critère : la saison (gîte, chambres d'hôtes), la longueur des cheveux, le gabarit du véhicule, le barème d'honoraires d'une agence. Sur téléphone, le tableau défile sur lui-même, jamais la page. Tous les prix viennent du client : une case vide reste « [À compléter] ». Exemple : des chambres d'hôtes.",
    trait: { fond: "clair", densite: "dense", photos: 0, hauteur: 520 },
    html: `<section class="tn tn-tarifs"><h2>Les tarifs.</h2><p>Par nuit et par chambre. Ce qui est compris : [À compléter]</p><div class="tn-defile"><table><thead><tr><th><small>Par nuit</small></th><th><small>Basse saison</small></th><th><small>Moyenne saison</small></th><th><small>Haute saison</small></th></tr></thead><tbody><tr><th>La chambre côté jardin</th><td>[À compléter]</td><td>[À compléter]</td><td>[À compléter]</td></tr><tr><th>La chambre sous les toits</th><td>[À compléter]</td><td>[À compléter]</td><td>[À compléter]</td></tr><tr><th>La suite</th><td>[À compléter]</td><td>[À compléter]</td><td>[À compléter]</td></tr></tbody></table></div><p class="tn-note">Dates des saisons : [À compléter]<br>Taxe de séjour : [À compléter]</p><a class="tn-suite" ${LIEN} data-go="reservation">Demander une date</a></section>`,
  }),
  sec({
    id: "tn-exemples-prix", title: "Exemples de prix : trois cas réels", kind: "Prix · accueil et page d'une prestation", role: "services", pour: "services",
    does: "Trois chantiers ou prestations types, chacun avec ce qui a été fait et le prix réellement facturé : la réponse honnête quand le prix dépend du cas (artisans, garages, déménageurs, photographes), préférée à un calculateur. Demande au client trois cas réels avec leur prix ; sans eux, tout reste « [À compléter] ». Exemple : un électricien.",
    constructions: [
      { key: "colonnes", label: "trois cas séparés par des traits, le prix en très grand sous chacun" },
      { key: "ticket", label: "une note de chantier sur fond doux : une ligne par cas, le prix à droite, des pointillés entre les lignes" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 820 },
    html: `<section class="tn tn-exemples-prix"><h2>Trois chantiers,<br>trois prix.</h2><p>Chaque logement est différent. Voici ce que nous avons vraiment facturé, pour vous donner un ordre d'idée avant le devis.</p><ul class="tn-cas"><li><b>Tableau électrique remis aux normes</b><span>Appartement ancien : tableau remplacé, protections posées, circuits repérés.</span><i>[À compléter : prix]</i><small>[À compléter : ville et durée]</small></li><li><b>Éclairage d'une cuisine ouverte</b><span>Spots encastrés, suspensions au-dessus de l'îlot, variateurs.</span><i>[À compléter : prix]</i><small>[À compléter : ville et durée]</small></li><li><b>Borne de recharge à domicile</b><span>Borne murale dans le garage, ligne dédiée, mise en service.</span><i>[À compléter : prix]</i><small>[À compléter : ville et durée]</small></li></ul><a class="tn-bt" ${LIEN} data-go="devis">Demander mon devis</a></section>`,
  }),
  sec({
    id: "tn-aides", title: "Aides et prix après aide", kind: "Prix · accueil et page tarifs", role: "services", pour: "services",
    does: "Les aides auxquelles le client peut prétendre, avec le prix plein toujours affiché à côté de ce qu'il reste à payer (jamais le prix après aide seul). Pour les services à domicile et les artisans de la rénovation. Les tarifs, le nom de l'aide, ses conditions et le numéro de déclaration ou la qualification viennent du client : « [À compléter] » sinon. Exemple : une entreprise de ménage à domicile.",
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 800 },
    html: `<section class="tn tn-aides"><h2>Ce que vous payez vraiment.</h2><p>Nos prestations ouvrent droit à une aide. Nous affichons toujours le prix plein, puis ce qu'il vous reste à payer.</p><ul class="tn-comptes"><li><b>Ménage à domicile</b><span><em>Prix plein, l'heure</em><i>[À compléter]</i></span><span><em>Aide déduite</em><i>[À compléter]</i></span><span class="tn-reste"><em>Il vous reste à payer</em><i>[À compléter]</i></span></li><li><b>Repassage</b><span><em>Prix plein, l'heure</em><i>[À compléter]</i></span><span><em>Aide déduite</em><i>[À compléter]</i></span><span class="tn-reste"><em>Il vous reste à payer</em><i>[À compléter]</i></span></li></ul><div class="tn-liste">${VOLET("Quelle aide, et pour qui&nbsp;?", "[À compléter : nom de l'aide et conditions pour y avoir droit]", true)}${VOLET("Notre déclaration", "[À compléter : numéro de déclaration ou qualification en cours de validité]")}</div></section>`,
  }),
  sec({
    id: "tn-rdv", title: "Demande de rendez-vous", kind: "Rendez-vous · accueil et page rendez-vous", role: "services", pour: "services",
    does: "Un vrai formulaire, sans script, pour demander un rendez-vous : la prestation (liste déroulante), le jour souhaité, le matin ou l'après-midi, le nom, le téléphone. C'est une DEMANDE : le professionnel la confirme lui-même, et la section le dit ; elle ne promet aucun créneau. Les prestations de la liste viennent de la rubrique Prestations et Rendez-vous. Exemple : un salon de coiffure.",
    data: "les prestations de la rubrique Prestations et Rendez-vous (liste déroulante)",
    constructions: [
      { key: "colonne", label: "une seule colonne, sous une bande de photo du lieu" },
      { key: "photo", label: "le formulaire à côté d'une grande photo du lieu dans le cadre de la marque" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 860 },
    html: `<section class="tn tn-rdv"><div class="tn-ph" ${ph("be-conseil.jpg")}></div><h2>Prends rendez-vous.</h2><p>Dis-nous ce qui te ferait plaisir et quand tu es libre. Nous te rappelons pour fixer l'heure.</p><form onsubmit="return false"><label class="tn-choix"><span>La prestation</span><select name="prestation" data-tn-prestations-choix><option>Coupe et coiffage</option><option>Coupe, soin et coiffage</option><option>Couleur complète</option><option>Balayage</option></select></label><label><span>Le jour souhaité</span><input type="date" name="jour" required></label><div class="tn-moment" role="radiogroup" aria-label="Le matin ou l'après-midi"><span>Plutôt</span><label><input type="radio" name="moment" value="matin" checked><span>Le matin</span></label><label><input type="radio" name="moment" value="apres-midi"><span>L'après-midi</span></label></div><label><span>Ton prénom et ton nom</span><input type="text" name="nom" autocomplete="name" required></label><label><span>Ton téléphone</span><input type="tel" name="telephone" autocomplete="tel" required></label><button type="submit" class="tn-bt">Envoyer ma demande</button><p class="tn-note">C'est une demande : le salon te rappelle pour confirmer le jour et l'heure.</p></form></section>`,
  }),
  sec({
    id: "tn-devis", title: "Demande de devis", kind: "Devis · accueil et page devis", role: "services", pour: "services",
    does: "Un vrai formulaire, sans script, pour demander un devis : les travaux (liste déroulante), la ville du chantier, le nom, le téléphone. Court par défaut (quatre champs) ; en trois étapes numérotées quand le professionnel a besoin d'en savoir plus avant de rappeler. La demande part chez le professionnel, qui rappelle : la section ne promet ni prix ni délai, et dit si le devis est gratuit seulement si le client l'a écrit. Exemple : un peintre en bâtiment.",
    constructions: [
      { key: "courte", label: "quatre champs seulement, à côté du titre sur ordinateur" },
      { key: "etapes", label: "trois étapes numérotées (le projet, le lieu, les coordonnées), avec la description et le type de logement" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 640 },
    html: `<section class="tn tn-devis"><h2>Parlez-nous<br>de vos murs.</h2><p>Quelques lignes suffisent. Nous vous rappelons pour convenir d'une visite, puis vous recevez un devis écrit et détaillé.</p><form onsubmit="return false"><div class="tn-etape"><h3>Votre projet</h3><label class="tn-choix"><span>Les travaux</span><select name="travaux"><option>Peinture intérieure</option><option>Peinture extérieure, façade</option><option>Enduits et plâtrerie</option><option>Papier peint</option></select></label><label class="tn-plus"><span>Quelques mots sur le chantier (facultatif)</span><textarea name="description" rows="3"></textarea></label></div><div class="tn-etape"><h3>Le lieu</h3><label><span>La ville du chantier</span><input type="text" name="ville" autocomplete="address-level2" required></label><div class="tn-moment tn-plus" role="radiogroup" aria-label="Le type de logement"><span>C'est</span><label><input type="radio" name="logement" value="maison" checked><span>Une maison</span></label><label><input type="radio" name="logement" value="appartement"><span>Un appartement</span></label></div></div><div class="tn-etape"><h3>Vos coordonnées</h3><label><span>Votre nom</span><input type="text" name="nom" autocomplete="name" required></label><label><span>Votre téléphone</span><input type="tel" name="telephone" autocomplete="tel" required></label></div><button type="submit" class="tn-bt">Demander mon devis</button><p class="tn-note">Le devis : [À compléter : gratuit ou payant, délai de réponse]</p></form></section>`,
  }),
  sec({
    id: "tn-disponibilites", title: "Vérifier une date ou un séjour", kind: "Réservation · accueil et page d'une chambre", role: "services", pour: "services",
    does: "Le visiteur donne sa date, ou ses dates d'arrivée et de départ, et envoie sa demande : pour un gîte, des chambres d'hôtes, un photographe, un métier du mariage. Vrai formulaire sans script. C'est une DEMANDE : rien n'est réservé tant que le professionnel n'a pas répondu, et la section le dit. Les conditions d'annulation viennent du client. Exemple : des chambres d'hôtes.",
    constructions: [
      { key: "barre", label: "la photo du lieu en bande, la boîte des dates posée à cheval dessus, comme sur le site d'un hôtel" },
      { key: "fiche", label: "le formulaire à côté de la photo de la chambre, dans le cadre de la marque" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 860 },
    html: `<section class="tn tn-disponibilites"><div class="tn-ph" ${ph("im-chambre.jpg")}></div><h2>Vos dates.</h2><p>Dites-nous quand vous aimeriez venir. Nous regardons le calendrier et nous vous répondons nous-mêmes.</p><form onsubmit="return false"><div class="tn-dates"><label><span>Arrivée</span><input type="date" name="arrivee" required></label><label><span>Départ</span><input type="date" name="depart" required></label><label><span>Voyageurs</span><input type="number" name="voyageurs" min="1" inputmode="numeric" required></label></div><label><span>Votre nom</span><input type="text" name="nom" autocomplete="name" required></label><label><span>Votre e-mail ou votre téléphone</span><input type="text" name="contact" required></label><button type="submit" class="tn-bt">Vérifier ces dates</button><p class="tn-note">C'est une demande : rien n'est réservé tant que nous ne vous avons pas répondu. Annulation : [À compléter : conditions]</p></form></section>`,
  }),
  sec({
    id: "tn-agenda", title: "Prochaines dates", kind: "Agenda · accueil et page ateliers", role: "services", pour: "services",
    does: "Les prochaines dates (ateliers, groupes, stages, séjours à thème), chacune avec son titre, une phrase, les places restantes et le lien d'inscription. Preuve que le lieu vit. Les dates, les heures et les places sont celles que le client donne : « [À compléter] » sinon, jamais une date inventée ; une date passée se retire. Exemple : un cabinet de sophrologie.",
    data: "les prochaines dates données par le client (titre, date, heure, places)",
    constructions: [
      { key: "liste", label: "une liste à traits, la date en tête de chaque ligne" },
      { key: "prochain", label: "la prochaine date en grand dans un bloc de couleur douce, les suivantes en liste dessous" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 700 },
    html: `<section class="tn tn-agenda"><h2>Les prochains ateliers.</h2><p>En petit groupe, au cabinet. On vient comme on est, on repart plus léger.</p><ul class="tn-dates-a" data-tn-agenda><li><small>[À compléter : date et heure]</small><b>Respirer avant de dormir</b><span>Trois respirations simples, à refaire chez soi le soir.</span><i>Places restantes : [À compléter]</i><a ${LIEN} data-go="reservation">M'inscrire</a></li><li><small>[À compléter : date et heure]</small><b>Apprivoiser le trac</b><span>Avant un examen, un entretien, une prise de parole.</span><i>Places restantes : [À compléter]</i><a ${LIEN} data-go="reservation">M'inscrire</a></li><li><small>[À compléter : date et heure]</small><b>La pause de midi</b><span>Relâcher les épaules et la tête, entre deux réunions.</span><i>Places restantes : [À compléter]</i><a ${LIEN} data-go="reservation">M'inscrire</a></li></ul></section>`,
  }),
  sec({
    id: "tn-planning", title: "Planning de la semaine", kind: "Planning · accueil et page planning", role: "services", pour: "services",
    does: "Les cours ou les créneaux de la semaine, jour par jour, écrits en texte (jamais posés en image) : l'heure, le cours, le niveau. Pour un studio, une salle, une école, un club. Les créneaux viennent du client : une heure absente reste « [À compléter] ». Exemple : un studio de yoga.",
    constructions: [
      { key: "lignes", label: "un jour par ligne, le nom du jour à gauche, ses cours à droite" },
      { key: "colonnes", label: "un bloc par jour sur fond doux, côte à côte : deux par ligne sur téléphone, toute la semaine en colonnes sur ordinateur" },
    ],
    trait: { fond: "clair", densite: "dense", photos: 0, hauteur: 980 },
    html: `<section class="tn tn-planning"><h2>La semaine au studio.</h2><p>Choisis ton cours, viens un peu en avance : le tapis t'attend.</p><div class="tn-semaine" data-tn-planning><div class="tn-jour"><h3>Lundi</h3><ul><li><small>[À compléter : heure]</small><b>Yoga doux</b><span>Tous niveaux</span></li><li><small>[À compléter : heure]</small><b>Vinyasa</b><span>Niveau intermédiaire</span></li></ul></div><div class="tn-jour"><h3>Mardi</h3><ul><li><small>[À compléter : heure]</small><b>Yoga du matin</b><span>Tous niveaux</span></li></ul></div><div class="tn-jour"><h3>Mercredi</h3><ul><li><small>[À compléter : heure]</small><b>Yin</b><span>Tous niveaux</span></li><li><small>[À compléter : heure]</small><b>Pilates</b><span>Débutants</span></li></ul></div><div class="tn-jour"><h3>Jeudi</h3><ul><li><small>[À compléter : heure]</small><b>Vinyasa</b><span>Niveau intermédiaire</span></li></ul></div><div class="tn-jour"><h3>Vendredi</h3><ul><li><small>[À compléter : heure]</small><b>Yoga doux</b><span>Tous niveaux</span></li></ul></div><div class="tn-jour"><h3>Samedi</h3><ul><li><small>[À compléter : heure]</small><b>L'atelier du samedi</b><span>Sur inscription</span></li></ul></div></div><a class="tn-bt" ${LIEN} data-go="reservation">Réserver un cours</a></section>`,
  }),
  sec({
    id: "tn-retrait", title: "Commande à retirer", kind: "Commande · accueil et page à emporter", role: "restaurant", pour: "services", only: "restaurants, traiteurs, boulangeries",
    does: "Le visiteur choisit ses plats ou ses produits et leur quantité, puis le jour et le moment où il passe les prendre. Vrai formulaire sans script : la commande part chez le professionnel, qui la confirme ; rien n'est payé en ligne. Les plats, leurs prix et les créneaux de retrait viennent du client : « [À compléter] » sinon. Exemple : un restaurant.",
    trait: { fond: "clair", densite: "moyenne", photos: 2, hauteur: 900 },
    html: `<section class="tn tn-retrait"><h2>À emporter.</h2><p>Choisissez, dites-nous quand vous passez : votre commande vous attend au comptoir.</p><form onsubmit="return false"><ul class="tn-plats" data-tn-retrait><li><i class="tn-ph" ${ph("rs-poisson.jpg")}></i><b>Le poisson du jour</b><span>Légumes de saison, beurre citronné.</span><em>[À compléter : prix]</em><label class="tn-qte"><span>Quantité</span><input type="number" name="poisson" min="0" value="0" inputmode="numeric"></label></li><li><i class="tn-ph" ${ph("rs-carottes.jpg")}></i><b>Les carottes rôties</b><span>Miel, thym, noisettes.</span><em>[À compléter : prix]</em><label class="tn-qte"><span>Quantité</span><input type="number" name="carottes" min="0" value="0" inputmode="numeric"></label></li></ul><label><span>Le jour du retrait</span><input type="date" name="jour" required></label><div class="tn-moment" role="radiogroup" aria-label="Le midi ou le soir"><span>Vous passez</span><label><input type="radio" name="moment" value="midi" checked><span>Le midi</span></label><label><input type="radio" name="moment" value="soir"><span>Le soir</span></label></div><label><span>Votre nom</span><input type="text" name="nom" autocomplete="name" required></label><label><span>Votre téléphone</span><input type="tel" name="telephone" autocomplete="tel" required></label><button type="submit" class="tn-bt">Envoyer ma commande</button><p class="tn-note">Créneaux de retrait : [À compléter]<br>Paiement : [À compléter]<br>Le restaurant vous confirme la commande.</p></form></section>`,
  }),
  sec({
    id: "tn-vitrine", title: "La vitrine du jour", kind: "Du jour · accueil", role: "restaurant", pour: "services", only: "boulangeries et pâtisseries",
    does: "Les pains et les pâtisseries du jour avec leurs heures de fournée, écrits comme sur l'ardoise de la boutique : ce qui sort du four, et quand. La gamme et les heures de fournée viennent du client : « [À compléter] » sinon. Section sombre, sans photo. Exemple : une boulangerie.",
    trait: { fond: "sombre", densite: "moyenne", photos: 0, hauteur: 640 },
    html: `<section class="tn tn-vitrine tn-sombre"><div class="tn-ardoise"><h2>Aujourd'hui<br>au fournil.</h2><ul class="tn-fournees" data-tn-vitrine><li><b>La baguette de tradition</b><span>Croûte dorée, mie crème.</span><small>Fournées : [À compléter : heures]</small></li><li><b>Le pain de campagne</b><span>Au levain, croûte épaisse.</span><small>Fournées : [À compléter : heures]</small></li><li><b>Le croissant au beurre</b><span>Feuilleté du matin.</span><small>Fournées : [À compléter : heures]</small></li><li><b>La tarte du moment</b><span>[À compléter : le fruit de saison]</span><small>Fournées : [À compléter : heures]</small></li></ul><p>Pour mettre un pain de côté : <a ${LIEN} data-tn-tel>[À compléter : téléphone]</a></p></div></section>`,
  }),
  sec({
    id: "tn-origines", title: "Origine des viandes", kind: "Information · page carte", role: "restaurant", pour: "services", only: "restaurants",
    does: "Le tableau des viandes servies et de leur pays d'origine (né, élevé, abattu), que le restaurant doit à ses clients. Sobre, sous la carte. Les origines viennent du client, viande par viande : « [À compléter] » sinon, jamais un pays supposé. Exemple : un restaurant.",
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 520 },
    html: `<section class="tn tn-origines"><h2>D'où vient la viande.</h2><p>Viande par viande, le pays où l'animal est né, a été élevé et abattu.</p><table data-tn-origines><thead><tr><th><small>Viande</small></th><th><small>Né, élevé, abattu</small></th></tr></thead><tbody><tr><th>Bœuf</th><td>[À compléter : pays]</td></tr><tr><th>Veau</th><td>[À compléter : pays]</td></tr><tr><th>Agneau</th><td>[À compléter : pays]</td></tr><tr><th>Volaille</th><td>[À compléter : pays]</td></tr></tbody></table><p class="tn-note">Carte du [À compléter : date de la carte]</p></section>`,
  }),
  sec({
    id: "tn-realisations", title: "Les réalisations en photos", kind: "Preuves · accueil et page réalisations", role: "services", pour: "services",
    does: "Les chantiers ou les réalisations du professionnel en photos, chacune avec sa légende vraie : le type de chantier, ce qui a été fait, la ville. La preuve par l'image, avant les avis. Les photos sont celles du client d'abord ; s'il n'en a pas assez, SINA les crée, sans personne reconnaissable. La ville reste « [À compléter] » tant que le client ne l'a pas donnée. Exemple : un électricien.",
    data: "les réalisations du client (photo, titre, ce qui a été fait, ville)",
    constructions: [
      { key: "grille", label: "une grille de photos dans le cadre de la marque, la légende sous chacune" },
      { key: "bandes", label: "de grandes bandes de photo l'une sous l'autre, la légende à côté ou dessous" },
      { key: "detail", label: "une réalisation en grand avec son récit, les autres en petites vignettes dessous" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 4, hauteur: 760 },
    html: `<section class="tn tn-realisations"><h2>Nos derniers chantiers.</h2><p>De la lumière posée chez des gens d'ici, pièce après pièce.</p><div class="tn-galerie" data-tn-realisations><figure><div class="tn-ph tn-cadre" ${ph("sv-cuisine.jpg")}></div><figcaption><b>Cuisine ouverte</b><span>Suspensions au-dessus de l'îlot, spots encastrés, variateurs.</span><small>[À compléter : ville]</small></figcaption></figure><figure><div class="tn-ph tn-cadre" ${ph("sv-sdb.jpg")}></div><figcaption><b>Salle de bains</b><span>Miroir rétroéclairé, éclairage de la douche.</span><small>[À compléter : ville]</small></figcaption></figure><figure><div class="tn-ph tn-cadre" ${ph("sv-exterieur.jpg")}></div><figcaption><b>Allée du jardin</b><span>Bornes basses et appliques, allumage au crépuscule.</span><small>[À compléter : ville]</small></figcaption></figure><figure><div class="tn-ph tn-cadre" ${ph("sv-spots.jpg")}></div><figcaption><b>Séjour</b><span>Corniche lumineuse et spots orientables.</span><small>[À compléter : ville]</small></figcaption></figure></div><a class="tn-bt" ${LIEN} data-go="devis">Parler de votre projet</a></section>`,
  }),
  sec({
    id: "tn-avant-apres", title: "Avant et après, côte à côte", kind: "Preuves · accueil et page d'une réalisation", role: "services", pour: "services",
    does: "Deux photos de la même pièce, prises du même angle : avant les travaux, après. Sans script : les deux photos se regardent côte à côte. Photos du client d'abord (avec l'accord écrit de la personne si on la reconnaît) ; à défaut, SINA les crée. La légende dit le chantier et la ville, « [À compléter] » si le client ne les a pas donnés. Exemple : la rénovation d'un séjour.",
    constructions: [
      { key: "cote-a-cote", label: "les deux photos côte à côte, de même taille, chacune avec son étiquette" },
      { key: "incruste", label: "la photo « après » en grand, la photo « avant » en vignette posée sur son coin" },
    ],
    trait: { fond: "clair", densite: "aérée", photos: 2, hauteur: 520 },
    html: `<section class="tn tn-avant-apres"><h2>Avant, après.</h2><p>Même pièce, même angle. Seule la lumière a changé.</p><div class="tn-paire"><figure class="tn-avant"><div class="tn-ph" ${ph("sv-avant.jpg")}></div><figcaption><small>Avant</small></figcaption></figure><figure class="tn-apres"><div class="tn-ph" ${ph("sv-apres.jpg")}></div><figcaption><small>Après</small></figcaption></figure></div><div class="tn-legende"><b>Séjour et cuisine ouverte</b><span>Éclairage repensé, suspensions, bandeau lumineux au plafond.</span><small>[À compléter : ville et durée du chantier]</small></div></section>`,
  }),
  sec({
    id: "tn-equipe", title: "L'équipe", kind: "Équipe · accueil et page à propos", role: "services", pour: "services",
    authentic: "ton équipe",
    does: "Les personnes que le client va rencontrer : leur prénom, ce qu'elles font. Les vraies personnes seulement : prénoms et photos viennent du client, jamais inventés ni créés. Sans photos, la première construction écrit les prénoms en grand. Exemple : un salon de coiffure.",
    data: "les prénoms et les spécialités donnés par le client",
    constructions: [
      { key: "noms", label: "sans photo : les prénoms en très grand, le métier de chacun dessous" },
      { key: "photos", label: "le portrait de chacun dans le cadre de la marque, son prénom et son métier" },
    ],
    trait: { fond: "clair", densite: "aérée", photos: 3, hauteur: 560 },
    html: `<section class="tn tn-equipe"><h2>Celles et ceux<br>qui te coiffent.</h2><p>Tu retrouves la même personne d'un rendez-vous à l'autre, si tu le souhaites.</p><ul class="tn-membres" data-tn-equipe><li><div class="tn-ph tn-cadre" ${ph("be-coupe.jpg")}></div><b>[À compléter : prénom]</b><span>Coupe et coiffage</span></li><li><div class="tn-ph tn-cadre" ${ph("be-salon.jpg")}></div><b>[À compléter : prénom]</b><span>Couleur et balayage</span></li><li><div class="tn-ph tn-cadre" ${ph("be-conseil.jpg")}></div><b>[À compléter : prénom]</b><span>Barbe et coupe homme</span></li></ul></section>`,
  }),
  sec({
    id: "tn-zone", title: "La zone d'intervention", kind: "Zone · accueil et page zone", role: "services", pour: "services",
    does: "Où le professionnel se déplace : la liste des villes desservies, avec une vue de la ville ou de la région. Répond à la première question d'un client d'artisan ou de service à domicile : « venez-vous chez moi ? ». Les villes viennent du client, une par ligne : « [À compléter] » sinon, jamais une ville supposée. La photo est une vue du pays (une rue, des toits, un paysage), jamais une carte : une carte ne s'invente pas. Une seule page de zone, pas une page par ville. Exemple : un électricien.",
    data: "les villes desservies et le téléphone du projet",
    constructions: [
      { key: "vue", label: "une vue de la ville ou de la région d'abord, dans le cadre de la marque, puis les villes en liste sur deux colonnes" },
      { key: "villes", label: "les villes en très grand, l'une sous l'autre, la vue de la région ensuite" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 700 },
    html: `<section class="tn tn-zone"><h2>Nous venons<br>jusqu'à vous.</h2><p>Voici les villes où nous intervenons. La vôtre n'y est pas&nbsp;? Appelez : on vous répond franchement.</p><div class="tn-ph" ${ph("im-quartier.jpg")}></div><ul class="tn-villes" data-tn-zone="villes"><li>[À compléter : ville]</li><li>[À compléter : ville]</li><li>[À compléter : ville]</li><li>[À compléter : ville]</li></ul><a class="tn-tel" ${LIEN} data-tn-tel>[À compléter : téléphone]</a></section>`,
  }),
  sec({
    id: "tn-acces", title: "Horaires et accès", kind: "Infos pratiques · accueil et page contact", role: "services", pour: "services",
    does: "Tout pour venir : une photo du lieu, les horaires jour par jour, l'adresse, le bouton d'itinéraire (il ouvre la vraie carte, à l'adresse du client), le téléphone, et ce qu'il faut savoir sur place (se garer, étage, accès en fauteuil, transports). Jamais un plan en image : un plan ne s'invente pas. Les horaires et l'adresse viennent du projet ; ce qui manque s'écrit « [À compléter] ». Mêmes nom, adresse et téléphone que partout ailleurs sur le site. Exemple : un restaurant.",
    data: "les horaires et l'adresse du projet",
    constructions: [
      { key: "lieu", label: "la photo du lieu d'abord, dans le cadre de la marque, puis l'adresse, le bouton d'itinéraire, les horaires" },
      { key: "horaires", label: "les horaires en grand dans un bloc de couleur douce, puis l'adresse et la photo du lieu" },
    ],
    trait: { fond: "clair", densite: "dense", photos: 1, hauteur: 980 },
    html: `<section class="tn tn-acces"><h2>Venir nous voir.</h2><div class="tn-ph" ${ph("rs-salle.jpg")}></div><div class="tn-lieu"><address data-tn-adresse>[À compléter : adresse]</address><a class="tn-bt" ${LIEN} data-tn-itineraire>Voir l'itinéraire</a><a class="tn-tel" ${LIEN} data-tn-tel>[À compléter : téléphone]</a></div><div class="tn-heures"><h3>Les horaires</h3><table data-tn-horaires="jours"><tbody><tr><th>Lundi</th><td>[À compléter]</td></tr><tr><th>Mardi</th><td>[À compléter]</td></tr><tr><th>Mercredi</th><td>[À compléter]</td></tr><tr><th>Jeudi</th><td>[À compléter]</td></tr><tr><th>Vendredi</th><td>[À compléter]</td></tr><tr><th>Samedi</th><td>[À compléter]</td></tr><tr><th>Dimanche</th><td>[À compléter]</td></tr></tbody></table></div><ul class="tn-pratique"><li><small>Se garer</small><span>[À compléter : parking le plus proche]</span></li><li><small>Sur place</small><span>[À compléter : étage, ascenseur, accès en fauteuil]</span></li><li><small>Transports</small><span>[À compléter : arrêt le plus proche]</span></li></ul></section>`,
  }),
  sec({
    id: "tn-deroule", title: "Comment ça se passe", kind: "Déroulé · accueil et page d'une prestation", role: "services", pour: "services",
    does: "Les étapes dans l'ordre, du premier contact à la fin : ce que le client fait, ce que le professionnel fait. Lève l'appréhension avant un chantier, un premier rendez-vous, une première séance. C'est une vraie suite d'étapes : les numéros y sont à leur place. Le vrai déroulé du client, sans délai ni promesse qu'il n'a pas donnés. Exemple : un électricien.",
    constructions: [
      { key: "chiffres", label: "les étapes l'une sous l'autre, un grand chiffre devant chacune" },
      { key: "frise", label: "une frise : des pastilles numérotées reliées par un trait (en ligne sur ordinateur)" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 700 },
    html: `<section class="tn tn-deroule"><h2>Comment ça se passe.</h2><ol class="tn-etapes"><li><b>Vous nous appelez</b><p>Vous décrivez le besoin. On vous dit tout de suite si c'est pour nous.</p></li><li><b>On vient voir</b><p>Une visite sur place pour regarder le tableau, mesurer, comprendre vos habitudes.</p></li><li><b>Vous recevez le devis</b><p>Écrit, ligne par ligne. Délai d'envoi : [À compléter]</p></li><li><b>On fait le chantier</b><p>On pose, on teste chaque circuit avec vous, on nettoie avant de partir.</p></li></ol><a class="tn-bt" ${LIEN} data-go="devis">Demander un devis</a></section>`,
  }),
  sec({
    id: "tn-urgence", title: "Bandeau d'appel", kind: "Appel · accueil et toutes les pages", role: "services", pour: "services",
    does: "Un bandeau sombre qui ne dit qu'une chose : appelez. Le numéro en très grand, qui s'appelle d'un toucher, et les jours et heures où le professionnel répond vraiment (jamais « 24 h sur 24 » si ce n'est pas vrai). Pour le dépannage, l'urgence, les métiers où l'on appelle d'abord. Le numéro vient du projet. Exemple : un électricien.",
    data: "le téléphone du projet",
    trait: { fond: "sombre", densite: "aérée", photos: 0, hauteur: 380 },
    html: `<section class="tn tn-urgence tn-sombre"><h2>Plus de courant&nbsp;?</h2><p>Appelez. On vous dit tout de suite quand on peut passer.</p><a class="tn-tel" ${LIEN} data-tn-tel>[À compléter : téléphone]</a><small data-tn-horaires="ligne">[À compléter : jours et heures où vous répondez]</small><a class="tn-suite" ${LIEN} data-go="contact">Ou demandez à être rappelé</a></section>`,
  }),
  sec({
    id: "tn-labels", title: "Qualifications et assurances", kind: "Confiance · accueil et page à propos", role: "confiance", pour: "services",
    does: "Les preuves vérifiables du professionnel : son assurance (assureur, numéro de contrat, zone couverte), ses qualifications en cours de validité, ce qu'il garantit après les travaux, son immatriculation. Uniquement ce que le client détient et peut justifier : chaque ligne reste « [À compléter] » tant qu'il ne l'a pas fournie, et une ligne sans preuve se retire. Jamais le logo d'un label qu'il n'a pas. Exemple : un artisan du bâtiment.",
    constructions: [
      { key: "lignes", label: "une ligne par preuve, son nom à gauche, ses références à droite" },
      { key: "pieces", label: "une pièce encadrée par preuve, comme des attestations posées côte à côte" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 560 },
    html: `<section class="tn tn-labels"><h2>Nos preuves,<br>pièces à l'appui.</h2><p>Rien n'est affiché ici sans son justificatif. Demandez-les avant de signer : c'est votre droit.</p><ul class="tn-pieces"><li><b>Assurance</b><span>[À compléter : assureur, numéro de contrat, zone couverte]</span></li><li><b>Qualification</b><span>[À compléter : qualification en cours de validité et son numéro]</span></li><li><b>Après le chantier</b><span>[À compléter : garanties données sur les travaux]</span></li><li><b>Entreprise</b><span>[À compléter : numéro d'immatriculation, année de création]</span></li></ul></section>`,
  }),
  sec({
    id: "tn-vendus", title: "Vendus récemment", kind: "Preuves · accueil de l'agence", role: "immobilier", pour: "services", only: "agences immobilières",
    authentic: "tes biens vendus",
    does: "Les biens que l'agence vient de vendre ou de louer : pour un propriétaire qui hésite, la preuve que l'agence vend. Les vrais biens seulement, avec l'accord des clients : photos, ville et délai de vente viennent de l'agence, jamais inventés. Un bien vendu ne reste jamais parmi les biens à vendre. Exemple : une agence immobilière.",
    data: "les biens vendus de l'agence (photo, type de bien, ville, délai de vente)",
    constructions: [
      { key: "cartes", label: "le dernier bien vendu en grand, les autres en cartes dessous, l'étiquette « Vendu » sur chaque photo" },
      { key: "lignes", label: "une ligne par bien : sa vignette à gauche, le bien, la ville et le délai à droite" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 3, hauteur: 760 },
    html: `<section class="tn tn-vendus"><h2>Vendus récemment.</h2><p>Les dernières ventes de l'agence, près de chez vous.</p><ul class="tn-biens" data-tn-vendus><li><div class="tn-ph tn-cadre" ${ph("im-1.jpg")}><i>Vendu</i></div><b>Maison de village</b><span>[À compléter : ville, quartier]</span><small>[À compléter : délai de vente]</small></li><li><div class="tn-ph tn-cadre" ${ph("im-salon.jpg")}><i>Vendu</i></div><b>Appartement traversant</b><span>[À compléter : ville, quartier]</span><small>[À compléter : délai de vente]</small></li><li><div class="tn-ph tn-cadre" ${ph("im-maison.jpg")}><i>Vendu</i></div><b>Mas et son jardin</b><span>[À compléter : ville, quartier]</span><small>[À compléter : délai de vente]</small></li></ul><a class="tn-bt" ${LIEN} data-go="contact">Faire estimer mon bien</a></section>`,
  }),
];
