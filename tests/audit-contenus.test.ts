/**
 * Non-régression de l'audit « contenus » : blog (nettoyeur HTML, exports, Shopify), aperçus cloisonnés,
 * sections sur mesure, export WordPress, vidéos et annulation de la création.
 */
import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { parseDocument } from "htmlparser2";
import { unzipSync, strFromU8 } from "fflate";
import { sampleSpec, serviceSpec, product } from "./fixtures";

// Session simulée pour les routes.
const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }) }));

// IA simulée (sujets d'articles) : compte les appels.
const llmCalls: string[] = [];
vi.mock("@/lib/ai/llm", async (orig) => ({
  ...((await orig()) as object),
  llmConfigured: () => true,
  llmJson: async (call: { task: string }) => {
    llmCalls.push(call.task);
    return { topics: [{ title: "Comment appliquer le sérum", kind: "usage", why: "Usage concret." }] };
  },
}));

async function setup(plan: "creer" | "vendre" | "dominer" | null = "vendre") {
  const { createUser } = await import("@/lib/auth");
  const { id, now, run } = await import("@/lib/db");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { saveThemeVersion } = await import("@/lib/projects");
  const u = await createUser(`contenus-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "Contenus");
  getSubscription(u.id);
  if (plan) run("UPDATE subscriptions SET status = 'active', plan = ? WHERE user_id = ?", plan, u.id);
  syncAllowance(u.id);
  const pid = id();
  run("INSERT INTO projects (id, user_id, name, status, platform, store_type, product_json, brand_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", pid, u.id, "Maison Ondine", "ready", "shopify", "mono", JSON.stringify(product), "{}", JSON.stringify({ language: "fr" }), "[]", now(), now());
  const v = saveThemeVersion(pid, sampleSpec(), "Boutique créée", "system");
  return { user: u, pid, versionId: v.id };
}

async function login(userId: string | null) {
  if (!userId) return void (jar.token = "");
  const { run } = await import("@/lib/db");
  const { sha256 } = await import("@/lib/secrets");
  const token = `tok-contenus-${userId}-${Math.random()}`;
  run("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)", sha256(token), userId, Date.now() + 3600_000, Date.now());
  jar.token = token;
}

const ALLOWED = new Set(["h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a", "br", "blockquote"]);

/** Analyse le HTML nettoyé comme un navigateur le ferait : seules les balises permises, seul href (sûr) sur les liens. */
function unsafeParts(html: string): string[] {
  const bad: string[] = [];
  const walk = (nodes: any[]) => {
    for (const n of nodes) {
      if (n.type === "comment") bad.push("commentaire");
      if (n.type === "tag" || n.type === "script" || n.type === "style") {
        if (!ALLOWED.has(n.name)) bad.push(`<${n.name}>`);
        for (const [k, v] of Object.entries(n.attribs ?? {})) {
          if (n.name !== "a" || k !== "href") bad.push(`${n.name}[${k}]`);
          else if (!/^(\/(?![/\\])|https?:\/\/)/i.test(String(v))) bad.push(`href=${v}`);
        }
      }
      if (n.children) walk(n.children);
    }
  };
  walk(parseDocument(html).children as any[]);
  return bad;
}

describe("I-1 nettoyeur HTML du blog (anti-XSS)", () => {
  const XSS = [
    '<p>Bonjour<img src=x onerror="alert(1)" ',
    '<p>Bonjour</p><img src=x onerror="alert(1)"//',
    '<p>Texte</p><img src=x onerror=alert(1)',
    '<p>a</p><!--x<p>b</p><img src=x onerror=alert(1)>',
    '<p onclick="alert(1)" onmouseover=alert(2)>Survol</p><a href="/x" onfocus="alert(3)">lien</a>',
    '<a href="javascript:alert(1)">a</a><a href="JaVaScRiPt:alert(1)">b</a><a href="&#106;avascript:alert(1)">c</a><a href=" javascript:alert(1)">d</a><a href="data:text/html,<script>alert(1)</script>">e</a>',
    '<svg><script>alert(1)</script><a xlink:href="javascript:alert(1)">z</a></svg><svg/onload=alert(1)><math><mi xlink:href="javascript:alert(1)">m</mi></math>',
    '<scr<script>ipt>alert(1)</scr</script>ipt><iframe src="javascript:alert(1)"></iframe><object data="x"></object><embed src="x">',
    '&lt;img src=x onerror=alert(1)&gt;<p>&#60;script&#62;alert(1)&#60;/script&#62;</p>',
    '<a href="//evil.example/x">pr</a><a href="/\\evil.example">bs</a><a href="https://ok.example/a?b=1&c=2" target="_blank" style="x">ok</a>',
    '<style>body{background:url(javascript:alert(1))}</style><p style="background:url(x)">st</p><template><img src=x onerror=alert(1)></template>',
    '<p>1<2 et <b>3</b>> 2</p><<img src=x onerror=alert(1)>',
  ];

  it("aucune balise, aucun attribut on*, aucune adresse javascript:/data: ne passe (balises ouvertes, svg, entités)", async () => {
    const { sanitizeBlogHtml } = await import("@/lib/blog-html");
    for (const raw of XSS) {
      const out = sanitizeBlogHtml(raw);
      expect(unsafeParts(out), `${raw}\n→ ${out}`).toEqual([]);
      expect(out).not.toMatch(/<(?!\/?(h2|h3|p|ul|ol|li|strong|em|a|br|blockquote)[\s>])/);
      // Collé dans une page (export HTML, Shopify) : le texte qui suit ne peut pas « fermer » une balise dangereuse.
      expect(unsafeParts(`${out}</article>`)).toEqual([]);
      // Idempotent : renettoyer ne change rien.
      expect(sanitizeBlogHtml(out)).toBe(out);
    }
  });

  it("garde le texte légitime (« 1 < 2 et 3 > 2 ») et la mise en forme permise", async () => {
    const { sanitizeBlogHtml, stripTags } = await import("@/lib/blog-html");
    const out = sanitizeBlogHtml("<p>1 < 2 et 3 > 2</p>");
    expect(out).toBe("<p>1 &lt; 2 et 3 &gt; 2</p>");
    expect(stripTags(out)).toBe("1 < 2 et 3 > 2");
    expect(sanitizeBlogHtml('<h1>T</h1><h4>u</h4><b>g</b> <i>i</i><ul><li>Un</li></ul><blockquote>c</blockquote><p>a<br/>b</p><p></p><a href="/products/serum">s</a>')).toBe(
      '<h2>T</h2><h3>u</h3><strong>g</strong> <em>i</em><ul><li>Un</li></ul><blockquote>c</blockquote><p>a<br>b</p><a href="/products/serum">s</a>',
    );
    // Lien refusé : le texte reste.
    expect(sanitizeBlogHtml('<p>Voir <a href="javascript:x">ce lien</a>.</p>')).toBe("<p>Voir ce lien.</p>");
    // Sortie de l'IA : seuls les liens internes connus.
    expect(sanitizeBlogHtml('<a href="/products/serum?x=1">ok</a> <a href="/pages/inventee">non</a> <a href="https://a.fr">ext</a>', { links: { known: new Set(["/products/serum"]) } })).toBe('<a href="/products/serum?x=1">ok</a> non ext');
  });

  it("exports HTML et WordPress, et vue de l'écran : un ancien corps dangereux est nettoyé à la sortie", async () => {
    const { articleHtml, articlesWxr, articleView } = await import("@/lib/engine/blog");
    const row = {
      id: "a1", project_id: "p", user_id: "u", title: "T", slug: "t", meta_title: "", meta_description: "", excerpt: "", body_html: '<p>Bonjour</p><img src=x onerror="alert(1)"//',
      tags: "[]", cover_asset_id: null, language: "fr", status: "draft" as const, published_url: null, platform_ref: null, qc_notes: "[]", created_at: 0, updated_at: 0, deleted_at: null,
    };
    const html = articleHtml(row, "Boutique --> <script>");
    const body = html.split("<!-- Corps de l'article à coller dans votre éditeur : -->")[1].split("</article>")[0];
    expect(unsafeParts(body)).toEqual([]);
    // Le nom de boutique ne sort pas de son commentaire.
    expect(html.match(/<!--/g)).toHaveLength(2);
    expect(html).not.toMatch(/onerror|<script/);
    const xml = articlesWxr([row], { title: "B", language: "fr", author: "B" });
    expect(xml).not.toMatch(/onerror/);
    expect(articleView(row as any).bodyHtml).toBe("<p>Bonjour</p>/");
  });
});

describe("I-2 / M-3 / I-4 publication Shopify", () => {
  it("refuse de dépublier un article en ligne sans demande explicite (unpublish)", async () => {
    const { user, pid } = await setup("vendre");
    const { run, id, now } = await import("@/lib/db");
    const aid = id();
    run("INSERT INTO blog_articles (id, project_id, user_id, title, slug, meta_title, meta_description, excerpt, body_html, tags, language, status, qc_notes, published_url, platform_ref, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      aid, pid, user.id, "Article", "article", "", "", "", "<p>Texte</p>", "[]", "fr", "published", "[]", "https://boutique.myshopify.com/blogs/news/article", "gid://shopify/Article/1", now(), now());
    await login(user.id);
    const { POST } = await import("@/app/api/projects/[id]/blog/[aid]/publish/route");
    const call = (b: unknown) => POST(new Request("http://x/publish", { method: "POST", body: JSON.stringify(b), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ id: pid, aid }) } as any);
    const r = await call({ publish: false });
    expect(r.status).toBe(409);
    expect(JSON.stringify(await r.json())).toMatch(/Retirer du blog/);
    // Avec la demande explicite, on passe ce contrôle (puis : aucune boutique connectée ici).
    const r2 = await call({ publish: false, unpublish: true });
    expect(r2.status).toBe(409);
    expect(JSON.stringify(await r2.json())).toMatch(/Connectez votre boutique Shopify/);
    await login(null);
  });

  it("mise à jour : garde le blog de l'article (aucun blog créé, lien juste) ; article supprimé dans Shopify : recréé", async () => {
    const { pushBlogArticle } = await import("@/lib/integrations/shopify");
    const { encrypt } = await import("@/lib/secrets");
    const c = { id: "c", user_id: "u", provider: "shopify", external_id: "boutique.myshopify.com", name: "B", access_token: encrypt("tok"), refresh_token: null, expires_at: null, scopes: "", meta: "{}", status: "active" };
    const seen: string[] = [];
    let exists = true;
    let sentBody = "";
    vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
      const { query, variables } = JSON.parse(init.body);
      const op = query.match(/(article\(id|blogs\(|blogCreate|articleUpdate|articleCreate)/)![1];
      seen.push(op);
      const data =
        op === "article(id" ? { article: exists ? { id: "gid://shopify/Article/1", handle: "mon-article", blog: { handle: "conseils" } } : null }
        : op === "blogs(" ? { blogs: { nodes: [{ id: "gid://shopify/Blog/9", title: "Conseils", handle: "conseils" }] } }
        : op === "blogCreate" ? { blogCreate: { blog: { id: "gid://shopify/Blog/10", handle: "journal" }, userErrors: [] } }
        : op === "articleUpdate" ? ((sentBody = variables.article.body), { articleUpdate: { article: { id: variables.id, handle: "mon-article", blog: { handle: "conseils" } }, userErrors: [] } })
        : ((sentBody = variables.article.body), { articleCreate: { article: { id: "gid://shopify/Article/2", handle: "mon-article", blog: { handle: "journal" } }, userErrors: [] } });
      return new Response(JSON.stringify({ data }), { headers: { "content-type": "application/json" } });
    });
    try {
      const input = { ref: "gid://shopify/Article/1", title: "T", handle: "mon-article", bodyHtml: '<p>x</p><img src=x onerror="alert(1)"', summary: "", tags: [], author: "B", metaTitle: "", metaDescription: "", publish: true, blogTitle: "Journal" };
      const r = await pushBlogArticle(c as any, input);
      expect(seen).toEqual(["article(id", "articleUpdate"]);
      expect(r.url).toBe("https://boutique.myshopify.com/blogs/conseils/mon-article");
      expect(sentBody).toBe("<p>x</p>");
      // Supprimé dans Shopify : recréé (dans un blog existant ou créé), nouvelle référence.
      seen.length = 0;
      exists = false;
      const r2 = await pushBlogArticle(c as any, input);
      expect(seen).toEqual(["article(id", "blogs(", "blogCreate", "articleCreate"]);
      expect(r2.ref).toBe("gid://shopify/Article/2");
      expect(r2.url).toBe("https://boutique.myshopify.com/blogs/journal/mon-article");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("I-3 sections sur mesure et aperçus cloisonnés", () => {
  const section = (extra: string) => `<div>{{ section.settings.t }}</div>${extra}\n{% schema %}{"name":"Démo","settings":[{"type":"text","id":"t","label":"T"}],"presets":[{"name":"Démo"}]}{% endschema %}`;

  it("refuse tout script chargé hors du thème (//, http, data:, script_tag, import), accepte asset_url et le script en ligne", async () => {
    const { validateCustomSection, hasExternalScript, applyOps } = await import("@/lib/theme/ops");
    for (const bad of ['<script defer src="//evil.example/x.js"></script>', "<script src=https://evil.example/x.js></script>", '<script src="data:text/javascript,alert(1)"></script>', '<script src="/x.js"></script>', "{{ '//cdn.example/x.js' | script_tag }}", "<script>import('https://evil.example/m.js')</script>", "<script>document.head.appendChild(document.createElement('script'))</script>"]) {
      expect(hasExternalScript(bad), bad).toBe(true);
      expect(validateCustomSection(section(bad)), bad).toMatch(/scripts externes/);
    }
    for (const good of [`<script src="{{ 'es-demo.js' | asset_url }}" defer></script>`, "<script>document.documentElement.classList.add('js')</script>"]) {
      expect(hasExternalScript(good), good).toBe(false);
      expect(validateCustomSection(section(good)), good).toBeNull();
    }
    const r = applyOps(sampleSpec(), [{ op: "custom_section", type: "es-custom-demo", name: "Démo", liquid: section('<script defer src="//evil.example/x.js"></script>') }]);
    expect(r.rejected).toHaveLength(1);
  });

  it("clé d'aperçu signée : liée au projet, infalsifiable, temporaire", async () => {
    const { pid, user } = await setup("vendre");
    const other = await setup("vendre");
    const { signPreview, verifyPreview, splitPreviewSegment, previewSegment } = await import("@/lib/theme/preview-access");
    const key = signPreview(user.id, pid);
    expect(verifyPreview(key, pid)).toBe(user.id);
    expect(verifyPreview(key, other.pid)).toBeNull();
    expect(verifyPreview(key.slice(0, -2) + "xx", pid)).toBeNull();
    expect(verifyPreview(signPreview(user.id, pid, -10), pid)).toBeNull();
    expect(verifyPreview(signPreview(other.user.id, pid), pid)).toBeNull();
    expect(splitPreviewSegment(previewSegment("v1", user.id, pid))).toMatchObject({ vid: "v1" });
    expect(splitPreviewSegment("v1")).toEqual({ vid: "v1", token: null });
  });

  it("route d'aperçu : bac à sable (CSP), clé sans cookie, redirection depuis la session, 401 sinon, CORS pour l'origine opaque", async () => {
    const { pid, user, versionId } = await setup("vendre");
    const { previewSegment } = await import("@/lib/theme/preview-access");
    const { GET, POST, OPTIONS } = await import("@/app/preview/[id]/v/[vid]/[[...path]]/route");
    const ctx = (vid: string, path?: string[]) => ({ params: Promise.resolve({ id: pid, vid, path }) }) as any;
    // Sans session ni clé : refusé.
    await login(null);
    expect((await GET(new Request(`http://x/preview/${pid}/v/${versionId}/`), ctx(versionId))).status).toBe(401);
    // Session du studio, sans clé : redirection vers l'adresse avec clé.
    await login(user.id);
    const red = await GET(new Request(`http://x/preview/${pid}/v/${versionId}/products/serum?x=1`), ctx(versionId, ["products", "serum"]));
    expect(red.status).toBe(307);
    expect(red.headers.get("location")).toMatch(new RegExp(`^/preview/${pid}/v/${versionId}~[^/]+/products/serum\\?x=1$`));
    // Clé valable, sans cookie (document cloisonné) : page servie dans le bac à sable, liens avec la clé.
    await login(null);
    const seg = previewSegment(versionId, user.id, pid);
    const page = await GET(new Request(`http://x/preview/${pid}/v/${seg}/`, { headers: { origin: "null" } }), ctx(seg));
    expect(page.status).toBe(200);
    expect(page.headers.get("content-security-policy")).toMatch(/^sandbox allow-scripts/);
    expect(page.headers.get("content-security-policy")).not.toMatch(/allow-same-origin/);
    expect(page.headers.get("access-control-allow-origin")).toBe("null");
    expect(await page.text()).toContain(`/preview/${pid}/v/${seg}/`);
    // Panier de démonstration sans cookie.
    const add = await POST(new Request(`http://x/preview/${pid}/v/${seg}/cart/add.js`, { method: "POST", body: JSON.stringify({ id: 1000, quantity: 2 }), headers: { "content-type": "application/json", origin: "null" } }), ctx(seg, ["cart", "add.js"]));
    expect((await add.json()).item_count).toBe(2);
    const pre = await OPTIONS(new Request(`http://x/preview/${pid}/v/${seg}/cart/add.js`, { method: "OPTIONS", headers: { origin: "null" } }));
    expect(pre.headers.get("access-control-allow-headers")).toMatch(/X-Requested-With/);
    // Clé d'un autre projet : refusée.
    const other = await setup("vendre");
    const foreign = previewSegment(versionId, other.user.id, other.pid);
    expect((await GET(new Request(`http://x/preview/${pid}/v/${foreign}/`), ctx(foreign))).status).toBe(401);
  });

  it("M-6 : section sur mesure par l'API des retouches refusée avec le forfait Créer (402)", async () => {
    const { user, pid } = await setup("creer");
    await login(user.id);
    const { POST } = await import("@/app/api/projects/[id]/theme/ops/route");
    const res = await POST(new Request("http://x/ops", { method: "POST", body: JSON.stringify({ ops: [{ op: "custom_section", type: "es-custom-demo", name: "Démo", liquid: section("") }] }) }), { params: Promise.resolve({ id: pid }) } as any);
    expect(res.status).toBe(402);
    expect(JSON.stringify(await res.json())).toMatch(/Vendre et Dominer/);
    await login(null);
  });
});

