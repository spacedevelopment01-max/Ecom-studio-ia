# Simulation du routage des modèles de texte

Aucun appel aux fournisseurs. Coût théorique d'un appel typique (volumes de `TASK_PROFILE`), taux USD → EUR de l'administration, coefficient non compris. **Tarifs OpenAI et Gemini indicatifs et non vérifiés.**

## Modèle choisi par tâche

| Tâche | Niveau | Manuel (actuel) | Coût | Auto, Anthropic seul | Coût | Auto, avec Gemini/OpenAI* | Coût |
|---|---|---|---|---|---|---|---|
| Analyse visuelle du produit | strong | claude-opus-5-5 (medium) | 0,0791 € | claude-opus-5-5 | 0,0791 € | anthropic:claude-opus-5-5 | 0,0791 € |
| Direction de marque et stratégie | strong | claude-opus-5-5 (high) | 0,1376 € | claude-opus-5-5 | 0,1376 € | anthropic:claude-opus-5-5 | 0,1376 € |
| Rédaction (fiches, pages, marque) | standard | claude-sonnet-5-5 (high) | 0,0456 € | claude-sonnet-5-5 | 0,0456 € | google:gemini-3.8-flash | 0,0171 € |
| Conception du thème boutique | strong | claude-opus-5-5 (high) | 0,4816 € | claude-opus-5-5 | 0,4816 € | anthropic:claude-opus-5-5 | 0,4816 € |
| Retouches du thème par conversation | strong | claude-opus-5-5 (medium) | 0,1720 € | claude-opus-5-5 | 0,1720 € | anthropic:claude-opus-5-5 | 0,1720 € |
| Thème entièrement sur mesure (plan et sections) | strong | claude-opus-5-5 (high) | 0,5504 € | claude-opus-5-5 | 0,5504 € | anthropic:claude-opus-5-5 | 0,5504 € |
| Contrôle qualité | standard | claude-sonnet-5-5 (low) | 0,0198 € | claude-sonnet-5-5 | 0,0198 € | google:gemini-3.8-flash | 0,0074 € |
| Tri des photos du produit avant détourage | light | claude-haiku-4-5 | 0,0052 € | claude-haiku-5-5 | 0,0005 € | anthropic:claude-haiku-5-5 | 0,0005 € |
| Contrôle visuel des détourages | standard | claude-sonnet-5-5 (low) | 0,0077 € | claude-sonnet-5-5 | 0,0077 € | google:gemini-3.8-flash | 0,0029 € |
| Symbole de logo sur mesure (dessin vectoriel) | strong | claude-opus-5-5 (medium) | 0,1066 € | claude-opus-5-5 | 0,1066 € | anthropic:claude-opus-5-5 | 0,1066 € |
| Planification éditoriale | strong | claude-opus-5-5 (medium) | 0,1342 € | claude-opus-5-5 | 0,1342 € | anthropic:claude-opus-5-5 | 0,1342 € |
| Textes des publications | standard | claude-sonnet-5-5 (medium) | 0,0189 € | claude-sonnet-5-5 | 0,0189 € | google:gemini-3.8-flash | 0,0071 € |
| Classement des fichiers | light | claude-haiku-4-5 | 0,0026 € | claude-haiku-5-5 | 0,0003 € | anthropic:claude-haiku-5-5 | 0,0003 € |
| Réalisation vidéo (concept, storyboard) | strong | claude-opus-5-5 (medium) | 0,1170 € | claude-opus-5-5 | 0,1170 € | anthropic:claude-opus-5-5 | 0,1170 € |
| Direction artistique des images (briefs photo) | strong | claude-opus-5-5 (medium) | 0,0327 € | claude-opus-5-5 | 0,0327 € | anthropic:claude-opus-5-5 | 0,0327 € |
| Publicités (audiences, accroches, annonces, plan de test) | strong | claude-opus-5-5 (medium) | 0,1170 € | claude-opus-5-5 | 0,1170 € | anthropic:claude-opus-5-5 | 0,1170 € |
| Sujets d'articles de blog | standard | claude-sonnet-5-5 (low) | 0,0172 € | claude-sonnet-5-5 | 0,0172 € | google:gemini-3.8-flash | 0,0065 € |
| Rédaction des articles de blog | standard | claude-sonnet-5-5 (medium) | 0,0499 € | claude-sonnet-5-5 | 0,0499 € | google:gemini-3.8-flash | 0,0187 € |
| **Une fois chaque tâche** | | | **2,0950 €** | | **2,0880 €** | | **1,9886 €** |

\* Hypothèse : Gemini et OpenAI confirmés et activés aux tarifs indicatifs. Le choix réel dépend de leur confirmation par l'administration, puis de l'historique de qualité observé.

