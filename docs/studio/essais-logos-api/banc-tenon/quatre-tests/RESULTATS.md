# Quatre tests Tenon (24 novembre 2026) : sans instructions système / avec le prompt du propriétaire

Demande identique pour les quatre : « Crée un logo moderne et original pour mon entreprise Tenon. Je suis menuisier et je réalise des cuisines et des dressings sur mesure. Fond blanc. »

Configuration identique : `POST https://api.openai.com/v1/responses`, texte `gpt-6.2-astra`, outil `image_generation` avec `gpt-image-2.6-sunburst`, quality `high`, complexity `high`, size `1024x1024`, background `opaque`, output_format `png`, action `generate`, tool_choice forcé sur l'outil de dessin. Aucune image de référence, aucun previous_response_id, aucun post-traitement. SANS : aucun champ `instructions`. DA : `instructions` = `../INSTRUCTIONS-DIRECTEUR-ARTISTIQUE.md` mot pour mot.

Le modèle de dessin réellement utilisé n'est pas renvoyé par OpenAI dans la réponse (l'appel de dessin ne porte pas de champ `model`). L'en-tête `x-request-id` n'était pas présent ; les identifiants de réponse et d'appel de dessin sont donnés ci-dessous.

## SANS1

- Réponse : `resp_009ca264983ae23c006b04e8b300dc87d2a396ea34f7f06fd4` ; appel de dessin : `ig_009ca264983ae23c006b04e8b46b7887d29385d0dd5d3c6c83` ; statut : completed
- Durée totale : 33.5 s ; jetons texte : 1880 en entrée, 263 en sortie
- Coût : dessin estimé 0,046 € (OpenAI ne le détaille pas dans la réponse) ; texte de gpt-6.2-astra non chiffré (prix non vérifié)
- Paramètres renvoyés par OpenAI : quality high, size 1024x1024, background opaque, format png, action generate
- revised_prompt :

```
Crée un logo professionnel, original et minimaliste pour « Tenon », artisan menuisier créateur de cuisines et dressings sur mesure. Un seul logo final sur fond blanc pur, présenté de face, centré avec de belles marges, sans mockup. Composition horizontale élégante : à gauche un emblème abstrait compact dessinant la lettre T par l'emboîtement très lisible de deux pièces en aplats, inspiré du profil en escalier d'une véritable liaison tenon-mortaise, en teintes noyer brun profond et ocre chêne. À droite le nom exact « Tenon » dans un lettrage sur mesure brun profond, moderne, chaleureux, robuste, avec un subtil rappel de l'encoche dans le T, excellente lisibilité. Sous le nom, petite signature en capitales très lisibles : « CUISINES & DRESSINGS SUR MESURE ». Identité graphique vectorielle soignée et intemporelle, équilibre optique, très peu de formes, pas de grain, pas de dégradé, pas d'outils de bricolage, ni maison ni arbre. Travail digne d'un studio de design d'identité visuelle.
```

## SANS2

- Réponse : `resp_01ca54b9eb778be9006b04e8d4484087d2bc487faa4fd4a28a` ; appel de dessin : `ig_01ca54b9eb778be9006b04e8d5ae1887d2b901885664f63fa2` ; statut : completed
- Durée totale : 32.8 s ; jetons texte : 1856 en entrée, 239 en sortie
- Coût : dessin estimé 0,046 € (OpenAI ne le détaille pas dans la réponse) ; texte de gpt-6.2-astra non chiffré (prix non vérifié)
- Paramètres renvoyés par OpenAI : quality high, size 1024x1024, background opaque, format png, action generate
- revised_prompt :

```
Créer un seul logo vectoriel moderne, original et haut de gamme pour la menuiserie française « Tenon », spécialisée en cuisines et dressings sur mesure. Sur fond blanc pur, une composition horizontale parfaitement centrée, généreux espace blanc : à gauche un monogramme T géométrique ingénieux évoquant l’emboîtement précis de deux pièces de bois, un tenon et une mortaise ; aplats de brun noyer profond et de chêne miel, silhouette forte et simple, lignes de séparation en réserve blanche. À droite, mot-symbole exact « Tenon » dans un lettrage contemporain distinctif, sobre, couleur brun noyer très sombre, dessin finement ajusté. Sous le nom, petite signature bien lisible en capitales espacées : « CUISINES & DRESSINGS SUR MESURE ». Équilibre entre signature d’architecte d’intérieur et savoir-faire artisanal. Rendu graphique plat, net, sans ombre, sans dégradé, sans texture ni mockup, ni outils de menuiserie clichés.
```

