/**
 * Catalogue des modèles de courriers guidés.
 *
 * Règles produit :
 * - on ne pose que les questions utiles à la démarche choisie ;
 * - on ne calcule jamais de préavis, de date de fin ni de délai légal ;
 * - on n'invente aucune référence juridique ;
 * - le corps ne contient ni les blocs d'adresse ni la formule de politesse finale
 *   (ajoutés par l'application).
 */
import type { Answers, LetterTemplate, Question } from "./types";

/* ------------------------------------------------------------------ */
/* Aides de mise en forme                                              */
/* ------------------------------------------------------------------ */

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** « 2026-10-24 » → « 24 octobre 2026 ». Analyse manuelle (aucun fuseau horaire). Renvoie "" si invalide. */
export function formatDateFr(value: string | undefined): string {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return "";
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${day === 1 ? "1er" : String(day)} ${MONTHS_FR[month - 1]} ${year}`;
}

/** « 120,50 » → « 120,50 € ». Renvoie "" si vide. */
export function formatMoney(value: string | undefined): string {
  const v = (value ?? "").trim().replace(/\s*€\s*$/, "");
  return v ? `${v} €` : "";
}

function txt(a: Answers, id: string): string {
  return (a[id] ?? "").trim();
}

function todo(label: string): string {
  return `[à compléter : ${label}]`;
}

/** Valeur texte, ou repère « [à compléter : …] » si vide. */
function t(a: Answers, id: string, label: string): string {
  return txt(a, id) || todo(label);
}

/** Date formatée, ou repère « [à compléter : …] » si vide/invalide. */
function d(a: Answers, id: string, label: string): string {
  return formatDateFr(txt(a, id)) || todo(label);
}

/** Montant formaté, ou repère « [à compléter : …] » si vide. */
function m(a: Answers, id: string, label: string): string {
  return formatMoney(txt(a, id)) || todo(label);
}

/** Assemble les paragraphes non vides. */
function para(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((p): p is string => typeof p === "string" && p.trim() !== "").join("\n\n");
}

const OPENING = "Madame, Monsieur,";

const YES_NO = [
  { value: "oui", label: "Oui" },
  { value: "non", label: "Non" },
];

const CHECK_KEEP_COPY = "Gardez une copie du courrier et la preuve d'envoi ou de remise.";
const CHECK_NOTICE = "Vérifiez la durée de préavis prévue par votre contrat ou votre convention collective.";

/* ------------------------------------------------------------------ */
/* Travail                                                             */
/* ------------------------------------------------------------------ */

const travail: LetterTemplate[] = [
  {
    id: "demission-cdi",
    domain: "travail",
    title: "Démission d'un CDI",
    description: "Informer votre employeur de votre démission d'un contrat à durée indéterminée.",
    keywords: ["démission", "démissionner", "quitter son emploi", "CDI", "préavis", "départ", "lettre de démission"],
    warning:
      "Ce modèle concerne un CDI dans le secteur privé. Si vous êtes agent de la fonction publique, la procédure est différente : renseignez-vous auprès de votre service des ressources humaines. Une démission est une décision définitive : en cas de doute, prenez conseil avant d'envoyer ce courrier.",
    professionalNotice: true,
    sending: {
      mode: "remise_main_propre_ou_lrar",
      note: "La démission peut être remise en main propre contre décharge ou envoyée en recommandé avec avis de réception : gardez une preuve de la date.",
    },
    questions: [
      { id: "poste", label: "Votre poste", type: "text", required: true, placeholder: "Ex. : assistante comptable" },
      { id: "date_embauche", label: "Date d'embauche", type: "date", required: true },
      {
        id: "date_fin",
        label: "Date de fin de contrat que vous avez déterminée (facultatif)",
        type: "date",
        help: "Nous ne calculons pas le préavis. Si vous ne connaissez pas encore la date, laissez vide : le courrier indiquera que le préavis s'applique selon votre contrat ou votre convention collective.",
      },
      {
        id: "dispense",
        label: "Souhaitez-vous demander une dispense de préavis ?",
        type: "radio",
        options: YES_NO,
        help: "L'employeur est libre d'accepter ou non.",
      },
    ],
    build: (a) => {
      const fin = formatDateFr(txt(a, "date_fin"));
      return {
        subject: "Démission",
        body: para(
          OPENING,
          `Par la présente, je vous informe de ma décision de démissionner de mon poste de ${t(a, "poste", "votre poste")}, que j'occupe depuis le ${d(a, "date_embauche", "date d'embauche")} dans le cadre d'un contrat à durée indéterminée.`,
          fin
            ? `Je prends note que mon contrat prendra fin le ${fin}, à l'issue de mon préavis.`
            : "J'effectuerai mon préavis selon la durée prévue par mon contrat de travail ou la convention collective applicable.",
          txt(a, "dispense") === "oui" &&
            "Je souhaiterais, si cela est possible pour vous, être dispensé(e) d'effectuer tout ou partie de ce préavis. Je vous remercie de bien vouloir me faire connaître votre réponse.",
          "Je vous remercie de bien vouloir me remettre, à la fin de mon contrat, les documents habituels : certificat de travail, attestation employeur destinée à France Travail et reçu pour solde de tout compte."
        ),
        checks: [
          CHECK_NOTICE,
          "Vérifiez que vous êtes bien en CDI dans le secteur privé.",
          "Datez et signez le courrier ; remettez-le contre décharge ou envoyez-le en recommandé avec avis de réception.",
          CHECK_KEEP_COPY,
        ],
      };
    },
  },
  {
    id: "demande-entretien-rupture-conventionnelle",
    domain: "travail",
    title: "Demande d'entretien pour une rupture conventionnelle",
    description: "Proposer à votre employeur un entretien pour discuter d'une éventuelle rupture conventionnelle.",
    keywords: ["rupture conventionnelle", "entretien", "quitter son emploi", "départ négocié", "accord employeur", "CDI"],
    warning:
      "Ce courrier est une demande d'entretien pour discuter d'une rupture conventionnelle. Ce n'est pas une démission : votre contrat continue normalement. La rupture conventionnelle nécessite l'accord de votre employeur et de vous-même.",
    professionalNotice: true,
    sending: {
      mode: "au_choix",
      note: "Vous pouvez remettre ce courrier en main propre contre décharge, l'envoyer en recommandé ou par e-mail : gardez une trace de votre demande.",
    },
    questions: [
      { id: "poste", label: "Votre poste", type: "text", required: true },
      { id: "date_embauche", label: "Date d'embauche", type: "date", required: true },
      {
        id: "motif",
        label: "Raison de votre demande (facultatif)",
        type: "textarea",
        help: "Restez bref et factuel. Vous pouvez aussi laisser vide.",
        placeholder: "Ex. : projet de reconversion professionnelle",
      },
      {
        id: "disponibilites",
        label: "Vos disponibilités pour l'entretien (facultatif)",
        type: "text",
        placeholder: "Ex. : en fin de journée, du lundi au jeudi",
      },
    ],
    build: (a) => ({
      subject: "Demande d'entretien en vue d'une éventuelle rupture conventionnelle",
      body: para(
        OPENING,
        `J'occupe le poste de ${t(a, "poste", "votre poste")} dans votre entreprise depuis le ${d(a, "date_embauche", "date d'embauche")}, dans le cadre d'un contrat à durée indéterminée.`,
        "Je souhaiterais vous rencontrer afin d'échanger sur la possibilité de mettre fin à mon contrat de travail dans le cadre d'une rupture conventionnelle, d'un commun accord.",
        txt(a, "motif") && `Cette demande est motivée par la raison suivante : ${txt(a, "motif")}.`,
        "Je précise que ce courrier n'est pas une démission : il s'agit uniquement d'une demande d'entretien pour discuter ensemble de cette possibilité. Je continue bien entendu d'exercer mes fonctions normalement.",
        txt(a, "disponibilites")
          ? `Je suis disponible pour cet entretien ${txt(a, "disponibilites")}, et reste à votre écoute pour convenir d'une date.`
          : "Je reste à votre disposition pour convenir d'une date d'entretien."
      ),
      checks: [
        "Relisez le courrier : il ne doit contenir aucune formule de démission.",
        "La rupture conventionnelle concerne les CDI ; vérifiez votre type de contrat.",
        "Renseignez-vous sur la procédure (entretien, convention, délai de rétractation, homologation) sur service-public.gouv.fr.",
        CHECK_KEEP_COPY,
      ],
    }),
  },
  {
    id: "fin-periode-essai",
    domain: "travail",
    title: "Fin de la période d'essai (à l'initiative du salarié)",
    description: "Informer votre employeur que vous mettez fin à votre période d'essai.",
    keywords: ["période d'essai", "fin d'essai", "rompre l'essai", "quitter", "CDI", "CDD", "délai de prévenance"],
    warning:
      "Ce modèle est destiné au salarié qui met fin à sa propre période d'essai. Un délai de prévenance peut s'appliquer : nous ne le calculons pas, vérifiez-le dans votre contrat ou votre convention collective.",
    professionalNotice: true,
    sending: {
      mode: "remise_main_propre_ou_lrar",
      note: "Remettez le courrier en main propre contre décharge ou envoyez-le en recommandé avec avis de réception : la date compte.",
    },
    questions: [
      {
        id: "contrat",
        label: "Type de contrat",
        type: "radio",
        required: true,
        options: [
          { value: "cdi", label: "CDI" },
          { value: "cdd", label: "CDD" },
        ],
      },
      { id: "poste", label: "Votre poste", type: "text", required: true },
      { id: "date_debut", label: "Date de début du contrat", type: "date", required: true },
      {
        id: "date_fin",
        label: "Dernier jour travaillé que vous avez déterminé",
        type: "date",
        required: true,
        help: "Déterminez cette date vous-même en tenant compte du délai de prévenance applicable.",
      },
    ],
    build: (a) => {
      const contrat =
        txt(a, "contrat") === "cdd" ? "contrat à durée déterminée" : txt(a, "contrat") === "cdi" ? "contrat à durée indéterminée" : "contrat de travail";
      return {
        subject: "Fin de ma période d'essai",
        body: para(
          OPENING,
          `J'ai été embauché(e) le ${d(a, "date_debut", "date de début")} au poste de ${t(a, "poste", "votre poste")}, dans le cadre d'un ${contrat}.`,
          "Par la présente, je vous informe de ma décision de mettre fin à ma période d'essai.",
          `Mon dernier jour de travail sera le ${d(a, "date_fin", "dernier jour travaillé")}.`,
          "Je vous remercie de bien vouloir me remettre, à cette date, mon certificat de travail, l'attestation employeur destinée à France Travail et le reçu pour solde de tout compte."
        ),
        checks: [
          "Vérifiez que vous êtes toujours en période d'essai (durée et éventuel renouvellement prévus au contrat).",
          "Vérifiez le délai de prévenance prévu par votre contrat ou votre convention collective avant de fixer la date.",
          CHECK_KEEP_COPY,
        ],
      };
    },
  },
  {
    id: "rupture-anticipee-cdd-accord",
    domain: "travail",
    title: "Proposition de rupture anticipée d'un CDD d'un commun accord",
    description: "Proposer à votre employeur de mettre fin à votre CDD avant son terme, d'un commun accord.",
    keywords: ["CDD", "rupture anticipée", "commun accord", "fin de CDD", "quitter un CDD", "accord amiable"],
    warning:
      "Ce courrier est une proposition : la rupture d'un commun accord n'est valable que si votre employeur l'accepte, en principe par écrit. Il ne met pas fin à votre contrat à lui seul.",
    professionalNotice: true,
    sending: {
      mode: "remise_main_propre_ou_lrar",
      note: "Remettez la proposition contre décharge ou envoyez-la en recommandé ; conservez la réponse écrite de votre employeur.",
    },
    questions: [
      { id: "poste", label: "Votre poste", type: "text", required: true },
      { id: "date_debut", label: "Date de début du CDD", type: "date", required: true },
      { id: "date_terme", label: "Date de fin prévue au contrat", type: "date", required: true },
      { id: "date_souhaitee", label: "Date de fin que vous proposez", type: "date", required: true },
      { id: "motif", label: "Raison (facultatif)", type: "textarea", placeholder: "Ex. : j'ai trouvé un emploi en CDI" },
    ],
    build: (a) => ({
      subject: "Proposition de rupture anticipée de mon CDD d'un commun accord",
      body: para(
        OPENING,
        `Je suis employé(e) au poste de ${t(a, "poste", "votre poste")} dans le cadre d'un contrat à durée déterminée ayant débuté le ${d(a, "date_debut", "date de début")} et dont le terme est prévu le ${d(a, "date_terme", "date de fin prévue")}.`,
        `Je souhaiterais vous proposer de mettre fin à ce contrat de manière anticipée, d'un commun accord, à la date du ${d(a, "date_souhaitee", "date proposée")}.`,
        txt(a, "motif") && `Cette demande s'explique par la raison suivante : ${txt(a, "motif")}.`,
        "Si vous acceptez cette proposition, je vous remercie de bien vouloir me le confirmer par écrit. Je reste disponible pour en discuter et pour organiser au mieux la transmission de mes dossiers."
      ),
      checks: [
        "Ce courrier ne vaut pas rupture : attendez l'accord écrit de votre employeur.",
        "Vérifiez les dates indiquées avec votre contrat.",
        "Renseignez-vous sur les conséquences (indemnités, droits au chômage) sur service-public.gouv.fr ou auprès de France Travail.",
        CHECK_KEEP_COPY,
      ],
    }),
  },
  {
    id: "depart-retraite",
    domain: "travail",
    title: "Départ volontaire à la retraite",
    description: "Informer votre employeur de votre départ volontaire à la retraite.",
    keywords: ["retraite", "départ à la retraite", "départ volontaire", "fin de carrière", "pension", "préavis"],
    warning:
      "Avant d'envoyer ce courrier, vérifiez vos droits et la date de départ possible auprès de votre caisse de retraite et sur info-retraite.fr. Vérifiez aussi la durée de préavis prévue par votre convention collective : nous ne la calculons pas.",
    professionalNotice: true,
    sending: {
      mode: "remise_main_propre_ou_lrar",
      note: "Remettez le courrier en main propre contre décharge ou envoyez-le en recommandé avec avis de réception : gardez une preuve de la date.",
    },
    questions: [
      { id: "poste", label: "Votre poste", type: "text", required: true },
      { id: "date_embauche", label: "Date d'embauche", type: "date", required: true },
      {
        id: "date_depart",
        label: "Date de départ que vous avez déterminée",
        type: "date",
        required: true,
        help: "Date fixée après vérification auprès de votre caisse de retraite et en tenant compte de votre préavis.",
      },
    ],
    build: (a) => ({
      subject: "Départ volontaire à la retraite",
      body: para(
        OPENING,
        `J'occupe le poste de ${t(a, "poste", "votre poste")} dans votre entreprise depuis le ${d(a, "date_embauche", "date d'embauche")}.`,
        `Par la présente, je vous informe de ma décision de faire valoir mes droits à la retraite et de quitter l'entreprise dans le cadre d'un départ volontaire. Mon contrat de travail prendra fin le ${d(a, "date_depart", "date de départ")}, à l'issue de mon préavis.`,
        "Je vous remercie de bien vouloir me faire connaître les modalités de mon départ et de me remettre, le moment venu, mon certificat de travail, mon reçu pour solde de tout compte et, le cas échéant, le détail de l'indemnité de départ à la retraite.",
        "Je vous remercie pour ces années de collaboration."
      ),
      checks: [
        "Vérifiez vos droits et votre date de départ auprès de votre caisse de retraite et sur info-retraite.fr avant l'envoi.",
        "Vérifiez la durée de préavis prévue par votre convention collective.",
        "Pensez à faire votre demande de retraite auprès des caisses, en plus de ce courrier.",
        CHECK_KEEP_COPY,
      ],
    }),
  },
  {
    id: "demande-documents-fin-contrat",
    domain: "travail",
    title: "Demande des documents de fin de contrat",
    description: "Réclamer à votre ancien employeur les documents remis à la fin du contrat.",
    keywords: ["certificat de travail", "attestation France Travail", "attestation Pôle emploi", "solde de tout compte", "documents de fin de contrat", "fin de contrat"],
    sending: {
      mode: "au_choix",
      note: "Un e-mail peut suffire pour une première demande ; en cas de relance, privilégiez le recommandé avec avis de réception.",
    },
    questions: [
      { id: "poste", label: "Poste occupé", type: "text", required: true },
      { id: "date_fin", label: "Date de fin de votre contrat", type: "date", required: true },
      { id: "certificat", label: "Vous manque-t-il le certificat de travail ?", type: "radio", options: YES_NO, required: true },
      { id: "attestation", label: "Vous manque-t-il l'attestation employeur pour France Travail ?", type: "radio", options: YES_NO, required: true },
      { id: "solde", label: "Vous manque-t-il le reçu pour solde de tout compte ?", type: "radio", options: YES_NO, required: true },
      { id: "autre", label: "Autre document manquant (facultatif)", type: "text" },
    ],
    build: (a) => {
      const docs: string[] = [];
      if (txt(a, "certificat") === "oui") docs.push("- le certificat de travail ;");
      if (txt(a, "attestation") === "oui") docs.push("- l'attestation employeur destinée à France Travail ;");
      if (txt(a, "solde") === "oui") docs.push("- le reçu pour solde de tout compte ;");
      if (txt(a, "autre")) docs.push(`- ${txt(a, "autre")} ;`);
      if (docs.length === 0) docs.push(`- ${todo("documents manquants")}`);
      docs[docs.length - 1] = docs[docs.length - 1].replace(/ ;$/, ".");
      return {
        subject: "Demande des documents de fin de contrat",
        body: para(
          OPENING,
          `J'ai occupé le poste de ${t(a, "poste", "poste occupé")} dans votre entreprise jusqu'au ${d(a, "date_fin", "date de fin de contrat")}.`,
          `À ce jour, je n'ai pas reçu les documents suivants :\n${docs.join("\n")}`,
          "Ces documents me sont nécessaires, notamment pour mes démarches auprès de France Travail. Je vous remercie de bien vouloir me les adresser dans les meilleurs délais, ou de m'indiquer quand je pourrai les récupérer."
        ),
        checks: [
          "Vérifiez votre messagerie et votre espace en ligne : certains documents sont parfois transmis par voie dématérialisée.",
          "Vérifiez la date de fin de contrat indiquée.",
          CHECK_KEEP_COPY,
        ],
      };
    },
  },
  {
    id: "explication-fiche-paie",
    domain: "travail",
    title: "Demande d'explication sur une fiche de paie",
    description: "Demander au service paie d'expliquer certaines lignes de votre bulletin de salaire.",
    keywords: ["fiche de paie", "bulletin de salaire", "paie", "salaire", "ligne", "retenue", "explication", "erreur de paie"],
    sending: { mode: "simple", note: "Un e-mail ou un courrier simple au service paie ou RH suffit en général." },
    questions: [
      { id: "mois", label: "Mois du bulletin concerné", type: "text", required: true, placeholder: "Ex. : septembre 2026" },
      {
        id: "lignes",
        label: "Lignes que vous souhaitez comprendre",
        type: "textarea",
        required: true,
        placeholder: "Ex. : « Absence non rémunérée » : 152,30 €",
      },
      { id: "matricule", label: "Votre matricule (facultatif)", type: "text" },
    ],
    build: (a) => ({
      subject: `Demande d'explication sur mon bulletin de paie de ${t(a, "mois", "mois")}`,
      body: para(
        OPENING,
        `${txt(a, "matricule") ? `Salarié(e) sous le matricule ${txt(a, "matricule")}, j'ai` : "J'ai"} bien reçu mon bulletin de paie du mois de ${t(a, "mois", "mois")}.`,
        `Je souhaiterais obtenir des explications sur les éléments suivants, que je ne comprends pas :\n${t(a, "lignes", "lignes concernées")}`,
        "Je vous remercie de bien vouloir m'indiquer à quoi correspondent ces lignes et comment elles ont été calculées. Si une erreur s'était glissée, je vous remercie par avance de bien vouloir procéder à la régularisation.",
        "Je reste à votre disposition pour tout échange à ce sujet."
      ),
      checks: [
        "Comparez avec le bulletin du mois précédent pour repérer ce qui a changé.",
        "Recopiez exactement le libellé et le montant des lignes concernées.",
        CHECK_KEEP_COPY,
      ],
    }),
  },
  {
    id: "salaire-non-recu",
    domain: "travail",
    title: "Salaire non reçu",
    description: "Signaler à votre employeur qu'un salaire n'a pas été versé et demander la régularisation.",
    keywords: ["salaire non payé", "salaire impayé", "retard de salaire", "paie non versée", "rappel de salaire", "régularisation"],
    professionalNotice: true,
    sending: {
      mode: "au_choix",
      note: "Commencez par un courrier simple ou un e-mail ; si la situation persiste, envoyez une relance en recommandé avec avis de réception.",
    },
    questions: [
      { id: "periode", label: "Période non payée", type: "text", required: true, placeholder: "Ex. : salaire de septembre 2026" },
      { id: "montant", label: "Montant attendu (facultatif)", type: "money", placeholder: "Ex. : 1 850,00" },
      { id: "date_habituelle", label: "Date habituelle de versement (facultatif)", type: "text", placeholder: "Ex. : le dernier jour du mois" },
      {
        id: "relance",
        label: "Avez-vous déjà signalé ce retard ?",
        type: "radio",
        options: YES_NO,
      },
    ],
    build: (a) => ({
      subject: `Salaire non reçu : ${t(a, "periode", "période")}`,
      body: para(
        OPENING,
        `Sauf erreur de ma part, je n'ai pas reçu à ce jour le versement correspondant à la période suivante : ${t(a, "periode", "période")}${txt(a, "montant") ? `, d'un montant attendu de ${m(a, "montant", "montant")}` : ""}.`,
        txt(a, "date_habituelle") && `Ce versement intervient habituellement ${txt(a, "date_habituelle")}.`,
        txt(a, "relance") === "oui" && "Je vous ai déjà signalé ce retard, sans avoir obtenu de régularisation à ce jour.",
        "Il s'agit peut-être d'un simple oubli ou d'un incident technique. Je vous remercie de bien vouloir vérifier la situation et procéder au versement dans les meilleurs délais, ou de m'indiquer la date à laquelle il interviendra.",
        "Je reste à votre disposition pour tout renseignement complémentaire."
      ),
      checks: [
        "Vérifiez vos relevés bancaires avant l'envoi.",
        "Conservez vos bulletins de paie et la preuve de vos demandes.",
        "Si la situation persiste, vous pouvez vous renseigner auprès de l'inspection du travail ou d'un professionnel du droit.",
      ],
    }),
  },
  {
    id: "demande-conges",
    domain: "travail",
    title: "Demande de congés payés",
    description: "Demander à votre employeur de poser des jours de congés payés.",
    keywords: ["congés payés", "vacances", "poser des congés", "jours de congé", "absence", "demande de congés"],
    sending: { mode: "simple", note: "Suivez la procédure habituelle de votre entreprise (e-mail, logiciel RH ou courrier) et gardez une trace." },
    questions: [
      { id: "date_debut", label: "Premier jour de congé", type: "date", required: true },
      { id: "date_fin", label: "Dernier jour de congé", type: "date", required: true },
      { id: "commentaire", label: "Précision (facultatif)", type: "textarea", placeholder: "Ex. : mes dossiers en cours seront transmis à…" },
    ],
    build: (a) => ({
      subject: "Demande de congés payés",
      body: para(
        OPENING,
        `Je souhaiterais poser des congés payés du ${d(a, "date_debut", "premier jour")} au ${d(a, "date_fin", "dernier jour")} inclus.`,
        txt(a, "commentaire"),
        "Je vous remercie de bien vouloir me confirmer votre accord. Je reste à votre disposition pour organiser au mieux mon absence."
      ),
      checks: [
        "Vérifiez votre solde de congés sur votre bulletin de paie.",
        "Respectez les règles et périodes de dépôt des demandes de votre entreprise.",
        "Attendez la confirmation de votre employeur avant de réserver.",
      ],
    }),
  },
  {
    id: "amenagement-horaires",
    domain: "travail",
    title: "Demande d'aménagement d'horaires",
    description: "Demander à votre employeur d'adapter vos horaires de travail.",
    keywords: ["horaires", "aménagement", "emploi du temps", "temps partiel", "planning", "organisation du travail"],
    sending: { mode: "simple", note: "Un courrier simple ou un e-mail suffit ; gardez une trace de la demande." },
    questions: [
      { id: "horaires_actuels", label: "Vos horaires actuels", type: "text", required: true, placeholder: "Ex. : 9 h – 17 h du lundi au vendredi" },
      { id: "horaires_souhaites", label: "Horaires souhaités", type: "text", required: true, placeholder: "Ex. : 8 h – 16 h" },
      { id: "date_debut", label: "À partir de quand ? (facultatif)", type: "date" },
      { id: "raison", label: "Raison (facultatif)", type: "textarea", help: "Vous n'êtes pas obligé(e) de donner une raison." },
    ],
    build: (a) => {
      const debut = formatDateFr(txt(a, "date_debut"));
      return {
        subject: "Demande d'aménagement de mes horaires de travail",
        body: para(
          OPENING,
          `Mes horaires de travail sont actuellement les suivants : ${t(a, "horaires_actuels", "horaires actuels")}.`,
          `Je souhaiterais, si l'organisation du service le permet, les aménager de la façon suivante : ${t(a, "horaires_souhaites", "horaires souhaités")}${debut ? `, à partir du ${debut}` : ""}.`,
          txt(a, "raison") && `Cette demande est motivée par la raison suivante : ${txt(a, "raison")}.`,
          "Je reste à votre disposition pour en discuter et trouver ensemble une organisation qui convienne au service."
        ),
        checks: [
          "Vérifiez les règles prévues par votre contrat ou votre convention collective.",
          "Proposez une solution réaliste pour le service.",
          CHECK_KEEP_COPY,
        ],
      };
    },
  },
  {
    id: "demande-attestation",
    domain: "travail",
    title: "Demande d'attestation à l'employeur",
    description: "Demander une attestation employeur, une attestation de salaire ou un autre justificatif.",
    keywords: ["attestation employeur", "attestation de salaire", "justificatif", "attestation de travail", "certificat"],
    sending: { mode: "simple", note: "Un e-mail ou un courrier simple au service RH suffit en général." },
    questions: [
      {
        id: "type",
        label: "Document demandé",
        type: "select",
        required: true,
        options: [
          { value: "employeur", label: "Attestation employeur (preuve d'emploi)" },
          { value: "salaire", label: "Attestation de salaire" },
          { value: "autre", label: "Autre document" },
        ],
      },
      { id: "autre", label: "Précisez le document", type: "text", required: true, showIf: { id: "type", equals: "autre" } },
      { id: "usage", label: "Pour quel usage ? (facultatif)", type: "text", placeholder: "Ex. : dossier de location" },
    ],
    build: (a) => {
      const type = txt(a, "type");
      const doc =
        type === "employeur"
          ? "une attestation employeur indiquant mon poste, mon type de contrat et ma date d'embauche"
          : type === "salaire"
            ? "une attestation de salaire"
            : type === "autre"
              ? t(a, "autre", "document demandé")
              : todo("document demandé");
      return {
        subject: "Demande d'attestation",
        body: para(
          OPENING,
          `Je vous remercie de bien vouloir me délivrer ${doc}.`,
          txt(a, "usage") && `Ce document m'est demandé pour l'usage suivant : ${txt(a, "usage")}.`,
          "Je vous remercie par avance de me le transmettre dans les meilleurs délais."
        ),
        checks: [
          "Vérifiez auprès de l'organisme demandeur le contenu exact attendu.",
          "Indiquez si vous avez une date limite.",
        ],
      };
    },
  },
];

