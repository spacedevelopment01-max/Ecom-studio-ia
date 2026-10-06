/**
 * Vignettes des directions avec le contenu du projet (nom, textes, photos, prestations) au lieu des
 * captures d'exemple : un carrossier voit son atelier dans chaque direction, pas un drone.
 * Un seul navigateur partagé, captures faites l'une après l'autre (mémoire limitée, ex. Codespaces),
 * fermé après une minute d'inactivité ; résultats gardés en mémoire selon l'empreinte du thème composé.
 */
import sharp from "sharp";
import { composeShop } from "../engine/shop";
import { themeFingerprint } from "./compile";
import { chromiumPath, themeContext } from "./snapshot";
import type { DirectionId } from "./directions";
import type { Lang } from "../i18n";
import { runWithLang } from "../i18n-server";

type Browser = import("playwright").Browser;
const g = globalThis as { __esDirThumbs?: { cache: Map<string, Buffer>; queue: Promise<unknown>; browser: Promise<Browser> | null; idle: NodeJS.Timeout | null } };
const state = (g.__esDirThumbs ??= { cache: new Map(), queue: Promise.resolve(), browser: null, idle: null });

async function browser(): Promise<Browser | null> {
  const executablePath = chromiumPath();
  if (!executablePath) return null;
  if (!state.browser) {
    state.browser = import("playwright").then(({ chromium }) => chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] }));
    state.browser.catch(() => (state.browser = null));
  }
  return state.browser;
}

function releaseLater() {
  if (state.idle) clearTimeout(state.idle);
  state.idle = setTimeout(() => {
    const b = state.browser;
    state.browser = null;
    b?.then((x) => x.close()).catch(() => {});
  }, 60_000);
  state.idle.unref?.();
}

/** Capture du haut de la page d'accueil (format 16/11), en JPEG ; null sans navigateur. */
export async function directionThumb(projectId: string, direction: DirectionId, lang: Lang): Promise<Buffer | null> {
  const { spec } = await runWithLang({ ui: lang, content: lang }, () => composeShop(projectId, direction, undefined, false));
  const key = `${projectId}:${direction}:${themeFingerprint(spec)}`;
  const hit = state.cache.get(key);
  if (hit) return hit;
  const run = state.queue.then(async () => {
    const again = state.cache.get(key);
    if (again) return again;
    const b = await browser();
    if (!b) return null;
    const { context, url } = await themeContext(b, spec, { width: 1280, height: 880 });
    try {
      const page = await context.newPage();
      await page.goto(url("/"), { waitUntil: "load", timeout: 45_000 });
      await page.waitForTimeout(400);
      const shot = await page.screenshot({ type: "jpeg", quality: 85 });
      const out = await sharp(shot).resize({ width: 640 }).jpeg({ quality: 78 }).toBuffer();
      state.cache.set(key, out);
      if (state.cache.size > 120) state.cache.delete(state.cache.keys().next().value!);
      return out;
    } finally {
      await context.close().catch(() => {});
      releaseLater();
    }
  });
  state.queue = run.catch(() => null);
  return run;
}
