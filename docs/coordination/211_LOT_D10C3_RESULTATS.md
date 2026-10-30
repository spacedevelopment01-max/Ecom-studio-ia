# #211 — D10c3 : corriger une voix sans racheter les clips

**Fait et recetté en simulation ; CI finale du SHA de livraison encore attendue. Drapeau fermé, aucune mise en service.**

Application compilée/testée : `1992ebc70e8468d8c5cf88b4de04de05242d8616`. Harnais final : `22205fe9d966f2d89557e4a01e00cea85052442a`. Branche `codex/211-lot-d10c-voix-ciblee`, parent #249`2252d10a`. Le contenu de #250`8117a3f8` et ses deux documents`f3026999` est conservé dans cette branche, sans ascendance Git : **ne pas réappliquer ces apports deux fois lors de l’intégration #247/#248**. Aucun merge/rebase/cherry-pick dans les branches Claude ou main.

## Résultat

Dans le même SYNA : demande exacte → choix du document/version et de ses phrases → comparaison avant/après → devis natif en pourcentage et nombre maximal d’appels → confirmation → worker natif → MP4 et document versionnés, téléchargeables et réouvrables. Seules les phrases désignées changent. Clips, autres voix, musique, titres et sous-titres manuels restent conservés ; leur suivi de la nouvelle voix doit être demandé explicitement.

Le timbre, la langue et la vitesse d’origine sont prouvés par le profil et les reçus natifs, y compris les anciens documents B2. Une phrase acquise se réemploie sans synthèse ; le même MP4 se retrouve sans tâche ni encodage, fournisseur désactivé/budget épuisé. Reçu incertain ou fichier manquant ne devient jamais une permission de rachat. Phrases trop longues : refus précis, aucun texte raccourci. La révision conserve aussi espaces extérieurs, retours à la ligne et espaces doubles, jusqu’à la requête vocale.

Conflit de version avant/pendant la synthèse : aucun écrasement, WAV acquis et version manuelle conservés. Version obsolète avant encodage refusée. Échec503 : ancienne vidéo intacte, pas de retry et pas de faux terminé.

## Vérifications réelles

- **4 037 tests réussis,45 ignorés**,464 fichiers réussis/1 ignoré, suite finale sur l’application`1992ebc7`. Les ignorés ne sont pas des succès.
- 32tests vocaux natifs ciblés ;6scénarios agent produit/service/droits/échec ;7contrôles ciblés sécurité et premier encodeur (recouvrements, nombres non additionnés). Types et build de production réussis.
- Un parcours navigateur compilé complet, worker/FFmpeg/stockage/budgets natifs : une seule nouvelle phrase, MP41080×1920/10s décodé, téléchargement MP4/JSON, réouverture/éditeur natif, réemploi sans tâche/version/coût et503 sans retry. Les tests unitaires couvrent aussi une prestation de réglage de métiers à tisser, distincte du produit cadre de séchage.
- Quatre captures réellement ouvertes : [ordinateur](preuves-211-D10c3/voice-captures/01-devis-ordinateur.png), [devis360px](preuves-211-D10c3/voice-captures/02-devis-mobile.png), [MP4 mobile](preuves-211-D10c3/voice-captures/03-resultat-mobile.png), [échec](preuves-211-D10c3/voice-captures/04-echec-ordinateur.png). Bouton mobile≥44px, pas de débordement, erreurs affichées.
- [Film réel des interactions](preuves-211-D10c3/voice-workflow.mp4), [MP4 natif fictif](preuves-211-D10c3/voice-native.mp4), [document](preuves-211-D10c3/voice-native.json), [preuve navigateur](preuves-211-D10c3/voice-browser-proof.json). Film compressé intégral, original WebM local conservé.

[Commandes réellement exécutées, dates, SHA et limites](211_D10C3_PREUVES.json). Les sources application/worker/tests restent exactement celles du build ; seuls le harnais navigateur et la durée CI ont changé après gel. La CI finale doit revalider le SHA de livraison. Aucun nouvel essai applicatif complet répété pour ces corrections du harnais.

## Erreurs et limites explicites

Un premier test a révélé une mauvaise préparation des fixtures, corrigée sans affaiblir les protections. Une suite complète a été interrompue après reproduction du défaut d’espaces vocaux ; elle n’est pas annoncée réussie. Le parcours navigateur a d’abord refusé le nom abrégé du produit, puis son callback de lecture a rencontré`__name` après enregistrement du MP4. Ces deux défauts du harnais sont corrigés ; la dernière recette complète passe sur le même build.

**0appel IA fournisseur réel,0coût IA réel.** Cognition et fournisseurs HTTP/SDK fictifs, clips neutres et WAV tonal : aucune compréhension réelle, création professionnelle, voix naturelle ou facture fournisseur qualifiée. Lecture navigateur automatisée muette ; la voix reste à écouter/valider. Le nouveau profil/timbre et la confirmation d’un ancien profil non prouvé restent partiels.

#249 reste en brouillon : CI41025348837 annulée au plafond75min, étapes suivantes non exécutées. #250 a sa CI41025864027 complète verte. La durée CI de ce candidat passe à100min ; aucun contrôle de thèmes ou autre n’est retiré et aucune erreur n’est masquée. Son résultat sera indiqué dans la PR, sans emprunter un vert à un autre SHA.

## Fichiers et suite

Natif : `voice-revision-contract.ts`, `voice-revision.ts`, `openai-voice.ts`, `three-scenes.ts`, garde de version`engine.ts`. SYNA : `video-voice-contract.ts`, `video-voice-validation.ts`, `video-voice-execution.ts`, route`video-voices`, worker, drapeaux et contrats cognitifs. Interface : `conversation-voice-tools.tsx` et panneau existant. Tests vocaux/agent/encodeur et harnais`verify-agent211-voice-ui.ts`, ajout du contrôle CI compilé. Pas de nouveau moteur, fournisseur ou modèle.

À poursuivre : clip ciblé, staged, rapprochement des reçus interrompus/reprise du premier encodage, puisD11/D12/E/F. **D10c et #211 ne sont pas terminés.** Les règles sont indépendantes des noms de démonstration. Thèmes/compositions Claude, droits/budgets, versions, données et médias clients préservés. Aucun merge,main,déploiement,activation ni publication client.
