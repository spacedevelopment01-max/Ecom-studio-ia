# Routage multimédia intelligent V2 (logos, images, publicités, vidéos)

Branche : `claude/ecom-studio-ia-platform-8cwl79`. **Non fusionnée.**

Ce qui n'a pas changé :
- aucun appel d'IA payant ;
- aucun changement des prix commerciaux, des abonnements ni de la page d'accueil ;
- le routage actuel des clients : **mode manuel par défaut**, mêmes modèles principaux qu'avant (OpenAI GPT Image 1,
  Veo 3).

## 1. Audit : ce qui était réellement appelé

Toutes les générations d'images et de vidéos passent par un seul fichier, `src/lib/ai/media-providers.ts`. Il est
appelé par les moteurs suivants :

| Moteur | Fonctions appelées | Fournisseur réellement appelé |
|---|---|---|
| Brand & Logo Engine V2 (`logo-v2/ai.ts`, `engine/identity.ts`, `engine/full-logo.ts`) | `logoSymbolImage`, `fullLogoImage` | OpenAI `gpt-image-1` (principal) ou Gemini `gemini-2.5-flash-image` |
| Image Engine V2 (`image-v2/deps.ts`, `engine/images.ts`, `engine/service-media.ts`) | `openaiScene` (retouche par masque), `geminiPlate` (décor vide), `ambianceImage` | OpenAI `gpt-image-1` / Gemini `gemini-2.5-flash-image` |
| Advertising Engine V2 (`ads-v2/deps.ts`) | via l'Image Engine V2 | idem |
| Video & UGC Engine V2 (`video-v2/deps.ts`, `engine/videos.ts`, `engine/ugc.ts`) | `veoClip`, `falClip`, `ugcFrame` | Google `veo-3.0-generate-001` / `veo-3.0-fast-generate-001`, fal `kling-video/v2.1/pro` |

Ce que l'audit a montré :
- **Les modèles étaient codés en dur** : dès que la route ne visait pas le fournisseur concerné, l'appel retombait
  sur `gpt-image-1`, `gemini-2.5-flash-image`, `veo-3.0-generate-001` ou Kling 2.1.
- **Le moteur vidéo V2 choisissait un modèle** (`req.model`), mais ce choix n'était pas transmis à l'appel réel.
- **Aucun secours n'était choisi par l'administration.** Le seul repli était celui du Router V2 vers un autre
  fournisseur capable, et seulement quand la clé manquait.
- **fal.ai ne servait que pour la vidéo** (Kling 2.1). Aucune image ne passait par fal.
- **Quality Gates** : barrières de fidélité, contrôle des plans vidéo et contrôle des logos, toutes inchangées. Le
  changement de modèle ne touche jamais aux barrières.
- **Administration** : les routes des images et des vidéos se saisissaient à la main (« fournisseur / modèle »),
  sans liste des modèles compatibles ni état réel.

## 2. Ce qui a été construit

### Catalogue (`src/lib/ai/media-models.ts`)

Pour chaque modèle, le catalogue indique :
- le fournisseur et l'identifiant exact ;
- l'**adaptateur réel** du studio ;
- les capacités : retouche par masque, images de référence, fond transparent, texte dans l'image, image vers vidéo,
  son natif, personnes ;
- la qualité relative, les formats, la résolution et les durées ;
- le statut chez le fournisseur et le remplaçant conseillé ;
- le niveau de vérification et la source officielle.

