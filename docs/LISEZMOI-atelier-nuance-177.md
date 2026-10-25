# ATELIER NUANCE — salon de coiffure, famille Services (issue #177)

Branche `claude/theme-atelier-nuance`, partie de `main` au commit `0a6aa1d`. **Rien n'est fusionné ni déployé.** Tous
les thèmes existants (y compris Maison & Horizon) restent tels quels. TABLE SAISON (PR #176) n'est pas encore sur `main` :
voir « Fusion avec TABLE SAISON » plus bas.

Consigne suivie : `CONSIGNE_CLAUDE.md` du kit HD (quatre ZIP « Atelier_Nuance_HD ») et les six planches de Thomas.
La planche **05 prime sur la 01** pour les prestations et la fiche ; les prix et durées viennent d'**une seule source**
(la section « Réglages du salon ») : jamais les 75 € et 95 € de la planche 02.

## Ce qui est livré

- **24 pages** du salon + accueil + page introuvable + recherche, en français et en anglais (adresses traduites).
- **Prise de rendez-vous en cinq étapes** (prestation, professionnel, créneau, coordonnées, confirmation), créneau pris
  au dernier moment (« Ce créneau vient d'être réservé » avec de vrais créneaux de remplacement), fichier d'agenda (.ics).
- **Espace client** (mes rendez-vous à venir et précédents, détail, mes informations, mes préférences, déconnexion),
  **retrouver mon rendez-vous**, **déplacer** et **annuler** (fenêtre de confirmation, Échap, retour du focus).
- **Démonstration** : tout est simulé dans le navigateur et annoncé « Simulation — aucun rendez-vous réel » ; aucun
  e-mail n'est envoyé, rien n'est enregistré ailleurs que dans ce navigateur.
- **Service réel du studio** (`src/lib/salon/booking.ts`, API `src/app/api/public/salon/[projectId]/…`), désactivé tant
  que le salon ne l'a pas activé : voir « Production ».
- FAQ, pages légales à quatre onglets, bandeau cookies (Accepter / Refuser / Paramétrer), inspirations filtrables avec
  visionneuse accessible, journal avec cinq vrais articles, plan illustratif sur la page contact, équipe en initiales.
- 27 sections `an-*` dans la bibliothèque (FR/EN), modifiables dans l'éditeur du studio.

## Matrice planche → page → adresse → capture → écart

Captures : `reports/issue177/captures/` (ordinateur 1440, téléphone 390, contrôles 360 et 430, parcours, états).
Comparaisons côte à côte (planche à gauche, rendu à droite) : `reports/issue177/comparaisons/`.

| Planche | Page ou état | Adresse (FR) | Comparaison / capture | Écart restant |
|---|---|---|---|---|
| 04 | Accueil ordinateur | `/` | `cmp-accueil.jpg` | Icônes des réseaux sociaux masquées (aucun vrai compte) |
| 04 | Accueil téléphone | `/` | `cmp-accueil-m.jpg` | — |
| 05 (prime sur 01) | Prestations & tarifs | `/pages/prestations` | `cmp-prest.jpg`, `cmp-prest-m.jpg` | Planche dessinée « zoomée » : le rendu est un peu moins grand ; aucun filtre actif au chargement (« Toutes ») |
| 05 | Fiche Coupe & brushing | `/pages/coupe-brushing` | `cmp-fiche.jpg`, `cmp-fiche-m.jpg` | Même remarque de proportions |
| 05 | Quatre autres fiches | `/pages/brushing`, `coloration-coiffage`, `balayage-coiffage`, `soin-coiffage` | `captures/ordinateur-1440/page-*.jpg` | Contenus propres à chaque prestation (pas de copie de Coupe & brushing) |
| 01 | Variante photo des longueurs | réglage « Photos » de la section « Choix de la longueur » | — | Pictogrammes SVG par défaut (consigne) ; les trois photos restent disponibles |
| 02 | Étapes 1 à 5 | `/pages/prendre-rendez-vous` | `cmp-rdv-1.jpg` … `cmp-rdv-5.jpg`, `cmp-rdv-3m.jpg`, `cmp-rdv-4m.jpg` | Téléphone, étape 4 en deux temps (formulaire puis récapitulatif) comme la planche |
| 02 / 06 | Créneau pris | même page | `cmp-conflit.jpg` | Créneaux de remplacement calculés (2 dans la démo au lieu des 5 dessinés) |
| 03 | Le salon | `/pages/le-salon` | `cmp-page-le-salon.jpg` | Bandeau : photo de remplacement (voir Médias) |
| 03 | Inspirations | `/pages/inspirations` | `cmp-page-inspirations.jpg` | — |
| 03 | Journal + 5 articles | `/pages/journal`, `/pages/journal-*` | `cmp-page-journal.jpg`, `captures/*/page-journal-*.jpg` | — |
| 03 | Contact | `/pages/contact` | `cmp-page-contact.jpg` | Plan illustratif annoncé comme tel ; coordonnées « [À renseigner] » |
| 06 | Retrouver mon rendez-vous | `/pages/retrouver-mon-rendez-vous` | `cmp-retrouver.jpg` | — |
| 06 | Mon espace | `/pages/mon-espace` | `cmp-espace.jpg` | « Avec Camille » au lieu de « Avec C. (Camille) » |
| 06 | Déplacer | `/pages/deplacer-mon-rendez-vous` | `cmp-deplacer.jpg` | — |
| 06 | FAQ | `/pages/faq` | `cmp-faq.jpg` | — |
| 06 | Légal (4 onglets) | `/pages/informations-legales`, `confidentialite`, `conditions-de-reservation`, `cookies` | `cmp-legal.jpg` | Textes à compléter par le salon (signalés) |
| 06 | Page introuvable | toute adresse inconnue | `captures/ordinateur-1440/404.jpg` | — |
| 06 | Lien expiré, erreur réseau, aucun créneau, jour complet, connexion | espace client / prise de rendez-vous en service réel | `captures/etats/*.jpg` | Vérifiés avec une API simulée dans le navigateur |
| — | Bandeau cookies | toutes les pages | parcours | — |

Écarts généraux : l'en-tête des pages intérieures garde le bouton terracotta (les planches 03 et 06 varient d'une page à
l'autre) ; le terracotta est **très légèrement assombri** (`#A45B40` au lieu de `#B4684B`) pour que le texte blanc des
boutons et les petits titres soient lisibles (contraste 4,5:1) ; les planches 02, 03, 05 et 06 sont dessinées à une
échelle plus grande que la 04 : les pages suivent la 04 (ordinateur 1440) et ont été agrandies avec mesure.

## Médias (59 référencés)

Les photos HD des quatre ZIP sont converties en WebP dans `public/theme-assets/atelier-nuance/` (et
`apercu-theme.jpg` pour la galerie). **La partie 1 du ZIP était tronquée : deux photos manquent**,
`reservation-confirmation` et `salon-bandeau`. Elles sont remplacées par une photo du même kit
(`deplacer-rendez-vous` et `accueil-salon`), et un test le vérifie. À renvoyer par Thomas pour les mettre à leur place.
Les trois photos de longueurs sont la variante de la planche 01 (non affichées par défaut).

| Fichier | Description | Pages où elle apparaît |
|---|---|---|
| `accueil-hero` | Salon de coiffure lumineux : longs plans en pierre, grands miroirs et fauteuils cognac | accueil |
| `accueil-coupe` | Ciseaux et brosses sur un plan de travail en travertin | accueil |
| `accueil-couleur` | Bols et pinceaux de coloration sur une pierre beige | accueil |
| `accueil-soin` | Serviettes roulées et flacons de soin sur une console en pierre | accueil |
| `accueil-salon` | Allée du salon : bacs, fauteuils en cuir et arbres en pots | accueil, le-salon |
| `detail-fleurs` | Bouquet de fleurs blanches à l'entrée du salon | accueil |
| `detail-miroir` | Postes de coiffure et miroirs arrondis | accueil |
| `detail-etageres` | Étagères éclairées et flacons de soin | accueil |
| `detail-bac` | Vasque en travertin et robinetterie dorée | accueil |
| `detail-attente` | Espace d'attente : fauteuils arrondis et plantes | accueil |
| `accueil-conseil` | Fauteuil de coiffure près d'une console en pierre et d'un bouquet | accueil |
| `prestations-hero` | Postes de coiffure, miroirs arrondis et fauteuils cognac | prestations |
| `prestation-coupe` | Fauteuil de coiffure devant une console en travertin | prestations |
| `prestation-brushing` | Brosses rondes et sèche-cheveux dans un pot | brushing, prestations |
| `prestation-coloration` | Bols de coloration et pinceaux sur un chariot | coloration-coiffage, prestations |
| `prestation-balayage` | Mèches de démonstration et feuilles de balayage | balayage-coiffage, prestations |
| `prestation-soin` | Flacons de soin sur un bloc de pierre | prestations, soin-coiffage |
| `prestations-experience` | Comptoir en pierre et flacons dans une lumière chaude | prestations |
| `fiche-coupe-hero` | Fauteuil cognac face à un miroir arrondi | coupe-brushing |
| `fiche-moment` | Branches séchées et flacons sur une console en pierre | coupe-brushing |
| `longueur-courte` | Variante photo : cheveux courts vus de dos | non affichée (voir plus bas) |
| `longueur-mi-longue` | Variante photo : cheveux mi-longs vus de dos | non affichée (voir plus bas) |
| `longueur-longue` | Variante photo : cheveux longs vus de dos | non affichée (voir plus bas) |
| `reservation-prestation` | Fauteuil de coiffure face à un grand miroir arrondi doré | prendre-rendez-vous |
| `reservation-miniature` | Console en pierre, plante et accessoires | prendre-rendez-vous |
| `reservation-recapitulatif` | Coin du salon : miroir arrondi, bouquet et fauteuil | prendre-rendez-vous |
| `reservation-confirmation` | Deux fauteuils face à des miroirs arrondis | non affichée (voir plus bas) |
| `reservation-adresse` | Console d'accueil éclairée et plante verte | prendre-rendez-vous |
| `salon-hero` | Salon aux miroirs arrondis et fauteuils cognac | le-salon |
| `salon-cadre` | Bacs à shampoing et fauteuils en cuir | le-salon |
| `salon-details` | Bloc en travertin et bouquet de branches | le-salon |
| `salon-approche` | Étagères de soins et blaireau sur une console | le-salon |
| `salon-bandeau` | Salon aux miroirs dorés et îlot en travertin fleuri | non affichée (voir plus bas) |
| `inspiration-hero` | Mèches de cheveux et brosse sur une étoffe | inspirations |
| `inspiration-coupe-outils` | Ciseaux dorés, peigne et brosse sur une étoffe claire | inspirations |
| `inspiration-coupe-fauteuil` | Fauteuil en cuir cognac | inspirations |
| `inspiration-coupe-detail` | Pierre et branches fleuries sur une console | inspirations |
| `inspiration-couleur-meches` | Nuancier de mèches blondes, châtain et brunes | inspirations |
| `inspiration-couleur-bols` | Bols de pigments cuivrés | coloration-coiffage, inspirations |
| `inspiration-couleur-reflets` | Reflets cuivrés d'une chevelure ondulée | balayage-coiffage, inspirations |
| `inspiration-soin-produits` | Flacon et plante sur un bloc de pierre | brushing, inspirations |
| `inspiration-soin-bacs` | Bacs à shampoing et fauteuils en cuir | inspirations |
| `inspiration-soin-serviettes` | Serviettes roulées et plantes près d'une vasque | inspirations, soin-coiffage |
| `texture-travertin` | Texture de travertin | inspirations, journal |
| `journal-hero` | Vase et branches séchées sur des plateaux de pierre | journal |
| `journal-visite` | Poste de coiffure : miroir arrondi, console et fauteuil | journal |
| `journal-outils` | Peignes et brosse sur une serviette | journal, journal-outils-du-quotidien |
| `journal-nuances` | Chevelure ondulée aux reflets cuivrés | journal, journal-nuances-de-la-saison |
| `journal-rituel` | Flacons de soin et serviettes | journal, journal-rituel-soin-en-salon |
| `journal-coulisses` | Le salon vu depuis l'entrée | journal, journal-art-des-details |
| `article-brosses` | Brosses et peignes dans un pot en pierre | journal, journal-preparer-votre-visite |
| `contact-hero` | Accueil du salon : comptoir en travertin et branches | contact |
| `contact-bandeau` | Fauteuil de coiffure et colonne en pierre | contact |
| `retrouver-rendez-vous` | Miroir éclairé et fauteuil de coiffure | retrouver-mon-rendez-vous |
| `mon-rendez-vous` | Fauteuil de coiffure devant une console | mon-espace |
| `deplacer-rendez-vous` | Postes de coiffure aux miroirs arrondis | deplacer-mon-rendez-vous, prendre-rendez-vous |
| `faq-hero` | Fauteuils cognac devant un mur d'étagères | faq |
| `legal-hero` | Accueil du salon : comptoir en pierre et bouquet | conditions-de-reservation, confidentialite, cookies, informations-legales |
| `creneau-indisponible` | Allée du salon aux miroirs et fauteuils | 404, prendre-rendez-vous |

## Démonstration, production et export

| | Démonstration (galerie, aperçu, export) | Service réel (production) |
|---|---|---|
| Activation | par défaut (« Fonctionnement des rendez-vous » = Démonstration) | « Réglages du salon » → « Service réel du studio » + « Adresse du service de rendez-vous » |
| Rendez-vous | enregistrés dans ce navigateur seulement | base du studio, par salon (`salon_appointments`) |
| Disponibilités | agenda fictif (Camille le mardi 10 novembre 2026 : 9 h 00, 10 h 30, 14 h 00, 15 h 30) | calculées sur toute la durée, compétences et jours de chaque personne, sans chevauchement (transaction) |
| « Sans préférence » | attribution simulée | la personne libre et compétente la moins occupée |
| Référence | AN-0001… | `AN-AAAA-XXXXX`, non devinable |
| Accès à l'espace | exemple local | lien secret par e-mail (7 jours) ou jeton du rendez-vous ; jamais avec l'e-mail seul ; réponses toujours neutres ; débit limité |
| Déplacement | simulé | le nouveau créneau est réservé avant de libérer l'ancien (une seule transaction) |
| Annulation | simulée | délai réglé par le salon ; conditions saisies par le salon, aucune politique d'acompte inventée |
| E-mails | aucun | confirmation au client et avis au salon, seulement si l'envoi d'e-mails est configuré |

**Export statique** (`scripts/reference-static-preview.ts … --only=atelier-nuance`) : 29 pages, 105 fichiers ; seule
la démonstration y fonctionne (pas de serveur).

**Limites connues** : pas encore d'écran « Planning » dans le studio (la fonction `listAppointments` est prête, le salon
reçoit en attendant un e-mail par rendez-vous) ; les comptes clients natifs de Shopify ne sont pas utilisés (accès par
lien sécurisé du studio) ; aucun paiement ni acompte.

## Guide simple

- **Changer une prestation, un prix ou une durée** : éditeur du thème → en-tête → « Réglages du salon » → bloc « Prestation ». Le prix et la durée changent partout (liste, fiche, prestations phares, prise de rendez-vous).
- **Changer une photo** : cliquer sur la section dans l'aperçu → « Image ».
- **Changer les horaires ou les fermetures** : « Réglages du salon » → horaires du lundi au dimanche, « Jours de fermeture ».
- **Équipe** : « Réglages du salon » → blocs « Membre de l'équipe » (initiale, prestations réalisées, jours de travail).
- **Recevoir les vrais rendez-vous** : « Réglages du salon » → « Fonctionnement des rendez-vous » = « Service réel du
  studio », « Adresse du service de rendez-vous », « Adresse publique du site » et « E-mail qui reçoit les rendez-vous ». Avant cela, les pages de rendez-vous d'un vrai salon restent en brouillon.
- **Un autre salon** : il reçoit la même mise en page avec **ses** prestations, prix, durées et photos ; rien de la
  démonstration n'est repris (vérifié par un test) ; ce qui manque reste masqué ou signalé « [À renseigner] ».

## Vérifications

Voir `reports/issue177/RESULTATS.md` (tests, Theme Check, captures, parcours rejoués dans Chromium).

## Fichiers partagés modifiés

`src/lib/theme/theme-catalog.ts` (étape de finition `finish` d'un thème du catalogue), `directions.ts` (appel de cette
étape), `reference-themes.ts`, `theme-fit.ts`, `theme-access.ts`, `direction-palettes.ts`, `section-families.ts`,
`section-library.ts`, `src/lib/plan-entitlements.ts`, `src/components/studio/theme-gallery.tsx` (« Douze thèmes »),
`theme-base/assets/theme.css` (signature `.dir-atelier-nuance`), `theme-base/config/settings_schema.json`,
`theme-base/i18n/schema.en.json`, `scripts/prepare-theme-demos.ts`, `scripts/reference-static-preview.ts`,
`public/demo/manifest*.json`, `docs/coordination/BIBLIOTHEQUE_SECTIONS_COUVERTURE.md`, `CLAUDE.md` et les tests du
catalogue (`catalogue-actif`, `themes-catalogue`, `permissions-forfaits`, `demos-quatre-themes`, `demo-fixtures`).

## Fusion avec TABLE SAISON (PR #176)

Les deux branches ajoutent un thème au même catalogue : conflits attendus et simples dans les listes du catalogue,
des forfaits, de la galerie (« Douze » deviendra « Treize »), des palettes, de `schema.en.json` et de `CLAUDE.md`. Il
faudra garder les deux entrées. Les deux services réels sont séparés (`src/lib/restaurant/` et `src/lib/salon/`).
