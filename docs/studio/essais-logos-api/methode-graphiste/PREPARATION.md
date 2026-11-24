# Méthode des graphistes : préparation (24 novembre 2026)

Rien n'est changé dans SINA. Aucune IA de texte : l'Images API reçoit directement la demande du propriétaire, mot pour mot.

## Phase 1 : deux planches de recherche (`phase1.py`, requêtes dans `phase1/`)

| | Planche 1 | Planche 2 |
|---|---|---|
| Adresse | POST /v1/images/generations | POST /v1/images/generations |
| Modèle | gpt-image-2.5-sunburst | gpt-image-2.6-flare |
| quality | medium | medium |
| complexity | non envoyé (la doc ne le présente que pour la 2.6) | medium |
| size, background, output_format, n | 1536x1024, opaque, png, 1 | 1536x1024, opaque, png, 1 |

Vérification dans la documentation officielle (pages des modèles, référence « generate » et « edit », guide des images,
page des retraits, lues le 24 novembre 2026) :
- 2.5 Sunburst : « It supports `low`, `medium`, `high`, `xhigh`, `max`, and `auto` quality settings » ; 1536x1024 fait
  partie des « standard sizes » ; « support `opaque` and `transparent` backgrounds » ; png est la valeur par défaut.
- 2.6 Flare : medium accepté ; « The supported complexity levels for Sunburst and Flare are `low`, `medium`, and `high` ».
  Le fond `opaque` n'est pas écrit noir sur blanc pour la 2.6, mais rien ne l'exclut, et il a été accepté par
  2.6 Sunburst dans nos essais Halo et Tenon.
- Aucun des deux modèles n'est annoncé comme retiré.
- L'Images API ne renvoie pas de consigne réécrite : « Not returned by GPT image models ». Il n'y aura donc pas de
  `revised_prompt` en phase 1 (le modèle d'image dessine directement la demande). Elle renvoie la consommation (`usage`).

Coût estimé (formule officielle du calculateur d'OpenAI, voir `docs/studio/couts/03-couts-des-images.md`) :
- 2.5 Sunburst, medium, 1536x1024 : 343 jetons produits, environ 0,01 € ;
- 2.6 Flare, medium, 1536x1024 : 1 132 jetons produits, environ 0,03 € ;
- **phase 1 : environ 0,04 €.** Le coût réel est calculé ensuite à partir de la consommation renvoyée.

Garde-fous : une seule image par modèle, aucune reprise ; si le premier appel échoue, le second n'est pas lancé.

## Phase 3 (après le choix du propriétaire) : préparée ensuite

POST /v1/images/edits, gpt-image-2.6-sunburst, une esquisse découpée par requête, envoi en formulaire avec `image[]`
(la forme déjà utilisée par le Studio). Coût estimé : environ 0,06 € par logo en `high` carré, soit environ 0,12 € pour
les deux. La requête exacte sera montrée avant l'appel.
