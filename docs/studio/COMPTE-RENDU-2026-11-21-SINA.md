# Compte rendu du 21 novembre 2026 : modifications de SINA (logos, images, relecteur, présentation)

Pour la conversation principale. Branche `claude/lot-4-site-b5qjsw`, tout est enregistré et envoyé. Rien n'est fusionné.
Lire aussi : `docs/studio/CONSTRUIRE-SINA-DE-A-A-Z.md` et `docs/studio/SINA-PLUSIEURS-PALIERS.md` (recherches du jour).

## 1. Décisions du propriétaire (ses mots, valables pour toujours)

- **Logo, aucune consigne de style** : « pas de consigne autre que les 50 logos en exemple et simplement en exemple ».
  Avant cela : « j'ai pas demandé des logos illustrés » et « ça dépend des projets ».
- **Logo, une seule exception** (accordée, « Ok ») : le dessinateur reçoit la phrase de refus du client, mot pour mot
  (« Il ne veut surtout pas : … »), et rien d'autre de ses mots (« enlève la 7 » reste valable pour le reste).
- **Logo en série** : le 1er sans modèle, le 2e reçoit le 1er, le 3e les deux premiers, avec « je veux un logo
  complètement différent » ; le trait près du nom avec parcimonie, un seul par série.
- **Consignes de base des photos** : acceptées (« Ok ») ; « les consignes de base doivent être claires ».
- **Présentation des identités** : une carte classe et courte par identité, la planche complète derrière « Voir le
  détail » (« Oui »).
- **Qualité** : « on ne peut pas livrer ce genre de résultat pour les clients » ; « le problème principal c'est la qualité
  des résultats à la sortie ».
- **Rappel de sa référence** (`LE-STUDIO-DE-A-A-Z.md`) que j'avais trahi dans un plan, et qu'il a corrigé : le client
  arrive avec presque rien (quelques réponses, ses photos s'il en a, un lien s'il en a un) ; SINA pose ses questions
  **quand elle en a besoin, à n'importe quelle étape** (décision du 14 novembre), pas toutes au début.
- **Non tranché** : la question « le relecteur des logos ne refuse-t-il que les vrais défauts et laisse-t-il le goût au
  client ? » a reçu « Non mais là faut tout revoir » ; ne pas la considérer comme acceptée.

## 2. Ce qui est modifié dans le code (avec essais automatiques)

1. **Consigne du logo** (`brand-images.ts`, `imagePrompt`) : le nom épelé, le métier, « La marque : » (idée et ton
   écrits par la directrice artistique, sans la lumière ni les matières des photos), les couleurs, la typographie, le fond
   blanc, la phrase de refus du client mot pour mot (`clientRefusal`), et la planche des 50 logos aimés jointe comme
   image annoncée « exemples de logos que j'aime, seulement comme exemples : n'en recopie aucun » (rôle `examples` dans
   `media-providers.ts`). Retirés : la phrase de niveau « expressif », la liste des signes interdits.
2. **La consigne écrite par SINA ne va plus jamais au dessinateur du logo** : logo refait seul (`brand-chain.ts`, fiche
   sans la consigne) et logo refait après le choix (`brand-finish.ts`, `logoLine`). Le relecteur reçoit seulement les
   mots cités du client (`clientWords`). Cause : SINA écrivait « logotype sobre, lettres à empattements, un fil à
   plomb » et neuf signes interdits, qui passaient par la direction artistique.
