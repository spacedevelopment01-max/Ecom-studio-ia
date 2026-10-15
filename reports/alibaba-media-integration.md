# Alibaba Cloud Model Studio : Qwen-Image (images) et Wan (vidéos)

Date : 15 octobre 2026. Branche `claude/ecom-studio-ia-platform-8cwl79`.

Périmètre : **images et vidéos seulement**. Aucun modèle de texte Qwen, rien sur le SEO ni la rédaction. Alibaba Cloud est **ajouté** comme fournisseur supplémentaire : OpenAI, Gemini, fal.ai et le routage existant sont conservés tels quels. **Aucun appel réel et aucune dépense** n'ont eu lieu pendant ce travail.

## 1. Fichiers créés

| Fichier | Rôle |
|---|---|
| `src/lib/ai/alibaba.ts` | Code propre à Alibaba : adresses par région, en-têtes (clé, mode asynchrone, espace de travail), requêtes Qwen-Image et Wan, lecture des réponses, messages d'erreur clairs (sans la clé), règle « aucune personne inventée ». |
| `src/components/admin-alibaba.tsx` | Carte d'administration : région, adresse d'API, espace de travail, état de validation étape par étape, liste des modèles. |
| `src/components/studio/visual-choice.tsx` | Choix du visuel (gratuit / image IA / publication entière IA), mis en commun (voir section 10). |
| `tests/alibaba-media.test.ts` | 11 tests avec le fournisseur simulé. |
| `reports/alibaba-media-integration.md` | Ce rapport. |

## 2. Fichiers modifiés

- `src/lib/ai/config.ts` : fournisseur `alibaba`, ajouté aux disponibilités image et vidéo.
  - Variables d'environnement acceptées : `DASHSCOPE_API_KEY` ou `ALIBABA_MODEL_STUDIO_API_KEY`.
- `src/lib/ai/media-models.ts` : 7 modèles Qwen-Image et 7 modèles Wan au catalogue.
- `src/lib/ai/media-providers.ts` :
  - adaptateurs `alibabaImage` (synchrone) et `wanClipImpl` (asynchrone, avec reprise) ;
  - `wanTextClip` pour le texte vers vidéo ;
  - branchement dans `generateImage`, `ugcFrame` et `aiClip` ;
  - test de clé `pingAlibaba`.
- `src/lib/ai/media-routing.ts` :
  - nouveaux usages **« Images réseaux sociaux »** (suit « Publicités visuelles » tant qu'il n'a pas son propre réglage) et **« Texte vers vidéo »** ;
  - compatibilité « texte vers vidéo ».
- `src/lib/ai/media-routing-admin.ts` : état de validation Alibaba (`alibabaReadiness`).
- Routes et écrans d'administration :
  - `src/app/api/admin/settings/route.ts` : réglages région, adresse et espace de travail. L'adresse doit être sur un domaine Alibaba Cloud.
  - `src/app/api/admin/overview/route.ts`, `src/app/api/admin/test/route.ts` et `src/components/admin.tsx` : données, test de clé et carte de la page.
- `src/lib/video-v2/deps.ts` (Video Engine V2) et `src/lib/image-v2/deps.ts` : Alibaba accepté comme fournisseur.
- `tests/routage-usages.test.ts` : 9 usages au lieu de 7.

## 3. Fonctionnement exact

**Administration › Fournisseurs IA › « Alibaba Cloud — Images & Vidéos »**
- Clé :
  - chiffrée en base (AES-256-GCM) ;
  - jamais renvoyée au navigateur, ni écrite dans les journaux ou les messages d'erreur (masquage de `sk-…`).
- Région :
  - International (Singapour), États-Unis (Virginie) ou Chine (Pékin) ;
  - une clé ne fonctionne que dans sa région, ce que rappelle le message d'erreur 401.
- Adresse d'API facultative :
  - seulement `https://…aliyuncs.com`, ce qui empêche d'envoyer la clé ailleurs ;
  - acceptée aussi pour les adresses « espace de travail » `*.maas.aliyuncs.com`.
- Espace de travail facultatif : en-tête `X-DashScope-WorkSpace`.
- Changer la région, l'adresse, la clé ou l'espace de travail oblige à refaire le test de connexion.
- « Tester réellement » :
  - liste les modèles (`GET /models`), sans aucune génération facturée ;
  - le résultat est conservé.
- État de validation, étape par étape. La première étape non remplie s'affiche comme message ; si tout est rempli, le message est « Fournisseur prêt ».
  1. Clé présente
  2. Fournisseur activé
  3. Adresse valide
  4. Connexion testée
  5. Modèles disponibles
  6. Au moins un modèle confirmé
  7. Tarification renseignée
  8. Génération autorisée
