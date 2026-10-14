/**
 * Cohérence avec le Project Brain (Autopilot V2) : une publication garde la trace des produits dont elle parle et de
 * leur prix au moment de la rédaction (`brief.items`). Produit retiré du catalogue : il n'est plus promu (publication
 * bloquée, à revoir). Prix modifié depuis : la publication est remise en relecture avant tout envoi.
 */
import { json } from "../db";
import type { Project } from "../projects";

export type BrainIssues = { removed: string[]; priceChanged: string[] };

export function brainIssues(p: Pick<Project, "catalog" | "business">, brief: string | null | undefined): BrainIssues {
  const items = json<{ items?: { key: string; name: string; price: number | null }[] }>(brief ?? "{}", {}).items ?? [];
  const out: BrainIssues = { removed: [], priceChanged: [] };
  if (p.business === "services" || !items.length) return out;
  for (const it of items) {
    if (it.key === "offer" || it.key.startsWith("svc:")) continue;
    const cur = p.catalog.find((c) => c.key === it.key);
    if (!cur) out.removed.push(it.name);
    else if ((cur.price ?? null) !== (it.price ?? null)) out.priceChanged.push(it.name);
  }
  return out;
}
