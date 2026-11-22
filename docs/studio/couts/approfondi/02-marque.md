# Audit approfondi des coûts : la création de la marque (22 novembre 2026)

Lu sur la dernière version de la branche `claude/evolution-sina` (enregistrement `9b67a29a`), dans un dossier de travail
à part. **Aucun fichier du Studio modifié, aucun appel payant.** Ce qui est déjà fait (mémoire d'une heure, résumé du
client en mémoire pour les appels qui reviennent, images comptées au jeton, sans aperçus, 16:9 et 9:16 directs, planche
des 50 logos en mémoire chez le relecteur, différé) n'est pas redit : seul ce qui reste est ici.

Lu en entier : `brand-chain.ts`, `brand-prompts.ts`, `brand-images.ts`, `brand-finish.ts`, `studio-brand.ts`,
`brand-domains.ts`, `brand-routes.ts`, `brand-knowledge.ts`, `src/lib/ai/web-search.ts`, l'outil `tools/identity.ts`,
et les parties de `llm.ts`, `media-providers.ts`, `openai-images.ts`, `identities.ts`, `fiche.ts`, `variete-marques.ts`,
`logos.ts`, `angles-chain.ts` et `brand-boards.tsx` que ces fichiers appellent. Cahiers lus par la chaîne
(`docs/sina-savoir/`, mesurés sans leurs sources) : noms 14 409 caractères, idée 13 345, voix 14 868, signes 13 647,
maquette du site 6 272.

