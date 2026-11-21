# Compte rendu des recherches sur l'amélioration de SINA, et ce qu'il faut mettre en place (21 novembre 2026)

Demande du propriétaire : faire passer SINA « plusieurs caps au-dessus », la reconstruire s'il le faut, en suivant sa
référence (`LE-STUDIO-DE-A-A-Z.md` : parcours en 9 étapes, niveau attendu) et ses décisions déjà prises, avec des
résultats tirés de vraies recherches, pas des avis. Onze recherches faites (plus de 400 sources lues) ; le détail, les
liens et le niveau de preuve de chaque point sont dans `docs/studio/CONSTRUIRE-SINA-DE-A-A-Z.md` et
`docs/studio/SINA-PLUSIEURS-PALIERS.md` (branche `claude/lot-4-site-b5qjsw`). Rien de ce plan n'est encore construit.

Rappels de la référence à ne pas trahir : le client arrive avec presque rien (quelques réponses, ses photos s'il en a,
un lien s'il en a un) ; SINA pose ses questions quand elle en a besoin, à n'importe quelle étape, une à la fois, jamais
deux fois la même ; ce qu'elle peut trouver seule, elle le trouve et le propose ; rien de payant avant le résumé complet
validé ; celle qui fait ne juge pas ; rien n'est montré sans être relu.

## 1. Ce que disent les recherches

### Ce qui existe
- Aucun produit ne fait toute la chaîne de SINA avec de bons résultats (une vingtaine étudiés : Durable, Google Pomelli,
  Lovart, Manus, Genspark, Sintra, Wix, Shopify, HubSpot, Typeface, Looka, Canva, Framer, Relume, AdCreative…). Chacun
  fait un morceau. Aucune source ne parle d'angles marketing produits automatiquement.
- Défauts constatés partout : peu d'information donne un résultat générique, mais plus d'information ne sauve pas une
  chaîne fragile (Wix Harmony) ; une bibliothèque commune fait des résultats qui se ressemblent (Looka, 10Web) ; les
  pièces assemblées donnent des pages propres mais standard, le code libre des pages cassées ; l'IA invente (faux
  témoignages chez Durable, Air Canada condamné pour son agent) ; le texte dans les images reste un point faible ; les
  plaintes sur l'argent (crédits brûlés sur les échecs) dépassent souvent celles sur la qualité.
- Seul Shopify publie sa façon de vérifier : juges réglés sur des experts (accord de 0,02 à 0,61, contre 0,69 entre
  deux experts), conversations réelles rejouées avant chaque mise en ligne.

### Ce que la recherche a mesuré
- Découper bat tout faire d'un coup : plan, exécution par morceaux, contrôle (affiches, bannières, sites ; plusieurs
  équipes indépendantes).
- Un contrôle extérieur sur le vrai rendu fait monter la qualité : un site passe de 26 % à 52 % de fonctions qui
  marchent (WebGen-Agent). Sans retour extérieur, l'IA ne se corrige pas et se dégrade parfois (ICLR 2024).
- Une IA juge la beauté presque au hasard : 0,55 d'accord avec dix designers quand le hasard donne 0,50 ; un petit juge
  entraîné sur leurs avis monte à 0,61 (TASTE 2026). Une IA préfère ses propres textes.
- Plusieurs versions en parallèle valent mieux que des retouches successives d'une seule (Stanford 2010). Les goûts se
  construisent devant des options ; quelques réactions à des images suffisent à guider la création (ViPer, ECCV 2024).
- Plusieurs agents qui s'enchaînent font perdre 39 à 70 %, erreurs multipliées par 17 quand ils ne partagent pas tout
  (Google, 180 configurations). Un agent seul bien consigné égale presque une discussion entre agents.
- Une information donnée par morceaux fait perdre 39 % (ICLR 2026) ; la redonner en un bloc rétablit le niveau. Les
  questions choisies pour lever le plus de doute font gagner 38 % ; posées sans méthode, elles dégradent.
- L'IA uniformise : chaque création est meilleure, l'ensemble plus semblable (Science Advances 2024, PNAS Nexus).
- Les clients simulés ne remplacent pas de vrais clients pour juger des visuels ; ils servent seulement à vérifier qu'un
  texte se comprend.

### Comment les équipes qui ont réussi construisent leurs agents
(Manus, Anthropic, Cognition, OpenAI, Shopify, Replit, Lovable, Vercel, Cursor, Notion)
1. Un seul agent principal, simple ; une pièce n'est ajoutée que si une mesure la justifie (Lovable a supprimé presque
   tout le code de son agent au profit d'une chaîne prévisible).
2. Moins de 20 outils, bien distincts (Shopify : au-delà de 50, « plusieurs façons de faire la même chose »).
3. Des consignes courtes, « une carte, pas un manuel de 1 000 pages » (OpenAI) ; de courts rappels au moment où ils
   servent, trois ou quatre au plus (Replit : 90 % de coût en moins).
4. Un registre des tâches dans un fichier, chaque tâche cochée seulement après une vraie vérification (Anthropic, Manus).
5. Celui qui fait ne juge pas : « les agents surnotent leur propre travail » ; un évaluateur séparé et sceptique.
6. Vérifier le résultat réel, pas ce que l'agent affirme (tests dans un vrai navigateur).
7. 20 à 50 cas tirés des vrais échecs, rejoués avant chaque changement ; non-régression presque à 100 %.
8. Le cadre revu à chaque nouveau modèle. Briques : chaque appel payant enregistré (reprise sans repayer), accord humain
   comme pause durable, cache (prix divisé par 10), traitement différé (moitié prix), plafond par travail.

### Images d'OpenAI (guide officiel et recherche)
- Le Studio utilise la petite version (`gpt-image-2.6-flare`) ; le guide recommande `gpt-image-2.6-sunburst` pour le
  détail, la mise en page et la retouche.
