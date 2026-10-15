# ARVEN — Film publicitaire vertical (storyboard pour validation)

Format : 9:16, 1080 × 1920, 30 images/s, ≈ 38–40 s. 8 plans, chacun = **un vrai clip vidéo généré par l'IA** (Wan,
image → vidéo) à partir d'une image clé propre au plan (Qwen-Image 3.0 Pro, montre de la photo en référence).
Aucune personne, aucun visage. Textes ajoutés au montage (jamais dessinés par l'IA dans la vidéo).

**Référence produit** : la vraie montre (`reports/alibaba-qwen-essai/montre-pixabay.jpg`) — boîtier acier, cadran noir,
3 petits compteurs argent, lunette chiffrée, bracelet cuir brun à surpiqûres. Le cadran **n'a pas de logo** : la
montre de l'exemple publicitaire (logo ARVEN sur le cadran) n'est pas la vraie montre, on ne l'ajoute donc pas.
**Logo** : `reports/alibaba-qwen-essai/logo-qwen.png`. **Couleurs** : noir, acier/argent, accents dorés chauds.

| # | Temps | Plan | Mouvement de caméra (généré) | Voix off | Texte animé |
|---|---|---|---|---|---|
| 1 | 0–5 s | **Le temps s'éveille** — quasi-noir, un fin rai de lumière balaie le cadran, macro sur aiguilles et index | travelling avant lent, la lumière glisse, reflets qui changent | « Il y a les secondes que l'on compte… » | — |
| 2 | 5–10 s | **L'architecture du luxe** — grand hall sombre, sol de pierre, lignes lumineuses dorées, montre sur socle central | travelling depuis l'architecture vers le produit, la lumière dessine la silhouette | « Et celles que l'on n'oublie pas. » | — |
| 3 | 10–15 s | **L'obsession du détail** — macro poussoirs, couronne, cadran, acier, coutures | macro mobile, mise au point qui glisse ; 3 coupes courtes au montage | « Le style se révèle dans les détails. » | « LE DÉTAIL » (masque) |
| 4 | 15–20 s | **Une présence singulière** — roche noire texturée, fines particules dorées | travelling latéral profond, faisceau qui se déplace | « L'allure, dans chaque mouvement. » | — |
| 5 | 20–25 s | **Le caractère** — studio bronze et noir, lumière latérale intense | arc de caméra autour de la montre (≈ 30°, pas un tour complet : l'IA inventerait le dos) | « Une présence. Un caractère. » | « UN CARACTÈRE » |
| 6 | 25–30 s | **L'instant** — ville la nuit, verre et pierre, lumières lointaines | mouvement vertical, lumière froide → chaude | « Une autre manière de vivre l'instant. » | — |
| 7 | 30–35 s | **La révélation** — studio luxueux, nouvelle composition | la montre gagne le centre, contour lumineux → pleine lumière | « ARVEN. » | « LE TEMPS VOUS VA BIEN. » lettre par lettre |
| 8 | 35–40 s | **Signature** — fond noir contrasté, montre mise en valeur | lente poussée finale | « Le temps vous va bien. » | Logo ARVEN animé, slogan, bouton « DÉCOUVRIR » |

Transitions : fondus par la lumière, balayages flous, coupes sur le rythme. Étalonnage commun noir / or.

## Son
- **Voix off** française masculine, posée, chaleureuse — deux essais d'une phrase à comparer avant la vraie voix :
  OpenAI `gpt-4o-mini-tts` (voix masculine + consigne « français, publicité de luxe ») et Alibaba `qwen3-tts-flash`.
- **Musique** : composée par le studio, style « cinématique (luxe) », vrais instruments (banque GeneralUser GS —
  libre pour toute création commerciale ; moteur SpessaSynth, licence Apache-2.0). Aucune musique commerciale.
  Essai gratuit : `musique/essai-cinematique.mp3` (la version finale suivra le montage, avec montée avant la révélation).
- **Effets** fabriqués par le studio (tic-tac, pulsation grave, souffles, tintement métallique, signature finale).
- Voix toujours prioritaire (la musique baisse sous la voix), volume aux normes des réseaux (−14 LUFS).

## Outils
Qwen-Image 3.0 Pro (images clés), Wan (vidéos, région Singapour), TTS ci-dessus, montage FFmpeg (le studio n'a pas
Remotion), timeline JSON réutilisable + script de rendu pour modifier une scène, un texte ou la voix sans tout refaire.

## Budget (prix de la liste officielle Alibaba / OpenAI, en dollars ; ≈ 0,86 € / $)
| Poste | Économique — Wan 2.7 i2v 1080P | **Recommandé — Wan 3.0 1080P** | Premium — Wan 3.0 Prime 1080P |
|---|---|---|---|
| 8 images clés (Qwen-Image 3.0 Pro, ≈ 0,043 $) | 0,35 $ | 0,35 $ | 0,35 $ |
| 8 clips × 5 s | 6,00 $ (0,15 $/s) | **8,00 $** (0,20 $/s) | 11,20 $ (0,28 $/s) |
| Voix (2 essais + voix finale) | ≈ 0,02 $ | ≈ 0,02 $ | ≈ 0,02 $ |
| Musique, effets, montage | 0 $ | 0 $ | 0 $ |
| **Total** | **≈ 6,40 $** | **≈ 8,40 $ (≈ 7,20 €)** | **≈ 11,60 $** |
Une scène à refaire coûte ≈ 1,05 $ (Wan 3.0 1080P), seulement avec votre accord.

**Proposition** : commencer par un **pilote** — image clé + clip du plan 1 et les 2 essais de voix (≈ 1,07 $) — pour
valider la qualité réelle avant de lancer les 7 autres plans.
