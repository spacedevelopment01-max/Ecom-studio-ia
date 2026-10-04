/**
 * Contenus juridiques et FAQ d'Allô Papiers.
 *
 * IMPORTANT : ces textes sont des MODÈLES. Ils doivent être complétés
 * (mentions entre crochets « [À COMPLÉTER : ...] », « [à vérifier] »,
 * « [À VALIDER PAR UN JURISTE] ») puis relus et validés par un
 * professionnel du droit avant toute mise en ligne publique.
 */

export type LegalBlock = { heading: string; paragraphs?: string[]; list?: string[] };

export type LegalPage = {
  slug: "mentions-legales" | "confidentialite" | "conditions";
  title: string;
  updated: string;
  intro: string;
  blocks: LegalBlock[];
};

export type FaqItem = {
  category:
    | "Le service"
    | "Documents et crédits"
    | "Sécurité et coffre-fort"
    | "Abonnement"
    | "Courriers et envois";
  q: string;
  a: string;
};

const UPDATED = "4 octobre 2026";

const TEMPLATE_NOTICE =
  "Ce texte est un modèle de travail. Les passages entre crochets sont à compléter, et l'ensemble doit être relu et validé par un professionnel du droit avant publication.";

const NOT_OFFICIAL =
  "Allô Papiers est un service privé et indépendant. Il n'est pas affilié à l'administration et n'est pas un service public.";

/* ------------------------------------------------------------------ */
/* Mentions légales                                                    */
/* ------------------------------------------------------------------ */

