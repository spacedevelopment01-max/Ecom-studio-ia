# APLAT — Plâtrerie & Peinture : résultats

Consigne : `docs/theme-briefs/aplat/CONSIGNE_CLAUDE.md` (PR #187), dix planches du 25 octobre 2026
(`docs/theme-briefs/aplat/maquettes/`). Thème de la **famille Prestations de services**, profil éditorial « aplat »
(`theme-base/assets/aplat.css`, `aplat.js`), sections `ap-*` réservées à ce thème. Démonstration :
`tests/aplat-fixtures.ts` ; photos dans le kit privé `public/demo/aplat/` (non publié sur GitHub).

Les photos sont des reconstitutions IA : la composition suit les planches, les photos diffèrent. Aucune comparaison
n'est déclarée « identique au pixel près » : les écarts restants sont listés plus bas.

## Pages, adresses et sections (démonstration)

| Planche | Page | Adresse | Sections (disposition) |
|---|---|---|---|
| 01 / 06 | Accueil | `/` | `ap-hero` (home), `ap-strip` (trades, ordinateur), `ap-cards` (list, téléphone), `ap-split` (matter), `ap-cards` (services, ordinateur), `ap-cards` (rows, téléphone), `ap-cards` (details), `ap-cards` (projects), `ap-compare` (side), `ap-cards` (steps), `ap-faq` (row), `ap-cta` (band) |
| 02 / 06 | Prestations | `/pages/prestations` | `ap-hero` (fade), `ap-cards` (servicerows), `ap-cards` (approach), `ap-cards` (projects), `ap-faq` (row), `ap-cta` (band) |
| 03 / 07 | Plâtrerie | `/pages/platrerie` | `ap-hero` (fade), `ap-cards` (gridside), `ap-split` (overlay, ordinateur), `ap-cards` (tiles4), `ap-faq` (stack), `ap-cta` (project) |
| 04 / 07 | Peinture | `/pages/peinture` | `ap-hero` (fade), `ap-split` (media), `ap-cards` (features4), `ap-cards` (colors), `ap-compare` (top), `ap-faq` (stack), `ap-cta` (paint) |
| 05 / 07 | Réalisations (filtres, « charger plus ») | `/pages/realisations` | `ap-hero` (fade), `ap-cards` (gallery), `ap-cta` (slim) |
| 06 / 07 | Détail d'un chantier (exemple illustratif) | `/pages/detail-chantier` | `ap-hero` (fade), `ap-cards` (timeline), `ap-cards` (mosaic), `ap-compare` (top), `ap-split` (zoom, ordinateur), `ap-cta` (projectslim) |
| 07 / 08 | Notre approche | `/pages/notre-approche` | `ap-hero` (fade), `ap-cards` (method4), `ap-cta` (light) |
| 08 / 08 | Questions (recherche, catégories) | `/pages/faq` | `ap-hero` (fade), `ap-faq` (page) |
| 09 / 08 | Contact | `/pages/contact` | `ap-form` (contact) |
| 10 / 08 | Devis (2 étapes sur téléphone, photos) | `/pages/devis` | `ap-form` (quote) |
| 11 / 09 | Enduits et préparation | `/pages/enduits-et-preparation` | `ap-hero` (box), `ap-strip` (steps, ordinateur), `ap-cards` (alternate), `ap-cards` (complements), `ap-faq` (band), `ap-cta` (note) |
| 12 / 09 | Conseils (filtres) | `/pages/conseils` | `ap-hero` (box), `ap-cards` (articles), `ap-split` (note, ordinateur), `ap-cta` (band) |
| 13 / 09 | Article | `/pages/quelles-photos-joindre` | `ap-article` |
| 14 / 09 | Confirmation | `/pages/confirmation` | `ap-confirm`, `ap-faq` (row), `ap-cta` (help, téléphone) |
| 15 / 10 | Mentions légales | `/pages/mentions-legales` | `ap-hero` (fade), `ap-legal` (mentions) |
| 16 / 10 | Confidentialité | `/pages/confidentialite` | `ap-hero` (fade), `ap-legal` (privacy) |
| 17 / 10 | Cookies et préférences | `/pages/cookies` | `ap-hero` (fade), `ap-legal` (cookies) |
| 18 / 10 | Page introuvable | toute adresse inconnue | `ap-hero` (notfound), `ap-cards` (shortcuts) |
| — | Plan du site (lien de la barre légale) | `/pages/plan-du-site` | `ap-hero` (fade), `ap-cards` (shortcuts) |

En-tête `ap-header` (menu plein panneau sur téléphone, barre « Mon projet / Contact ») et pied `ap-footer` : cinq pieds
selon le groupe de pages (charbon à colonnes, clair en deux lignes, clair à colonnes et matière, charbon et trait de
peinture, barre charbon) et le panneau « Vos préférences de navigation ».

## Ce qui est fait

| Demande | État | Preuve |
|---|---|---|
| 18 pages, ordinateur et téléphone, menu mobile | fait | captures et comparaisons de chaque panneau (envoyées à part, non versionnées : photos privées) |
| Navigation : lien actif (page enfant rattachée à son parent), Échap, clic en dehors, focus visible et rendu | fait | `scripts/aplat-interactions.ts` |
| Filtres et « charger plus » (réalisations, conseils) | fait | idem |
| Questions : recherche, onglets, accordéons | fait | idem |
| Comparateur avant/après : pointeur, toucher, clavier | fait (curseur natif) | idem |
| Devis : 2 étapes sur téléphone, erreurs à côté des champs et résumé accessible, champs gardés entre étapes, photos JPG/PNG ≤ 10 Mo (vignette, nom, retrait, erreur), pas de double envoi, envoi simulé « Démonstration — demande non envoyée », aucun prix automatique | fait | idem + `tests/aplat.test.ts` |
| Cookies : essentiels toujours actifs, mesure et contenus externes désactivés par défaut, Tout refuser / Enregistrer / Tout accepter, réouverture (« Gestion des cookies » et page Cookies), aucun traceur avant accord, aucun faux partenaire | fait | idem |
| Aucun défilement horizontal à 360, 390, 430, 768 et 1440 px | fait | idem (toutes les pages) |
| Thème modifiable dans le studio (textes, images et cadrages, couleurs, sections, liens), sauvegardé | fait | réglages des sections `ap-*` (variantes téléphone, cadrages, tailles) ; galerie de la famille Services |
| FR/EN | fait | 467 libellés et textes par défaut traduits (`theme-base/i18n/schema.en.json`) ; `tests/theme-en.test.ts` |
| Démonstration complète avant le choix | fait | `npx tsx scripts/prepare-theme-demos.ts aplat` |
| « Choisir ce thème » : structure avec les données du client, sans photo ni coordonnée de démonstration | fait | `src/lib/theme/aplat-site.ts` ; `tests/aplat.test.ts` |
| Catalogue : famille Services, ouvert à partir du forfait Vendre | fait (forfait à confirmer) | `src/lib/plan-entitlements.ts` |

Adaptation client (`aplat-site.ts`) : accueil, prestations, notre approche (page « À propos »), questions, contact
(coordonnées et lien d'appel du client, calendrier de réservation s'il en a un), devis et confirmation (si le client
accepte les demandes de devis), mentions légales, confidentialité et cookies (« À renseigner »), page introuvable.
Les réalisations, conseils, matière d'enduit et avant/après ne sont pas posés tant que le client n'a pas de vraies
photos de chantier : rien de la démonstration n'est repris.

## Comparaisons

Méthode : chaque panneau des planches est découpé puis mis à la largeur de la page (1440 px pour l'ordinateur, 390 px
pour le téléphone) ; la page rendue est capturée à la même largeur ; superposition à 50 %, image de différence et
côte à côte. Panneaux : ordinateur 01 à 18 ; téléphone accueil, prestations, 03 à 09, devis étapes 1 et 2, menu,
11 à 18, validation et photos, préférences de cookies.

## Écarts restants (connus)

1. **Échelle variable des planches** : sur les planches, l'en-tête et le pied n'ont pas la même taille d'un panneau à
   l'autre (ex. téléphone : panneau 14 environ 25 % plus grand que le 11). Un seul en-tête et un seul pied par groupe
   de pages, à l'échelle de la planche 01 ; le contenu suit les proportions de chaque panneau.
2. **Police** : Lato (libre) au lieu de la police des planches (non identifiée) ; largeurs à 3 % près.
3. **Photos** : reconstitutions IA, cadrages rattrapés par point focal, zoom et photo distincte sur téléphone ; les
   sujets diffèrent (ex. rouleau sur bac au lieu de rouleau contre le mur, enduits).
4. **Trait de peinture** du pied « charbon » : dessin vectoriel approché.
5. **Logo du pied mobile** : le fichier de logo est plus haut que sur la planche ; largeur réduite pour garder la hauteur.
6. **Validation et photos (planche 10)** : la planche montre un devis en trois étapes ; la planche 08 en montre deux.
   Les deux étapes de la planche 08 sont gardées (état d'erreur et photo refusée identiques).
7. **Panneau des cookies** : le troisième bouton dit « Enregistrer mes choix » (consigne) au lieu de « Personnaliser
   mes choix » (planche 10).
8. **Libellés des mockups incohérents gardés cohérents** : « Voir des réalisations » (ordinateur) partout, catégorie
   « Projet » pour « Préparer le premier échange » (la planche mobile dit « Chantier », ce qui fausserait le filtre),
   « Article à venir » au lieu d'une flèche vers un article qui n'existe pas.
9. **Tablette (768 à 1023 px)** : composition téléphone ; de 1024 à 1439 px, la composition ordinateur est réduite à
   l'échelle (pas de planche pour ces largeurs).
10. **Envoi des photos sur le site publié** : le formulaire de contact Shopify n'envoie pas de fichiers ; sans service
   relié (réglage « Envoi de photos relié à la boutique »), la page le dit et propose de les transmettre lors de l'échange.

## Vérifications

- `npx tsc --noEmit` : sans erreur.
- `npx vitest run` : voir la PR (un échec préexistant sans rapport, `tests/social-autopilot-pilote.test.ts`, échoue
  aussi sur le code d'origine).
- Theme Check (`scripts/verify-theme.sh`) : APLAT boutique et services, FR et EN, sans erreur.
- `npx tsx scripts/aplat-interactions.ts <export>/aplat` : 38/38.

Limites : aucun appel IA payant, aucun envoi réel de formulaire, aucune fusion ni déploiement.
