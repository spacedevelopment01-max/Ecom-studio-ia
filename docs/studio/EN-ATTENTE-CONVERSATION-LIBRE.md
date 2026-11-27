# En attente : SINA comprend et fait tout ce qu'on lui demande

**État : en attente.** Le 27 novembre 2026, le propriétaire a dit « on le fera plus tard » pour tout ce chantier. Il reprend
après l'essai de la maroquinerie. Rien de ce qui est commencé n'est envoyé.

## Ses mots (27 novembre 2026)

- « ce genre de truc doit être fait de base, a la base sina est une ia de conversation donc tout ce qu'on lui demande elle
  doit le comprendre et le faire, par exemple si je lui dit je veux que tu me refasse une planche de 12 logos différent du
  premier et bien elle le fait, si je suis dit j'aime bien le logo 3 et 6 mais améliore le elle doit comprendre que l'idée
  est bonne mais elle doit garder l'idée du logo et l'améliorer »
- « Oui mais c'est pour tout enfaite, presque on devrais lui demander une recette de cuisine et elle devrais répondre avec
  une recette, on doit pouvoir échanger sur tout et elle doit tout comprendre, une ia quoi. Alors bien sûr on travail sur
  le fond de ce qu'elle doit faire mais je ne comprend qu'on puisse pas lui demander directement quelque chose pour
  qu'elle modifie, et ce sera comme ça pour chaque étape enfaite »
- « si elle a l'API d'OpenAI, elle a juste à lui demander le logo 6 qu'il va le faire sur la planche »

## État des lieux (sans dépense)

- **La conversation libre.** Aucun contrôle du code ne bloque une question hors du Studio ; seules des consignes recadrent :
  `prompt.ts:4`, `prompt.ts:35` et surtout `journey.ts:398` (« Avec lui, tu ne parles que de ces neuf étapes, par leur
  nom »). Le prix mesuré d'une réponse est d'environ 0,04 € (0,80 € pour les 21 réponses de Nadia).
- **Modifier avec une demande libre, étape par étape :**
  - le site est l'étape la plus complète (clic sur l'aperçu, `custom.edit`, `custom.structure`, `custom.photo`,
    `custom.undo`) ;
  - les esquisses : `logo.pistes` n'évite que les pistes gardées de l'état courant, et repart de zéro sur un autre nom ;
  - un logo fini : seule la couleur se retouche (`logo.couleurs`) ; « améliore-le » et « le 3 avec le symbole du 6 »
    n'ont aucun outil ;
  - la planche de marque : `guidance` n'est pas transmis à la planche refaite (`brand-chain.ts:1104-1120`) ;
  - la planche en vrai : aucune correction libre ;
  - les noms, les angles et les publications : on peut tout refaire, mais pas retoucher un seul élément.
- **Les épreuves en jeu.** La demande du client ne doit pas entrer dans la finalisation du logo
  (`phrase-de-l-esquisse-au-choix-du-client`, `reprise-du-logo-a-partir-du-refuse`) ni dans la recherche d'esquisses
  (`couleurs-variees-dans-la-recherche`). Une retouche à part, comme `logo.couleurs`, ne les contredit pas. Elle ne heurte
  que la consigne non scellée `prompt.ts:37`.

## L'ordre décidé

1. La conversation libre : SINA répond vraiment, puis ramène au projet en une phrase. Avec une épreuve
   « question-hors-du-studio ».
2. « 12 esquisses différentes » : la liste à éviter prend toutes les pistes montrées ou relues (gardées et refusées), de
   toutes les recherches et de tous les noms ; aucun mot du client ne part à la recherche.
3. Retoucher un seul nom ou un seul angle avec ses mots ; un nom écrit par le client lui-même est accepté.
4. **Un seul outil d'image générique, `image.modifier`**, valable à toutes les étapes :
   - en entrée, une ou plusieurs images du projet désignées par SINA ;
   - une consigne écrite par SINA à partir des mots du client, envoyée à OpenAI en edits, images jointes, avec les règles
     du Studio ajoutées ;
   - une nouvelle version enregistrée à côté de l'ancienne, avec retour possible ;
   - la relecture habituelle et la carte au coût probable.

   Les outils qui font mieux restent (`logo.choisir`, `logo.pistes`).
5. Les planches (de marque et en vrai), une fois l'essai de la maroquinerie fini.

## La phrase d'accord élargie (à faire écrire au propriétaire)

« Oui : quand le client demande lui-même une modification d'une image de son projet (logo fini, esquisse, photo,
publication, et plus tard une case de planche), SINA la fait en retouche à part, avec ses mots, en gardant tout le reste et
les règles du Studio ; elle ne lui demande jamais ce qu'il veut dans son logo. »

## Estimations

- Points 1 à 3 : environ 1 h 30 à 2 h, suite complète comprise.
- L'outil générique : environ 2 à 3 h de plus, après l'accord.
- Une retouche réelle : quelques centimes (une image en edits et une relecture), à chiffrer au moment du plan.

## Le travail commencé, gardé de côté (branches locales, jamais envoyées)

- `travail-conversation-libre` : le début du point 1 (`prompt.ts`, `journey.ts`, `controle-message.ts`), non vérifié.
- `travail-nom-entier-esquisses` : le contrôle du nom écrit en entier sur les esquisses de remplacement (cases avec le
  seul monogramme), demandé pour le lot de corrections de la fin de la maroquinerie. Non vérifié.

## Le tester par la conversation

Lancer le Studio privé (`scripts/syna-recette/lancer-agent.mts`, clé Claude dans `STUDIO_ANTHROPIC_KEY`), puis jouer le
client avec `node scripts/syna-recette/client.mjs <email> "<phrase>"`, `@oui`, `@etat`, `@attendre`.
