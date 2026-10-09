# Stabilité du serveur de développement et import opentype.js

Mesures faites dans ce conteneur avec la vraie base du studio (50 comptes, 120 projets), une session administrateur réelle et Chromium. Il n'y a aucune clé de fournisseur, ni dans la base ni dans l'environnement : aucun appel IA n'était possible. Les conditions d'un Codespace de 8 Go ont été reproduites : `taskset` sur 2 processeurs et tas Node limité à 4 Go (`--max-old-space-size=4096`, la valeur que Next fixe lui-même : 50 % de la RAM).

## Problème 1 — « 'opentype.js' does not contain a default export »

**Cause prouvée.**
- La version installée est opentype.js **2.0.0**. Sa version ESM (`dist/opentype.mjs`), celle que Next.js charge, ne contient **que des exports nommés** : `parse`, `Font`, `Glyph`, `Path`, `BoundingBox`, `load`, `loadSync`. Il n'y a pas d'export par défaut.
- `src/lib/logo-v2/construct.ts` faisait `import opentype from "opentype.js"`. Dans Next, `opentype` valait donc `undefined`, d'où l'avertissement « Attempted import error », présent dans le journal du build de `main`.
- Le `try/catch` de `missingGlyphs` **avalait l'erreur** et renvoyait « aucun caractère manquant ». Le contrôle des caractères du nom (accents, caractères absents d'une police) ne s'exécutait donc jamais sur le serveur.
- Les tests ne le voyaient pas, car vitest charge la version CommonJS, où l'import par défaut fonctionne.

**Correction.**
- Import nommé : `import { parse as parseFont } from "opentype.js"`.
- La police est lue sur la copie exacte de ses octets.
- Une police illisible n'est **plus masquée** : l'erreur est levée avec le nom et le fichier de la police.
- Un seul fichier du studio utilise opentype.js : c'est vérifié dans `src`, `worker` et `scripts`.

**Test** : `tests/opentype-esm.test.ts` force le chargement de la version ESM, comme dans Next. Ses vérifications :
- aucun export par défaut, `parse` présent ;
- « Sébastien Blanc » est accepté, « 漢 » est détecté comme absent de la police ;
- construction typographique et export SVG vectoriel, sans image matricielle.

Remis sur l'ancien code, ce test échoue (2 tests sur 3) : il détecte donc bien le problème.

## Problème 2 — « next dev -p 3000 exited with code 0 » et requêtes de 5 à 18 s

### Cause 1 (prouvée) : un second `npm run dev` pendant que le studio tourne

- **Dans le code de Next 15.5** (`next/dist/cli/next-dev.js`), le processus parent `next dev` se termine avec le code **0** dès que son serveur enfant s'arrête avec un code autre que 77 (77 = redémarrage demandé par Next).
- **Le Codespace lance `npm run dev` à chaque connexion** (`postAttachCommand` dans `.devcontainer/devcontainer.json`). Quand le studio tournait déjà (Codespace resté actif, ou relance manuelle, que je vous avais moi-même conseillée), le second `next dev -p 3000` trouvait le port occupé (`EADDRINUSE`). Il s'arrêtait alors et affichait exactement : `[web] next dev -p 3000 exited with code 0`.
- **Reproduit ici à l'identique.** Pire : le worker du second lancement restait actif. Deux workers se partageaient alors les tâches et le processeur. Tué à la main, le worker orphelin était même relancé par `concurrently` (option `--restart-tries`).

**Correction : `scripts/dev.mjs`, désormais appelé par `npm run dev`.**
- Si le port 3000 répond déjà, rien n'est lancé. Un message clair, en français et en anglais, explique comment ouvrir ou redémarrer le studio, et le lanceur sort avec le **code 1** : l'échec reste visible.
- Le site et le worker sont lancés avec `--kill-others` : s'ils s'arrêtent définitivement, ils s'arrêtent ensemble. Il n'y a jamais de worker orphelin ni de site sans worker. Les relances automatiques existantes (5 essais) sont conservées : on ne masque rien.
- Le lanceur ajoute `node_modules/.bin` au PATH. Lancé sans npm, il échouait sinon avec le code 127 : un défaut que j'ai introduit, puis vu et corrigé pendant les essais.

### Cause 2 (prouvée) : requêtes empilées par l'interface

