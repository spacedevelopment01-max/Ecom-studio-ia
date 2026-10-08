# Éditeur visuel des publicités — rapport final

Date : 8 octobre 2026 · Branche : `claude/ecom-studio-ia-platform-8cwl79` · **Non fusionné**. La phase 7A n'est pas commencée.

## En bref

Le propriétaire peut maintenant, dans l'onglet **Publicités** :

1. cliquer sur « Créer des publicités » ;
2. voir les propositions ;
3. cliquer sur « Modifier » ;
4. changer lui-même le texte, la photo, les formes, les couleurs et les positions ;
5. enregistrer ;
6. exporter en PNG, JPEG ou document éditable (JSON).

Toutes les modifications manuelles sont gratuites : aucune n'utilise l'IA.

Ce parcours a été vérifié dans un vrai navigateur (Chromium), sur ordinateur (1440 × 900) et au format téléphone
(390 × 844, tactile). Résultat : **28 vérifications sur 28 réussies**, avec des captures réelles.

## Ce qui a été vérifié, et ce qui ne l'a pas été

| Vérifié | Comment |
|---|---|
| Parcours complet : créer → voir → Modifier → enregistrer → exporter | navigateur réel, `scripts/e2e-ad-editor.ts` |
| Titre modifié par double-clic puis au clavier | navigateur, ordinateur et téléphone (double-tap) |
| Élément déplacé à la souris et au doigt (vrais événements tactiles) | navigateur |
| Couleur du bouton, remplacement de la photo, ajout d'une forme | navigateur |
| Annuler / rétablir | navigateur et tests unitaires |
| Enregistrement : chaque enregistrement crée une nouvelle version | navigateur et base de données |
| Le travail est conservé après rechargement de la page | navigateur |
| Badge « Modifiée » dans la liste | navigateur |
| Export PNG / JPEG aux dimensions exactes du format | navigateur (fichier téléchargé) |
| « Agrandis le titre » est fait sans IA | navigateur |
| Une demande qui exige l'IA (nouvelle photo, nouvelle version) n'est jamais lancée sans accord | navigateur : le client refuse, aucune tâche lancée |
| Aperçu du navigateur ≈ export du serveur | comparaison pixel à pixel (détails ci-dessous) |
| Aucune erreur JavaScript dans la page | navigateur |
| Pas de défilement horizontal sur téléphone | navigateur |

| **Non vérifié** | Pourquoi |
|---|---|
| Génération payante réelle **après accord** : photo par l'IA, nouvelle version par l'IA | Aucun appel payant n'a été fait. Le code est branché ; il sera vérifié au benchmark 6B, avec votre accord. |
| Tablette réelle (iPad, Android) | Testé seulement au format téléphone (simulation Chromium) |
| Safari et Firefox | Testé seulement dans Chromium |
| Qualité visuelle des publicités avec de vraies photos | Les tests utilisent des images de test (motifs colorés), pas de vraies photos |

## Fonctionnalités disponibles

**Canevas.** Le rendu utilise le même moteur que l'export (`src/lib/ad-doc/render.ts`).
- Sélection au clic ou au toucher. Les calques pivotés sont bien détectés, et le fond plein écran passe en dernier.
- Déplacement avec repères magnétiques : bords et centre de la page, zones de sécurité, autres éléments. Alt désactive l'aimantation.
- 8 poignées de redimensionnement. Les proportions sont gardées pour les images, ou avec Maj.
- Poignée de rotation, par pas de 15° au doigt ou avec Maj.
- Double-clic (double-tap) sur un texte pour l'écrire sur place.
- Zones de sécurité de la plateforme affichées en pointillés. Zoom avant, zoom arrière et « ajuster ».

**Outils.**
- Ajouter un texte, un rectangle, un cercle, une ligne ou une image de la bibliothèque.
- Dupliquer, supprimer.
- Annuler / rétablir : un réglage continu, comme un curseur ou une saisie, compte pour un seul pas.
- Raccourcis clavier : Ctrl+Z / Y / S / D, Suppr, flèches.

**Calques.** Liste du premier plan vers le fond. Pour chaque calque : sélectionner, masquer ou afficher, verrouiller (un calque verrouillé ne bouge pas), monter ou descendre.

