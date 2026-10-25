# PARENTHÈSE — cabinet de sophrologie, famille Prestations de services

Branche `claude/theme-parenthese`, construite sur la branche d'ATELIER NUANCE (`claude/theme-atelier-nuance`, PR #178,
pas encore fusionnée) pour ne pas écraser ce travail récent. Seul le dossier `docs/theme-briefs/parenthese/` a été repris
de la branche documentaire `brief/parenthese-20261024` (PR #179). **Rien n'est fusionné ni déployé**, aucun appel IA payant,
aucune réservation réelle, aucun envoi.

Consigne suivie : `docs/theme-briefs/parenthese/CONSIGNE_CLAUDE.md` et les six planches de `maquettes/`
(01 séances, 02 accueil, 03 ateliers, 04 réservation, 05 approche / journal / cabinet, 06 contact / FAQ / légal / gestion).

## Pour Thomas, en bref

- **Ce que vous voyez dans la démonstration** : un cabinet de sophrologie fictif complet, 35 pages, sur ordinateur et
  téléphone. On peut tout essayer : réserver une séance au cabinet ou en visio, un atelier, recevoir une référence,
  ajouter le rendez-vous à son agenda, le modifier, l'annuler, le retrouver. **C'est une simulation** : rien ne part,
  rien n'est enregistré ailleurs que dans le navigateur, et c'est écrit à l'écran.
- **Ce que vous pouvez modifier dans le studio** (Boutique → éditeur) : tous les textes, toutes les photos, l'ordre des
  sections, en masquer, en dupliquer, en ajouter depuis la bibliothèque (29 sections « Parenthèse », en français et en
  anglais).
- **Les séances, les ateliers, les tarifs, les durées, les horaires** se règlent à **un seul endroit** : la section
  « Réglages du cabinet » (dans l'en-tête). Changer le tarif d'une séance à cet endroit le change partout (accueil,
  séances, première séance, réservation, confirmation, gestion). Les valeurs actuelles (60 € / 60 minutes, 20 € /
  1 h 15, dates des ateliers, places) sont des **exemples annoncés** (« Tarifs et disponibilités de démonstration »).
- **Pour de vraies réservations** : dans « Réglages du cabinet », choisir le mode « Service réel », coller l'adresse du
  service donnée par le studio, renseigner horaires, fermetures, délai d'annulation, e-mail du cabinet. Sans cela, le
  site reste en démonstration. L'envoi des e-mails demande que l'envoi d'e-mails du studio soit configuré (SMTP) ; sinon
  le site le dit honnêtement (« aucun e-mail n'a pu être envoyé, notez votre référence »).
- **À fournir par le cabinet** (affiché « [À renseigner] » ou « [À compléter : …] ») : adresse, téléphone, e-mail,
  horaires affichés, parcours et formation, mentions légales, conditions de réservation, outil de visio utilisé.
- **Il manque 7 photos** (05 à 11) : la partie 1 du ZIP (`PARENTHESE_IMAGES_01_A_11.zip`) est arrivée coupée.
  Elles sont remplacées par des photos du même kit et signalées. Renvoyez-la et elles prendront leur place sans autre
  modification.
- **Branche livrée ≠ fusion ≠ studio** : le thème est sur la branche et dans la PR ; il n'apparaîtra dans votre studio
  qu'après fusion puis déploiement. La validation du rendu vous revient.

## Ce qui est livré

| Domaine | Contenu |
|---|---|
| Pages | Accueil, séances, première séance, séance en visio, ateliers (liste filtrable), 3 fiches d'atelier, entreprises (formulaire), prendre rendez-vous, mon approche, le cabinet (galerie + visionneuse, accès, plan illustratif annoncé), journal (catégories) + 10 articles, contact, FAQ (4 catégories), retrouver mon rendez-vous, mon rendez-vous, 4 pages légales à onglets, page introuvable (404). Recherche du thème de base conservée. |
| Réservation (planche 04) | 4 étapes : prestation + modalité (cabinet / visio ; un atelier n'a pas de modalité) → date et heure (calendrier, jours fermés / complets / passés, horaires libres) → coordonnées (récapitulatif ; sur téléphone, formulaire puis récapitulatif comme la planche) → confirmation (variantes cabinet et visio, référence, fichier agenda `.ics` au fuseau Europe/Paris, « Gérer mon rendez-vous »). Retour entre les étapes, erreurs de saisie, créneau pris au dernier moment (message + nouveaux horaires), aucune donnée médicale demandée, aucun paiement. |
| Gestion (planche 06) | Détail, modifier (dialogue : date puis nouvel horaire, créneaux libres sans compter le rendez-vous lui-même), annuler (dialogue de confirmation, Échap, focus piégé puis rendu), note personnelle, ajout à l'agenda, statut « Annulé ». Lien sans accès : écran « introuvable » ; lien expiré : écran dédié. |
| Ateliers | Filtres par date et par thème qui filtrent vraiment, « Réinitialiser », état vide, places restantes issues des réglages (démo) ou des réservations (service réel), atelier complet ou passé signalé et non réservable. |
| Service réel | `src/lib/cabinet/booking.ts` + API publique `src/app/api/public/cabinet/[projectId]/…` : créneaux vérifiés sur toute la durée, écriture dans une transaction (deux personnes sur le même créneau : la seconde reçoit « créneau pris »), places d'atelier jamais négatives et rendues à l'annulation, références non devinables (`P-2026-XXXXX`), accès par jeton secret limité dans le temps (120 jours pour le lien de réservation, 7 jours pour « Retrouver »), réponse toujours neutre à « Retrouver », isolation par cabinet, débit limité. Ouvert seulement si le cabinet a activé le mode « Service réel ». |
| Cookies | Bandeau « Tout accepter / Tout refuser / Personnaliser » ; aucun script facultatif avant l'accord (aucun script tiers chargé) ; choix mémorisé. |
| Studio | Thème proposé dans la famille **Prestations de services** (forfait « Vendre », 3ᵉ thème de la famille), démonstration intégrale dans la galerie avant le choix, 29 sections `pa-*` dans la bibliothèque (FR/EN), contenu modifiable, sauvegarde et rechargement testés. |
| Autre cabinet | Ses textes, ses photos, ses prestations, ses tarifs et durées s'il les a donnés (rien d'inventé) ; aucune donnée de la démonstration (nom, prix, ateliers, formation, coordonnées) ; pages de réservation et légales en **brouillon** tant qu'elles ne sont pas complétées. |

## Matrice planche → page → section → image → interaction → preuve → état

Captures : `reports/parenthese/captures/` (ordinateur 1440, téléphone 390, contrôles 360 et 430, parcours, états).
Comparaisons côte à côte (planche à gauche, rendu à droite) : `reports/parenthese/comparaisons/`.
« Testé » = vérifié par un test automatique (`tests/parenthese-*.test.ts`) **et/ou** rejoué dans Chromium (scripts du
rapport). « Réalisé » = présent et rendu, comparé visuellement. Aucune ligne n'est « bloquée ».

| Planche | Page / état | Adresse | Sections | Images (kit) | Interactions | Preuve | État |
|---|---|---|---|---|---|---|---|
| 02 | Accueil | `/` | pa-hero, pa-needs, pa-intro, pa-offers, pa-band, pa-steps, pa-approach, pa-posts, pa-faq, pa-cta | 01, 02, 03, 04, 05→41, 06→27, 07→29, 08→38, 09→36, 10→32, 11→37, 15, 33 | menu, FAQ repliable (téléphone), liens vers séance / atelier préremplis, barre fixe téléphone | `cmp-02-accueil.jpg` | testé |
| 01 | Les séances | `/pages/seances` | pa-hero, pa-cards ×2, pa-split, pa-features, pa-cta | 12, 13, 14, 15 | « Prendre rendez-vous » → séance préchoisie | `cmp-01-seances.jpg` | testé |
| 01 | Votre première séance | `/pages/premiere-seance` | pa-hero (repères tarif / durée / lieu), pa-gallery, pa-steps, pa-split, pa-practical, pa-faq | 06→27, 02, 13, 16, 05→41, 35 | FAQ « Afficher toutes les réponses » | `cmp-01-seances.jpg` | testé |
| 01 | Séance en visio | `/pages/seance-en-visio` | pa-hero, pa-features ×2, pa-steps, pa-band, pa-notice, pa-cta | 14, 17, 18 | réservation visio préchoisie | `cmp-01-seances.jpg` | testé |
| 03 | Les ateliers | `/pages/ateliers` | pa-hero, pa-workshops, pa-notice | 19, 20, 21, 22 | filtres date / thème, réinitialiser, état vide | `cmp-03-ateliers.jpg`, `int-ateliers-vide-1440.jpg` | testé |
| 03 | 3 fiches d'atelier | `/pages/atelier-…` | pa-hero (étiquettes, date, durée, tarif), pa-split, pa-steps, pa-atelier (infos, places, FAQ, similaires, barre téléphone) | 15, 20–24, 34 | « Réserver ma place » → atelier préchoisi, complet / passé désactivé | `cmp-03-ateliers.jpg` | testé |
| 03 | Entreprises | `/pages/entreprises` | pa-hero, pa-features, pa-band, pa-notice, pa-request | 25, 26 | formulaire (champs requis, erreurs, envoi simulé annoncé) | `cmp-03-ateliers.jpg` | testé |
| 04 | Réservation étapes 1 à 4 | `/pages/prendre-rendez-vous` | pa-booking | 14, 27, 28, 29, 30, 35, 42 | 4 étapes, retour, erreurs, conflit, `.ics`, gérer | `cmp-04-*.jpg`, `parcours/flow-*` | testé |
| 04 / 06 | Créneau pris | même page | pa-booking | — | message + horaires libres | `flow-conflit-*`, `live-conflit-1440.jpg` | testé |
| 05 | Mon approche | `/pages/mon-approche` | pa-hero, pa-split ×2, pa-cta ×2 | 36, 37, 38 (09→36) | — | `cmp-05-*.jpg` | réalisé |
| 05 | Journal | `/pages/conseils` | pa-hero, pa-posts (catégories), pa-newsletter | 03, 15, 31–35, 36, 37 (10→32, 11→37) | catégories Tous / Quotidien / La pratique / Le cabinet, inscription (simulée annoncée) | `cmp-05-*.jpg` | testé |
| 05 | 10 articles | `/pages/conseils-…` | pa-article, pa-posts (similaires) | 31–37, 02, 03, 15 (selon l'article) | — | `captures/ordinateur-1440/page-conseils-*` | réalisé |
| 05 | Le cabinet | `/pages/le-cabinet` | pa-hero, pa-gallery (visionneuse), pa-place (accès, plan illustratif annoncé) | 28, 36, 37, 38, 39, 40 (08→38) | visionneuse : flèches, Échap, focus | `cmp-05-*.jpg`, `int-visionneuse-1440.jpg` | testé |
| 06 | Contact | `/pages/contact` | pa-contact | 38 | formulaire (requis, erreurs, envoi simulé annoncé), « [À renseigner] » | `cmp-06-contact-faq-legales.jpg` | testé |
| 06 | FAQ | `/pages/faq` | pa-hero, pa-faq (catégories) | 40 | onglets au clavier (flèches), accordéons | `cmp-06-contact-faq-legales.jpg` | testé |
| 06 | Retrouver | `/pages/retrouver-mon-rendez-vous` | pa-lookup | 41 | champs requis, réponse neutre | `cmp-06-contact-faq-legales.jpg` | testé |
| 06 | Mon rendez-vous | `/pages/mon-rendez-vous` | pa-manage | 42 | modifier, annuler, note, agenda, lien expiré / introuvable | `cmp-06-gerer-legal-404.jpg`, `parcours/manage-*`, `live-expire-1440.jpg` | testé |
| 06 | Pages légales (4 onglets) | `/pages/mentions-legales`, `confidentialite`, `conditions-de-reservation`, `cookies` | pa-hero, pa-legal | 39 | onglets (une page chacun) | `cmp-06-gerer-legal-404.jpg` | testé |
| 06 | Page introuvable | toute adresse inconnue | pa-hero (centre) | 39 | retour accueil, prendre rendez-vous | `cmp-06-gerer-legal-404.jpg` | testé |
| 06 | Bandeau cookies | toutes les pages | pa-cabinet | — | accepter, refuser, personnaliser, mémorisé | `int-cookies-1440.jpg` | testé |
| — | Service réel : places, jour complet, erreur réseau, lien expiré | réservation, ateliers, gestion | — | — | API simulée dans le navigateur | `etats-et-interactions/live-*` | testé |

(`05→41` : la photo 05 manque, la 41 tient sa place.)

## Écarts restants (à valider par Thomas)

- **Photos 05 à 11 absentes** (ZIP 01–11 tronqué) : remplacées par des photos proches du même kit (05→41, 06→27,
  07→29, 08→38, 09→36, 10→32, 11→37). Cela crée des réemplois visibles (même photo deux fois sur l'accueil pour 08/38
  par exemple) qui disparaîtront avec le bon ZIP.
- **Pied de page** : la planche 02 (accueil) a un pied clair, les planches 03 et 06 un pied vert foncé. Le pied clair
  de la planche 02 est utilisé partout (consigne : en-tête et pied harmonisés sur la 02) ; le style « vert » existe
  dans les réglages du pied.
- **Logo** : la planche 02 sert de référence (signature en arc, « Sophrologie & bien-être ») ; les variantes des autres
  planches ne sont pas reprises.
- **Article** : la date « 12 avril 2024 » de la planche n'est pas recopiée (aucune date inventée) ; seul le temps de
  lecture est affiché.
- **Références** : « P-0001 » en démonstration (la planche 06 montre « demoP-0001 ») ; en service réel, une référence
  non devinable `P-2026-XXXXX`.
- **Journal** : il liste les 10 articles (7 sur la planche 05, plus les 3 de l'accueil) pour qu'aucun article ne soit
  orphelin.
- **Mobile** : sur la planche 03, l'ouverture d'une fiche d'atelier met la photo en haut ; sur la planche 01 (première
  séance), le titre est en haut. Le thème suit la planche 01 pour toutes les pages intérieures.
- **Proportions** : les planches sont des dessins réduits ; les pages suivent les proportions de l'accueil (planche 02,
  1440 px). Les cartes « Au cabinet / En visio » de la page séances sont un peu plus étroites que sur la planche.
- **Confirmation** : « Votre rendez-vous est simulé dans ce navigateur uniquement » remplace « a bien été enregistré »
  en démonstration ; en service réel le texte dépend de l'envoi réel de l'e-mail.
- **Pas d'icônes de réseaux sociaux** tant qu'aucune adresse n'est renseignée (rien d'inventé).

## Médias (42 référencés, 35 reçus)

Fichiers WebP suivis dans `public/theme-assets/parenthese/` (convertis depuis le kit HD, sans retouche ni génération).
La matrice complète (fichier → pages) est dans `reports/parenthese/RESULTATS.md`.

## Polices et licences

- Titres : **Playfair Display** (Claire Coyne / Google Fonts) — SIL Open Font License 1.1.
- Textes : **DM Sans** (Colophon Foundry / Google Fonts) — SIL Open Font License 1.1.
Les deux sont dans la bibliothèque de polices Shopify (`playfair_display_n4`, `dm_sans_n4`) : aucune police n'est
embarquée dans le dépôt.

## Exports et services

| Support | Autonome | Demande le service du studio |
|---|---|---|
| Thème Shopify (ZIP) | pages, textes, photos, filtres, FAQ, visionneuse, cookies, démonstration de réservation | créneaux réels, enregistrement, e-mails, retrouver, modifier / annuler (API `…/api/public/cabinet/<projet>`) |
| Aperçu / export statique | tout le parcours **simulé** | aucun service réel possible (un export statique ne peut pas enregistrer un rendez-vous) |
| WordPress / autres exports du studio | mêmes limites : la réservation réelle passe par l'API du studio | — |

Hébergement natif des sites clients : V2, hors périmètre.

## Coordination

- PR #167 (NOCTIL, Claude thèmes) est ouverte et touche aussi les listes du catalogue (`theme-fit.ts`,
  `theme-catalog.ts`, `theme-access.ts`, `plan-entitlements.ts`, `section-library.ts`, `schema.en.json`,
  `theme.css`, `settings_schema.json`, tests du catalogue). Rien n'a été modifié dans ses fichiers propres ; à la
  fusion, les conflits attendus sont des **ajouts d'entrées dans des listes** (garder les deux).
- Mission #172 (Maison & Horizon) : aucune PR ouverte ; aucun fichier commun touché en dehors des mêmes listes.
- Facturation, sécurité globale et moteur IA : non modifiés.
