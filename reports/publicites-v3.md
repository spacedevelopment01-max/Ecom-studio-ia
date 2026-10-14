# Moteur de publicités V3 — rapport

## 1. Ce qui n'allait pas (audit du code)

| Défaut visible | Cause dans le code |
|---|---|
| Produit découpé, posé sur un socle devant une photo floue | Le moteur d'images collait le produit détouré sur des décors vides de banques d'images ou générés vides (corrigé le 13/10 : `reference_scene`). |
| Mêmes compositions d'une publicité à l'autre | Le moteur de publicités n'utilisait que 5 structures fixes (`hero_left`, `split`, `full_bleed`, `hero_center`, `typographic`), tirées à tour de rôle. Sa bibliothèque d'une centaine de modèles n'était utilisée que dans un cas : 3 modèles « produit héros », quand aucune image n'existait. |
| Mêmes photos | Le brief d'image de chaque concept ne différait que par un sujet tronqué à 160 caractères. Aucune prise de vue propre au concept. |
| Rendu générique (photo + rectangle + titre + bouton) | Ni pictogrammes, ni petites capitales espacées, ni carte d'atouts, ni phrase manuscrite : le moteur de rendu ne savait pas les dessiner. |
| Aucun contrôle de répétition | Rien ne comparait les rendus d'une même campagne. |

Les compétences installées (skills) guident la rédaction et les briefs. Elles ne changent pas la composition : le
problème venait du moteur, pas des prompts.

## 2. Ce qui a changé

- **Direction artistique par publicité** (`src/lib/ads-v2/direction.ts`). Chaque angle reçoit son propre concept,
  jamais deux fois le même dans une campagne.
  - Produits : éditorial premium, packshot de studio, gros plan matière, mise en situation, atouts en rangée,
    signature centrée.
  - Services : réalisation, geste, prestations, proximité.
  - Chaque concept porte un objectif, une prise de vue (cadrage, lumière, décor, zone de texte) et ses mises en page.
- **Prise de vue transmise au modèle d'images** (`shot` dans le brief Image V2). Chaque concept a sa propre photo.
  Avec OpenAI ou Gemini, la photo du produit est envoyée en référence et le produit est reproduit à l'identique.
- **Six modèles éditoriaux** (lot M, d'après la planche SONORE) :
  - titre en tête et bouton pilule ;
  - rangée d'atouts à pictogrammes ;
  - carte d'atouts flottante ;
  - titre et phrase manuscrite ;
  - gros plan avec bouton en coin ;
  - titre centré.

  Dans tous ces modèles, le texte se place du côté calme de la photo et son encre suit le ton réel de l'image. La
  photo reste entière, et le logo de la marque signe la publicité.
- **Rendu** :
  - pictogrammes au trait (Tabler, licence MIT) dans les documents en calques, pour l'export comme pour l'éditeur ;
  - 3 polices libres (OFL) : Gloock, Italiana et l'écriture « Nothing You Could Do ». L'écriture manuscrite est
    réservée aux accents, jamais aux logos.
- **Diversité contrôlée sur les rendus réels** : une empreinte de chaque image finale est comparée aux autres
  publicités de la campagne, et toute quasi-copie est signalée.
- **Photos du client** (produit montré en situation) : une photo entière par concept, déclinée dans tous ses formats.
- **Rien d'inventé** :
  - les atouts viennent uniquement des faits confirmés du projet ;
  - la phrase manuscrite est la signature de la marque ;
  - un prix non confirmé n'apparaît jamais.
- **Contrôles conservés** : barrière qualité (FINAL / RETRY / PROVISIONAL / REJECTED), relecture IA de l'image
  exportée quand l'IA est active, plafonds de coût inchangés.

## 3. Essai réel sur SONORE (sans IA : aucune clé dans l'environnement de travail)

- **Parcours testé dans le navigateur** : onglet Publicités, « Créer des publicités », créations affichées,
  éditeur, puis export PNG.
  - Le fichier PNG exporté est en 1080 × 1920 natif.
  - L'éditeur montre les calques modifiables (logo, bouton, titre, surtitre, photo).
- **3 publicités, 3 concepts différents, chacune en 4:5, 1:1 et 9:16** :
  1. mise en situation, avec la phrase manuscrite « La technologie, sans détour. » ;
  2. signature centrée « Une idée à offrir : Casque audio » ;
  3. éditorial « Partout avec vous ».
- **Résultat** : trois mises en page et trois photos différentes, et aucune quasi-copie détectée. Coût IA : 0 €
  (moteur local).
- **Défauts trouvés en résolution native, puis corrigés** :
  - le logo recouvrait le titre en format story ;
  - le logo était sombre sur fond sombre ;
  - un titre commençait sans majuscule.

## 4. Ce qui reste (honnêtement)

- **Pas de photos générées par l'IA dans cet essai.** Le niveau de la planche SONORE (casque sur pierre, packshot
  en studio, gros plan, etc.) demande la génération d'images. Le code est prêt (`reference_scene` + prise de vue par
  concept), mais il n'a pas encore été essayé réellement :
  - soit en ajoutant `OPENAI_API_KEY` dans les secrets de l'environnement de travail ;
  - soit depuis le studio du propriétaire.
- **Série de 12 non réalisable ici.**
  - Le forfait limite une campagne à 6 publicités.
  - SONORE n'a que 3 angles possibles : aucun fait confirmé, aucune objection renseignée.
  - Il n'y a que 3 photos du client.
  - Avec l'IA (textes et images), chaque concept aurait sa propre photo générée.
- **Textes locaux parfois décalés de l'image** (« au bureau » sur une photo de plage) : la rédaction sans IA ne voit
  pas la photo. Avec l'IA, la rédaction et la relecture de l'image exportée corrigent ce cas.
- **Polices** : les titres utilisent les polices de la marque (cohérence). Le sérif élégant de la référence
  n'apparaît que si la marque a un sérif.
