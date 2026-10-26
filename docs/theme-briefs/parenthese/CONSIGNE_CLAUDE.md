# Claude — PARENTHÈSE : reproduire les six maquettes et leurs fonctions

## Mission demandée par Thomas — 24 octobre 2026

Créer le thème complet **Parenthèse**, cabinet de sophrologie, dans E-COM STUDIO IA, famille **Prestations de services**. Reproduire les six planches jointes au plus près, page par page, ordinateur et téléphone, avec toutes les interactions montrées. Thomas veut le même thème : il ne demande ni une nouvelle direction graphique ni une version simplifiée.

Utiliser le modèle convenu avec Thomas et un effort élevé si disponible ; annoncer le réglage réellement utilisé sans prétendre modifier un réglage inaccessible.

Lire les instructions actuelles du dépôt, puis ouvrir réellement les **six PNG de ce dossier**. Ce sont des planches contenant plusieurs pages et états, pas simplement six pages. La recette doit couvrir chaque écran de chaque planche. Ne jamais utiliser une capture de page entière comme site : reconstruire les composants, textes et interactions éditables.

## Sources à utiliser

| Planche | Fichier original | Écrans représentés |
| --- | --- | --- |
| 1 | [01-seances.png](maquettes/01-seances.png) | Séances individuelles, première séance, visioconférence, téléphone |
| 2 | [02-accueil.png](maquettes/02-accueil.png) | Accueil complet ordinateur et téléphone |
| 3 | [03-ateliers.png](maquettes/03-ateliers.png) | Liste d’ateliers, détail d’atelier, entreprises, téléphone |
| 4 | [04-reservation.png](maquettes/04-reservation.png) | Prestation, date/heure, coordonnées, confirmation cabinet et visio, téléphone |
| 5 | [05-approche-journal-cabinet.png](maquettes/05-approche-journal-cabinet.png) | Approche, journal, article, cabinet |
| 6 | [06-contact-faq-legales.png](maquettes/06-contact-faq-legales.png) | Contact, FAQ, retrouver/gérer un rendez-vous, modification/annulation, légal, cookies, 404 |

**Thomas t’envoie lui-même le ZIP `PARENTHESE_42_IMAGES_HD.zip` séparément dans votre conversation. Il n’est pas joint à GitHub.** Ne pas lui redemander les maquettes : elles sont accessibles ici. Si le ZIP n’est pas encore reçu, avancer sur structure et interactions ; son absence empêche seulement la validation finale des médias.

Le ZIP contient `PARENTHESE_IMAGES_HD/images/` (42 PNG séparés, sans interface), `CATALOGUE.html`, `INVENTAIRE.csv`, `PROMPTS.json`, `LIRE-MOI.txt` et les six maquettes originales. SHA-256 du ZIP : `fde197fa62e63175195420320affcacfb320a6113db327f82721e3360bf330d0`.

Les 42 photos ont été **recréées à partir des maquettes** ; ce ne sont pas les fichiers photographiques sources exacts de ces maquettes. Leurs sujets, matières et ambiances sont cohérents, mais certains détails diffèrent. Dimensions natives selon le fichier : 1536×1024, 1672×940/941, 1122×1402, 1024×1536 ou 1254×1254. Ne pas les présenter comme des sources 4K ou des copies identiques au pixel près. La maquette reste la référence de composition ; utiliser la photo appropriée du ZIP avec un cadrage fidèle. Toute différence importante se documente, jamais de remplacement générique silencieux.

Le fichier [INVENTAIRE_IMAGES.csv](INVENTAIRE_IMAGES.csv) est la copie du tableau d’affectation du ZIP. [INVENTAIRE_MAQUETTES.md](INVENTAIRE_MAQUETTES.md) identifie les six originaux et leurs empreintes. Les photos sont des médias, pas des modèles de page : n’y incruster aucun titre ou bouton.

## Direction visuelle obligatoire

