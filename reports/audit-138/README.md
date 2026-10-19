# PR #138 — preuves des corrections de l’audit

[Rapport avant / après](../../docs/coordination/AUDIT_138_CORRECTIONS.md) · [Validation, commandes et empreintes](validation.json) · [Six échecs reproduits avant correction](regressions-avant.txt).

Code final testé : **11114f1f5e38e59ab3b8ffc66d292f0d088c516f**. Données fictives, fournisseurs injectés, serveur/API/file/SQLite réellement exécutés. **Aucun résultat de génération IA réelle et aucun coût fournisseur réel dans cette passe.** La mission impose la revue de ces corrections avant reprise des essais réels complets.

## Captures natives, lisibles et téléchargeables

Les liens ouvrent les PNG complets à leur résolution d’origine. Sur GitHub, utiliser « Raw » ou « Download raw file » pour télécharger ; les versions mobiles sont longues et peuvent nécessiter un zoom dans l’aperçu.

| Écran | Ordinateur | Mobile |
|---|---|---|
| Produit — cinq angles, cible, motivation, objection et message | [PNG 1440 px](captures/produit-cinq-angles-ordinateur.png) | [PNG 390 px](captures/produit-cinq-angles-mobile.png) |
| Service — cinq angles adaptés à l’activité | [PNG 1440 px](captures/service-cinq-angles-ordinateur.png) | [PNG 390 px](captures/service-cinq-angles-mobile.png) |
| Ancien format trois angles — choix conservé et mise à niveau explicite | [PNG 1440 px](captures/produit-ancien-trois-angles-ordinateur.png) | [PNG 390 px](captures/produit-ancien-trois-angles-mobile.png) |
| Informations sur les textes et leur relecture | [Produit — PNG](captures/produit-contenus-ordinateur.png) | [Service — PNG](captures/service-contenus-mobile.png) |

L’ancien format est **reconstitué dans la base de test**, après preuve des deux parcours complets et de leur restauration. Il ne s’agit pas de données d’un client existant : [preuve](donnees/legacy-fixture.json). Le test de mise à niveau vers cinq angles fait partie des régressions ; capturer cet écran ne déclenche pas cette action.

## Données et contrôles

- [Parcours produit/service](donnees/browser-proof.json) : téléchargement égal au GET, rechargement, changement de cible, zéro débordement mobile.
- [Restauration par l’interface](donnees/restoration-proof.json) : textes/médias/choix conservés, zéro requête de génération.
- [Contrat produit téléchargé après restauration](donnees/produit-restored-download.json) et [contrat service](donnees/service-restored-download.json) : documents complets, cinq angles et liste `copyReadiness.provisionalFields`.
- [Persistance réelle dans la base isolée](donnees/persistence-proof.json) : deux projets prêts, zéro appel IA, zéro réservation et zéro thème.
- [Contrôles des captures cinq angles](donnees/captures-proof.json) et [ancien format](donnees/legacy-captures-proof.json) : comptage des propositions, dimensions, erreurs JavaScript et débordement.
- [Manifest des fichiers, dimensions et empreintes](manifest.json). Aucun `.env`, clé, cookie, compte réel ou base SQLite publié.

## Reproduction sans appel payant

1. Depuis le dépôt sur le code indiqué : `npx vitest run tests/audit-amont-regressions.test.ts tests/audit-intent-contexte.test.ts tests/audit-workflow-portee.test.ts` ; suite complète, types et build détaillés dans `validation.json`.
2. Les six tests initiaux sont fournis dans [regressions-avant.test.ts.txt](reproduction/regressions-avant.test.ts.txt), à copier dans `tests/` d’un checkout isolé du commit de départ pour reproduire les six échecs. La version finale des tests inclut les protections et effets supplémentaires.
3. Pour l’interface : utiliser `scripts/preparation/test-harness.ts seed`, puis `worker`, avec un `DATA_DIR` absolu neuf nommé `ecs-preparation-test-*`. Ce worker refuse tout accès réseau et injecte les réponses ; ne jamais l’utiliser sur une base client. Le serveur de test utilise le secret généré dans cette base, aucune configuration privée du studio.
4. Exécuter `scripts/preparation/browser-proof.ts` puis `restoration-proof.ts` contre le serveur local, et [captures.mjs](reproduction/captures.mjs) avec ce dossier. Chromium et FFmpeg déjà installés localement ; le chemin du FFmpeg de Playwright est propre à l’environnement de test.
5. Pour la compatibilité : copier [legacy-fixture.ts.txt](reproduction/legacy-fixture.ts.txt) dans un fichier temporaire et l’exécuter avec `tsx --tsconfig tsconfig.json`, uniquement sur cette base isolée. Relancer `captures.mjs` avec `AUDIT_LEGACY=1`.

Les dates/prix et clés présents dans le processus du harnais sont **fictifs**, et seulement destinés à exercer les vrais refus/devis avec les fournisseurs injectés. Aucun plafond ou contrôle de production n’est modifié. Les simulations ne prouvent ni authentification, tarifs réels, facturation ni qualité d’un fournisseur ; aucun modèle local n’a été ajouté ou validé.
