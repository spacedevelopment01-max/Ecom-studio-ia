/** Projection sans coupe des documents relus ; les champs locaux restants sont explicitement provisoires. */
import { docHtml } from "../seo-v2/theme-copy";
import type { Contents, ReadyContract } from "./types";
const leafPaths = (v: unknown, path = ""): string[] => v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => leafPaths(x, path ? `${path}.${k}` : k)) : [path];
export function copyContract(c: Contents): { copy: Contents["copy"]; readiness: ReadyContract["copyReadiness"] } {
  const copy = structuredClone(c.copy);
  const mapped = new Set<string>();
  const set = (path: string, value: unknown) => {
    const keys = path.split("."); let target: any = copy;
    for (const k of keys.slice(0, -1)) target = target[k];
    target[keys.at(-1)!] = value; mapped.add(path);
  };
  for (const item of c.documents) {
    const d = item.doc;
    const h1 = d.blocks.find(b => b.kind === "h1");
    const paragraphs = d.blocks.filter(b => b.kind === "p").map(b => "text" in b ? b.text : "");
    const first = paragraphs[0];
    if (d.page.key === "home") {
      if (h1 && "text" in h1) set("hero.heading", h1.text);
      if (paragraphs.length) set("hero.text", paragraphs.join("\n\n"));
      set("seo.title", d.meta.seoTitle); set("seo.description", d.meta.metaDescription);
    }
    if (d.type === "product_page") {
      if (h1 && "text" in h1) set("product.title", h1.text);
      if (first) set("product.short", first);
      set("product.description_html", docHtml(d.blocks));
    }
    if (d.type === "brand_page") {
      if (h1 && "text" in h1) set("about.heading", h1.text);
      if (first) set("about.intro", first);
    }
  }
  const provisionalFields = c.execution ? leafPaths(copy).filter(path => /\[(?:[ÀA] compl[eé]ter|To complete|Por completar)[^\]]*\]/i.test(String(path.split(".").reduce((v: any, k) => v?.[k], copy)))) : leafPaths(copy).filter(p => ![...mapped].some(m => p === m || p.startsWith(m + ".")));
  return { copy, readiness: { status: provisionalFields.length ? "review_required" : "mapped", provisionalFields, documentKeys: c.documents.map(d => d.docKey) } };
}

export const incompleteDocument = (doc: Contents["documents"][number]["doc"]) => /\[(?:[ÀA] compl[eé]ter|To complete|Por completar)[^\]]*\]/i.test(JSON.stringify({ blocks: doc.blocks, meta: doc.meta }));