3. **Redessin** : une image refusée est redessinée avec toutes les raisons de ses refus (`fixLine`), jamais une raison
   technique (« je n'ai pas pu la vérifier »).
4. **Relecteur des images** : le modèle le plus fort au niveau de réflexion élevé, une image à la fois, il décrit
   d'abord ce qu'il voit zone par zone, il cherche une liste de défauts (taches, texte flou, zone vide, arche ou vignette
   ronde, objet vierge ou qui flotte, bouton coupé, ce que le client refuse) et note l'image sur 10 face à une campagne
   haut de gamme : seule une note de 8 ou plus est montrée (`NOTE_MIN`). Le devis compte une relecture par image.
   Essai réel sur les 6 images de la marque finie d'Aplomb : il a refusé les 4 ratées pour les bonnes raisons et vu la
   goutte refusée sur le logo des 2 autres ; environ 3 centimes par image.
5. **Consignes de base des photos**, dites en positif : bord à bord sans vignette (`BORD_A_BORD`), écran du site rempli
   jusqu'en bas (`SITE_REMPLI`), texte net sur une zone calme sans vapeur (`TEXTE_NET`), aucun objet vierge sans rôle
   (`OBJETS_UTILES`).
6. **Jamais une planche incomplète** : un haut de site ou une grande scène refaits et refusés gardent ceux d'avant
   (`siteGarde`), noté pour être refait au choix.
7. **Nouvelle présentation des identités** (`brand-boards.tsx`, `IdentityCard`) : grande photo avec le nom, logo, haut
   du site, couleurs, une phrase pour l'idée, le nom, l'adresse libre, « Choisir », « Voir le détail », et une ligne
   « Dès ton choix : l'objet, les signes, les trois publications ». Vérifiée en captures dans le Studio d'essai.
8. Règles notées dans `CLAUDE.md` et `docs/sina-savoir/logos-aimes.md`.

Essais : la série complète est passée (5 705 essais) après le point 5 ; le point 2 (marque finie) n'a été vérifié que
sur les fichiers d'essai concernés (72 essais). Lancer la série complète avant toute fusion.

## 3. Problèmes trouvés et PAS encore réglés

1. **Panne de transparence (la plus importante)** : quand une image est créée avec une image jointe (le logo), OpenAI la
   rend en partie transparente. Selon le fond : taches sombres ou brume blanche, bords flous, « vignettes ». 16 images
   touchées depuis le 16 novembre, prises jusqu'ici pour des défauts de dessin. Remède documenté par OpenAI : envoyer le
   réglage de fond plein (`background: "opaque"`) pour toute photo ; et un contrôle gratuit qui refuse une photo
   transparente avant de payer la relecture. Pas encore fait.
2. **Le petit modèle d'images** : le Studio utilise `gpt-image-2.6-flare` ; le guide officiel d'OpenAI recommande
   `gpt-image-2.6-sunburst` pour le détail, la mise en page et la retouche. Prix à vérifier sur un essai. Pas changé.
3. **L'ordre de travail gaspille** : les images qui portent le logo sont dessinées avant que le logo soit relu ; s'il est
   refusé, elles sont jetées et refaites. Pas changé.
4. **Le texte écrit par OpenAI dans les images** : cause de nombreux refus ; les meilleurs systèmes font l'image sans
   texte et posent le texte par une mise en page (comme Canva). Pas fait.
5. **Personne ne juge l'idée d'une publication avant de payer le dessin** (exemple : une publication d'escalier pour
   un plombier, incompréhensible pour un inconnu). Pas fait.
6. **Une IA juge la beauté presque au hasard** (accord de 0,55 avec des designers quand le hasard donne 0,50, étude
   TASTE 2026) : le relecteur peut écarter les défauts mesurables, pas décider seul du goût.
7. **Les réponses de SINA coûtent cher** : 0,53 € pour une seule réponse au choix de l'identité.

## 3 bis. Réglé ensuite (branche `claude/evolution-sina`, sans dépense, vérifié par les essais automatiques)

- **Panne de transparence (point 1)** : toute photo est demandée à OpenAI en fond plein (`openaiBackground`,
  `src/lib/ai/openai-images.ts`), y compris quand elle est créée avec des images jointes ; seul un logo garde un fond
  retirable. Un contrôle sans IA (`photoTransparente`, `brand-images.ts`) refuse une photo de planche dont plus d'un
  pixel sur mille n'est pas plein, AVANT de payer sa relecture ; elle est refaite. Pas encore vérifié avec la vraie IA.
- **Ordre de travail (point 3)** : dans `runBoardImages`, le logo est dessiné, relu, refait s'il le faut et gardé
  AVANT de dessiner la maquette du site, l'objet, les signes et les publications. Rien n'est plus jeté ni repayé parce
  que le logo a été refusé ensuite, et aucune image ne porte un logo refusé.

## 3 ter. Le socle (accord du propriétaire : « Oui » ; branche `claude/evolution-sina`, sans dépense)

- **La fiche du client** (`src/lib/syna-agent/fiche.ts`) : une seule façon de noter ce qu'il dit (`start.note`, à toute
  étape) : ses mots exacts, la date, le genre (fait, goût, refus) et la portée (tout, marque, logo, images, site,
  publications, publicités), avec ses réponses de départ, ses choix, ses mots corrigés et ce qu'il garde. L'ancien outil de
  mémoire est retiré (ses anciennes notes restent lues). SINA relit la fiche entière à chaque pas après les questions de
  départ ; la chaîne de la marque et l'écoute des acheteurs la reçoivent entière ; un refus pour le logo arrive au
  dessinateur mot pour mot et au relecteur. Le client la voit dans son tableau de bord (« Ce que SINA sait de toi ») et
  corrige ou efface une ligne.
- **Les étapes verrouillées** (`verrous.ts`) : le Studio pose le verrou après une validation confirmée par le parcours
  relu (identité, marque, angle, site, publications) ; un outil qui referait une partie verrouillée est refusé avant le
  devis et la carte d'accord ; `etape.rouvrir` ne rouvre que si le client vient de le demander par écrit (ses mots
  gardés). Les retouches demandées en cliquant restent permises.
