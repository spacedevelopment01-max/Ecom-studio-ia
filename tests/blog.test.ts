import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/lib/auth";
import { id, now, one, run } from "@/lib/db";
import { getSubscription, syncAllowance } from "@/lib/billing";
import { enqueue, JobContext } from "@/lib/jobs";
import { quotaView } from "@/lib/quotas";
import { runWithLang } from "@/lib/i18n-server";
import { QUOTA_ERROR } from "@/lib/plans";
import { product } from "./fixtures";

// IA simulée : rédaction, contrôle qualité et sujets renvoient des réponses fixes (aucun appel réseau).
const calls: string[] = [];
const ai = { article: null as any };
vi.mock("@/lib/ai/llm", () => ({
  llmConfigured: () => true,
  llmJson: async (call: { task: string }) => {
    calls.push(call.task);
    if (call.task === "blog_writing") return ai.article;
    if (call.task === "quality_control") return { verdict: "ok", issues: [] };
    if (call.task === "blog_topics") return { topics: [{ title: "Comment appliquer le Sérum Éclat", kind: "usage", why: "Usage concret." }] };
    throw new Error(`tâche inattendue ${call.task}`);
  },
}));

const sentence = "Le sérum se dépose en petite quantité sur une peau propre, puis se masse doucement du bout des doigts jusqu'à pénétration complète.";
const para = (n: number) => `<p>${Array(n).fill(sentence).join(" ")}</p>`;
function validArticle() {
  // ≈ 22 mots par phrase : 4 parties de 2 paragraphes de 5 phrases ≈ 900 mots.
  const parts = ["Pourquoi un sérum", "Comment l'appliquer", "Le bon moment", "Ce qu'il faut savoir"].map((h) => `<h2>${h}</h2>${para(5)}${para(5)}`).join("");
  return {
    title: "Comment appliquer le Sérum Éclat au quotidien",
    slug: "Comment appliquer le Sérum Éclat",
    metaTitle: "Comment appliquer le Sérum Éclat au quotidien : le guide complet et détaillé",
    metaDescription: "Les gestes simples pour appliquer le Sérum Éclat chaque jour : quantité, moment, ordre dans la routine. Un guide clair, sans promesse inventée.",
    excerpt: "Les gestes simples pour bien appliquer le Sérum Éclat.",
    bodyHtml: `<h1>Titre en double</h1>${para(2)}<script>alert(1)</script>${parts}<p>Découvrez le <a href="/products/inconnu" onclick="x()">produit</a> et <a href="https://ailleurs.example">ailleurs</a>.</p>`,
    tags: ["Soin", "#Routine", "Soin"],
  };
}

async function account(plan: "creer" | "vendre" | "dominer" | null, role: "client" | "admin" = "client") {
  const u = await createUser(`blog${plan}${Date.now()}${Math.random()}@test.fr`, "motdepasse-test", "B");
  getSubscription(u.id);
  if (plan) run("UPDATE subscriptions SET status = 'active', plan = ? WHERE user_id = ?", plan, u.id);
  if (role === "admin") run("UPDATE users SET role = 'admin' WHERE id = ?", u.id);
  syncAllowance(u.id);
  const pid = id();
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    pid, u.id, "Maison Ondine", "ready", "shopify", JSON.stringify(product), "{}", JSON.stringify({ language: "fr" }), "[]", now(), now(),
  );
  return { userId: u.id, projectId: pid };
}

const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

beforeEach(() => {
  calls.length = 0;
  ai.article = validArticle();
});