| Type | Modèle | Statut | Vérifié | Utilisable aujourd'hui |
|---|---|---|---|---|
| Image | OpenAI `gpt-image-1` | stable, **principal actuel** | identifiant et tarif | ✅ si la clé OpenAI est active |
| Image | Gemini `gemini-2.5-flash-image` | ancienne génération (remplaçant : 3.1) | identifiant et tarif (en service) | ✅ si la clé Google est active |
| Image | OpenAI `gpt-image-1.5`, `gpt-image-2`, `gpt-image-2.5-flare` | stable | identifiant ✅, tarif ❌ | 🔒 tarif par image à saisir, puis confirmer |
| Image | Gemini `gemini-3.1-flash-image`, `gemini-3-pro-image-preview`, `gemini-3.1-flash-lite-image` | stable / aperçu | identifiant ✅, tarif ❌ (prix Vertex seulement) | 🔒 idem |
| Image | fal `fal-ai/nano-banana-2/edit`, `fal-ai/flux-2/klein/9b/edit` | stable | endpoint ✅, tarif et paramètres ❌ | 🔒 idem, et exige une image de référence |
| Vidéo | Google `veo-3.0-generate-001` | ancienne génération, **principal actuel** | en service | ✅ si la clé Google est active |
| Vidéo | Google `veo-3.0-fast-generate-001` | ancienne génération | en service | ✅ (forfait Créer) |
| Vidéo | fal `kling-video/v2.1/pro/image-to-video` | ancienne génération | en service | ✅ si la clé fal est active |
| Vidéo | Google `veo-3.1-generate-preview`, `-fast-`, `-lite-` | aperçu | identifiant et paramètres ✅, tarif ❌ (Vertex seulement) | 🔒 tarif à la seconde à saisir, puis confirmer |
| Vidéo | fal `kling-video/v3/pro` et `v3/standard` (image vers vidéo) | stable | endpoint et paramètres ✅, tarif ❌ | 🔒 idem |

Sources lues :
- spécification OpenAPI officielle d'OpenAI ;
- document de découverte de l'API Gemini ;
- guides officiels `google-gemini/cookbook` (Nano Banana, Veo, Imagen) ;
- SDK officiel `googleapis/js-genai` ;
- dépôts officiels `fal-ai/fal-js` et `fal-ai/fal-blender-extension` ;
- page de tarifs Vertex AI.

Les pages de **tarifs** d'OpenAI, de l'API Gemini et de fal.ai étaient **inaccessibles** depuis l'environnement de
développement : aucun de ces prix n'est inventé.

Modèles écartés :
- **Imagen** : le guide officiel indique qu'il est abandonné dans l'API Gemini ;
- **DALL·E 2 et 3** : retirés le 12 mai 2026 selon la spécification OpenAI.

### Adaptateurs

- **OpenAI** : tous les modèles GPT Image utilisent la même interface (génération, retouche par masque, jusqu'à
  16 références). Un modèle autre que `gpt-image-1` exige un **tarif par image**, car ses jetons de sortie par
  taille sont inconnus. Sans ce tarif, la génération est bloquée : le coût maximal ne serait pas borné.
- **Gemini** : même appel `generateContent` pour 2.5, 3.1 et 3 Pro.
- **fal.ai (nouveau pour les images)** : file d'attente officielle, endpoints « edit » à partir d'images de
  référence. Les paramètres d'entrée sont à valider au premier essai réel : une demande refusée ne coûte rien.
- **Veo 3.1** : `durationSeconds` à 4, 6 ou 8 s. La durée demandée est aussi celle réservée et facturée. Veo 3 reste
  à 8 s.
- **Kling 3** : durée en texte, de 3 à 15 s. Kling 2.1 reste à 5 ou 10 s.
- **Anciennes vidéos** : ce sont des fichiers déjà enregistrés, donc rien ne les touche. Les anciens modèles restent
  appelables. Les nouveaux s'activent sans rien casser, avec un « remplaçant conseillé » affiché dans
  l'administration. Aucune date d'arrêt officielle n'a pu être vérifiée : aucun remplacement n'est imposé.

### Routage (`src/lib/ai/media-routing.ts`)

**Manuel (défaut)**
1. Le **principal** choisi dans l'administration est utilisé s'il convient au besoin.
2. Sinon, le **secours** désigné prend le relais, à condition qu'il soit compatible et utilisable (confirmé, tarifé,
   avec une clé active).
3. Sinon, le studio garde le comportement historique du Router V2.

