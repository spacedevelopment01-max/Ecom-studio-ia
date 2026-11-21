# Organisation du travail sur SINA (décidée le 21 novembre 2026)

Document du chef d'orchestre. Il garde l'organisation, l'état de chaque chantier, les décisions du propriétaire et les
erreurs à ne jamais refaire. Il est relu au début de chaque séance et tenu à jour.

## 1. Ce que le propriétaire a demandé (ses mots)

« Réorganise correctement le travail, je veux une conversation par étape de SINA et je veux une conversation où SINA
évolue de son côté. Je veux aussi une conversation où SINA fait les tests complets. » Puis : « je veux que tu fasses le
nécessaire pour qu'une nouvelle conversation chef d'orchestre existe car cette conversation est longue et tu vas tout
oublier ».

## 2. Les conversations

1. **Le chef d'orchestre** (une conversation). Il ne modifie pas SINA. Il écrit les consignes de chaque conversation
   (les décisions du propriétaire et la partie des recherches qui la concerne), les crée, suit leur travail, vérifie que
   rien ne contredit ses décisions avant que ça lui arrive, et tient ce document à jour. Il n'ajoute rien que le
   propriétaire n'a pas demandé.
2. **« SINA évolue »** : la conversation « Évolution de SINA » qui existe déjà (identifiant `session_01HSEvRxGgpCiaV16N8SC8b3`,
   branche `claude/evolution-sina`). Elle fait ce qui sert à toutes les étapes : le socle (fiche du client, étapes
   verrouillées, épreuves), SINA simplifiée, les juges, les coûts, les règles communes des textes et des images. C'est
   elle qui rassemble le travail des autres dans la version commune (`claude/evolution-sina`).
3. **Une conversation par étape du parcours** (référence, partie 5) : faire connaissance ; la marque ; les angles ;
   l'activité et le site (avec la méthode « dessiner puis coder » gardée telle quelle) ; la mise en ligne ; les
   publications ; les publicités ; le suivi du mois ; les vidéos (en dernier).
4. **« Les essais complets »** : elle ne modifie jamais SINA. Elle invente des clients, joue seulement le client (règle :
   « c'est à SINA d'y faire, pas à toi »), fait tourner SINA avec la vraie IA dans le budget fixé avec le propriétaire
   juste avant, et lui montre tout, images comprises, même refusées. Chaque raté trouvé devient une épreuve, transmise à
   « SINA évolue ».

## 3. Les trois règles d'organisation (acceptées avec la demande du chef d'orchestre)

- **Par vagues de deux, pas toutes en même temps** (elles touchent en partie les mêmes fichiers de SINA ; ensemble, elles
  effaceraient le travail les unes des autres et prendraient des décisions contradictoires) :
  1. « SINA évolue » finit le socle ; « Les essais complets » se prépare ;
  2. faire connaissance et la marque ;
  3. les angles et le site ;
  4. les publications et les publicités ;
  5. le suivi du mois et la mise en ligne ;
  6. les vidéos.
  Une vague démarre quand la précédente est rassemblée dans `claude/evolution-sina` et que ses épreuves passent.
- **Chaque conversation ne touche que son étape.** Ce qui toucherait une autre étape ou le cœur de SINA passe par
  « SINA évolue ». Chaque conversation d'étape part de la dernière version de `claude/evolution-sina`, travaille sur sa
  propre branche, et son travail est rassemblé par « SINA évolue » après essais verts.
- **Le chef d'orchestre ne fait rien sans le propriétaire** : avant de créer une conversation, il lui dit en quelques
  lignes concrètes ce qu'elle va faire et ce qu'il verra, et attend son oui. Chaque conversation consomme l'abonnement
  Claude du propriétaire : on n'en ouvre pas plus que la vague en cours.

## 4. Où en est chaque chose (21 novembre 2026, soir)

- **« SINA évolue » est ARRÊTÉE** par ordre du propriétaire (« Stop arrête tout ») : elle ne doit plus rien faire tant
  que le propriétaire (ou le chef d'orchestre avec son accord) ne lui redonne pas d'instruction.
  - Envoyé sur `claude/evolution-sina` : photos demandées en fond plein et contrôle gratuit de la transparence ; logo relu
    avant les images qui le portent ; les onze rapports de recherche. 5 709 essais automatiques passaient.
  - Construit mais **pas encore envoyé** au moment de l'arrêt : le socle (fiche « Ce que SINA sait de toi » avec
    portée, étapes verrouillées, 17 épreuves dont 15 rejouées gratuitement). À reprendre là quand le propriétaire le dira.
  - L'essai payant du grand modèle d'images (`gpt-image-2.6-sunburst` contre `flare`, 3 photos chacun, 1 € au plus)
    n'est PAS lancé ; il faudra un nouveau oui du propriétaire (son accord « fais tout » a été annulé par « Stop »).
- **La branche `claude/lot-4-site-b5qjsw`** (conversation du lot 4) contient tout le travail du 21 novembre sur les
  logos, le relecteur, la présentation des identités, et tous les documents de recherche ; rien n'est fusionné.