describe("articles de blog écrits par l'IA", () => {
  it("écrit un article valide, contrôlé, enregistré, et décompte 1 article une seule fois", async () => {
    const { writeBlogArticle, getArticle, countWords } = await import("@/lib/engine/blog");
    const { userId, projectId } = await account("vendre");
    expect(quotaView(userId, "blog").left).toBe(2);
    const job = enqueue({ userId, projectId, type: "blog.write", payload: { topic: "Appliquer le sérum" } });
    const ctx = new JobContext(job);
    const r = await fr(() => writeBlogArticle(ctx, projectId, { topic: "Appliquer le sérum" }));
    expect(calls).toEqual(["blog_writing", "quality_control"]);
    const a = getArticle(projectId, (r as any).articleId)!;
    expect(a.status).toBe("draft");
    expect(a.slug).toBe("comment-appliquer-le-serum-eclat");
    expect(a.meta_title.length).toBeLessThanOrEqual(60);
    expect(a.meta_description.length).toBeLessThanOrEqual(160);
    expect(JSON.parse(a.tags)).toEqual(["Soin", "Routine"]);
    const words = countWords(a.body_html);
    expect(words).toBeGreaterThanOrEqual(700);
    expect(words).toBeLessThanOrEqual(1200);
    // HTML simple : pas de h1, pas de script, pas d'attribut, aucun lien inventé (le texte reste).
    expect(a.body_html).not.toMatch(/<h1|<script|onclick|ailleurs\.example|\/products\/inconnu/);
    expect(a.body_html).not.toContain("Titre en double");
    expect(a.body_html.startsWith("<p>")).toBe(true);
    expect(a.body_html).toContain("Découvrez le produit et ailleurs.");
    expect(quotaView(userId, "blog").left).toBe(1);
    // Reprise de la même tâche : rien n'est refait ni décompté deux fois.
    const again = await fr(() => writeBlogArticle(new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", job.id)), projectId, { topic: "Appliquer le sérum" }));
    expect(again).toMatchObject({ articleId: (r as any).articleId, resumed: true });
    expect(calls).toHaveLength(2);
    expect(quotaView(userId, "blog").left).toBe(1);
  });

  it("corrige un article trop court ou qui invente des avis (contrôle automatique, nouvelle passe)", async () => {
    const { writeBlogArticle, articleIssues } = await import("@/lib/engine/blog");
    const { loadProject } = await import("@/lib/projects");
    const { userId, projectId } = await account("dominer");
    const p = loadProject(projectId);
    const fake = fr(() => articleIssues({ ...validArticle(), bodyHtml: `${para(2)}<h2>Avis</h2><p>Nos clients satisfaits lui donnent 5 étoiles.</p>` }, p));
    expect(fake.join(" ")).toMatch(/trop court/);
    expect(fake.join(" ")).toMatch(/avis ou notes/);
    // Première réponse trop courte, puis une réponse correcte : deux rédactions, un seul décompte.
    const short = { ...validArticle(), bodyHtml: para(3) };
    let n = 0;
    Object.defineProperty(ai, "article", { configurable: true, get: () => (n++ === 0 ? short : validArticle()), set: () => {} });
    const job = enqueue({ userId, projectId, type: "blog.write", payload: {} });
    await fr(() => writeBlogArticle(new JobContext(job), projectId, {}));
    expect(calls.filter((c) => c === "blog_writing")).toHaveLength(2);
    expect(quotaView(userId, "blog").left).toBe(7);
    Object.defineProperty(ai, "article", { configurable: true, writable: true, value: validArticle() });
  });

  it("refuse sans forfait et avec Créer (inclus dans Vendre et Dominer) ; l'administrateur n'est jamais bloqué ; quota épuisé", async () => {
    const { assertBlogWrite, blogAccess, BlogAccessError } = await import("@/lib/engine/blog");
    const free = await account(null);
    const creer = await account("creer");
    expect(() => fr(() => assertBlogWrite(free.userId))).toThrow(/forfaits Vendre \(2 par mois\) et Dominer \(8 par mois\)/);
    expect(() => fr(() => assertBlogWrite(creer.userId))).toThrow(/forfait Créer n'inclut pas/);
    expect(blogAccess(creer.userId).allowed).toBe(false);
    const admin = await account(null, "admin");
    expect(() => fr(() => assertBlogWrite(admin.userId))).not.toThrow();
    // Écriture refusée dans la tâche aussi (aucun appel IA, rien de décompté).
    const { writeBlogArticle } = await import("@/lib/engine/blog");
    await expect(fr(() => writeBlogArticle(new JobContext(enqueue({ userId: free.userId, projectId: free.projectId, type: "blog.write" })), free.projectId, {}))).rejects.toBeInstanceOf(BlogAccessError);
    expect(calls).toHaveLength(0);
    // Vendre : 2 articles, puis message clair avec le code « quota épuisé ».
    const v = await account("vendre");
    const { consumeQuota } = await import("@/lib/quotas");
    consumeQuota(v.userId, "blog", 2, "test:2");
    try {
      fr(() => assertBlogWrite(v.userId));
      expect.unreachable();
    } catch (e: any) {
      expect(e.code).toBe(QUOTA_ERROR);
      expect(e.message).toMatch(/articles de blog/);
    }
  });

  it("exports : WXR WordPress et HTML bien formés", async () => {
    const { articlesWxr, articleHtml } = await import("@/lib/engine/blog");
    const row = {
      id: "a1", project_id: "p", user_id: "u", title: "Guide <complet> & clair", slug: "guide-complet", meta_title: "Guide", meta_description: "Desc « ok » & co",
      excerpt: "Extrait ]]> piégé", body_html: "<h2>Partie</h2><p>Texte <strong>gras</strong> ]]> et <a href=\"/products/serum-eclat\">lien</a>.</p><ul><li>Un</li></ul>", tags: JSON.stringify(["Soin", "Routine & co"]),
      cover_asset_id: null, language: "fr", status: "draft" as const, published_url: null, platform_ref: null, qc_notes: "[]", created_at: Date.UTC(2026, 9, 1), updated_at: Date.UTC(2026, 9, 2), deleted_at: null,
    };
    const xml = articlesWxr([row, { ...row, id: "a2", slug: "deux", status: "published" as const }], { title: "Maison Ondine", url: "https://ondine.fr", language: "fr-FR", author: "Maison Ondine" });
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" ?>')).toBe(true);
    expect(wellFormed(xml)).toEqual([]);
    expect(xml).toContain("<wp:wxr_version>1.2</wp:wxr_version>");
    expect(xml).toContain("<wp:post_type><![CDATA[post]]></wp:post_type>");
    expect(xml).toContain("<wp:status><![CDATA[draft]]></wp:status>");
    expect(xml).toContain("<wp:status><![CDATA[publish]]></wp:status>");
    expect(xml).toContain('<category domain="post_tag" nicename="routine-co"><![CDATA[Routine & co]]></category>');
    expect(xml.match(/<item>/g)).toHaveLength(2);
    // Le contenu se retrouve intact une fois les sections CDATA relues (nettoyé à l'export : le « > » du texte devient &gt;, même rendu).
    const content = xml.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/)![1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
    expect(content).toBe(row.body_html.replace("]]>", "]]&gt;"));
    const html = articleHtml(row, "Maison Ondine");
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<h1>Guide &lt;complet&gt; &amp; clair</h1>");
    expect(html).toContain('<meta name="description" content="Desc « ok » &amp; co">');
    expect(wellFormed(html.replace(/<!doctype html>/i, ""), ["meta", "br"])).toEqual([]);
  });

  it("propose des sujets (IA simulée) et des sujets locaux honnêtes sans IA", async () => {
    const { suggestTopics, localTopics } = await import("@/lib/engine/blog");
    const { loadProject } = await import("@/lib/projects");
    const { projectId } = await account("vendre");
    const p = loadProject(projectId);
    const r = await fr(() => suggestTopics(p, { refresh: true }));
    expect(r.ai).toBe(true);
    expect(r.topics[0].kind).toBe("usage");
    const local = fr(() => localTopics(p));
    expect(local.length).toBeGreaterThanOrEqual(3);
    expect(local.map((x) => x.title).join(" ")).toContain("Sérum Éclat");
    expect(runWithLang({ ui: "en", content: "en" }, () => localTopics(p, "en"))[0].title).toMatch(/How to use/);
  });
});

/** Vérification simple de bonne formation XML : balises équilibrées, sections CDATA fermées. */
function wellFormed(src: string, voids: string[] = []): string[] {
  const errors: string[] = [];
  const s = src.replace(/<\?xml[^?]*\?>/, "").replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  if (s.includes("<![CDATA[")) errors.push("CDATA non fermée");
  const stack: string[] = [];
  for (const m of s.matchAll(/<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g)) {
    const [, close, name, , self] = m;
    if (self || voids.includes(name.toLowerCase())) continue;
    if (!close) stack.push(name);
    else if (stack.pop() !== name) errors.push(`balise ${name} mal fermée`);
  }
  if (stack.length) errors.push(`non fermées : ${stack.join(", ")}`);
  if (/<(?![\/!?A-Za-z])/.test(s)) errors.push("« < » non échappé");
  return errors;
}
