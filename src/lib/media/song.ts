/**
 * Compositeur du studio : de VRAIS morceaux joués par de vrais instruments enregistrés (banque GeneralUser GS,
 * libre pour toute création, commerciale comprise ; moteur SpessaSynth, licence Apache-2.0), dans un style choisi
 * pour le produit ou le métier :
 *  - acoustique entraînant (artisans, bâtiment, maison, jardin) ; bistrot (restaurant, boulangerie, café) ;
 *  - lounge élégant (cosmétique, beauté, mode raffinée) ; calme (bien-être, santé) ; cinématique (luxe) ;
 *  - inspirant (entreprise, conseil, logiciel) ; pop énergique (sport, high-tech, enfants, alimentation rapide).
 * Chaque projet a sa variante (tonalité, mélodie) ; le morceau a une introduction, se développe et se TERMINE sur
 * l'accord de la tonalité exactement à la fin de la vidéo (tempo ajusté de quelques pourcents). Aucun appel payant,
 * aucun droit tiers à déclarer. Déterministe (même projet, même style, même durée → même fichier).
 */
import fs from "node:fs";
import path from "node:path";

export const SONG_STYLES = ["acoustic", "bistro", "lounge", "calm", "cinematic", "corporate", "pop"] as const;
export type SongStyle = (typeof SONG_STYLES)[number];

export const SONG_STYLE_LABELS: Record<SongStyle, { fr: string; en: string }> = {
  acoustic: { fr: "acoustique entraînant", en: "upbeat acoustic" },
  bistro: { fr: "bistrot", en: "bistro" },
  lounge: { fr: "lounge élégant", en: "elegant lounge" },
  calm: { fr: "calme", en: "calm" },
  cinematic: { fr: "cinématique", en: "cinematic" },
  corporate: { fr: "inspirant", en: "inspiring" },
  pop: { fr: "pop énergique", en: "energetic pop" },
};

type Ev = { t: number; on: boolean; ch: number; n: number; v: number };
type Chord = { root: number; notes: number[] };

/** Accords de do majeur par degré (voicings serrés autour du do central ; 7e et 9e pour les styles jazzy). */
const DEG: Record<string, Chord> = {
  I: { root: 36, notes: [60, 64, 67] },
  Imaj7: { root: 36, notes: [59, 64, 67, 71] },
  ii: { root: 38, notes: [62, 65, 69] },
  ii7: { root: 38, notes: [60, 62, 65, 69] },
  iii: { root: 40, notes: [59, 64, 67] },
  IV: { root: 41, notes: [60, 65, 69] },
  IVmaj7: { root: 41, notes: [60, 64, 65, 69] },
  V: { root: 43, notes: [59, 62, 67] },
  V7: { root: 43, notes: [59, 62, 65, 67] },
  vi: { root: 45, notes: [60, 64, 69] },
  vi7: { root: 45, notes: [60, 64, 67, 69] },
};

type Inst = { ch: number; program: number; vol: number; pan: number; reverb: number; chorus?: number };
type StyleSpec = {
  bpm: number;
  progression: string[];
  swing?: number;
  inst: Record<"keys" | "comp" | "bass" | "lead" | "pad", Inst | null>;
  drums: "none" | "light" | "pop" | "brush" | "four";
  /** Motif rythmique de la mélodie (temps dans la mesure, durée en temps). */
  motif: [number, number][];
  /** Accompagnement : temps où l'accord est joué (piano, guitare) et leur durée. */
  comp: "strum" | "arp8" | "arp16" | "stabs" | "waltz" | "pads" | "offbeat";
};

