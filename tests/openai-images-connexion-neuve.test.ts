/**
 * Le client HTTP des images (essai Mouture du 26 novembre 2026 : deux « Connection error. » 0,5 s et 8,5 s après l'envoi,
 * sur la connexion gardée ouverte par l'image d'avant) : 10 minutes de délai, une connexion neuve par image, avec ou sans
 * proxy, aucune nouvelle tentative, et la cause du réseau gardée. SDK réel, serveur et proxy locaux ; aucune API ni clé réelle.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import http from "node:http";
import net from "node:net";
import { once } from "node:events";
import OpenAI, { toFile } from "openai";
import { DELAI_DES_IMAGES_MS, REGLAGES_DU_CLIENT_DES_IMAGES, dispatcherDesImages, messageAvecCause, openaiClient } from "../src/lib/ai/openai-images";

afterEach(() => vi.unstubAllEnvs());

const sansProxy = () => { for (const k of ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "NO_PROXY", "no_proxy"]) vi.stubEnv(k, ""); };
/** Le temps que la connexion d'avant soit rendue au client HTTP (comme entre deux images de la planche, mise au format). */
const pause = () => new Promise((r) => setTimeout(r, 100));
const uneImage = async (c: OpenAI) => c.images.edit({ model: "gpt-image-2.5-sunburst", image: await toFile(Buffer.from("apercu"), "apercu.png", { type: "image/png" }), prompt: "Refais-la à l'identique.", n: 1 });

/** Serveur d'images local qui GARDE les connexions ouvertes (comme un vrai serveur) et compte les connexions reçues. */
async function serveur(o: { couper?: boolean } = {}) {
  let connexions = 0, demandes = 0;
  const s = http.createServer(async (req, res) => {
    demandes++;
    for await (const _ of req) { /* corps lu */ }
    if (o.couper) { req.socket.destroy(); return; }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ data: [{ b64_json: Buffer.from("image").toString("base64") }] }));
  });
  s.keepAliveTimeout = 60_000;
  s.on("connection", () => connexions++);
  s.listen(0, "127.0.0.1");
  await once(s, "listening");
  const port = (s.address() as net.AddressInfo).port;
  return { port, get connexions() { return connexions; }, get demandes() { return demandes; }, fermer: () => new Promise<void>((r) => { s.closeAllConnections(); s.close(() => r()); }) };
}

describe("le client HTTP des images", () => {
  it("10 minutes de délai au SDK et au client HTTP, aucune nouvelle tentative, aucune connexion gardée", () => {
    expect(DELAI_DES_IMAGES_MS).toBe(600_000);
    expect(REGLAGES_DU_CLIENT_DES_IMAGES).toEqual({ headersTimeout: 600_000, bodyTimeout: 600_000, pipelining: 0 });
    sansProxy();
    const c = openaiClient("fausse-cle-locale");
    expect(c.timeout).toBe(600_000);
    expect(c.maxRetries).toBe(0);
  });

  it("sans proxy (serveur du Studio) : deux images à la suite partent chacune sur une connexion neuve", async () => {
    sansProxy();
    const srv = await serveur();
    vi.stubEnv("OPENAI_BASE_URL", `http://127.0.0.1:${srv.port}/v1`);
    try {
      const c = openaiClient("fausse-cle-locale");
      await uneImage(c);
      await pause();
      await uneImage(c);
      expect(srv.demandes).toBe(2);
      expect(srv.connexions).toBe(2);
    } finally { await srv.fermer(); }
  });

  it("avec le proxy de l'environnement, même avec NODE_USE_ENV_PROXY=1 : un tunnel neuf par image", async () => {
    const srv = await serveur();
    let tunnels = 0;
    const sockets = new Set<net.Socket>();
    const proxy = http.createServer((_q, r) => { r.statusCode = 500; r.end(); });
    proxy.on("connect", (req, client: net.Socket, head) => {
      tunnels++;
      const up = net.connect(srv.port, "127.0.0.1", () => { client.write("HTTP/1.1 200 Connection Established\r\n\r\n"); if (head.length) up.write(head); client.pipe(up); up.pipe(client); });
      sockets.add(up); sockets.add(client);
      up.on("error", () => client.destroy()); client.on("error", () => up.destroy());
    });
    proxy.listen(0, "127.0.0.1");
    await once(proxy, "listening");
    const purl = `http://127.0.0.1:${(proxy.address() as net.AddressInfo).port}`;
    sansProxy();
    for (const k of ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"]) vi.stubEnv(k, purl);
    vi.stubEnv("NODE_USE_ENV_PROXY", "1");
    vi.stubEnv("OPENAI_BASE_URL", `http://127.0.0.1:${srv.port}/v1`);
    try {
      const c = openaiClient("fausse-cle-locale");
      await uneImage(c);
      await pause();
      await uneImage(c);
      expect(tunnels).toBe(2);
      expect(srv.connexions).toBe(2);
    } finally {
      for (const s of sockets) s.destroy();
      await Promise.all([srv.fermer(), new Promise<void>((r) => proxy.close(() => r()))]);
    }
  });

  it("le client HTTP suit le réglage du proxy (un seul par réglage)", () => {
    sansProxy();
    const a = dispatcherDesImages();
    expect(dispatcherDesImages()).toBe(a);
    vi.stubEnv("HTTPS_PROXY", "http://127.0.0.1:9");
    expect(dispatcherDesImages()).not.toBe(a);
  });

  it("une connexion coupée par l'autre bout : « Connection error. », jamais rejouée, et sa cause gardée", async () => {
    sansProxy();
    const srv = await serveur({ couper: true });
    vi.stubEnv("OPENAI_BASE_URL", `http://127.0.0.1:${srv.port}/v1`);
    try {
      const e = await uneImage(openaiClient("fausse-cle-locale")).then(() => null, (x) => x);
      expect(e).toBeInstanceOf(OpenAI.APIConnectionError);
      expect(e).not.toBeInstanceOf(OpenAI.APIConnectionTimeoutError);
      expect(e.message).toBe("Connection error.");
      expect(srv.demandes).toBe(1);
      const m = messageAvecCause(e);
      expect(m.startsWith("Connection error. ← cause : TypeError: fetch failed ← cause : ")).toBe(true);
      expect(m).toMatch(/other side closed|ECONNRESET|socket hang up/);
    } finally { await srv.fermer(); }
  });

  it("le message avec sa cause : nom, code et octets de la connexion, sans doublon ni boucle", () => {
    const socket = Object.assign(new Error("other side closed"), { name: "SocketError", code: "UND_ERR_SOCKET", socket: { bytesWritten: 1234, bytesRead: 0 } });
    const fetchEchoue = new TypeError("fetch failed", { cause: socket });
    const e = new OpenAI.APIConnectionError({ cause: fetchEchoue });
    expect(messageAvecCause(e)).toBe("Connection error. ← cause : TypeError: fetch failed ← cause : SocketError: other side closed [UND_ERR_SOCKET] (octets envoyés 1234, reçus 0)");
    const boucle: any = new Error("a"); boucle.cause = boucle;
    expect(messageAvecCause(boucle)).toBe("a");
    expect(messageAvecCause("texte")).toBe("texte");
  });
});
