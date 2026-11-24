/**
 * La méthode des graphistes : les requêtes EXACTES telles qu'elles partent du vrai client OpenAI (SDK réel, serveur local,
 * aucune clé ni API réelle). Recherche : POST /v1/images/generations en JSON, la demande des preuves (phase1.py).
 * Finalisation : POST /v1/images/edits en multipart, l'esquisse dans image[], le texte tel quel (finaliser.py).
 */
import http from "node:http";
import net from "node:net";
import { once } from "node:events";
import { toFile } from "openai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openaiClient } from "@/lib/ai/openai-images";
import { champsDeFinalisation, requeteDePlanche } from "@/lib/ai/media-providers";

afterEach(() => vi.unstubAllEnvs());

async function serveur() {
  const recu: { url: string; type: string; body: Buffer }[] = [];
  const s = http.createServer(async (req, res) => {
    const parts: Buffer[] = []; for await (const c of req) parts.push(c as Buffer);
    recu.push({ url: req.url!, type: String(req.headers["content-type"]), body: Buffer.concat(parts) });
    res.setHeader("content-type", "application/json"); res.setHeader("x-request-id", "req_essai_local");
    res.end(JSON.stringify({ data: [{ b64_json: Buffer.from("png").toString("base64") }], quality: "medium", size: "1536x1024", background: "opaque", output_format: "png", usage: { input_tokens: 95, output_tokens: 343, input_tokens_details: { text_tokens: 95, image_tokens: 0 }, output_tokens_details: { image_tokens: 343, text_tokens: 0 } } }));
  });
  s.listen(0, "127.0.0.1"); await once(s, "listening");
  const port = (s.address() as net.AddressInfo).port;
  for (const k of ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"]) vi.stubEnv(k, "");
  vi.stubEnv("OPENAI_BASE_URL", `http://127.0.0.1:${port}/v1`);
  return { recu, fermer: () => new Promise<void>((r) => s.close(() => r())) };
}

const TEXTE = "Crée une planche de recherche graphique pour Reflet, une entreprise de nettoyage de voitures, intérieur et extérieur. Présente six esquisses de logos contemporains sur une grille de trois colonnes et deux lignes. Explore différentes manières de traduire le savoir-faire du nettoyage automobile dans le dessin des lettres et des signes graphiques. Chaque piste doit pouvoir devenir une véritable marque commerciale. Travaille sur fond blanc, sans maquette de présentation.";

describe("les requêtes exactes de la méthode des graphistes (SDK réel)", () => {
  it("recherche : generations, mêmes réglages pour les deux modèles, « complexity » seulement pour 2.6 Flare", async () => {
    const srv = await serveur();
    try {
      const c = openaiClient("fausse-cle-locale-pas-une-cle");
      const r = await c.images.generate(requeteDePlanche("gpt-image-2.5-sunburst", TEXTE) as never).withResponse();
      await c.images.generate(requeteDePlanche("gpt-image-2.6-flare", TEXTE) as never);
      expect(r.request_id).toBe("req_essai_local");
      expect(srv.recu.map((x) => x.url)).toEqual(["/v1/images/generations", "/v1/images/generations"]);
      const [a, b] = srv.recu.map((x) => JSON.parse(x.body.toString("utf8")));
      // Les corps des preuves (phase1.py), à la clé près.
      expect(a).toEqual({ prompt: TEXTE, size: "1536x1024", quality: "medium", background: "opaque", output_format: "png", n: 1, model: "gpt-image-2.5-sunburst" });
      expect(b).toEqual({ prompt: TEXTE, size: "1536x1024", quality: "medium", background: "opaque", output_format: "png", n: 1, model: "gpt-image-2.6-flare", complexity: "medium" });
    } finally { await srv.fermer(); }
  });
  it("finalisation : edits en multipart, l'esquisse dans image[], le texte tel quel, 2.6 Sunburst haute qualité en taille libre", async () => {
    const srv = await serveur();
    try {
      const texte = "Transforme cette esquisse en véritable logo contemporain pour Reflet, une entreprise de nettoyage de voitures, intérieur et extérieur. Fais évoluer l'idée. style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif";
      const c = openaiClient("fausse-cle-locale-pas-une-cle");
      await c.images.edit({ ...champsDeFinalisation(texte), image: [await toFile(Buffer.from("octets-de-l-esquisse-4"), "esquisse.png", { type: "image/png" })] } as never);
      const r = srv.recu[0];
      expect(r.url).toBe("/v1/images/edits");
      expect(r.type).toContain("multipart/form-data; boundary=");
      const corps = r.body.toString("utf8");
      const champ = (nom: string) => new RegExp(`name="${nom.replace(/[[\]]/g, "\\$&")}"\\r\\n\\r\\n([^\\r]*)\\r\\n`).exec(corps)?.[1];
      expect(champ("model")).toBe("gpt-image-2.6-sunburst");
      expect(champ("quality")).toBe("high");
      expect(champ("size")).toBe("auto");
      expect(champ("background")).toBe("opaque");
      expect(champ("output_format")).toBe("png");
      expect(champ("n")).toBe("1");
      expect(champ("prompt")).toBe(texte);
      // Le fichier part sous le nom de champ image[] (comme la preuve), jamais « image » seul.
      expect(corps).toMatch(/name="image\[\]"; filename="esquisse\.png"/);
      expect(corps).not.toMatch(/name="image"/);
      expect(corps).toContain("octets-de-l-esquisse-4");
    } finally { await srv.fermer(); }
  });
  it("le détail de l'usage et ce qu'OpenAI dit avoir rendu (qualité, taille, fond, format) sont gardés avec l'appel, rien de secret", async () => {
    const { openaiImage, imageRenvoyee } = await import("@/lib/ai/openai-images");
    const { setJsonSetting } = await import("@/lib/settings");
    setJsonSetting("ai.media.openaiStream", false);
    const srv = await serveur();
    try {
      const r = await openaiImage(openaiClient("fausse-cle-locale-pas-une-cle"), "generate", requeteDePlanche("gpt-image-2.5-sunburst", TEXTE), () => {});
      expect(r.renvoye).toEqual({ quality: "medium", size: "1536x1024", background: "opaque", output_format: "png" });
      expect(r.usage).toEqual({ input_tokens: 95, output_tokens: 343, input_tokens_details: { text_tokens: 95, image_tokens: 0 }, output_tokens_details: { image_tokens: 343, text_tokens: 0 } });
      expect(r.requestId).toBe("req_essai_local");
    } finally { await srv.fermer(); setJsonSetting("ai.media.openaiStream", true); }
    expect(imageRenvoyee({})).toEqual({ quality: null, size: null, background: null, output_format: null });
    // Le détail de l'appel enregistré (ai_calls) et le reçu de l'image les gardent ; aucune clé n'y entre.
    const src = (await import("node:fs")).readFileSync("src/lib/ai/media-providers.ts", "utf8");
    expect(src).toContain("jointes: fin ? 1 : 0, usage: res.usage ?? null, renvoye: res.renvoye } });");
    expect(src).toContain("coutMicro: billed, dureeMs: res.ms, renvoye: res.renvoye });");
    expect(src).toContain("jetonsTexte: u.input_tokens_details?.text_tokens ?? 0, usage: res.usage ?? null, renvoye: res.renvoye } });");
  });

});
