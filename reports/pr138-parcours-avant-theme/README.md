# PR 138 — preuves du parcours avant thème

**Interface réelle du studio ; données, dessins, sources et verdicts synthétiques. Aucun fournisseur appelé.** Ces captures ne démontrent ni la qualité créative d’une IA ni une collecte Pixabay réelle. Aucun thème n’est construit.

[Rapport complet](../../docs/coordination/PR_138_PARCOURS_AVANT_THEME.md) · [Contrat destiné à Claude](../../docs/coordination/PARCOURS_AMONT_CONTRAT_THEME.md) · [Commandes et résultats](validation.json) · [Preuve navigateur](browser-proof.json) · [Persistance isolée](persistence-proof.json) · [Fichiers/empreintes](artifacts.json) · [Vidéos/dimensions](video-metadata.json)

Les douze PNG de vues sont les captures complètes natives, sans retouche ; les liens téléchargent les originaux. Les MP4 sont les enregistrements complets du navigateur, convertis depuis WebM, sans montage. Un bandeau de simulation est visible.

| Projet / écran | Trois directions | Contenus et Contact | Médias et affectations | Vidéo du navigateur |
|---|---|---|---|---|
| Produit — ordinateur 1440 × 1000 | [PNG](produit-ordinateur-directions.png?raw=true) | [PNG](produit-ordinateur-contenus-contact.png?raw=true) | [PNG](produit-ordinateur-medias.png?raw=true) | [MP4](produit-ordinateur.mp4?raw=true) |
| Produit — mobile 390 × 844 | [PNG](produit-mobile-directions.png?raw=true) | [PNG](produit-mobile-contenus-contact.png?raw=true) | [PNG](produit-mobile-medias.png?raw=true) | [MP4](produit-mobile.mp4?raw=true) |
| Service — ordinateur 1440 × 1000 | [PNG](service-ordinateur-directions.png?raw=true) | [PNG](service-ordinateur-contenus-contact.png?raw=true) | [PNG](service-ordinateur-medias.png?raw=true) | [MP4](service-ordinateur.mp4?raw=true) |
| Service — mobile 390 × 844 | [PNG](service-mobile-directions.png?raw=true) | [PNG](service-mobile-contenus-contact.png?raw=true) | [PNG](service-mobile-medias.png?raw=true) | [MP4](service-mobile.mp4?raw=true) |

## Fichiers natifs des directions (simulation)

Ces fichiers proviennent réellement du stockage du harnais : les dessins sont synthétiques, la planche, les typographies et la charte sont produites par le code du studio. **Aucune création IA réelle n’est présentée.** Empreintes : [direction-files.json](direction-files.json).

Produit : [Planche 1](produit-direction-1.png?raw=true) · [Planche 2](produit-direction-2.png?raw=true) · [Planche 3](produit-direction-3.png?raw=true) · [Charte PDF](produit-charte.pdf?raw=true)

Service : [Planche 1](service-direction-1.png?raw=true) · [Planche 2](service-direction-2.png?raw=true) · [Planche 3](service-direction-3.png?raw=true) · [Charte PDF](service-charte.pdf?raw=true)


## Ce que montrent ces preuves

- Deux projets de test : carnet de croquis et conseil en organisation des bureaux. Aucun nom n’est utilisé par les règles métier.
- Trois packs sous le même nom, couleurs/polices/ton/ambiance/règles et lien vers leur planche ; direction déjà choisie conservée.
- Recommandation parmi les identifiants du catalogue existant et document Contact accessible dans l’interface (texte de test court, pas une rédaction finale).
- Onze emplacements produit et douze service, deux images et un clip synthétiques effectivement enregistrés. Les lots sont volontairement incomplets et le contrat prêt reste absent.
- Vraie lecture/pause du MP4 dans le lecteur du studio. Affectation modifiée sur ordinateur via l’API puis conservée après rechargement ; revue invalidée. Sur mobile, consultation du déplacement déjà enregistré : `placementSavedAfterReload:false` signifie que l’action d’édition n’y a pas été exécutée, pas un échec.
- Ordinateur/mobile et mouvement réduit ; aucun débordement horizontal ni erreur JavaScript non interceptée dans le parcours instrumenté.

## Reproduction

Sur le commit applicatif indiqué dans `validation.json`, dépendances installées, avec un dossier neuf dont le nom commence par `ecs-preparation-test-` :

```bash
DATA_DIR=/tmp/ecs-preparation-test-pr138 STOCK_OFFLINE=1 npx tsx scripts/preparation/mission-seed.ts
DATA_DIR=/tmp/ecs-preparation-test-pr138 STOCK_OFFLINE=1 npm run build
```

Démarrer ensuite `next start -H 127.0.0.1 -p 18100` avec le même DATA_DIR et un APP_SECRET aléatoire réservé au test (secret de 32 caractères minimum, jamais imprimé). Lancer :

```bash
PLAYWRIGHT_BROWSERS_PATH=<chemin local> npx tsx scripts/preparation/mission-browser-proof.ts /tmp/ecs-preparation-test-pr138
```

Le navigateur utilise `/usr/bin/chromium` dans cet environnement. Adapter ce chemin si nécessaire. Aucun worker créatif n’est requis ; les actions exercées ici sont locales. Le harnais bloque le réseau fournisseur, crée des sessions synthétiques privées et refuse les dossiers du studio. Ne jamais publier `mission-private.json`, `.app-secret`, la base SQLite, un `.env` ou les journaux bruts.

L’en-tête peut compter la tâche préparatoire synthétique du harnais, qui ne contacte aucun fournisseur. Les approbations de données synthétiques servent à afficher les étapes ; ce n’est pas la preuve d’une rédaction/validation réelle par un fournisseur. Les tests ciblés exercent séparément les refus de contenus incomplets. Le vrai raccordement aux thèmes et les vérifications CMS restent à faire.
