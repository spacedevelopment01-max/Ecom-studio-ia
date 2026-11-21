# Les images avec OpenAI : ce que disent le guide officiel, la recherche et les mesures du Studio (21 novembre 2026)

## 1. Le guide officiel d'OpenAI sur ses modèles d'images
Source : https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide (lu le 21 novembre 2026).

- **Deux modèles** : « GPT-Image-2.6 Flare is the smaller model for workflows where speed matters most. GPT-Image-2.6
  Sunburst is the base model for workflows that need more detail or precise edits. » Et : « Start with GPT-Image-2.6
  Sunburst if the image must meet demanding requirements for detail, layout, or edit accuracy. » Le Studio utilise Flare
  (réglage `syna.mockup.image_route`, défaut `openai:gpt-image-2.6-flare` dans `brand-images.ts`). Les deux ont la même
  borne de prix dans `src/lib/ai/config.ts` (0,12 $ par image) : à vérifier sur un vrai essai.
- **Réglages** :
  - `complexity` : « Controls how much the model plans before rendering. Choose low, medium, or high. Both Sunburst and
    Flare use high when you omit the field. »
  - `background` : « Use auto, opaque, or transparent. For transparent PNG or WebP, check the decoded alpha channel. »
    Le Studio n'envoie aucun réglage de fond en mode retouche (images jointes) : c'est la cause de la panne de
    transparence (partie 3).
  - `output_format` : png, jpeg, webp ; les générations acceptent aussi **svg** (logo vectoriel, avec fond transparent :
    « For a logo you can scale or recolor by editing its paths […] Set output_format="svg" ») et gif.
  - `markup` : retouche guidée ; on envoie une couche transparente où l'on a entouré la zone à changer (« Draw a circle
    around the object you want to change, then describe the change in the prompt »). La couche ne vaut que pour la
    première image ; les autres images jointes restent des références ; pas de masque avec `markup`.
  - `n` : plusieurs versions en une demande (« Increase n if you want more raster variations »).
- **Écrire la demande** :
  - « Define the result. Name the subject and intended use, such as a product photograph, advertisement, or diagram.
    Specify the composition, aspect ratio, and important placement constraints. For complex requests, organize the prompt
    as scene, subject, details, and constraints, using labeled sections. »
  - « Describe visible details. Name materials, lighting, colors, and the visual medium. Request "photorealistic" or
    "real photograph" explicitly when that is the goal. »
  - « Specify exact text. Put required wording in quotes and describe its position and typography. Spell unusual words
    or brand names letter by letter when needed. Ask for no extra text, then check spelling and legibility. »
  - « Separate changes from constraints. For edits, say "change only X" and list the details to preserve. »
  - « Assign roles to references. Identify each input by number and purpose. »
  - « Iterate deliberately. Pass the previous output as the next edit input, request one change, and repeat the
    details to preserve. »
  - Pour passer d'un modèle à l'autre : garder une base de cas (« difficult edits, exact text, product geometry, and
    transparent assets »), changer un réglage à la fois, mesurer « cost per accepted image ».

## 2. Ce que la recherche et les produits disent des images
- Les meilleurs systèmes de création graphique font l'image **sans texte** puis posent le texte par une mise en page :
  COLE (Microsoft, https://arxiv.org/pdf/2311.16974), OpenCOLE, Canva (calques modifiables), Lovart. Une affiche faite d'un
  seul coup par GPT-4o « séduit au premier regard mais transmet mal le contenu » : 39,9 % au questionnaire sur son contenu
  (PosterAgent, NeurIPS 2025, https://arxiv.org/abs/2505.21497). Les designers préféraient pourtant DALL·E 3 pour la
  beauté face à COLE : la mise en page séparée gagne sur le message, pas forcément sur la beauté.
- Le texte dans les images reste un point faible des produits (Lovart, Pomelli).
- Une IA juge la beauté presque au hasard : 0,55 d'accord avec dix designers, le hasard donne 0,50 ; un petit juge
  entraîné sur leurs avis atteint 0,611 (TASTE 2026, https://arxiv.org/abs/2605.20731).
- Plusieurs versions en parallèle valent mieux que des retouches successives d'une seule (Dow et al. 2010).
- Une image d'IA « bizarre » : 42 % des gens jugent mal la marque, 40 % voient bien une IA soignée (DoubleVerify, 22 000
  personnes).
- Google ne promet pas la fidélité du produit dans les scènes de Pomelli : comparer chaque image à la photo du client.
- Traitement différé d'OpenAI à 50 % moins cher, images acceptées pour certains modèles (gpt-image-1, 1.5, mini) ; non
  vérifié pour la version 2.6.
- Outils de logo : Recraft (seul à sortir du vrai vectoriel parmi les grands modèles d'avant 2.6), Ideogram (texte dans
  les logos) ; la règle du propriétaire impose OpenAI pour les logos, et OpenAI sort désormais du vectoriel.

## 3. Mesures faites dans le Studio d'essai le 21 novembre 2026
- **Panne de transparence** : sur 96 images de planche relevées depuis le 15 novembre, 16 avaient des zones
  transparentes (au moins 1 % des points), toutes créées avec des images jointes (logo), le 16 et le 21 novembre. Selon
  le fond d'affichage : taches sombres ou brume blanche, bords flous, « vignettes ». Les refus du relecteur sur ces
  images (« bords abîmés », « blocs de pixels », « vignette ronde », « brume ») venaient de là, pas du dessin.
- **Relecteur** : jugeant six images d'un coup avec un modèle moyen, il les gardait toutes ; refait (modèle le plus fort,
  réflexion élevée, une image à la fois, liste de défauts, note de 8 sur 10 au moins), il a refusé les quatre images
  ratées pour les bonnes raisons, pour environ 3 centimes par image.
- **Ordre de travail** : les images qui portent le logo sont dessinées avant que le logo soit relu ; quand le logo est
  refusé, elles sont jetées et refaites (reprise d'Aplomb : 13 images dessinées pour 2,04 €, rien de gardé).
- **Logo du plombier** : laissé libre, OpenAI dessine presque toujours une maison et une goutte pour « plombier » ;
  13 des 20 logos refusés l'ont été pour une goutte ou une personne. Avec la phrase de refus du client mot pour mot, la
  goutte a disparu au premier essai suivant.