**Propriétés de l'élément sélectionné.**
- Texte : contenu, police (les polices de la marque en premier), graisse, taille, couleur (nuancier de la marque et couleur libre), alignement, interligne, espacement, majuscules.
- Bouton : couleur de fond et arrondi.
- Forme : type, couleur, dégradé, arrondi, bordure.
- Image :
  - remplacer depuis la bibliothèque, ou importer une photo ;
  - mode « remplir » ou « entière » ;
  - recadrage : zoom et position ;
  - arrondi.
- Pour tous les éléments : opacité, X, Y, largeur, hauteur, rotation, alignement sur la page.

**Enregistrement et versions.**
- Chaque enregistrement crée une version. Rien n'est écrasé.
- Liste des versions, avec « Restaurer ». Une restauration crée elle aussi une nouvelle version.
- Si la page se ferme avant l'enregistrement, les modifications sont gardées sur l'appareil et proposées à la prochaine ouverture (« Les reprendre » / « Ignorer »).
- Une nouvelle génération n'écrase jamais une création modifiée par le client.

**Autres formats.** L'éditeur adapte la création à 1:1, 4:5, 9:16, 16:9, LinkedIn ou Pinterest en gardant les modifications. Il crée une nouvelle création et ouvre celle-ci. Il peut aussi dupliquer une création.

**Export.** PNG, JPEG et document éditable (JSON). L'export suit la version enregistrée : si des modifications ne sont pas enregistrées, elles sont enregistrées d'abord. Ce que l'on voit est donc ce que l'on exporte.

**Contrôles signalés** (bouton « triangle »). Ils signalent sans bloquer :
- contraste et taille du texte ;
- zones de sécurité ;
- produit recouvert ;
- **texte qui chevauche le bouton** (nouveau).

**Retouches en langage naturel** (zone « Demander une retouche »).
- Les demandes simples sont faites sur place, sans IA et gratuitement : « Agrandis le titre », « Change la couleur du bouton en vert », « Déplace le logo en haut à droite »…
- « Remplace la photographie… » propose deux choix :
  - la bibliothèque, gratuite ;
  - ou une image créée par l'IA, avec le quota du forfait affiché et un accord demandé avant de lancer.
- « Fais une version plus élégante » demande l'accord, puis le quota si l'IA est active. Rien n'est lancé sans réponse positive.

**Téléphone : interface tactile dédiée.** Ce n'est pas l'écran d'ordinateur réduit.
- Canevas en plein écran et grandes poignées.
- Barre d'outils en bas : Ajouter, Texte, Réglages, Calques, Plus.
- Tiroirs qui s'ouvrent au-dessus de la barre.
- Double-tap pour écrire au clavier du téléphone.
- Glisser au doigt.

## Branchement dans l'onglet Publicités

Nouvelle section **« Créations publicitaires »** (`src/components/studio/ad-editor/ad-creatives.tsx`), en haut de l'onglet :

**Bouton « Créer des publicités ».**
- Vous choisissez le nombre d'angles, les réseaux, une offre réelle (facultatif : sans offre, aucune promotion n'est écrite) et le public.
- La création se fait en tâche de fond avec l'Advertising Engine V2, et son avancement est affiché.
- La liste se met à jour à la fin, même si la tâche est très courte.
- Avec l'IA active, le quota de visuels du forfait est affiché et votre accord est demandé avant de lancer. Sans IA, c'est gratuit (moteur local).

**Cartes des créations.** Chaque carte affiche :
- l'aperçu ;
- le réseau, le format et la version ;
- le badge « Modifiée » ;
- les boutons « Modifier » et « PNG ».

**Ancien parcours conservé.** Les anciennes « Campagnes » (textes, plan de test, export CSV) restent en dessous, sous le titre « Campagnes ». Le client n'est donc plus bloqué sur l'ancien moteur, et rien d'existant n'est retiré.

## Fidélité aperçu / export