- Bouton « Désactiver » : il coupe vraiment tous les appels, comme pour les autres fournisseurs.

**Modèles et routage** (Administration › Images & Vidéos) : les 14 modèles apparaissent automatiquement dans les tableaux existants.

| Images (Qwen-Image) | Vidéos (Wan) |
|---|---|
| `qwen-image-max`, `qwen-image-plus`, `qwen-image`, `qwen-image-2.0`, `qwen-image-2.0-pro` | `wan2.6-i2v`, `wan2.6-i2v-flash` (« Wan 2.6 Flash »), `wan2.7-i2v` : image vers vidéo |
| `qwen-image-edit-plus`, `qwen-image-edit-max` (retouche, image de référence obligatoire) | `wan2.6-t2v`, `wan2.7-t2v` : texte vers vidéo |
| | `wan3.0-video`, `wan3.0-video-prime` : texte ou image vers vidéo |

On choisit le principal et le secours **par usage** :
- logos, images produit, retouches produit, publicités visuelles ;
- **images réseaux sociaux** (nouveau), décors et ambiances ;
- vidéos produit, vidéos UGC, **texte vers vidéo** (nouveau).

Par exemple : principal Qwen-Image et secours GPT Image, ou principal Wan et secours Veo puis fal.ai.

**Qwen-Image** (point d'accès synchrone `multimodal-generation`) :
- Avant l'envoi :
  - tarif « par image » obligatoire ;
  - coût maximal réservé sur le budget du projet, avec les plafonds existants : 40 % de l'abonnement HT et 50 % des recharges.
- Paramètres de la requête :
  - une image, sans filigrane ;
  - consigne transmise telle quelle (`prompt_extend: false`, pour que le nom de marque reste exact) ;
  - taille selon le format : 1328², 1664×928, 928×1664 ou 1104×1472.
- **Aucune personne ajoutée** sans photo du client : la consigne l'interdit ET le « negative prompt » exclut les personnes, visages, mains et mannequins. Seule l'image de départ d'une vidéo UGC (personne prévue) les autorise.
- En cas d'échec :
  - refus (clé, région, contrôle de contenu, droits, débit) : rien n'est facturé, la réservation est rendue et le secours choisi prend le relais ;
  - erreur 5xx : résultat incertain, jamais relancé en silence.
- Contrôle qualité : le même contrôle s'applique quel que soit le fournisseur (lisibilité, orthographe, nom de marque, fidélité au produit, composition, format).

**Wan** (tâche asynchrone `video-synthesis`, suivie par `GET /tasks/{id}`) :
- Avant l'envoi :
  - durée acceptée par le modèle (la plus courte qui couvre la demande) ;
  - tarif à la seconde obligatoire, coût maximal réservé ;
  - toujours en résolution 720P, sans filigrane, sans personne si aucune n'est prévue.
- **Anti-doublon.** L'identifiant de la tâche est gardé dès sa création. Une page rechargée, un serveur redémarré ou une tâche relancée **reprend le suivi de la même tâche**, jamais une nouvelle génération.
- Vidéo terminée :
  - coût enregistré avant le téléchargement ;
  - si le téléchargement échoue, le nouvel essai télécharge seulement, sans nouvelle tâche ni nouveau coût. L'adresse est gardée environ 24 h, selon la documentation.
- Tâche en échec chez Alibaba : non facturée selon la documentation, réservation rendue, secours possible.
- Délai dépassé : la tâche reste suivie et le prochain essai reprend son suivi.
- La vidéo est stockée dans la bibliothèque et affichée comme les autres plans IA. Les vidéos produit et les vidéos UGC passent par `aiClip`, dans les moteurs existants (vidéos, Video Engine V2, UGC).

## 4. Ce qui est prêt

- Le fournisseur, la clé chiffrée, la région, l'adresse, l'espace de travail, le test de clé gratuit et l'état de validation.
- Les 14 modèles au catalogue, sélectionnables en principal ou en secours, par usage ou par type, en mode manuel ou automatique.
- La génération d'images Qwen dans tous les moteurs d'images : logos, identité, images produit, publicités, publications pour les réseaux sociaux, ambiances, retouche à partir d'une image, déclinaisons.
- La génération de vidéos Wan :
  - image vers vidéo : plans produit, Video Engine V2, UGC si le modèle choisi l'accepte ;
  - texte vers vidéo : fonction `wanTextClip`, prête pour les moteurs.
- Budget, réservation, facturation, relais vers le secours et reprise sans doublon, avec les mêmes garde-fous que pour les autres fournisseurs.

## 5. Ce qui dépend encore d'une vraie clé Alibaba Cloud

- Le test de connexion réel.
- Savoir quels modèles sont réellement ouverts pour le compte, la région et l'espace de travail.
- Tous les modèles sont **verrouillés** au départ. Pour en utiliser un :
  1. vérifier son identifiant et son prix dans la console Model Studio ;
  2. saisir le tarif : par image, ou par seconde **en 720P** pour la vidéo ;
  3. cliquer sur « Confirmer » dans Administration › Images & Vidéos.
- **Sans tarif saisi, rien ne part :** un coût non maîtrisé n'est jamais accepté.

## 6. Ce qui reste non vérifié sans appel réel

**Sources.** L'accès aux sites d'Alibaba (alibabacloud.com, help.aliyun.com, dashscope) est bloqué depuis cet environnement. Les faits ont été relevés de deux façons :
- **Vérifié sur le code du SDK officiel** `dashscope` 1.27.7 (PyPI) :
  - les domaines par région ;
  - les chemins de génération et de suivi ;
  - les en-têtes (asynchrone, espace de travail) ;
  - les statuts de tâche ;
  - les champs de la requête vidéo.
- **Relevé par extraits des pages de documentation, à confirmer au premier essai réel :**
  - les identifiants exacts des modèles et leur disponibilité par région ;
  - la forme exacte de la requête et de la réponse Qwen-Image (`messages`, `image` en data URI) ;
  - l'entrée `media` de Wan 3.0 ;
  - l'acceptation d'une image de départ en Base64 ;
  - la durée de validité des adresses de résultat ;
  - les codes d'erreur.
- **Tarifs (région internationale, extraits non datés, possiblement promotionnels) :**
  - qwen-image-max ≈ 0,075 $ par image ;
  - qwen-image-plus ≈ 0,03 $ par image ;
  - wan2.6 ≈ 0,10 $ par seconde en 720P ;
  - wan3.0 ≈ 0,10 $ par seconde en 720P, avec une mention « −30 % temporaire ».
  - Ils sont affichés comme **aide uniquement** dans l'administration et **jamais** appliqués d'office.
- **Non trouvé :** le tarif de qwen-image-edit-max et de wan2.6-i2v-flash.
- **Non retenu :** `qwen-image-2.1-turbo` et « Qwen Image 3.0 », dont les identifiants n'ont pas pu être relevés.
- Prix avec ou sans son : aucune différence trouvée. Wan génère un son par défaut.

**Une première requête refusée par Alibaba ne coûte rien** : le studio rend la réservation et affiche la raison.

## 7. Tests exécutés

- `tests/alibaba-media.test.ts` : 11 sur 11 réussis.
  - Couvert : catalogue et verrouillage, adresses et sécurité de l'adresse, requête Qwen avec facturation, blocage sans tarif, refus avec secours et messages sans clé.
  - Couvert aussi : Wan image vers vidéo, Wan 3.0 avec `media` et texte vers vidéo, reprise sans nouvelle tâche, vidéo payée récupérée sans repayer, échec non facturé, test de clé et état de validation, usages hérités.
- Série complète `npx vitest run` : résultat dans la section « Vérifications » de la PR.

## 8. TypeScript

`npx tsc --noEmit` : aucune erreur.

## 9. Build

Voir la PR : la CI exécute `next build`.

## 10. Également dans cette branche (demandes du propriétaire)

- « Ma communication automatique » :
  - la semaine type suit tout de suite la fréquence choisie, avant « Enregistrer » ;
  - le choix du visuel (gratuit / image par l'IA / publication entièrement par l'IA) est ajouté, avec un budget IA par semaine qui n'apparaît que pour les choix avec IA.
- Création IA : un encadré « Comment créer vos publications » en 3 étapes :
  1. Planifier.
  2. **Créer les visuels.** Les trois choix sont maintenant en haut de cette étape.
  3. Relire et valider dans le Calendrier.

## 11. Limites

- Vidéo Wan : résolution fixée à 720P. Le tarif saisi doit être celui du 720P.
- Le texte vers vidéo est prêt dans le moteur (usage « Texte vers vidéo »), mais aucun écran client ne le propose encore. C'est cohérent avec une vidéo prévue pour la V2 commerciale.
- Le mode « forfait Créer = vidéo rapide », appliqué à Veo, ne s'applique pas à Wan. Choisissez Wan 2.6 Flash si besoin.
