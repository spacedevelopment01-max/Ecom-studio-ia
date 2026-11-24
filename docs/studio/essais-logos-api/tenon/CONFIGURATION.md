# Essai « Tenon » (24 novembre 2026, vers 1 h 15) : la configuration exacte

Essai fait par le chef d'orchestre, hors du Studio, avec `script-utilise.py`. Ce n'est PAS le chemin du Studio en ligne.
Aucun nouvel appel n'a été lancé pour écrire ce document.

## Modèles et point d'entrée

- Point d'entrée : `POST https://api.openai.com/v1/responses` (Responses API), pour tous les appels.
- Modèle qui réfléchit et écrit les consignes de dessin : `gpt-6.2-astra`.
- Modèle de dessin demandé dans l'outil : `gpt-image-2.6-sunburst`. La réponse d'OpenAI n'a pas été enregistrée en entier :
  rien ne prouve que ce modèle-là a bien dessiné.
- Relecteur (n'influence pas le dessin) : `gpt-6.2-sol`, une image à la fois.

## Requêtes

4 requêtes de dessin, dont le texte exact est dans `requetes-exactes.json` :
1. le tour 1 dessine les logos 1, 2 et 3 en une seule requête ;
2. trois reprises, chacune avec `previous_response_id`, donnent les logos 4, 5 et 6.

On n'envoie pas une consigne par logo. Le modèle `gpt-6.2-astra` écrit lui-même la consigne de chaque logo : c'est le
`revised_prompt`, recopié en entier dans `journal.json` (champ « consigne »).

## Paramètres de l'outil de dessin

| Paramètre | Valeur envoyée |
|---|---|
| quality | `high` |
| size | `1024x1024` |
| complexity | non envoyé (valeur par défaut d'OpenAI : `high`, d'après sa documentation) |
| background | non envoyé (valeur par défaut : `auto`, c'est le modèle qui choisit) |
| output_format | non envoyé (PNG par défaut) |

## Images de référence

- Aucune image n'a été jointe volontairement.
- Pour les reprises (logos 4 à 6), `previous_response_id` donne au modèle tout le fil d'avant, donc aussi les logos déjà
  dessinés.

## Images brutes

`images-brutes/logo1.png` à `logo6.png` : le contenu exact renvoyé par OpenAI, décodé, sans aucun traitement.
Toutes font 1024 × 1024 pixels. Les logos 2 et 3 ont un FOND TRANSPARENT (couche alpha : 57 % et 76 % de l'image
transparente). OpenAI les a rendus ainsi de lui-même, puisque `background` valait `auto`.

## Traitements après génération

- Aucun sur les images brutes.
- Seulement pour les montrer, j'ai réduit les images à 420 pixels et les ai assemblées sur une planche. **Faute du chef
  d'orchestre** : en assemblant, je n'ai pas géré la transparence. Les zones transparentes sont devenues noires, et les
  logos 2 et 3 ont eu l'air « flous, néon sur fond noir ». Posé correctement sur du blanc, le logo 3 est un logo bleu
  net et plat, conforme à sa consigne. Le logo 2 a vraiment une tache floue sous le dessin, dans sa transparence. Le
  même défaut d'affichage touche le logo 3 des essais `tenon-25` et `tenon-26`, et les tours 1 et 3 de l'essai « latest ».

## Coût et temps

Ni le coût ni le temps de chaque appel n'ont été enregistrés par ce script : c'est un manque.
Estimation : environ 0,05 € par logo, d'après la mesure faite le même soir avec l'Images API (`gpt-image-2.6-sunburst`,
`high`, 1024 × 1024, 0,046 €). Le texte et les relectures sont en plus. L'essai entier a coûté environ 0,35 € (estimé).
