# Guide créatif — publicités vidéo

Règles du propriétaire, appliquées automatiquement à **chaque** publicité vidéo du moteur « vidéo en scènes »
(création du projet et « Créer une vidéo » dans le studio). Ce fichier explique ; les valeurs vivent dans le code
et dans un réglage modifiable.

## Où sont les règles et comment elles agissent

| Règle | Fichier | Branchée dans |
|---|---|---|
| Tailles (px), interlignes, palettes d'exemple, animations, transitions, durées de la carte de fin, structure 30 s, budget de mots, grille d'évaluation | `src/lib/video-v2/creative-guide.ts` (`DEFAULT_VIDEO_GUIDE`) | `loadVideoGuide()` relu à chaque vidéo |
| Modifications du propriétaire (sans code, persistantes) | réglage `video.creative_guide` (table `settings`) | API `GET/PUT /api/admin/video-guide` |
| Brief + fiche créative (offre, cible, bénéfice, preuves **disponibles**, objections, charte, objectif, concept, couleurs, tailles, animation, rythme, voix, musique, action) | `src/lib/video-v2/creative-brief.ts` | `runThreeScenes` (étape 1) |
| Storyboard : services = une étape de la prestation par plan ; produits = cadrages différents du vrai produit | `src/lib/video-v2/ad-storyboard.ts` | plan local et consigne de l'IA de texte |
| Sourcing Pixabay **réservé aux services**, recherche par étape, provenance enregistrée | `src/lib/stock/stock-clip.ts` (`step`) | `realThreeScenesDeps.stock` |
| Produits : référence stable (reconstruction validée > détourage > photo du client), jamais de substitut | `src/lib/video-v2/creative-memory.ts` (`productReferences`) | `runThreeScenes` (mode produit) |
| Règle absolue des marques (textes, voix, mots-clés des plans, contrôle visuel) | `src/lib/video-v2/brand-guard.ts`, consigne `aiQcScene` | avant le montage, avant chaque téléchargement |
| Voix off (Kokoro, locale, gratuite) + sous-titres calés sur la voix réelle | `src/lib/video-v2/voice.ts` | `addVoice` dans `runThreeScenes` |
| Contrôle du fichier final mesuré sur la vidéo rendue + correction ciblée | `src/lib/video-v2/final-check.ts` | `realThreeScenesDeps.render` (résultat dans `meta.finalCheck` de la vidéo) |
| Mémoire créative du projet | table `memory`, portée `video` | API `GET/PATCH /api/projects/[id]/videos/creative-memory` |

## 1. Deux parcours

- **Services** : plans Pixabay en rapport direct avec CHAQUE étape (plâtrier peintre : protection de la pièce →
  préparation des surfaces → application → geste et finition → pièce terminée). Plans d'illustration : jamais présentés
  comme des réalisations du client. Seule source autorisée : Pixabay.
- **Produits** : jamais de produit ressemblant sur une banque. On part des photos du projet : détourage, nettoyage,
  reconstruction des parties manquantes (signalée dans l'aperçu, jamais présentée comme une forme retrouvée), nouveaux
  décors et cadrages, plans animés. Seules la caméra et la lumière bougent.

## 2. Marques

Seuls le nom, la marque et le logo du projet. Un texte qui cite une marque tierce est retiré ; un plan de banque dont
les mots-clés citent une marque est écarté avant téléchargement ; le contrôle visuel refuse une marque, un logo ou un
filigrane d'une autre entreprise. Un filigrane de licence n'est jamais effacé. Le logo du projet est posé en image
(carte de fin), jamais généré.

## 3. Textes (vidéo 1080 × 1920)

Accroche 90–130 px · titre de scène 64–88 px · bénéfice 48–64 · secondaire 36–46 · sous-titres 44–56 ·
bouton 48–64 · mention 28–34. Interligne 100–115 % (titres), 115–135 % (textes). Deux lignes de titre, deux polices,
trois niveaux par scène au plus. Jamais de « [À compléter] » à l'écran ni dans la voix. Jamais de bande noire derrière
un texte : zone calme du plan, texte foncé sur un plan clair, ombre ou halo doux.

## 4. Couleurs

Charte du projet d'abord (texte relevé si le contraste est < 4,5:1). Exemples (non imposés) : premium #121212 /
#F5F1E8 / #C6A66B · technologie #0B1220 / #F8FAFC / #38BDF8 · artisan #F5F2EB / #243746 / #C66B45 · bien-être
#F4F1E9 / #263D35 / #8FAF9A · promotion #151515 / #FFFFFF / #FF6B35.

## 5. Animations et montage

Apparition sobre (montée 12–28 px, 250–400 ms), accroche dynamique (94 → 100 %, 180–280 ms), révélation par masque
(30–60 px, 300–500 ms), groupes de mots (80–140 ms), mise en valeur. Un effet principal par vidéo. Coupe franche par
défaut ; fondu doux 300–600 ms pour un changement d'ambiance ; jamais de flash ni de zoom automatique.

## 6. Scénario, voix, son, action

Structure indicative 30 s : accroche 0–3 · besoin 3–8 · démonstration 8–18 · preuve 18–25 · action 25–30.
Voix : 55–75 mots pour 30 s, français naturel, rien d'inventé. Musique sous la voix (−12 dB). Action selon l'objectif :
produit → commander/découvrir ; artisan → demander un devis ; rendez-vous → réserver ; commerce → venir sur place ;
prestation complexe → nous contacter. Carte de fin visible 2,5 à 4 s. Le bouton dessiné n'est pas cliquable.

## 7. Contrôle du fichier final

Scènes différentes (empreinte d'image), tailles, contraste à trois instants par plan, hiérarchie, marques, carte de fin,
logo, audio, synchronisation, format. Un titre peu lisible : seul ce plan change de couleur, puis un nouveau rendu.
Fidélité du produit et orthographe : « non vérifié » tant qu'aucun regard (IA ou humain) ne les a faits.

## Limites connues (vérifiées)

- Sans IA de vision, un plan Pixabay n'est connu que par ses mots-clés : le moteur ne peut pas savoir quelle étape il
  montre. Il retire alors les titres d'étape et le signale. Le choix fiable plan par plan demande le contrôle visuel.
- Le recadrage vertical d'un plan horizontal est centré : il peut couper le geste.
- Voix off : seulement si le modèle Kokoro est installé sur le serveur (`KOKORO_DIR`).
- Aucun modèle 3D n'est créé : les « vues » sont des images générées à partir des photos du produit.
