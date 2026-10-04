/**
 * Outils de tournage des tutoriels : curseur animé, clics visibles, mise en évidence et sous-titres
 * posés par-dessus le vrai studio, capturés image par image (CDP screencast) puis encodés en H.264.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import type { CDPSession, Locator, Page } from "playwright";

export const VIEWPORT = { width: 1440, height: 900 };

/** Calque injecté dans chaque page : curseur, onde de clic, cadre de mise en évidence, sous-titre, cartons. */
export const OVERLAY = () => {
  const install = () => {
    if (document.getElementById("tuto-overlay")) return;
    document.documentElement.classList.add("es-recording");
    const st = document.createElement("style");
    st.textContent = `
      nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog-overlay] { display: none !important; }
      html.es-recording [data-tuto-nudge] { display: none !important; }
      #tuto-overlay { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      #tuto-cursor { position: absolute; left: 0; top: 0; width: 26px; height: 26px; transform: translate(720px, 520px); transition: transform var(--d, 700ms) cubic-bezier(.45,.05,.25,1); filter: drop-shadow(0 2px 4px rgba(0,0,0,.35)); }
      #tuto-ripple { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; border: 3px solid #2F6BFF; background: rgba(47,107,255,.18); opacity: 0; }
      #tuto-ripple.on { animation: tuto-ripple .55s ease-out; }
      @keyframes tuto-ripple { 0% { opacity: 1; transform: scale(.3); } 100% { opacity: 0; transform: scale(1.6); } }
      #tuto-spot { position: absolute; border-radius: 16px; box-shadow: 0 0 0 4px #2F6BFF, 0 0 0 9999px rgba(8,12,28,.42); opacity: 0; transition: opacity .35s, left .45s, top .45s, width .45s, height .45s; }
      #tuto-spot.on { opacity: 1; }
      #tuto-caption { position: absolute; left: 50%; bottom: 34px; transform: translate(-50%, 12px); max-width: 1040px; width: max-content; display: flex; gap: 14px; align-items: flex-start; padding: 16px 24px; border-radius: 20px; background: rgba(9,13,30,.92); color: #fff; font-size: 23px; line-height: 1.38; font-weight: 500; letter-spacing: -.005em; box-shadow: 0 18px 50px -12px rgba(0,0,0,.55); opacity: 0; transition: opacity .35s, transform .35s; }
      #tuto-caption.on { opacity: 1; transform: translate(-50%, 0); }
      #tuto-caption.top { bottom: auto; top: 84px; }
      #tuto-caption b { flex: none; display: grid; place-items: center; min-width: 34px; height: 34px; margin-top: 1px; padding: 0 8px; border-radius: 999px; background: #2F6BFF; font-size: 16px; font-weight: 700; }
      #tuto-card { position: absolute; inset: 0; display: grid; place-items: center; background: radial-gradient(1200px 700px at 30% 20%, #1E3A8A 0%, #0A1024 60%); color: #fff; opacity: 0; transition: opacity .45s; }
      #tuto-card.on { opacity: 1; }
      #tuto-card .in { max-width: 980px; padding: 0 60px; }
      #tuto-card .k { font-size: 20px; letter-spacing: .2em; text-transform: uppercase; color: #8FB4FF; font-weight: 600; }
      #tuto-card h1 { margin: 18px 0 0; font-size: 76px; line-height: 1; font-weight: 700; letter-spacing: -.03em; }
      #tuto-card p { margin: 26px 0 0; font-size: 28px; line-height: 1.4; color: #D6E2FF; }
      #tuto-card .brand { margin-top: 48px; font-size: 18px; font-weight: 700; letter-spacing: .04em; color: #fff; opacity: .8; }
    `;
    document.head.appendChild(st);
    const o = document.createElement("div");
    o.id = "tuto-overlay";
    o.innerHTML = `<div id="tuto-spot"></div><div id="tuto-ripple"></div><svg id="tuto-cursor" viewBox="0 0 24 24"><path d="M4 2.5 L4 19 L8.6 14.9 L11.6 21.4 L14.4 20.1 L11.4 13.7 L17.6 13.4 Z" fill="#fff" stroke="#0A1024" stroke-width="1.6" stroke-linejoin="round"/></svg><div id="tuto-caption"></div><div id="tuto-card"></div>`;
    document.body.appendChild(o);
    const s = (window as any).__tutoState;
    if (s) {
      (document.getElementById("tuto-cursor") as HTMLElement).style.setProperty("--d", "0ms");
      (document.getElementById("tuto-cursor") as HTMLElement).style.transform = `translate(${s.x}px, ${s.y}px)`;
    }
  };
  if (document.body) install();
  else document.addEventListener("DOMContentLoaded", install);
};

type Frame = { file: string; t: number };

