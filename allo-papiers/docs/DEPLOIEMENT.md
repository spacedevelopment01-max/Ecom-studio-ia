# Mettre Allô Papiers en ligne — guide pas à pas (depuis un téléphone Android)

Ce guide est écrit pour un débutant. Comptez environ **1 h 30** la première fois. Tout se fait dans le navigateur **Chrome** de votre téléphone. Une tablette ou un ordinateur rend la saisie plus confortable, mais n'est pas obligatoire.

> **Conseil** : dans Chrome, ouvrez le menu ⋮ et cochez **« Version pour ordinateur »** quand une page de réglages s'affiche mal sur téléphone.

**Règle d'or :** les clés secrètes (mots de passe techniques) se collent **uniquement** dans les réglages de Vercel. Ne les envoyez jamais par message, par email ou dans une conversation, même à un assistant.

---

## Vue d'ensemble

| Service | Rôle | Offre pour démarrer | Coût |
|---|---|---|---|
| **GitHub** | Contient le code (déjà fait) | Gratuit | 0 € |
| **Supabase** | Base de données + stockage privé des fichiers, **en Europe (Paris)** | Free pour les essais, puis Pro | 0 €, puis 25 $/mois |
| **Vercel** | Héberge le site | Hobby pour les essais **non commerciaux**, puis Pro | 0 €, puis 20 $/mois |
| **Anthropic** | IA qui lit les documents (images et PDF) | Paiement à l'usage (crédits prépayés) | Voir `COUTS.md` |
| **Resend** | Envoi des emails (liens de connexion, codes, rappels) | Free : 3 000 emails/mois, 100/jour | 0 € |
| **Stripe** | Abonnements Plus et paiement des recommandés | Mode test gratuit | 0 € en test |

⚠️ **Vercel Hobby interdit l'usage commercial.** Vous pouvez faire vos essais dessus. Avant d'encaisser le premier abonnement réel, passez à Vercel **Pro**.

---

## Étape 1 — Supabase (base de données en Europe)

1. Allez sur **supabase.com** → **Start your project** → connectez-vous avec GitHub.
2. **New project** :
   - Name : `allo-papiers`
   - Database Password : cliquez sur **Generate a password**, puis **notez-le** dans un endroit sûr (gestionnaire de mots de passe).
   - **Region : choisissez « West EU (Paris) »** (eu-west-3).
   - Plan : Free.
3. Attendez 2 minutes que le projet soit prêt.
4. Menu de gauche **SQL Editor** → **New query** :
   - Ouvrez sur GitHub le fichier `allo-papiers/db/migrations/001_init.sql`, bouton **Raw**, sélectionnez tout et copiez.
   - Collez dans l'éditeur Supabase, puis appuyez sur **Run**. Le message attendu est « Success. No rows returned ».
   - Recommencez avec `allo-papiers/db/migrations/002_coffre_range.sql` (coffre rangé et pièces jointes), puis avec `allo-papiers/db/supabase/bucket-prive.sql`.
   - Plus tard, à chaque nouveau fichier `00X_….sql` ajouté dans `db/migrations`, exécutez-le de la même façon, dans l'ordre des numéros.
5. Récupérez les informations de connexion :
   - Bouton **Connect** (en haut) → onglet **Connection string** → choisissez **Transaction pooler**. Copiez l'adresse et remplacez `[YOUR-PASSWORD]` par le mot de passe de l'étape 2. Ce sera `DATABASE_URL`.
   - **Project Settings → API** : copiez le **Project URL** (`SUPABASE_URL`) et la clé **service_role** (`SUPABASE_SERVICE_ROLE_KEY`, gardez-la secrète).

> Le projet Supabase gratuit se met **en pause après 7 jours sans activité**. Il suffit de le réactiver depuis le tableau de bord. En production, prenez le plan Pro.

## Étape 2 — Générer les secrets

Générez-les dans **votre propre** projet Supabase, sans passer par un site tiers :

1. **SQL Editor → New query**.
2. Collez la requête suivante, puis appuyez sur **Run** :

```sql
select encode(gen_random_bytes(32), 'base64') as file_encryption_key,
       encode(gen_random_bytes(32), 'hex')    as session_secret,
       encode(gen_random_bytes(24), 'hex')    as cron_secret;
```

3. Copiez les trois valeurs dans votre gestionnaire de mots de passe : `FILE_ENCRYPTION_KEY`, `SESSION_SECRET` et `CRON_SECRET`.

⚠️ **Ne changez jamais `FILE_ENCRYPTION_KEY` une fois le site en service** : les fichiers déjà stockés deviendraient illisibles. Gardez-en une copie dans votre gestionnaire de mots de passe.

## Étape 3 — Resend (emails)

1. **resend.com** → créez un compte.
2. **Domains → Add Domain** : `allopapiers.fr`, **Region : Ireland (eu-west-1)**.
3. Resend affiche des enregistrements DNS. Ajoutez-les chez votre registraire en suivant `DNS.md`.
4. Une fois le domaine **Verified** : **API Keys → Create API Key** (accès « Sending access »). C'est `RESEND_API_KEY`.

> Tant que le domaine n'est pas vérifié, les emails ne peuvent pas partir. Sans email, impossible de se connecter.

## Étape 4 — Anthropic (IA)