- **Projet d'essai du plombier** (client inventé) : 20,06 € dépensés ; ses données étaient dans un dossier temporaire et
  ne sont plus disponibles. Un nouvel essai part d'un nouveau client inventé.

### Reprise du 21 novembre 2026, nuit (nouveau chef d'orchestre : `session_01HSEvRzKV3NKmjQAmJC3ohd`)

- Accord du propriétaire pour relancer « SINA évolue » : « Tout doit être fait correctement avec un debrief simple à
  comprendre pour moi ». Consigne envoyée :
  1. vérifier (série complète) et envoyer le socle déjà construit ;
  2. reprendre une création coupée sans repayer (gratuit) ;
  3. une seule règle à un seul endroit (gratuit) ;
  4. puis s'arrêter et proposer, point par point (SINA simplifiée, juges, coûts), ce qu'elle construirait, ce qu'il verra
     et le prix, avant de rien écrire.
  Après chaque point, un compte rendu simple pour lui, avec un exemple réel, ce qui est vérifié ou non, l'argent dépensé.
- Annulé : la liste de tâches erronée qu'elle avait reçue (« A. SINA en général », « B à J : parties du parcours »).
- Interdit : tout appel payant (l'essai d'images à 1 € attend son oui), toucher à « dessiner puis coder » ou au code du
  thème, retirer du contenu sans son accord, une chaîne d'assistants, un juge sans mesure qu'il sert.