Prix utilisés (consignes de l'audit) : Opus 5.5 à 4 $ / 20 $ le million de jetons, lecture en mémoire 0,20 $, écriture en
mémoire d'une heure 2 fois le prix d'entrée ; Sonnet 5.5 à 2 $ / 10 $, lecture 0,10 $ ; différé −50 % ; image OpenAI :
30 $ en sortie, 8 $ par image jointe, 5 $ de texte, le million ; 1 $ = 0,90 €. Jetons déduits des caractères (environ
3 caractères par jeton) : **estimé**, pas mesuré. Les longueurs de réponse sont celles que le Studio prévoit lui-même
(`CALLS`, `brand-chain.ts` l. 68-87), réflexion comprise.

`studio-brand.ts` n'appartient pas à la création de la marque : c'est le site monté dans un des 15 thèmes (étape 8, textes
puis photos par `runImageEngineV2`). Il n'est pas compté ici.

---

## 1. Chaque appel payant de la marque

### 1.1 Les textes et les recherches (tâche de fond, en différé sauf les recherches)

Réglages communs : `realAi` (`brand-chain.ts` l. 299-324). Toute consigne porte un point de mémoire (une heure en
différé, cinq minutes en direct, `llm.ts` l. 533 et 907). Le résumé du client (la fiche entière) est mis à part en
mémoire seulement pour la planche, la reprise et la direction artistique des images (`REPETES`, l. 292-297). Place de
réponse : celle de `CALLS`, puis, si la réponse est coupée, la même demande est refaite et repayée avec plus de place
(`llm.ts` l. 952-985).

| Appel | Où | Modèle, effort | Ce qui part | Mémoire | Réponse | Fois (2 / 3 / 4 identités) | Ce qui fait repayer, doublons, sans IA |
|---|---|---|---|---|---|---|---|
| Recherche sur Internet pour l'étude | `brand-chain.ts` l. 611-613 ; `web-search.ts` l. 149-233 | Sonnet 5.5, faible, outil de recherche, 8 recherches au plus (l. 36) | consigne générale des **angles** (l. 105) qui demande « quatre familles, dix pages » ; fiche courte ; demande d'une seule famille ; pages lues comptées en entrée (20 000 jetons par recherche prévus, l. 40) | aucune | 12 000 au plus ; dix extraits recopiés | 3 / 3 / 3, l'une après l'autre | résultat incertain : coût maximal gardé, jamais relancé. **Doublon** : chaque recherche cherche les quatre familles alors qu'elle n'en veut qu'une |
| Étude | l. 618 | Sonnet, moyen | consigne 3 214 car. ; fiche entière ; 45 pages (≈ 30 000 jetons) | consigne écrite pour une heure, servie une fois | 7 000 (au plus 12 000) ; chaque parole recopie l'adresse entière de sa page | 1 | pages en double jamais retirées (l. 616) ; l'adresse pourrait être le numéro de page déjà donné (l. 617) |
| Idées de marque | l. 630, 635 | Opus, moyen | consigne 17 251 car. ; fiche ; étude (22 000) | écrite pour une heure | 12 000 (au plus 20 000) ; 8 à 14 idées de 10 champs | 1 (2 si trop peu d'idées fortes) | `job` jamais relu |
| Équipes de noms | l. 648 ; second tour l. 688 | Sonnet, moyen | consigne 21 820 car., **dont 21 400 identiques aux quatre**, mais le chemin propre à l'équipe est écrit en tête (`brand-prompts.ts` l. 120-122) ; demande identique aux quatre (fiche, idées, moule, concurrents) | chacune écrit sa propre mémoire d'une heure (au double du prix) ; rien n'est partagé | 40 à 70 noms, chacun avec un détail et une seconde lecture de 200 car. (9 000, au plus 16 000) | 4 / 4 / 4 (8 au second tour) | voir 2.6 et 2.12 |
| Juge des noms | l. 672 | Opus, moyen | consigne 9 441 car. ; fiche ; environ 200 noms avec détail et seconde lecture (16 000 à 22 000) | écrite pour une heure | 3 000 | 1 (2) | **refait** quand on refait une planche sans nouvelle consigne (l. 604-605 ne reprend pas son verdict) |
| Composition des routes | l. 719 | Opus, moyen | consigne 10 419 car. ; fiche, étude, idées, noms gardés (26 000) | écrite pour une heure | 9 000 ; jusqu'à 10 routes ; `trials` jamais relu | 1 | |
| Vérification des noms | l. 741 puis 743 | recherche (Sonnet + outil) puis Sonnet, moyen (2 391 car.) | les routes et les réserves ; pages trouvées | aucune / trop courte | 2 500 | 1 + 1 | |
| Planche (direction) | l. 789 ; remplacement d'un nom l. 835 | Opus, moyen | consigne 46 907 car. (15 600 jetons) ; fiche (en mémoire) ; étude ; route ; autres routes (18 000) | consigne et fiche lues de la 2e planche à la dernière | 10 000 (au plus 18 000) ; **pictogrammes dessinés en code demandés** (l. 227, 231 ; consigne l. 244-254) et ruban du colis (l. 247), jamais affichés | 2 / 3 / 4 (+ remplacements) | |
| Lecteur qui ne sait rien | l. 800 | Opus, moyen | consigne 1 221 car. ; les phrases | trop courte | 2 500 | 1 | |
| Directeur de création | l. 814 | Opus, moyen | consigne 10 720 car. ; fiche ; toutes les routes ; contrôles du Studio (26 000) | écrite pour une heure | 6 000 ; `score` jamais relu | 1 | une reprise demandée pour un défaut que le code mesure (voir 2.8) |
| Reprise d'une planche | l. 844 | Opus, moyen | consigne 47 464 car. = **la consigne de la planche + 550 car. de reprise, en un seul bloc** (`brand-prompts.ts` l. 372-374) : la mémoire de la planche n'est pas relue | sa propre écriture d'une heure | 10 000 : la route entière réécrite | probable 1 / 2 / 2, au plus 2 / 3 / 4 | voir 2.5 |
| Relecture de la reprise | l. 857 | Opus, moyen | consigne 7 696 car. ; avant, corrections, après (30 000) | écrite pour une heure | 4 000 ; `score` jamais relu | 1 | |
| Direction artistique des images | `brand-images.ts` l. 411 | Opus, moyen | consigne 15 620 car. ; fiche (en mémoire) ; la route | lue d'une planche à l'autre | 6 000 ; 7 consignes, dont 5 ne servent qu'à l'identité choisie | 2 / 3 / 4 ; **+1 à chaque image refaite avant le choix** (nouvelle clé l. 406) ; +1 à la fin de la marque après un mélange, une retouche ou une consigne (`brand-finish.ts` l. 91 et 102) | voir 2.2 à 2.4 |

### 1.2 Les images et leur relecture

| Appel | Où | Modèle | Ce qui part | Réponse | Fois |
|---|---|---|---|---|---|
| Logo | `brand-images.ts` l. 576 ; sans trait l. 583 ; reprises l. 598 | OpenAI 2.6 Flare, haute | consigne (nom épelé, métier, « La marque », couleurs, typographie, fond blanc, refus du client) + planche des 50 logos + planche des logos déjà faits de la série | 1 image 1024 × 1024 | 1 par identité, au plus 4 (un dessin sans trait, deux reprises) |
| Grande scène | l. 609 | idem | consigne, aucune image jointe | 16:9 | 1, au plus 3 |
| Haut du site sur téléphone | l. 613 | idem | consigne + logo (version claire sur fond sombre) + **grande scène pas encore relue** | 9:16 | 1, au plus 3 |
| Objet, signes, trois publications (marque finie, en direct) | l. 627-629 | idem | consigne + logo | carré ou portrait | 5 pour l'identité choisie, au plus 15 |
| Symbole (marque finie) | `brand-finish.ts` l. 149 | idem | consigne + logo | carré | 1 |
| Relecteur | `brand-images.ts` l. 499 | Opus, **élevé** (l. 321) | consigne 3 816 car. ; une image ; le logo pour comparer (haut du site, objet, signes, publications) ; planche des 50 en tête et en mémoire (logo seulement) | 2 500 (au plus 6 000) ; un champ « ce que tu vois » de 1 500 car. **jamais relu par le code** (schéma l. 98) | 1 par image dessinée, plus une seconde lecture en cas de doute (l. 534) |
| Relecture du symbole | `brand-finish.ts` l. 152 | Opus, élevé | consigne courte, symbole et logo | court | 1 |

Contrôles gratuits déjà placés **avant** la relecture payée : fond blanc du logo (`logoOnWhite`), trait déjà pris
(`traitHorizontal`), photo transparente (`photoTransparente`). Ils sont bien placés.

### 1.3 Le nombre exact d'appels et d'images

Création sans reprise demandée par le client, devis habituel (une reprise de planche sur deux).

| | 2 identités | 3 identités | 4 identités |
|---|---|---|---|
| Recherches sur Internet (étude 3 + vérification 1) | 4 | 4 | 4 |
| Appels de texte, premier passage (étude, idées, 4 équipes, juge, composition, vérification, lecteur, directeur, relecture de la reprise, planches, directions artistiques, reprises) | 17 | 20 | 22 |
| Appels de texte au plus (second tour d'idées et de noms, reprise de chaque planche) | 24 | 27 | 30 |
| Images des planches proposées : premier passage / au plus | 6 / 20 | 9 / 30 | 12 / 40 |
| Relectures des planches : premier passage / au plus (sans les secondes lectures) | 6 / 18 | 9 / 27 | 12 / 36 |
| Marque finie (objet, signes, 3 publications, symbole) : images / relectures, au plus | 6 / 6, au plus 16 / 16 | idem | idem |
| **Images d'une marque complète, premier passage / au plus** | **12 / 36** | **15 / 46** | **18 / 56** |

Le devis du Studio ne compte qu'une image et une relecture par emplacement (`boardImagesQuote`, l. 154-167) : les reprises
d'images se paient sur la marge de la carte.

### 1.4 Les images créées et jamais montrées

1. **Les images refusées** (par le relecteur ou par un contrôle gratuit) : c'est la règle « rien n'est montré sans avoir
   été relu ». Elles restent dans le carnet des juges. À garder.
2. **Après une retouche de la signature**, le logo, la grande scène et le haut du site de l'identité choisie sont jetés et
   refaits (voir 2.2). Ils avaient été montrés sur la planche, mais disparaissent de la marque du client.
3. **Le haut du site est dessiné sur une grande scène pas encore relue** (l. 609-613, relecture l. 631) : si la scène est
   refusée puis refaite, le téléphone garde la scène refusée ou est refusé à son tour (voir 2.11).
4. **Le haut du site dessiné sans logo gardé** (logo refusé trois fois) : il montre le nom en lettres simples ; si cette
   identité est choisie, la marque finie le garde tel quel, car la fin de la marque ne le refait que pour un logo
   refait seul avant le choix (`brand-finish.ts` l. 44). **À vérifier** sur un essai : c'est un défaut de qualité.
5. **Logo refait après le choix** : l'objet et les signes sont refaits avec lui (l. 52), mais pas les trois publications
   ni le haut du site, qui portent l'ancien logo. **À vérifier** : la règle du propriétaire dit « jamais l'ancien logo
   sur la marque finie ».

---

## 2. Ce qui reste à gagner

### 2.1 Les recherches sur Internet : une consigne propre à la marque (le plus gros poste restant)

**Constat.** Les quatre recherches de la marque coûtent environ 1,20 € par projet (mesuré au lot 2 : 0,16 à 0,45 € la
recherche). L'essentiel n'est pas le prix des recherches (8 au plus × 0,01 $) mais les pages lues, comptées en entrée.
Or la consigne de l'outil (`web-search.ts` l. 105) est celle des **angles** : « comprendre les motivations émotionnelles
[…] quatre familles : offer, competitors, customers, sector […] Vise dix pages au total ». Les trois demandes de la marque
visent chacune **une seule** famille (paroles de clients, concurrents, usages, `brand-prompts.ts` l. 67-74), et la
vérification des noms une seule aussi. Chaque recherche va donc aussi chercher les trois autres familles : les trois
recherches de l'étude se recouvrent, et la même page peut revenir deux ou trois fois dans l'étude (aucun tri des pages en
double, `brand-chain.ts` l. 616).

**Correction.** Une consigne de recherche passée par l'appelant : « cherche seulement la famille demandée ». Puis, d'après
la trace du dernier essai (gratuit à lire : Administration › Consommation donne le nombre de recherches par appel), régler
le nombre de recherches permis au nombre réellement utile. Retirer les pages en double avant l'étude.

**Gain.** Si un tiers des recherches et des pages lues partent aujourd'hui hors de la famille demandée (**hypothèse, à
mesurer**) : 0,20 à 0,40 € par projet.

**Effet pour le client.** Égal ou meilleur : plus de vraies paroles de clients dans l'étude, au lieu de pages de
concurrents trouvées trois fois.

En plus, sans aucun coût : les trois recherches de l'étude partent l'une après l'autre (l. 611) alors qu'elles sont
indépendantes. En même temps, la marque arrive deux à trois minutes plus tôt (estimé).

### 2.2 Une retouche de la signature ne jette plus le logo ni les images

**Constat.** `mixIdentity` (`tools/identity.ts` l. 180) retire **toutes** les images de la planche dès que le client
retouche la signature ou la prend à une autre identité. Or aucune image ne porte la signature : le logo porte le nom, la
grande scène n'a aucun texte, le haut du site porte le nom, le titre et le bouton (`slotTexts`, `brand-images.ts`
l. 128-136). Conséquences :
- le logo que le client a choisi disparaît, un autre est dessiné à la place ;
- la grande scène est refaite ; le haut du site est perdu (la fin de la marque ne le refait pas, l. 44) : planche
  incomplète ;
- la direction artistique est réécrite (`mixed`, `brand-finish.ts` l. 91 et 102) ;
- le prix dépasse ce qui était déjà accordé (7 images au lieu de 5) : une **seconde carte** s'affiche pour une retouche
  d'un mot (`finishEstimate`, `tools/identity.ts` l. 330-336).

Même chose, en plus petit, pour un nom retouché : la grande scène, sans texte, pourrait rester.

**Correction.** Ne retirer que les images dont les mots ou les couleurs changent : signature retouchée, rien ; nom
retouché ou pris ailleurs, tout sauf la grande scène ; couleurs ou polices prises ailleurs, tout (comme aujourd'hui). Ne
réécrire la direction artistique que si les couleurs, les polices ou le nom changent.

**Gain, à chaque retouche de la signature** : direction artistique 0,14 $ + logo 0,08 $ et sa relecture 0,03 $ + grande
scène 0,07 $ et sa relecture 0,03 $ = 0,35 $, soit **0,32 €**. Compté une fois sur trois projets (**hypothèse**) :
**0,11 €**, plus 0,02 € pour les noms retouchés (grande scène gardée).

**Effet pour le client.** Meilleur : il garde le logo et le téléphone qu'il a choisis, et aucune seconde carte.

### 2.3 Refaire le logo d'une planche ne repaie plus toute la direction artistique

**Constat.** « Refais le logo de B » (`identity.images`, `tools/identity.ts` l. 296-320) lance une tâche nouvelle ;
`runBoardImages` y reçoit une clé nouvelle (`:logo`, l. 406) et **réécrit toute la direction artistique** (sept consignes,
Opus, en direct) pour n'en garder qu'une ligne : « La marque : … ». La décision du 21 novembre interdit justement que la
consigne de SINA aille au dessinateur ; la fiche lui est d'ailleurs donnée sans la consigne du client (l. 587). La
direction d'origine est déjà gardée dans la tâche de la proposition (`proposalImagery`, `brand-finish.ts` l. 57-66), et
`logoIdea` est rangé sur la planche (l. 705). Même chose pour refaire la grande scène ou le haut du site sans nouvelle
consigne du client.

**Correction.** Écrire la ligne « La marque » **par le code**, à partir de la planche : ce qu'elle croit, ce contre quoi
elle se bat, ce qu'elle fait ressentir, son ton (ce que la règle du 21 novembre permet : « le nom, le métier, l'idée et le
ton de la marque »). Pour une grande scène ou un haut de site refaits sans consigne du client, reprendre la direction
d'origine. Ne la réécrire que si le client a dit ce qu'il veut de différent pour cette image.

**Gain** : 7 000 jetons lus × 4 $ + 6 000 écrits × 20 $ ≈ 0,15 $, soit **0,13 € par planche refaite** (en direct). Une
planche refaite par projet (**hypothèse** ; les essais en ont eu bien plus) : **0,13 €**. La carte baisse d'autant.

**Effet pour le client.** Égal, et plus sûr : plus aucun mot de style écrit par SINA ne peut glisser vers le dessinateur.

### 2.4 Refaire le logo après le choix : même chose

**Constat.** `brand.finish` avec « logo » et les mots du client réécrit la direction artistique (`brand-finish.ts` l. 102)
pour l'objet et les signes, qui ne sont refaits que parce qu'ils portent le logo (l. 52).

**Correction.** Réutiliser la direction d'origine quand le client n'a demandé que le logo ; la réécrire seulement s'il
demande aussi une autre image.

**Gain** : 0,13 € par occurrence ; une fois sur deux projets : **0,07 €**. **Effet** : égal.

### 2.5 La reprise d'une planche relit la mémoire de la planche

**Constat.** La consigne de reprise est la consigne de la planche (46 907 car.) suivie de 550 car., en un seul bloc
(`brand-prompts.ts` l. 372-374). La mémoire se retrouve par le début du texte jusqu'au point de mémoire : ici le bloc
entier diffère, donc la reprise réécrit 15 800 jetons au double du prix, et la fiche du client derrière.

**Correction.** Donner à la reprise exactement la consigne de la planche ; mettre les 550 car. de reprise en tête de la
demande (qui commence déjà par « Ta route »).

**Gain** : 15 800 jetons × 8 $ × 0,5 = 0,063 $ deviennent 0,002 $ ; fiche : 0,006 $ en moins ; soit **0,06 € par marque**
(presque toutes ont au moins une reprise). **Effet** : égal (mêmes mots, autre place).

### 2.6 Les quatre équipes de noms partagent leur consigne

**Constat.** Les quatre équipes reçoivent 21 400 car. identiques et la même demande, mais le chemin de chaque équipe est
écrit en tête de la consigne (`brand-prompts.ts` l. 120-122) : chacune écrit sa propre mémoire d'une heure au double du
prix, et aucune ne relit celle des autres.

**Correction.** Mettre la partie commune en tête (règles, cahier des noms, mesure du propriétaire, forme de la réponse),
puis la demande commune, et le chemin de l'équipe **à la fin**. Les équipes restent séparées et ne voient pas le travail
des autres (décision du 12 novembre).

**Gain** : aujourd'hui 4 × (7 300 jetons à 4 $ + 5 000 à 2 $) × 0,5 ≈ 0,078 $ ; après, 12 100 jetons écrits une fois +
3 lectures ≈ 0,026 $ ; soit **0,05 € par tour de noms**. **À vérifier** : les quatre partent en même temps, chacune dans
son propre envoi en différé ; la mémoire n'est relue que si la première a commencé. Il faudra peut-être les envoyer
ensemble dans un même envoi en différé. **Effet** : égal.

### 2.7 Le relecteur des images écrit moins de ce qu'il voit

**Constat.** Le relecteur doit d'abord écrire « ce que tu vois, zone par zone » (`brand-prompts.ts` l. 316 ; jusqu'à
1 500 car., schéma l. 98). Ce champ n'est jamais relu par le code ni rangé dans le carnet des juges. Au niveau de réflexion
élevé, ce regard se fait déjà dans sa réflexion.

