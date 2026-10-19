# Preuves du parcours amont

Mission : PR #138, [rapport complet](../../docs/coordination/PARCOURS_AMONT_RESULTATS.md). Code applicatif testé : **70924680ea11592220c9965a142fb3335845c5ed**.

**Toutes les réponses fournisseurs et les créations des démonstrations ci-dessous sont simulées.** L’interface, les API, la file, les versions, les contrôles et la persistance sont réels. Les images synthétiques portent leur mention de test ; aucune qualité de création IA réelle n’est revendiquée. Aucun appel IA payant ni donnée client.

## Voir les parcours

Les MP4 sont les enregistrements réels de Chromium, convertis en H.264 sans accélération ni remplacement d’interactions. Les PNG conservent leur pleine résolution ; ouvrir le fichier pour zoomer ou télécharger.

| Preuve | Produit | Services |
|---|---|---|
| Film du parcours initial | [MP4 produit](videos/produit.mp4?raw=1) | [MP4 services](videos/service.mp4?raw=1) |
| Film de restauration sans génération | [MP4 reprise produit](videos/produit-restauration.mp4?raw=1) | [MP4 reprise services](videos/service-restauration.mp4?raw=1) |
| Saisie réelle | [PNG](captures/produit-01-saisie.png) | [PNG](captures/service-01-saisie.png) |
| Offre / analyse proposée | [PNG](captures/produit-02-offre-analysee.png) | [PNG](captures/service-02-offre-analysee.png) |
| Sources / choix de stratégie | [PNG](captures/produit-03-recherche.png) | [PNG](captures/service-03-recherche.png) |
| Identité / logo | [PNG](captures/produit-04-identite.png) | [PNG](captures/service-04-identite.png) |
| Textes / plan | [PNG](captures/produit-05-contenus.png) | [PNG](captures/service-05-contenus.png) |
| Projet prêt, ordinateur | [PNG](captures/produit-06-pret.png) | [PNG](captures/service-06-pret.png) |
| Après rechargement | [PNG](captures/produit-07-rechargement.png) | [PNG](captures/service-07-rechargement.png) |
| Projet prêt, mobile complet | [PNG](captures/produit-08-mobile.png) | [PNG](captures/service-08-mobile.png) |
| Choix amont changé : obsolescence | [PNG](captures/produit-09-choix-amont-modifie.png) | [PNG](captures/service-09-choix-amont-modifie.png) |
| Version réutilisée et revalidée | [PNG](captures/produit-10-restauration-validee.png) | [PNG](captures/service-10-restauration-validee.png) |
| Reprise, mobile complet | [PNG](captures/produit-11-restauration-mobile.png) | [PNG](captures/service-11-restauration-mobile.png) |
| Reprise, écran mobile de téléchargement | [PNG](captures/produit-12-telechargement-mobile.png) | [PNG](captures/service-12-telechargement-mobile.png) |

Autres contrôles : [échec fournisseur injecté](captures/produit-03a-echec-fournisseur.png), [refus réel du devis pour tarifs non confirmés](captures/produit-tarifs-non-confirmes.png). Le second contrôle a été réalisé dans la base synthétique avant déclaration de la date de tarifs fictive ; il ne désactive pas la protection de production.

## Données et résultats consultables

- [Parcours navigateur](donnees/browser-proof.json) et [restauration](donnees/restoration-proof.json) : téléchargements identiques à l’API, rechargement, obsolescence, absence de débordement et erreurs JavaScript.
- [Contrat produit initial](donnees/produit-download.json), [contrat services initial](donnees/service-download.json) : fichiers réellement téléchargés.
- [Contrat produit restauré](donnees/produit-restored-download.json), [contrat services restauré](donnees/service-restored-download.json) : mêmes textes et mêmes médias après revalidation, sans régénération.
- [État final persistant, jobs et coûts](donnees/persistence-proof.json).
- [Deux activités nouvelles après conception](donnees/cas-nouveaux.json) ; [source reproductible](donnees/cas-nouveaux-source.txt), à recopier sous `work/` pour l’exécution avec `tsx` depuis le dépôt.
- [Lecture web réelle bloquée par DNS](donnees/lectures-web-reelles.json).
- [Décalage de stratégie reproduit avant correction](donnees/restauration-avant-correction.json).
- [Validation, commandes et environnement](validation.json), [empreintes des livrables](manifest.json).

