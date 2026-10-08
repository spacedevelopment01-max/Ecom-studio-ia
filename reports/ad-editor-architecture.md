# ÉDITEUR VISUEL DES PUBLICITÉS — ARCHITECTURE

Statut : **fondation livrée** (modèle en calques, rendu commun aperçu / export, opérations, versions, formats,
exports, retouches locales, API, tests). **Interface interactive de l'éditeur NON livrée** (voir
`reports/remaining-work.md`). Aucun second moteur publicitaire : l'Advertising Engine V2 produit directement le
document éditable.

## 1. Ce qui existait (examen du code)

- `src/lib/ads-v2/compose.ts` dessinait la création directement sur un canevas et ne gardait que le JPEG : aucune
  structure, donc rien de modifiable après coup.
- Bibliothèque (`assets`) : un fichier par création, avec `meta.adV2` (concept, texte, plateforme, format,
  mesures) ; aucune notion de calques ni de versions d'édition.
- Interface : l'onglet Publicités affiche des campagnes (textes) ; aucune édition visuelle.

## 2. Décision

La création devient un **document JSON en calques** (`AdDocument`, `src/lib/ad-doc/types.ts`), source de vérité ;
l'image (JPEG) n'est plus qu'un rendu de ce document. Le moteur V2 construit le document (`buildAdDocument`) puis
le rend avec le **même moteur de rendu** que l'éditeur (`renderDoc`), écrit sur l'API Canvas 2D commune au
navigateur et à `@napi-rs/canvas` : l'aperçu et l'export sont identiques (vérifié à l'octet près côté serveur).

```
Advertising Engine V2 ──► buildAdDocument ──► AdDocument (calques) ──► renderDoc ──► JPEG / PNG (bibliothèque)
                                                  │
                         éditeur (navigateur) ◄───┤  opérations (ops.ts) · annuler/rétablir (History)
                                                  │  retouches locales (local-edit.ts) · formats (reflow.ts)
                                                  ▼
                                  ad_documents (versions)  ── export PNG / JPEG / JSON (store.ts)
```

## 3. Modèle

- Calques : `image` (asset de la bibliothèque, ajustement couvrir / contenir, recadrage, arrondi, ombre, ombre de
  contact du produit), `text` (police, graisse, taille, couleur, alignement, interligne, espacement, capitales,
  ajustement automatique, ombre), `shape` (rectangle, ellipse, ligne ; couleur, dégradé, transparence, bordure,
  arrondi, ombre), `button` (libellé, remplissage, couleur, arrondi, bordure).
- Communs : position, taille, rotation, opacité, visibilité, verrou, ancrage (pour l'adaptation aux formats),
  `userEdited` (modifié à la main).
- Rôles : fond, image, produit, marque, titre, corps, bouton, logo, forme, décor, voile.
- Document : dimensions, zones de sécurité de la plateforme, format, identité de marque (palette, polices),
  provenance (moteur, client, retouche locale, IA).

## 4. Édition sans IA

`applyOp` (pur, sérialisable) : texte, image, recadrage, remplissage, couleur, police, déplacement,
redimensionnement, rotation, ajout, suppression, réordonnancement, masquage, verrouillage, duplication. Un calque
verrouillé refuse toute modification. `History` : annuler / rétablir (50 pas).

## 5. Préservation

- Chaque enregistrement crée une version (`ad_documents`) avec son rendu dans la bibliothèque.
- Restaurer recopie une ancienne version en nouvelle version (rien n'est perdu) ; dupliquer crée une nouvelle lignée.
- Le moteur V2 vérifie `userOwned` : une création modifiée par le client n'est jamais régénérée par-dessus.
- Changer de format crée une copie adaptée (`reflow`) : textes, couleurs, images et calques ajoutés sont conservés ;
  textes, bouton, logo et produit restent entiers dans la zone sûre.

## 6. IA en complément

`localAdEdit` exécute localement et gratuitement les demandes simples (taille ou couleur du titre, couleur du
bouton, position ou affichage du logo) en ne modifiant que les calques concernés. Une demande qui exige une
génération (nouvel arrière-plan, « version plus élégante ») est renvoyée comme demande payante à annoncer (via
l'Image Engine V2 ou l'Advertising Engine V2, sous le budget du client) : rien n'est lancé sans accord.

## 7. Qualité et sécurité

Après chaque modification : taille minimale, contraste réel du texte sur ce qui est dessiné dessous, zones de
sécurité, produit recouvert, affirmations non confirmées et règles des régies — signalés au client, jamais
bloquants pour lui. Les images d'un document ne peuvent venir que de la bibliothèque du projet. Document validé
(schéma) avant tout enregistrement ; aucune consigne d'IA ni clé dans le document.

## 8. API

- `GET /api/projects/[id]/ads/docs` : créations éditables du projet.
- `GET /api/projects/[id]/ads/docs/[docKey]` : document, versions, mesures, signalements ; `?export=png|jpeg|json`
  (et `&version=n`).
- `POST …/[docKey]` : `save`, `restore`, `duplicate`, `reflow` (plateforme, format), `edit` (langage naturel).

## 9. Reste à livrer (interface)

Composant `src/components/studio/ad-editor/` : canevas (même `renderDoc`, polices de marque en @font-face),
sélection, double-clic texte, glisser-déposer, poignées de taille et de rotation, alignements et repères, panneau
des calques (ordre, masquer, verrouiller), panneaux couleurs / dégradés / polices / formes / images (bibliothèque,
recadrage), annuler / rétablir, enregistrer, versions, exports ; interface tactile dédiée (téléphone et tablette :
barre d'outils basse, gestes, clavier mobile) ; bouton « Modifier » dans l'onglet Publicités ; captures ordinateur et
téléphone ; exécution confirmée des retouches payantes.