export class Recorder {
  frames: Frame[] = [];
  private cdp!: CDPSession;
  private t0 = 0;
  private n = 0;
  stepTimes: number[] = [];
  /** Attentes coupées au montage (horloge en secondes depuis l'époque Unix). */
  cuts: [number, number][] = [];
  pos = { x: 720, y: 520 };
  constructor(public page: Page, private dir: string, public lang: "fr" | "en", private captions: string[]) {}

  /** Lance la capture : une image à chaque changement d'écran, horodatée. */
  async start() {
    fs.mkdirSync(this.dir, { recursive: true });
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on("Page.screencastFrame", async (f) => {
      const file = path.join(this.dir, `f${String(this.n++).padStart(5, "0")}.jpg`);
      fs.writeFileSync(file, Buffer.from(f.data, "base64"));
      this.frames.push({ file, t: f.metadata.timestamp ?? Date.now() / 1000 });
      await this.cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    });
    await this.cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: VIEWPORT.width, maxHeight: VIEWPORT.height, everyNthFrame: 1 });
    this.t0 = Date.now() / 1000;
  }
  async stop() {
    await this.cdp.send("Page.stopScreencast").catch(() => {});
  }
  now() {
    return Date.now() / 1000 - this.t0;
  }

  /**
   * Attente longue (génération, chargement) : elle est jouée en entier pendant le tournage mais coupée au montage,
   * en gardant ~1 s avant et après, pour que la vidéo ne montre jamais un écran qui patiente.
   */
  async during<T>(work: Promise<T>, keep = 1): Promise<T> {
    const a = Date.now() / 1000;
    const res = await work;
    const b = Date.now() / 1000;
    if (b - a > keep * 2 + 0.5) this.cuts.push([a + keep, b - keep]);
    return res;
  }

  /** Temps dans la vidéo montée (secondes depuis le début) d'un instant de l'horloge du script (secondes depuis start). */
  videoTime(scriptSeconds: number) {
    const abs = this.t0 + scriptSeconds;
    const first = this.frames.length ? Math.min(...this.frames.map((f) => f.t)) : this.t0;
    let cut = 0;
    for (const [a, b] of this.cuts) if (abs >= b) cut += b - a; else if (abs > a) cut += abs - a;
    return Math.max(0, abs - first - cut);
  }

  async wait(ms: number) {
    await this.page.waitForTimeout(ms);
  }
  /** Carton plein écran (ouverture, fin). */
  async card(kicker: string, title: string, text: string, ms: number) {
    await this.page.evaluate(([k, t, x, brand]) => {
      const c = document.getElementById("tuto-card")!;
      c.innerHTML = `<div class="in"><div class="k"></div><h1></h1><p></p><div class="brand">${brand}</div></div>`;
      c.querySelector(".k")!.textContent = k;
      c.querySelector("h1")!.textContent = t;
      c.querySelector("p")!.textContent = x;
      c.classList.add("on");
    }, [kicker, title, text, "E-COM STUDIO IA"] as const);
    await this.wait(ms);
    await this.page.evaluate(() => document.getElementById("tuto-card")!.classList.remove("on"));
    await this.wait(500);
  }

  /** Étape i : le sous-titre s'affiche, l'action est jouée, puis une pause de lecture proportionnelle au texte. */
  async step(i: number, action?: () => Promise<void>, opts: { hold?: number } = {}) {
    const text = this.captions[i];
    if (text === undefined) throw new Error(`étape ${i} sans texte`);
    this.stepTimes[i] = this.now();
    await this.page.evaluate(([n, total, t]) => {
      const c = document.getElementById("tuto-caption")!;
      c.classList.remove("on");
      c.innerHTML = `<b>${n}/${total}</b><span></span>`;
      c.querySelector("span")!.textContent = t;
      requestAnimationFrame(() => c.classList.add("on"));
    }, [i + 1, this.captions.length, text] as const);
    const t0 = Date.now();
    await this.wait(700);
    if (action) await action();
    // Temps de lecture : environ 15 caractères par seconde, au moins 2,5 s après l'apparition.
    const reading = Math.max(2500, (text.length / 15) * 1000) + (opts.hold ?? 0);
    const left = reading - (Date.now() - t0);
    if (left > 0) await this.wait(left);
  }

  async captionOff() {
    await this.page.evaluate(() => document.getElementById("tuto-caption")?.classList.remove("on"));
  }

  /** Déplace le curseur au centre de l'élément (défilement doux si besoin). */
  async point(target: Locator, opts: { dx?: number; dy?: number } = {}) {
    await target.first().waitFor({ state: "visible", timeout: 15000 });
    await this.reveal(target);
    const b = (await target.first().boundingBox())!;
    const x = Math.round(b.x + (opts.dx ?? b.width / 2));
    const y = Math.round(b.y + (opts.dy ?? b.height / 2));
    const dist = Math.hypot(x - this.pos.x, y - this.pos.y);
    const ms = Math.round(Math.min(1100, Math.max(350, dist * 0.9)));
    await this.page.evaluate(([x, y, ms, vh]) => {
      const c = document.getElementById("tuto-cursor")!;
      c.style.setProperty("--d", `${ms}ms`);
      c.style.transform = `translate(${x}px, ${y}px)`;
      (window as any).__tutoState = { x, y };
      // Le sous-titre ne cache jamais l'endroit montré : il passe en haut quand on agit en bas de l'écran.
      const cap = document.getElementById("tuto-caption")!;
      if (y > vh - 230) cap.classList.add("top");
      else if (y < vh - 330) cap.classList.remove("top");
    }, [x, y, ms, VIEWPORT.height] as const);
    this.pos = { x, y };
    // Vrai survol (menus, aperçus au survol) en même temps que le curseur dessiné.
    await this.page.mouse.move(x, y, { steps: Math.max(2, Math.round(ms / 40)) });
    await this.wait(120);
  }

  /** Clic visible puis vrai clic. */
  async click(target: Locator, opts: { dx?: number; dy?: number; settle?: number } = {}) {
    await this.point(target, opts);
    await this.page.evaluate(([x, y]) => {
      const r = document.getElementById("tuto-ripple")!;
      r.style.left = `${x}px`;
      r.style.top = `${y}px`;
      r.classList.remove("on");
      void r.offsetWidth;
      r.classList.add("on");
    }, [this.pos.x, this.pos.y] as const);
    await this.wait(180);
    await this.page.mouse.click(this.pos.x, this.pos.y);
    await this.wait(opts.settle ?? 700);
  }

  /** Saisie lettre par lettre, comme un client. */
  async type(target: Locator, text: string, opts: { clear?: boolean; delay?: number } = {}) {
    await this.click(target, { settle: 250 });
    if (opts.clear) await target.first().fill("");
    await target.first().pressSequentially(text, { delay: opts.delay ?? 45 });
    await this.wait(400);
  }

  /** Cadre lumineux autour d'un élément, le reste de l'écran assombri. */
  async spot(target: Locator | null, pad = 8) {
    if (!target) {
      await this.page.evaluate(() => document.getElementById("tuto-spot")!.classList.remove("on"));
      await this.wait(350);
      return;
    }
    await this.reveal(target);
    const b = (await target.first().boundingBox())!;
    await this.page.evaluate(([x, y, w, h]) => {
      const s = document.getElementById("tuto-spot")!;
      Object.assign(s.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
      s.classList.add("on");
    }, [b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2] as const);
    await this.wait(500);
  }

  /** Amène l'élément dans l'écran avec un défilement doux (au-dessus du sous-titre). */
  async reveal(target: Locator) {
    const b = await target.first().boundingBox();
    if (!b) return;
    const vh = VIEWPORT.height;
    if (b.y >= 80 && b.y + Math.min(b.height, 500) <= vh - 150) return;
    await target.first().evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
    await this.wait(900);
  }

  /** Défilement doux de la page (pixels). */
  async scroll(dy: number) {
    await this.page.evaluate((dy) => window.scrollBy({ top: dy, behavior: "smooth" }), dy);
    await this.wait(Math.min(1400, 500 + Math.abs(dy)));
  }

  /** Encode les images capturées (durées réelles entre deux images) en MP4 H.264 1280×800 et produit l'affiche. */
  async encode(out: string, poster: string, posterAt: number) {
    // Montage : les images prises pendant une attente coupée disparaissent, la suite est avancée d'autant.
    const inCut = (t: number) => this.cuts.some(([a, b]) => t > a && t < b);
    const shift = (t: number) => this.cuts.reduce((acc, [a, b]) => acc + (t >= b ? b - a : 0), 0);
    const frames = this.frames.filter((f) => !inCut(f.t)).map((f) => ({ file: f.file, t: f.t - shift(f.t) })).sort((a, b) => a.t - b.t);
    if (frames.length < 2) throw new Error("aucune image capturée");
    const endAbs = Date.now() / 1000;
    const end = endAbs - shift(endAbs);
    const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(1 / 60, ((frames[i + 1]?.t ?? end) - f.t)).toFixed(4)}`).join("\n") + `\nfile '${frames[frames.length - 1].file}'\n`;
    const listFile = path.join(this.dir, "list.txt");
    fs.writeFileSync(listFile, list);
    await run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-vf", "scale=1280:800:flags=lanczos,fps=24,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-tune", "stillimage", "-movflags", "+faststart", out]);
    const first = frames[0].t;
    const pf = frames.find((f) => f.t - first >= posterAt) ?? frames[frames.length - 1];
    await run("ffmpeg", ["-y", "-i", pf.file, "-vf", "scale=1280:800:flags=lanczos", "-q:v", "4", poster]);
    // Décalage entre l'horloge du script et celle des images.
    return first - this.t0;
  }
}

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err = (err + d).slice(-2000)));
    p.on("error", reject);
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error(`${cmd} ${c}: ${err}`))));
  });
}
