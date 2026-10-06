/**
 * Kit réseaux sociaux d'une marque, aux couleurs et typographies de la piste de logo retenue :
 * photo de profil, couvertures de « stories à la une » (5 icônes dessinées dans un même style), 3 modèles de
 * publication (annonce, conseil, citation ou valeur), bannières Facebook et LinkedIn, et une planche d'ensemble.
 * Aucun chiffre, avis ou promesse inventés : les textes à fournir restent des « [À compléter : …] » visibles.
 */
import { createCanvas, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import sharp from "sharp";
import { mix, onColor } from "../color";
import { font } from "./fonts";
import { drawAvatar, logoImage, routeLogoSpec, routeWebSpec, type CreativeRoute } from "./brand-mockups";
import { C } from "../i18n-server";

export type HighlightTheme = "produit" | "avis" | "questions" | "coulisses" | "conseils" | "nouveautes";
export const HIGHLIGHT_LABEL: Record<HighlightTheme, [string, string]> = {
  produit: ["Produit", "Product"],
  avis: ["Avis", "Reviews"],
  questions: ["Questions", "Q&A"],
  coulisses: ["Coulisses", "Behind"],
  conseils: ["Conseils", "Tips"],
  nouveautes: ["Nouveautés", "New"],
};

export type KitInput = {
  route: CreativeRoute;
  brand: { name: string; tagline?: string };
  product?: Buffer | null;
  productName?: string;
  /** Vrais avis disponibles ? Sinon la story à la une « Avis » devient « Questions ». */
  hasReviews: boolean;
  /** Texte de la publication « citation / valeur » (valeur de la marque ou signature), déjà contrôlé. */
  quote?: string;
};

export type KitImage = { item: string; label: string; png: Buffer; width: number; height: number };

/**
 * Icônes de stories à la une, au trait, sur une grille de 100 : même épaisseur, mêmes extrémités arrondies,
 * même encombrement — elles se lisent comme une famille.
 */
export function drawHighlightIcon(ctx: SKRSContext2D, theme: HighlightTheme, x: number, y: number, s: number, color: string, weight: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 100, s / 100);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = weight >= 700 ? 8.5 : 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const dot = (cx: number, cy: number, r: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  ctx.beginPath();
  switch (theme) {
    case "produit": {
      // Boîte vue de trois quarts.
      ctx.moveTo(50, 12);
      ctx.lineTo(86, 30);
      ctx.lineTo(86, 70);
      ctx.lineTo(50, 88);
      ctx.lineTo(14, 70);
      ctx.lineTo(14, 30);
      ctx.closePath();
      ctx.moveTo(14, 30);
      ctx.lineTo(50, 48);
      ctx.lineTo(86, 30);
      ctx.moveTo(50, 48);
      ctx.lineTo(50, 88);
      ctx.stroke();
      break;
    }
    case "avis":
    case "questions": {
      // Bulle de dialogue.
      ctx.moveTo(26, 16);
      ctx.lineTo(74, 16);
      ctx.arcTo(88, 16, 88, 30, 14);
      ctx.lineTo(88, 58);
      ctx.arcTo(88, 72, 74, 72, 14);
      ctx.lineTo(46, 72);
      ctx.lineTo(28, 88);
      ctx.lineTo(30, 72);
      ctx.lineTo(26, 72);
      ctx.arcTo(12, 72, 12, 58, 14);
      ctx.lineTo(12, 30);
      ctx.arcTo(12, 16, 26, 16, 14);
      ctx.closePath();
      ctx.stroke();
      if (theme === "questions") {
        ctx.beginPath();
        ctx.arc(50, 37, 9, Math.PI * 1.05, Math.PI * 0.45);
        ctx.lineTo(50, 52);
        ctx.stroke();
        dot(50, 61, ctx.lineWidth * 0.62);
      } else {
        for (const cx of [39, 61]) {
          dot(cx, 40, 6.5);
          ctx.beginPath();
          ctx.moveTo(cx + 5, 41);
          ctx.quadraticCurveTo(cx + 5, 52, cx - 3, 55);
          ctx.lineWidth = 5;
          ctx.stroke();
        }
      }
      break;
    }
    case "coulisses": {
      // Appareil photo.
      ctx.roundRect(10, 30, 80, 54, 12);
      ctx.moveTo(34, 30);
      ctx.lineTo(39, 18);
      ctx.lineTo(61, 18);
      ctx.lineTo(66, 30);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(50, 57, 15, 0, Math.PI * 2);
      ctx.stroke();
      dot(76, 42, 4.5);
      break;
    }
    case "conseils": {
      // Ampoule : globe, culot, filament.
      ctx.arc(50, 40, 25, Math.PI * 0.78, Math.PI * 2.22);
      ctx.lineTo(62, 70);
      ctx.lineTo(38, 70);
      ctx.closePath();
      ctx.moveTo(40, 82);
      ctx.lineTo(60, 82);
      ctx.moveTo(44, 92);
      ctx.lineTo(56, 92);
      ctx.stroke();
      break;
    }
    case "nouveautes": {
      // Éclat à quatre branches et petit éclat compagnon.
      const star = (cx: number, cy: number, r: number) => {
        ctx.moveTo(cx, cy - r);
        ctx.quadraticCurveTo(cx + r * 0.16, cy - r * 0.16, cx + r, cy);
        ctx.quadraticCurveTo(cx + r * 0.16, cy + r * 0.16, cx, cy + r);
        ctx.quadraticCurveTo(cx - r * 0.16, cy + r * 0.16, cx - r, cy);
        ctx.quadraticCurveTo(cx - r * 0.16, cy - r * 0.16, cx, cy - r);
        ctx.closePath();
      };
      star(44, 54, 34);
      ctx.stroke();
      ctx.beginPath();
      star(80, 18, 12);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function contain(ctx: SKRSContext2D, img: Image | null, x: number, y: number, w: number, h: number) {
  if (!img) return;
  const s = Math.min(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function wrapLines(ctx: SKRSContext2D, text: string, maxW: number, max: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      out.push(line);
      line = w;
    } else line = t;
  }
  if (line) out.push(line);
  if (out.length > max) {
    const kept = out.slice(0, max);
    kept[max - 1] = `${kept[max - 1].replace(/[\s,;:.]+$/, "")}…`;
    return kept;
  }
  return out;
}

/** Texte fluide : la taille baisse jusqu'à tenir dans `max` lignes. */
function fitText(ctx: SKRSContext2D, text: string, family: string, weight: number, start: number, min: number, maxW: number, max: number) {
  let size = start;
  for (; size > min; size -= 4) {
    ctx.font = font(family, weight, size);
    if (wrapLines(ctx, text, maxW, 99).length <= max) break;
  }
  ctx.font = font(family, weight, size);
  return { size, lines: wrapLines(ctx, text, maxW, max) };
}

export function highlightThemes(hasReviews: boolean): HighlightTheme[] {
  return ["produit", hasReviews ? "avis" : "questions", "coulisses", "conseils", "nouveautes"];
}

/** Toutes les images du kit. */
export async function renderSocialKit(inp: KitInput): Promise<KitImage[]> {
  const r = inp.route;
  const col = r.colors;
  const on = onColor(col.ground);
  const out: KitImage[] = [];
  const push = async (item: string, label: string, w: number, h: number, draw: (ctx: SKRSContext2D) => Promise<void> | void) => {
    const c = createCanvas(w, h);
    const ctx = c.getContext("2d");
    await draw(ctx);
    out.push({ item, label, png: await c.encode("png"), width: w, height: h });
  };
  const product = inp.product ? await loadImage(await sharp(inp.product).resize(1000, 1000, { fit: "inside" }).png().toBuffer()) : null;
  const logoMain = await logoImage(routeLogoSpec(r, inp.brand), 1400);
  const logoWeb = await logoImage(routeWebSpec(r, inp.brand), 1400);
  const logoWebWhite = await logoImage(routeWebSpec(r, inp.brand, { color: on, accent: on }), 1400);

  // Photo de profil : la marque dans le cercle utile (Instagram, TikTok, Facebook recadrent en rond).
  await push("profil", C("Photo de profil", "Profile picture"), 1080, 1080, (ctx) => drawAvatar(ctx, r, 540, 540, 540, inp.brand.name));

  // Stories à la une : icône au centre (zone ronde visible), fond de la couleur de la piste.
  for (const theme of highlightThemes(inp.hasReviews)) {
    const [fr, en] = HIGHLIGHT_LABEL[theme];
    await push(`une-${theme}`, C(`Story à la une : ${fr}`, `Highlight: ${en}`), 1080, 1920, (ctx) => {
      ctx.fillStyle = col.ground;
      ctx.fillRect(0, 0, 1080, 1920);
      drawHighlightIcon(ctx, theme, 540 - 210, 960 - 210, 420, on, r.headingWeight);
    });
  }

  // Modèle « annonce » : produit, nom, appel à l'action.
  const headline = inp.productName?.trim() || inp.brand.tagline || inp.brand.name;
  await push("post-annonce", C("Publication : annonce", "Post: announcement"), 1080, 1350, (ctx) => {
    ctx.fillStyle = col.tint;
    ctx.fillRect(0, 0, 1080, 1350);
    contain(ctx, logoWeb, 300, 70, 480, 90);
    if (product) contain(ctx, product, 190, 210, 700, 640);
    else {
      ctx.fillStyle = mix(col.tint, col.ink, 0.08);
      ctx.beginPath();
      ctx.roundRect(190, 230, 700, 600, 40);
      ctx.fill();
    }
    ctx.fillStyle = col.ink;
    ctx.textAlign = "center";
    const t = fitText(ctx, headline, r.heading, r.headingWeight, 76, 44, 880, 2);
    t.lines.forEach((l, i) => ctx.fillText(l, 540, 960 + i * t.size * 1.12));
    ctx.fillStyle = col.ground;
    ctx.beginPath();
    ctx.roundRect(390, 1150, 300, 84, 42);
    ctx.fill();
    ctx.fillStyle = on;
    ctx.font = font(r.body, 600, 30);
    ctx.fillText(C("Découvrir", "Discover"), 540, 1203);
  });

  // Modèle « conseil » : numéro, conseil à écrire (jamais inventé).
  await push("post-conseil", C("Publication : conseil", "Post: tip"), 1080, 1350, (ctx) => {
    ctx.fillStyle = col.ground;
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = on;
    ctx.textAlign = "left";
    ctx.font = font(r.body, 600, 30);
    (ctx as any).letterSpacing = "6px";
    ctx.fillText(C("LE CONSEIL", "THE TIP").toLocaleUpperCase("fr-FR"), 100, 160);
    (ctx as any).letterSpacing = "0px";
    ctx.font = font(r.heading, r.headingWeight, 260);
    ctx.fillText("01", 90, 450);
    const t = fitText(ctx, C("[À compléter : votre conseil, en une phrase concrète]", "[To complete: your tip, in one practical sentence]"), r.heading, r.headingWeight, 64, 40, 880, 4);
    t.lines.forEach((l, i) => ctx.fillText(l, 100, 620 + i * t.size * 1.2));
    drawHighlightIcon(ctx, "conseils", 100, 1100, 120, on, r.headingWeight);
    contain(ctx, logoWebWhite, 560, 1130, 420, 80);
  });

  // Modèle « citation / valeur ».
  const quote = (inp.quote || inp.brand.tagline || inp.brand.name).trim();
  await push("post-citation", C("Publication : citation ou valeur", "Post: quote or value"), 1080, 1350, (ctx) => {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = col.accent;
    ctx.font = font("Playfair Display", 700, 300);
    ctx.textAlign = "left";
    ctx.fillText("“", 80, 400);
    ctx.fillStyle = col.ink;
    const t = fitText(ctx, quote, r.heading, r.headingWeight, 112, 44, 880, 5);
    // Bloc de texte centré dans l'espace entre les guillemets et la signature.
    const top = 470 + Math.max(0, (600 - t.lines.length * t.size * 1.18) / 2) + t.size * 0.8;
    t.lines.forEach((l, i) => ctx.fillText(l, 100, top + i * t.size * 1.18));
    ctx.fillStyle = col.ground;
    ctx.fillRect(100, 1120, 120, 8);
    contain(ctx, logoWeb, 100, 1160, 420, 90);
  });

  // Bannière Facebook (1640 × 624) : l'essentiel dans la zone centrale visible sur téléphone.
  await push("banniere-facebook", C("Bannière Facebook", "Facebook cover"), 1640, 624, (ctx) => {
    ctx.fillStyle = col.tint;
    ctx.fillRect(0, 0, 1640, 624);
    ctx.fillStyle = col.ground;
    ctx.fillRect(1040, 0, 600, 624);
    if (product) contain(ctx, product, 980, 70, 520, 484);
    contain(ctx, logoMain.width / logoMain.height > 2.2 ? logoMain : logoWeb, 260, 170, 640, 200);
    if (inp.brand.tagline) {
      ctx.fillStyle = col.ink;
      ctx.textAlign = "center";
      ctx.font = font(r.body, 500, 34);
      ctx.fillText(inp.brand.tagline, 580, 440);
    }
  });

  // Bannière LinkedIn (1128 × 191) : la photo de profil masque la gauche ; contenu à droite.
  await push("banniere-linkedin", C("Bannière LinkedIn", "LinkedIn banner"), 1128, 191, (ctx) => {
    ctx.fillStyle = col.ground;
    ctx.fillRect(0, 0, 1128, 191);
    contain(ctx, logoWebWhite, 560, 50, 480, 90);
  });
  return out;
}

/** Planche d'ensemble du kit (aperçu, charte de marque). */
export async function socialKitSheet(images: KitImage[], route: CreativeRoute, hasReviews: boolean): Promise<Buffer> {
  const W = 1600, H = 790;
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#F4F2EE";
  ctx.fillRect(0, 0, W, H);
  const get = async (item: string) => {
    const k = images.find((x) => x.item === item);
    return k ? loadImage(k.png) : null;
  };
  const label = (s: string, x: number, y: number, align: CanvasTextAlign = "left") => {
    ctx.font = font("Inter", 600, 17);
    ctx.fillStyle = "#6E6A64";
    ctx.textAlign = align;
    ctx.fillText(s, x, y);
  };
  // Profil + stories à la une en cercles.
  const prof = await get("profil");
  if (prof) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(130, 130, 90, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(prof, 40, 40, 180, 180);
    ctx.restore();
  }
  label(C("Photo de profil", "Profile picture"), 130, 260, "center");
  highlightThemes(hasReviews).forEach((t, i) => {
    const cx = 330 + i * 150, cy = 130;
    ctx.fillStyle = route.colors.ground;
    ctx.beginPath();
    ctx.arc(cx, cy, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#D9D5CE";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 66, 0, Math.PI * 2);
    ctx.stroke();
    drawHighlightIcon(ctx, t, cx - 32, cy - 32, 64, onColor(route.colors.ground), route.headingWeight);
    const [fr, en] = HIGHLIGHT_LABEL[t];
    label(C(fr, en), cx, 230, "center");
  });
  label(C("Stories à la une", "Highlights"), 330 - 58, 268);
  // Publications.
  for (const [i, item] of ["post-annonce", "post-conseil", "post-citation"].entries()) {
    const img = await get(item);
    const x = 40 + i * 290, y = 310, w = 270, h = 337;
    if (img) ctx.drawImage(img, x, y, w, h);
    label(images.find((k) => k.item === item)?.label ?? "", x, y + h + 28);
  }
  // Bannières.
  const fb = await get("banniere-facebook");
  if (fb) ctx.drawImage(fb, 920, 310, 640, 244);
  label(C("Bannière Facebook", "Facebook cover"), 920, 582);
  const li = await get("banniere-linkedin");
  if (li) ctx.drawImage(li, 920, 620, 640, 108);
  label(C("Bannière LinkedIn", "LinkedIn banner"), 920, 756);
  return c.encode("png");
}
