# Ce que SINA demande avant la marque

Cahier ouvert le 27 novembre 2026, à la demande du propriétaire : « Et bien c'est le but de poser des questions au client
avant de démarrer le projet afin de savoir ce que peux être générer en image ce qui peux être générer en texte sans que
sa porte défaut ».

**Ce cahier est lu par le code** (`src/lib/syna-agent/faits-a-montrer.ts`) : le modifier change ce que SINA demande.

## À quoi il sert

Les images de la marque (la planche de marque, la planche en vrai, les publications) et le site peuvent porter de petits
textes : une étiquette, un sachet, une fiche produit, un pied de page. Un modèle d'images qui ne sait rien les remplit de
mots plausibles (une origine, un poids, une année, un label) : ce sont des inventions, et elles font refuser l'image.

SINA demande donc, pendant « Faire connaissance », avant le résumé et avant la planche de marque, les faits que lui seul
connaît et qui peuvent s'écrire. Chaque réponse est rangée dans sa fiche, partie « faits à montrer », avec son état :

- **donné** : sa réponse, mot pour mot ; elle peut s'écrire sur les étiquettes, les emballages, les fiches et le site ;
- **je ne sais pas** : rien ne s'écrit à cet endroit ; les petits textes restent de simples traits, sans mot lisible ;
- **je ne veux pas le montrer** : traité comme absent partout, et refusé s'il apparaît.

## Les règles

- Une question à la fois. Une question par sujet, qui vaut pour tous ses produits ou toutes ses prestations d'un coup
  (« Pour chacun de tes produits, quels formats ou quels poids ? »).
- Elle rappelle toujours qu'il peut répondre « je ne sais pas » ou « je préfère ne pas le montrer » (deux boutons sont
  posés par le Studio sous chaque question).
- Elle ne redemande jamais un fait déjà donné ou refusé : le Studio relit sa question et la renvoie si elle le fait.
- Elle n'enregistre que ce qu'il a écrit, avec ses mots (`start.fait`), jamais une réponse à sa place.
- Jamais de question sur le logo.
- Ce qui n'est pas dans une partie ci-dessous ne se demande pas ici : SINA le note s'il le dit de lui-même.

## Comment lire les parties

Chaque partie dit quand elle s'applique : « toujours », « produits » (une boutique), « services » (des prestations), ou
« mots » suivis des mots qui reconnaissent le métier dans ce que le client a dit de son offre (un mot entier, au singulier
ou au pluriel ; suivi de « * », le début d’un mot : « torréfa* » reconnaît « torréfacteur »). Chaque ligne :
`- sujet | portée | mots qui reconnaissent la question | ce que SINA demande`. La portée est « marque » (une réponse pour
la marque) ou « chacun » (une réponse par produit ou par prestation). Le sujet « noms » donne la liste des produits ou des
prestations : tant qu'il n'est pas donné, les sujets « chacun » attendent.

## Partie : une boutique (quand : produits)

- noms | marque | noms? exacts?|comment s'appellent|nom de chaque|noms de (tes|chacun) | Le nom exact de chacun de tes produits, tel qu'il doit s'écrire sur une étiquette.
- formats | chacun | \bformats?\b|\bpoids\b|contenances?|grammages?|en quels? (formats?|tailles?) | Pour chacun, ses formats, ses poids ou ses contenances.
- origine | chacun | \borigines?\b|provenance|d'où (vient|viennent) | Pour chacun, son origine ou sa provenance.
- mentions | chacun | \bmentions?\b|\blabels?\b|certifi|\bbio\b|appellation | Pour chacun, ses mentions et ses labels, s'il en a (bio, appellation, certification).
- fabrication | chacun | où (est|sont)-(il|ils|elle|elles) (fabriqu|transform|torréfi)|où (est-ce|c'est) (fabriqué|fait|transformé|torréfié)|lieu de (fabrication|transformation|torréfaction)|(fabriqué|transformé|torréfié)e?s? où | Pour chacun, où il est fabriqué ou transformé.

## Partie : des prestations (quand : services)

- noms | marque | noms? exacts?|comment s'appellent|nom de chaque|noms de (tes|chacune) | Le nom exact de chacune de tes prestations, tel qu'il doit s'écrire sur ton site.
- durees | chacun | \bdurées?\b|combien de temps dure|dure combien|dure-t-elle | Pour chacune, sa durée.
- lieu | chacun | où (se passe|a lieu|ça se passe)|\blieu\b|à domicile|en cabinet | Pour chacune, le lieu où elle se passe (chez toi, chez ton client, en ligne, une adresse).

## Partie : une boutique alimentaire (quand : mots épicerie, confiture, miel, chocolat, thé, infusion, biscuit, gâteau, pâtisserie, huile, vinaigre, sauce, épice, conserve, fromage, charcuterie, sirop, jus, bière, vin, cidre, biscuiterie, confiserie, aliment*)

- composition | chacun | composition|ingrédients?|allergènes? | Pour chacun, sa composition ou ses ingrédients, tels qu'ils peuvent s'écrire sur l'étiquette.

## Partie : le café (quand : mots café, torréfa*, torréfi*, expresso, espresso, arabica, robusta, barista)

- torrefaction | chacun | degré de torréfaction|torréfaction (claire|moyenne|foncée|légère)|torréfié (clair|foncé)|niveau de torréfaction | Pour chacun, son degré de torréfaction (clair, moyen, foncé, avec tes mots).
- notes_de_gout | chacun | notes? de goût|notes? aromatiques?|\barômes?\b | Pour chacun, ses notes de goût, telles que tu les écris.

## Partie : un artisan (quand : mots artisan, artisane, atelier, fait main, faits main, à la main, sur mesure, céramique, poterie, menuiserie, ébéniste, bijou, bijoux, maroquinerie, couture, tissage, savon, bougie, verrier, tourneur)

- matieres | chacun | matières?|matériaux?|en quoi (est|sont)|quel bois|quel cuir|quelle terre | Pour chacun, ses matières, telles qu'elles peuvent s'écrire.

## Partie : le cuir (quand : mots cuir, maroquin*, sellier, sellerie)

- tannage | chacun | \btannages?\b|\btanné|tannerie | Pour chacun, le tannage de son cuir (végétal, au chrome, avec tes mots).
- coutures | chacun | \bcoutures?\b|\bcousus?\b|point sellier | Pour chacun, comment il est cousu (à la main, à la machine, au point sellier, avec tes mots).
- finitions | chacun | \bfinitions?\b|\btranches?\b|\bcoloris\b|teintes? du cuir | Pour chacun, ses finitions et ses teintes (tranches, coloris), telles qu'elles peuvent s'écrire.

## Partie : la marque (quand : toujours)

- annee | marque | année de (création|naissance)|depuis quand|créée? en|fondée? en|en quelle année|date de création | L'année de création de ton entreprise.
- ville | marque | \bville\b|quelle commune|où es-tu installé|où êtes-vous installés|où se trouve ton atelier | La ville de ton entreprise, et si tu veux qu'elle apparaisse sur tes images et ton site.