**Correction prudente.** Garder la méthode (« regarde zone par zone avant de juger ») mais limiter ce champ à 600 car.

**Gain** : environ 250 jetons de moins par relecture : 11 relectures en différé et 5 en direct par marque ≈ 0,05 $, soit
**0,05 €**. **À vérifier** sur 20 images du carnet des juges (accord avec le propriétaire) avant de l'appliquer : la règle
« rien de moins bien » passe avant.

### 2.8 Ce qui se mesure est corrigé par le code avant le directeur de création

**Constat.** Les contrôles gratuits (`routeIssues`, `brand-routes.ts` l. 203-255 ; `layoutIssues`, `brand-chain.ts`
l. 505-516) partent au directeur, puis à une **reprise payée** de la planche entière (consigne de 47 000 car., route
réécrite) : fond « blanc » qui n'est pas blanc pur, fond sombre pas assez foncé, contraste sous 4,5:1, dégradé terne,
deux boutons de même famille de couleur, même manière d'ouvrir le site, chiffre absent de la fiche. Le Studio corrige déjà
seul les polices et les fonds clairs (`varierIdentites`, `variete-marques.ts` l. 282-312) : la même façon de faire
s'applique ici.

**Correction.** Corriger ces défauts par le code avant le directeur : blanc pur, foncé assombri, couleur du texte ou du
bouton ajustée jusqu'au contraste, dégradé éclairci, autre manière d'ouvrir prise dans la liste de la consigne, chiffre
non prouvé ajouté à « ce qui reste à prouver » (ce que la règle permet).

