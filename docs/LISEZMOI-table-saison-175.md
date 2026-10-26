# TABLE SAISON — thème restaurant (issue #175)

Consigne : `docs/briefs/table-saison/CONSIGNE_CLAUDE.md` (branche `brief/table-saison-20261023`, commit
`8089fc4f`). Thème de la **famille Services**, 12ᵉ thème du catalogue actif, avec sa démonstration complète d'après les
cinq planches et les 61 photographies HD du kit de Thomas.

## Ce qui est livré

| Élément | Où |
|---|---|
| 23 sections propres au thème (`ts-*`) | `theme-base/sections/ts-*.liquid`, extraits `ts-icon`, `ts-img`, `ts-ornament` |
| Feuille de style (ivoire, bordeaux, olive ; Playfair Display + DM Sans) | `theme-base/assets/table-saison.css` |
| Interactions (réservation, gestion, galerie, accordéons, formulaires, cookies) | `theme-base/assets/table-saison.js` |
| Calcul des disponibilités, commun au site et au serveur | `theme-base/assets/table-saison-core.js` |
| Définition du thème, composition chez un client, pages du restaurant | `src/lib/theme/table-saison.ts` |
| Service réel de réservation (studio) | `src/lib/restaurant/booking.ts`, `src/app/api/public/restaurant/[projectId]/[[...path]]/route.ts` |
| Démonstration (textes des planches, plats et prix d'exemple, 61 photos) | `tests/table-saison-fixtures.ts`, `public/theme-assets/table-saison/*.webp` |
| Tests | `tests/table-saison-theme.test.ts`, `tests/table-saison-booking.test.ts` |

Photos : les 61 JPEG (qualité 98, 61 Mo) restent hors du dépôt ; ils sont convertis en WebP qualité 80 aux dimensions
natives (11 Mo au total), un fichier par scène, mêmes noms que `MEDIAS.json`. Empreintes SHA-256 des 61 originaux
vérifiées avant conversion (61/61 conformes).

## Matrice planche → écran → page → capture

Comparaisons côte à côte (planche originale à gauche, rendu à droite) : `reports/issue175/comparaisons/` ; captures
téléphone 360 / 390 / 430 px : `reports/issue175/captures/` ; contrôles effectués : `reports/issue175/RESULTATS.md`.

| Planche | Écran ou état | Page de la démo | Capture (ordinateur / téléphone) | Écart connu |
|---|---|---|---|---|
| 01 | Accueil ordinateur | `/` (`accueil.html`) | accueil-1440 | Réseaux sociaux du pied absents (aucun compte réel à relier). |
| 01 | Accueil téléphone | `/` | accueil-390 | Les sections que la planche ne montre pas sur téléphone (carte olive, ingrédients, moments…) sont empilées dans le même ordre. |
| 02 | La carte + carte mobile | `/pages/la-carte` | la-carte-1440 / -390 | — |
| 02 | Au fil des saisons | `/pages/au-fil-des-saisons` | — | — |
| 02 | Vos grandes tablées (formulaire, conditions) | `/pages/grandes-tablees` | — | Pied compact sans « Horaires / bouton » (voir plus bas). |
| 03 | Réservation étape 1 / 2 / 3 | `/pages/reserver#etape-1…3` | resa-etape1/2/3 | — |
| 03 | Créneau indisponible | `/pages/reserver#indisponible` | resa-indisponible | — |
| 03 | Confirmation | `/pages/reserver#confirmation` | resa-confirmation | « Voir le plan » mène à la page Contact (le plan y est). |
| 03 | Deux vues téléphone (étape 1, coordonnées) | `/pages/reserver` à 390 px | resa-etape1-390, resa-etape3-390 | « Étape 3 sur 3 » de la planche à l'étape 1 corrigé en « Étape 1 sur 3 ». |
| 04 | Le lieu | `/pages/le-lieu` | le-lieu-1440 | — |
| 04 | Galerie (filtres, visionneuse) | `/pages/galerie` | galerie-1440 | — |
| 04 | Contact (coordonnées, plan, accès, formulaire) | `/pages/contact` | contact-1440 | Plan illustratif signalé tant que latitude et longitude ne sont pas réglées. |
| 04 | Questions fréquentes | `/pages/faq` | faq-1440 | — |
| 05 | Retrouver ma réservation | `/pages/retrouver-ma-reservation` | retrouver-1440 | — |
| 05 | Ma réservation (détail) | `/pages/ma-reservation` | resa-detail | — |
| 05 | Modifier / annuler (fenêtre) | `/pages/modifier-ma-reservation` | resa-modifier, resa-annulation | — |
| 05 | Demande de groupe reçue | `/pages/demande-de-groupe-recue` | groupe-recue-1440 | En démonstration, la page affiche toujours « cette demande n'a été envoyée à personne ». |
| 05 | Pages légales (4 onglets) | `/pages/mentions-legales`, `confidentialite`, `conditions-de-reservation`, `cookies` | mentions-1440 | — |
| 05 | Bandeau cookies | toutes les pages | cookies-1440 | — |
| 05 | Page 404 | toute adresse inconnue (`404.html`) | 404-1440 | — |

## Choix et écarts assumés

- **Marque harmonisée** : « TABLE SAISON / CUISINE DE SAISON » partout (la planche 05 écrivait « RESTAURANT »).
- **Pied de page** : bordeaux sur toutes les pages (consigne). Accueil : marque, liens utiles, horaires, coordonnées
  (planche 01). Autres pages : marque et menu sur une ligne (planches 02 à 05). La planche 04 montrait un pied ivoire ; la
  planche 02 un bouton et les horaires : non repris pour garder un pied cohérent.
- **Réseaux sociaux** : non affichés, faute de vrais comptes (rien d'inventé). Ils apparaissent dès qu'un compte est
  renseigné dans les réglages du thème.
- **Plat « Poisson rôti et légumes »** : la planche 01 disait « beurre blanc aux herbes », la carte « sauce légère au
  citron » ; la carte fait référence, l'accueil dit maintenant « sauce légère au citron ».
- **Coquilles corrigées** : « Noue serons ravis » → « Nous serons ravis » ; « … à préciser selon vos besoins. À
  préciser. » → une seule fois ; « Étape 3 sur 3 » à l'étape 1 (téléphone).
- **FAQ** : les réponses ne disent que ce que la démonstration sait (réservation en ligne jusqu'à 8 personnes, plats
  végétariens signalés, carte de saison) ; le reste est « À préciser par le restaurant ».
- **Dates** : celles des planches sont des exemples ; le calendrier calcule les dates réelles (passées interdites, fuseau
  Europe/Paris, fermetures 24–26 décembre et 1ᵉʳ janvier dans la démo). Le 10 novembre 2026 sert aux captures.
- **Scénario du créneau indisponible (démo)** : au premier essai, 19h30 (et 20h30) « viennent d'être pris » ; les
  alternatives 19h00 et 20h00 sont proposées, comme sur la planche.

## Démonstration, site réel et exports

| | Démonstration | Site réel (service activé) |
|---|---|---|
| Réservation | Simulée dans le navigateur (`localStorage`), annoncée « Démonstration : aucune réservation réelle » | Enregistrée par le studio : capacité vérifiée dans une transaction, numéro TS-0001…, jeton secret |
| E-mail | Jamais envoyé ; la confirmation le dit | Envoyé seulement si l'envoi SMTP du studio est configuré ; sinon la confirmation dit « aucun e-mail envoyé » |
| Retrouver par e-mail | Ouvre la réservation fictive, signalée comme telle | Réponse toujours neutre ; le lien sécurisé part par e-mail, seulement vers l'adresse publique réglée |
| Modifier / annuler | Dans ce navigateur seulement | Disponibilité revérifiée ; une réservation annulée n'est plus active |
| Demande de groupe / message | Vérifiée, envoyée à personne, et dit | Enregistrée par le studio (preuve de réception), transmise par e-mail si configuré |

**Exports** : le thème Shopify (OS 2.0) contient tout (sections, scripts, réglages). En **démonstration**, tout
fonctionne partout, export statique compris. Le **service réel** demande que le site puisse joindre le studio en HTTPS :
l'API publique `https://<studio>/api/public/restaurant/<id du projet>` répond avec CORS ouvert, sans cookie. Sans studio
joignable publiquement (installation locale), le site reste en démonstration : aucune réservation n'est déclarée réelle.

### Raccordement du service réel (à faire par le restaurant, une fois)

1. Studio › Boutique › En-tête › « Réglages du restaurant » : Fonctionnement = « Service réel du studio ».
2. « Adresse du service de réservation » : `https://<adresse du studio>/api/public/restaurant/<identifiant du projet>`.
3. « Adresse publique du site » (liens envoyés par e-mail) et « E-mail qui reçoit les réservations ».
4. Vérifier services, heures, capacité par créneau, jours d'ouverture et fermetures dans la même section.
5. Envoi des e-mails : réglage SMTP du studio (Administration). Sans lui, les confirmations disent qu'aucun e-mail n'est parti.
6. Publier les pages « Réserver », « Ma réservation », « Retrouver ma réservation », « Modifier ma réservation » (en
   brouillon chez un nouveau client tant que le service réel n'est pas activé).

Non fait : écran de liste des réservations dans le studio (la fonction `listReservations` existe côté serveur, sans
interface) et rappel automatique avant le repas.

## Adaptation à un autre restaurant

Choisir TABLE SAISON pour un autre projet reprend son nom, son accroche, ses photos, ses prestations et ses coordonnées,
avec la composition du thème. Rien de la démonstration n'est copié (plats, prix, photos, mentions). Les pages qui attendent
ses informations (la carte, au fil des saisons, grandes tablées, réservation et gestion) sont créées **en brouillon** :
visibles dans le studio, jamais publiées tant qu'elles ne sont pas complétées. Ses pages existantes (contact, FAQ,
mentions légales) ne sont pas écrasées.

## Mode d'emploi (pour le restaurant)

- **Changer un plat ou un prix** : Boutique › page « La carte » › section « La carte » › bloc du plat (nom, description,
  prix, case « Plat végétarien »). Une rubrique = un bloc « Rubrique » ; les plats qui suivent lui appartiennent.
- **Changer une photo** : section concernée › « Image » (choisir dans la bibliothèque) ; « Cadrage de la photo » règle ce
  qui reste visible (ex. `50% 60%`).
- **Horaires** : pied de page (bloc « Horaires »), page Contact (section « Nous rendre visite »), et heures réservables
  dans « Réglages du restaurant » (services, heures, fermetures).
- **Gérer une réservation (client)** : lien « Gérer ma réservation » reçu à la confirmation, ou page « Retrouver ma
  réservation » ; modification et annulation depuis la page « Ma réservation ».

## Fichiers communs touchés (coordination)

Enregistrement du 12ᵉ thème : `theme-fit.ts`, `theme-catalog.ts` (+ point d'extension `finish`), `theme-access.ts`,
`plan-entitlements.ts` (famille Services, 2ᵉ place), `direction-palettes.ts`, `section-families.ts`, `section-library.ts`,
`reference-themes.ts`, `directions.ts` (appel de `finish`, 4 lignes), `settings_schema.json` (option du style),
`theme.css` (2 règles `.dir-table-saison`), `i18n/schema.en.json` (traductions), `public/demo/manifest*.json`,
`scripts/prepare-theme-demos.ts`, `scripts/reference-static-preview.ts`, `tests/demo-fixtures.ts`, tests de comptage
(11 → 12 thèmes), `docs/coordination/BIBLIOTHEQUE_SECTIONS_COUVERTURE.md` (lignes ajoutées), libellé « Douze thèmes »
de la galerie du studio. Aucun autre thème, aucune démonstration existante et aucune page commerciale n'est modifié
(l'accueil commercial et la page Découverte disent encore « onze thèmes » : à mettre à jour sur décision de Thomas).