describe("M-5 export WordPress : commentaires PHP intacts", () => {
  it("nom de boutique et titres de pages ne ferment pas les commentaires PHP/CSS", async () => {
    const { commentSafe } = await import("@/lib/theme/platforms");
    const { exportWordPress } = await import("@/lib/cms-v2/adapters/wordpress");
    expect(commentSafe("A */ B ?> C\nD")).toBe("A * / B ? > C D");
    const spec = serviceSpec("atelier");
    spec.store.shopName = "Atelier */ phpinfo(); ?> <?php system('x');";
    spec.store.pages[0].title = "Tarifs */ exit; /*";
    const { zip } = await exportWordPress(spec, () => null);
    const files = unzipSync(new Uint8Array(zip));
    // Fichiers PHP qui reprennent un texte du projet (nom de boutique) : le moteur PHP inclus n'en contient aucun.
    const php = Object.entries(files).filter(([f, d]) => f.endsWith(".php") && strFromU8(d).includes("Atelier"));
    expect(php.length).toBeGreaterThan(0);
    for (const [f, data] of php) {
      const src = strFromU8(data);
      const comment = src.match(/\/\*\*[\s\S]*?\*\//)![0];
      // Tout le texte jusqu'à la vraie fin du commentaire reste dans le commentaire.
      expect(src.indexOf("*/"), f).toBe(src.indexOf(comment) + comment.length - 2);
      expect(comment, f).not.toMatch(/\?>/);
    }
    const style = strFromU8(Object.entries(files).find(([f]) => f.endsWith("style.css"))![1]);
    // Un seul commentaire (l'en-tête du thème) : le nom piégé ne le ferme pas plus tôt.
    expect(style.indexOf("*/")).toBe(style.lastIndexOf("*/"));
    expect(style.slice(0, style.indexOf("*/"))).toContain("Atelier * / phpinfo()");
  });
});

describe("M-7 / M-8 / M-9 vidéos et création", () => {
  it("note d'étape vidéo : dit si le plan IA a servi, et pourquoi sinon", async () => {
    const { videoStepNote } = await import("@/lib/engine/videos");
    const { runWithLang } = await import("@/lib/i18n-server");
    const fr = (fn: () => string) => runWithLang({ ui: "fr", content: "fr" }, fn);
    expect(fr(() => videoStepNote(["a", "b"], true))).toBe("2 vidéo(s) rendue(s)");
    expect(fr(() => videoStepNote([{ assetId: "a", method: "motion" }, { assetId: "b", method: "motion" }], false))).toMatch(/montage à partir des images/);
    expect(fr(() => videoStepNote([{ assetId: "a", method: "ai-clip" }, { assetId: "b", method: "motion", clipFallback: "plan IA refusé au contrôle : fidélité insuffisante (4/10)" }], true))).toMatch(/plan IA : 1 sur 2, montage à partir des images pour l'autre — plan IA refusé/);
    expect(fr(() => videoStepNote([{ assetId: "a", method: "motion", clipFallback: "génération de plans vidéo non disponible" }, { assetId: "b", method: "motion", clipFallback: "génération de plans vidéo non disponible" }], true))).toMatch(/plan IA non utilisé \(génération de plans vidéo non disponible\)/);
  });

  it("vidéo sans photo du produit : erreur définitive (pas de nouvelle tentative)", async () => {
    const { pid, user } = await setup("vendre");
    const { produceVideo } = await import("@/lib/engine/videos");
    const { enqueue, JobContext, UserFacingError } = await import("@/lib/jobs");
    const job = enqueue({ userId: user.id, projectId: pid, type: "video.create", payload: {} });
    await expect(produceVideo(new JobContext(job), pid, { format: "9:16" })).rejects.toBeInstanceOf(UserFacingError);
  });

  it("annulation volontaire de la création : projet en pause (pas en erreur), étape marquée arrêtée", async () => {
    const { pid, user } = await setup("vendre");
    const { enqueue, JobContext, JobCancelled } = await import("@/lib/jobs");
    const { run, one } = await import("@/lib/db");
    const { runPipeline } = await import("@/lib/engine/pipeline");
    const job = enqueue({ userId: user.id, projectId: pid, type: "pipeline.run", payload: { projectId: pid, mode: "autopilot", input: {} } });
    run("UPDATE jobs SET status = 'cancelled' WHERE id = ?", job.id);
    const ctx = new JobContext(job);
    await expect(runPipeline(ctx)).rejects.toBeInstanceOf(JobCancelled);
    expect(one<{ status: string }>("SELECT status FROM projects WHERE id = ?", pid)!.status).toBe("paused");
    const steps = Object.values(ctx.checkpoint.__steps as Record<string, { status: string }>);
    expect(steps.map((s) => s.status)).toContain("paused");
    expect(steps.map((s) => s.status)).not.toContain("failed");
  });
});

describe("améliorations : sujets d'articles et corbeille", () => {
  it("« Autres idées » : au plus un appel à l'IA toutes les 30 s par projet", async () => {
    const { pid } = await setup("vendre");
    const { suggestTopics } = await import("@/lib/engine/blog");
    const { loadProject } = await import("@/lib/projects");
    const p = loadProject(pid);
    llmCalls.length = 0;
    await suggestTopics(p, { refresh: true });
    await suggestTopics(p, { refresh: true });
    await suggestTopics(p, { refresh: true });
    expect(llmCalls).toEqual(["blog_topics"]);
  });

  it("nombre d'articles à la corbeille compté par une seule requête", async () => {
    const { pid, user } = await setup("vendre");
    const { run, id, now } = await import("@/lib/db");
    const { countTrashed } = await import("@/lib/engine/blog");
    for (const deleted of [now(), now(), null]) run("INSERT INTO blog_articles (id, project_id, user_id, title, slug, meta_title, meta_description, excerpt, body_html, tags, language, status, qc_notes, created_at, updated_at, deleted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", id(), pid, user.id, "A", `a-${crypto.randomUUID()}`, "", "", "", "<p>x</p>", "[]", "fr", "draft", "[]", now(), now(), deleted);
    expect(countTrashed(pid)).toBe(2);
  });
});