/* ------------------------------------------------------------------ */
/* Logement                                                            */
/* ------------------------------------------------------------------ */

const logement: LetterTemplate[] = [
  {
    id: "demande-reparations",
    domain: "logement",
    title: "Demande de réparations au propriétaire",
    description: "Demander à votre propriétaire d'effectuer des réparations dans le logement.",
    keywords: ["réparations", "travaux", "propriétaire", "bailleur", "fuite", "chauffage", "panne", "humidité", "locataire"],
    sending: {
      mode: "au_choix",
      note: "Un courrier simple ou un e-mail peut suffire ; en cas d'absence de réponse, relancez en recommandé avec avis de réception.",
    },
    questions: [
      { id: "adresse", label: "Adresse du logement", type: "text", required: true },
      { id: "probleme", label: "Décrivez le problème", type: "textarea", required: true, placeholder: "Ex. : la chaudière ne fonctionne plus" },
      { id: "date_constat", label: "Date à laquelle vous l'avez constaté", type: "date" },
      { id: "photos", label: "Joignez-vous des photos ?", type: "radio", options: YES_NO },
    ],
    build: (a) => {
      const constat = formatDateFr(txt(a, "date_constat"));
      return {
        subject: "Demande de réparations dans le logement",
        body: para(
          OPENING,
          `Locataire du logement situé ${t(a, "adresse", "adresse du logement")}, je vous signale le problème suivant${constat ? `, constaté le ${constat}` : ""} :\n${t(a, "probleme", "description du problème")}`,
          txt(a, "photos") === "oui" && "Vous trouverez ci-joint des photos de la situation.",
          "Je vous remercie de bien vouloir faire le nécessaire pour que les réparations soient réalisées dans les meilleurs délais. Je reste disponible pour permettre l'accès au logement à l'artisan de votre choix."
        ),
        checks: [
          "Vérifiez s'il s'agit d'une réparation à la charge du propriétaire ou du locataire (service-public.gouv.fr).",
          "Prenez des photos datées.",
          CHECK_KEEP_COPY,
        ],
      };
    },
  },
  {
    id: "restitution-depot-garantie",
    domain: "logement",
    title: "Restitution du dépôt de garantie",
    description: "Demander à votre ancien propriétaire de vous restituer le dépôt de garantie.",
    keywords: ["dépôt de garantie", "caution", "restitution", "remboursement caution", "état des lieux", "fin de bail"],
    sending: { mode: "lrar", note: "Privilégiez le recommandé avec avis de réception pour garder une preuve de votre demande." },
    questions: [
      { id: "adresse", label: "Adresse du logement quitté", type: "text", required: true },
      { id: "date_sortie", label: "Date de l'état des lieux de sortie", type: "date", required: true },
      { id: "montant", label: "Montant du dépôt de garantie", type: "money", required: true },
      { id: "nouvelle_adresse", label: "Votre nouvelle adresse", type: "text", required: true },
      { id: "rib", label: "Joignez-vous un RIB ?", type: "radio", options: YES_NO },
    ],
    build: (a) => ({
      subject: "Demande de restitution du dépôt de garantie",
      body: para(
        OPENING,
        `J'ai quitté le logement situé ${t(a, "adresse", "adresse du logement")} ; l'état des lieux de sortie a été réalisé le ${d(a, "date_sortie", "date de l'état des lieux")} et les clés vous ont été remises.`,
        `Je vous remercie de bien vouloir me restituer le dépôt de garantie de ${m(a, "montant", "montant")} versé à l'entrée dans les lieux, dans les délais prévus par la réglementation. Si des sommes devaient être retenues, je vous remercie de m'en communiquer le détail et les justificatifs.`,
        `Vous pouvez m'adresser le règlement ou tout courrier à ma nouvelle adresse : ${t(a, "nouvelle_adresse", "nouvelle adresse")}.`,
        txt(a, "rib") === "oui" && "Vous trouverez ci-joint mon relevé d'identité bancaire pour faciliter le virement."
      ),
      checks: [
        "Vérifiez le délai de restitution applicable à votre situation sur service-public.gouv.fr.",
        "Joignez une copie de l'état des lieux de sortie si possible.",
        CHECK_KEEP_COPY,
      ],
    }),
  },
  {
    id: "explication-charges",
    domain: "logement",
    title: "Demande de détail des charges locatives",
    description: "Demander le détail et les justificatifs de la régularisation de vos charges.",
    keywords: ["charges locatives", "régularisation des charges", "justificatifs", "provisions", "décompte", "propriétaire", "syndic"],
    sending: { mode: "au_choix", note: "Un courrier simple ou un e-mail convient ; gardez une trace de la demande." },
    questions: [
      { id: "adresse", label: "Adresse du logement", type: "text", required: true },
      { id: "annee", label: "Année ou période concernée", type: "text", required: true, placeholder: "Ex. : 2025" },
      { id: "montant", label: "Montant réclamé (facultatif)", type: "money" },
      { id: "questions", label: "Vos questions précises (facultatif)", type: "textarea" },
    ],
    build: (a) => ({
      subject: `Demande de détail de la régularisation des charges (${t(a, "annee", "période")})`,
      body: para(
        OPENING,
        `Locataire du logement situé ${t(a, "adresse", "adresse du logement")}, j'ai bien reçu la régularisation des charges pour la période ${t(a, "annee", "période")}${txt(a, "montant") ? `, pour un montant de ${m(a, "montant", "montant")}` : ""}.`,
        "Afin de bien comprendre ce décompte, je vous remercie de bien vouloir m'adresser le détail des charges par poste ainsi que les justificatifs correspondants, ou de m'indiquer comment je peux les consulter.",
        txt(a, "questions") && `J'aurais également les questions suivantes :\n${txt(a, "questions")}`,
        "Je vous remercie par avance de votre retour."
      ),
      checks: [
        "Comparez avec le décompte de l'année précédente.",
        "Vérifiez le montant de vos provisions mensuelles sur vos quittances.",
        CHECK_KEEP_COPY,
      ],
    }),
  },
  {
    id: "conge-location-locataire",
    domain: "logement",
    title: "Préparation d'un congé de location",
    description: "Informer votre propriétaire que vous quittez le logement que vous louez.",
    keywords: ["congé", "préavis", "quitter son logement", "fin de bail", "résiliation bail", "déménagement", "locataire"],
    warning:
      "La durée du préavis dépend de votre situation (logement meublé ou non, zone tendue, motifs particuliers). Nous ne la calculons pas : vérifiez-la sur service-public.gouv.fr et indiquez la date de fin que vous avez déterminée.",
    sending: {
      mode: "lrar",
      note: "Le congé s'envoie en recommandé avec avis de réception, par acte de commissaire de justice ou se remet en main propre contre récépissé : la date de réception compte.",
    },
    questions: [
      { id: "adresse", label: "Adresse du logement", type: "text", required: true },
      {
        id: "meuble",
        label: "Le logement est-il loué meublé ?",
        type: "radio",
        required: true,
        options: [
          { value: "meuble", label: "Meublé" },
          { value: "vide", label: "Non meublé (vide)" },
        ],
      },
      { id: "date_bail", label: "Date de début du bail (facultatif)", type: "date" },
      {
        id: "date_fin",
        label: "Date de fin de location que vous avez déterminée",
        type: "date",
        required: true,
        help: "Déterminez-la après avoir vérifié la durée de préavis applicable.",
      },
      {
        id: "motif",
        label: "Motif particulier (facultatif)",
        type: "textarea",
        help: "Certains motifs peuvent réduire le préavis d'un logement vide ; un justificatif est alors à joindre.",
      },
    ],
    build: (a) => {
      const bail = formatDateFr(txt(a, "date_bail"));
      const nature = txt(a, "meuble") === "meuble" ? "meublé " : txt(a, "meuble") === "vide" ? "non meublé " : "";
      return {
        subject: "Congé du logement loué",
        body: para(
          OPENING,
          `Je suis locataire du logement ${nature}situé ${t(a, "adresse", "adresse du logement")}${bail ? `, en vertu d'un bail ayant pris effet le ${bail}` : ""}.`,
          `Par la présente, je vous informe de ma décision de mettre fin à ce bail et de quitter le logement. Compte tenu du préavis applicable, la location prendra fin le ${d(a, "date_fin", "date de fin de location")}.`,
          txt(a, "motif") && `Je vous informe du motif suivant : ${txt(a, "motif")}. Vous trouverez ci-joint le justificatif correspondant.`,
          "Je vous remercie de bien vouloir me contacter afin de fixer ensemble la date de l'état des lieux de sortie et de la remise des clés."
        ),
        checks: [
          "Vérifiez la durée de votre préavis sur service-public.gouv.fr (meublé ou non, zone tendue, motif).",
          "Joignez le justificatif si vous invoquez un motif particulier.",
          "Envoyez le courrier en recommandé avec avis de réception et gardez la preuve.",
        ],
      };
    },
  },
];