- Identité éditoriale calme et lumineuse : ivoire chaud, sauge, vert forêt, accent abricot ; chêne clair, lin, céramiques, plantes et lumière naturelle. Conserver la richesse des compositions, les grands visuels et les respirations.
- Reprendre l’ordre des sections, leur densité, les proportions photo/texte, les panneaux colorés, les formats de cartes, les rayons, les espacements, les contours, les filets courbes et les ornements botaniques visibles. Recréer les ornements en SVG/CSS si nécessaire, sans les transformer en grosses illustrations décoratives.
- Titres serif élégants, textes de lecture sobres ; ajuster tailles, interlignage et largeur des lignes en comparant aux planches. Deux familles typographiques cohérentes, avec droits documentés. Pas de typographie générique imposée au détriment de la référence.
- Harmoniser le logo et l’en-tête sur **la planche d’accueil 02**. Les images générées présentent quelques variantes de signe/logo/footer entre pages : choisir une identité commune, préserver les compositions propres aux pages, consigner les arbitrages. Ne pas modifier les six références pour cacher les écarts.
- Reprendre les textes des maquettes en corrigeant uniquement les coquilles/artefacts de génération. Ne pas remplacer les blocs par du contenu marketing générique. Pas d’avis, diplômes, identité de praticien, statistiques ni coordonnées inventés.
- Les textes, images, couleurs, prestations, tarifs et informations pratiques doivent être modifiables avec les mécanismes existants du studio, sans réécrire le code du thème.
- Téléphone : respecter les vues fournies, les recadrages qui gardent le sujet lisible, l’ordre des blocs, les menus, accordéons et barres de réservation. Aucun contenu masqué sous une barre fixe, aucune sortie horizontale, aucun titre ou CTA coupé. Les pages sans vue mobile doivent conserver la même qualité.

## Pages et comportements attendus

### Accueil — planche 02

En-tête et menu mobile ; grande ouverture « Un temps pour souffler. Une place pour vous. » ; trois cartes de besoins ; présentation de la sophrologie ; séance individuelle et atelier ; cabinet ; trois étapes du premier rendez-vous ; approche ; conseils ; FAQ ; appel à prendre rendez-vous ; pied complet.

Chaque carte mène à une page adaptée et chaque CTA à la bonne prestation ou liste. Conserver tous les blocs, y compris ceux sous la première hauteur d’écran. Menu, FAQ et réservation doivent fonctionner au clavier et au toucher.

### Séances — planche 01

Page séances individuelles avec distinction cabinet/visio et première séance/suivi ; première séance détaillée avec durée, tarif indicatif, déroulement, informations pratiques, FAQ et réservation ; page visioconférence avec préparation, étapes, matériel et confidentialité.

Un CTA transmet au parcours de réservation le bon type de séance et la bonne modalité. La modalité visio ne doit pas afficher par erreur une adresse de cabinet comme lieu du rendez-vous.

### Ateliers et entreprises — planche 03

Liste avec filtres date/thème, remise à zéro et état sans résultat ; cartes avec sujet, durée, prix, lieu et accès au bon détail. Fiche avec programme, informations pratiques, places disponibles, réservation, FAQ et ateliers liés. Page entreprises avec formats, bénéfices formulés sans promesse de résultat et formulaire de demande.

Les places/compteurs viennent des données, pas d’un chiffre décoratif. Une disponibilité d’exemple est explicitement une démonstration. Ne pas conserver des dates anciennes, des jours de semaine erronés ou des incohérences entre carte et fiche : les exemples doivent être générés à partir d’un même jeu de données configurable.

### Réservation — planche 04

Parcours complet prestation → modalité cabinet/visio → date et heure → coordonnées → récapitulatif et confirmation. Étape active visible ; précédent/suivant sans perdre les choix ; validation des champs (conditions de réservation obligatoires, newsletter optionnelle distincte et décochée) ; calendrier navigable ; créneaux cohérents ; tarif et durée identiques partout ; indisponibilités et erreur gérées ; prévention des doubles soumissions.