**Gain** : une reprise évitée quand ce sont les seules raisons : 0,14 $ de reprise + 0,10 $ de relecture de la reprise si
c'était la seule ≈ **0,13 à 0,22 € par reprise évitée**. Une fois sur quatre marques (**hypothèse**, à vérifier dans les
parcours des essais, liste `corrected`) : **0,04 €**. **Effet** : égal ; le directeur ne juge plus que le talent.

En plus, gratuit et sans gain direct : **les mots corrigés du client** (« X, jamais Y », `loadWordingRules`) ne sont pas
contrôlés sur la planche ; seul le directeur peut les voir. Les ajouter aux contrôles du Studio évite qu'un client
retrouve un mot qu'il a corrigé, puis demande une planche refaite.

### 2.9 Les explications des noms, plus courtes

**Constat.** Chaque équipe écrit 40 à 70 noms avec un détail et une seconde lecture de 200 car. chacun
(`brand-prompts.ts` l. 131-133) ; le juge relit le tout (≈ 200 noms). La planche n'en garde que 110 car. (`nameAnchor`) et
180 (`nameExpression`), et la deuxième épreuve du juge est justement de lire « le nom seul ».

**Correction.** 120 car. pour le détail et pour la seconde lecture ; même nombre de noms.

**Gain** : environ 30 % de réponse en moins par équipe (≈ 1 650 jetons × 4 × 10 $ × 0,5) et 6 600 jetons de moins lus par
le juge : **0,04 € par tour de noms**. **À vérifier** sur le banc d'épreuves (noms des essais). Option à essayer ensuite :
donner au juge les noms seuls, ce qui est l'épreuve du propriétaire (« tu appellerais ton site comme ça ? ») ; ne pas
l'appliquer sans essai, car un juge plus sévère relancerait plus souvent un second tour d'équipes (0,25 €).

