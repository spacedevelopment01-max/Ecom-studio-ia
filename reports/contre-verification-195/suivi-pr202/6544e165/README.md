# PR202 seconde tête — défaut de masquage BLOQUANT

**6544e165343b4cccfc7686a47839a9b489996c80**, copie détachée native, fichiers applicatifs suivis propres. La tête part de53ecf5bb ; base de PR courante d2fb63ee. Le diff à trois points ne retire aucune correction198/200/199 ; leur conservation sera vérifiée sur le main effectivement fusionné, pas déduite de cette ancienne base.

Le nouveau helper partagé est utilisé par le contrôle Studio, les contrôles d'exportCMS et les scripts principaux. La reproduction précédente du téléchargement vide est corrigée : [fonction native avec double de réponse vide](runtime-valide.json) →**available=true,0erreur,0téléchargement**. [Trace](runtime-valide-trace.jsonl) : dossier cache privé du processus.

**Nouveau défaut reproduit : `writeShopifyDocs()` rejette un JSON embarqué vide, mais `themeCheck()` transforme l'erreur de préparation en `{available:false,errors:[]}`.** [Résultat natif](runtime-bundle-vide.json),[trace de la seule lecture substituée](runtime-bundle-vide-trace.jsonl). L'ancien catch d'import englobe maintenant le helper et masque cette erreur supplémentaire. Le consommateur `custom-theme.ts` ne fait ses contrôles complets que si `tc.available` : ce cas les contourne. La sonde n'exécute pas ce moteurIA et ne génère rien.

La corruption est une **double locale de lecture**, exclusivement pour `data/preset.json` de la dépendance installée. Aucun fichier de dépendance partagé n'a été modifié. Aucun vrai réseau,aucune API fournisseur. Le problème est dans le résultat de la fonction produit native, pas dans une simulation de `themeCheck()`.

