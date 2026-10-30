# #211 — D10c4 : remplacer un seul plan vidéo avec SYNA

**Fait localement, publié pour revue sous réserve de la CI finale. Aucun merge ni activation.** Application, suite complète, build et navigateur : `969766bd7b7fa3acac3d9efb3285181302ec6e8a`. Base : #251 `a93398de96cf47d046f8f22efb1de26cd0035d7c`. Le correctif ultérieur de harnais nomme seulement la photo de recette ; aucune source applicative/worker/test ni composition n’a changé. Cette tranche ne termine pas #211.

## Fonction livrée

Même conversation → document/version/plan exacts → scène et photo relisibles → coût en % et accord → acquisition + contrôle visuel natifs → version et MP4 → téléchargement/réouverture/réemploi. Un seul plan est remplacé. Les autres plans, audios, musique, sous-titres, textes, composition et ancien MP4 restent conservés. Référence : IDs, version et octets contrôlés ; aucune autre offre substituée. Drapeau serveur `STUDIO_CONVERSATION_VIDEO_CLIP` fermé par défaut.

Le moteur existant partage `three-scenes.acquireDirectScene` et `bounded-quote.boundedDirectShots` entre création et reprise. `clip-revision` calcule uniquement les appels manquants. Acquis complet =0appel ; clip reçu avant QC = contrôle seul, même fournisseur vidéo désactivé ; QC reçu = reprise locale. Reçu incertain/fichier manquant/refus = arrêt, aucune génération ni photo/stock de secours. Le worker conserve les fichiers payés avant un conflit manuel.

## Défauts reproduits et corrigés

- Instruction complète absente du transport de la première reprise : rétablie, SDK natif vérifié (LF/deux espaces conservés).
- Clip refusé encore proposé à la confirmation : le verdict natif est relu, refus/absence de validation conservés pour inspection.
- Contrôle seul dépendant à tort du fournisseur vidéo : devis de QC séparé, sans nouveau clip.
- Tâche arrêtée avant envoi consommant la reprise : test rouge/vert. Le plafond d’une reprise reste appliqué dès un envoi engagé, y compris incertain ; un refus préalable ne devient pas un achat.
- Ancien bouton pouvant emprunter un autre chemin et substituer un plan local : devis ciblé requis pour les documents bornés, refus avant tâche et au moteur. Les anciens documents/montages manuels gardent leur parcours historique.

Fichiers principaux : `src/lib/video-v2/{three-scenes,bounded-quote,receipts,clip-revision,clip-revision-contract,document-pins,engine}.ts`, `src/lib/orchestrator/conversation/video-clip-*`, contrat/contexte cognitifs et registre natifs, route `video-clips`, `worker/handlers.ts`, `conversation-clip-tools.tsx` et panneau unique. Six fichiers de tests ciblés, recette navigateur `verify-agent211-clip-ui.ts`, contrôles CI antérieurs tous conservés.

## Vérifications exécutées

| Contrôle | Résultat réel |
|---|---|
| `npm test` sur commit propre | **4065 réussis / 45 ignorés**, une seule suite complète |
| `npm run typecheck`, `npm run build` | Réussis ; build propre exact ci-dessus |
| `vitest run` : clip SYNA, carte/contrat, reprise native, primitive, chaîne SDK, enveloppe commune | Première série41réussis/2échecs de fixture (voix laissée coupée) ; cause minimale reproduite, isolation rétablie,3cas concernés réussis. Tous ensuite inclus dans la suite complète |
| Sécurité/reprise ciblées | Droits publicitaires au devis/accord/worker, budget/TTL, source/version/compte étrangers, CSRF, commande forgée, conflit pendant acquisition,503, QC refusé, réemploi sans réserve ni nouvelle tâche ; cas produit et service |
| Studio compilé + Chromium | Un parcours complet, trois captures ouvertes ; téléphone360px/ordinateur1440px, confirmation≥44px ; MP4 lu1080×1920/10s, téléchargements MP4/JSON, éditeur natif, réouverture, réemploi à budget vide/fournisseur coupé, seconde reprise payante refusée |

Les vérifications utilisent de vraies bases/fichiers/FFmpeg, le worker et les SDK natifs, avec transport HTTP **simulé sur loopback**. Coûts du registre fictifs ; **0fournisseur réel /0€réel**. Une erreur initiale de build concernait uniquement la télémétrie Next dans un répertoire système en lecture seule : cache inscriptible/télémétrie désactivée, aucun code changé. Première fixture navigateur refusée faute de photo nommée, puis harnais externe ESM corrigé ; aucune protection retirée ni ancien parcours répété pour embellir un résultat.

Les commandes exactes, échecs et empreintes sont dans [211_D10C4_PREUVES.json](211_D10C4_PREUVES.json). Les résultats ciblés intermédiaires ne remplacent pas les contrôles propres du candidat final.

## Preuves utiles

- [Devis ordinateur](preuves-211-D10c4/01-devis-ordinateur.png) · [Devis mobile](preuves-211-D10c4/02-devis-mobile.png) · [Résultat mobile](preuves-211-D10c4/03-resultat-mobile.png).
- [Film réel du parcours](preuves-211-D10c4/clip-workflow.mp4), intégral80,48s,960px/12fps pour diffusion ; original1440px/25fps conservé localement.
- [MP4 natif de recette](preuves-211-D10c4/clip-native.mp4) · [Document éditable téléchargé](preuves-211-D10c4/clip-native.json) · [Assertions navigateur](preuves-211-D10c4/clip-browser-proof.json) · [Version compilée et transport](preuves-211-D10c4/compiled-summary.json).

Ce sont un motif, une vidéo bleue et une tonalité **de test**, jamais des créations client ou des démonstrations de qualité IA. Huit preuves sélectionnées, pas de captures/films redondants ni de promesse de téléchargement de tous les fichiers.

## Limites et dépendances

Modes direct et référence uniquement. Images intermédiaires/staged, rapprochement fournisseur réel et changement de profil vocal restent à compléter/qualifier. Le contrôle natif observe quelques images : il ne certifie ni mouvement continu, fidélité IA, voix naturelle, droits des médias réels ni qualité commerciale. Aucun fournisseur/CMS/compte social réel testé. D11 puis D12/E/F restent ouverts.

#251 reste la dépendance immédiate ; #249/#250 sont déjà conservées par contenu dans cette chaîne, #250 sans ascendance : ne pas l’appliquer deux fois. #247/#248 et les API services Claude #239/#245 restent des dépendances d’intégration futures ; aucun thème ni branche Claude/main modifié. La version du studio client n’a pas été mise à jour. Fusion/activation et recette réelle attendent l’accord du propriétaire.

## Complément CI du 30 octobre

La première CI distante41046090069 sur9a9b2b1c a échoué : un ancien test `mission154-livraison` a dépassé60s pendant ses deux exports/Theme Check,4078autres tests réussis/31ignorés. Ce résultat n’est pas déclaré vert. Reproduction isolée sur9a9b2b1c : test réussi en17,43s (14autres cas volontairement non sélectionnés). Le délai de CE test d’intégration passe à120s, comme les exports multi-CMS voisins ; toutes les assertions et contrôles natifs restent présents, aucun code applicatif changé. Nouvelle CI finale requise. Les preuves/build/navigateur applicatifs précédents restent valables pour969766bd ; aucune nouvelle génération ni capture.