Préserver les deux variantes de confirmation, cabinet et visioconférence. Ajouter à l’agenda doit produire un vrai fichier calendrier cohérent. Le lien « Gérer mon rendez-vous » ouvre un parcours utilisable.

**Démo :** permettre de tester les étapes et les changements avec des données fictives isolées, et marquer clairement la simulation. Ne jamais annoncer une réservation réelle enregistrée, un e-mail envoyé ou un lien privé reçu sans confirmation du service correspondant. Ne pas collecter de données personnelles réelles pour tester. Les valeurs visibles 60 € / 60 minutes, 20 € / 75 minutes sont des exemples à centraliser et à signaler comme tels, pas des engagements réels. Ne pas ajouter de paiement en ligne : aucun écran de paiement ne figure dans les maquettes.

**Projet client :** réutiliser l’intégration de réservation réellement disponible et les données de son projet. Les créneaux réels, la capacité d’un atelier, les confirmations, les changements et annulations exigent une source persistante et des contrôles serveur. Attribution de créneau atomique, capacité jamais négative, restitution de place à l’annulation, accès de gestion protégé par jeton sûr et expirant. Le fichier agenda utilise le fuseau Europe/Paris. Ne pas confondre accès réel et simulation locale. Ne pas remplacer un système réel par du localStorage en le déclarant opérationnel. Si un fournisseur ou backend n’existe pas, isoler le mode démo et décrire précisément la dépendance ; ne pas ajouter de prestataire payant ou inventer un service actif.

### Approche, cabinet, journal et articles — planche 05

Approche avec présentation, philosophie, parcours/formation à renseigner et appel à échanger ; cabinet avec galerie, accès, horaires et informations pratiques ; journal avec catégories et navigation ; article avec couverture, contenu complet, étapes, citation et articles associés. Les catégories filtrent vraiment et les liens mènent à des articles complets, sans paragraphes factices répétés.

Ne pas inventer de portrait ou de personne : les six planches et les 42 photos n’en nécessitent aucune. Le plan de localisation de la maquette est illustratif ; le remplacer par une intégration configurée seulement avec une adresse réelle. Ne pas présenter une fausse carte comme une localisation fonctionnelle.

### Contact, FAQ, rendez-vous, légal et 404 — planche 06

Contact : motif, champs, validation, états d’erreur/succès honnêtes et coordonnées configurables. Entreprises : formulaire avec organisation, e-mail, date, effectif et message. Newsletter : état honnête selon intégration disponible, aucun envoi réel de test.

FAQ : catégories et accordéons reliés à leur contenu, téléphone compris. Retrouver un rendez-vous : référence/e-mail, réponse neutre et lien d’accès selon l’intégration ; ne pas exposer de données personnelles en saisissant simplement une référence. Gestion : récapitulatif, modification d’horaire, annulation confirmée par dialogue, sauvegarde de la note facultative et ajout calendrier ; dialogues avec focus piégé, fermeture Échap et restitution du focus, selon les droits et capacités du système réel.

Pages légales et onglets : mentions, confidentialité, conditions de réservation et cookies, avec champs « À renseigner » lorsque nécessaire. Consentement cookies : accepter/refuser/personnaliser et mémoriser le choix, sans activer les traceurs facultatifs avant accord. 404 : composition illustrée et liens de retour utiles.

Conserver l’information que la sophrologie relève du bien-être et ne remplace pas une prise en charge médicale. Aucune promesse de guérison, aucun diagnostic ni incitation à saisir un dossier médical dans un champ libre. Ne pas annoncer une conformité juridique ou une sécurité absolue non démontrée.

## Intégration au studio et coordination