- Rappel tiré des recherches, demandé par le propriétaire (« s'il y a trop de juges ça bogue ? ») : ce sont les assistants
  à la chaîne qui font perdre 39 à 70 % (Google, 180 configurations) ; un juge ne sert que sur ce qui se mesure, une IA
  juge la beauté presque au hasard (0,55 contre 0,50). Donc : SINA seule, le code juge ce qui se mesure, un seul relecteur
  des défauts visibles, le goût au client.
- À préparer ensuite : la conversation « Les essais complets » (consignes à lui montrer avant de l'ouvrir).

### Fin du premier passage de « SINA évolue » (21 novembre 2026, soir)

- Points 1 à 3 faits et envoyés sur `claude/evolution-sina` (5 739 essais verts, 0 €, pas d'essai avec la vraie IA) :
  socle (fiche, étapes verrouillées, 18 épreuves), reprise d'une création de marque coupée sans repayer, rangement des
  doublons. Relevé des 16 règles contradictoires : `docs/studio/REGLES-EN-DOUBLE-2026-11-21.md`.
- Deux recommandations trahissaient ses décisions et ont été refusées par le chef d'orchestre : grouper les questions
  (sa décision : une à la fois) ; marquer les réalisations « illustrations » (proposition écartée le 14 novembre).
- Son accord (« Oui envoie lui ») : appliquer seulement ses règles déjà décidées, points 1, 2, 3, 4, 6, 7, 8, 11, 13 du
  relevé. Les points 5, 9, 10, 12, 14, 15, 16 attendent la conversation de leur étape ou le lot des forfaits.
- En attente de sa décision, un par un avec leur prix : SINA simplifiée, juges (carnet de ses verdicts, mesure
  d'accord ~0,90 €), coûts (tableau du coût par travail accepté, différé).

## 5. À lire avant chaque décision

1. `docs/studio/LE-STUDIO-DE-A-A-Z.md` : la référence du propriétaire et ses décisions (elles priment toujours).
2. `CLAUDE.md` : ses règles et ses goûts.
3. `docs/studio/COMPTE-RENDU-2026-11-21-SINA.md` : ce qui a été modifié le 21 novembre et les problèmes pas réglés.
4. `docs/studio/COMPTE-RENDU-RECHERCHES-SINA-2026-11-21.md` : les recherches et ce qui a été proposé (des PROPOSITIONS :
   rien ne s'applique sans son accord).
5. `docs/studio/recherches-2026-11-21/` : les onze rapports complets avec leurs sources (le rapport de chaque domaine se
   donne à la conversation de l'étape correspondante).

## 6. Décisions du propriétaire à ne jamais trahir (21 novembre 2026)

- **La méthode « dessiner l'accueil en image puis le coder » reste** : « C'est sûrement le meilleur de SINA ». Ne jamais
  la retirer, la remettre en cause ni lui reposer la question ; ne jamais retirer le code du thème (« j'ai jamais demandé
  ça à ce que tu enlèves le code du thème »). Les contrôles sur captures s'ajoutent autour d'elle (par exemple comparer le
  site codé à l'image dessinée pour corriger), sans la remplacer.
- **Le client arrive avec presque rien** : quelques réponses, ses photos s'il en a, un lien s'il en a un.
- **SINA pose ses questions quand elle en a besoin**, à n'importe quelle étape, une à la fois (décision du 14 novembre),
  pas toutes au début.
- **Logo** : aucune consigne de style au dessinateur, seulement la marque (nom, métier, idée et ton, couleurs,
  typographie, fond blanc), la phrase de refus du client mot pour mot, et ses 50 logos aimés « seulement comme exemples ».
- **Une recherche ne prime jamais sur sa décision** : les rapports rapportent des faits ; ce qui en sort est une
  proposition qu'on lui explique et qu'il accepte ou non.
- **Ne rien ajouter qu'il n'a pas demandé** : chaque proposition se dit en une phrase et attend son oui.

## 7. Comment parler au propriétaire (rappel)

- Français simple, sans un mot d'anglais ; il n'est pas développeur.
- **Être explicite et concret** (« soit plus explicite ») : dire exactement ce qui est fait, avec des exemples réels
  (le logo d'Aplomb, la publication de l'escalier), jamais des mots vagues comme « socle » ou « chaînes » sans les
  expliquer.
- Réponses courtes, une question au plus, à la fin ; ne jamais reposer une question déjà répondue.
- Argent : le prix avant, son oui écrit, aucune relance d'un appel douteux ; lui montrer les images tout de suite.
- Une faute se dit franchement.

## 8. Ce que contient chaque étape (propositions tirées des recherches, à présenter, pas à imposer)

- **SINA évolue** : fiche du client relue en entier avant chaque création ; étapes validées verrouillées ; épreuves tirées
  des vrais ratés rejouées avant chaque changement ; une seule SINA qui parle au client, moins de 20 outils, consignes
  courtes, créations par étapes fixes (plan, morceaux, contrôle sur le vrai rendu, juge séparé) ; juges par sorte de
  défaut, comparaisons dans les deux ordres, juge appris sur ses verdicts avec accord mesuré, le client choisit parmi
  plusieurs versions ; deux reprises au plus puis SINA montre ; cache et traitement différé ; coût par travail accepté.
- **Faire connaissance** : SINA étudie seule le marché, les concurrents et les avis de leurs acheteurs ; elle recommande
  avec une raison ; elle ose dire non ; boutons et écriture libre ; elle prend les devants en fin d'étape.
- **La marque** : positionnement avant le nom (ce qu'il ferait sans la marque, ce qu'elle a d'unique, « la seule
  qui… », ce qui pousse et ce qui retient) ; 150 à 300 pistes de noms par équipes séparées, tri sévère (facile à dire,
  écrit juste après l'avoir entendu, test du concurrent, noms proches à l'INPI ; jamais « nom libre ») ; logo par la grande
  version d'OpenAI si l'essai le confirme, plusieurs versions au choix, fichier vectoriel ; texte des planches posé par le
  Studio ; retouche de la seule zone ratée ; produit comparé à la photo du client.
- **Les textes (partout)** : chasse aux sept défauts de l'écriture d'IA et aux tics, mots concrets, vrais mots des
  acheteurs, test à trous.
- **Les angles** : vraies situations d'achat (pourquoi, quand, où, avec qui…), trois vraiment différentes ; contrôle par
  devinette (un juge retrouve quel client va avec quel texte).
- **L'activité et le site** : méthode « dessiner puis coder » gardée ; rôle de chaque section écrit d'abord ; contrôles sur
  captures téléphone et ordinateur (dont la comparaison avec l'image dessinée) ; contrôles du code (débordements, boutons
  entiers et assez grands, doublons, vides) ; vitesse et accessibilité ; premier écran clair ; pas de diaporama
  automatique ; vrais avis seulement (loi) ; livraison offerte près du prix ; clic sur l'aperçu avec repère fixe et textes
  changés sans IA ; variété comparée aux 12 derniers sites.
- **La mise en ligne** : non étudiée par les recherches ; rien à inventer.
- **Les publications** : mois sur 2 à 4 temps forts et 3 à 5 thèmes, fiche de ton, jamais une semaine vide, carrousels,
  structure qui vend, idée jugée avant de payer le dessin, photo d'OpenAI sans texte et publication composée par le Studio
  (son accord d'abord : sa règle « images créées par OpenAI, obligatoire pour les publications »), test de l'inconnu et
  liste en oui ou non avant de montrer.
- **Les publicités** : trois idées (une par angle) × deux formats, en pièces séparées, même vérification ; personnes
  seulement avec photos ou accord écrit.
- **Le suivi du mois** : montrer le travail fait puis ce qu'il a donné ; objectif écrit ; cinq chiffres (appels,
  messages, demandes, visites, ventes) ; un seul « ta journée est prête » par jour ; propositions en fin d'étape ; refus
  retenus ; le client règle la fréquence.
- **Les vidéos** (en dernier) : image fixe validée avant l'animation ; 5 à 8 plans courts, 9 à 15 secondes, son et
  sous-titres ; produit vérifié image par image ; aucun fournisseur payant ajouté sans son accord.
- **Non étudié** (ne rien inventer) : transfert vers Shopify, WooCommerce, PrestaShop ; nom de domaine ; fiche Google ;
  e-mails ; être trouvé par Google et les assistants IA ; réponses aux commentaires ; supports imprimés.
