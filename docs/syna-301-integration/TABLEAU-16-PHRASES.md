# #301 v3 — les 16 phrases naturelles rejouées sur la tête d'intégration

Phrases d'origine (sonde du 3 novembre), **non aménagées**. Tête : `claude/syna-301-integration-356` (#356 + #359 + #360 +
#362 de Codex, #352 / #354 / #357 et correctifs d'interface de Claude). Sonde permanente
`tests/syna301-sondes-348.test.ts` (aucune écriture sans accord et 0 appel IA exigés à chaque phrase) ; relevés bruts
dans `preuves/sonde-*-integration.json`. « Résultat relu » = écriture native relue dans le navigateur par la recette
`scripts/syna301-site-gratuit-recette.ts` (Encre et Plein cadre, 1440 et 390 px), quand la phrase aboutit.

Cible : une section du site désignée dans l'aperçu natif (onglet Site), sauf mention contraire.

| # | Phrase | Classe dans SYNA | Ce que voit le client | Résultat relu |
|---|---|---|---|---|
| 1 | Remplace le titre de cette section par « Titre sondé » | **gratuit** | carte Gratuit — 0 €, avant / après, confirmer / annuler | titre exact écrit, nouvelle version (recettes vague 1 et #292) |
| 2 | Mets le titre de cette section en rouge | **gratuit, alternative annoncée** | « couleur principale des textes de cette section » — le titre seul n'est pas ciblé, annoncé avant accord | même mécanisme que la ligne 3 (couleur de section) |
| 3 | *(recette)* Mets le fond de cette section en bleu | **gratuit** | Fond #F4F5F2 → #1D4ED8, Texte #182521 → #FFFFFF (pastilles) | fond réellement bleu et texte blanc dans l'aperçu, seule cette section changée en base |
| 4 | Change la couleur principale du site en #1e3a8a | **clarification gratuite** | « La couleur globale de tout le site est distincte de celle d'une section » ; ni confirmation ni devis | rien d'écrit |
| 5 | Masque cette section | **devis seulement** | aucune action ; réflexion IA sur devis | — (absent) |
| 6 | Supprime cette section | **devis seulement** | idem | — (absent) |
| 7 | Ajoute une section FAQ après cette section | **gratuit** | section « Questions fréquentes » résumée (questions de départ à compléter) | FAQ placée juste après la section, visible dans l'aperçu ; réponse réseau perdue → une seule écriture |
| 8 | Ajoute une page « Nos garanties » | **devis seulement** | aucune action | — (absent) |
| 9 | Remplace le texte du bouton de cette section par « Demander un devis » | **devis seulement** | aucune action | — (absent) |
| 10 | Remplace l'image de cette section par la photo de l'atelier | **devis seulement** | aucune action | — (absent) |
| 11 | Annule la dernière retouche du site | **gratuit si un reçu courant existe**, sinon refus gratuit explicite | sans retouche préalable : « Aucune dernière retouche avec reçu encore courante » ; après une retouche : carte d'annulation | FAQ retirée, ordre d'origine rétabli, nouvelle version (historique conservé) |
| 12 | Choisis le thème Rive pour mon site | **devis seulement** | aucune action (le natif sait changer de direction gratuitement) | — (absent par phrase) |
| 13 | Remplace le titre SEO de la page d'accueil par « … » | **clarification sans outil SEO** | « Précisez gratuitement une seule retouche déterministe : titre exact, couleur… » — la phrase SEO est encore aiguillée vers la grammaire du site | rien d'écrit — SEO absent par phrase |
| 14 | Change les horaires du mardi : 9 h – 18 h | **devis seulement** (même depuis l'écran Activité) | aucune action | — ; seule la formulation exacte « Remplace les horaires du profil d'activité par « … » » ouvre la carte gratuite (contrat #355, hors des 16) |
| 15 | Renomme cette prestation en « Aménagement complet » | **devis seulement** | aucune action | — (absent) |
| 16 | Déplace ma prochaine publication au 12 novembre | **devis seulement** | aucune action | — (absent) |
| 17 | Mets le stock de ce produit à 12 | **devis seulement** | aucune action (aucune fiche désignable par phrase) | — (absent par phrase) |

(Les lignes 3 et 17 complètent : la sonde d'origine comptait 16 phrases, « fond en bleu » est la phrase de la recette
navigateur ; « stock » est la 16ᵉ de la sonde.)

**Bilan honnête** : 5 phrases aboutissent gratuitement ou à une clarification honnête (1, 2, 4, 7, 11), plus la recette
« fond en bleu ». 1 phrase (SEO) reçoit une clarification gratuite mais inadaptée (aucun outil SEO). 10 phrases ne
déclenchent toujours aucune action et proposent seulement une réflexion payante sur devis.
Aucune opération locale gratuite disponible n'affiche de devis (vérifié dans le navigateur : bouton de devis absent à
chaque carte gratuite, clarification et annulation).

**Limites visibles** : couleur d'une section = couleur principale des textes de la section ; les accents (surtitre, mots
en accent, certains boutons) gardent leurs couleurs et peuvent devenir peu lisibles sur un fond très différent (relevé
sur fond bleu) — signalé à Codex, non corrigé.
