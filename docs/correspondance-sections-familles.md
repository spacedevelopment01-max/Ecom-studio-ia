# Bibliothèques de sections par famille — registre et correspondance (issue #141)

Document généré depuis le code (`src/lib/theme/section-families.ts`, `family-chrome.ts`) : il décrit exactement ce que
la galerie « Sections », l'IA, les commandes du chat et le serveur proposent. Une section « retirée du catalogue »
n'est plus proposée nulle part, mais son fichier reste dans le thème : un projet enregistré qui l'utilise s'affiche
et s'exporte comme avant.

Bilan sur 157 sections du thème de base : 49 conservées dans au moins une bibliothèque,
20 créées, 17 composants de structure, 71 retirées du catalogue.

## 1. Les 60 entrées (20 par famille)

### Boutique spécialisée — 20 sections

| N° | Fonction | Dispositions (section du thème) |
|---|---|---|
| 1 | **Présentation principale** — Grand visuel produit, accroche, présentation courte et bouton principal. | Visuel à droite (`cv-hero`) · Visuel à gauche (`cv-hero`) · Visuel au-dessus (`cv-hero`) · Visuel en fond (`cv-banner`) · Bannière visuel et prix (`cv-banner`) |
| 2 | **Bénéfices du produit** — Avantages clients avec icônes, illustrations ou photos. | Grille (`features-grid`) · Deux colonnes (`features-grid`) · Liste verticale (`features-grid`) · Carrousel (`features-grid`) · Autour d'un visuel (`cv-feature`) · Visuel à gauche (`cv-feature`) · Bandeau défilant (`marquee`) |
| 3 | **Détails du produit** — Gros plans légendés ou repères interactifs sur le produit. | Gros plans en lignes (`cv-cards`) · Gros plans en colonnes (`cv-cards`) · Repères interactifs (`cv-hotspots`) · Repères, liste dessous (`cv-hotspots`) |
| 4 | **Composition et matériaux** — Ingrédients, composants ou matériaux selon le produit. | Visuel et liste (`cv-ingredients`) · Cartes (`cv-ingredients`) · Liste compacte (`cv-ingredients`) |
| 5 | **Caractéristiques** — Informations précises en tableau, liste ou accordéons. | Titre à côté, accordéons (`cv-specs`) · Accordéons empilés (`cv-specs`) · Onglets (`content-tabs`) · Onglets en pastilles (`content-tabs`) |
| 6 | **Mode d'emploi** — Étapes illustrées d'utilisation, d'entretien ou de conservation. | Étapes en cartes (`cv-steps`) · Étapes sur une ligne (`cv-steps`) · Frise (`timeline`) |
| 7 | **Situations d'utilisation** — Le produit dans différents moments et contextes du quotidien. | Alternance image / texte (`cv-alternating`) · Images à gauche (`cv-alternating`) · Mosaïque (`cv-gallery`) · Galerie en grille (`cv-gallery`) · Galerie en carrousel (`cv-gallery`) |
| 8 | **Démonstration vidéo** — Média dédié montrant le fonctionnement ou l'utilisation. | Grand lecteur (`fs-video`) · Vidéo et points clés (`fs-video`) · Vidéo verticale (`fs-video`) · Stories en cartes (`cv-stories`) |
| 9 | **Comparatif** — Différences entre versions ou solutions, selon des critères vérifiables. | Tableau (`comparison-table`) · Cartes par colonne (`comparison-table`) |
| 10 | **Résultats et preuves** — Mesures, tests et avant / après documentés ; aucun résultat inventé. | Chiffres en grille (`stats`) · Chiffres en lignes (`stats`) · Mesures et sources (`fs-results`) · Avant / après (`fs-results`) |
| 11 | **Avis et témoignages** — Cartes, citations, carrousel et témoignages vidéo dans une même section. | Carrousel d'avis (`cv-reviews`) · Citation en carte (`cv-quote`) · Citation et visuel (`cv-quote`) · Citation en bandeau (`cv-quote`) |
| 12 | **Presse et distinctions** — Citations de médias, publications et récompenses vérifiables. | Citations de presse (`fs-press`) · Bandeau de logos (`fs-press`) · Une citation à la une (`fs-press`) · Distinctions (`fs-press`) |
| 13 | **Histoire de la marque** — Origine, vision et récit de la marque. | Récit et valeurs (`about`) · Grande déclaration (`rich-text`) · Image et texte (`image-with-text`) · Image et texte superposés (`image-with-text`) |
| 14 | **Fabrication et savoir-faire** — Conception, fabrication et contrôles qualité. | Étapes illustrées (`fs-making`) · Image fixe pendant le récit (`fs-making`) · Frise qui progresse (`fs-making`) · Cartes (`fs-making`) |
| 15 | **Achat et offres** — Variantes, prix, quantité et offres groupées, avec le panier existant. | Produit et offres (`featured-purchase`) · Achat compact (`featured-purchase`) · Offres sur la fiche produit (`purchase-offers`) · Bandeau d'appel à l'achat (`cta-banner`) |
| 16 | **Produits complémentaires** — Accessoires et références qui complètent l'utilisation. | Recommandations automatiques (`product-recommendations`) · Sélection manuelle en grille (`fs-products`) · Sélection en carrousel (`fs-products`) |
| 17 | **Garanties et livraison** — Expédition, retours, garantie et assistance. | Garantie mise en avant (`cv-guarantee`) · Engagements en grille (`fs-commitments`) · Liste détaillée (`fs-commitments`) |
| 18 | **Questions fréquentes** — Questions / réponses organisées par sujet. | Accordéons en cartes (`faq`) · Accordéons en lignes (`faq`) · Titre à côté (`faq`) · Numérotées (`faq`) |
| 19 | **Newsletter** — Invitation à recevoir les actualités. | Inscription simple (`newsletter`) · Inscription avec visuel (`newsletter-media`) |
| 20 | **Contact** — Coordonnées et formulaire de questions. | Formulaire et coordonnées (`contact-form`) · Moyens de contact (`fs-stores`) |