Les journaux complets de l’ancienne suite ne sont pas publiés : certains tests affichent leurs propres jetons temporaires. Les résumés et empreintes préservent la trace de vérification sans les exposer.

## Reproduire sans appel payant

Prérequis utilisés : dépendances du dépôt installées, Node 24, Chromium local `/usr/bin/chromium`, FFmpeg et FFprobe. Aucun fichier `.env.local` de production ni base client ne sont copiés.

1. Choisir **un nouveau dossier vide**, de nom `ecs-preparation-test-*`, et l’utiliser pour tous les processus. Le harnais refuse les autres noms et une seconde initialisation du même dossier.
2. Compiler le code (`npx tsc --noEmit`, `npm run build`) avec un `DATA_DIR` de build isolé.
3. Initialiser le dossier de preuve : `DATA_DIR=/chemin/ecs-preparation-test-preuve npx tsx scripts/preparation/test-harness.ts seed`. Cela crée un compte, deux abonnements et deux clés **fictifs**, uniquement dans cette base. Ne jamais le faire sur des données du studio.
4. Lancer **ce seul worker de test**, et non `worker/index.ts` : `DATA_DIR=/chemin/ecs-preparation-test-preuve AI_PRICES_CHECKEDAT=<horodatage-ms-de-test> npx tsx scripts/preparation/test-harness.ts worker`. Il ne traite que `project.prepare`, injecte les réponses et interdit le réseau dans son processus.
5. Ouvrir `next start -H 127.0.0.1 -p 18100` avec le même `DATA_DIR`, `APP_URL=http://127.0.0.1:18100` et le secret **de cette base de test** lu sans l’afficher. Exemple de lanceur local :

```python
import os, time
from pathlib import Path
p = Path('/chemin/ecs-preparation-test-preuve')
os.environ['DATA_DIR'] = str(p)
os.environ['APP_URL'] = 'http://127.0.0.1:18100'
os.environ['APP_SECRET'] = (p / '.app-secret').read_text().strip()
# Confirmation fictive pour les devis des fournisseurs simulés seulement.
os.environ['AI_PRICES_CHECKEDAT'] = str(int(time.time() * 1000))
os.execvp('node', ['node', 'node_modules/next/dist/bin/next',
                   'start', '-H', '127.0.0.1', '-p', '18100'])
```

6. Fournir à Playwright son FFmpeg local (dans la preuve : `PLAYWRIGHT_BROWSERS_PATH` isolé, exécutable FFmpeg déjà installé) puis exécuter `npx tsx scripts/preparation/browser-proof.ts /chemin/ecs-preparation-test-preuve` et `npx tsx scripts/preparation/restoration-proof.ts /chemin/ecs-preparation-test-preuve`. Le second vérifie les vrais boutons de reprise et n’envoie aucune demande `quote` ou `generate`.
7. Exécuter `DATA_DIR=/chemin/ecs-preparation-test-preuve npx tsx scripts/preparation/test-harness.ts proof` pour obtenir la preuve SQLite finale. Les captures, contrats et WebM sont dans le sous-dossier `captures`. Les MP4 de cette remise sont des conversions sans modification du rythme.

Les contrôles d’accès, de devis, de budget et de qualité restent en place. Cette procédure ne prouve pas qu’une clé réelle fonctionne ou qu’une création réelle est professionnelle. Arrêter les processus locaux après vérification ; aucun thème ni CMS n’est à lancer pour ce lot.