**Relais en cours de génération**
- Si le principal échoue **sans rien facturer** (refus ou panne du fournisseur, réservation rendue), la même
  génération est relancée **une seule fois**, et **uniquement** sur le secours désigné. Le secours fait sa propre
  réservation de son coût maximal.
- Un résultat incertain (coût retenu) n'est jamais relancé.
- L'UGC n'est jamais relayé vers un modèle sans son.

**Automatique** (désactivé par défaut, réglable séparément pour les images et pour les vidéos) :
- seuls les modèles utilisables **et** activés sont candidats ;
- ils doivent avoir les capacités exigées : masque pour la fidélité du produit, références, texte, son, personnes ;
- la note de chaque modèle tient compte, dans cet ordre de poids :
  1. la qualité (30 points par niveau) ;
  2. la fidélité et les capacités utiles ;
  3. les résultats observés (échecs, notes de la barrière de qualité) ;
  4. le prix, qui ne pèse **au plus que 12 points**, donc moins qu'un niveau de qualité ;
- un modèle trop cher pour le budget restant (plus d'un quart du reste) est évité s'il existe une autre option.

Le **Video Engine V2** transmet maintenant son modèle choisi à l'appel réel. Les nouveaux modèles n'y sont retenus
qu'une fois confirmés et activés.

### Protection budgétaire (inchangée)

- 40 % HT du mensuel de l'abonnement et 50 % HT des recharges : `billing.ts` n'est pas modifié.
- Avant **chaque** appel, principal comme secours :
  - vérification de l'accès (forfait, quota) ;
  - plafond de la tâche ;
  - **réservation atomique du coût maximal**.
- Consentement aux dépenses : les avertissements et estimations existants avant les actions gourmandes sont
  inchangés.
- Traçabilité : chaque essai est inscrit dans `ai_calls`, avec le fournisseur, le modèle, le relais, le coût réel,
  la durée et le statut.
- Blocage dans les cas suivants : tarif absent, tarif au jeton sans borne connue, modèle non confirmé, endpoint fal
  sans durée bornée.

### Administration › Images & Vidéos

Une nouvelle rubrique, avec un bloc pour les **Images, logos et visuels publicitaires** et un bloc pour les
**Vidéos produit et UGC**.

Pour chaque modèle, elle affiche :
- le fournisseur et le modèle ;
- l'état de la connexion ;
- les capacités ;
- la qualité, la résolution et les durées ;
- le prix saisi et le **coût d'une génération typique** (1 image, ou un plan de 8 ou 5 s) ;
- le tarif officiel relevé ;
- le statut chez le fournisseur et le remplaçant conseillé ;
- les résultats observés.

Pour chaque modèle, des boutons permettent de :
- **le choisir comme principal** ;
- **le choisir comme secours** (refusé côté serveur s'il n'est pas confirmé ou s'il n'a pas de tarif) ;
- **le confirmer** (refusé sans tarif) ;
- **l'activer ou le désactiver**.

Un sélecteur **Manuel / Automatique** existe par type.

Captures dans `reports/screenshots/multimedia-routing/` : `images-videos-ordinateur.png` et
`images-videos-telephone.png`. Aucun débordement horizontal et aucune erreur JavaScript. Dans l'environnement de
capture, aucune vraie clé n'est enregistrée : la colonne « Connexion » affiche donc « aucune clé ».

## 3. Tests réalisés (fournisseurs simulés, aucun appel payant)

`tests/routage-multimedia.test.ts`, **15 tests** avec une base isolée :

| Parcours | Résultat vérifié |
|---|---|
| Logo complet | principal inchangé : OpenAI GPT Image 1, fond transparent, réservation réglée |
| Images produit | principal Gemini 3.1 choisi, donc décor demandé à ce modèle ; la retouche par masque reste chez OpenAI, seul modèle capable |
| Création publicitaire (visuel sans référence) | un modèle fal qui exige une référence n'est jamais choisi ; le secours Gemini le remplace (relais tracé) |
| Vidéo UGC (personne) | fal principal : le produit est envoyé en référence, réservation réglée |
| Vidéo produit | Veo 3.1 : 5 s demandées, 6 s envoyées, réservées et facturées ; Veo 3 : 8 s |
| Changement de fournisseur | Kling 3 principal : `duration: "7"` ; Kling 2.1 arrondi à 10 s |
| Fournisseur indisponible | Veo en panne : réservation **rendue**, puis Kling (secours) avec **sa** réservation réglée ; clé OpenAI absente : Gemini en secours |
| UGC et secours sans son | pas de relais |
| Secours non confirmé | jamais appelé, même avec un tarif saisi |
| Budget épuisé | rien n'est envoyé, ni au principal ni au secours |
| Nouveau modèle OpenAI au jeton | bloqué ; avec un tarif par image, borné et autorisé |
| Mode automatique | la qualité passe avant le prix ; masque : seul un modèle capable ; UGC : son exigé ; échecs observés : modèle écarté |

Autres vérifications :
- Les tests existants (images, logos, publicités, vidéos, UGC, Router V2, budget, facturation) passent sans
  modification.
- Résultats complets (TypeScript, tests, build) : voir le §6.

## 4. Fournisseurs : réellement utilisables ou à configurer

**Utilisables dès maintenant**, avec les clés actives et les tarifs existants :
- OpenAI `gpt-image-1` ;
- Gemini `gemini-2.5-flash-image` ;
- Veo 3 et Veo 3 Fast ;
- Kling 2.1 (fal).

Ce sont les modèles d'avant, inchangés.

**Configuration encore nécessaire**, à faire dans l'administration :
1. Relever le tarif sur la page officielle.
2. Le saisir dans *Modèles et tarifs › Tarifs des fournisseurs*.
3. Cliquer sur *Confirmer*.
4. Choisir le modèle comme principal ou secours, ou l'activer pour le mode automatique.

Modèles concernés :
- GPT Image 1.5, 2 et 2.5 Flare : tarif **par image** ;
- Gemini 3.1 Flash Image, 3 Pro Image et 3.1 Flash-Lite Image : par image ;
- Veo 3.1, 3.1 Fast et 3.1 Lite : par seconde ;
- Kling 3 Pro et Standard : par seconde ;
- fal Nano Banana 2 Edit et FLUX.2 Klein Edit : par image. Leurs paramètres d'entrée sont aussi à valider au premier
  essai.

## 5. Limites restantes

- **Tarifs officiels** d'OpenAI (images), de l'API Gemini (images, Veo) et de fal : **[À compléter]**. Ils n'ont pas
  pu être lus.
- **Dates d'arrêt** de `veo-3.0-*`, `gemini-2.5-flash-image` et Kling 2.1 : non vérifiées. Les remplaçants sont
  seulement conseillés.
- **Paramètres d'entrée des endpoints image de fal** (`image_urls`, `aspect_ratio`) : non confirmés.
- **Qualité réelle** des nouveaux modèles : non mesurée. Les notes de la barrière de qualité alimenteront le mode
  automatique après les premiers essais réels.
- **Relais pendant la génération** : couvert pour les images génériques (logos, ambiances, personnes UGC) et pour
  les vidéos. Pour les scènes produit, le parcours dépend du fournisseur (masque OpenAI ou décor Gemini) : le relais
  s'y fait au moment du choix, quand la clé du principal manque, pas après une panne en cours de génération.
- **Résolutions supérieures** (2K, 4K) : non utilisées. Le studio demande la résolution standard, ce qui borne le
  coût.

## 6. Vérifications

- TypeScript : OK.
- Tests : **1042 sur 1042** (118 fichiers), dont les 15 nouveaux tests du routage multimédia.
- Build de production : OK.
- Non modifiés : `billing.ts` (plafonds de 40 % et 50 %), `plans.ts` (forfaits et prix) et la page d'accueil.