- Un réglage « fond plein » existe et n'est pas envoyé : c'est la panne qui rend les photos en partie transparentes
  (brume, taches, vignettes ; 16 images touchées depuis le 16 novembre).
- Plusieurs versions en une demande ; logo en vrai fichier vectoriel ; retouche guidée (on entoure la zone ratée) ;
  demande écrite dans l'ordre scène, sujet, détails, contraintes, images jointes numérotées, texte exact entre
  guillemets.
- Les meilleurs systèmes (COLE, PosterAgent, Canva, Lovart) font l'image sans texte et posent le texte par une mise en
  page : une affiche faite d'un seul coup « séduit mais transmet mal le message ».

### Par domaine (détail dans `SINA-PLUSIEURS-PALIERS.md`)
- Conversation : recommander avec une raison en une phrase et des images ; ne pas flatter le client ; prendre les devants
  aux pauses (52 % d'acceptation en fin d'étape, 62 % de refus en pleine tâche) ; le client voit et corrige ce que SINA
  retient de lui.
- Marque et textes : positionnement d'abord (April Dunford, « le seul ») ; 150 à 300 pistes de noms puis tri (méthode de
  l'agence de BlackBerry) ; angles construits sur des situations d'achat différentes ; les sept défauts de l'écriture
  d'IA relevés par 18 écrivains ; le concret et les mots réels des acheteurs.
- Site : le plan d'abord (rôle de chaque section), puis le thème ; une image dessinée ne se recopie en code que dans
  49 % des cas, elle sert de direction artistique ; relecture sur captures critère par critère ; contrôles par le code ;
  faux avis interdits par la loi française.
- Publications et publicités : calendrier sur des temps forts ; test de l'inconnu ; trois idées vraiment différentes ;
  pièces détachées pour les plateformes ; le point du mois montre le travail fait (Harvard : la valeur perçue monte à
  résultat égal).

## 2. Ce qu'il faut mettre en place

### Le socle, pour toutes les étapes
1. **Une fiche client** (ses mots exacts, refus, choix, avec date et portée), complétée à chaque réponse et relue en
   entier avant chaque création ; le client la voit et la corrige.
2. **Un registre d'étapes** : chaque étape validée est verrouillée et ne se rouvre que sur demande.
3. **Chaque appel payant enregistré** pour reprendre après une panne sans repayer ; l'accord du client comme une pause.
4. **Des épreuves tirées des vrais échecs** et des verdicts du propriétaire, rejouées avant chaque changement ; une étape
   réussie qui recule bloque le changement.
5. **Une seule source par règle** ; plus aucune consigne ajoutée hors des décisions du propriétaire, ni par SINA ni par
   Claude.
6. **SINA simplifiée** : un agent principal qui parle au client, moins de 20 outils, des consignes courtes ; les créations
   passent par des chaînes fixes (plan, puis morceaux, puis contrôle sur le vrai rendu, puis un juge séparé).
7. **Les juges** : le code vérifie tout ce qui se mesure ; un juge appris sur les verdicts du propriétaire écarte ce qui
   est sûrement raté, son accord avec lui est mesuré avant de lui faire confiance ; le goût final revient au client qui
   choisit parmi plusieurs versions (il choisit déjà l'identité et l'angle).
8. **Les coûts** : cache, traitement différé pour ce qui peut attendre, deux reprises au plus puis SINA montre, coût par
   travail accepté suivi.

### Étape par étape (son parcours)
1. **Faire connaissance** : SINA étudie seule le marché, les concurrents et ce que disent les acheteurs du métier dans
   les avis ; elle demande ce que seul le client sait, quand elle en a besoin ; tout va dans la fiche ; résumé validé
   avant toute dépense.
2. **La marque** : beaucoup de noms puis un tri sévère ; logo par la grande version d'OpenAI, en plusieurs versions, en
   vrai fichier net ; photos pleines ; texte des planches posé par le Studio.
3. **Les angles** : trois situations d'achat vraiment différentes ; un juge doit retrouver quel client va avec quel texte.
4. **L'activité** : sans changement.
5. **Le site** : le rôle de chaque section d'abord, puis le thème ; contrôle sur captures téléphone et ordinateur ; boutons,
   vides, doublons contrôlés par le code.
6. **La mise en ligne** : sans changement.
7. **La communication** : photo par OpenAI sans texte, publication composée par le Studio (titre dans les polices de la
   marque, formes, logo) ; l'idée de chaque publication jugée avant le dessin ; test de compréhension par un inconnu.
8. **La publicité** : la même composition, trois idées différentes, une par angle.
9. **Dans la durée** : chaque échec devient une épreuve ; le point du mois montre le travail fait.

### Ordre des travaux proposé
1. Le socle (fiche, registre, reprise sans repayer, épreuves) : gratuit.
2. Les réparations d'images : fond plein et contrôle gratuit de transparence (gratuit) ; essai de la grande version
   d'OpenAI et de plusieurs versions à la fois (environ 1 €) ; le logo relu avant les images qui le portent (gratuit).
3. Les juges refaits et réglés sur les verdicts du propriétaire (quelques euros, prix annoncé avant).
4. Les chaînes refaites, étape par étape de son parcours.
5. Un essai réel sur trois clients inventés, budget fixé avec lui avant.

### À faire valider par le propriétaire
- Le plan lui-même (non encore validé).
- Le texte des publications posé par le Studio sur une photo d'OpenAI (sa règle : images créées par OpenAI, obligatoire
  pour les publications ; la photo reste d'OpenAI, seule la pose du texte change).
- L'essai de la grande version d'OpenAI (environ 1 €).
- La place du goût dans le relecteur des logos (question posée, non tranchée).
