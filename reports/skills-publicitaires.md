# Compétences publicitaires (skills) — installation et branchement

## 1. Compétences installées

| Compétence | Source (commit) | Licence | Claude Code | Studio (backend) |
|---|---|---|---|---|
| `image` | coreyhaines31/marketingskills (dbd4588, v2.0.2) | MIT | oui | oui |
| `ad-creative` | coreyhaines31/marketingskills (dbd4588, v2.11.0) | MIT | oui | oui |
| `ads` | coreyhaines31/marketingskills (dbd4588, v2.4.6) | MIT | oui | oui |
| `canvas-design` | anthropics/skills (0f8d899) | Apache 2.0, polices OFL | oui | oui (principes de composition) |
| `brand-guidelines` | anthropics/skills (0f8d899), **adaptée** | Apache 2.0 | oui | oui (marque du client) |

Emplacement unique : `.claude/skills/<nom>/` (dossier du projet, versionné). Claude Code les charge dans chaque
session du projet. Le serveur du studio lit les mêmes fichiers. L'image Docker les embarque : `.claude` n'est
pas exclu par `.dockerignore`.

Vérifications faites avant l'installation :
- **Licences** : MIT et Apache 2.0, compatibles. Chaque dossier garde son fichier de licence.
- **Contenu** : aucune compétence ne lance de script ni ne demande de clé. Les liens vers des outils externes
  (comptes Google Ads, Meta…) restent de simples renvois que le studio n'utilise pas.
- **Dépendances** : aucune pour l'usage du studio. `canvas-design` apporte ses polices (dossier `canvas-fonts`)
  pour l'usage dans Claude Code.
- **`brand-guidelines`** : la version d'origine applique la charte d'Anthropic. Elle a été réécrite en « marque du
  client d'abord » (Project Brain, planche d'identité, `BRAND_RULES`). La palette d'Anthropic reste seulement
  comme exemple d'origine, jamais transmise aux modèles du studio. Modification déclarée dans `NOTICE.md`,
  comme l'exige la licence Apache.

## 2. Comment le studio les utilise

L'API telle que le studio l'emploie ne peut pas charger un skill directement :
- plusieurs fournisseurs (Anthropic, OpenAI, Gemini) ;
- aucun outil d'exécution de code.

Les « Agent Skills » de l'API Anthropic exigent l'outil d'exécution de code et un conteneur, absents ici, et
n'existent pas chez les autres fournisseurs.

Le studio transmet donc les **consignes** des compétences à l'intérieur de l'appel :
- `src/lib/ai/skills.ts` lit chaque `SKILL.md` et n'en garde que les sections utiles. Par exemple : règles
  d'écriture, angles, formules d'annonces, règles de prompt d'image, principes de composition, règles de marque.
  Les parties sans objet (outils, comptes publicitaires, fichiers .pdf, questions au client) ne sont pas
  transmises.
- Le bloc est placé dans le **bloc de référence stable** de l'appel (`LlmCall.reference`). C'est le même canal
  pour tous les fournisseurs. Il est **compté dans le coût maximal réservé** avant l'envoi, comme le reste de la
  demande, et **mis en cache** avec le contexte du projet.
- Le bloc rappelle que les règles du studio priment : rien d'inventé, langue des contenus, format JSON, marque
  du projet.

### Choix automatique

| Demande | Compétences transmises | Taille (≈ jetons) |
|---|---|---|
| Publicité produit | ad-creative, image, canvas-design, brand-guidelines | 3 400 |
| Publicité entreprise de services | ads, ad-creative, image, canvas-design, brand-guidelines | 4 300 |
| Publicité réseaux sociaux (produit) | ad-creative, image, brand-guidelines | 2 900 |
| Visuel publicitaire | image, canvas-design, brand-guidelines | 2 100 |
| Bannière | image, canvas-design, ad-creative, brand-guidelines | 3 400 |
| Variation d'une publicité | ad-creative, brand-guidelines | 2 100 |

Toute autre tâche (textes du site, logo, SEO, contrôles qualité…) ne reçoit **aucune** compétence.

### Appels branchés (moteurs existants, inchangés par ailleurs)

| Appel | Fichier | Compétences |
|---|---|---|
| Rédaction des concepts publicitaires (Ads V2 : produits, services, formats réseaux, bannières, reprises et variantes) | `src/lib/ads-v2/deps.ts` (`writeCopy`) | publicité produit ou service |
| Campagne de test (annonces + stratégie) | `src/lib/engine/ads.ts` | produit ou service ; « réseaux sociaux » quand des réseaux sont choisis |
| Brief d'image d'un visuel publicitaire ou d'une bannière (formats 1:1, 4:5, 9:16, 2:3, 16:9, 2:1) | `src/lib/ai/tasks.ts` (`aiImageBrief`), `src/lib/engine/images.ts` | visuel ou bannière |

**Non modifiés** :
- l'interface ;
- les forfaits ;
- les contrôles qualité (relectures, grilles) ;
- le Project Brain ;
- le routage des fournisseurs ;
- les règles de coût ;
- le moteur local gratuit (aucun appel d'IA, donc aucune compétence).

## 3. Fichiers

- Ajoutés :
  - `.claude/skills/{image,ad-creative,ads,canvas-design,brand-guidelines}/` ;
  - `.claude/skills/SOURCES.md` ;
  - `.claude/skills/brand-guidelines/NOTICE.md` ;
  - `src/lib/ai/skills.ts` ;
  - `tests/skills-publicite.test.ts` ;
  - ce rapport.
- Modifiés (une ligne chacun pour transmettre le bloc) :
  - `src/lib/ads-v2/deps.ts` ;
  - `src/lib/engine/ads.ts` ;
  - `src/lib/ai/tasks.ts` ;
  - `src/lib/engine/images.ts`.

## 4. Tests

`tests/skills-publicite.test.ts`. Le SDK du fournisseur est simulé : on inspecte la requête réellement construite,
sans appel payant.
1. Les cinq compétences sont présentes, avec un `SKILL.md` valide (nom, description) et leur licence.
   `brand-guidelines` est bien la version « marque du client ».
2. Le studio lit chaque compétence et retrouve toutes les sections utilisées. Si une mise à jour en renomme une,
   le test échoue.
3. La sélection automatique correspond au tableau ci-dessus. La palette d'exemple d'Anthropic n'est jamais
   transmise.
4. **Publicité produit** : la requête envoyée au modèle contient le bloc
   `<skills names="ad-creative,image,canvas-design,brand-guidelines">` et le texte des sections.
5. **Publicité de services** : la compétence `ads` s'ajoute dans la requête envoyée.
6. **Visuel publicitaire** : le brief d'image reçoit `image, canvas-design, brand-guidelines`. Une image du site
   n'en reçoit pas.
7. Une tâche hors publicité ne reçoit aucune compétence.

Vérification dans Claude Code : les cinq compétences apparaissent dans la liste des compétences disponibles de
la session. La description adaptée de `brand-guidelines` a été rechargée.

## 5. Limites

- Aucun appel réel payant n'a été fait. La transmission est vérifiée jusqu'à la requête construite pour le
  fournisseur, pas sur une réponse réelle. Un essai réel coûte environ 3 400 jetons d'entrée de plus par
  rédaction publicitaire (moins quand ils sont relus du cache).
- Les compétences guident la rédaction et les briefs. Elles ne changent pas le rendu du moteur local gratuit.
- Mise à jour : recopier le dossier depuis son dépôt puis relancer le test. Il signale toute section disparue.