### E-commerce — 20 sections

| N° | Fonction | Dispositions (section du thème) |
|---|---|---|
| 1 | **Présentation principale** — Composition visuelle introduisant la boutique ou une collection. | Promesse dans la scène (`ed-opening`) · Titre puis paysage (`ed-opening`) |
| 2 | **Collections et catégories** — Accès visuels aux familles de produits. | Grille (`fs-collections`) · Une grande et des petites (`fs-collections`) · Carrousel (`fs-collections`) · Index avec aperçu (`fs-collections`) |
| 3 | **Sélection de produits** — Grille ou carrousel : nouveautés, meilleures ventes ou sélection manuelle. | Grille (`fs-products`) · Carrousel (`fs-products`) · Liste éditoriale (`fs-products`) · Recommandations (fiche produit) (`product-recommendations`) |
| 4 | **Produit à la une** — Présentation approfondie d'une référence avec informations et achat. | Galerie et achat (`featured-purchase`) · Achat compact (`featured-purchase`) · Offres sur la fiche produit (`purchase-offers`) |
| 5 | **Ambiance et lookbook** — Scènes de plusieurs produits avec repères permettant de les identifier. | Scène et repères produits (`fs-lookbook`) · Scène et liste des produits (`fs-lookbook`) · Scène et texte (`ed-scene`) · Panorama (`ed-scene`) |
| 6 | **Matières et finitions** — Textures, échantillons visuels et explications. | Bande des finitions (`ed-finishes`) · Finitions en situation (`ed-finishes`) |
| 7 | **Dimensions et proportions** — Dessins cotés, repères d'échelle et encombrement. | Dessin coté (`fs-dimensions`) · Photo et cotes (`fs-dimensions`) · Tableau des formats (`fs-dimensions`) |
| 8 | **Usages et installation** — Mise en place et utilisations expliquées visuellement. | Deux usages côte à côte (`ed-diptych`) · Diptyque décalé (`ed-diptych`) · Index d'usages (`ed-diptych`) |
| 9 | **Entretien et durabilité** — Conseils pour entretenir et prolonger la vie des produits. | Conseils en liste (`fs-care`) · À faire / à éviter (`fs-care`) · Cartes (`fs-care`) · Accordéons (`fs-care`) |
| 10 | **Comparatif de références** — Tableau éditorial des différences entre modèles. | Tableau (`comparison-table`) · Cartes par modèle (`comparison-table`) |
| 11 | **Campagne commerciale** — Opération ou lancement, conditions et lien. | Visuel et conditions (`fs-campaign`) · Plein cadre (`fs-campaign`) · Carte (`fs-campaign`) · Bandeau d'appel (`cta-banner`) |
| 12 | **Histoire de la maison** — Origines et direction créative. | Phrase et repères (`ed-statement`) · Grande déclaration (`rich-text`) · Image et texte (`image-with-text`) |
| 13 | **Fabrication et ateliers** — Travail de fabrication et savoir-faire. | Image fixe pendant le récit (`fs-making`) · Étapes illustrées (`fs-making`) · Frise qui progresse (`fs-making`) |
| 14 | **Engagements de la marque** — Engagements concrets et documentés. | Grille (`fs-commitments`) · Liste numérotée (`fs-commitments`) · Image et engagements (`fs-commitments`) · Grille d'atouts (`features-grid`) |
| 15 | **Avis clients** — Retours sur les produits et l'expérience d'achat. | Mur d'avis (`fs-reviews`) · Carrousel (`fs-reviews`) · Un avis à la une (`fs-reviews`) |
| 16 | **Presse et distinctions** — Publications et récompenses. | Citations de presse (`fs-press`) · Bandeau de logos (`fs-press`) · Une citation à la une (`fs-press`) · Distinctions (`fs-press`) |
| 17 | **Journal et inspirations** — Sélection d'articles, conseils et dossiers. | Un article à la une et une liste (`fs-journal`) · Grille (`fs-journal`) · Liste (`fs-journal`) |
| 18 | **Informations d'achat et FAQ** — Livraison, retours, paiement et réponses pratiques regroupés par thème. | Titre à côté (`v2-faq`) · Centré (`v2-faq`) · Accordéons en cartes (`faq`) · Accordéons en lignes (`faq`) |
| 19 | **Newsletter** — Actualités et collections. | Inscription simple (`newsletter`) · Inscription avec visuel (`newsletter-media`) |
| 20 | **Contact et points de vente** — Coordonnées, formulaire, adresses et horaires. | Formulaire et image (`ed-contact`) · Formulaire et coordonnées (`contact-form`) · Points de vente (`fs-stores`) |

### Prestations de services — 20 sections

