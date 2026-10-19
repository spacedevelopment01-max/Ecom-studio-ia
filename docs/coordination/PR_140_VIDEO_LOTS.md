# PR #140 — mission vidéo, trois lots

Mission : commentaire [6266974136](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/140#issuecomment-6266974136), lu intégralement. Base examinée : `6477ef1b7e832d92040f8744eaf00adab951207a`. Branche : `codex/publications-ia-qualite`. Travail de Claude sur les thèmes conservé, sans fusion de sa branche.

## Lot 1 — contrat et médias

- Le moteur V2 reçoit le contrat organique existant au complet : demande, texte, blocs, sources, objectifs, produit/service choisi. Les formats carré et paysage ne deviennent plus systématiquement verticaux. Le document versionné conserve le contexte et l'identité ; les mots originaux de ce contexte ne sont pas des textes affichés.
- La rédaction locale des contrats conserve les blocs entiers. Un texte trop long produit un défaut à corriger avant les médias. Le conseil organique n'impose plus un achat, devis ou rendez-vous. Le parcours guidé accepte également ce contrat et conserve la demande intégrale ; limite d'entrée explicite portée à 12 000 caractères.
- Image de départ puis clip contrôlés avec la relecture visuelle existante. Aucun contrôle disponible : image conservée à vérifier, aucun clip lancé. Résultat refusé : historique conservé, aucune substitution simplifiée ni nouvelle génération automatique. Le contrôle de clips échantillonne trois images : il ne prouve pas la fluidité continue ni une identité parfaite entre toutes les images.
- Les rendus guidés portent explicitement un état provisoire à usage manuel. Les plans de banque sélectionnés sans vision ne deviennent pas automatiquement réutilisables comme des plans acceptés.
- Les services incomplets et les créations initiales ayant échoué ne sont plus remplacés par une vidéo locale pour afficher un succès. Les étapes et textes ne sont pas effacés lorsque la vision manque ; l'aperçu demande leur vérification.

Fichiers : `src/lib/video-v2/{editorial,intent,strategy,script,engine,three-scenes,store,types,creation-videos}.ts`, `src/lib/social-v2/deps.ts`, `src/lib/stock/stock-clip.ts`, les deux routes vidéo, tests vidéo concernés.

Vérifications réellement exécutées : `npx tsc --noEmit` (succès), puis `npx vitest run tests/video-editorial-contract.test.ts tests/video-mission-reliability.test.ts tests/video-scenes.test.ts tests/video-vocabulaire-client.test.ts tests/videos-creation.test.ts tests/video-creative-guide.test.ts tests/video-v2.test.ts tests/video-creation-rights.test.ts` : **49 tests réussis, 8 fichiers**. Fournisseurs et contrôles de vision simulés ; le test du contrôle final encode et analyse un vrai fichier local. Aucun appel IA réel. La suite complète sera exécutée après les trois lots, conformément à la mission.

## Référence ONDE

L'affiche casque noir/bleu est écartée. Recherche effectuée dans les pièces jointes accessibles, les ressources locales et l'arbre distant de la branche `claude/fraise-onde-themes-reference` (consultée en lecture uniquement). Le script `scripts/lot2c-demo-local.ts` de cette branche exige un pack privé `Pack_Claude_Fraise_Onde/ONDE_AUDIO/` ; les neuf images et logos ne sont pas embarqués dans Git. Le dossier correspondant n'est pas présent dans cet environnement. Les pièces jointes disponibles contiennent l'ancien poster bleu et le ZIP ORBE/Rive, pas ce pack. **Référence noir/vert et logo non ouverts ici : contrôle visuel impossible pour le moment.** Aucun substitut ONDE créé ou publié. Les essais suivants utilisent des projets fictifs explicitement identifiés ; ils ne valident pas ONDE.

## État des lots suivants

Lot 2 (voix/montage) et lot 3 (devis/reprises/parcours UI) à réaliser dans cet ordre. Les essais payants restent reportés ; aucun thème, déploiement, publication sociale ou merge.
