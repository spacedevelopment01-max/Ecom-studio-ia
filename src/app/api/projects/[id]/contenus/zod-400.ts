import { HttpError } from "@/lib/auth";
import { L } from "@/lib/i18n-server";

/** Saisie refusée par un schéma : 400 avec les champs en cause (jamais une erreur 500). */
export function zodTo400<T>(fn: () => T): T {
  try { return fn(); }
  catch (e) {
    if (e && typeof e === "object" && "issues" in e) throw new HttpError(400, (e as { issues: { message: string; path: (string | number)[] }[] }).issues.map((i) => `${i.path.join(".")} : ${i.message}`).join(" ; ") || L("Saisie invalide.", "Invalid input."));
    throw e;
  }
}