| N° | Fonction | Dispositions (section du thème) |
|---|---|---|
| 1 | **Présentation de l'activité** — Métier, promesse, grand visuel et action principale. | Titre puis paysage (`ed-opening`) · Promesse dans la scène (`ed-opening`) |
| 2 | **Prestations proposées** — Catalogue de services en cartes, liste ou panneaux. | Liste (`services-list`) · Cartes (`services-list`) |
| 3 | **Détail d'une prestation** — Périmètre, contenu et livrables d'un service. | Résumé fixe et détail (`fs-service`) · Détail empilé (`fs-service`) · Inclus / livrables en colonnes (`fs-service`) |
| 4 | **Besoins accompagnés** — Situations clients et types de projets accompagnés. | Cartes (`fs-needs`) · Liste (`fs-needs`) · Accordéons (`fs-needs`) · Scène et texte (`ed-scene`) |
| 5 | **Réalisations** — Portfolio avec visuels, légendes et liens. | Éditorial (`portfolio`) · Grille (`portfolio`) |
| 6 | **Étude de cas** — Demande, contraintes, réponse et résultat d'un projet. | Image fixe pendant le récit (`fs-case`) · Quatre colonnes (`fs-case`) · Récit empilé (`fs-case`) |
| 7 | **Avant / après** — Transformation réelle, curseur ou vues juxtaposées. | Curseur (`ed-study`) · Vues juxtaposées (`ed-study`) |
| 8 | **Méthode de travail** — Étapes de l'accompagnement. | Frise (`timeline`) · Étapes horizontales (`how-to`) · Étapes verticales (`how-to`) · Chapitres illustrés (`ref-narrative`) |
| 9 | **Engagements de service** — Suivi, qualité, délais et communication. | Grille (`fs-commitments`) · Liste numérotée (`fs-commitments`) · Image et engagements (`fs-commitments`) |
| 10 | **Équipe et expertises** — Personnes, rôles et spécialités. | Cartes (`team`) · Portraits (`team`) · Liste sobre (`team`) |
| 11 | **Histoire de l'entreprise** — Parcours et évolution. | Récit et valeurs (`about`) · Phrase et repères (`ed-statement`) · Grande déclaration (`rich-text`) |
| 12 | **Qualifications et assurances** — Diplômes, certifications et assurances réels. | Liste détaillée (`fs-credentials`) · Cartes (`fs-credentials`) · Tableau (`fs-credentials`) |
| 13 | **Moyens et équipements** — Outils, installations et techniques. | Grille (`fs-equipment`) · Liste (`fs-equipment`) · Image et liste (`fs-equipment`) |
| 14 | **Témoignages clients** — Retours authentiques sur l'accompagnement. | Avis en cartes (`testimonials`) · Carrousel (`fs-reviews`) · Un témoignage à la une (`fs-reviews`) |
| 15 | **Références professionnelles** — Organisations clientes et partenaires, avec leur rôle. | Logos par rôle (`fs-references`) · Liste avec rôles (`fs-references`) · Bandeau défilant (`fs-references`) |
| 16 | **Tarifs et formules** — Forfaits, inclusions et modalités tarifaires. | Formules en cartes (`pricing`) |
| 17 | **Zone d'intervention et accès** — Territoires desservis, adresse, horaires et déplacement. | Informations pratiques (`practical-info`) · Avec carte (`practical-info`) |
| 18 | **Questions fréquentes** — Préparation et déroulement des prestations. | Accordéons en lignes (`faq`) · Accordéons en cartes (`faq`) · Titre à côté (`faq`) |
| 19 | **Conseils et actualités** — Articles professionnels et nouvelles de l'entreprise. | Un article à la une et une liste (`fs-journal`) · Grille (`fs-journal`) · Liste (`fs-journal`) |
| 20 | **Contact et prise de rendez-vous** — Formulaire ou accès au calendrier existant selon l'activité. | Formulaire et coordonnées (`contact-form`) · Demande de rendez-vous (`booking`) · Calendrier de réservation (`booking-calendar`) · Formulaire et image (`ed-contact`) · Bandeau d'appel (`cta-banner`) |

## 2. En-têtes et pieds de page : 5 dispositions par famille

La disposition n° 1 reproduit à l'identique celle des thèmes validés ; rien n'est remplacé automatiquement.

### Boutique spécialisée

| | En-têtes | Pieds de page |
|---|---|---|
| 1 | **Logo centré, recherche et panier** — Disposition actuelle de FRAISE et ONDE : logo au centre, menu en tiroir sur téléphone, panier toujours visible. | **Colonnes d'aide et d'informations** — Disposition actuelle de FRAISE et ONDE : marque, liens d'aide, lectures, informations et lettre d'information. |
| 2 | **Produit en avant dans le menu** — Logo à gauche ; le sous-menu ouvre une fiche produit mise en avant ; icônes compte, recherche et panier. | **Centré avec lettre d'information** — Logo et inscription au centre, liens en ligne dessous : pour une marque à produit phare. |
| 3 | **Bouton d'achat visible** — Logo à gauche, menu à droite et bouton d'achat permanent vers le produit ; panier à côté. | **Carte d'assistance** — Les canaux d'aide et la lettre d'information dans une carte détachée du fond. |
| 4 | **Barre flottante arrondie** — En-tête détaché du bord, coins arrondis, icônes en pastilles ; menu en panneau bas sur téléphone. | **Grand nom de marque** — Liens en colonnes et nom de marque en très grand en bas de page. |
| 5 | **Deux rangées avec offre** — Logo et icônes en haut, menu dessous avec une offre dans le sous-menu ; offre rappelée en haut du menu téléphone. | **Sobre** — Une ligne : logo, liens essentiels et mentions ; pour une page produit très courte. |

### E-commerce

