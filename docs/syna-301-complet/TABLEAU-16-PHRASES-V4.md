# #301 « SYNA complète » — les 16 phrases d'origine, relevé v4 (tête `8d991875`)

Phrases d'origine du 3 novembre, **non aménagées**. Sonde permanente `tests/syna301-sondes-348.test.ts` : projet de services,
champ « titre » d'une section désigné, 0 écriture sans accord et 0 appel IA exigés à chaque phrase. Relevé brut :
`preuves/sonde-16-phrases-v4.json`. « Navigateur » = recette dans le Studio compilé, Encre / Plein cadre × 1440 / 390.

| # | Phrase | #363 (v3) | Aujourd'hui (v4) | Navigateur |
|---|---|---|---|---|
| 1 | Remplace le titre de cette section par « … » | gratuit | gratuit (proposition) | ✓ (#292, vague 1) |
| 2 | Mets le titre de cette section en rouge | gratuit, alternative annoncée | idem | ✓ (#363) |
| 3 | Change la couleur principale du site en #1e3a8a | clarification | clarification gratuite | ✓ (#363) |
| 4 | Masque cette section | devis seulement | **gratuit** — si le champ titre est désigné, demande de désigner la section entière | ✓ `syna301-seo-pages-recette` (téléphone : toucher réel) |
| 5 | Supprime cette section | devis seulement | **gratuit** — même précision | ✓ `syna301-pages-sections-recette` |
| 6 | Ajoute une section FAQ après cette section | gratuit | gratuit | ✓ (#363) |
| 7 | Ajoute une page « Nos garanties » | devis seulement | **gratuit** — choix du modèle natif (aperçus), puis brouillon | ✓ `syna301-seo-pages-recette`, `syna301-pages-sections-recette` |
| 8 | Remplace le texte du bouton de cette section par « … » | devis seulement | **gratuit** — demande de désigner le bouton | ✓ `syna301-bouton-recette` |
| 9 | Remplace l'image de cette section par la photo de l'atelier | devis seulement | **gratuit** (contrat Codex `73c8865a`) — image EXISTANTE du projet, champ image désigné | ✓ `syna301-image-recette` 4/4 (miniatures, pixels relus) |
| 10 | Annule la dernière retouche du site | gratuit si reçu courant | idem (sans reçu : refus gratuit explicite) | ✓ (#363) |
| 11 | Choisis le thème Rive pour mon site | devis seulement | **gratuit** (contrat #376) — aperçu natif inactif, accord séparé ; refusé si des retouches ne se reportent pas | ✓ 4/4 sur projets **préparés** (produits et services) : produits — refus honnête sans angle, angle choisi dans Stratégie, aperçu, accord, version relue |
| 12 | Remplace le titre SEO de la page d'accueil par « … » | clarification inadaptée | **gratuit** (proposition SEO exacte) | ✓ `syna301-seo-pages-recette` |
| 13 | Change les horaires du mardi : 9 h – 18 h | devis seulement | **clarification gratuite** profil / créneaux ; « Les horaires du profil sont : … » → gratuit | ✓ `syna301-horaires-recette` |
| 14 | Renomme cette prestation en « Aménagement complet » | devis seulement | **précision gratuite** (contrat #374) avec la liste des prestations ; « Renommer » remplit la phrase exacte | ✓ `syna301-prestation-recette` 4/4 |
| 15 | Déplace ma prochaine publication au 12 novembre | devis seulement | **gratuit** (contrat #375) — date d'un brouillon, avant / après avec fuseau ; jamais programmé ni envoyé | ✓ `syna301-calendrier-recette` 4/4 (phrase « Décale … de 2 jours » ; la phrase 15 exacte est vérifiée par le test d'écran) |
| 16 | Mets le stock de ce produit à 12 | devis seulement | **gratuit** (contrat #373) — produit désigné dans le Catalogue | ✓ `syna301-stock-recette` 4/4 |

**Bilan honnête** (mis à jour après les contrats #373 → #376) : **16 phrases sur 16** reçoivent une réponse gratuite
(proposition ou précision honnête) depuis leur écran naturel, contre 6 en v3. Relevé :
`preuves/sonde-v5-ecrans-naturels.json` (test `tests/syna301-phrases-ecrans-naturels.test.ts`). Aucune phrase n'écrit
sans accord ; aucun appel IA. Une réponse gratuite n'est pas encore « terminé » : les lignes sans ✓ attendent leur recette
navigateur, et le choix du thème reste bloqué par le moteur dès qu'une retouche manuelle ne se reporte pas (défaut natif
signalé par Codex, non contourné).

## Projets préparés (4 novembre) : limite levée

Constat du matin : sur un projet dont la préparation est engagée (tout projet réellement construit), la fiche passe en
lecture seule et 7 cartes gratuites sur 11 n'offraient plus d'accord. Contrat retenu avec Codex (`a593e6ea`) :
`readOnlyReason` reste réservé à la fiche, `localEditsWritable` ouvre les retouches gratuites ; cartes alignées
(`2497fea3`). Recettes rejouées sur projets **préparés** (`RECETTE_PREPARE=1`) : Calendrier 4/4, Prestation 4/4,
lot 6 4/4, Thème 4/4, SEO / Pages 4/4, Stock 3/4 + reprise, lot 5 (photo exceptée) : voir `REPRISE.md`.
**Reste ouvert** : l'import de photo depuis la conversation n'est pas proposé sur un projet préparé (garde serveur
`photoImport` liée à la fiche, laissée telle quelle par Codex pour ce lot) — à raccorder.