## Coût théorique par modèle (appel typique)

| Tâche | Claude Opus 5.5 | Claude Sonnet 5.5 | Claude Haiku 5.5 | Claude Haiku 4.5 | GPT-5.6 Terra | GPT-5.6 Luna | Gemini 3.8 Flash | Gemini 3.5 Flash-Lite |
|---|---|---|---|---|---|---|---|---|
| Analyse visuelle du produit | 0,0791 € | 0,0396 € | 0,0020 € | 0,0198 € | 0,0447 € | 0,0224 € | 0,0148 € | 0,0085 € |
| Direction de marque et stratégie | 0,1376 € | 0,0688 € | 0,0034 € | 0,0344 € | 0,0791 € | 0,0396 € | 0,0258 € | 0,0155 € |
| Rédaction (fiches, pages, marque) | 0,0912 € | 0,0456 € | 0,0023 € | 0,0228 € | 0,0516 € | 0,0258 € | 0,0171 € | 0,0098 € |
| Conception du thème boutique | 0,4816 € | 0,2408 € | 0,0120 € | 0,1204 € | 0,2683 € | 0,1342 € | 0,0903 € | 0,0499 € |
| Retouches du thème par conversation | 0,1720 € | 0,0860 € | 0,0043 € | 0,0430 € | 0,0929 € | 0,0464 € | 0,0323 € | 0,0163 € |
| Thème entièrement sur mesure (plan et sections) | 0,5504 € | 0,2752 € | 0,0138 € | 0,1376 € | 0,3096 € | 0,1548 € | 0,1032 € | 0,0585 € |
| Contrôle qualité | 0,0396 € | 0,0198 € | 0,0010 € | 0,0099 € | 0,0213 € | 0,0107 € | 0,0074 € | 0,0037 € |
| Tri des photos du produit avant détourage | 0,0206 € | 0,0103 € | 0,0005 € | 0,0052 € | 0,0110 € | 0,0055 € | 0,0039 € | 0,0019 € |
| Contrôle visuel des détourages | 0,0155 € | 0,0077 € | 0,0004 € | 0,0039 € | 0,0083 € | 0,0041 € | 0,0029 € | 0,0014 € |
| Symbole de logo sur mesure (dessin vectoriel) | 0,1066 € | 0,0533 € | 0,0027 € | 0,0267 € | 0,0619 € | 0,0310 € | 0,0200 € | 0,0123 € |
| Planification éditoriale | 0,1342 € | 0,0671 € | 0,0034 € | 0,0335 € | 0,0774 € | 0,0387 € | 0,0252 € | 0,0152 € |
| Textes des publications | 0,0378 € | 0,0189 € | 0,0009 € | 0,0095 € | 0,0210 € | 0,0105 € | 0,0071 € | 0,0039 € |
| Classement des fichiers | 0,0103 € | 0,0052 € | 0,0003 € | 0,0026 € | 0,0055 € | 0,0028 € | 0,0019 € | 0,0009 € |
| Réalisation vidéo (concept, storyboard) | 0,1170 € | 0,0585 € | 0,0029 € | 0,0292 € | 0,0671 € | 0,0335 € | 0,0219 € | 0,0131 € |
| Direction artistique des images (briefs photo) | 0,0327 € | 0,0163 € | 0,0008 € | 0,0082 € | 0,0179 € | 0,0089 € | 0,0061 € | 0,0032 € |
| Publicités (audiences, accroches, annonces, plan de test) | 0,1170 € | 0,0585 € | 0,0029 € | 0,0292 € | 0,0671 € | 0,0335 € | 0,0219 € | 0,0131 € |
| Sujets d'articles de blog | 0,0344 € | 0,0172 € | 0,0009 € | 0,0086 € | 0,0193 € | 0,0096 € | 0,0065 € | 0,0036 € |
| Rédaction des articles de blog | 0,0998 € | 0,0499 € | 0,0025 € | 0,0249 € | 0,0568 € | 0,0284 € | 0,0187 € | 0,0109 € |

## Paramètre de réflexion envoyé (effort de la politique traduit pour chaque modèle)

| Tâche (effort politique) | Anthropic Sonnet 5.5 | OpenAI GPT-5.6 Terra | Gemini 3.8 Flash |
|---|---|---|---|
| strategy (high) | `output_config.effort: high` | `reasoning.effort: high` | `thinkingLevel: HIGH` |
| copywriting (high) | `output_config.effort: high` | `reasoning.effort: high` | `thinkingLevel: HIGH` |
| quality_control (low) | `output_config.effort: low` | `reasoning.effort: low` | `thinkingLevel: LOW` |
| classification (défaut du modèle) | `output_config.effort: high` | `reasoning.effort: medium` | `thinkingLevel: MEDIUM` |