| | En-têtes | Pieds de page |
|---|---|---|
| 1 | **Logo à gauche, catalogue en tiroir** — Disposition actuelle d'ORBE : logo à gauche, menu en ligne, recherche et panier ; tiroir sur téléphone. | **Sobre avec plan du catalogue** — Disposition actuelle d'ORBE : marque, liens boutique et aide, lettre d'information, mentions. |
| 2 | **Méga menu en colonnes** — Les collections s'ouvrent en colonnes avec une image de campagne ; sous-menus en accordéon sur téléphone. | **Plan du catalogue en colonnes** — Toutes les collections et l'aide en colonnes, lettre d'information à droite. |
| 3 | **Collections en cartes** — Deux rangées : le menu ouvre les collections en cartes illustrées ; menu téléphone en cartes. | **Boutique éditoriale** — Pied de page de boutique de référence : grande signature, collections, réseaux. |
| 4 | **Logo centré, menu à gauche** — Menu du catalogue à gauche, logo au centre, icônes à droite ; menu plein écran sur téléphone. | **Encadré** — Liens et inscription dans un cadre, mentions dessous ; lisible sur fond clair comme sombre. |
| 5 | **Boutique éditoriale** — En-tête de boutique de référence : navigation large, produit mis en avant dans le sous-menu, tiroir à droite. | **Empilé** — Blocs empilés pleine largeur, pensés d'abord pour le téléphone. |

### Prestations de services

| | En-têtes | Pieds de page |
|---|---|---|
| 1 | **Logo à gauche et bouton de contact** — Disposition actuelle d'Atelier Rive : menu des pages, bouton « Nous contacter » ; ni panier ni recherche. | **Marque et coordonnées** — Disposition actuelle d'Atelier Rive : signature à gauche, pages, coordonnées et informations à droite. |
| 2 | **Téléphone en évidence** — Numéro de téléphone cliquable dans l'en-tête et bouton de devis ; pensé pour les demandes rapides. | **Coordonnées en avant** — Adresse, téléphone et horaires mis en avant à gauche ; prestations et informations à droite. |
| 3 | **Prise de rendez-vous** — Logo centré, bouton « Prendre rendez-vous » toujours visible ; menu plein écran sur téléphone. | **Studio** — Pied de page de studio de référence : grande phrase de contact, liens discrets. |
| 4 | **Menu des prestations** — Le menu ouvre les prestations en colonnes ; bouton de contact ; panneau bas sur téléphone. | **Centré** — Signature, coordonnées et liens centrés ; idéal pour une activité locale. |
| 5 | **Studio flottant** — En-tête de studio détaché du bord, bouton de contact discret ; tiroir à droite sur téléphone. | **Carte de contact** — Les coordonnées et la zone d'intervention dans une carte, liens à côté. |

## 3. Correspondance ancien type → famille → fonction → disposition → décision

Colonne « Utilisée par » : pages des quatre thèmes validés (démonstrations au commit de référence a75664cd), y compris
les sections masquées et la page « bibliothèque » de démonstration.

