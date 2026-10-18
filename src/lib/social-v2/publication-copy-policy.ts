/** Commercial assertions must be both confirmed for the selected subject and requested for this visual. */
import type { Project } from "../projects";
const terms = (s: string) =>
  [...s.matchAll(/(-?\d+(?:[.,]\d+)?)\s*(%|€|\$|EUR|USD)/gi)].map(
    (m) =>
      `${Number(m[1].replace(",", "."))}:${/€|EUR/i.test(m[2]) ? "EUR" : /\$|USD/i.test(m[2]) ? "USD" : "%"}`,
  );
export function authorizedPublicationTexts(
  p: Project,
  texts: string[],
  request: string,
  explicit: string[],
  extraConfirmed: string[] = [],
) {
  const confirmed = [
    ...p.product.facts
      .filter((f) => f.status === "confirmed")
      .map((f) => `${f.label} ${f.value}`),
    p.product.price.status === "confirmed"
      ? `${p.product.price.amount} ${p.product.price.currency}`
      : "",
  ].join("\n");
  const wanted = [request, ...explicit].join("\n");
  const verified = terms([confirmed, ...extraConfirmed].join("\n")),
    asked = terms(wanted);
  return texts.filter((x) => {
    const commercial = terms(x);
    const claim =
      /\b(n°\s?1|meilleur(?:e|s|es)?|best|garanti(?:e|s|es)?|guaranteed|avis|reviews?|étoiles|stars)\b/i.test(
        x,
      );
    if (claim) return confirmed.includes(x) && wanted.includes(x);
    if (commercial.length)
      return commercial.every((t) => verified.includes(t) && asked.includes(t));
    return explicit.includes(x);
  });
}