**Verdict : BLOQUÉ sur cette tête**,défaut transmis à Claude dans [202/6420210891](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/202#issuecomment-6420210891). Une erreur de préparation/exécution doit être bloquante et identifiable ; ne réserver l'indisponibilité qu'à l'absence effective de l'outil. Tester la fonction native, en conservant les vrais contrôles.

- [Concurrence native dans un même processus](runtime-concurrence.json) :3appels simultanés,2thèmes valides et1Liquid invalide →**0/1/0erreur**,tous disponibles,erreur `LiquidSyntaxError` préservée,`XDG_CACHE_HOME` restauré après chargement.
- [Types](types.exit) :sortie0 ; aucun fichier applicatif suivi modifié.
- **Suite ciblée : 57 réussis, 0 échec, 0 ignoré**, 4 fichiers natifs, sortie0 : [compteurs et empreinte du brut](tests-cibles-synthese.json). Préparation initiale127 (PATH de harnais incomplet), conservée `preparation-tests-path.*` ; reprise avec PATH hérité et PHPCLI. Aucune assertion ni délai de test assoupli.
- Matrice complète de l'ancienne tête02fff interrompue143 lorsque la PR a changé ; résultats partiels explicitement conservés dans son dossier,aucune réussite complète annoncée.

## Second défaut : racine documentaire fournie, cache non isolé

Deux processus distincts appellent le vrai `loadThemeCheck()` avec `SHOPIFY_TLD_ROOT` fourni, `XDG_CACHE_HOME` absent. Les deux SDK résolvent **le même dossier de cache utilisateur par défaut** : [synthèse](cache-explicite-synthese.json), [processus1](cache-explicite-1.json), [processus2](cache-explicite-2.json). L'empreinte égale permet la comparaison sans exporter ce chemin. Le retour anticipé du helper ne crée aucun cache isolé dans ce cas. Cela couvre aussi un enfant héritant de la racine locale d'un parent après restauration de XDG.

**CONFIRMÉ DANS LE CODE et REPRODUIT : résolution commune du cache.** Ce test ne lance pas le checker, ne provoque pas de course et n'écrit pas dans le cache utilisateur. Ne pas le présenter comme une corruption concurrente reproduite. L'isolation observée dans les processus par défaut et dans le shell reste valide ; sa généralisation au chemin de racine fournie ne l'est pas. Défaut transmis à Claude dans [202/6420320468](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/202#issuecomment-6420320468).

## Le vrai script conserve les erreurs et annotations

**`bash scripts/verify-theme.sh --rapide` réellement exécuté**, sous garde réseau, avec une seule erreur Liquid injectée dans le fichier de thème compilé temporaire `fr-atelier/sections/hero-editorial.liquid`. Aucun fichier source suivi modifié.

- **25 contrôles natifs : 24 réussis dont le ZIP client, 1 échec attendu.**
- Sortie **1**, vrai `ERROR LiquidSyntaxError` et annotation GitHub `::error` conservés, message final « des erreurs sont à corriger ».
- **25 processus, 25 caches distincts**, zéro téléchargement tenté.
- [Synthèse avec assertions](shell-erreur-liquid-synthese.json), [journal complet](shell-erreur-liquid.log), [trace](shell-erreur-liquid-trace.jsonl).
- Même wrapper avec le preset embarqué vidé par double de lecture : sortie **1** avant la matrice, message documentaire illisible conservé ; [journal](shell-doc-vide.log), [sortie](shell-doc-vide.exit).

Ces échecs attendus vérifient que les gardes refusent réellement un défaut. Ils ne sont pas ajoutés au compte57 des tests Vitest. La matrice complète204cas+1ZIP n'a pas été qualifiée sur cette tête bloquée ; elle devra être exécutée sur le correctif stable, puis les contrôles nécessaires repris sur le vrai main après fusion.

Les scripts historiques ad hoc `theme-v2-check.ts`, `theme-check-exports-190.ts`, `mission154/export-proof.ts`, `lot1*-proof.ts` importent encore directement le SDK. Cette limite a été signalée ; les deux consommateurs produit identifiés sont migrés. Ne pas annoncer que chaque ancien outil est déjà couvert.

## Autres garanties vérifiées

- Préparation native du nouvel outil : **20 JSON tous valides et bit-identiques aux fichiers installés**, dont13schémas, révision `40f966fc7793462726d9f8573c8d522f8ab44c54` ; [inventaire avec SHA256](docs-validation.json). Aucun document de référence simplifié.
- [Contrôle d'export natif `staticChecks`](cms-doc-vide.json), ZIP compilé fictif, preset embarqué illisible simulé : compatibilité **non mesurée**, raison d'indisponibilité présente, verdict **PROVISIONAL**, jamais FINAL. Cette distinction honnête du cheminCMS doit être préservée ; aucune installationCMS ni transaction réelle exécutée.
- [Périmètre source de la PR](perimetre-source.txt) à trois points : aucun fichier de composition, média, maquette, budget, droit ou configuration client changé. La tête part d'un main plus ancien ; seule la vérification après fusion pourra confirmer la composition combinée avec198/200/199.

## Verdict et suite bloquée

[Verdict structuré](verdict.json). **Avis BLOQUÉ sur6544e165** pour les deux défauts documentés ; corrections demandées à Claude, sans branche de correctif concurrente. La vraieCI de cette PR était encore en cours au dernier relevé, run40351104053 ; sa réussite éventuelle ne couvrirait pas les cas indépendants rouges ci-dessus.

Main distant encore **d2fb63ee99bf799927bb24f65e03fc0c6fb5cee5**, PR202 non fusionnée au relevé. Son verdict favorable antérieur (3405tests/0échec/31ignorés, build/types, CI réelle40340415088, parcours natifs et preuvesc4883487) reste valable **pour ce SHA seulement**. **Aucun verdict APRÈS202 n'existe** : il faut d'abord le correctif, son accord avant fusion, puis le nouveau main réellement fusionné par Claude et ses propres contrôles. La mission complète reste en attente de ces étapes, pas déclarée terminée.

Commandes : [COMMANDES.md](COMMANDES.md). Sources des harnais et tous résultats/échecs de préparation conservés. Aucune donnée privée publiée ; les bases fictives de test ne sont pas incluses dans ce dossier.

Les harnais `contre-verification-202-*.txt` et traces sont publiés. Le résultat est une revue du code exact ci-dessus, pas le verdict d'un nouveau main. Aucun merge,déploiement,appelAPI réel,ni modification du studio utilisateur.