const mentionsLegales: LegalPage = {
  slug: "mentions-legales",
  title: "Mentions légales",
  updated: UPDATED,
  intro: `${TEMPLATE_NOTICE} Cette page indique qui édite le site allopapiers.fr et qui l'héberge, conformément à l'article 1-1 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), dans sa version modifiée par la loi n° 2024-449 du 21 mai 2024 (loi SREN).`,
  blocks: [
    {
      heading: "Éditeur du site",
      paragraphs: [
        "Le site allopapiers.fr et le service Allô Papiers (« La paperasse en mode simplifié ») sont édités par :",
      ],
      list: [
        "Raison sociale : [À COMPLÉTER : raison sociale]",
        "Forme juridique et capital social : [À COMPLÉTER : forme juridique et capital]",
        "Numéro SIREN / RCS : [À COMPLÉTER : SIREN et ville du RCS]",
        "Adresse du siège : [À COMPLÉTER : adresse postale]",
        "Numéro de TVA intracommunautaire : [À COMPLÉTER : n° de TVA, le cas échéant]",
        "Adresse e-mail de contact : [À COMPLÉTER : contact@allopapiers.fr]",
        "Téléphone : [À COMPLÉTER : numéro de téléphone, le cas échéant]",
      ],
    },
    {
      heading: "Directeur ou directrice de la publication",
      paragraphs: ["[À COMPLÉTER : nom et prénom du directeur ou de la directrice de la publication]"],
    },
    {
      heading: "Hébergement",
      paragraphs: [
        "Le site fait appel à deux hébergeurs principaux :",
      ],
      list: [
        "Application web : Vercel Inc., [À COMPLÉTER : adresse postale de Vercel Inc., à vérifier]. L'application est configurée pour s'exécuter en Europe (région de Paris).",
        "Base de données et stockage privé des fichiers : Supabase, [À COMPLÉTER : dénomination exacte de la société, adresse et coordonnées, à vérifier]. Le projet est créé dans une région de l'Union européenne [à vérifier : par exemple Paris, eu-west-3].",
      ],
    },
    {
      heading: "Nature du service",
      paragraphs: [
        NOT_OFFICIAL,
        "Allô Papiers ne se connecte jamais à vos comptes CAF, Ameli, impôts, banque ou assurance, et ne vous demande jamais leurs mots de passe.",
        "Allô Papiers vous aide à comprendre vos courriers et à y répondre. Il ne remplace pas un avocat ou un professionnel habilité.",
      ],
    },
    {
      heading: "Médiation de la consommation",
      paragraphs: [
        "Conformément à l'article L612-1 du Code de la consommation, vous pouvez recourir gratuitement à un médiateur de la consommation en cas de litige non résolu avec nous.",
        "Médiateur : [À COMPLÉTER : nom du médiateur, adresse postale et site internet].",
      ],
    },
    {
      heading: "Données de l'annuaire",
      paragraphs: [
        "Les coordonnées des administrations et des lieux France Services proviennent de l'« Annuaire de l'administration » publié sur service-public.gouv.fr, réutilisé sous Licence Ouverte 2.0. La source et la date de mise à jour sont affichées à côté des informations.",
      ],
    },
    {
      heading: "Propriété intellectuelle",
      paragraphs: [
        "Les textes, le logo, la marque Allô Papiers et la présentation du site sont protégés. Toute reproduction sans autorisation est interdite, sauf exceptions prévues par la loi. [À COMPLÉTER : titulaire des droits et éventuel dépôt de marque]",
      ],
    },
    {
      heading: "Contact",
      paragraphs: ["Pour toute question : [À COMPLÉTER : contact@allopapiers.fr]."],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Politique de confidentialité                                        */
/* ------------------------------------------------------------------ */

const confidentialite: LegalPage = {
  slug: "confidentialite",
  title: "Politique de confidentialité",
  updated: UPDATED,
  intro: `${TEMPLATE_NOTICE} Cette page explique, le plus simplement possible, quelles données nous utilisons, pourquoi, avec quels prestataires, combien de temps nous les gardons et quels sont vos droits. Nous avons mis en place des mesures de protection et une revue de conformité est prévue ; nous ne prétendons pas qu'elles soient parfaites.`,
  blocks: [
    {
      heading: "Qui est responsable de vos données ?",
      paragraphs: [
        "Le responsable du traitement est [À COMPLÉTER : raison sociale], [À COMPLÉTER : adresse postale], joignable à [À COMPLÉTER : contact@allopapiers.fr].",
        "Délégué à la protection des données (si désigné) : [À COMPLÉTER : nom et contact, ou mention « non désigné »].",
        NOT_OFFICIAL,
      ],
    },
    {
      heading: "Ce que nous ne faisons jamais",
      list: [
        "Nous ne nous connectons jamais à vos comptes CAF, Ameli, impôts, banque ou assurance.",
        "Nous ne vous demandons jamais les mots de passe de ces comptes et nous ne les conservons pas.",
        "Nous n'utilisons ni cookies publicitaires ni cookies de mesure d'audience.",
        "Nous ne vendons pas vos données.",
      ],
    },
    {
      heading: "Les données que nous utilisons",
      list: [
        "Votre adresse e-mail, pour créer votre compte et vous connecter.",
        "Vos documents (photos ou PDF de courriers) et ce qui en est tiré : analyses, réponses, conversations avec vos documents, brouillons de lettres.",
        "Les dates et échéances que vous confirmez, pour vous envoyer des rappels.",
        "Les informations de votre abonnement et de vos paiements (gérés par Stripe ; nous ne voyons jamais votre numéro de carte complet).",
        "Pour les lettres recommandées : le destinataire, le contenu, les pièces jointes, le prix et la preuve de votre validation.",
        "Des données techniques limitées : journal des actions sensibles (sans copie du contenu de vos documents) et adresses IP conservées uniquement sous forme d'empreinte tronquée et chiffrée par clé (« hachage »).",
        "Si vous utilisez une clé d'accès (passkey) : une clé publique et des preuves signées par votre appareil. Votre empreinte digitale ou votre visage restent sur votre appareil ; nous ne les recevons jamais.",
      ],
    },
    {
      heading: "Pourquoi nous les utilisons",
      list: [
        "Fournir le service que vous demandez (exécution du contrat) : compte, analyse de documents, rédaction de réponses, coffre-fort, rappels, envois.",
        "Facturer et tenir notre comptabilité (obligation légale).",
        "Sécuriser votre compte et prévenir les abus (intérêt légitime).",
        "Analyser vos documents avec l'intelligence artificielle : uniquement après votre consentement explicite, demandé avant la première analyse. [À VALIDER PAR UN JURISTE : base légale retenue]",
      ],
    },
    {
      heading: "L'intelligence artificielle : ce qu'il faut savoir",
      paragraphs: [
        "Pour analyser vos documents, nous utilisons Claude, un modèle d'intelligence artificielle fourni par la société Anthropic, via son offre commerciale (API).",
        "Selon les règles publiées par Anthropic (à revérifier avant le lancement) : les données transmises via l'API ne servent pas à entraîner ses modèles ; les contenus envoyés et les réponses sont supprimés de ses systèmes sous 30 jours, sauf obligation légale ou violation de ses règles d'utilisation (une conservation plus longue est alors possible) ; un accord de traitement des données (DPA) comprenant des clauses contractuelles types est inclus dans ses conditions commerciales.",
        "Le traitement par l'IA a lieu en dehors de l'Union européenne (États-Unis ou autres pays). Anthropic ne propose pas, à ce jour, de traitement limité à l'Union européenne sur son API directe. Il s'agit donc d'un transfert hors Union européenne, encadré par des clauses contractuelles types de la Commission européenne.",
        "Attention : le fait que vos fichiers soient stockés en Europe ne veut pas dire que l'analyse par l'IA se fait en Europe.",
        "Nous vous demandons votre accord explicite avant la première analyse. Si vous refusez, vous pouvez toujours utiliser la rédaction guidée de lettres, qui fonctionne sans IA.",
        "Rangement du coffre : lorsque vous demandez à ranger un justificatif, ses pages sont transmises à la même IA, uniquement pour reconnaître son type (par exemple « avis d'imposition »), sa période, son émetteur et une date de validité si elle y est écrite. Ces informations servent à classer la pièce et à la retrouver quand un courrier la demande. Vous pouvez toujours ranger ou corriger une pièce vous-même, sans IA.",
        "Aucune pièce n'est jointe à un envoi sans que vous l'ayez vue : les pièces proposées automatiquement s'affichent avant toute validation et vous pouvez les retirer.",
      ],
    },
    {
      heading: "Comment vos fichiers sont protégés",
      list: [
        "Ils sont rangés dans un espace de stockage privé, jamais accessibles par un lien public permanent.",
        "Ils sont chiffrés pendant leur transfert (TLS) et pendant leur stockage (chiffrement de l'hébergeur).",
        "Ils sont en plus chiffrés par notre application (AES-256-GCM), avec une clé conservée sur nos serveurs.",
        "Ce n'est pas un chiffrement « de bout en bout » : pour être analysé, le contenu doit pouvoir être lu temporairement par notre serveur et par le prestataire d'IA.",
        "Le contenu de vos documents n'est jamais copié dans nos journaux techniques.",
      ],
    },
    {
      heading: "Connexion et coffre-fort",
      paragraphs: [
        "Vous vous connectez avec votre e-mail et un lien de connexion. Vous pouvez aussi utiliser une clé d'accès (empreinte, visage ou code de votre appareil, technologie WebAuthn).",
        "L'ouverture du coffre-fort demande une vérification renforcée : clé d'accès, ou à défaut un code reçu par e-mail. Si vous avez créé une clé d'accès, le code e-mail seul ne suffit pas : il faut alors un code de secours, ou une procédure de récupération avec un délai de 72 heures et une alerte par e-mail.",
        "Votre session se verrouille après 20 minutes d'inactivité.",
      ],
    },
    {
      heading: "Nos prestataires (sous-traitants)",
      list: [
        "Vercel Inc. : hébergement de l'application web, configurée pour s'exécuter en Europe (région de Paris). [à vérifier : coordonnées et garanties de transfert]",
        "Supabase : base de données et stockage privé des fichiers, projet situé dans une région de l'Union européenne [à vérifier : par exemple Paris, eu-west-3]. [À COMPLÉTER : coordonnées de la société]",
        "Anthropic : analyse des documents par l'IA (Claude), traitement hors Union européenne encadré par des clauses contractuelles types.",
        "Stripe : paiements. Les données de carte bancaire sont traitées par Stripe, jamais par Allô Papiers.",
        "Resend : envoi des e-mails de service (liens de connexion, codes, rappels). La région d'envoi peut être configurée en Europe (Irlande), mais certaines données du compte peuvent être stockées aux États-Unis [à vérifier].",
        "Service d'envoi de lettres recommandées : [À COMPLÉTER : La Poste / Maileva, une fois le contrat signé].",
      ],
    },
    {
      heading: "Combien de temps nous gardons vos données",
      list: [
        "Documents : 365 jours par défaut, puis suppression automatique. Vous pouvez choisir une autre durée dans votre compte : 30 jours, 90 jours, 1 an, 3 ans, ou jusqu'à ce que vous les supprimiez vous-même.",
        "Quand vous supprimez un document, ses fichiers sont effacés du stockage, ainsi que toutes les analyses et conversations liées.",
        "Quand vous supprimez votre compte, tout est effacé, sauf ce que la loi nous oblige à garder.",
        "Factures et pièces comptables : conservées par Stripe et par nous pendant la durée légale de conservation des pièces comptables, à confirmer [à vérifier].",
        "Preuves de validation des lettres recommandées : conservées le temps nécessaire pour servir de preuve [durée à définir avec un juriste].",
        "Sauvegardes : les sauvegardes de notre hébergeur de base de données sont remplacées selon leur propre cycle [durée à vérifier selon l'offre Supabase]. Un élément supprimé peut donc subsister dans une sauvegarde jusqu'à son expiration.",
      ],
    },
    {
      heading: "Rappels par e-mail",
      paragraphs: [
        "Nous n'envoyons des rappels que pour les dates que vous avez vous-même confirmées. Les dates sont calculées à l'heure de Paris (fuseau Europe/Paris).",
      ],
    },
    {
      heading: "Localisation et annuaire",
      paragraphs: [
        "Pour trouver une administration ou un lieu France Services près de chez vous, nous pouvons utiliser votre position, uniquement si vous l'autorisez. Elle sert une seule fois et n'est pas conservée.",
        "Les coordonnées affichées proviennent de l'« Annuaire de l'administration » (service-public.gouv.fr, Licence Ouverte 2.0), avec la source et la date de mise à jour.",
      ],
    },
    {
      heading: "Cookies",
      paragraphs: [
        "Nous utilisons uniquement un cookie de session strictement nécessaire au fonctionnement du site (cookie « httpOnly », illisible par les scripts de la page). Nous n'utilisons ni cookies publicitaires ni cookies de mesure d'audience. Les cookies strictement nécessaires ne demandent pas de bandeau de consentement.",
      ],
    },
    {
      heading: "Vos droits",
      paragraphs: [
        "Vous disposez des droits suivants sur vos données : accès, rectification, effacement, limitation, opposition et portabilité. Lorsque le traitement repose sur votre consentement (par exemple l'analyse par l'IA), vous pouvez le retirer à tout moment.",
        "Pour les exercer : depuis votre compte (consultation, téléchargement, suppression), ou en écrivant à [À COMPLÉTER : contact@allopapiers.fr]. Nous répondons dans un délai d'un mois maximum, prolongeable dans les cas prévus par la loi.",
        "Si vous estimez que vos droits ne sont pas respectés, vous pouvez déposer une réclamation auprès de la CNIL : www.cnil.fr.",
      ],
    },
    {
      heading: "Modifications",
      paragraphs: [
        "Nous pouvons faire évoluer cette politique. En cas de changement important, nous vous prévenons par e-mail ou dans votre compte.",
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Conditions d'utilisation                                            */
/* ------------------------------------------------------------------ */

const conditions: LegalPage = {
  slug: "conditions",
  title: "Conditions d'utilisation",
  updated: UPDATED,
  intro: `${TEMPLATE_NOTICE} Ces conditions expliquent les règles d'utilisation d'Allô Papiers. En créant un compte, vous les acceptez.`,
  blocks: [
    {
      heading: "1. Objet du service",
      paragraphs: [
        "Allô Papiers (« La paperasse en mode simplifié ») vous aide à comprendre vos courriers administratifs et à préparer vos réponses.",
        NOT_OFFICIAL,
        "Allô Papiers ne se connecte jamais à vos comptes CAF, Ameli, impôts, banque ou assurance. Il ne remplace pas un avocat ou un professionnel habilité.",
      ],
    },
    {
      heading: "2. Votre compte",
      list: [
        "Vous créez votre compte avec votre adresse e-mail et vous vous connectez par lien de connexion, ou avec une clé d'accès si vous en créez une.",
        "Vous devez donner une adresse e-mail valide et garder vos moyens de connexion (e-mail, appareil, codes de secours) pour vous seul.",
        "Prévenez-nous rapidement si vous pensez que quelqu'un d'autre utilise votre compte.",
        "[À COMPLÉTER : âge minimum pour créer un compte]",
      ],
    },
    {
      heading: "3. Les offres et les limites d'utilisation",
      paragraphs: [
        "Offre Gratuite : 3 documents administratifs simples par mois, sans carte bancaire.",
        "Offre Plus : 4,99 € par mois. Elle donne accès aux parcours avancés : paie, travail, contrats, notaire, repérage d'anomalies, discussion avec vos documents, comparaisons et suivi des dossiers. Pour un usage raisonnable, elle comprend chaque mois jusqu'à 30 documents, 150 questions et 20 comparaisons. Ces limites peuvent évoluer et sont toujours affichées dans votre compte.",
        "Il n'y a pas de paiement au document.",
        "Un document = un courrier de 10 pages maximum (photos ou PDF) analysé en une fois. Plusieurs pages du même courrier comptent pour 1 document.",
        "Les exemples fictifs et les analyses qui échouent ne consomment jamais de crédit.",
        "Les compteurs repartent à zéro le 1er de chaque mois (heure de Paris).",
      ],
    },
    {
      heading: "4. Abonnement Plus : paiement, résiliation, rétractation",
      paragraphs: [
        "Le paiement se fait par carte via Stripe. Allô Papiers n'a jamais accès à vos données de carte bancaire.",
        "Vous pouvez résilier à tout moment depuis votre compte, avec le bouton « Résilier », en trois clics, conformément à l'article L215-1-1 du Code de la consommation. La résiliation prend effet à la fin de la période déjà payée. Nous ne vous faisons jamais passer automatiquement à une offre plus chère.",
        "Droit de rétractation : en tant que consommateur, vous disposez en principe de 14 jours pour vous rétracter après la souscription. Si vous demandez que l'abonnement commence immédiatement, vous pourriez devoir payer la part du service déjà utilisée, ou perdre ce droit dans certains cas prévus par la loi. [À VALIDER PAR UN JURISTE : rédaction exacte, modalités de l'accord exprès et formulaire de rétractation]",
      ],
    },
    {
      heading: "5. Utilisation acceptable",
      paragraphs: ["En utilisant Allô Papiers, vous vous engagez à ne pas :"],
      list: [
        "utiliser le service pour une activité illégale ou frauduleuse ;",
        "envoyer des documents d'une autre personne sans en avoir le droit (par exemple sans son accord ou sans être son représentant) ;",
        "abuser du service, contourner les limites, ou l'utiliser de façon automatisée (robots, scripts, revente) ;",
        "tenter de porter atteinte à la sécurité du site ou aux données d'autres utilisateurs.",
      ],
    },
    {
      heading: "6. Les limites de l'intelligence artificielle",
      list: [
        "L'IA peut se tromper : mal lire un document, oublier une information ou mal comprendre une situation.",
        "Relisez toujours les explications et les lettres proposées avant de les utiliser.",
        "Allô Papiers ne prend aucune décision à votre place : c'est vous qui décidez et qui envoyez.",
        "Les réponses ne sont pas des conseils juridiques. Pour une situation importante ou complexe, adressez-vous à un avocat ou à un professionnel habilité, ou à un lieu France Services.",
        "L'analyse par l'IA n'est réalisée qu'avec votre accord explicite ; sans cet accord, la rédaction guidée de lettres reste disponible.",
      ],
    },
    {
      heading: "7. Lettres recommandées",
      list: [
        "L'envoi en recommandé est une option payante, séparée de l'abonnement, réglée via Stripe. Le prix est affiché avant que vous validiez.",
        "Rien n'est envoyé sans votre accord : vous devez cocher « J'ai relu et je valide cet envoi en mon nom », puis cliquer sur « Envoyer ».",
        "Nous gardons une preuve de votre validation : date, heure, empreinte de la version exacte du contenu, destinataire, pièces jointes et prix.",
        "Vous restez responsable du contenu de la lettre et du choix du destinataire.",
        "Important : aujourd'hui, la connexion avec La Poste fonctionne uniquement en mode TEST. L'envoi est simulé, le numéro de suivi est fictif et aucune lettre n'est réellement envoyée. Cela restera ainsi tant qu'un contrat avec La Poste / Maileva n'est pas signé et que l'intégration réelle n'est pas développée et vérifiée.",
      ],
    },
    {
      heading: "8. Responsabilité",
      paragraphs: [
        "Nous faisons de notre mieux pour que le service fonctionne correctement et en sécurité, mais nous ne pouvons pas garantir qu'il sera toujours disponible ni exempt d'erreurs.",
        "Allô Papiers ne peut pas être tenu responsable des décisions que vous prenez, ni des conséquences d'un courrier envoyé sans relecture, ni d'un délai manqué lorsque la date n'a pas été confirmée dans votre compte. [À VALIDER PAR UN JURISTE : clause de limitation de responsabilité, compatible avec le droit de la consommation]",
        "Rien dans ces conditions ne limite les droits que la loi vous accorde en tant que consommateur.",
      ],
    },
    {
      heading: "9. Suspension du compte",
      paragraphs: [
        "En cas de non-respect grave de ces conditions (fraude, abus, atteinte à la sécurité), nous pouvons suspendre votre compte. Sauf urgence, nous vous prévenons à l'avance et vous expliquons pourquoi. [À VALIDER PAR UN JURISTE]",
      ],
    },
    {
      heading: "10. Fin du contrat",
      paragraphs: [
        "Vous pouvez supprimer votre compte à tout moment depuis votre espace. Vos documents et données sont alors effacés, sauf ce que la loi nous oblige à conserver (voir la politique de confidentialité).",
        "Si nous décidons d'arrêter le service, nous vous prévenons à l'avance pour que vous puissiez récupérer vos documents. [À COMPLÉTER : délai de préavis]",
      ],
    },
    {
      heading: "11. Modification des conditions",
      paragraphs: [
        "Nous pouvons modifier ces conditions. Nous vous prévenons par e-mail ou dans votre compte avant l'entrée en vigueur d'un changement important. Si vous n'êtes pas d'accord, vous pouvez résilier sans frais. [À COMPLÉTER : délai de prévenance]",
      ],
    },
    {
      heading: "12. Droit applicable et médiation",
      paragraphs: [
        "Ces conditions sont soumises au droit français.",
        "En cas de litige, contactez-nous d'abord à [À COMPLÉTER : contact@allopapiers.fr] : nous chercherons une solution à l'amiable.",
        "Si le désaccord persiste, vous pouvez recourir gratuitement au médiateur de la consommation (article L612-1 du Code de la consommation) : [À COMPLÉTER : nom, adresse et site internet du médiateur].",
        "À défaut, le litige pourra être porté devant les tribunaux compétents selon les règles du droit français. [À VALIDER PAR UN JURISTE]",
      ],
    },
    {
      heading: "13. Contact",
      paragraphs: [
        "[À COMPLÉTER : raison sociale], [À COMPLÉTER : adresse postale], e-mail : [À COMPLÉTER : contact@allopapiers.fr].",
      ],
    },
  ],
};

export const LEGAL_PAGES: Record<LegalPage["slug"], LegalPage> = {
  "mentions-legales": mentionsLegales,
  confidentialite,
  conditions,
};

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

export const FAQ: FaqItem[] = [
  // Le service
  {
    category: "Le service",
    q: "Qu'est-ce qu'Allô Papiers ?",
    a: "Allô Papiers vous aide à comprendre vos courriers administratifs et à y répondre. Vous prenez votre courrier en photo ou envoyez un PDF : le service vous explique ce qu'il dit, ce qu'on attend de vous et peut vous aider à préparer une réponse. C'est vous qui décidez de la suite.",
  },
  {
    category: "Le service",
    q: "Est-ce un service officiel de l'administration ?",
    a: "Non. Allô Papiers est un service privé et indépendant, qui n'est pas affilié à l'administration. Pour une démarche officielle, les sites de l'administration et les lieux France Services restent vos interlocuteurs.",
  },
  {
    category: "Le service",
    q: "Allô Papiers se connecte-t-il à mon compte CAF, Ameli ou impôts ?",
    a: "Non, jamais. Nous ne nous connectons à aucun de vos comptes (CAF, Ameli, impôts, banque, assurance) et nous ne vous demandons jamais leurs mots de passe. Si quelqu'un vous les demande au nom d'Allô Papiers, ne les donnez pas.",
  },
  {
    category: "Le service",
    q: "Allô Papiers remplace-t-il un avocat ?",
    a: "Non. Allô Papiers vous aide à comprendre et à répondre, mais il ne remplace pas un avocat ou un professionnel habilité. Ses réponses ne sont pas des conseils juridiques. Pour une situation importante ou complexe, faites-vous accompagner.",
  },
  {
    category: "Le service",
    q: "L'intelligence artificielle peut-elle se tromper ?",
    a: "Oui. L'IA peut mal lire un document, oublier un détail ou mal comprendre une situation. Relisez toujours les explications et les lettres proposées avant de les utiliser. En cas de doute, vérifiez auprès de l'organisme concerné ou d'un professionnel.",
  },
  {
    category: "Le service",
    q: "Qu'est-ce que France Services et comment le trouver ?",
    a: "France Services, ce sont des lieux publics où des agents vous aident gratuitement dans vos démarches administratives. Allô Papiers peut vous indiquer les lieux proches de chez vous, à partir de l'annuaire officiel de service-public.gouv.fr (source et date de mise à jour affichées). Votre position n'est utilisée que si vous l'autorisez, une seule fois, et elle n'est pas conservée.",
  },

  // Documents et crédits
  {
    category: "Documents et crédits",
    q: "Qu'est-ce qui compte comme « un document » ?",
    a: "Un document, c'est un courrier de 10 pages maximum (photos ou PDF) analysé en une fois. Si votre lettre fait plusieurs pages, elles comptent ensemble pour 1 seul document. Il n'y a pas de paiement au document.",
  },
  {
    category: "Documents et crédits",
    q: "Les exemples et les analyses ratées sont-ils décomptés ?",
    a: "Non. Les exemples fictifs ne consomment jamais de crédit, et une analyse qui échoue non plus. Vous pouvez donc essayer le service sans crainte.",
  },
  {
    category: "Documents et crédits",
    q: "Mes rappels d'échéance sont-ils automatiques ?",
    a: "Nous ne vous envoyons des rappels que pour les dates que vous avez vous-même confirmées. Si l'IA repère une date dans un courrier, elle vous la propose, mais c'est à vous de la vérifier et de la valider. Les dates sont calculées à l'heure de Paris.",
  },
  {
    category: "Documents et crédits",
    q: "Comment supprimer mes documents ou mon compte ?",
    a: "Depuis votre compte, vous pouvez supprimer un document à tout moment : ses fichiers, ses analyses et les conversations liées sont effacés. Vous pouvez aussi choisir combien de temps vos documents sont gardés (365 jours par défaut). La suppression du compte efface tout, sauf ce que la loi nous oblige à garder, comme les factures ; un élément supprimé peut subsister un temps dans les sauvegardes de l'hébergeur jusqu'à leur expiration.",
  },

  // Sécurité et coffre-fort
  {
    category: "Sécurité et coffre-fort",
    q: "Mes données servent-elles à entraîner l'intelligence artificielle ?",
    a: "Non. Nous utilisons Claude, d'Anthropic, via son offre commerciale. Selon les règles publiées par Anthropic, les données transmises de cette façon ne servent pas à entraîner ses modèles et sont supprimées de ses systèmes sous 30 jours, sauf obligation légale ou violation de ses règles d'utilisation.",
  },
  {
    category: "Sécurité et coffre-fort",
    q: "Où sont stockées mes données, et où l'IA les analyse-t-elle ?",
    a: "Vos fichiers et votre compte sont stockés chez notre hébergeur dans une région de l'Union européenne. En revanche, l'analyse par l'IA (Anthropic) a lieu en dehors de l'Union européenne, notamment aux États-Unis, dans un cadre contractuel prévu par le droit européen. C'est pourquoi nous vous demandons votre accord avant la première analyse ; sans cet accord, la rédaction guidée de lettres reste possible.",
  },
  {
    category: "Sécurité et coffre-fort",
    q: "L'équipe d'Allô Papiers peut-elle lire mes documents ?",
    a: "Personne chez nous ne consulte vos documents dans le cadre normal du service. Les accès techniques sont limités à un nombre restreint de personnes et le contenu des documents n'est jamais copié dans nos journaux techniques. [À COMPLÉTER : procédure interne d'accès exceptionnel, par exemple à votre demande pour résoudre un problème]",
  },
  {
    category: "Sécurité et coffre-fort",
    q: "Qu'est-ce que le coffre-fort ?",
    a: "C'est l'espace où sont rangés vos documents et leurs analyses. Il demande une vérification renforcée pour s'ouvrir : votre clé d'accès, ou à défaut un code reçu par e-mail. Vos fichiers y sont chiffrés, mais ce n'est pas un chiffrement « de bout en bout » : pour être analysé, leur contenu doit pouvoir être lu temporairement par notre serveur et par le prestataire d'IA.",
  },
  {
    category: "Sécurité et coffre-fort",
    q: "Avec une clé d'accès, le site reçoit-il mon empreinte digitale ?",
    a: "Non. Avec une clé d'accès (empreinte, visage ou code de votre appareil), la vérification se fait sur votre téléphone ou votre ordinateur. Le site reçoit seulement une clé publique et une preuve signée par l'appareil, jamais votre empreinte ni l'image de votre visage.",
  },
  {
    category: "Sécurité et coffre-fort",
    q: "J'ai perdu mon téléphone ou ma clé d'accès : que faire ?",
    a: "Si vous avez créé une clé d'accès, un simple code par e-mail ne suffit pas pour ouvrir le coffre-fort : c'est une protection en cas de vol de votre boîte mail. Utilisez un de vos codes de secours. Sinon, une procédure de récupération est possible, avec un délai de 72 heures et une alerte envoyée par e-mail pour vous permettre de réagir si ce n'est pas vous.",
  },
  {
    category: "Sécurité et coffre-fort",
    q: "Pourquoi ma session se verrouille-t-elle toute seule ?",
    a: "Par sécurité, votre session se verrouille après 20 minutes sans activité. Cela évite qu'une autre personne accède à vos papiers si vous laissez votre écran ouvert. Il suffit de vous reconnecter pour continuer.",
  },

  // Abonnement
  {
    category: "Abonnement",
    q: "Quelle différence entre l'offre Gratuite et l'offre Plus ?",
    a: "L'offre Gratuite permet d'analyser 3 documents administratifs simples par mois, sans carte bancaire. L'offre Plus, à 4,99 € par mois, ajoute les parcours avancés : paie, travail, contrats, notaire, repérage d'anomalies, discussion avec vos documents, comparaisons et suivi des dossiers. Elle comprend chaque mois jusqu'à 30 documents, 150 questions et 20 comparaisons, limites affichées dans votre compte ; les compteurs repartent à zéro le 1er de chaque mois.",
  },
  {
    category: "Abonnement",
    q: "Comment résilier l'offre Plus ?",
    a: "Depuis votre compte, cliquez sur « Résilier » : cela se fait en trois clics, à tout moment. La résiliation prend effet à la fin de la période déjà payée. Nous ne vous faisons jamais passer automatiquement à une offre plus chère.",
  },

  // Courriers et envois
  {
    category: "Courriers et envois",
    q: "Comment fonctionne l'envoi en lettre recommandée ?",
    a: "C'est une option payante, séparée de l'abonnement, réglée par carte via Stripe ; le prix est affiché avant validation. Rien n'est envoyé sans votre accord : vous cochez « J'ai relu et je valide cet envoi en mon nom », puis vous cliquez sur « Envoyer ». Nous gardons une preuve de votre validation (date, heure, version exacte du contenu, destinataire, pièces jointes, prix).",
  },
  {
    category: "Courriers et envois",
    q: "Mes lettres recommandées sont-elles vraiment envoyées aujourd'hui ?",
    a: "Pas encore. Pour l'instant, la connexion avec La Poste fonctionne uniquement en mode TEST : l'envoi est simulé, le numéro de suivi est fictif et aucune lettre ne part réellement. Les envois réels ne seront possibles qu'après la signature d'un contrat avec La Poste / Maileva et la vérification de l'intégration.",
  },
  {
    category: "Courriers et envois",
    q: "Puis-je écrire une lettre sans utiliser l'intelligence artificielle ?",
    a: "Oui. La rédaction guidée de lettres fonctionne sans IA : vous répondez à quelques questions et la lettre se construit pas à pas. C'est aussi la solution si vous ne souhaitez pas donner votre accord pour l'analyse par l'IA.",
  },
];