- L'éditeur charge exactement les mêmes fichiers de polices que le serveur, sous les mêmes noms, avant le premier rendu (`/api/fonts`). La famille, la graisse la plus proche et l'italique sont choisis de la même façon. Un test vérifie que les deux côtés produisent la même description de police.
- Mesure dans le navigateur, sur la création ouverte : écart moyen de **0,6 à 1,4 sur 255** entre l'aperçu et l'export, et **0,25 à 0,85 %** de pixels nettement différents.
- Ces écarts viennent du lissage des bords des lettres et des images : le navigateur et le serveur n'arrondissent pas exactement de la même façon. **La composition est identique** : mêmes positions, retours à la ligne, tailles et couleurs. L'aperçu n'est cependant **pas identique à l'octet près**. L'export, fait par le serveur, reste la référence.
- Images de comparaison : `reports/screenshots/ad-editor/fidelite-navigateur.png` et `fidelite-serveur.png`.

## Défauts trouvés pendant les tests, et corrigés

1. **Titre qui passait sous le bouton** sur les formats hauts (9:16 et 4:5) quand le titre faisait deux lignes avec une photo (mises en page « hero_left » et « split »).
   - Correction dans `src/lib/ads-v2/compose.ts` : le titre s'arrête au-dessus du bouton.
   - Le contrôle de qualité publicitaire détecte désormais ce chevauchement : le moteur recommence la mise en page.
   - L'éditeur le signale aussi.
   - Un test échoue sans la correction et passe avec.
2. **Tiroirs du téléphone qui couvraient la barre d'outils.** Ils s'ouvrent maintenant au-dessus.
3. **Liste non actualisée** quand la création des publicités se terminait en moins de 3,5 secondes. La tâche est maintenant suivie jusqu'à la fin.
4. Positions X / Y affichées avec des décimales coupées : elles sont maintenant arrondies.
5. La demande « nouvelle version par l'IA » affiche maintenant aussi le quota du forfait avant de lancer.

## Tests

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | OK |
| `npx vitest run` | **810 / 810** réussis, 97 fichiers. Les nouveaux tests sont listés après ce tableau. |
| `npm run build` | OK |
| Navigateur réel `scripts/e2e-ad-editor.ts` (ordinateur et téléphone) | **28 / 28** (`reports/screenshots/ad-editor/resultats.json`) |

Nouveaux tests :
- `tests/ad-editor-ui.test.ts` : sélection au point, poignées, rotation, repères magnétiques, alignement, historique, polices identiques au serveur, liste blanche des fichiers de police ;
- `tests/ad-editor.test.ts` : aucun texte sous le bouton, quel que soit le format, et le contrôle qui le détecte ;
- `tests/ads-v2.test.ts` : composition directe, titre sur deux lignes avec photo dans 4 formats et 4 mises en page.

Le test navigateur tourne sur une **base de démonstration séparée**, créée par `scripts/seed-ad-editor-demo.ts` : compte de démonstration, projet « Sérum Éclat », outils simulés. **Aucun appel d'IA, aucune dépense.**

Pour le relancer :

```bash
DATA_DIR=/tmp/demo STOCK_OFFLINE=1 npx tsx scripts/seed-ad-editor-demo.ts   # affiche l'identifiant du projet
DATA_DIR=/tmp/demo STOCK_OFFLINE=1 npm run build && DATA_DIR=/tmp/demo STOCK_OFFLINE=1 npm start
EMAIL=demo@exemple.fr PASSWORD=motdepasse-demo PROJECT=<identifiant> npx tsx scripts/e2e-ad-editor.ts
```

## Captures (réelles, `reports/screenshots/ad-editor/`)

| Fichier | Contenu |
|---|---|
| `01-onglet-publicites.png` | Onglet Publicités : section « Créations publicitaires » |
| `01b-creer-des-publicites.png` | Fenêtre « Créer des publicités » |
| `01c-propositions.png` | Propositions après la création (6 → 9) |
| `02-editeur-ouvert.png` | Éditeur sur ordinateur : calques, canevas, propriétés |
| `03-titre-saisie.png` | Titre en cours de saisie sur place |
| `04-modifications.png` | Après titre, déplacement, couleur, photo et forme |
| `05-apres-rechargement.png` | Après rechargement de la page : tout est conservé |
| `06-versions.png` | Versions enregistrées |
| `07-export.png` | Fichier PNG réellement téléchargé |
| `08-retouche-langage-naturel.png` | « Agrandis le titre » fait sans IA |
| `09-photo-bibliotheque-ou-ia.png` | Choix : bibliothèque (gratuit) ou IA (avec accord) |
| `10` à `15-mobile-*.png` | Téléphone : éditeur, clavier, glisser au doigt, réglages, ajout, enregistrement |

