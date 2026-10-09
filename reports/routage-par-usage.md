# Routage multimédia par usage

Version : branche `claude/ecom-studio-ia-platform-8cwl79`. Les tests utilisent des fournisseurs simulés : aucun appel payant n'a été fait.

## Ce qui change pour vous

Dans **Administration › Images & Vidéos**, une nouvelle carte « Réglages par usage » apparaît au-dessus du catalogue. Elle contient 7 usages, chacun avec son propre **principal**, son propre **secours** et son propre **mode** (manuel ou automatique) :

| Usage | Ce qu'il couvre | Chemin dans le code jusqu'au fournisseur |
|---|---|---|
| Logos | Concepts graphiques des symboles (Logo Engine V2 et studio), logo complet dessiné | `logo-v2/engine.ts` → `logo-v2/ai.ts › exploreSymbol` → `logoSymbolImage` ; `engine/identity.ts` → `logoSymbolImage` ; `engine/full-logo.ts` → `fullLogoImage` → `generateImage` (usage `logo`) |
| Images produit | Décor généré, puis produit réel composé par le studio ; image de départ des vidéos UGC | `engine/images.ts › aiBackground` et `image-v2/deps.ts` → `productPlate` ; `engine/ugc.ts` → `ugcFrame` |
| Retouches produit | Retouche par masque de la photo réelle (le modèle repeint autour du produit, puis les pixels du produit sont remis) | `productImagePath` → `openaiScene` (usage `product_edit`) |
| Publicités visuelles | Visuels des créations publicitaires (Advertising Engine V2 via Image V2) | `image-v2/deps.ts` (support « ad » ou image publicitaire) → `openaiScene`, `productPlate` ou `ambianceImage` (usage `ad_visual`) |
| Décors et ambiances | Ambiances de marque, images de sites, d'articles et de publications, photos d'ambiance des entreprises de services | `ambianceImage` (usage `scene`) depuis `image-v2/deps.ts` et `engine/service-media.ts` |
| Vidéos produit | Plans animés à partir d'une scène contenant le produit réel | `engine/videos.ts` et `video-v2/deps.ts` → `aiClip` → `veoClip` ou `falClip` (usage `product_video`) |
| Vidéos UGC | Plans avec une personne qui présente le produit | `engine/ugc.ts` et `video-v2` (plan avec personnage) → `aiClip` (usage `ugc_video`) |

**Vos réglages existants sont conservés.** Tant qu'un usage n'a pas de réglage propre, il suit le réglage général de son type (le « principal » et le « secours » des images ou des vidéos, comme avant). La rubrique affiche alors « suit le réglage général ». Le bouton « Revenir au réglage général » efface le réglage propre d'un usage.

## Règles appliquées

- **Seuls les modèles capables sont proposés.** Un modèle ne peut être choisi que s'il est confirmé, tarifé et capable de l'usage. L'administration refuse par exemple :
  - Gemini en « Retouches produit » : la retouche par masque n'est branchée que pour OpenAI ;
  - un modèle fal « edit », qui exige une image de référence, en « Logos » ou « Publicités » ;
  - une vidéo choisie pour une image.
