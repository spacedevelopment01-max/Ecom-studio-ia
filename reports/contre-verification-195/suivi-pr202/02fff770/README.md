# Contre-vérification indépendante PR202 — première tête BLOQUÉE

Code exact : **02fff7705bb213c8237a7374109879852e09afa0**, base main **d2fb63ee99bf799927bb24f65e03fc0c6fb5cee5**. Copie détachée séparée ; aucun fichier applicatif suivi modifié. Ce verdict ne retire pas l'accord sur les corrections198/200/199 du main d2fb.

## Défaut reproduit dans le vrai contrôle du Studio

Même fixture native `sampleSpec('atelier')`, même fonction native `src/lib/theme/theme-check.ts:themeCheck`, même dépendance installée exacte3.30.1 :

| Cas | Disponible | Erreurs réelles renvoyées | Preuve |
|---|---|---|---|
| Documents Shopify simulés complets | true | **0** | [JSON](runtime-valide.json) |
| Réponse simulée200, corps de `preset.json` vide | true | **354 ValidSchema**, « Parse error at offset0 » | [JSON](runtime-preset-vide.json) |
| Documents locaux complets, vraie erreur de syntaxe Liquid injectée | true | **1 LiquidSyntaxError** | [JSON](runtime-liquid-invalide.json) |

Le défaut de téléchargement Shopify est simulé ; **la compilation et le Theme Check du Studio sont réellement exécutés**. Aucun appel fournisseur/API réel. La double remplace uniquement le `node-fetch` des documents publics Shopify par les fichiers de la dépendance installée, ou le corps vide ciblé. Toute autre requête est refusée ; garde réseau native du lot9 également préchargée. Les traces détaillent chaque ressource. Les processus de sonde sortent0 quand l'observation est enregistrée : cela ne transforme pas les354erreurs du deuxième cas en contrôle réussi.

Le nouveau helper shell prépare correctement les documents valides et rejette `preset.json` vide (**sortie1**). La vérification de rejet utilise une copie VERBATIM du helper et une copie isolée de la dépendance avec un seul fichier vidé ; la dépendance partagée n'est jamais modifiée. [Preuve](helper-preset-vide.json), [erreur conservée](helper-preset-vide.log).

**La correction CLI ne s'applique pas au Studio.** `theme-check.ts` importe directement le SDK puis appelle `check(dir)` avec son cache et téléchargement par défaut. `custom-theme.ts:435–455` utilise ce résultat pour les corrections ciblées et la conservation/remplacement des sections. Des faux défauts de schéma peuvent donc alimenter ces décisions ; aucun moteurIA ou appel de correction payant n'a été exécuté pendant cette reproduction.

**Verdict : BLOQUÉ sur cette tête dans le périmètre demandé par Thomas.** Faire traiter le chemin produit avec documents locaux validés et caches isolés, sans mutation globale de l'environnement concurrente, sans retourner une fausse indisponibilité ni retirer les erreurs réelles. Ajouter les tests du Studio valide/schéma documentaire vide/vrai Liquid invalide/vrai schéma de section invalide/concurrence. La matrice shell complète204cas+1ZIP était encore en cours à la publication de cette première preuve ; aucune réussite complète encore revendiquée ici.

## Reproduction et limites

Harnais indépendants publiés en texte : [sonde runtime](contre-verification-202-runtime.ts.txt), [double et trace réseau](contre-verification-202-network.mjs.txt). Les copier sous `scripts/` dans une copie exacte de la tête, avec `npm ci` du verrou. Valeurs de test isolées, aucune clé requise. Exemple depuis la copie utilisée :

```bash
PROBE_202_MODE=empty-preset \
PROBE_202_TRACE=/tmp/ecs-202-preuves/runtime-preset-vide-trace.jsonl \
XDG_CACHE_HOME=/tmp/ecs-202-preuves/cache-runtime-preset-vide \
NODE_OPTIONS='--max-old-space-size=1536 --import=/tmp/ecs-202-candidat-02fff770/scripts/lot9/network-guard.mjs --import=/tmp/ecs-202-candidat-02fff770/scripts/contre-verification-202-network.mjs' \
./node_modules/.bin/tsx scripts/contre-verification-202-runtime.ts /tmp/ecs-202-preuves/runtime-preset-vide.json
```

`PROBE_202_MODE=valid` donne le témoin valide. Pour la vraie erreur Liquid : `PROBE_202_MODE=deny PROBE_202_INVALID=liquid SHOPIFY_TLD_ROOT=/tmp/ecs-202-preuves/docs-valides`, après `node scripts/theme-docs-local.mjs /tmp/ecs-202-preuves/docs-valides`, avec cache distinct. Les chemins sont ceux de l'expérience, à adapter dans le harnais également pour une autre copie.

La première préparation de fixture a échoué avant le SDK (mauvais argument du harnais), journal conservé `preparation-fixture-runtime-valide.*`. Le harnais a été corrigé pour employer directement la fixture native ; aucune fonction du produit n'a été modifiée et aucun échec n'a été caché.

Pas de recette CMS réelle, pas d'APIIA, pas de preuve du studio utilisateur servi. Aucun merge ni déploiement. Le contrôle APRÈS exige un nouveau SHA main réellement fusionné par Claude et une nouvelle exécution ; ce dossier ne le remplace pas.
