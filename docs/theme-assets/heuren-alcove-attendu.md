# HEUREN et ALCÔVE — lot de médias attendu (issue #155)

> **Mise à jour du 21 octobre 2026 : lot reçu et intégré.** Branche `assets/heuren-alcove-20261021`, commit `370c28f6`,
> 32 fichiers conformes au manifeste. La scène sur pierre noire est `heuren/ambiance-07.webp` (version corrigée,
> bracelet fermé) ; l'ancienne version n'est pas dans le lot. Le logo HEUREN est livré sur fond blanc chaud (non
> transparent). Détail dans `docs/LISEZMOI-heuren-alcove-155.md`. Le texte ci-dessous est la demande d'origine.

État au 20 octobre 2026 : **aucun média HEUREN ni ALCÔVE n'est présent dans le dépôt.** Toutes les branches distantes
ont été parcourues : seules d'anciennes photos Pixabay de montre et de fauteuil existent (ARVEN, essais Qwen), et elles
sont exclues par l'issue (pas de banque d'images, pas de substitution). Rien n'est donc intégré pour l'instant.

Les deux thèmes seront des thèmes **mono-produit de la famille E-commerce** (un seul produit par démo, plusieurs vues du
même produit, aucun catalogue inventé). Ils ne sont pas classés en « Boutique spécialisée ».

## Fichiers attendus (32 au total)

Même organisation que les kits SILLON, NOCTIL et TRAVERSE : une branche `assets/heuren-alcove-AAAAMMJJ` qui ne contient
que les médias et leur manifeste, reprise ensuite par cherry-pick.

| Dossier | Fichier | Contenu attendu |
|---|---|---|
| `public/theme-assets/heuren/` | `logo.webp` | logo HEUREN existant (fond transparent si possible) |
| | `produit-01.webp` | **image principale existante** : la montre entière, cadran bleu nuit soleillé, nom HEUREN lisible, bracelet complet |
| | `produit-02.webp` à `produit-05.webp` | 4 autres vues du même produit (profil, dos, boucle, détail du cadran…) |
| | `ambiance-01.webp` à `ambiance-10.webp` | 10 scènes d'ambiance distinctes |
| `public/theme-assets/alcove/` | `logo.webp` | logo ALCÔVE existant |
| | `produit-01.webp` | **image principale existante** : le fauteuil entier, terracotta, quatre pieds en bois visibles |
| | `produit-02.webp` à `produit-05.webp` | 4 autres vues du même fauteuil (profil, dos, assise, détail du tissu…) |
| | `ambiance-01.webp` à `ambiance-10.webp` | 10 scènes d'ambiance distinctes |
| `docs/theme-assets/` | `heuren-alcove-manifest.json` | pour chaque fichier : nom d'origine, dimensions, poids, empreinte SHA-256 et **une phrase qui décrit la scène** |

## Correction HEUREN obligatoire

- L'ambiance **sur pierre noire brillante au coucher du soleil** doit être la **dernière version**, bracelet fermé en
  boucle continue.
- L'ancienne version (morceau beige qui dépasse à droite) est **rejetée** : elle ne doit pas figurer dans le lot. Si
  elle y est malgré tout, le manifeste doit la marquer « rejetée » ; elle restera alors hors démo, hors galerie et hors
  exports, avec un test qui le vérifie (comme TRAVERSE ambiance-04).

## Contrôles prévus dès réception

- Chaque fichier décodé, non vide, dimensions et empreintes conformes au manifeste.
- Vérification visuelle de chaque image : produit entier dans l'image principale, aucune personne ni main, aucune
  marque externe, nom HEUREN présent sur le cadran, forme et couleur du fauteuil ALCÔVE conservées.
- Matrice fichier → thème → page / section, sans même image dans deux sections qui se suivent.
