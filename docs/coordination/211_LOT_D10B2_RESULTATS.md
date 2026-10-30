# #211 — D10b2 : clips natifs depuis SYNA

**Disponible pour revue technique après CI du SHA documentaire final.** PR #246, branche `codex/211-lot-d10b2-clips-bornes`, application/build `c180c150bce48c1af705dd785c830cda0c78886c`, arbre `27de32eb757804bb9c2fa48750d03ef73aa87948`. Dépendance : #243 (`c827531f` applicatif, `8d175998` documentaire à conserver), puis #238/#233 et leurs parents. Aucun merge ni activation.

## Fait

La conversation prépare un scénario, désigne le produit/variante/prestation et sa référence exacts, chiffre un devis puis, après accord, utilise le worker vidéo, les SDK, le contrôle et FFmpeg **natifs**. MP4/document sauvegardés, lus et téléchargés ; réouverture et réemploi sans nouvelle tâche/version/rendu. Drapeau `STUDIO_CONVERSATION_VIDEO_GENERATION` fermé par défaut.

Corrections : consigne exacte jusque dans le clip et son contrôle ; choix « sans voix » respecté ; timbre/vitesse/langue conservés ; même contexte stratégique pour devis et worker ; route consentie sans secours non approuvé ; contrôle critique strict ; ancien montage conservé après édition. Après échec sans version, `isCurrent=false`. Une ancienne route ne peut plus créer de réparation SYNA hors enveloppe (409 avant job) ; reprise historique non liée préservée. Bouton natif multiligne en360px, acquis toujours accessibles, reprise bornée non encore disponible annoncée honnêtement.

Fichiers principaux : `src/lib/orchestrator/conversation/video-generation-{contract,validation,execution}.ts`, `src/lib/video-v2/{three-scenes,bounded-quote,subject-binding}.ts`, `src/app/api/studio/[id]/creative/video/route.ts`, `src/components/studio/guided-video.tsx` et carte vidéo SYNA. La liste exacte des42sources est dans [sources testées](preuves-211-D10b2/traces/sources-testees.json).

## Vérifié

- **4 011 tests réussis,45 ignorés ;94 ciblés/11fichiers ; types et build propre réussis.** Les tests précèdent le commit sur53a85a2c avec les six correctifs figés dont les SHA correspondent au tree27de32eb ; build et navigateurs serventc180c150. Aucun nouvel essai nécessaire pour cette livraison purement documentaire.
- Six parcours compilés en fournisseurs **fictifs** : capteur de ruche16:9/voix projet ; second produit presse de linogravure/variante Nuit9:16 ; réparation de céramiques4:5 ; relevé de fissures sur vitraux9:16/direct sans photo ; deux activités ajoutées après gel — séchoir à pâtes1:1 et relevé bathymétrique16:9. SDK/worker/stockage/budgets/FFmpeg/lecture/téléchargements réellement exécutés. Compte étranger404, devis forgé404, CSRF403 ; marque/catalogue/prestations/versions de thème inchangés.
- Deux503 simulés après premier clip : acquis et ancienne vidéo conservés, réserve incertaine conservée, aucun retry. Reprise à360/390/1024/1440 ;18exports JSON/SRT/VTT lus. SRT vide si aucune cue, sans retirer de texte demandé. Les22reprises de captures ont ensuite décodé tous les lecteurs visibles **sans worker** ; tables protégées et MP4 identiques.
- Budget SQL des8jobs vidéo sous plafonds consentis, limites communes≤20appels/profondeur1/retry0.50usages fictifs,6 290 040micro fictifs au total des deux harnais (incluant leurs cas de base), **pas un prix réel de six vidéos**.0appel IA fournisseur réel,0coût IA réel.

[Commandes/dates/résultats exacts](preuves-211-D10b2/traces/commandes-resultats.json) · [Mesures](preuves-211-D10b2/verifications.json) · [Budget](preuves-211-D10b2/traces/budget-reservations.json) · [Couverture et limites](211_D10B2_COUVERTURE.md).

## Preuves publiées et limites

Conformément au complément #2116517581742, publication d’une **sélection récupérée** des preuves existantes :9captures utiles (avant/après mobile inclus),un film navigateur,six MP4 natifs/documents et traces ciblées. Aucun scénario régénéré. Le reste des285fichiers/52 458 548octets préparés reste dans la copie de travail ; **il n’est pas annoncé comme publié**. [Ouvrir les preuves](preuves-211-D10b2/README.md).

Médias bleus/motifs/tonalités et cognition/contrôle fictifs : qualité créative, compréhension réelle, fidélité photographique, parole naturelle et mouvement continu **non qualifiés**. Chromium en fenêtres mobiles, pas Safari/iOS/appareils réels. Recherche de réemploi limitée aux100artefacts récents (à compléter). Voix seule/choix de voix, clip ciblé, staged et récupération fournisseur restentD10c ; pas d’approbation finale ni de publication. Première panne d’encodage liée et retouche/restauration du nouveau document non recettées spécifiquement. API métier Claude#239/#245 future dépendance, aucune duplication. Exports Studio, aucune installation CMS testée.

## Suite

TerminerD10c puisD11 etD12/E/F en incréments courts. Sources inchangées : réutiliser les tests existants, une CI finale pour ce SHA documentaire ; ne pas reprendre les autres recettes sans risque pertinent. Aucune donnée client, clé, branche Claude, thème validé, main, déploiement ou instance réelle modifié. #211 demeure partielle.