const STYLES: Record<SongStyle, StyleSpec> = {
  acoustic: {
    bpm: 104,
    progression: ["I", "vi", "IV", "V"],
    inst: { keys: null, comp: { ch: 1, program: 25, vol: 92, pan: 40, reverb: 40 }, bass: { ch: 2, program: 32, vol: 98, pan: 64, reverb: 10 }, lead: { ch: 3, program: 9, vol: 72, pan: 84, reverb: 60 }, pad: { ch: 4, program: 0, vol: 62, pan: 74, reverb: 50 } },
    drums: "light",
    motif: [[0, 0.5], [0.5, 0.5], [1, 1], [2.5, 0.5], [3, 1]],
    comp: "strum",
  },
  bistro: {
    bpm: 112,
    progression: ["I", "vi7", "ii7", "V7"],
    swing: 0.16,
    inst: { keys: null, comp: { ch: 1, program: 24, vol: 88, pan: 44, reverb: 35 }, bass: { ch: 2, program: 32, vol: 100, pan: 64, reverb: 15 }, lead: { ch: 3, program: 21, vol: 84, pan: 80, reverb: 45 }, pad: null },
    drums: "brush",
    motif: [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1.5], [3.5, 0.5]],
    comp: "offbeat",
  },
  lounge: {
    bpm: 86,
    progression: ["Imaj7", "vi7", "ii7", "V7"],
    swing: 0.1,
    inst: { keys: { ch: 0, program: 4, vol: 88, pan: 56, reverb: 60, chorus: 40 }, comp: null, bass: { ch: 2, program: 33, vol: 100, pan: 64, reverb: 15 }, lead: { ch: 3, program: 11, vol: 70, pan: 80, reverb: 70 }, pad: { ch: 4, program: 89, vol: 46, pan: 64, reverb: 80 } },
    drums: "light",
    motif: [[0.5, 1], [2, 0.5], [2.5, 1.5]],
    comp: "stabs",
  },
  calm: {
    bpm: 76,
    progression: ["Imaj7", "IVmaj7", "vi7", "IVmaj7"],
    inst: { keys: { ch: 0, program: 0, vol: 90, pan: 60, reverb: 80 }, comp: { ch: 1, program: 46, vol: 70, pan: 84, reverb: 80 }, bass: { ch: 2, program: 32, vol: 78, pan: 64, reverb: 30 }, lead: null, pad: { ch: 4, program: 89, vol: 58, pan: 64, reverb: 90 } },
    drums: "none",
    motif: [],
    comp: "arp8",
  },
  cinematic: {
    bpm: 72,
    progression: ["vi", "IV", "I", "V"],
    inst: { keys: { ch: 0, program: 0, vol: 92, pan: 58, reverb: 85 }, comp: null, bass: { ch: 2, program: 48, vol: 80, pan: 64, reverb: 70 }, lead: { ch: 3, program: 49, vol: 76, pan: 70, reverb: 90 }, pad: { ch: 4, program: 48, vol: 66, pan: 56, reverb: 90 } },
    drums: "none",
    motif: [[0, 2], [2, 1], [3, 1]],
    comp: "arp8",
  },
  corporate: {
    bpm: 112,
    progression: ["vi", "IV", "I", "V"],
    inst: { keys: { ch: 0, program: 0, vol: 92, pan: 56, reverb: 55 }, comp: { ch: 1, program: 27, vol: 62, pan: 88, reverb: 40, chorus: 30 }, bass: { ch: 2, program: 33, vol: 100, pan: 64, reverb: 10 }, lead: null, pad: { ch: 4, program: 48, vol: 64, pan: 64, reverb: 75 } },
    drums: "four",
    motif: [],
    comp: "arp16",
  },
  pop: {
    bpm: 120,
    progression: ["I", "V", "vi", "IV"],
    inst: { keys: { ch: 0, program: 0, vol: 86, pan: 54, reverb: 40 }, comp: { ch: 1, program: 27, vol: 70, pan: 90, reverb: 30, chorus: 40 }, bass: { ch: 2, program: 38, vol: 96, pan: 64, reverb: 5 }, lead: { ch: 3, program: 80, vol: 58, pan: 70, reverb: 50, chorus: 30 }, pad: null },
    drums: "pop",
    motif: [[0, 0.5], [0.75, 0.25], [1, 0.5], [1.5, 1], [3, 0.5], [3.5, 0.5]],
    comp: "stabs",
  },
};