/* ------------------------------------------------------------------ */
/* Assurance, consommation, banque, administration, juridique          */
/* ------------------------------------------------------------------ */

const autres: LetterTemplate[] = [
  {
    id: "resiliation-assurance-abonnement",
    domain: "consommation",
    title: "Résiliation d'une assurance ou d'un abonnement",
    description: "Demander la résiliation d'un contrat d'assurance, d'un abonnement ou d'un autre contrat.",
    keywords: ["résiliation", "résilier", "assurance", "abonnement", "box", "téléphone", "salle de sport", "mutuelle", "arrêter un contrat"],
    sending: {
      mode: "au_choix",
      note: "Utilisez le moyen prévu par le contrat (espace en ligne, bouton de résiliation, courrier) ; le recommandé avec avis de réception reste la preuve la plus sûre.",
    },
    questions: [
      {
        id: "type",
        label: "Type de contrat",
        type: "select",
        required: true,
        options: [
          { value: "assurance", label: "Assurance" },
          { value: "abonnement", label: "Abonnement" },
          { value: "autre", label: "Autre contrat" },
        ],
      },
      { id: "autre", label: "Précisez le type de contrat", type: "text", required: true, showIf: { id: "type", equals: "autre" } },
      { id: "numero", label: "Numéro de contrat ou de client", type: "text", required: true },
      {
        id: "quand",
        label: "Date de résiliation souhaitée",
        type: "radio",
        required: true,
        options: [
          { value: "asap", label: "Dès que possible selon les conditions du contrat" },
          { value: "date", label: "À une date précise" },
        ],
      },
      { id: "date", label: "Date souhaitée", type: "date", required: true, showIf: { id: "quand", equals: "date" } },
    ],
    build: (a) => {
      const type = txt(a, "type");
      const nature =
        type === "assurance" ? "mon contrat d'assurance" : type === "abonnement" ? "mon abonnement" : type === "autre" ? `mon contrat (${t(a, "autre", "type de contrat")})` : "mon contrat";
      const quand =
        txt(a, "quand") === "date"
          ? `à compter du ${d(a, "date", "date souhaitée")}, ou à défaut dès que possible selon les conditions du contrat`
          : "dès que possible, selon les conditions prévues par le contrat";
      return {
        subject: `Demande de résiliation – contrat n° ${t(a, "numero", "numéro de contrat")}`,
        body: para(
          OPENING,
          `Par la présente, je vous demande de bien vouloir résilier ${nature} n° ${t(a, "numero", "numéro de contrat")}, ${quand}.`,
          "Je vous remercie de bien vouloir me confirmer par écrit la prise en compte de cette résiliation et sa date d'effet, et de mettre fin aux prélèvements correspondants à cette date.",
          "Le cas échéant, je vous remercie de me rembourser les sommes éventuellement versées pour la période postérieure à la résiliation."
        ),
        checks: [
          "Vérifiez les conditions de résiliation de votre contrat (date d'échéance, engagement, préavis).",
          "Vérifiez le numéro de contrat.",
          "Si c'est une assurance obligatoire (habitation d'un locataire, auto), assurez-vous d'être couvert(e) par un nouveau contrat.",
          CHECK_KEEP_COPY,
        ],
      };
    },
  },
  {
    id: "declaration-sinistre",
    domain: "assurance",
    title: "Déclaration de sinistre",
    description: "Déclarer un sinistre (dégât des eaux, vol, incendie, etc.) à votre assureur.",
    keywords: ["sinistre", "dégât des eaux", "vol", "cambriolage", "incendie", "assurance habitation", "déclaration", "dommages"],
    sending: {
      mode: "au_choix",
      note: "Déclarez le sinistre au plus vite, par l'espace en ligne de l'assureur, par téléphone puis par écrit, ou en recommandé ; vérifiez le délai prévu par votre contrat.",
    },
    questions: [
      { id: "numero", label: "Numéro de contrat", type: "text", required: true },
      {
        id: "type",
        label: "Nature du sinistre",
        type: "select",
        required: true,
        options: [
          { value: "degat des eaux", label: "Dégât des eaux" },
          { value: "vol", label: "Vol ou cambriolage" },
          { value: "incendie", label: "Incendie" },
          { value: "bris de glace", label: "Bris de glace" },
          { value: "autre", label: "Autre" },
        ],
      },
      { id: "date_sinistre", label: "Date du sinistre", type: "date", required: true },
      { id: "lieu", label: "Lieu", type: "text", required: true },
      { id: "description", label: "Ce qui s'est passé et les dommages", type: "textarea", required: true },
      { id: "plainte", label: "Avez-vous déposé plainte ?", type: "radio", options: YES_NO, showIf: { id: "type", equals: "vol" } },
    ],
    build: (a) => {
      const type = txt(a, "type");
      const nature = type && type !== "autre" ? type : "sinistre";
      return {
        subject: `Déclaration de sinistre – contrat n° ${t(a, "numero", "numéro de contrat")}`,
        body: para(
          OPENING,
          `Assuré(e) auprès de votre compagnie sous le contrat n° ${t(a, "numero", "numéro de contrat")}, je vous déclare un sinistre (${nature}) survenu le ${d(a, "date_sinistre", "date du sinistre")} à l'adresse suivante : ${t(a, "lieu", "lieu")}.`,
          `Voici les circonstances et les dommages constatés :\n${t(a, "description", "description")}`,
          txt(a, "plainte") === "oui" && "J'ai déposé plainte ; vous trouverez ci-joint une copie du récépissé.",
          "Je vous remercie de bien vouloir enregistrer cette déclaration, de m'indiquer la suite de la procédure et les documents à fournir, et de me faire savoir si un expert doit intervenir."
        ),
        checks: [
          "Vérifiez dans votre contrat le délai de déclaration du sinistre.",
          "Joignez photos, factures et devis disponibles.",
          "Conservez les objets endommagés jusqu'au passage éventuel de l'expert.",
          CHECK_KEEP_COPY,
        ],
      };
    },
  },
  {
    id: "explication-refus-assurance",
    domain: "assurance",
    title: "Demande d'explication d'un refus de prise en charge",
    description: "Demander à votre assureur d'expliquer un refus de prise en charge et la clause appliquée.",
    keywords: ["refus de prise en charge", "assurance", "refus d'indemnisation", "clause", "exclusion", "sinistre refusé", "contestation"],
    sending: { mode: "lrar", note: "Le recommandé avec avis de réception vous donne une preuve de la date de votre demande." },
    questions: [
      { id: "numero", label: "Numéro de contrat", type: "text", required: true },
      { id: "dossier", label: "Numéro de dossier ou de sinistre (facultatif)", type: "text" },
      { id: "date_refus", label: "Date du refus", type: "date", required: true },
      { id: "objet", label: "Ce qui a été refusé", type: "textarea", required: true, placeholder: "Ex. : remboursement des réparations après dégât des eaux" },
    ],
    build: (a) => ({
      subject: `Demande d'explication d'un refus de prise en charge – contrat n° ${t(a, "numero", "numéro de contrat")}`,
      body: para(
        OPENING,
        `Par courrier du ${d(a, "date_refus", "date du refus")}${txt(a, "dossier") ? ` (dossier n° ${txt(a, "dossier")})` : ""}, vous m'avez informé(e) de votre refus de prendre en charge la demande suivante : ${t(a, "objet", "objet de la demande")}.`,
        "Afin de comprendre cette décision, je vous remercie de bien vouloir m'en préciser les motifs et de m'indiquer la clause ou la garantie de mon contrat sur laquelle elle repose, en m'en adressant une copie.",
        "Je vous remercie également de m'indiquer les voies de recours possibles, notamment les coordonnées de votre service réclamations et du médiateur compétent.",
        "Je reste à votre disposition pour tout complément d'information."
      ),
      checks: [
        "Relisez les conditions générales et particulières de votre contrat.",
        "Joignez la copie du courrier de refus.",
        CHECK_KEEP_COPY,
      ],
    }),
  },
  {
    id: "commande-non-recue",
    domain: "consommation",
    title: "Commande non reçue",
    description: "Signaler au vendeur qu'une commande n'a pas été livrée et demander une solution.",
    keywords: ["commande non reçue", "colis", "livraison", "retard de livraison", "achat en ligne", "vendeur", "non livré"],
    sending: {
      mode: "au_choix",
      note: "Commencez par le service client (espace en ligne ou e-mail) ; en l'absence de réponse, relancez en recommandé avec avis de réception.",
    },
    questions: [
      { id: "numero", label: "Numéro de commande", type: "text", required: true },
      { id: "date_commande", label: "Date de la commande", type: "date", required: true },
      { id: "produit", label: "Produit commandé", type: "text", required: true },
      { id: "montant", label: "Montant payé", type: "money", required: true },
      { id: "date_prevue", label: "Date de livraison annoncée (facultatif)", type: "date" },
      {
        id: "demande",
        label: "Ce que vous demandez",
        type: "radio",
        required: true,
        options: [
          { value: "livraison", label: "La livraison rapide" },
          { value: "remboursement", label: "Le remboursement" },
        ],
      },
    ],
    build: (a) => {
      const prevue = formatDateFr(txt(a, "date_prevue"));
      return {
        subject: `Commande n° ${t(a, "numero", "numéro de commande")} non reçue`,
        body: para(
          OPENING,
          `Le ${d(a, "date_commande", "date de commande")}, j'ai passé la commande n° ${t(a, "numero", "numéro de commande")} portant sur : ${t(a, "produit", "produit")}, pour un montant de ${m(a, "montant", "montant")}.`,
          `${prevue ? `La livraison était annoncée pour le ${prevue}. ` : ""}À ce jour, je n'ai toujours pas reçu cette commande.`,
          txt(a, "demande") === "remboursement"
            ? "Je vous demande donc de bien vouloir procéder au remboursement de la somme versée."
            : "Je vous demande donc de bien vouloir procéder à la livraison dans les meilleurs délais, ou de m'indiquer où se trouve mon colis.",
          "Je vous remercie de votre retour rapide."
        ),
        checks: [
          "Vérifiez le suivi du colis, votre boîte aux lettres et auprès des voisins ou du point relais.",
          "Joignez la confirmation de commande et la preuve de paiement.",
          CHECK_KEEP_COPY,
        ],
      };
    },
  },
  {
    id: "produit-defectueux",
    domain: "consommation",
    title: "Produit défectueux",
    description: "Demander au vendeur la réparation ou le remplacement d'un produit qui ne fonctionne pas.",
    keywords: ["produit défectueux", "panne", "garantie", "réparation", "remplacement", "garantie légale de conformité", "SAV"],
    sending: {
      mode: "au_choix",
      note: "Adressez-vous au vendeur (et non au fabricant) ; le recommandé avec avis de réception est conseillé si la première demande reste sans réponse.",
    },
    questions: [
      { id: "produit", label: "Produit concerné", type: "text", required: true },
      { id: "date_achat", label: "Date d'achat ou de livraison", type: "date", required: true },
      { id: "montant", label: "Prix payé (facultatif)", type: "money" },
      { id: "numero", label: "Numéro de commande ou de facture (facultatif)", type: "text" },
      { id: "defaut", label: "Décrivez le défaut", type: "textarea", required: true },
      {
        id: "demande",
        label: "Ce que vous demandez",
        type: "radio",
        required: true,
        options: [
          { value: "reparation", label: "La réparation" },
          { value: "remplacement", label: "Le remplacement" },
        ],
      },
    ],
    build: (a) => ({
      subject: `Produit défectueux${txt(a, "numero") ? ` – commande n° ${txt(a, "numero")}` : ""}`,
      body: para(
        OPENING,
        `Le ${d(a, "date_achat", "date d'achat")}, j'ai acheté auprès de vous le produit suivant : ${t(a, "produit", "produit")}${txt(a, "montant") ? `, pour un montant de ${m(a, "montant", "montant")}` : ""}${txt(a, "numero") ? ` (commande ou facture n° ${txt(a, "numero")})` : ""}.`,
        `Ce produit présente le défaut suivant :\n${t(a, "defaut", "description du défaut")}`,
        `Au titre de la garantie légale de conformité, je vous demande de bien vouloir procéder à ${txt(a, "demande") === "remplacement" ? "son remplacement" : txt(a, "demande") === "reparation" ? "sa réparation" : todo("réparation ou remplacement")}, sans frais pour moi.`,
        "Je vous remercie de m'indiquer la marche à suivre."
      ),
      checks: [
        "Joignez la facture ou le ticket de caisse.",
        "Vérifiez que le produit est encore couvert par la garantie (service-public.gouv.fr).",
        CHECK_KEEP_COPY,
      ],
    }),
  },
  {
    id: "demande-remboursement",
    domain: "consommation",
    title: "Demande de remboursement",
    description: "Demander le remboursement d'une somme à une entreprise.",
    keywords: ["remboursement", "rembourser", "trop-perçu", "annulation", "avoir", "argent", "service client"],
    sending: { mode: "au_choix", note: "Un e-mail ou un courrier simple pour commencer ; recommandé avec avis de réception en cas de relance." },
    questions: [
      { id: "objet", label: "Objet du remboursement", type: "text", required: true, placeholder: "Ex. : billet de train annulé" },
      { id: "montant", label: "Montant à rembourser", type: "money", required: true },
      { id: "reference", label: "Référence (commande, client, facture)", type: "text" },
      { id: "raison", label: "Pourquoi ce remboursement est dû", type: "textarea", required: true },
    ],
    build: (a) => ({
      subject: `Demande de remboursement${txt(a, "reference") ? ` – réf. ${txt(a, "reference")}` : ""}`,
      body: para(
        OPENING,
        `Je vous écris au sujet de : ${t(a, "objet", "objet")}${txt(a, "reference") ? ` (référence ${txt(a, "reference")})` : ""}.`,
        t(a, "raison", "raison du remboursement"),
        `Je vous demande donc de bien vouloir me rembourser la somme de ${m(a, "montant", "montant")}.`,
        "Je vous remercie de m'indiquer la date et le mode de remboursement."
      ),
      checks: ["Joignez les justificatifs (facture, preuve de paiement, échanges).", "Vérifiez le montant demandé.", CHECK_KEEP_COPY],
    }),
  },
  {
    id: "explication-frais-bancaires",
    domain: "banque",
    title: "Demande d'explication sur des frais bancaires",
    description: "Demander à votre banque d'expliquer des frais prélevés sur votre compte.",
    keywords: ["frais bancaires", "agios", "commission", "frais d'incident", "banque", "relevé de compte", "remboursement de frais"],
    sending: { mode: "au_choix", note: "Utilisez la messagerie de votre espace bancaire ou un courrier à votre agence ; gardez une trace." },
    questions: [
      { id: "compte", label: "Numéro de compte (facultatif)", type: "text", help: "Vous pouvez n'indiquer que les derniers chiffres." },
      { id: "frais", label: "Frais concernés (libellé, date, montant)", type: "textarea", required: true },
      {
        id: "geste",
        label: "Souhaitez-vous demander un geste commercial ?",
        type: "radio",
        options: YES_NO,
      },
    ],
    build: (a) => ({
      subject: "Demande d'explication sur des frais bancaires",
      body: para(
        OPENING,
        `${txt(a, "compte") ? `Titulaire du compte n° ${txt(a, "compte")}, j'ai` : "J'ai"} constaté sur mon relevé les frais suivants :\n${t(a, "frais", "frais concernés")}`,
        "Je vous remercie de bien vouloir m'expliquer à quoi correspondent ces frais et sur quelle ligne de vos conditions tarifaires ils reposent.",
        txt(a, "geste") === "oui" &&
          "Client(e) de votre établissement, je vous serais reconnaissant(e) d'étudier la possibilité d'un remboursement de tout ou partie de ces frais, à titre commercial.",
        "Je vous remercie par avance de votre réponse."
      ),
      checks: ["Consultez la brochure tarifaire de votre banque.", "Joignez une copie du relevé concerné.", CHECK_KEEP_COPY],
    }),
  },
  {
    id: "signalement-prelevement",
    domain: "banque",
    title: "Contestation d'un prélèvement ou d'une opération",
    description: "Signaler à votre banque un prélèvement ou une opération que vous ne reconnaissez pas.",
    keywords: ["prélèvement", "opération inconnue", "fraude", "contestation", "paiement non autorisé", "carte bancaire", "débit"],
    warning:
      "En cas de suspicion de fraude, appelez immédiatement votre banque ou le service d'opposition pour bloquer votre carte ou votre compte. Ce courrier vient en complément.",
    professionalNotice: true,
    sending: {
      mode: "au_choix",
      note: "Appelez d'abord votre banque, puis confirmez par écrit (messagerie sécurisée ou recommandé avec avis de réception).",
    },
    questions: [
      { id: "compte", label: "Numéro de compte (facultatif)", type: "text", help: "Les derniers chiffres suffisent." },
      { id: "date_operation", label: "Date de l'opération", type: "date", required: true },
      { id: "montant", label: "Montant", type: "money", required: true },
      { id: "libelle", label: "Libellé sur le relevé", type: "text", required: true },
      {
        id: "nature",
        label: "Votre situation",
        type: "radio",
        required: true,
        options: [
          { value: "inconnu", label: "Je ne reconnais pas cette opération" },
          { value: "non_autorise", label: "Je reconnais le créancier mais n'ai pas autorisé ce prélèvement" },
        ],
      },
      { id: "opposition", label: "Avez-vous déjà fait opposition ou appelé la banque ?", type: "radio", options: YES_NO },
    ],
    build: (a) => ({
      subject: "Contestation d'une opération sur mon compte",
      body: para(
        OPENING,
        `${txt(a, "compte") ? `Titulaire du compte n° ${txt(a, "compte")}, je` : "Je"} constate sur mon relevé l'opération suivante : « ${t(a, "libelle", "libellé")} », d'un montant de ${m(a, "montant", "montant")}, en date du ${d(a, "date_operation", "date de l'opération")}.`,
        txt(a, "nature") === "non_autorise"
          ? "Je n'ai pas autorisé ce prélèvement."
          : "Je ne reconnais pas cette opération et ne l'ai pas autorisée.",
        txt(a, "opposition") === "oui" && "J'ai déjà contacté vos services par téléphone à ce sujet.",
        "Je conteste donc cette opération et vous demande de bien vouloir procéder aux vérifications nécessaires et au remboursement de la somme débitée. Je vous remercie également de prendre toute mesure utile pour éviter de nouveaux débits.",
        "Je vous remercie de me tenir informé(e) de la suite donnée à ma demande."
      ),
      checks: [
        "Appelez immédiatement votre banque et faites opposition en cas de fraude.",
        "Contestez l'opération le plus tôt possible : des délais s'appliquent.",
        "En cas de fraude, un dépôt de plainte peut vous être demandé.",
        CHECK_KEEP_COPY,
      ],
    }),
  },
  {
    id: "correction-facture",
    domain: "consommation",
    title: "Demande de correction d'une facture",
    description: "Demander à une entreprise de corriger une facture qui contient une erreur.",
    keywords: ["facture", "erreur de facturation", "correction", "rectification", "électricité", "gaz", "eau", "téléphone", "avoir"],
    sending: { mode: "au_choix", note: "Espace client, e-mail ou courrier ; recommandé avec avis de réception en cas de relance." },
    questions: [
      { id: "numero_facture", label: "Numéro de facture", type: "text", required: true },
      { id: "date_facture", label: "Date de la facture", type: "date", required: true },
      { id: "client", label: "Numéro de client (facultatif)", type: "text" },
      { id: "erreur", label: "L'erreur constatée", type: "textarea", required: true },
      { id: "montant_correct", label: "Montant que vous estimez correct (facultatif)", type: "money" },
    ],
    build: (a) => ({
      subject: `Demande de correction de la facture n° ${t(a, "numero_facture", "numéro de facture")}`,
      body: para(
        OPENING,
        `${txt(a, "client") ? `Client(e) sous le numéro ${txt(a, "client")}, j'ai` : "J'ai"} reçu la facture n° ${t(a, "numero_facture", "numéro de facture")} du ${d(a, "date_facture", "date de la facture")}.`,
        `Cette facture me paraît contenir l'erreur suivante :\n${t(a, "erreur", "erreur constatée")}`,
        txt(a, "montant_correct") && `Selon moi, le montant correct est de ${m(a, "montant_correct", "montant")}.`,
        "Je vous remercie de bien vouloir vérifier cette facture et m'adresser une facture rectifiée ou un avoir, et, le cas échéant, de suspendre le prélèvement du montant contesté dans l'attente de votre vérification."
      ),
      checks: ["Joignez une copie de la facture et vos justificatifs (relevé de compteur, contrat…).", "Vérifiez vos calculs.", CHECK_KEEP_COPY],
    }),
  },
  {
    id: "demande-echeancier",
    domain: "administratif",
    title: "Demande d'échéancier de paiement",
    description: "Demander à un créancier ou à un organisme de payer une somme en plusieurs fois.",
    keywords: ["échéancier", "paiement en plusieurs fois", "délai de paiement", "dette", "impôts", "trop-perçu", "difficultés financières"],
    sending: { mode: "au_choix", note: "Utilisez l'espace en ligne de l'organisme ou un courrier ; gardez une trace de votre demande." },
    questions: [
      { id: "reference", label: "Référence du dossier ou de la facture", type: "text", required: true },
      { id: "montant", label: "Montant total dû", type: "money", required: true },
      { id: "mensualite", label: "Montant mensuel que vous pouvez payer", type: "money", required: true },
      { id: "situation", label: "Votre situation (facultatif)", type: "textarea", help: "Expliquez simplement vos difficultés si vous le souhaitez." },
    ],
    build: (a) => ({
      subject: `Demande d'échéancier – réf. ${t(a, "reference", "référence")}`,
      body: para(
        OPENING,
        `Je vous écris au sujet de la somme de ${m(a, "montant", "montant dû")} dont je suis redevable (référence ${t(a, "reference", "référence")}).`,
        txt(a, "situation")
          ? `Ma situation ne me permet pas de régler cette somme en une seule fois : ${txt(a, "situation")}.`
          : "Ma situation ne me permet pas de régler cette somme en une seule fois.",
        `Je vous propose donc de la régler en plusieurs versements de ${m(a, "mensualite", "mensualité")} par mois, et vous remercie de bien vouloir m'accorder cet échéancier.`,
        "Je reste à votre disposition pour vous fournir tout justificatif utile et vous remercie de votre compréhension."
      ),
      checks: ["Proposez une mensualité que vous pourrez réellement tenir.", "Joignez des justificatifs de ressources si nécessaire.", CHECK_KEEP_COPY],
    }),
  },
  {
    id: "demande-administrative",
    domain: "administratif",
    title: "Demande à une administration",
    description: "Adresser une demande écrite à une administration ou un organisme public.",
    keywords: ["administration", "mairie", "CAF", "impôts", "CPAM", "préfecture", "demande", "dossier", "organisme"],
    sending: { mode: "au_choix", note: "Utilisez de préférence l'espace en ligne ou la messagerie de l'organisme ; sinon un courrier." },
    questions: [
      { id: "organisme", label: "Organisme concerné", type: "text", required: true, placeholder: "Ex. : CAF, mairie, centre des impôts" },
      { id: "reference", label: "Numéro d'allocataire, fiscal ou de dossier (facultatif)", type: "text" },
      { id: "objet", label: "Objet de votre demande (quelques mots)", type: "text", required: true },
      { id: "details", label: "Votre demande en détail", type: "textarea", required: true },
    ],
    build: (a) => ({
      subject: t(a, "objet", "objet de la demande"),
      body: para(
        OPENING,
        txt(a, "reference") && `Référence de mon dossier : ${txt(a, "reference")}.`,
        `Je me permets de m'adresser à vos services au sujet de la demande suivante : ${t(a, "objet", "objet")}.`,
        t(a, "details", "détail de la demande"),
        "Je vous remercie de bien vouloir examiner ma demande et m'indiquer, le cas échéant, les pièces à fournir. Je reste à votre disposition pour tout complément d'information."
      ),
      checks: [
        "Vérifiez l'adresse ou le canal à utiliser pour cet organisme.",
        "Indiquez votre numéro de dossier si vous en avez un.",
        CHECK_KEEP_COPY,
      ],
    }),
  },
  {
    id: "reclamation",
    domain: "consommation",
    title: "Réclamation",
    description: "Adresser une réclamation écrite à une entreprise ou un organisme.",
    keywords: ["réclamation", "plainte", "mécontentement", "service client", "litige", "problème"],
    sending: { mode: "au_choix", note: "Commencez par le service réclamations ; en l'absence de réponse, relancez en recommandé avec avis de réception." },
    questions: [
      { id: "reference", label: "Référence (client, contrat, commande) (facultatif)", type: "text" },
      { id: "probleme", label: "Le problème rencontré", type: "textarea", required: true },
      { id: "date_probleme", label: "Date du problème (facultatif)", type: "date" },
      { id: "attente", label: "Ce que vous attendez", type: "textarea", required: true, placeholder: "Ex. : un remboursement, une intervention…" },
    ],
    build: (a) => {
      const date = formatDateFr(txt(a, "date_probleme"));
      return {
        subject: `Réclamation${txt(a, "reference") ? ` – réf. ${txt(a, "reference")}` : ""}`,
        body: para(
          OPENING,
          `${txt(a, "reference") ? `Client(e) sous la référence ${txt(a, "reference")}, je` : "Je"} souhaite vous faire part d'une réclamation concernant le problème suivant${date ? `, survenu le ${date}` : ""} :\n${t(a, "probleme", "problème rencontré")}`,
          `Je vous demande de bien vouloir : ${t(a, "attente", "votre demande")}.`,
          "Je vous remercie de l'attention que vous porterez à ma réclamation et de votre réponse rapide."
        ),
        checks: ["Restez factuel et joignez vos justificatifs.", "Notez les dates de vos éventuels appels.", CHECK_KEEP_COPY],
      };
    },
  },
  {
    id: "relance-notaire",
    domain: "juridique",
    title: "Relance d'un notaire",
    description: "Relancer un notaire pour connaître l'avancement d'un dossier.",
    keywords: ["notaire", "relance", "succession", "vente immobilière", "dossier", "avancement", "étude notariale"],
    professionalNotice: true,
    sending: { mode: "au_choix", note: "Un e-mail ou un courrier simple convient ; gardez une trace de vos relances." },
    questions: [
      { id: "dossier", label: "Objet du dossier", type: "text", required: true, placeholder: "Ex. : succession de M. Jean Dupont" },
      { id: "reference", label: "Référence du dossier (facultatif)", type: "text" },
      { id: "date_contact", label: "Date de votre dernier échange (facultatif)", type: "date" },
      { id: "questions", label: "Vos questions", type: "textarea", required: true },
    ],
    build: (a) => {
      const date = formatDateFr(txt(a, "date_contact"));
      return {
        subject: `Relance – dossier ${t(a, "dossier", "objet du dossier")}${txt(a, "reference") ? ` (réf. ${txt(a, "reference")})` : ""}`,
        body: para(
          "Maître,",
          `Je me permets de revenir vers vous au sujet du dossier suivant : ${t(a, "dossier", "objet du dossier")}${txt(a, "reference") ? `, référence ${txt(a, "reference")}` : ""}.`,
          date && `Notre dernier échange date du ${date}.`,
          `Je souhaiterais connaître l'état d'avancement de ce dossier et vous poser les questions suivantes :\n${t(a, "questions", "vos questions")}`,
          "Je vous remercie de bien vouloir me tenir informé(e) des prochaines étapes et des éventuels documents à vous transmettre."
        ),
        checks: ["Indiquez la référence du dossier si vous l'avez.", "Préparez les documents éventuellement demandés.", CHECK_KEEP_COPY],
      };
    },
  },
  {
    id: "preparation-rdv-avocat",
    domain: "juridique",
    title: "Demande de rendez-vous avec un avocat",
    description: "Demander un rendez-vous à un avocat en résumant votre situation.",
    keywords: ["avocat", "rendez-vous", "consultation", "conseil juridique", "litige", "procédure", "défense"],
    professionalNotice: true,
    sending: { mode: "simple", note: "Un e-mail ou un courrier simple au cabinet suffit." },
    questions: [
      { id: "domaine", label: "Domaine concerné", type: "text", required: true, placeholder: "Ex. : droit du travail, famille, logement" },
      { id: "resume", label: "Résumé de votre situation", type: "textarea", required: true, help: "Quelques phrases : les faits, les dates importantes." },
      { id: "urgence", label: "Y a-t-il une date limite ou une audience prévue ?", type: "text", placeholder: "Ex. : audience le 12 novembre" },
      { id: "disponibilites", label: "Vos disponibilités (facultatif)", type: "text" },
    ],
    build: (a) => ({
      subject: `Demande de rendez-vous – ${t(a, "domaine", "domaine")}`,
      body: para(
        "Maître,",
        `Je souhaiterais obtenir un rendez-vous avec vous afin de bénéficier de vos conseils dans le domaine suivant : ${t(a, "domaine", "domaine")}.`,
        `Voici, en quelques mots, ma situation :\n${t(a, "resume", "résumé de la situation")}`,
        txt(a, "urgence") && `Je vous signale l'élément suivant, qui me semble urgent : ${txt(a, "urgence")}.`,
        txt(a, "disponibilites") && `Je suis disponible ${txt(a, "disponibilites")}.`,
        "Je vous remercie de bien vouloir m'indiquer vos disponibilités ainsi que le montant de vos honoraires pour une première consultation. Je tiens à votre disposition les documents relatifs à mon dossier."
      ),
      checks: [
        "Rassemblez les documents utiles (contrats, courriers, décisions) avant le rendez-vous.",
        "Renseignez-vous sur l'aide juridictionnelle ou la protection juridique de votre assurance.",
        "Signalez clairement toute date limite.",
      ],
    }),
  },
];

/* ------------------------------------------------------------------ */
/* Exports                                                             */
/* ------------------------------------------------------------------ */

export const LETTER_TEMPLATES: LetterTemplate[] = [...travail, ...logement, ...autres];

export function getTemplate(id: string): LetterTemplate | null {
  return LETTER_TEMPLATES.find((tpl) => tpl.id === id) ?? null;
}

/** Questions à afficher compte tenu des réponses (applique `showIf`). */
export function visibleQuestions(tpl: LetterTemplate, a: Answers): Question[] {
  return tpl.questions.filter((q) => {
    if (!q.showIf) return true;
    const value = (a[q.showIf.id] ?? "").trim();
    const expected = Array.isArray(q.showIf.equals) ? q.showIf.equals : [q.showIf.equals];
    return expected.includes(value);
  });
}

/** Libellés des questions obligatoires visibles laissées vides. */
export function missingRequired(tpl: LetterTemplate, a: Answers): string[] {
  return visibleQuestions(tpl, a)
    .filter((q) => q.required && !(a[q.id] ?? "").trim())
    .map((q) => q.label);
}
