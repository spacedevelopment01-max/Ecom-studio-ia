# Méthode des publications sociales, validée par le propriétaire (24 novembre 2026)

Ses mots : « Les trois dernières publications Poppy correspondent au niveau graphique recherché pour SINA. Conserve
intégralement la méthode, les paramètres API, le modèle utilisé et la structure des prompts ayant permis d'obtenir ces
résultats. » Preuves : `poppy-posts-v2/` (requêtes exactes, réponses complètes, images brutes et finales, bilan).

## Paramètres exacts
- `POST https://api.openai.com/v1/images/edits`, formulaire multipart, une seule image jointe : le logo officiel.
  Aucune planche, aucune photo d'ambiance. Les vraies photos du produit concerné, quand le client en a, s'ajoutent.
- `gpt-image-2.5-sunburst`, `quality` high, `background` opaque, `output_format` png, `n` 1, sans complexité.
- Taille demandée : multiple de 16 juste au-dessus du format final (1088x1088, 1088x1360, 1088x1936), puis recadrage
  central au format exact (1080x1080, 1080x1350, 1080x1920), sans agrandissement ni déformation.
- Une publication par appel, indépendante, aucune reprise automatique.

## Structure du texte envoyé (aucune réécriture par un modèle de texte)
1. « Crée une publication pour les réseaux sociaux de {marque}, {métier}. Format {nom} {L × H}. »
2. « Accroche, écrite exactement : « … ». »
3. L'objectif marketing en une ou deux phrases (émotion, produit et désir, humour et engagement…) et la liberté de
   composition.
4. Une phrase d'identité : palette avec codes, typographies, ton.
5. Les exigences communes : le logo signe sans monopoliser et n'est pas redessiné ; un sujet principal, une accroche
   forte, une hiérarchie claire ; pas d'accumulation de slogans, pictogrammes, blocs de réassurance ou textes
   secondaires ; aucune caractéristique, garantie, certification ou performance inventée ; textes en français.

## Principes (tous métiers)
Chaque publication est générée seule, avec un objectif précis, une composition libre ; personnages, décors, cadrages,
couleurs dominantes et mises en scène varient naturellement ; les trois publications Poppy ne sont jamais des modèles fixes.

## Planche d'identité
La planche est une présentation ; les publications sont des fichiers finaux. Dans la planche, elles sont posées par le
code (fichiers originaux réduits proportionnellement, même hauteur, ratios exacts, aucun recadrage), jamais redessinées
par OpenAI. Exemple : `planches-poppy-v3/assembler.py`.