Les visuels des captures sont des **images de test** (motifs colorés et flacon simulé). Elles ne reflètent pas la qualité des vraies photos.

## Fichiers

**Créés**
- `src/components/studio/ad-editor/`
  - `ad-editor.tsx` : éditeur plein écran, ordinateur et téléphone ;
  - `canvas.tsx` : canevas et interactions ;
  - `panels.tsx` : calques et propriétés ;
  - `resources.ts` : polices et images ;
  - `ad-creatives.tsx` : section de l'onglet Publicités.
- `src/lib/ad-doc/geometry.ts` : sélection, poignées, rotation, repères, alignement.
- `src/lib/ad-doc/fonts-client.ts` : polices dans le navigateur, identiques au serveur.
- `src/app/api/fonts/route.ts` et `src/app/api/fonts/[file]/route.ts` : catalogue et fichiers de police, sur liste blanche.
- `scripts/seed-ad-editor-demo.ts` : données de démonstration sans IA.
- `scripts/e2e-ad-editor.ts` : test navigateur.
- `tests/ad-editor-ui.test.ts`.
- `reports/ad-editor-final-report.md` et `reports/screenshots/ad-editor/`.

**Modifiés**
- `src/components/studio/tab-publicites.tsx` : section V2 ajoutée, campagnes conservées.
- `src/app/api/projects/[id]/ads/docs/route.ts` : liste avec titre, dimensions et « modifiée ».
- `src/lib/ad-doc/ops.ts` : historique — un seul pas pour les réglages continus, plusieurs opérations en un pas, remise à zéro.
- `src/lib/ad-doc/server.ts` : contrôle « texte sur le bouton ».
- `src/lib/ads-v2/compose.ts` : titre jamais sous le bouton.
- `src/lib/ads-v2/quality.ts` : chevauchement texte / bouton considéré comme illisible.
- `src/lib/media/fonts.ts` : catalogue des polices et fichier servi sur liste blanche.
- `tests/ad-editor.test.ts`, `tests/ads-v2.test.ts`.
- `reports/remaining-work.md` : seulement les éléments réellement terminés.

## Limites et fonctions manquantes (honnêtement)

- **Génération payante après accord** (photo IA, nouvelle version IA) : branchée, mais jamais exécutée avec un vrai fournisseur. À vérifier pendant le benchmark 6B, avec votre accord.
- **Pas de sélection multiple** : on ne peut ni grouper ni déplacer plusieurs éléments à la fois.
- **Pas de « pincer pour zoomer »** sur téléphone : des boutons de zoom le remplacent, dans « Plus ».
- Sur téléphone, un tiroir ouvert cache le bas de la publicité. Elle reste visible au-dessus, sans être réduite.
- Tablette réelle, Safari et Firefox : **non testés**.
- Polices : seulement celles du studio (polices libres incluses), pas d'import de police personnelle.
- L'historique « annuler » ne survit pas au rechargement de la page. Les versions enregistrées, elles, sont conservées, et un brouillon non enregistré est proposé sur le même appareil.
- Exports : PNG, JPEG et JSON. Pas de PDF, SVG ni vidéo.
- Relancer « Créer des publicités » avec les **mêmes angles** met à jour les créations existantes (nouvelle version) au lieu d'ajouter des doublons. Les créations que vous avez modifiées ne sont jamais touchées. Les angles nouveaux s'ajoutent à la liste.
- L'aperçu du navigateur n'est pas identique à l'octet près à l'export (lissage), mais la composition est la même. Voir « Fidélité ».
- La qualité visuelle réelle de l'Advertising Engine V2 reste à prouver au benchmark 6B, qui est payant et en attente.
