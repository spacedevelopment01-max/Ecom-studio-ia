/**
 * Sécurité des documents : textes partagés entre l'accueil et la page /securite.
 * Règle : n'écrire que ce que le code fait réellement, et dire clairement ses limites.
 * Les engagements du fournisseur d'IA sont à revérifier avant le lancement (voir README).
 */

/** `limite` : la réponse décrit une limite (affichée en orange, pas en vert). */
export type SecurityAnswer = { q: string; a: string; detail: string; limite?: boolean };

/** Les questions à se poser avant de confier un papier à n'importe quelle IA. */
export const QUESTIONS: SecurityAnswer[] = [
  {
    q: "Où sont stockés mes fichiers ?",
    a: "En Europe, dans un espace privé, chiffrés.",
    detail:
      "Vos fichiers sont stockés chez un hébergeur situé à Paris, dans un espace privé sans adresse publique. Chaque fichier est chiffré par notre serveur (AES-256) avant d'être enregistré, en plus du chiffrement de l'hébergeur. Les échanges entre votre téléphone et le site passent toujours par une connexion chiffrée (HTTPS).",
  },
  {
    q: "Mon document sert-il à entraîner une IA ?",
    a: "Non.",
    detail:
      "Nous utilisons l'offre professionnelle (API) de notre fournisseur d'IA, Anthropic. Selon ses conditions, les données envoyées ainsi ne servent pas à entraîner ses modèles et sont supprimées de ses systèmes sous 30 jours, sauf obligation légale.",
  },
  {
    q: "L'IA lit-elle mon document ?",
    a: "Oui, le temps de l'analyse. C'est indispensable, et nous le disons.",
    limite: true,
    detail:
      "Pour expliquer un courrier, l'IA doit pouvoir le lire. Pendant l'analyse, le document est donc lisible par notre serveur et par notre fournisseur, dont les serveurs se trouvent hors de l'Union européenne (transfert encadré par des clauses contractuelles types). C'est pourquoi nous ne parlons pas de « chiffrement de bout en bout » : ce serait faux. Rien n'est envoyé à l'IA sans votre accord.",
  },
  {
    q: "Qui peut ouvrir mes documents ?",
    a: "Vous, après connexion. Les plus sensibles demandent votre empreinte ou un code.",
    detail:
      "À chaque demande, le serveur vérifie que le document vous appartient. Les originaux et les pièces sensibles (identité, banque, santé…) sont rangés dans un coffre-fort qui s'ouvre avec votre empreinte, votre visage ou le code de votre téléphone (votre empreinte reste dans votre téléphone), ou avec un code reçu par email. Le coffre se referme après 20 minutes d'inactivité. Le site ne propose aucun écran permettant à l'équipe de parcourir vos documents.",
  },
  {
    q: "Puis-je tout effacer ?",
    a: "Oui, à tout moment, pour de vrai.",
    detail:
      "Supprimer un document efface aussi ses fichiers du stockage, pas seulement sa ligne dans une liste. Vous choisissez la durée de conservation de vos documents, vous pouvez télécharger vos données et supprimer votre compte en entier.",
  },
  {
    q: "Me demande-t-on mes mots de passe ?",
    a: "Jamais.",
    detail:
      "Allô Papiers ne se connecte jamais à vos comptes CAF, Ameli, impôts, banque ou assurance. Il ne vous demandera jamais vos mots de passe, vos codes de carte bancaire ni les codes reçus par SMS. La connexion se fait par un lien envoyé par email, sans mot de passe à retenir.",
  },
  {
    q: "Quelque chose peut-il partir sans moi ?",
    a: "Non.",
    detail:
      "Aucun courrier, aucune pièce jointe et aucun paiement ne part sans que vous ayez vu le texte, le destinataire, les pièces et le prix, puis coché « J'ai relu et je valide cet envoi en mon nom ».",
  },
];

/** Bons réflexes, valables avec n'importe quel service d'IA. */
export const REFLEXES = [
  "Ne photographiez jamais un mot de passe, un code de carte bancaire ou un code reçu par SMS : aucune démarche ne les demande.",
  "Avant de déposer un papier dans une application d'IA, cherchez où il est stocké, s'il sert à entraîner l'IA, et comment l'effacer. Si la réponse n'est écrite nulle part, abstenez-vous.",
  "Selon le service et vos réglages, une application d'IA grand public peut conserver vos conversations ou s'en servir pour s'améliorer. Vérifiez ses paramètres de confidentialité.",
  "Effacez les documents dont vous n'avez plus besoin.",
  "Méfiez-vous des messages qui vous pressent de payer ou de « régulariser » par un lien : vérifiez toujours en vous connectant vous-même au site officiel.",
];

/** Ce que nous refusons de promettre, parce que ce serait inexact. */
export const NON_PROMESSES = [
  "Nous ne disons pas « 100 % sécurisé » : aucun service en ligne ne peut le garantir.",
  "Nous ne parlons pas de « chiffrement de bout en bout » : l'analyse demande que le document soit lisible le temps du traitement.",
  "Nous n'affichons aucun label ni aucune certification que nous n'avons pas obtenus.",
];