### 2.10 Le refus du client mieux repéré pour le dessinateur du logo

**Constat.** Le dessinateur ne reçoit la phrase de refus du client que si elle contient « ne veut », « ne voulons », « pas
de », « surtout pas », « jamais » ou « refuse » (`clientRefusal`, `brand-images.ts` l. 170-174). Essayé avec la même
règle : « Pas d'outil dans le logo », « Aucune goutte », « Sans goutte d'eau », « J'aime pas les gouttes », « Je déteste le
rose », « Évite les clés à molette » **ne sont pas repérés**. Le relecteur, lui, reçoit tout : il refuse le logo qui montre
la goutte, et le logo est redessiné et repayé.

**Correction.** Ajouter « pas d' », « aucun », « aucune », « sans », « évite », « n'aime pas », « déteste », « non à ».

**Gain** : 0,08 $ de logo + 0,02 $ de relecture ≈ **0,09 € par logo évité** ; une fois sur trois projets : **0,03 €**.
**Effet** : meilleur : le bon logo arrive plus tôt.

### 2.11 L'ordre de travail : rien n'est dessiné sur une image pas encore relue

**Constat.** Le logo est bien relu avant ce qui le porte (21 novembre). Mais la grande scène est dessinée, puis le haut du
site est dessiné **avec elle**, puis les deux sont relus (`brand-images.ts` l. 609-613, 631). Et quand le logo est refusé
trois fois, le haut du site est quand même dessiné sans logo (l. 606, 611-613).

