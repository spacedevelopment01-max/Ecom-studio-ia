# Allô Papiers — « La paperasse en mode simplifié »

Site internet, utilisable dans un navigateur sans aucune installation, qui aide les particuliers en France à **comprendre leurs documents**, **préparer leurs réponses** et **suivre leurs démarches**.

> Allô Papiers est un service privé indépendant, non affilié à l'administration.

- 📘 Mise en ligne pas à pas, depuis un téléphone Android : [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md)
- 🌐 Réglages DNS (OVH ou Gandi) et emails du domaine : [`docs/DNS.md`](docs/DNS.md)
- 💶 Coûts pour 100 puis 1 000 utilisateurs : [`docs/COUTS.md`](docs/COUTS.md)
- 🧾 Pages juridiques (modèles à faire relire) : `src/content/legal.ts`

---

## 1. État réel des fonctions

Légende :
- ✅ **fonctionne et a été testé** (tests automatiques, vraie base PostgreSQL et vrai navigateur) ;
- 🟡 **code complet, mais non exécuté avec le vrai service**, faute de clé ou de compte ;
- ⛔ **non disponible**.

| Fonction | État | Détail |
|---|---|---|
| Accueil, exemples fictifs, tarifs, aide, pages légales | ✅ | Animations au défilement, mode « réduire les animations », téléphone et ordinateur |
| Connexion par lien magique (usage unique, 15 min) | ✅ / 🟡 | Testée avec la boîte d'envoi locale. Envoi réel : il faut une clé **Resend** |
| Sessions, déconnexion à distance, verrouillage après 20 min d'inactivité (contrôlé par le serveur) | ✅ | |
| Coffre-fort : vérification renforcée par code email, codes de secours, récupération avec délai de 72 h | ✅ | |
| Passkeys (empreinte, visage, code de l'appareil) vérifiées côté serveur (SimpleWebAuthn) | 🟡 | Code complet, challenges à usage unique liés à la session, origine contrôlée. **Non testable ici** (aucun lecteur biométrique) : à tester sur votre Android |
| Import photo (appareil photo du téléphone) et PDF, contrôle de qualité, ordre des pages | ✅ | |
| Stockage privé chiffré (AES-256-GCM côté serveur et chiffrement du fournisseur) | ✅ local / 🟡 Supabase | Testé en local. Le stockage Supabase sera actif dès que les clés seront saisies |
| Analyse IA réelle (Claude : images et PDF, JSON validé, règles de prudence) | 🟡 | Il faut une clé **Anthropic**. En attendant : `DEMO_MODE=true` (résultats **simulés**, signalés sur toutes les pages) |
| Résultat : résumé, urgence, date limite (écrite ou calculée), étapes à cocher, conséquences, passages cités, brouillon | ✅ | Testé sur des résultats fictifs et simulés |
| Quotas (3 documents par mois en gratuit, limites Plus), protégés contre les requêtes simultanées | ✅ | 12 requêtes simultanées → exactement 3 analyses accordées. Les échecs ne consomment rien |
| Discussion avec le document, comparaison, reformulation par l'IA | 🟡 | Code complet, mais il faut la clé Anthropic. Réservé à l'offre Plus (vérifié par le serveur) |
| Coffre rangé : chaque justificatif scanné est reconnu par l'IA (type, période, émetteur, date de validité si elle est écrite) et classé par catégorie | ✅ (logique, rangement simulé) / 🟡 (vraie IA) | Le rangement à la main est toujours possible et gratuit, et il prime sur l'IA. Les pièces sensibles (identité, banque, santé…) sont protégées automatiquement. Un échec ne consomme rien |
| « Apporter mes documents enregistrés » : le courrier reçu (ou le modèle choisi) indique les pièces demandées ; un clic joint la plus récente encore valable de chaque type | ✅ | Rien ne part sans votre validation : vous voyez, retirez ou ajoutez chaque pièce. PDF « courrier + pièces » et envoi recommandé d'une pièce protégée : coffre ouvert obligatoire |
| Rédaction guidée : 29 démarches (travail, logement, achats, banque, assurance, notaire et avocat) | ✅ | Aucun préavis calculé automatiquement |
| PDF propre d'un courrier, d'une fiche de rendez-vous | ✅ | |
| Dossiers : pièces, chronologie, statuts, « Mon problème est réglé » | ✅ | |
| Fiche de rendez-vous (modifiable, copiable, PDF) | ✅ (sans IA) / 🟡 (avec IA) | Aucun rendez-vous n'est réservé |
| Échéances et rappels par email (Europe/Paris, seulement pour les dates **confirmées**) | ✅ / 🟡 | Logique testée. Envoi réel : il faut Resend et la tâche quotidienne Vercel |
| Annuaire officiel (service-public.gouv.fr) et France Services près de chez soi | 🟡 | Code prêt. **L'API n'a pas pu être interrogée depuis mon environnement** (réseau bloqué) : à vérifier en ligne |
| Abonnement Plus 4,99 €, résiliation en un clic, portail Stripe | 🟡 | Webhooks signés et idempotence testés avec la vraie bibliothèque Stripe et une signature de test. Paiement réel : il faut vos clés Stripe **de test** |
| Recommandé : récapitulatif, case « J'ai relu et je valide cet envoi en mon nom », preuve de validation, paiement confirmé par le serveur | ✅ (logique) / 🟡 (paiement Stripe) | Tout changement invalide la validation. Un webhook en double ne déclenche pas de second envoi |
| Envoi réel par La Poste | ⛔ | **Mode test uniquement** : dépôt **simulé**, numéro de suivi **FICTIF**. Le mode réel est refusé explicitement (il faut un contrat Maileva/La Poste et sa documentation) |
| Suppression d'un document ou du compte (fichiers effacés du stockage, pas seulement de la base) | ✅ | |
| Export des données (JSON) | ✅ | |

## 2. Ce qui reste à faire de votre côté

1. Créer les comptes et saisir les clés : Supabase, Vercel, Resend, Anthropic, Stripe en mode test. Tout est décrit dans `docs/DEPLOIEMENT.md`, sans programmation.
2. Relier les domaines `allopapiers.fr` et `allo-papiers.fr` : voir `docs/DNS.md`.
3. Compléter l'identité de l'éditeur (raison sociale, SIREN, adresse, médiateur) dans `src/content/legal.ts`, puis faire relire les trois pages juridiques par un professionnel.
4. Pour les recommandés réels : signer un contrat avec La Poste ou Maileva (offre « Lettre Recommandée En Ligne »), obtenir l'accès au bac à sable, puis faire développer `src/lib/laposte/real-adapter.ts` à partir de la documentation fournie.

## 3. Tester sur votre Android

1. Une fois le site en ligne, ouvrez-le dans **Chrome** et connectez-vous avec votre email.
2. Photographiez un courrier réel peu sensible et vérifiez le résultat : les dates citées, les passages cités et les étapes.
3. **Compte → Sécurité → Ajouter cet appareil** : vérifiez que l'empreinte ouvre le **Coffre-fort**.
4. Laissez le téléphone 20 minutes sans y toucher : le site doit demander de se déverrouiller.
5. **Rappels** : confirmez une date proche (dans 2 jours) et vérifiez la réception de l'email le matin prévu.
6. **Abonnement** en mode test (carte 4242 4242 4242 4242), puis **Résilier**.
7. **Courriers** : rédigez une demande, cochez la relecture, téléchargez le PDF et ouvrez-le.

## 4. Essai avec 10 à 20 personnes

- Restez en **mode test Stripe** (aucun prélèvement) et sur **Vercel Hobby**, qui est toléré pour un essai non commercial.
- Fixez une **limite de dépense** dans la console Anthropic (par exemple 30 $).
- Invitez les testeurs à utiliser **des documents peu sensibles** et à donner leur avis sur trois points : clarté des explications, facilité de la photo, confiance.
- Questionnaire conseillé : *« Avez-vous compris votre courrier ? Une information vous a-t-elle paru fausse ? Où avez-vous hésité ? Le site vous semble-t-il officiel ? »*. La dernière réponse doit être « non ».
- Suivez les coûts IA dans la console Anthropic et l'usage dans Supabase (Table Editor → `usage_ledger`).
- En cas d'erreur, Vercel → **Logs**. Les journaux ne contiennent jamais le contenu des documents.

## 5. Conditions avant les paiements réels

- [ ] Structure juridique créée (micro-entreprise ou société), avec mentions légales complètes.
- [ ] CGU, politique de confidentialité et mentions légales relues par un juriste, en particulier le droit de rétractation et la base légale du traitement par l'IA.
- [ ] Médiateur de la consommation désigné (obligatoire en vente aux particuliers).
- [ ] DPA Anthropic accepté ; registre des traitements ; analyse d'impact (AIPD) envisagée, car des documents personnels sont traités par l'IA hors de l'Union européenne.
- [ ] Vercel **Pro** et Supabase **Pro** (sauvegardes, pas de mise en pause).
- [ ] Compte Stripe activé (identité, IBAN), produit 4,99 € en mode **live**, nouveau webhook live, clés `sk_live_…`.
- [ ] Domaine d'envoi vérifié chez Resend (SPF, DKIM, DMARC).
- [ ] Essai réel d'une analyse, d'un abonnement test, d'une résiliation et d'une suppression de compte sur le site en ligne.
- [ ] Recommandés : rester en mode test tant que l'adaptateur réel n'est pas développé et vérifié.

## 6. Choix techniques (en bref)

- **Next.js 16 et TypeScript** : site et serveur dans un seul projet, hébergeable sur Vercel.
- **Supabase (Paris)** : PostgreSQL et stockage privé en Europe. Le navigateur ne parle **jamais** directement à la base. Tout passe par le serveur, qui filtre par compte. La sécurité au niveau des lignes (RLS) est en plus activée **sans aucune politique**, ce qui bloque l'API publique de Supabase.
- **Comptes gérés par le site** (sur la base Supabase) plutôt que par Supabase Auth. Cela permet le verrouillage contrôlé par le serveur, la vérification renforcée liée à la session, la révocation immédiate des sessions et des tests complets.
- **Claude (Anthropic)** : lit nativement les images et les PDF, avec sortie JSON imposée par un schéma puis revalidée. Le modèle par défaut, `claude-opus-5-5`, est modifiable via `AI_MODEL`. Le **repli automatique** prévu par Anthropic (`fallbacks: "default"`) est activé : si le modèle principal refuse par précaution, un autre modèle reprend la requête.
- **Resend** : envoi depuis l'Union européenne (Irlande). **Stripe** : Checkout, portail client, webhooks signés.
- **Sécurité HTTP** : politique de sécurité du contenu avec nonce (aucun script tiers), HSTS, protection contre l'intégration dans une autre page, contrôle de l'origine de chaque requête qui modifie des données.

### Conditions des fournisseurs d'IA (vérifiées le 4 octobre 2026)

- Anthropic n'utilise pas les données de son API commerciale pour entraîner ses modèles.
- Les entrées et sorties sont supprimées sous 30 jours. Exceptions : obligations légales ou violation des règles d'usage, où la conservation peut être plus longue.
- Le DPA, avec clauses contractuelles types, est intégré aux conditions commerciales.
- **Le traitement a lieu hors de l'Union européenne.** L'API directe propose « global » ou « us », mais pas d'option « UE ». Le fait que les fichiers soient stockés en Europe **ne signifie pas** que l'analyse y a lieu, et c'est dit clairement aux utilisateurs.
- Un consentement explicite est demandé avant la première analyse ; il peut être retiré.

## 7. Développement local

```bash
cd allo-papiers
npm install
npm run db:local                      # vrai PostgreSQL local (sans Docker), affiche la DATABASE_URL
cp .env.example .env.local            # puis remplir (DEMO_MODE=true pour tester sans IA)
npm run dev                           # http://localhost:3100
npm test                              # 46 tests (unitaires + intégration sur vraie base)
npx tsx scripts/e2e.ts                # parcours navigateur complet (téléphone + ordinateur)
```

Sans clé Resend en local, les emails sont écrits dans `.data/outbox/`. Rien n'est envoyé.

## 8. Contrôles effectués et contrôles impossibles ici

**Effectués :**
- **55 tests automatiques** : rangement du coffre (IA simulée, échec gratuit, quota, correction à la main), choix automatique des pièces (la plus récente encore valable, jamais celle d'un autre compte), PDF avec pièces et envoi protégés par le coffre, quotas simultanés, échecs gratuits, isolation des comptes, chiffrement et suppression réelle, rappels uniquement sur date confirmée et sans doublon, vérification renforcée, validation des envois, webhooks signés et en double, abonnement et résiliation, PDF, règles de prudence de l'IA, annuaire, catalogue de courriers.
- **19 parcours navigateur** sur un profil Pixel 7 et sur ordinateur : rangement d'un justificatif dans le coffre, « Répondre avec mes documents enregistrés », connexion, import photo et PDF, analyse simulée, cases à cocher conservées, rappel, coffre, courrier et PDF, récapitulatif d'envoi sans envoi possible sans paiement, rédaction guidée, dossier, fiche de rendez-vous, verrouillage, isolation d'un second compte, protection contre les requêtes d'une autre origine.
- **Compilation de production** réussie, avec la politique de sécurité stricte active.

**Non effectués, faute d'accès :**
- analyse par la **vraie IA** ;
- **envoi réel d'emails** ;
- **paiement Stripe** de bout en bout (seules les signatures et la logique ont été testées) ;
- **stockage Supabase** réel ;
- **API de l'annuaire** et géocodage IGN (réseau bloqué) ;
- **passkeys** sur un vrai appareil ;
- **déploiement Vercel**.

Aucun de ces points n'est annoncé comme opérationnel tant que vous ne l'avez pas vérifié en ligne.
