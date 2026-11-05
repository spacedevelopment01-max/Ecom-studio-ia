| Statut (interface, deux modes) | Opérations |
|---|---:|
| SYNA_OK | 50 |
| PARTIEL | 0 |
| ECHEC | 0 |
| ABSENT | 15 |
| BLOQUE_CONNEXION_OU_CONSENTEMENT | 10 |
| NON_TESTE | 5 |
| **Total** | **80** |

Légende : ✓ recette réussie dans ce mode · ◐ partielle · ✗ échec · — non visée. « Encre » et « Plein » couvrent chacun l'ordinateur et le téléphone : les recettes de Codex enchaînent 1440 px (et souvent 1024 px) puis 390 / 360 px, sauf `blog-ui` et `closure-ui` (ordinateur seulement) et `retouches-ui` (téléphone 390 px pour la partie retouche).

| Cap. | Opération | Libellé (matrice #302) | Recette(s) | Encre | Plein | Statut | Remarque |
|---|---|---|---|:-:|:-:|---|---|
| C01 | `conversation.attachments` | Conversation persistante | — | — | — | **NON_TESTE** | aucune recette navigateur ne vise cette opération à ce relevé |
| C01 | `conversation.persist` | Conversation persistante | `ui`, `specialists`, `background-communication-ui`, `recette-292` | ✓ | ✓ | **SYNA_OK** |  |
| C02 | `brief.update` | Corriger une fiche encore modifiable | `ui` | ✓ | ✓ | **SYNA_OK** |  |
| C03 | `conversation.resume-existing` | Reprise d’un projet existant | `ui` | ✓ | ✓ | **SYNA_OK** |  |
| C04 | `context.mode-switch` | Contexte et modes Encre/Plein cadre | `recette-292` | ✓ | ✓ | **SYNA_OK** |  |
| C04 | `context.selection-revalidated` | Contexte et modes Encre/Plein cadre | `context-ui`, `context-manual-ui`, `recette-292` | ✓ | ✓ | **SYNA_OK** |  |
| C05 | `theme.exact-edit` | Retoucher un texte exact ou média acquis | `specialists-tools-theme-ui`, `closure-ui`, `recette-292` | ✓ | ✓ | **SYNA_OK** |  |
| C05 | `theme.undo` | Annuler une retouche avec son reçu | `closure-ui`, `recette-292` | ✓ | ✓ | **SYNA_OK** |  |
| C06 | `theme.compose` | Composer avec les composants natifs | `composition-ui-original-ui`, `acquired-copy-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C06 | `theme.original` | Créer un site sans thème de départ | `composition-ui-original-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C06 | `theme.select` | Choisir un thème dans la galerie | `specialists-tools-theme-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C07 | `native.custom-theme` | Pages, sections et thème sur mesure | — | — | — | **ABSENT** | thème sur mesure (theme.custom) : aucun adaptateur SYNA |
| C07 | `native.pages` | Pages, sections et thème sur mesure | — | — | — | **ABSENT** | aucun outil SYNA : pages et navigation restent dans Boutique › Structure (natif) |
| C07 | `native.sections` | Pages, sections et thème sur mesure | — | — | — | **ABSENT** | ajout/suppression de section hors des retouches gratuites B1 : natif seulement |
| C08 | `theme.capture` | Capturer le rendu réel et ses mesures | `render-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C08 | `theme.export` | Créer un ZIP natif en bibliothèque | `exports-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C09 | `offer.analyse` | Analyser l’offre sans avancer d’étape | `specialists-tools-tools-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C09 | `proposal.choose` | Retenir une proposition et ses raisons | `choices-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C09 | `proposal.compare` | Comparer des propositions versionnées | `choices-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C09 | `research.approve` | Valider un angle dans la préparation | `research-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C09 | `research.generate` | Rechercher et conserver les hypothèses | `research-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C09 | `strategy.compare` | Comparer les angles marketing acquis | `choices-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C09 | `strategy.preference` | Retenir ou écarter un angle dans la discussion, puis annuler | `choices-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C10 | `brand.confirm` | Choisir une identité textuelle acquise | `brand-ui-brand-review-brand-correction` | ✓ | ✓ | **SYNA_OK** |  |
| C10 | `brand.correct` | Corriger nom et signature avant leur choix | `brand-ui-brand-review-brand-correction` | ✓ | ✓ | **SYNA_OK** |  |
| C10 | `brand.generate` | Créer une identité de marque | `brand-ui-brand-review-brand-correction` | ✓ | ✓ | **SYNA_OK** |  |
| C11 | `logo.generate` | Créer trois propositions de logo | `logos-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C11 | `logo.replace` | Choisir puis valider une identité acquise | `logo-selection-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C12 | `catalogue.create` | Créer un brouillon produit | `catalogue-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C12 | `catalogue.read` | Lire une fiche et ses variantes autorisées | `catalogue-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C12 | `catalogue.stock` | Renseigner les quantités d’un brouillon | `catalogue-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C12 | `catalogue.sync` | Synchroniser une boutique connectée | — | — | — | **BLOQUE_CONNEXION_OU_CONSENTEMENT** | boutique connectée réelle requise |
| C12 | `catalogue.update` | Retoucher un brouillon et ses variantes sans suppression | `catalogue-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C12 | `native.stock.patch-target-version` | Catalogue produits, variantes, stocks | — | — | — | **NON_TESTE** | aucune recette navigateur ne vise cette opération à ce relevé |
| C13 | `images.correct` | Corriger une image avec sa source et son devis | `retouches-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C13 | `images.generate` | Créer de 1 à 5 images IA distinctes | `images-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C13 | `images.search` | Chercher des photos libres | — | — | — | **NON_TESTE** | aucune recette navigateur ne vise cette opération à ce relevé |
| C13 | `images.upload` | Importer ses images | `images-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C14 | `videos.edit` | Retoucher durée, texte, transitions et musique locale | `videos-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C14 | `videos.generate` | Générer des clips IA après scénario et devis | `generated-videos-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C14 | `videos.motion` | Monter les images acquises avec mouvement local | `videos-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C14 | `videos.plan` | Préparer une vidéo filmée par IA | `generated-videos-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C14 | `videos.restore` | Restaurer une version vidéo conservée | `videos-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C14 | `videos.retake` | Remplacer un seul clip avec devis, sans racheter les autres | `clip-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C14 | `videos.voice` | Corriger les phrases vocales sans racheter les clips | `voice-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C15 | `blog.generate` | Créer un brouillon d’article natif | `blog-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C15 | `blog.publish` | Publier un article | — | — | — | **BLOQUE_CONNEXION_OU_CONSENTEMENT** | publication réelle : interdite sans accord |
| C15 | `copy.edit` | Retoucher les passages choisis d’un texte natif | `content-ui`, `targeted-copy-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C15 | `copy.generate` | Rédiger un document natif pour une page précise | `content-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C15 | `native.seo.metadata-only-delivery` | Textes, SEO et blog | — | — | — | **NON_TESTE** | aucune recette navigateur ne vise cette opération à ce relevé |
| C15 | `seo.update` | Rédiger les métadonnées d’une page | — | — | — | **NON_TESTE** | aucune recette navigateur ne vise cette opération à ce relevé |
| C16 | `calendar.update` | Déplacer une publication programmée | — | — | — | **ABSENT** | déplacement d'une publication programmée : natif seulement |
| C16 | `social.draft` | Enregistrer des brouillons avec les médias acquis | `social-ui`, `social-reuse-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C16 | `social.plan` | Préparer un calendrier de brouillons | `social-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C16 | `social.publish` | Publier sur un réseau | — | — | — | **BLOQUE_CONNEXION_OU_CONSENTEMENT** | publication réseau réelle : interdite sans accord |
| C17 | `social.generate` | Créer une image manquante d’un brouillon natif | `social-production-ui`, `social-aspect-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C18 | `ads.create` | Créer le visuel manquant d’une annonce brouillon | `campaign-visual-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C18 | `ads.launch` | Activer une campagne réelle | — | — | — | **BLOQUE_CONNEXION_OU_CONSENTEMENT** | campagne réelle : interdite sans accord |
| C18 | `campaign.draft` | Préparer un brouillon de campagne avec les médias acquis | `campaign-ui` | ✓ | ✓ | **SYNA_OK** |  |
| C19 | `native.ad-document-edit` | Retouche publicitaire locale et nouvelle version | — | — | — | **ABSENT** | documents publicitaires à calques : éditeur natif seulement |
| C19 | `native.ad-regenerate` | Retouche publicitaire locale et nouvelle version | — | — | — | **ABSENT** | nouvelle version d'un document publicitaire : natif seulement |
| C20 | `native.initial-batch` | Lot initial et automatisations | — | — | — | **ABSENT** | lot initial 10 + 10 et pilote automatique : natif seulement |
| C21 | `menu.update` | Modifier la carte du restaurant (plats, prix, allergènes déclarés) | `contenus-301` | ✓ | ✓ | **SYNA_OK** |  |
| C21 | `projects.update` | Ajouter ou modifier une réalisation (photos, avant/après) | `contenus-301` | ✓ | ✓ | **SYNA_OK** |  |
| C21 | `properties.update` | Modifier un bien immobilier | `contenus-301` | ✓ | ✓ | **SYNA_OK** |  |
| C21 | `services.update` | Modifier les prestations et coordonnées | — | — | — | **ABSENT** | prestations et coordonnées : hors du raccordement #310 (biens, plats, réalisations seulement) |
| C22 | `appointments.cancel` | Annuler un rendez-vous | — | — | — | **BLOQUE_CONNEXION_OU_CONSENTEMENT** | annulation réelle : acte sensible, jamais exécuté |
| C22 | `appointments.create` | Réserver un rendez-vous réel | — | — | — | **BLOQUE_CONNEXION_OU_CONSENTEMENT** | rendez-vous réel : acte sensible, jamais exécuté dans cette recette |
| C22 | `appointments.settings` | Modifier les règles de réservation | — | — | — | **ABSENT** | règles de réservation : natif seulement |
| C22 | `services.booking` | Modifier prestations, horaires et intervenants de la réservation | — | — | — | **ABSENT** | réglages de réservation : natif seulement |
| C22 | `site.requests` | Lire les demandes de devis et de contact reçues | — | — | — | **ABSENT** | lecture des demandes reçues : natif ; faux accusés corrigés par Codex (#308) |
| C23 | `connections.configure` | Connecter un compte externe | — | — | — | **BLOQUE_CONNEXION_OU_CONSENTEMENT** | compte externe réel : aucune connexion dans cette recette |
| C23 | `site.domain.connect` | Relier un domaine déjà possédé au site hébergé | — | — | — | **BLOQUE_CONNEXION_OU_CONSENTEMENT** | domaine réel : interdit sans accord |
| C23 | `site.host.publish` | Publier une nouvelle version du site hébergé | — | — | — | **BLOQUE_CONNEXION_OU_CONSENTEMENT** | publication réelle : interdite sans accord du propriétaire |
| C23 | `theme.publish` | Publier le site sur un CMS | — | — | — | **BLOQUE_CONNEXION_OU_CONSENTEMENT** | publication CMS réelle : interdite sans accord |
| C24 | `files.delete` | Supprimer un fichier | — | — | — | **ABSENT** | suppression : volontairement hors SYNA (acte destructif), natif avec corbeille |
| C24 | `files.organize` | Ranger ou renommer un fichier | `fichiers-301` | ✓ | ✓ | **SYNA_OK** |  |
| C24 | `prompts.edit` | Modifier les consignes d’un moteur | — | — | — | **ABSENT** | consignes des moteurs : natif (administration) seulement |
| C25 | `native.brand-propagation` | Workflow ancien et propagation de marque | — | — | — | **ABSENT** | propagation de marque (/brand/impact) : natif seulement |
| C25 | `native.workflow` | Workflow ancien et propagation de marque | — | — | — | **ABSENT** | ancien workflow : natif seulement |
