Photo du produit : Pixabay n° 3090387 (auteur PIRO4D, licence Pixabay), https://pixabay.com/photos/time-clock-background-wrist-watch-3090387/
Version « avant » (moteur gratuit, sans IA) : faite hors dépôt ; version Qwen : en attente (appel payant non encore lancé).

## Logo ARVEN — Qwen-Image 3.0 Pro (15/10/2026)
- Premier essai : image créée mais perdue (stockage d'Alibaba bloqué par le réseau de l'environnement) — au plus 0,075 $.
- Second essai : `logo-qwen.png`, 1328×1328, facturé au tarif « 1K » (0,04 $ d'après l'API), 28 s.
  Textes exacts (ARVEN, HORLOGERIE, « Le temps, bien porté. » avec l'accent), couleurs demandées respectées.
- Avant : `logo-local*.png` (moteur gratuit, sans IA) ; comparaison : `comparaison-logo.jpg`.

## Publicité ARVEN — Qwen-Image 3.0 Pro (15/10/2026)
- `pub-qwen.png`, 1104×1472 (4:5), photo Pixabay en référence ; facturé « 1K » + 1 image d'entrée (≈ 0,043 $), 17 s.
- Montre fidèle à la photo ; textes exacts SAUF « ACER » au lieu de « ACIER » (faute de l'IA, non corrigée).
- Avant : `pub-local-1x1.png`, `pub-local-4x5.png` (moteur gratuit) ; comparaison : `comparaison-pub.jpg`.

## Publicité corrigée (gratuit, sans IA)
- `pub-qwen-corrigee.png` : « ACER » → « ACIER » réécrit (police Jost), et le vrai logo ARVEN (emblème cadran +
  ARVEN + HORLOGERIE, en ivoire / cognac) remplace le mot « ARVEN » dessiné par l'IA. Script : `scripts/pub-correction-logo.cjs`.

## Deuxième publicité — Qwen-Image 3.0 Pro (15/10/2026)
- `pub2-qwen.png`, 1328×1328 (1:1), style clair (pierre ivoire, vue de dessus) ; références : photo Pixabay + vrai logo.
- Facturé « 1K » + 2 images d'entrée (≈ 0,046 $), 29 s. Textes exacts (« Chaque seconde compte. », « DÉCOUVRIR »),
  logo reproduit fidèlement par l'IA (slogan ajouté sous le logo, comme sur le logo d'origine). Aucune retouche.

## Troisième publicité — Qwen-Image 3.0 Pro (15/10/2026)
- `pub3-qwen.png`, 928×1664 (9:16, story), montre debout sur un bloc cognac, rai de lumière ; références : photo + logo.
- Facturé « 1K » + 2 images d'entrée (≈ 0,046 $), 25 s. Textes exacts (« L'heure juste. », « CHRONOGRAPHE ARVEN »),
  logo fidèle. DÉFAUT : montre vue de face, redessinée → chiffres de la lunette et des petits cadrans déformés
  (« D4 », « 36 »…). Moins fidèle que les deux premières publicités.

## Comparaison de prix avec ChatGPT (OpenAI), dernières générations mesurées
| Création | OpenAI (dernière génération mesurée) | Qwen-Image 3.0 Pro (cet essai) |
|---|---|---|
| Publicité | SONORE 0,215 € ; fleuriste 0,14 € (14/10, gpt-image-1.5, coûts calculés par le studio) | 0,037 à 0,040 € |
| Logo | 0,19 € (10/10, gpt-image-2, haute qualité, 0,2164 $ mesurés sur les jetons) | 0,034 € |
Taux 0,86 € / $. Prix Qwen : liste officielle de l'API (devise supposée USD), à recouper avec la facture Alibaba.

## Une publicité par format — Qwen-Image 3.0 Pro (15/10/2026)
Références : photo Pixabay + vrai logo ; consigne « même angle que la photo » (évite la montre redessinée).
| Fichier | Format | Idée | Résultat |
|---|---|---|---|
| `format-1x1-bureau.png` | 1:1 | bureau en noyer, carnet, stylo, lampe | textes exacts |
| `format-4x5-affiche.png` | 4:5 | affiche bicolore ivoire / cognac, « Acier. Cuir. Caractère. » | textes exacts |
| `format-9x16-velours.png` | 9:16 | velours cognac vu de dessus, « Le temps vous va bien. » | textes exacts |
| `format-16x9-banniere.png` | 16:9 | lin ivoire au soleil, « Un chronographe pour chaque jour. » | faute « Découvir » → corrigée gratuitement : `format-16x9-banniere-corrigee.png` (`scripts/pub-correction-bouton.cjs`) |
Coût : 4 × (0,04 $ + 2 × 0,003 $) ≈ 0,184 $ (facturé « 1K », 2 images d'entrée chacune).

## « chronographe » remplacé par « montre » (gratuit, sans IA)
- `format-1x1-bureau-montre.png` : bouton « Voir la montre » (police Jost).
- `format-16x9-banniere-montre.png` : titre « Une montre pour chaque jour. » (première ligne réécrite en Cormorant).
- Script réutilisable : `scripts/pub-remplace-ligne.cjs`.

## Story « tape-à-l'œil » — Qwen-Image 3.0 Pro (15/10/2026)
- `story-choc.png`, 928×1664 : papier cognac déchiré, montre qui jaillit, étincelles, « ARVEN » géant derrière,
  « Prenez le temps. » + bouton « Découvrir ». Textes exacts, montre fidèle (même angle). ≈ 0,046 $, aucune retouche.

## Story « Luxe cinématique » (ligne visuelle choisie) — Qwen-Image 3.0 Pro (15/10/2026)
- `story-luxe.png`, 928×1664, d'après `reference-style-luxe.png` et `style-luxe-cinematique.md`.
- Textes exacts : « LE TEMPS, BIEN PORTÉ », « Le détail fait l'élégance. » (« l'élégance » en doré), « Découvrir › »,
  « ÉLÉGANCE | CARACTÈRE | ACIER & CUIR ». Montre fidèle, cadran sans logo. Dos des livres : ornements dorés illisibles
  (décor). ≈ 0,046 $, aucune retouche.

## Story « minérale » — même mise en page que la référence, design différent (15/10/2026)
- `story-mineral.png`, 928×1664 : travertin, arche, lumière du jour, pampa. Textes exacts (« HORLOGERIE »,
  « Un classique à votre rythme. », « Découvrir → », « ACIER · CUIR · TROIS COMPTEURS »). Montre fidèle.
  Petit écart : l'aiguille du logo est noire au lieu de cognac. ≈ 0,046 $, aucune retouche.
