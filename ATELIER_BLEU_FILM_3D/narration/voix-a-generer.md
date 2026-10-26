# Voix off — texte prêt à enregistrer ou à générer

Le film contient déjà une voix française de synthèse **gratuite** (Kokoro, voix « ff_siwis », générée sur la machine,
sans service en ligne). Si vous voulez une voix plus chaleureuse (comédien ou voix de synthèse d'un service), voici
exactement ce qu'il faut fournir. Le montage se recale ensuite tout seul sur la durée réelle de votre fichier.

## Texte (13 phrases, dans cet ordre)

1. Votre métier, vous le connaissez.
2. Mais votre site, vos visuels et votre communication vous prennent du temps.
3. E-COM STUDIO IA rassemble leur création dans un seul espace.
4. Vous décrivez votre activité, vos prestations, votre zone d'intervention et le style que vous aimez.
5. Le studio vous aide à créer votre logo, vos couleurs et votre identité.
6. Vous construisez ensuite un site qui explique vos services, présente vos réalisations et indique comment vous contacter.
7. À partir de cette même identité, préparez vos visuels, vos publications et vos publicités.
8. Vous gardez la main sur les contenus et les ajustez à votre entreprise.
9. Moins d'outils à gérer.
10. Une image plus cohérente.
11. Plus de temps pour votre métier.
12. E-COM STUDIO IA.
13. Votre activité, mise en lumière.

## Consignes de lecture

- Voix française naturelle, assurée, expressive et agréable ; débit posé (environ 2,5 mots par seconde).
- « E-COM STUDIO IA » se dit « i-com studio i-a ».
- Une vraie respiration entre deux phrases : **au moins 0,4 seconde de silence** (le découpage automatique s'en sert).
- Les phrases 9, 10 et 11 se lisent comme trois idées distinctes, avec un léger élan sur la 11.
- Phrase 13 : plus lente, conclusive.

## Fichier attendu

- Un seul fichier **WAV** (ou FLAC), mono ou stéréo, 44,1 ou 48 kHz, **sans musique ni effet**, avec les 13 phrases
  dans l'ordre et un silence d'au moins 0,4 s entre elles.
- Nom conseillé : `audio/voix-fournie.wav` (dans ce dossier).

## Recalage du montage sur votre voix

```bash
python3 scripts/decouper-voix.py audio/voix-fournie.wav   # découpe en 13 phrases, mesure les durées
node scripts/planning.cjs                                  # replace chaque phrase et chaque transition
node scripts/reperes.cjs && python3 scripts/bande-son.py   # musique et bruitages recalés, mixage
node scripts/rendre.cjs                                    # nouveau rendu du film
```

Avec une voix fournie, l'instant des mots-clés (« prestations », « réalisations »…) est estimé au prorata des lettres
(± 0,2 s) ; avec la voix Kokoro, il est mesuré par alignement des spectres et vérifié par transcription.