- **Le banc d'épreuves** (`tests/epreuves/catalogue.ts`, `tests/epreuves.test.ts`, `npm run epreuves`) : 17 épreuves
  tirées de ses verdicts (15 rejouées gratuitement, dont 8 dans la vraie chaîne des images avec un faux dessinateur et un
  faux relecteur ; 2 payantes listées avec leur prix, non lancées). Chaque épreuve est scellée (`sceaux.json`) : un
  verdict réécrit ou retiré fait échouer le banc. Vérifié : casser exprès le contrôle de transparence fait échouer son
  épreuve.
- Pas encore vérifié avec la vraie IA.

## 3 quater. Reprendre une création coupée sans repayer (point 2 du chef d'orchestre ; sans dépense)

- Ce qui existait déjà : chaque appel payant (texte, recherche, image, vidéo) est enregistré avec sa réponse ; une même
  demande dans la même tâche est rendue sans être repayée ; un appel au résultat incertain n'est jamais renvoyé tout
  seul ; une tâche coupée par une panne du travailleur reprend à son dernier point d'étape. Le site (`site.create`) et
  l'accueil dessiné (`site.dessiner`) savaient déjà relancer une création arrêtée en route (`relancer:true`).
- Ce qui manquait : la marque. Une création de marque arrêtée (en échec, ou arrêtée par « Arrêter ») repartait de zéro
  et repayait tout (reprise d'Aplomb : 2,04 € payés, rien de gardé).
- Ajouté : `identity.propose` et `brand.finish` acceptent `relancer:true` (`tools/identity.ts`, `marqueCoupee`) : la
  même tâche repart, l'étude, l'idée, les noms et les images déjà faits sont repris ; la carte montre le prix de ce qui
  reste ; SINA est prévenue quand la création s'arrête. Essai : `tests/sina-chaine-marque.test.ts` ; épreuve
  `creation-coupee-reprise-sans-repayer`.

## 4. Projet d'essai du plombier (client inventé, Studio d'essai)

- Identités : A « Aplomb », B « Faïence », C « Cuivre ». Le propriétaire a choisi **Aplomb**.
- Logo d'Aplomb : une maison avec une goutte, gardé par l'ancien relecteur alors que le client refuse la goutte.
- Marque finie : faite une fois ; jugée ratée sur 4 images sur 6 (tache et texte flou, carton vide, ombre ronde, écran
  à moitié vide). La reprise (nouveau logo et 6 images) a été **arrêtée par Claude en cours de route** à la demande du
  propriétaire (« arrêter de dépenser ») : 2,04 € dépensés, rien de gardé ; la plupart des refus venaient de la panne de
  transparence.
- Dépense totale du projet : **20,06 €** (budget de départ 15 €, relevé avec son accord à chaque étape). Le Studio
  d'essai est arrêté ; rien ne tourne.

## 5. Où on en est avec le propriétaire

- Il veut SINA « plusieurs caps au-dessus », reconstruite s'il le faut, en suivant **sa** référence
  (`LE-STUDIO-DE-A-A-Z.md`, parcours en 9 étapes et niveau attendu) et ses décisions déjà prises. Il refuse les plans
  génériques et les avis : il veut des résultats tirés de vraies recherches.
- Recherches faites (onze, avec sources et niveaux de preuve) : `CONSTRUIRE-SINA-DE-A-A-Z.md` et
  `SINA-PLUSIEURS-PALIERS.md`. Constats principaux : découper (plan, exécution par morceaux, contrôle extérieur) ; un
  contrôle extérieur sur le vrai rendu fait monter la qualité (26 % à 52 % de fonctions qui marchent sur un site) ;
  celui qui fait ne juge pas ; plusieurs agents qui s'enchaînent font perdre 39 à 70 % ; une fiche relue en entier
  évite la perte de 39 % due à l'information donnée par morceaux ; plusieurs versions valent mieux que des retouches
  d'une seule ; épreuves tirées des vrais échecs rejouées avant chaque changement.
- Dernière proposition faite, **non encore validée** : garder son parcours en 9 étapes et appliquer à chaque étape ce
  que les sources montrent (fiche relue en entier, beaucoup de noms puis tri, logo en grande version d'OpenAI et en
  plusieurs versions, photos pleines, texte posé par le Studio, angles sur des situations d'achat différentes, site par le
  plan puis contrôlé sur captures, publications composées comme dans Canva avec un test de compréhension par un inconnu,
  un juge appris sur ses verdicts, ses refus rejoués comme épreuves).
- Règles à tenir : aucune dépense sans son accord écrit et le prix avant ; montrer chaque image tout de suite, même
  refusée ; ne rien ajouter aux consignes de SINA en dehors de ses décisions ; ne jamais reposer une question déjà
  répondue.
