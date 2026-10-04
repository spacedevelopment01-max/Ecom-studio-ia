import { z } from "zod";
import { all } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { fillPrompt } from "@/lib/prompts-library";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { C } from "@/lib/i18n-server";

/** Complète un prompt avec le produit, la marque et les médias du projet actif. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ body: z.string().max(12000) }));
  const svc = p.business === "services";
  // Entreprise de services : prestations (durée et tarif seulement s'ils sont saisis), zone et horaires avec les faits confirmés.
  const offer = svc ? [
    ...p.services.services.filter((x) => x.name.trim()).map((x) => `${x.name}${[x.duration, x.price].filter((v) => v?.trim()).length ? ` (${[x.duration, x.price].filter((v) => v?.trim()).join(" · ")})` : ""}`),
    ...(p.services.area ? [C(`Zone : ${p.services.area}`, `Area: ${p.services.area}`)] : []),
    ...(p.services.hours ? [C(`Horaires : ${p.services.hours}`, `Hours: ${p.services.hours}`)] : []),
  ] : [];
  const facts = [...offer, ...p.product.facts.filter((f) => f.status !== "unknown").map((f) => C(`${f.label} : ${f.value}`, `${f.label}: ${f.value}`))].join(C(" ; ", "; "));
  const media = all<{ name: string; role: string }>("SELECT name, role FROM assets WHERE project_id = ? AND deleted_at IS NULL AND kind IN ('image','video') AND role IN ('original','cutout','packshot','scene','detail','video','lifestyle') ORDER BY created_at DESC LIMIT 8", p.id);
  const vars: Record<string, string> = {
    produit: [p.product.name || (svc ? C("l'activité", "the business") : C("le produit", "the product")), p.product.summary].filter(Boolean).join(" — "),
    marque: p.brand ? `${p.brand.name}${p.brand.tagline ? C(` (« ${p.brand.tagline} »)`, ` ("${p.brand.tagline}")`) : ""}` : p.name,
    cible: p.brand?.audience || C("[cible à préciser]", "[target audience to specify]"),
    ton: p.brand?.tone.voice || C("[ton à préciser]", "[tone to specify]"),
    palette: p.brand ? Object.values(p.brand.palette).join(", ") : p.product.visual.colors.map((c) => c.hex).join(", ") || C("[palette à définir]", "[palette to define]"),
    faits: facts || C("[aucun fait confirmé pour l'instant]", "[no confirmed facts yet]"),
    medias: media.map((m) => `${m.name} (${m.role})`).join(", ") || C("[aucun média]", "[no media]"),
    lien: p.row.store_url || (svc ? C("[lien du site à préciser]", "[website link to specify]") : C("[lien de la boutique à préciser]", "[store link to specify]")),
    objectifs: C("[objectifs à préciser]", "[goals to specify]"),
  };
  return ok({ body: fillPrompt(b.body, vars), vars });
});
