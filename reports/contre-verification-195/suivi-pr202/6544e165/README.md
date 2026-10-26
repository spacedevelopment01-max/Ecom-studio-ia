# PR202 seconde tête — défaut de masquage BLOQUANT

**6544e165343b4cccfc7686a47839a9b489996c80**, copie détachée native, fichiers applicatifs suivis propres. La tête part de53ecf5bb ; base de PR courante d2fb63ee. Le diff à trois points ne retire aucune correction198/200/199 ; leur conservation sera vérifiée sur le main effectivement fusionné, pas déduite de cette ancienne base.

Le nouveau helper partagé est utilisé par le contrôle Studio, les contrôles d'exportCMS et les scripts principaux. La reproduction précédente du téléchargement vide est corrigée : [fonction native avec double de réponse vide](runtime-valide.json) →**available=true,0erreur,0téléchargement**. [Trace](runtime-valide-trace.jsonl) : dossier cache privé du processus.

**Nouveau défaut reproduit : `writeShopifyDocs()` rejette un JSON embarqué vide, mais `themeCheck()` transforme l'erreur de préparation en `{available:false,errors:[]}`.** [Résultat natif](runtime-bundle-vide.json),[trace de la seule lecture substituée](runtime-bundle-vide-trace.jsonl). L'ancien catch d'import englobe maintenant le helper et masque cette erreur supplémentaire. Le consommateur `custom-theme.ts` ne fait ses contrôles complets que si `tc.available` : ce cas les contourne. La sonde n'exécute pas ce moteurIA et ne génère rien.

La corruption est une **double locale de lecture**, exclusivement pour `data/preset.json` de la dépendance installée. Aucun fichier de dépendance partagé n'a été modifié. Aucun vrai réseau,aucune API fournisseur. Le problème est dans le résultat de la fonction produit native, pas dans une simulation de `themeCheck()`.

**Verdict : BLOQUÉ sur cette tête**,défaut transmis à Claude dans [202/6420210891](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/202#issuecomment-6420210891). Une erreur de préparation/exécution doit être bloquante et identifiable ; ne réserver l'indisponibilité qu'à l'absence effective de l'outil. Tester la fonction native, en conservant les vrais contrôles.

- [Concurrence native dans un même processus](runtime-concurrence.json) :3appels simultanés,2thèmes valides et1Liquid invalide →**0/1/0erreur**,tous disponibles,erreur `LiquidSyntaxError` préservée,`XDG_CACHE_HOME` restauré après chargement.
- [Types](types.exit) :sortie0 ; aucun fichier applicatif suivi modifié.
- Suite ciblée4fichiers en cours à cette première publication. Préparation initiale127 (PATH de harnais incomplet),conservée `preparation-tests-path.*` ; reprise avec PATH hérité et PHPCLI. Aucune assertion ni délai de test assoupli.
- Matrice complète de l'ancienne tête02fff interrompue143 lorsque la PR a changé ; résultats partiels explicitement conservés dans son dossier,aucune réussite complète annoncée.

Les harnais `contre-verification-202-*.txt` et traces sont publiés. Le résultat est une revue du code exact ci-dessus, pas le verdict d'un nouveau main. Aucun merge,déploiement,appelAPI réel,ni modification du studio utilisateur.