- **Aucun autre modèle en silence.** Quand un usage a son propre principal (ou son propre mode), le studio ne bascule plus sur un autre modèle sans le dire. Si ni le principal ni le secours ne sont utilisables, la génération est bloquée avec un message clair (« le modèle choisi pour « Logos » … n'est pas utilisable »). Avant, le Router V2 pouvait se replier en silence : avec Gemini choisi pour les publicités, la retouche passait chez OpenAI. Un test a détecté ce cas, et il est corrigé. Un usage qui suit le réglage général garde le repli historique, comme avant.
- **Secours propre à chaque usage.** Le secours n'est appelé qu'une fois, et seulement si le principal a échoué sans rien facturer. Il passe par sa propre réservation de coût. Exemple testé : le logo relaie vers son secours, alors que les décors, réglés sans secours, ne relaient pas.
- **Photos produit.** « Retouches produit » est utilisé en priorité quand un modèle capable de retoucher par masque y est choisi. Sinon, « Images produit » génère le décor vide, puis le studio compose le produit réel. Une case permet de couper la retouche par masque. Le décor vide fonctionne désormais avec OpenAI comme avec Gemini. Avant, ce chemin était réservé à Gemini, et une clé fal seule pouvait le faire échouer.
- **Traçabilité.** Chaque appel garde l'usage dans sa raison de routage (par exemple `admin primary [logo]`), visible dans les traces d'appels.

## Logo Engine V2 : le modèle d'images choisi est vraiment utilisé

Avant ce changement, le symbole était dessiné en SVG par la tâche Anthropic « logo_symbol ». L'IA d'images n'intervenait que si ce SVG était refusé ET que le territoire était « illustratif ». En pratique, le modèle d'images choisi n'était presque jamais appelé.

Désormais, pour chaque territoire qui demande un symbole :

1. **Concept graphique** : il est généré par le modèle d'images choisi pour « Logos ». Un test le vérifie : l'appel part bien chez `gemini-2.5-flash-image` quand ce modèle est choisi, et jamais chez OpenAI.
2. **Vectorisation automatique** du concept, nettoyée et testée en petite taille. Si elle réussit, le symbole est livré sans redessin (source `ai_image_traced`).
3. **Sinon, finalisation vectorielle** par la tâche « logo_symbol », qui reçoit le concept en image et doit garder son idée et sa silhouette (source `ai_image_finalized`).
4. **Sans modèle d'images utilisable** (clé, tarif, capacité), le symbole est conçu en vectoriel par l'IA de texte (source `ai_svg`). C'est écrit dans les notes de la série, par exemple : « Geste abstrait : aucun modèle d'images utilisable pour les logos (…) — symbole conçu en vectoriel par l'IA de texte ».

Une image n'est jamais livrée telle quelle : le nom reste écrit avec de vraies polices, et le contrôle de qualité (relecture sur planche, barrière V2, reprises ciblées) est inchangé.

**Coût et consentement.** Le devis du Pilote (étapes « logo » et « stratégie de marque ») compte maintenant aussi au plus 3 concepts d'image par série. Chaque génération passe toujours par la réservation de son coût maximal, dans le budget du compte.

## Protections inchangées

- Les plafonds de 40 % HT des abonnements et de 50 % HT des recharges ne bougent pas : aucune modification de `billing.ts`. Un test vérifie les deux valeurs.
- Forfaits, prix, abonnements et page d'accueil ne sont pas modifiés.
- Contrôles qualité, quotas, droit à l'IA du compte (`assertAiAllowed`), plafond de la tâche et réservation de coût maximal sont appliqués à chaque génération, comme avant.

## Tests (fournisseurs simulés)

`tests/routage-usages.test.ts` contient 13 parcours :

- défauts hérités ;
- indépendance des usages, avec l'URL et le modèle réellement appelés ;
- photos produit (retouche par masque, puis décor + composition) ;
- publicités ;
- vidéos produit et UGC (Veo 3 Fast, Veo 3, Kling) ;
- secours par usage ;
- mode automatique par usage ;
- budget épuisé et clé retirée ;
- Logo Engine V2 : concept puis finalisation, concept vectorisé directement, absence de modèle d'images ;
- administration : validations et retour au réglage général ;
- plafonds.

Les tests existants touchés (`trace-appels`, `brain-contextes-2c`, `qualite-images-videos`) ont été adaptés au nouveau chemin du décor vide.

## Limites connues

- Les performances observées (mode automatique) restent comptées par type (images, vidéos), pas par usage : la table des appels ne garde pas encore l'usage dans une colonne dédiée.
- L'image de départ d'une vidéo UGC suit « Images produit », car c'est une image et non une vidéo. Un modèle fal « edit » ne peut donc pas y être choisi, puisqu'il exige une référence pour les décors.
- Aucun appel réel n'a été fait : les paramètres des nouveaux modèles restent à confirmer lors de vos premiers essais.