| Type | Nom | Famille › fonction › disposition(s) | Utilisée par | Décision |
|---|---|---|---|---|
| `about` | À propos | Boutique spécialisée › 13. Histoire de la marque › Récit et valeurs<br>Prestations de services › 11. Histoire de l'entreprise › Récit et valeurs | FRAISE : page.a-propos<br>ONDE : page.a-propos<br>Atelier Rive : page.about | Conservée — regroupée avec d'autres sections sous la même fonction |
| `alternating-content` | Contenus alternés | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `animated-benefits` | Bénéfices animés | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `animated-story` | Histoire animée | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `animated-text` | Texte animé premium | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `announcement-bar` | Bandeau d'annonce | — | — | Structure de page (hors des 20) : conservée, réglable |
| `apps` | Applications | — | — | Structure de page (hors des 20) : conservée, réglable |
| `before-after` | Avant / après | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `booking` | Prise de rendez-vous | Prestations de services › 20. Contact et prise de rendez-vous › Demande de rendez-vous | Atelier Rive : page.contact | Conservée — regroupée avec d'autres sections sous la même fonction |
| `booking-calendar` | Calendrier de réservation | Prestations de services › 20. Contact et prise de rendez-vous › Calendrier de réservation | — | Conservée — regroupée avec d'autres sections sous la même fonction |
| `brand-promise` | Promesse | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `cart-drawer` | Panier latéral | — | — | Structure de page (hors des 20) : conservée, réglable |
| `collection-list` | Collections premium | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `comparison-table` | Tableau comparatif | Boutique spécialisée › 9. Comparatif › Tableau / Cartes par colonne<br>E-commerce › 10. Comparatif de références › Tableau / Cartes par modèle | FRAISE : index, product, page.sections<br>ONDE : index, product, product.ecp-24b76c1d174e416c (masquée), page.sections | Conservée ; disposition « Cartes côte à côte » ajoutée (rendu « Tableau » inchangé) |
| `contact-form` | Formulaire de contact | Boutique spécialisée › 20. Contact › Formulaire et coordonnées<br>E-commerce › 20. Contact et points de vente › Formulaire et coordonnées<br>Prestations de services › 20. Contact et prise de rendez-vous › Formulaire et coordonnées | FRAISE : page.contact<br>ONDE : page.contact<br>ORBE : page.faq, page.contact<br>Atelier Rive : index, page.faq | Conservée — regroupée avec d'autres sections sous la même fonction |
| `content-tabs` | Onglets de contenu | Boutique spécialisée › 5. Caractéristiques › Onglets / Onglets en pastilles | FRAISE : product | Conservée — regroupée avec d'autres sections sous la même fonction |
| `countdown` | Compte à rebours | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `creative-divider` | Séparateur créatif | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `cta-banner` | Bannière d'appel | Boutique spécialisée › 15. Achat et offres › Bandeau d'appel à l'achat<br>E-commerce › 11. Campagne commerciale › Bandeau d'appel<br>Prestations de services › 20. Contact et prise de rendez-vous › Bandeau d'appel | FRAISE : page.about<br>ONDE : page.about<br>ORBE : index, page.about<br>Atelier Rive : page.about, page.services | Conservée — regroupée avec d'autres sections sous la même fonction |
| `curved-marquee` | Texte en courbe | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `custom-liquid` | Liquid personnalisé | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `customer-wall` | Mur d'images clients | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `cv-alternating` | Image et texte alternés | Boutique spécialisée › 7. Situations d'utilisation › Alternance image / texte / Images à gauche | FRAISE : page.sections<br>ONDE : page.sections | Conservée — regroupée avec d'autres sections sous la même fonction |
| `cv-article` | Article éditorial | — | FRAISE : page.listicle, page.advertorial | Structure de page (hors des 20) : conservée, réglable |
| `cv-banner` | Bannière d'achat | Boutique spécialisée › 1. Présentation principale › Visuel en fond / Bannière visuel et prix | FRAISE : page.sections<br>ONDE : page.sections | Conservée — regroupée avec d'autres sections sous la même fonction |
| `cv-cards` | Cartes de détails | Boutique spécialisée › 3. Détails du produit › Gros plans en lignes / Gros plans en colonnes | ONDE : index, product, product.ecp-24b76c1d174e416c (masquée) | Conservée — regroupée avec d'autres sections sous la même fonction |
| `cv-feature` | Visuel et argumentaire | Boutique spécialisée › 2. Bénéfices du produit › Autour d'un visuel / Visuel à gauche | FRAISE : index, product, product.ecp-24b76c1d174e416c<br>ONDE : index, product, product.ecp-24b76c1d174e416c | Conservée — regroupée avec d'autres sections sous la même fonction |
| `cv-gallery` | Galerie en situation | Boutique spécialisée › 7. Situations d'utilisation › Mosaïque / Galerie en grille / Galerie en carrousel | FRAISE : page.sections<br>ONDE : page.sections | Conservée — regroupée avec d'autres sections sous la même fonction |
| `cv-guarantee` | Garantie | Boutique spécialisée › 17. Garanties et livraison › Garantie mise en avant | FRAISE : index, product, collection, page.faq, product.ecp-24b76c1d174e416c (masquée), page.a-propos, page.advertorial<br>ONDE : index, collection, page.faq, page.a-propos | Conservée — regroupée avec d'autres sections sous la même fonction |
| `cv-hero` | Ouverture conversion | Boutique spécialisée › 1. Présentation principale › Visuel à droite / Visuel à gauche / Visuel au-dessus | FRAISE : index<br>ONDE : index | Conservée — regroupée avec d'autres sections sous la même fonction |
| `cv-hotspots` | Points interactifs | Boutique spécialisée › 3. Détails du produit › Repères interactifs / Repères, liste dessous | FRAISE : page.sections<br>ONDE : page.sections | Conservée — regroupée avec d'autres sections sous la même fonction |
| `cv-ingredients` | Composition du produit | Boutique spécialisée › 4. Composition et matériaux › Visuel et liste / Cartes / Liste compacte | FRAISE : page.sections<br>ONDE : page.sections | Conservée |
| `cv-quote` | Témoignage à la une | Boutique spécialisée › 11. Avis et témoignages › Citation en carte / Citation et visuel / Citation en bandeau | FRAISE : page.sections<br>ONDE : page.sections | Conservée — regroupée avec d'autres sections sous la même fonction |
| `cv-reviews` | Avis en carrousel | Boutique spécialisée › 11. Avis et témoignages › Carrousel d'avis | FRAISE : index, product, product.ecp-24b76c1d174e416c (masquée), page.listicle, page.advertorial<br>ONDE : index, product, product.ecp-24b76c1d174e416c (masquée) | Conservée — regroupée avec d'autres sections sous la même fonction |
| `cv-specs` | Fiche et contenu du colis | Boutique spécialisée › 5. Caractéristiques › Titre à côté, accordéons / Accordéons empilés | FRAISE : product.ecp-24b76c1d174e416c (masquée), page.sections<br>ONDE : page.sections | Conservée — regroupée avec d'autres sections sous la même fonction |
| `cv-steps` | Utilisation en étapes | Boutique spécialisée › 6. Mode d'emploi › Étapes en cartes / Étapes sur une ligne | FRAISE : page.sections<br>ONDE : page.sections | Conservée — regroupée avec d'autres sections sous la même fonction |
| `cv-stories` | Stories vidéo en cartes | Boutique spécialisée › 8. Démonstration vidéo › Stories en cartes | FRAISE : index, product, product.ecp-24b76c1d174e416c (masquée)<br>ONDE : index, product, product.ecp-24b76c1d174e416c (masquée) | Conservée — regroupée avec d'autres sections sous la même fonction |
| `day-night` | Expérience jour / nuit | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `double-banner` | Double bannière premium | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `ed-contact` | Premier échange | E-commerce › 20. Contact et points de vente › Formulaire et image<br>Prestations de services › 20. Contact et prise de rendez-vous › Formulaire et image | — | Conservée — regroupée avec d'autres sections sous la même fonction |
| `ed-diptych` | Diptyque éditorial | E-commerce › 8. Usages et installation › Deux usages côte à côte / Diptyque décalé / Index d'usages | ORBE : index | Conservée |
| `ed-finishes` | Finitions en contexte | E-commerce › 6. Matières et finitions › Bande des finitions / Finitions en situation | ORBE : index | Conservée |
| `ed-opening` | Ouverture photographique | E-commerce › 1. Présentation principale › Promesse dans la scène / Titre puis paysage<br>Prestations de services › 1. Présentation de l'activité › Titre puis paysage / Promesse dans la scène | ORBE : index<br>Atelier Rive : index | Conservée |
| `ed-scene` | Scène et récit | E-commerce › 5. Ambiance et lookbook › Scène et texte / Panorama<br>Prestations de services › 4. Besoins accompagnés › Scène et texte | ORBE : index, product.ecp-24b76c1d174e416c<br>Atelier Rive : index | Conservée — regroupée avec d'autres sections sous la même fonction |
| `ed-statement` | Phrase et repères | E-commerce › 12. Histoire de la maison › Phrase et repères<br>Prestations de services › 11. Histoire de l'entreprise › Phrase et repères | ORBE : index<br>Atelier Rive : index | Conservée — regroupée avec d'autres sections sous la même fonction |
| `ed-study` | Étude d’intention | Prestations de services › 7. Avant / après › Curseur / Vues juxtaposées | — | Conservée |
| `editorial-gallery` | Galerie éditoriale | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `editorial-visual` | Visuel éditorial | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `expert-endorsements` | Professionnels vérifiés | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `exploded-view` | Vue éclatée animée | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `faq` | FAQ premium | Boutique spécialisée › 18. Questions fréquentes › Accordéons en cartes / Accordéons en lignes / Titre à côté / Numérotées<br>E-commerce › 18. Informations d'achat et FAQ › Accordéons en cartes / Accordéons en lignes<br>Prestations de services › 18. Questions fréquentes › Accordéons en lignes / Accordéons en cartes / Titre à côté | FRAISE : index, product, page.faq, product.ecp-24b76c1d174e416c (masquée)<br>ONDE : product, page.faq, product.ecp-24b76c1d174e416c (masquée)<br>ORBE : page.faq, product.ecp-24b76c1d174e416c (masquée)<br>Atelier Rive : index, page.faq, page.services | Conservée — regroupée avec d'autres sections sous la même fonction |
| `featured-blog` | Blog en vedette premium | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `featured-collection` | Collection en vedette | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `featured-offer` | Offre centrale | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `featured-product` | Produit vedette premium | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `featured-purchase` | Produit à la une | Boutique spécialisée › 15. Achat et offres › Produit et offres / Achat compact<br>E-commerce › 4. Produit à la une › Galerie et achat / Achat compact | — | Conservée — regroupée avec d'autres sections sous la même fonction |
| `features-grid` | Grille d'atouts | Boutique spécialisée › 2. Bénéfices du produit › Grille / Deux colonnes / Liste verticale / Carrousel<br>E-commerce › 14. Engagements de la marque › Grille d'atouts | FRAISE : index, product, page.about, product.ecp-24b76c1d174e416c (masquée), page.sections<br>ONDE : page.about, page.sections<br>ORBE : page.about | Conservée — regroupée avec d'autres sections sous la même fonction |
| `floating-scene` | Scène visuelle flottante | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `footer` | Pied de page | — | — | Structure de page (hors des 20) : conservée, réglable |
| `fs-campaign` | Campagne | E-commerce › 11. Campagne commerciale › Visuel et conditions / Plein cadre / Carte | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-care` | Entretien | E-commerce › 9. Entretien et durabilité › Conseils en liste / À faire / à éviter / Cartes / Accordéons | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-case` | Étude de cas | Prestations de services › 6. Étude de cas › Image fixe pendant le récit / Quatre colonnes / Récit empilé | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-collections` | Collections | E-commerce › 2. Collections et catégories › Grille / Une grande et des petites / Carrousel / Index avec aperçu | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-commitments` | Engagements | Boutique spécialisée › 17. Garanties et livraison › Engagements en grille / Liste détaillée<br>E-commerce › 14. Engagements de la marque › Grille / Liste numérotée / Image et engagements<br>Prestations de services › 9. Engagements de service › Grille / Liste numérotée / Image et engagements | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-credentials` | Certifications | Prestations de services › 12. Qualifications et assurances › Liste détaillée / Cartes / Tableau | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-dimensions` | Dimensions | E-commerce › 7. Dimensions et proportions › Dessin coté / Photo et cotes / Tableau des formats | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-equipment` | Matériel et moyens | Prestations de services › 13. Moyens et équipements › Grille / Liste / Image et liste | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-journal` | Journal | E-commerce › 17. Journal et inspirations › Un article à la une et une liste / Grille / Liste<br>Prestations de services › 19. Conseils et actualités › Un article à la une et une liste / Grille / Liste | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-lookbook` | Lookbook | E-commerce › 5. Ambiance et lookbook › Scène et repères produits / Scène et liste des produits | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-making` | Fabrication | Boutique spécialisée › 14. Fabrication et savoir-faire › Étapes illustrées / Image fixe pendant le récit / Frise qui progresse / Cartes<br>E-commerce › 13. Fabrication et ateliers › Image fixe pendant le récit / Étapes illustrées / Frise qui progresse | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-needs` | Besoins | Prestations de services › 4. Besoins accompagnés › Cartes / Liste / Accordéons | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-press` | Presse et distinctions | Boutique spécialisée › 12. Presse et distinctions › Citations de presse / Bandeau de logos / Une citation à la une / Distinctions<br>E-commerce › 16. Presse et distinctions › Citations de presse / Bandeau de logos / Une citation à la une / Distinctions | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-products` | Sélection de produits | Boutique spécialisée › 16. Produits complémentaires › Sélection manuelle en grille / Sélection en carrousel<br>E-commerce › 3. Sélection de produits › Grille / Carrousel / Liste éditoriale | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-references` | Références | Prestations de services › 15. Références professionnelles › Logos par rôle / Liste avec rôles / Bandeau défilant | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-results` | Résultats et preuves | Boutique spécialisée › 10. Résultats et preuves › Mesures et sources / Avant / après | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-reviews` | Avis clients | E-commerce › 15. Avis clients › Mur d'avis / Carrousel / Un avis à la une<br>Prestations de services › 14. Témoignages clients › Carrousel / Un témoignage à la une | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-service` | Prestation détaillée | Prestations de services › 3. Détail d'une prestation › Résumé fixe et détail / Détail empilé / Inclus / livrables en colonnes | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-stores` | Points de vente | Boutique spécialisée › 20. Contact › Moyens de contact<br>E-commerce › 20. Contact et points de vente › Points de vente | — | **Créée** (nouvelle section de bibliothèque) |
| `fs-video` | Démonstration vidéo | Boutique spécialisée › 8. Démonstration vidéo › Grand lecteur / Vidéo et points clés / Vidéo verticale | — | **Créée** (nouvelle section de bibliothèque) |
| `gallery-mosaic` | Mosaïque d'images | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `header` | En-tête | — | — | Structure de page (hors des 20) : conservée, réglable |
| `hero` | Hero | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `hero-editorial` | Héros éditorial | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `hero-flex` | Hero premium ajout libre | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `hero-fullbleed` | Héros plein écran | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `hero-split` | Héros divisé | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `horizontal-gallery` | Carrousel horizontal | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `how-to` | Mode d'emploi | Prestations de services › 8. Méthode de travail › Étapes horizontales / Étapes verticales | Atelier Rive : page.services | Conservée — regroupée avec d'autres sections sous la même fonction |
| `image-with-text` | Image et texte | Boutique spécialisée › 13. Histoire de la marque › Image et texte / Image et texte superposés<br>E-commerce › 12. Histoire de la maison › Image et texte | FRAISE : page.about<br>ONDE : page.about<br>ORBE : page.about | Conservée — regroupée avec d'autres sections sous la même fonction |
| `immersive-reviews` | Avis clients immersifs | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `immersive-video` | Vidéo immersive | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `legal-page` | Page légale | — | FRAISE : page.livraison-retours, page.mentions-legales, page.confidentialite, page.conditions-generales<br>ONDE : page.livraison-retours, page.mentions-legales, page.confidentialite, page.conditions-generales<br>Atelier Rive : page.legal | Structure de page (hors des 20) : conservée, réglable |
| `logo-list` | Logos et partenaires | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `main-404` | Page introuvable | — | FRAISE : 404<br>ONDE : 404<br>ORBE : 404<br>Atelier Rive : 404 | Structure de page (hors des 20) : conservée, réglable |
| `main-article` | Article | — | FRAISE : article<br>ONDE : article<br>ORBE : article<br>Atelier Rive : article | Structure de page (hors des 20) : conservée, réglable |
| `main-blog` | Blog | — | FRAISE : blog<br>ONDE : blog<br>ORBE : blog<br>Atelier Rive : blog | Structure de page (hors des 20) : conservée, réglable |
| `main-cart` | Panier | — | FRAISE : cart<br>ONDE : cart<br>ORBE : cart<br>Atelier Rive : cart | Structure de page (hors des 20) : conservée, réglable |
| `main-collection` | Collection | — | FRAISE : collection<br>ONDE : collection<br>ORBE : collection<br>Atelier Rive : collection | Structure de page (hors des 20) : conservée, réglable |
| `main-list-collections` | Liste des collections | — | FRAISE : list-collections<br>ONDE : list-collections<br>ORBE : list-collections<br>Atelier Rive : list-collections | Structure de page (hors des 20) : conservée, réglable |
| `main-page` | Contenu de page | — | FRAISE : page, page.about, page.faq, page.contact, page.shipping, page.a-propos, page.sections<br>ONDE : page, page.about, page.faq, page.contact, page.shipping, page.a-propos, page.sections<br>ORBE : page, page.about, page.faq, page.contact, page.shipping<br>Atelier Rive : page, page.about, page.faq, page.contact, page.services | Structure de page (hors des 20) : conservée, réglable |
| `main-password` | Page protégée | — | FRAISE : password<br>ONDE : password<br>ORBE : password<br>Atelier Rive : password | Structure de page (hors des 20) : conservée, réglable |
| `main-product` | Produit | — | FRAISE : product, product.ecp-24b76c1d174e416c<br>ONDE : product, product.ecp-24b76c1d174e416c<br>ORBE : product, product.ecp-24b76c1d174e416c<br>Atelier Rive : product | Structure de page (hors des 20) : conservée, réglable |
| `main-search` | Recherche | — | FRAISE : search<br>ONDE : search<br>ORBE : search<br>Atelier Rive : search | Structure de page (hors des 20) : conservée, réglable |
| `marquee` | Bandeau défilant | Boutique spécialisée › 2. Bénéfices du produit › Bandeau défilant | FRAISE : index, product, page.listicle<br>ONDE : index, product, product.ecp-24b76c1d174e416c | Conservée — regroupée avec d'autres sections sous la même fonction |
| `media-gallery` | Galerie média premium | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `newsletter` | Inscription e-mail | Boutique spécialisée › 19. Newsletter › Inscription simple<br>E-commerce › 19. Newsletter › Inscription simple | FRAISE : index, product, page.listicle, page.advertorial | Conservée — regroupée avec d'autres sections sous la même fonction |
| `newsletter-media` | Newsletter avec média | Boutique spécialisée › 19. Newsletter › Inscription avec visuel<br>E-commerce › 19. Newsletter › Inscription avec visuel | — | Conservée — regroupée avec d'autres sections sous la même fonction |
| `portfolio` | Réalisations | Prestations de services › 5. Réalisations › Éditorial / Grille | Atelier Rive : index | Conservée |
| `practical-info` | Infos pratiques | Prestations de services › 17. Zone d'intervention et accès › Informations pratiques / Avec carte | Atelier Rive : index, page.contact | Conservée |
| `precautions` | Précautions | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `pricing` | Tarifs | Prestations de services › 16. Tarifs et formules › Formules en cartes | — | Conservée |
| `product-360` | Produit à 360° | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `product-recommendations` | Recommandations produit | Boutique spécialisée › 16. Produits complémentaires › Recommandations automatiques<br>E-commerce › 3. Sélection de produits › Recommandations (fiche produit) | FRAISE : product.ecp-24b76c1d174e416c<br>ONDE : product.ecp-24b76c1d174e416c<br>ORBE : product, product.ecp-24b76c1d174e416c | Conservée — regroupée avec d'autres sections sous la même fonction |
| `product-reviews` | Avis clients | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `purchase-offers` | Offres et cadeaux | Boutique spécialisée › 15. Achat et offres › Offres sur la fiche produit<br>E-commerce › 4. Produit à la une › Offres sur la fiche produit | — | Conservée — regroupée avec d'autres sections sous la même fonction |
| `reassurance` | Réassurance | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `ref-editorial` | Reportage visuel | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `ref-hero` | Ouverture référence | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `ref-narrative` | Récit interactif | Prestations de services › 8. Méthode de travail › Chapitres illustrés | Atelier Rive : index | Conservée — regroupée avec d'autres sections sous la même fonction |
| `ref-notes` | Notes factuelles | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `ref-offers` | Offres éditoriales | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `rich-text` | Texte enrichi | Boutique spécialisée › 13. Histoire de la marque › Grande déclaration<br>E-commerce › 12. Histoire de la maison › Grande déclaration<br>Prestations de services › 11. Histoire de l'entreprise › Grande déclaration | FRAISE : page.about, page.shipping, page.sections<br>ONDE : page.about, page.shipping, page.sections<br>ORBE : page.about, page.shipping | Conservée — regroupée avec d'autres sections sous la même fonction |
| `routine-steps` | Routine en gestes | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `scroll-steps` | Étapes au défilement | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `scroll-story` | Défilement produit | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `services-list` | Prestations | Prestations de services › 2. Prestations proposées › Liste / Cartes | Atelier Rive : index, page.services | Conservée |
| `shipping-journey` | Parcours de livraison | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `situations` | Situations | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `slideshow` | Diaporama premium | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `social-gallery` | Galerie sociale premium | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `specs-list` | Caractéristiques | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `stack-cards` | Cartes empilées | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `stats` | Chiffres clés | Boutique spécialisée › 10. Résultats et preuves › Chiffres en grille / Chiffres en lignes | FRAISE : index, product<br>ONDE : index, product | Conservée — regroupée avec d'autres sections sous la même fonction |
| `story-circles` | Cercles (stories) | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `team` | Équipe | Prestations de services › 10. Équipe et expertises › Cartes / Portraits / Liste sobre | Atelier Rive : page.about | Conservée |
| `testimonials` | Avis clients premium | Prestations de services › 14. Témoignages clients › Avis en cartes | Atelier Rive : index (masquée) | Conservée — regroupée avec d'autres sections sous la même fonction |
| `timeline` | Frise d'étapes | Boutique spécialisée › 6. Mode d'emploi › Frise<br>Prestations de services › 8. Méthode de travail › Frise | FRAISE : product<br>Atelier Rive : index, page.about | Conservée — regroupée avec d'autres sections sous la même fonction |
| `trust-bar` | Arguments de confiance | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `v2-band` | Bandeau de transition | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `v2-banner` | Bannière photo | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `v2-benefits` | Bénéfices illustrés | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `v2-cards` | Cartes illustrées | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `v2-cta` | Appel final | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `v2-facts` | Coordonnées et horaires | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `v2-faq` | Questions fréquentes | E-commerce › 18. Informations d'achat et FAQ › Titre à côté / Centré | ORBE : index (masquée) | Conservée — regroupée avec d'autres sections sous la même fonction |
| `v2-hero` | Ouverture du site | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `v2-index` | Liste des offres | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `v2-media` | Galerie photos | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `v2-specs` | Tableau technique | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `v2-split` | Texte et photo | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `v2-steps` | Étapes numérotées | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `video-carousel` | Carrousel vidéo premium | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `video-reels` | Vidéos verticales | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `video-showcase` | Vidéo | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `video-stories` | Stories vidéo produit | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `visual-menu` | Menu visuel stories | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |
| `wave-divider` | Vague de séparation | — | — | **Retirée du catalogue** (galerie, IA, commandes) ; rendu conservé pour les projets enregistrés |

## 4. Modèles de pages

Les modèles de pages (`page-templates.ts`) remplacent automatiquement une section ancienne par son équivalent de la
famille du projet (mêmes titres, textes et boutons) ; sans équivalent (ex. vidéo de démonstration pour l'e-commerce),
la ligne du modèle n'est pas posée.