/** Style de musique d'un produit ou d'un métier (secteur, catégorie, personnalité de la marque). */
export function songStyleFor(p: { business?: string; product?: { category?: string | null; sector?: string | null; name?: string | null; summary?: string | null }; brand?: { personality?: string[] } | null }): SongStyle {
  const t = `${p.product?.category ?? ""} ${p.product?.sector ?? ""} ${p.product?.name ?? ""} ${p.product?.summary ?? ""}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const persona = (p.brand?.personality ?? []).join(" ").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/luxe|joaill|bijou|haute couture|montre|parfum/.test(t) || /luxe|prestig/.test(persona)) return "cinematic";
  if (/restaura|bistro|brasserie|boulang|patiss|cafe|traiteur|epicerie|fromag|vin|cave|cuisine|chocolat|creperie/.test(t)) return "bistro";
  if (/cosmet|serum|creme|soin|beaute|esthet|maquill|parfum|skincare|spa|coiff|barbi|onglerie/.test(t)) return /premium|raffin|elegan|epur|luxe/.test(persona) || /cosmet|serum|soin|beaute/.test(t) ? "lounge" : "lounge";
  if (/massage|yoga|bien[- ]etre|therap|osteo|kine|sophro|medit|sante|infirm|psycho|naturo/.test(t)) return "calm";
  if (/sport|fitness|coach|gym|velo|running|jouet|enfant|bebe|gaming|jeu|high[- ]?tech|electron|casque|drone|gadget|smartphone/.test(t)) return "pop";
  if (/logiciel|saas|conseil|consult|agence|comptab|avocat|notaire|assurance|immobil|banque|formation|informati|marketing|digital|data/.test(t)) return "corporate";
  if (/peint|platr|macon|plomb|electri|menuis|charpent|couvr|carrel|jardin|paysag|renov|batiment|artisan|serrur|nettoy|demenag|bricol|deco|maison|meuble|bois|ceram/.test(t)) return "acoustic";
  return p.business === "services" ? "acoustic" : "pop";
}

/** Générateur pseudo-aléatoire à graine (variante propre à chaque projet, reproductible). */
function rng(seed: string) {
  let h = 2166136261 >>> 0;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SCALE = [0, 2, 4, 5, 7, 9, 11];
const inScale = (n: number) => SCALE.includes(((n % 12) + 12) % 12);

/**
 * Grille du morceau pour une durée : nombre de mesures entier et tempo ajusté (dernier accord tenu ~1,2 s). Le
 * montage cale ses coupes sur cette grille (chaque changement de plan tombe sur un temps).
 */
export function songGrid(style: SongStyle, duration: number): { bars: number; bpm: number; beatS: number } {
  const bars = Math.max(2, Math.round((duration - 1.2) / ((60 / STYLES[style].bpm) * 4)));
  const bpm = (bars * 4 * 60) / Math.max(1, duration - 1.2);
  return { bars, bpm, beatS: 60 / bpm };
}

/** Écrit la partition (événements de notes) pour la durée voulue. */
export function arrange(style: SongStyle, duration: number, seed: string): { events: Ev[]; inst: Inst[]; bpm: number; total: number } {
  const S = STYLES[style];
  const rand = rng(`${style}:${seed}`);
  // Tonalité propre au projet (transposition modérée : les instruments restent dans leur bonne tessiture).
  const key = [0, 2, -3, 5, -1, 3][Math.floor(rand() * 6)];
  // Nombre de mesures entier, dernier accord tenu ~1,2 s avant la fin : tempo ajusté de quelques pourcents.
  const { bars, bpm } = songGrid(style, duration);
  const beat = 60 / bpm;
  const bar = beat * 4;
  const ev: Ev[] = [];
  const add = (ch: number, t: number, n: number, len: number, v: number) => {
    if (t >= duration - 0.05) return;
    const m = Math.max(0, Math.min(127, Math.round(n)));
    ev.push({ t, on: true, ch, n: m, v: Math.max(1, Math.min(127, Math.round(v))) });
    ev.push({ t: Math.min(duration, t + Math.max(0.05, len)), on: false, ch, n: m, v: 0 });
  };
  const sw = (pos: number) => (S.swing && Math.abs((pos * 2) % 2 - 1) < 1e-6 ? S.swing * beat : 0); // croches « swing »
  const hum = () => (rand() - 0.5) * 0.012; // léger jeu humain
  // Mélodie : un motif propre au projet, répété avec variation (A A' B A).
  const motifPitches = S.motif.map(() => Math.floor(rand() * 4));
  const I = S.inst;
  for (let b = 0; b < bars + 1; b++) {
    const t0 = b * bar;
    if (t0 >= duration) break;
    const last = b >= bars;
    const name = last ? (style === "lounge" || style === "calm" ? "Imaj7" : "I") : S.progression[b % S.progression.length];
    const nextRoot = (DEG[b + 1 >= bars ? "I" : S.progression[(b + 1) % S.progression.length]] ?? DEG.I).root + key;
    const c = DEG[name] ?? DEG.I;
    const notes = c.notes.map((n) => n + key);
    const root = c.root + key;
    const intro = b === 0;
    // Structure : intro, couplet (A) et refrain (B) de 4 mesures en alternance ; morceau long (12 mesures et plus) :
    // une mesure de pause (sans batterie ni basse) avant la reprise finale.
    const chorus = !intro && Math.floor((b - 1) / 4) % 2 === 1;
    const breakdown = bars >= 12 && b === bars - 5;
    const sectionStart = !intro && (b - 1) % 4 === 0;
    const vel = intro ? 0.82 : 1;
    if (last) {
      // Fin : accord de la tonalité tenu jusqu'à la fin, cymbale douce.
      const hold = duration - t0;
      if (I.keys) for (const n of notes) add(I.keys.ch, t0, n, hold, 74);
      if (I.comp) for (const [k, n] of notes.entries()) add(I.comp.ch, t0 + k * 0.03, n, hold, 70);
      if (I.pad) for (const n of notes) add(I.pad.ch, t0, n - 12, hold, 60);
      if (I.bass) add(I.bass.ch, t0, root, hold, 90);
      if (S.drums !== "none") add(9, t0, 49, 2, 70);
      continue;
    }
    // Nappe : tout du long, discrète.
    if (I.pad) for (const n of notes) add(I.pad.ch, t0, n - (style === "cinematic" ? 0 : 12), bar, 52 * vel);
    // Clavier (piano, piano électrique).
    if (I.keys) {
      if (S.comp === "arp8" || S.comp === "arp16") {
        const step = S.comp === "arp16" ? 0.25 : 0.5;
        const order = [0, 1, 2, notes.length > 3 ? 3 : 1, 2, 1];
        for (let k = 0; k < 4 / step; k++) add(I.keys.ch, t0 + k * step * beat + hum(), notes[order[k % order.length]] + (k % 4 === 3 ? 12 : 0), step * beat * 1.8, (k % 2 ? 58 : 72) * vel);
        add(I.keys.ch, t0, root + 12, bar, 62 * vel);
      } else if (S.comp === "stabs") {
        for (const [pos, len] of [[0, 1.4], [1.5, 0.45], [2.5, 0.9], [3.5, 0.4]] as const) for (const n of notes) add(I.keys.ch, t0 + pos * beat + sw(pos) + hum(), n, len * beat, (pos === 0 ? 76 : 62) * vel);
      } else for (const n of notes) add(I.keys.ch, t0, n, bar, 66 * vel);
    }
    // Accompagnement (guitare, harpe).
    if (I.comp) {
      if (S.comp === "strum") {
        // Gratté folk : bas, bas-haut, haut-bas-haut (le grand classique).
        for (const [pos, down] of [[0, true], [1, true], [1.5, false], [2.5, false], [3, true], [3.5, false]] as const) {
          const ord = down ? notes : [...notes].reverse();
          ord.forEach((n, k) => add(I.comp!.ch, t0 + pos * beat + k * 0.012 + hum(), n - 12 + (k === ord.length - 1 ? 12 : 0), 0.9 * beat, (pos === 0 ? 92 : down ? 76 : 62) * vel));
        }
      } else if (S.comp === "offbeat") {
        // Pompe manouche : temps 2 et 4 appuyés, 1 et 3 plus légers.
        for (let k = 0; k < 4; k++) for (const n of notes) add(I.comp.ch, t0 + k * beat + hum(), n - 12, 0.32 * beat, (k % 2 ? 84 : 58) * vel);
      } else if (S.comp === "arp8" || S.comp === "arp16") {
        for (let k = 0; k < 8; k++) add(I.comp.ch, t0 + (k + 0.5) * beat * 0.5 + hum(), notes[(k * 2) % notes.length] + 12, beat, 50 * vel);
      } else for (const [pos] of [[0.5], [1.5], [2.5], [3.5]] as const) for (const n of notes) add(I.comp.ch, t0 + pos * beat + hum(), n, 0.3 * beat, 54 * vel);
    }
    // Basse.
    if (I.bass && !breakdown) {
      if (style === "bistro") for (let k = 0; k < 4; k++) add(I.bass.ch, t0 + k * beat, [root, root + 7, root + 12, root + 7][k], 0.9 * beat, 92 * vel); // walking
      else if (style === "calm" || style === "cinematic") add(I.bass.ch, t0, root + (style === "cinematic" ? 12 : 0), bar, 80 * vel);
      else if (style === "pop" || style === "corporate") for (let k = 0; k < 8; k++) add(I.bass.ch, t0 + k * beat * 0.5, root + (k === 7 ? 7 : 0), 0.42 * beat, (k % 2 ? 76 : 96) * vel);
      else {
        add(I.bass.ch, t0, root, 1.4 * beat, 98 * vel);
        add(I.bass.ch, t0 + 2 * beat, root + 7, 0.9 * beat, 86 * vel);
        add(I.bass.ch, t0 + 3 * beat, root + 12, 0.45 * beat, 78 * vel);
        // Note de passage vers l'accord suivant (un ton sous sa fondamentale, dans la gamme).
        const approach = inScale(nextRoot - 2 - key) ? nextRoot - 2 : nextRoot - 1;
        add(I.bass.ch, t0 + 3.5 * beat, approach + (approach < root ? 12 : 0), 0.45 * beat, 74 * vel);
      }
    }
    // Mélodie (à partir de la 2e mesure ; phrase B sur la 3e de chaque groupe de 4).
    if (I.lead && !intro && S.motif.length) {
      const phrase = b % 4 === 2 ? 2 : 0;
      S.motif.forEach(([pos, len], k) => {
        const pick = (motifPitches[k] + phrase + (b % 2 && k === S.motif.length - 1 ? 1 : 0)) % notes.length;
        const t = t0 + pos * beat + sw(pos) + hum();
        add(I.lead!.ch, t, notes[pick] + 12, len * beat * 0.95, (chorus ? 90 : 80) - k * 3);
        // Refrain : mélodie doublée à l'octave (plus d'éclat).
        if (chorus) add(I.lead!.ch, t + 0.004, notes[pick] + 24, len * beat * 0.9, 56 - k * 2);
      });
    }
    // Batterie (canal 10) : entrée à la 2e mesure, légère et sans agressivité.
    if (S.drums !== "none" && !intro && !breakdown) {
      const D = (pos: number, n: number, v: number) => add(9, t0 + pos * beat + sw(pos) + hum() * 0.5, n, 0.2, v);
      if (S.drums === "four") {
        for (let k = 0; k < 4; k++) D(k, 36, 92);
        D(1, 39, 70);
        D(3, 39, 70);
        for (let k = 0; k < 8; k++) D(k * 0.5 + 0.5, 42, k % 2 ? 46 : 58);
      } else if (S.drums === "pop") {
        D(0, 36, 100);
        D(1.75, 36, 70);
        D(2, 36, 96);
        D(1, 38, 88);
        D(3, 38, 88);
        D(3, 39, 60);
        for (let k = 0; k < 8; k++) D(k * 0.5, 42, k % 2 ? 50 : 66);
        if (b % 4 === 3) D(3.5, 46, 70);
      } else if (S.drums === "brush") {
        for (let k = 0; k < 4; k++) D(k, k % 2 ? 37 : 36, k % 2 ? 54 : 64);
        for (let k = 0; k < 8; k++) D(k * 0.5, 51, k % 2 ? 36 : 50);
      } else {
        D(0, 36, 86);
        D(2, 36, 78);
        D(2.5, 36, 50);
        D(1, 37, 64);
        D(3, 39, 66);
        for (let k = 0; k < 8; k++) D(k * 0.5, k % 2 ? 42 : 54, k % 2 ? 40 : 50);
      }
      // Cymbale à chaque nouvelle partie ; refrain : tambourin léger en croches.
      if (sectionStart || b === bars - 4) D(0, 49, b === 1 ? 66 : 74);
      if (chorus && S.drums !== "brush") for (let k = 0; k < 8; k++) D(k * 0.5 + 0.25, 54, k % 2 ? 34 : 44);
    }
  }
  const inst = Object.values(I).filter((x): x is Inst => !!x);
  return { events: ev.sort((a, b) => a.t - b.t || Number(a.on) - Number(b.on)), inst, bpm, total: duration };
}

let bankCache: ArrayBuffer | null = null;
function soundBank(): ArrayBuffer | null {
  if (bankCache) return bankCache;
  const f = path.join(process.cwd(), "node_modules", "generaluser", "GeneralUser.sf2");
  if (!fs.existsSync(f)) return null;
  const b = fs.readFileSync(f);
  bankCache = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  return bankCache;
}

/** La banque d'instruments est-elle installée (sinon : musique de secours du studio) ? */
export const songAvailable = () => !!soundBank();

/**
 * Joue la partition avec les vrais instruments et renvoie un WAV 16 bits stéréo de la durée exacte voulue.
 * Null si la banque d'instruments n'est pas installée.
 */
export async function renderSong(style: SongStyle, duration: number, seed: string, sampleRate = 44100): Promise<Buffer | null> {
  const bank = soundBank();
  if (!bank) return null;
  const { SpessaSynthProcessor, SoundBankLoader } = await import("spessasynth_core");
  const synth = new SpessaSynthProcessor(sampleRate, { maxBufferSize: 128 });
  synth.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(bank), "generaluser");
  await synth.processorInitialized;
  const { events, inst } = arrange(style, duration, seed);
  for (const i of inst) {
    synth.programChange(i.ch, i.program);
    synth.controllerChange(i.ch, 7, i.vol);
    synth.controllerChange(i.ch, 10, i.pan);
    synth.controllerChange(i.ch, 91, i.reverb);
    synth.controllerChange(i.ch, 93, i.chorus ?? 0);
  }
  synth.controllerChange(9, 7, 92);
  synth.controllerChange(9, 91, 30);
  const n = Math.max(1, Math.ceil(duration * sampleRate));
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  let k = 0;
  for (let i = 0; i < n; i += 128) {
    while (k < events.length && events[k].t * sampleRate <= i) {
      const e = events[k++];
      if (e.on) synth.noteOn(e.ch, e.n, e.v);
      else synth.noteOff(e.ch, e.n);
    }
    synth.process(L, R, i, Math.min(128, n - i));
  }
  synth.destroySynthProcessor();
  // Mixage final : niveau homogène, crêtes adoucies, entrée et sortie en fondu (aucun clic).
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = peak > 0 ? 0.92 / peak : 1;
  const data = Buffer.alloc(44 + n * 4);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + n * 4, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(sampleRate, 24);
  data.writeUInt32LE(sampleRate * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const fade = Math.max(0, Math.min(1, t / 0.05, (duration - t) / 0.9));
    const l = Math.tanh(L[i] * g * 1.1) * 0.9 * fade;
    const r = Math.tanh(R[i] * g * 1.1) * 0.9 * fade;
    data.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(r * 32767), 46 + i * 4);
  }
  return data;
}