## DA1

- Réponse : `resp_068244e93bbdceca006b04e8f5440487d29f604c709b79df8f` ; appel de dessin : `ig_068244e93bbdceca006b04e8f6d91087d2aa21d2b9ca7f65f5` ; statut : completed
- Durée totale : 38.9 s ; jetons texte : 2276 en entrée, 291 en sortie
- Coût : dessin estimé 0,046 € (OpenAI ne le détaille pas dans la réponse) ; texte de gpt-6.2-astra non chiffré (prix non vérifié)
- Paramètres renvoyés par OpenAI : quality high, size 1024x1024, background opaque, format png, action generate
- revised_prompt :

```
Un unique logo d'agence de branding pour « Tenon », menuisier créateur de cuisines et dressings sur mesure. Fond parfaitement blanc uni. Créer un mot-symbole sur mesure, avec exactement le texte « Tenon » (T majuscule, enon minuscules). Aucune autre inscription. Sensation de précision architecturale et de tactilité artisanale, sophistication chaleureuse. Encre unique brun noyer très foncé. Dessiner de vraies lettres originales, charnues, aux contreformes ouvertes ; la traverse du T et son fût s'emboîtent par une subtile découpe blanche en escalier de type assemblage à mi-bois, un détail structurel net plutôt qu'une illustration. Les deux n identiques ont une épaule en arche légèrement aplatie et des pieds coupés droit, o légèrement carré aux angles adoucis, e d'excellente lisibilité. Silhouette du nom cohérente et mémorable, crénage optique soigné. Mot centré sur le blanc avec ample respiration, grande taille, aplats vectoriels à bords impeccables. Pas de symbole séparé, pas d'outils, pas de dessin de cuisine, pas de grain de bois, ni texture, ni ombre, ni effet 3D, ni mockup.
```

## DA2

- Réponse : `resp_0cb98875484357c2006b04e91c240487d2b30f13b250c1398e` ; appel de dessin : `ig_0cb98875484357c2006b04e91dc3e887d28a6b629696cb7585` ; statut : completed
- Durée totale : 38.7 s ; jetons texte : 2295 en entrée, 310 en sortie
- Coût : dessin estimé 0,046 € (OpenAI ne le détaille pas dans la réponse) ; texte de gpt-6.2-astra non chiffré (prix non vérifié)
- Paramètres renvoyés par OpenAI : quality high, size 1024x1024, background opaque, format png, action generate
- revised_prompt :

```
Crée une seule identité graphique haut de gamme : un logotype original qui écrit exactement « Tenon » (T majuscule, enon minuscules), pour un artisan menuisier français créant cuisines et dressings sur mesure. Fond blanc pur uni. Le logo est exclusivement typographique : dessiner les cinq lettres comme un alphabet sur mesure, aux courbes extérieures subtilement tendues et aux contreformes chaleureuses, une silhouette solide et basse en encre brun noyer très sombre. Détail signature : la traverse du grand T est emboîtée sur son fût, indiquée par une fine découpe blanche en escalier dessinant le profil précis d'un tenon de bois ; ce détail très simple et intentionnel reste discret, préserve l'évidence de lecture. Les deux n identiques ont des épaules généreuses à la jonction légèrement carrée, le e est ouvert, le o parfaitement maîtrisé. Style graphique de maison d'agencement contemporaine, sincère, tactile sans texture, architectural sans froideur. Crénage optique soigné, lettres proches mais distinctes. Composition centrée avec belle marge blanche, logo assez grand. Aplats vectoriels nets. Aucun autre texte, aucun slogan, aucune icône annexe, aucun décor, aucun effet 3D, ni ombre ni dégradé. Présentation frontale d'un logo final, pas une maquette.
```