1. Thème **Prestations de services**, aperçu de démonstration complet avant sélection. Appliquer à un projet uniquement au choix explicite du client. Réutiliser les mécanismes existants de pages, sections, édition, sauvegarde, exports et droits des forfaits ; ne pas figer le thème en une page indépendante du studio.
2. Adapter ensuite au vrai client ses textes, médias, coordonnées et prestations ; préserver la composition. Aucun nom, prix, exemple de formation ou coordonnées de la démo ne doit être silencieusement publié chez un client.
3. Conserver les autres thèmes, notamment les compositions récentes de NOCTIL, MUSEAU CLUB, Atelier Rive et TRAVERSE, ainsi que l’accueil commercial du studio. Aucune migration silencieuse d’anciens projets.
4. Lire l’état actuel de la PR thèmes #167 et de la mission immobilière #172 avant de toucher aux fichiers partagés. Parenthèse appartient au domaine Claude thèmes. Ne pas ouvrir une seconde intervention simultanée sur les mêmes fichiers. Continuer sur une base contenant le travail récent ; récupérer seulement `docs/theme-briefs/parenthese/` depuis la branche documentaire, sans remplacer la branche de travail par son ancien main.
5. Coordonner les dépendances avec le travail de Claude 2 et le lot 9 Codex #171 ; ne pas refaire facturation, sécurité globale ou moteur IA dans cette mission.
6. Documenter, pour chaque support d’export, ce qui est autonome et ce qui nécessite le backend/fournisseur (créneaux, confirmations, e-mail, recherche de rendez-vous). Un export statique ne suffit pas à ces fonctions réelles. Hébergement natif des sites clients/domaines = V2, hors périmètre.
7. Aucun appel IA payant, nouvelle génération, réservation réelle, envoi client, fusion ou déploiement automatique. Les 42 visuels sont fournis : ne pas lancer un moteur pour les remplacer. Préserver les données existantes.

## Recette et livraison obligatoire

- Matrice exhaustive : planche → écran/page/route → section → fichier image → interaction → preuve → réalisé/testé/bloqué. Inclure les dialogues, états vides/erreurs et confirmations.
- Captures de TOUTES les pages à 1440 px et 390 px ; vérifier aussi 360 et 430 px pour menus, formulaires, calendrier et barres fixes. Comparer côte à côte avec les six originaux et corriger les différences visibles. Une CI verte ne prouve pas la fidélité visuelle.
- Vérifier navigation, filtres, journal, galerie, FAQ, parcours complet cabinet/visio/atelier, retours entre étapes, erreurs, calendrier, gestion/modification/annulation, fichier agenda et cookies. Distinguer tests simulés et services réels configurés.
- Vérifier dans le studio : sélection, modification d’une photo et d’un texte, réglage d’un tarif/d’une durée, sauvegarde/rechargement et exports supportés. Contrôler l’isolation des données de réservation selon les mécanismes existants. Fournir des tests ciblés utiles et les vérifications requises par le dépôt.
- Fournir PR, SHA, captures comparatives, matrice des 42 médias réellement employés ou non, justification des réemplois et écarts restants, résultats des contrôles, dépendances externes et limites précises. Ne pas déclarer « identique » si des écarts persistent, ni « terminé » pour une interaction inerte.
- Expliquer à Thomas en français simple ce qu’il peut modifier, comment régler prestations et disponibilités avec le support réel, ce qui fonctionne en démo et ce qui attend une intégration. Distinguer branche livrée, fusion et version réellement disponible dans son studio. La validation esthétique lui revient.

Avancer jusqu’à un résultat complet et révisable. Ne pas s’arrêter au plan ; nommer précisément toute dépendance manquante et poursuivre le périmètre indépendant.

## Transmission en ZIP de moins de 30 Mo
Thomas peut aussi fournir le même ensemble sans perte de qualité en cinq archives indépendantes : `PARENTHESE_IMAGES_01_A_11.zip`, `PARENTHESE_IMAGES_12_A_23.zip`, `PARENTHESE_IMAGES_24_A_34.zip`, `PARENTHESE_IMAGES_35_A_42.zip`, `PARENTHESE_6_MAQUETTES_ET_CATALOGUE.zip`. Les extraire dans un même dossier pour réunir les 42 images et ouvrir le catalogue. Les six PNG de référence sont également accessibles directement dans ce dossier GitHub. Aucun ZIP des photos n’est publié dans le dépôt.