**Correction.** Relire (et refaire s'il le faut) la grande scène avant de dessiner le haut du site. Sans logo gardé, ne pas
dessiner le haut du site à la proposition : le noter pour qu'il soit dessiné avec le vrai logo si l'identité est choisie
(le mécanisme `siteAncienLogo` existe déjà).

**Gain** : environ une scène sur cinq refusée, et une fois sur deux le téléphone avec elle (**hypothèse**) : ≈ **0,03 €**.
**Effet** : meilleur : le téléphone montre la scène et le logo gardés ; même durée (tout est déjà fait l'un après
l'autre).

### 2.12 Ce que la planche n'affiche plus n'est plus demandé

**Constat.** Depuis que les logos et les signes sont créés par OpenAI, la planche n'affiche plus les pictogrammes des
signes (`firstPicto`, `brand-boards.tsx` l. 415, calculé et jamais utilisé) ni le ruban du colis (`tape`, l. 419, jamais
affiché). Pourtant la consigne de la planche demande toujours un pictogramme dessiné en code par signe et pour le nom
(`brand-chain.ts` l. 227, 231 ; `brand-prompts.ts` l. 244-245, 254) et le ruban (l. 247). Le pictogramme du nom s'affiche
encore dans le nom dessiné de secours, contre la règle « aucun pictogramme dessiné en code ».

**Correction.** Retirer de la consigne et de la forme de la planche les pictogrammes et le ruban ; garder le nom dessiné de
secours en lettres seules.

**Gain** : environ 400 jetons de réponse par planche et par reprise (4,5 appels, en différé), plus la réflexion passée à
dessiner : **0,02 € au moins**. **Effet** : meilleur : la règle du propriétaire est tenue partout.

### 2.13 Le juge des noms n'est pas refait pour rien

**Constat.** Refaire une planche sans nouvelle consigne reprend l'étude, les idées et les noms (l. 604-605), mais relance
le juge sur les mêmes noms (clé avec le nouveau numéro, l. 672).

**Correction.** Sans consigne du client, reprendre ses verdicts, moins les noms déjà montrés ; ne juger que les noms
nouveaux s'il en faut.

**Gain** : 0,06 € par occurrence ; une fois sur trois projets : **0,02 €**. **Effet** : égal.

### 2.14 Petits champs

- **L'étude** : chaque parole, chaque fait et chaque concurrent recopient l'adresse entière de leur page, alors que les
  pages sont numérotées dans la demande (l. 617). Rendre le numéro coûte environ 2 000 jetons de moins, soit **0,01 €**,
  et une parole n'est plus jetée parce que son adresse a été mal recopiée (`verifiedQuotes`, l. 335-343) : meilleur.
- **Champs jamais relus** : `trials` (composition, jusqu'à 10 × 350 car.), `job` (idées), `score` (directeur, relecture de
  la reprise) : **0,01 €**. Les deux épreuves des idées (`opposite`, `onlyUs`) ne sont pas relues non plus, mais elles
  servent au modèle à juger s'il garde une idée : je les garde.

---

## 3. Gains qui se comptent à l'occasion (hors total)

- **Nouvelle proposition sans les mots du client.** `identity.propose` sans consigne, avant le choix, refait tout : les
  quatre recherches, l'étude, les idées et les équipes (`tools/identity.ts` l. 91 ; `brand-chain.ts` l. 605), environ
  **1,60 €**, et la carte montre ce prix. L'étude du marché ne change pas en quelques jours : la reprendre toujours (moins
  d'un mois), et ne refaire idées et noms que si le client le demande. Effet : égal.
- **Réponse coupée faute de place.** Une réponse coupée est jetée et la demande refaite avec plus de place
  (`llm.ts` l. 952-985) : une planche coupée coûte 0,18 € pour rien, une équipe 0,08 €. Demander d'emblée la place
  maximale ne coûte rien de plus (seuls les jetons écrits sont payés), mais monte le plafond affiché sur la carte. **À
  vérifier dans les traces** (fin « coupée ») avant de décider.
- **Logo refait avant le choix, sans les logos des autres planches.** La règle « chaque logo reçoit ceux déjà faits »
  n'est pas tenue : un logo refait seul ne reçoit que ceux refaits dans la même tâche (l. 590), jamais ceux des autres
  planches de la série. Risque d'un logo trop proche, donc d'une nouvelle reprise. Correction gratuite ; gain non
  chiffrable.

## 4. Idées à proposer au propriétaire (elles changent ce que voit le client)

- **Les noms avant les planches.** Le client verrait d'abord les noms gardés par le juge, avec leur adresse libre, et
  choisirait avant que SINA paie les planches et les logos. Le code existe déjà (`namesPreview`, `names`,
  `namesPreviewQuote`, `brand-chain.ts` l. 135, 529-530, 701-707) mais aucun outil ne l'appelle. Gain : environ **2 € à
  chaque série de noms refusée** (planches, logos, scènes et téléphones refaits). Une étape de plus pour le client : à lui
  de dire oui ou non.
- **Les trois publications de la planche reprises comme premières publications** (idée déjà notée dans l'audit 01) :
  environ 0,60 € de moins sur l'étape des publications, si elles vont avec l'angle choisi plus tard. À lui de décider.

## 5. Regardé et laissé tel quel

- **Ne plus mettre en mémoire les consignes servies une seule fois** (étude, idées, juge, composition, directeur,
  relecture de la reprise) : 0,01 à 0,03 € par marque. Mais ces consignes sont les mêmes pour tous les clients : dès que
  deux marques se font dans la même heure, la mémoire est relue. Je la garde.
- **N'écrire les consignes de l'objet, des signes et des publications qu'après le choix** : 0,02 € de moins par identité
  non choisie, mais un appel de plus en direct après le choix (0,08 $) : perdant à 2 et 3 identités, nul à 4.
- **L'étude en mémoire avec la fiche pour les planches** : moins d'un centime.
- **Les recherches en différé** : jusqu'à 0,45 € (moitié prix sur les pages lues), **à vérifier** chez Anthropic (outil
  de recherche permis en différé ?) ; mais elles prendraient sur les 30 minutes de patience de la tâche, et le propriétaire
  a refusé le 22 novembre d'allonger cette patience. Pas proposé.
- **Le texte des images posé par le code** (point 4 du compte rendu du 21 novembre, cause de nombreux refus) : non
  tranché par le propriétaire, non compté.
- **Les noms de domaine** : gratuits (annuaire public des registres), une fois par nom ; rien à gagner.
- **La relecture des pages citées** : gratuite, 16 pages au plus, une fois ; les angles reprennent l'étude entière sans
  la repayer (`brandStudyOf`).

## 6. Ce qui ne sert plus depuis les décisions du 21 novembre

- La ligne « La marque » du logo écrite par la direction artistique : elle peut être écrite par le code (2.3).
- Les pictogrammes en code et le ruban du colis (2.12) ; le signe « lettrage », remplacé par « Le logo » à l'affichage.
- La forme de la relecture prévue pour 12 images et « Voici N images » : reste de la relecture par lots (sans coût).
- L'aperçu des noms et les noms imposés : aucun outil ne les appelle (sans coût ; voir 4).
- Un reste sans effet : `const read =2 > 1 ? …` (`brand-chain.ts` l. 621).

---

## Gains restants, du plus gros au plus petit

| # | Correction | Euros par projet | Effet sur l'expérience |
|---|---|---|---|
| 1 | Recherches sur Internet : consigne propre à la marque (une famille par recherche), nombre de recherches réglé sur la trace, pages en double retirées | 0,20 à 0,40 (à mesurer) | égale ou meilleure (plus de vraies paroles) ; marque 2 à 3 minutes plus tôt (recherches en même temps) |
| 2 | Retouche de la signature : logo, scène et téléphone gardés, direction artistique non réécrite ; nom retouché : scène gardée | 0,13 (0,32 par retouche) | meilleure : logo choisi gardé, pas de seconde carte |
| 3 | Logo, scène ou téléphone refaits avant le choix sans repayer la direction artistique (ligne « La marque » écrite par le code) | 0,13 (par planche refaite) | égale, plus sûre (règle du 21 novembre) |
| 4 | Logo refait après le choix : direction d'origine reprise | 0,07 | égale |
| 5 | La reprise relit la mémoire de la planche | 0,06 | égale |
| 6 | Relecteur : « ce que tu vois » limité à 600 caractères (après essai sur le carnet) | 0,05 | égale (à vérifier) |
| 7 | Les quatre équipes de noms partagent leur consigne | 0,05 par tour | égale (à vérifier) |
| 8 | Défauts mesurables corrigés par le code avant le directeur ; mots corrigés du client contrôlés | 0,04 | égale ; moins d'attente |
| 9 | Explications des noms à 120 caractères | 0,04 par tour | égale (à vérifier) |
| 10 | Refus du client mieux repéré pour le dessinateur du logo | 0,03 | meilleure |
| 11 | Grande scène relue avant le téléphone ; pas de téléphone sans logo gardé | 0,03 | meilleure (téléphone cohérent) |
| 12 | Plus de pictogrammes en code ni de ruban dans la planche | 0,02 | meilleure (règle tenue) |
| 13 | Juge des noms repris quand on refait une planche sans consigne | 0,02 | égale |
| 14 | Étude : numéro de page au lieu de l'adresse | 0,01 | meilleure (moins de paroles perdues) |
| 15 | Champs jamais relus retirés (`trials`, `job`, `score`) | 0,01 | égale |
| | **Total** | **environ 0,70 €, et 0,90 à 1,10 € avec les recherches ciblées** | |

À l'occasion, hors total : nouvelle proposition sans consigne (1,60 €), réponse coupée (0,08 à 0,18 €), noms montrés avant
les planches (environ 2 € par série refusée, à proposer au propriétaire).
