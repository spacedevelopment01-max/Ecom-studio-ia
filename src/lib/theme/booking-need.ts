/**
 * Réservation exigée par l'activité du client : un site de services dont le métier vit de réservations (salle de jeu,
 * escape game, location de salle, restaurant) ou qui a choisi la prise de rendez-vous reçoit d'office le vrai
 * calendrier de réservation (section booking-calendar), quel que soit le thème choisi.
 *
 * - Lien de réservation en ligne fourni (Calendly, Planity…) : ce service fait déjà la réservation, rien n'est ajouté.
 * - Salle ou table : le calendrier demande le nombre de personnes ; rendez-vous : la prestation et l'horaire.
 * - Horaires lisibles : le calendrier est réglé dessus et affiché. Horaires absents ou illisibles : rien n'est deviné,
 *   le calendrier est posé masqué (prêt dès que les horaires sont précisés) et le formulaire de demande avec date reste.
 */
import { contactModesOf, type ServiceProfile } from "../project-types";
import { parseOpeningHours, type OpeningHours } from "../theme-v2/hours";
import { pick, type Lang } from "../i18n";

export type BookingKind = "appointment" | "room" | "table";
export type BookingNeed = { kind: BookingKind; people: boolean; hours: OpeningHours | null };

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'");
/** Activités qui se réservent par salle ou par espace (le visiteur choisit une salle et un nombre de personnes). */
const ROOM = /\b(escape[ -]?(game|room)s?|salles? (de jeux?|d'enigmes?|de reunion|de seminaire|de reception|des fetes|de fete|a louer|privatisables?|de repetition|de sport)|location de salles?|laser[ -]?game|realite virtuelle|bowling|karting|billards?|coworking|espaces? privatisables?|room rental|meeting rooms?|game rooms?|party rooms?|escape rooms?|private rooms? hire)\b/;
/** Activités qui se réservent par table. */
const TABLE = /\b(restaurants?|brasserie|bistrot?|pizzeria|creperie|bar a (vins?|tapas|cocktails?)|salon de the|reservation de table|book a table)\b/;

export function bookingNeed(services: ServiceProfile | null | undefined, activity: string): BookingNeed | null {
  if (!services) return null;
  // Réservation déjà assurée par un service en ligne du client.
  if (/^https?:\/\//i.test(services.bookingUrl?.trim() ?? "")) return null;
  const text = fold(`${activity} ${services.services.map((s) => `${s.name} ${s.description}`).join(" ")}`);
  const hours = parseOpeningHours(services.hours);
  if (ROOM.test(text)) return { kind: "room", people: true, hours };
  if (TABLE.test(text)) return { kind: "table", people: true, hours };
  if (contactModesOf(services).includes("booking")) return { kind: "appointment", people: false, hours };
  return null;
}

const TODO = /\[(?:À|A) compléter|\[To complete/i;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);
const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/**
 * Réglages du calendrier pour ce besoin (jours, horaires, personnes, textes) et ses blocs : les prestations ou salles
 * du client, avec durée et prix seulement s'il les a donnés. `hidden` : horaires inconnus, section posée masquée.
 */
export function bookingCalendar(need: BookingNeed, lang: Lang, items: { name: string; description?: string; duration?: string; price?: string }[]) {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const h = need.hours;
  const k = need.kind;
  const settings: Record<string, unknown> = {
    eyebrow: t("Réservation", "Booking"),
    heading: k === "room" ? t("Réservez votre créneau", "Book your slot") : k === "table" ? t("Réservez votre table", "Book a table") : t("Prenez rendez-vous", "Book an appointment"),
    text: `<p>${
      k === "room"
        ? t("Choisissez la salle, le jour, l'horaire et le nombre de personnes : nous confirmons votre réservation par e-mail.", "Choose the room, the day, the time and the number of people: we confirm your booking by email.")
        : k === "table"
          ? t("Choisissez le jour, l'heure et le nombre de couverts : nous confirmons votre réservation par e-mail.", "Choose the day, the time and the number of guests: we confirm your booking by email.")
          : t("Choisissez la prestation, le jour et l'horaire : nous confirmons votre rendez-vous par e-mail.", "Choose the service, the day and the time: we confirm your appointment by email.")
    }</p>`,
    kind: k,
    ...(h
      ? {
          day_mon: h.days.includes(1), day_tue: h.days.includes(2), day_wed: h.days.includes(3), day_thu: h.days.includes(4),
          day_fri: h.days.includes(5), day_sat: h.days.includes(6), day_sun: h.days.includes(0),
          open_time: h.open, close_time: h.close, break_start: h.breakStart, break_end: h.breakEnd,
        }
      : {}),
    slot_minutes: k === "table" ? 30 : 60,
    notice_days: k === "appointment" ? 1 : 0,
    ask_people: need.people,
    people_min: 1,
    people_max: k === "table" ? 12 : 20,
    ask_phone: true,
    phone_required: need.people,
    ask_message: true,
    button_label: k === "appointment" ? t("Envoyer ma demande de rendez-vous", "Send my appointment request") : t("Envoyer ma demande de réservation", "Send my booking request"),
    note: k === "appointment" ? t("Votre rendez-vous est réservé après notre confirmation par e-mail.", "Your appointment is booked once we confirm it by email.") : t("Votre créneau est réservé après notre confirmation par e-mail.", "Your slot is booked once we confirm it by email."),
  };
  const blocks = items
    .filter((s) => s.name.trim() && !TODO.test(s.name))
    .slice(0, 8)
    .map((s) => ({
      type: "item",
      settings: {
        title: s.name.trim(),
        text: s.description && !TODO.test(s.description) ? clip(strip(s.description), 90) : "",
        duration: s.duration?.trim() ?? "",
        price: s.price?.trim() ?? "",
      },
    }));
  return { settings, blocks, hidden: !h };
}