1. **console.anthropic.com** → créez un compte d'organisation.
2. **Settings → Billing** : ajoutez un moyen de paiement et un petit crédit (par exemple 10 $). ⚠️ C'est une dépense : je ne l'ai pas faite à votre place.
3. **Settings → Limits** : fixez une **limite de dépense mensuelle** (par exemple 20 $) pour éviter toute surprise.
4. **API Keys → Create Key** : c'est `ANTHROPIC_API_KEY`.
5. Lisez et acceptez les conditions commerciales et le DPA (accord de traitement des données) : c'est nécessaire pour le RGPD.

**Sans clé**, vous pouvez quand même tester le site avec `DEMO_MODE=true`. Les analyses sont alors **simulées**, un bandeau l'indique sur toutes les pages, et aucun crédit n'est consommé.

## Étape 5 — Stripe (paiements, en mode TEST d'abord)

1. **dashboard.stripe.com** → créez un compte. Restez en **mode test** (interrupteur « Test mode » en haut).
2. **Product catalog → Add product** :
   - Nom : `Allô Papiers Plus`
   - Prix : **4,99 EUR**, **Recurring**, **Monthly**.
   - Enregistrez, puis copiez l'identifiant du prix (`price_…`) : c'est `STRIPE_PRICE_PLUS`.
3. **Developers → API keys** : copiez la **Secret key** (`sk_test_…`). C'est `STRIPE_SECRET_KEY`.
4. **Settings → Billing → Customer portal** : activez le portail et autorisez l'annulation. Il sert aux factures et au moyen de paiement ; la résiliation se fait aussi directement dans Allô Papiers.
5. Le webhook se crée **après** l'étape 6, quand vous connaissez l'adresse du site :
   - **Developers → Webhooks → Add endpoint**.
   - URL : `https://VOTRE-ADRESSE/api/stripe/webhook`.
   - Événements à cocher : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
   - Copiez le **Signing secret** (`whsec_…`) : c'est `STRIPE_WEBHOOK_SECRET`.

## Étape 6 — Vercel (mise en ligne)

1. **vercel.com** → **Sign up with GitHub**.
2. **Add New → Project** → importez le dépôt `Ecom-studio-ia`.
3. **Root Directory : `allo-papiers`** (bouton Edit). C'est indispensable.
4. Branche de production : par défaut `main`. Si le travail n'est pas encore fusionné dans `main`, réglez **Settings → Git → Production Branch** sur `ccr-fe796ebe-a046d0`, ou fusionnez d'abord la demande de fusion (pull request).
5. **Environment Variables** : ajoutez une à une les variables du fichier `.env.example`, avec vos valeurs.
   - Pour un premier essai sans IA : `DEMO_MODE=true` et `ANTHROPIC_API_KEY` vide.
   - `APP_URL` : laissez `https://allopapiers.fr` si le domaine est déjà relié. Sinon, mettez l'adresse donnée par Vercel (`https://….vercel.app`) et changez-la plus tard.
6. **Deploy**. Après 2 à 3 minutes, Vercel affiche l'adresse du site.
7. Revenez à Stripe (étape 5.5) pour créer le webhook, ajoutez `STRIPE_WEBHOOK_SECRET` dans Vercel, puis **Deployments → ⋮ → Redeploy**.
8. **Settings → Domains** : ajoutez `allopapiers.fr`, `www.allopapiers.fr` et `allo-papiers.fr`. Suivez ensuite `DNS.md`.

La région des fonctions est fixée à **Paris (cdg1)** dans `vercel.json`, au plus près de la base Supabase. La tâche quotidienne (rappels, purge des documents expirés) s'exécute chaque jour à 6 h UTC, soit 7 h ou 8 h à Paris.

## Étape 7 — Vérifier sur votre Android

1. Ouvrez le site dans Chrome. Le bas de page doit indiquer « Allô Papiers est un service privé indépendant… ».
2. **Comprendre un document**, puis saisissez votre email et ouvrez le lien reçu **sur le même téléphone**.
3. Choisissez **Courrier du quotidien** → **Prendre une photo**. L'appareil photo s'ouvre : photographiez un vrai courrier (sans données trop sensibles pour ce premier essai).
4. Acceptez le traitement par l'IA, puis **Analyser**.
5. Sur le résultat, appuyez sur **J'ai vérifié cette date** si une échéance est trouvée, puis ouvrez **Rappels**.
6. **Compte → Sécurité → Ajouter cet appareil** : votre téléphone demande l'empreinte ou le code de déverrouillage. Ensuite, **Coffre-fort** s'ouvre par empreinte.
7. **Compte → Abonnement** (Stripe en test) : cochez la confirmation du prix et payez avec la carte de test `4242 4242 4242 4242`, une date future et n'importe quel code. Après quelques secondes, l'offre **Plus** apparaît. C'est le webhook qui la confirme, pas la page de retour.
8. **Résilier mon abonnement**, puis vérifiez le message « Résiliation enregistrée ».

## Passer en paiements réels (plus tard)

Voir la liste dans `../README.md`, section « Conditions avant les paiements réels ». En résumé : société et mentions légales complétées, documents juridiques relus par un professionnel, Vercel Pro, Supabase Pro, Stripe activé (identité, IBAN), clés `sk_live_…` et un **nouveau** webhook en mode live.