- **Le mécanisme.** `useApi` (`src/components/ui.tsx`) relançait la requête toutes les 3 à 3,5 s avec `setInterval`, **sans attendre la réponse précédente**.
- **Mesure de référence (avant correction, 6 min, 2 processeurs) :**
  - `/api/projects/<projet>` : 128 appels, 14,5 s de réponse en moyenne ;
  - `/api/projects/<projet>/workflow` : 80 appels, 22,9 s en moyenne ;
  - soit jusqu'à environ 7 requêtes en vol en même temps par écran, qui ralentissaient encore le serveur ;
  - le Pilote ne finissait pas de charger (délai de 120 s dépassé, 2 fois sur 3).
- Une fois le serveur chaud et seul, les mêmes routes répondent en 0,1 à 0,3 s : ce n'est pas leur code qui est lent.

**Correction.**
- `src/lib/poll.ts › startPolling` : une requête à la fois. Un tour est sauté tant que la précédente n'a pas répondu, et rien n'est envoyé quand l'onglet est masqué.
- Utilisé par `useApi` et par les deux suivis de rédaction (`content-panel.tsx`, `tab-blog.tsx`).

### Cause 3 (prouvée) : recompilations répétées en développement

- Par défaut, Next libère une route compilée après **60 s** d'inactivité. Chaque retour sur un onglet du studio recompilait ainsi environ 4 400 modules, ce qui prend 2 à 5 s.
- Dans la mesure de référence, plusieurs routes ont été compilées 3 fois en 6 minutes : `/memory`, `/theme/custom`, `/preview`.

**Correction (`next.config.ts`, développement seulement).** `onDemandEntries: { maxInactiveAge: 30 min, pagesBufferLength: 60 }`. Mesuré après correction : chaque route n'est compilée qu'une fois.

### Pistes vérifiées et écartées (avec preuve)

- **Exceptions non interceptées** : Next 15 les journalise sans arrêter le serveur (`router-server.js`). Aucun `process.exit` n'existe dans `src/`.
- **Code du studio lent, une fois chaud** : profil processeur de 25 à 40 s pendant l'ouverture des onglets Marque et Boutique, serveur au repos 92 à 94 % du temps. Marque s'ouvre en 1,4 s et Boutique en 1,5 s.
- **Vignettes de direction** : le cache fonctionne (empreinte stable ; 15 s pour la première vignette, Chromium compris, puis 0,1 s). Elles ne coûtent qu'à la première visite d'un projet.
- **Caches de l'application** : 0,3 Mo de vignettes. Les 1,6 Go de tas et 1 Go de tampons mesurés au repos viennent de la compilation de développement de Next (webpack), pas du studio.

## Mesures avant et après correction (2 processeurs, tas 4 Go, 6 min)

| | Avant | Après (départ à froid) |
|---|---|---|
| Tours complets Administration → Pilote → Marque → Boutique | 3 (dont 2 délais dépassés sur le Pilote) | 8, sans aucun délai dépassé |
| Administration (après le premier tour) | 7 à 16 s | 1,6 à 4 s |
| Pilote (après le premier tour) | 120 s (délai dépassé) | 3,5 à 4,2 s |
| Marque (après le premier tour) | 35 à 53 s | 8 à 11 s* |
| Boutique (après le premier tour) | 15 à 17 s | 5 à 14 s* |
| Pic mémoire du serveur Next | 5,2 Go | 4,6 Go |
| Recompilation d'une même route | jusqu'à 3 fois | 1 fois |

\* Ce temps va jusqu'au « réseau calme » mesuré par le navigateur. Les interrogations régulières de l'onglet le prolongent. Mesuré seul et à chaud, l'onglet Marque s'ouvre en 1,4 s.

Le premier passage reste long (10 à 45 s par page) : c'est la compilation initiale du mode développement.

## Test d'endurance de 15 minutes

[À compléter : résultats du test d'endurance]

## Problèmes encore non résolus

- **Mémoire du mode développement** : 4,2 à 4,6 Go pour le seul serveur Next. Dans un Codespace de 8 Go, avec VS Code, le worker et Chromium pour les vignettes, la marge est faible. Je n'ai pas prouvé d'arrêt par manque de mémoire dans votre Codespace : je n'ai pas accès à ses journaux système. Si Linux tue le serveur Next pour manque de mémoire, Next ne le relance pas, et le site ne répond plus sans aucun message « exited ». Le mode production (`npm run build` puis `npm start`) consomme beaucoup moins : voir la mesure ci-dessous.
- **Premier passage lent** : c'est inhérent au mode développement (compilation à la demande). Turbopack pourrait réduire ce temps, mais je ne l'ai pas activé, faute de l'avoir validé sur tout le studio.
- Le script `start` (production) garde l'ancien lancement : il ne protège pas encore contre un double lancement.
