# Logos complets : pourquoi aucun résultat n'apparaissait

Branche `claude/ecom-studio-ia-platform-8cwl79`. Aucun appel payant : fournisseurs simulés (tests et navigateur).

## Cause exacte

1. **Le fond transparent était demandé à GPT Image 2, qui le refuse.**
   - Le studio envoyait `background: "transparent"` à tous les modèles OpenAI.
   - GPT Image 2 (choisi pour « Logos ») ne gère pas la transparence. OpenAI répondait 400 pour les 3 images, et rien n'était facturé (réservation rendue).
2. **Un faux message masquait la vraie erreur.**
   - Après le refus, le studio essayait le modèle de secours (Gemini), qui ne sait pas écrire le nom dans l'image.
   - L'erreur affichée devenait « Aucun fournisseur d'images configuré ». C'est exactement la note visible sur votre capture : « logo complet non dessiné (Aucun fournisseur d'images configuré…) ».
3. **La série se terminait vide, sans explication visible.**
   - Une direction sans image ne produisait rien.
   - La tâche finissait « terminée » avec 0 proposition.
   - La barre de progression ne s'affiche que pour une tâche en cours : elle disparaissait.
   - Le panneau affichait « aucune direction n'a atteint le niveau attendu », ce qui était faux : aucune image n'avait été produite, donc rien n'avait été contrôlé.

## Réponses aux 9 points

| Point | Réponse |
|---|---|
| 1. Action du bouton | Devis (`POST …/brand/logo-v2 {action: "quote"}`), puis tâche `brand.logo.v2` (style, plafond = devis). |
| 2. Nouveau moteur appelé ? | Oui : `runLogoEngineV2` → mode « logo complet » (GPT Image 2 sait écrire le nom). |
| 3. Appels OpenAI/Gemini | 1 appel texte (directions) réussi ; 3 images **refusées par OpenAI (400)**, réservations **rendues**, 0 € ; secours Gemini jamais appelé (incapable). |
| 4. Le worker termine ? | Oui, tâche « terminée », avec 0 proposition. |
| 5. Images originales enregistrées ? | Aucune image n'a été produite. Les images produites sont bien enregistrées (vérifié). |
| 6. Rejet par le contrôle ? | Non : sans image, aucun contrôle n'a eu lieu. |
| 7. Enregistrés mais non affichés ? | Non. La série vide était enregistrée, avec les raisons cachées dans « Notes de la série » (repliées). |
| 8. Ancienne série conservée ? | Non dans votre cas (la nouvelle série, vide, était affichée). Si une tâche plantait avant la fin, l'ancienne série restait affichée sans le dire. C'est corrigé : la date de la série affichée est indiquée. |
| 9. Erreur ou délai silencieux ? | Oui : un échec de tâche faisait simplement disparaître la barre. C'est corrigé. |

## Corrections

- **Fond transparent** demandé seulement aux modèles qui le gèrent (catalogue). Le studio retire lui-même le fond blanc. Fichier : `src/lib/ai/media-providers.ts`.
- **Erreur réelle conservée** quand le secours ne peut pas faire la demande. Fichier : `src/lib/ai/media-providers.ts`.
- **Avancement direction par direction**, enregistré pendant la tâche et visible après un rechargement :
  - en attente → image en cours → contrôle qualité → validé ou écarté, ou échec avec sa raison ;
  - une interruption est écrite avant que la tâche échoue.
  - Fichiers : `src/lib/logo-v2/live.ts` et `src/lib/logo-v2/engine.ts`.
- **Point d'accès** : il renvoie la dernière tâche (y compris échouée, avec son erreur), l'avancement et les directions sans image. Fichier : `src/app/api/projects/[id]/brand/logo-v2/route.ts`.
- **Panneau Logo** (`src/components/studio/logo-v2-panel.tsx`) :
  - 4 étapes visibles : préparation des directions, génération des images (n/3), contrôle qualité (n/3), résultat ; une étape sans résultat n'est **jamais cochée en vert** ;
  - liste des directions avec leur statut ;
  - encadré d'erreur pour une tâche échouée ;
  - cartes « Directions sans image » avec la raison ;
  - message honnête quand aucune image n'a pu être produite ;
  - mention de la date quand la série affichée est la précédente.
- **Outil de diagnostic en lecture seule** pour votre Codespace : `npx tsx scripts/logo-run-debug.ts "Sébastien Blanc"`.

Seuil qualité inchangé (8/10). Aucun logo existant regénéré.

## Tests

- `tests/routage-usages.test.ts` : GPT Image 2 ne reçoit pas de demande de transparence ; principal refusé + secours incapable → vraie erreur. **Échoue sur l'ancien code.**
- `tests/logo-v2-progress.test.ts` (3 parcours) :
  - images refusées → échecs visibles avec la raison ;
  - interruption → étape « échec » et erreur ;
  - série réussie → verdicts, notes, propositions, puis relecture comme après un rechargement.
- Suite complète : 126 fichiers, **1090 tests réussis** ; vérification du code (`tsc`) : OK.
- **Navigateur, de bout en bout** (`scripts/e2e-logo-progress.ts`) :
  - mise en place : vrai site, vrai worker, OpenAI et Anthropic simulés en local (`scripts/fake-ai-server.mjs`), modèle des logos GPT Image 2 ;
  - résultat : **16/16 vérifications réussies** :
    - devis affiché ;
    - tâche terminée ;
    - 4 étapes cochées ;
    - 2 propositions validées, plus 1 écartée avec son image originale ;
    - aucune demande de transparence à GPT Image 2 ;
    - 3 images, aucune relance ;
    - tout reste affiché après rechargement ;
    - refus du fournisseur : étapes « images » et « résultat » en échec, raison affichée pour chaque direction, toujours affichée après rechargement ;
    - tâche échouée : erreur affichée ;
    - pas de débordement sur téléphone ;
    - 0 erreur JavaScript.
- Captures : `reports/screenshots/logo-progress/` (en cours, résultat, après rechargement, refus du fournisseur, tâche échouée).

## Non vérifié

Je n'ai fait aucun appel réel à OpenAI. Le refus du fond transparent par GPT Image 2 est déduit de deux sources :
- votre capture, qui montre « Aucun fournisseur d'images configuré » pour les 3 directions ;
- le catalogue du studio, où la transparence de GPT Image 2 est notée « en aperçu, non retenue ».

L'outil `scripts/logo-run-debug.ts` lancé dans votre Codespace le confirmera, avec le statut de chaque appel.
