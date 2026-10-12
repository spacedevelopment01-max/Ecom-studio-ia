/**
 * Musique composée par le studio (aucun droit tiers, aucun appel payant) : un vrai petit morceau, pas une nappe.
 * Progression majeure lumineuse, piano électrique doux, basse ronde, arpège léger et batterie discrète (humeur
 * « pulse ») ou piano et nappe seuls (humeur « calm »), réverbération, entrée et sortie en fondu. Aucun souffle ni
 * bruit blanc aux coupes : les changements de plan se font en musique, pas avec un effet qui surprend.
 * Déterministe (même durée, même humeur → même fichier).
 */

const SR_DEFAULT = 44100;

type Mood = "calm" | "pulse";

/** Fréquence d'une note MIDI (69 = la 440). */
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Générateur pseudo-aléatoire à graine (bruit des percussions reproductible). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Filtre biquadratique (RBJ) appliqué sur place. */
function biquad(x: Float32Array, type: "lowpass" | "highpass" | "bandpass", f: number, q: number, sr: number) {
  const w = (2 * Math.PI * f) / sr;
  const a = Math.sin(w) / (2 * q);
  const c = Math.cos(w);
  let b0: number, b1: number, b2: number;
  if (type === "lowpass") [b0, b1, b2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
  else if (type === "highpass") [b0, b1, b2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
  else [b0, b1, b2] = [a, 0, -a];
  const a0 = 1 + a;
  const a1 = -2 * c;
  const a2 = 1 - a;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
  return x;
}

/** Sons de percussion précalculés (une fois par morceau). */
function drumKit(sr: number) {
  const r = rng(7);
  const kick = new Float32Array(Math.round(sr * 0.45));
  let ph = 0;
  for (let i = 0; i < kick.length; i++) {
    const t = i / sr;
    ph += (2 * Math.PI * (48 + 95 * Math.exp(-t * 28))) / sr;
    kick[i] = Math.tanh(1.6 * Math.sin(ph)) * Math.exp(-t * 7.5) * 0.9 + (t < 0.004 ? (r() * 2 - 1) * 0.15 : 0);
  }
  const snare = new Float32Array(Math.round(sr * 0.3));
  for (let i = 0; i < snare.length; i++) snare[i] = (r() * 2 - 1) * Math.exp((-i / sr) * 22);
  biquad(snare, "bandpass", 1800, 0.7, sr);
  for (let i = 0; i < snare.length; i++) {
    const t = i / sr;
    snare[i] = snare[i] * 1.6 + Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 30) * 0.25;
  }
  const hat = new Float32Array(Math.round(sr * 0.08));
  for (let i = 0; i < hat.length; i++) hat[i] = (r() * 2 - 1) * Math.exp((-i / sr) * 70);
  biquad(hat, "highpass", 7000, 0.7, sr);
  return { kick, snare, hat };
}

/** Réverbération légère (Schroeder : peignes en parallèle puis passe-tout), stéréo par écart des retards. */
function reverb(x: Float32Array, sr: number, offset: number): Float32Array {
  const out = new Float32Array(x.length);
  const combs = [1557, 1617, 1491, 1422].map((d) => Math.round(((d + offset) * sr) / 44100));
  for (const d of combs) {
    const buf = new Float32Array(d);
    let k = 0;
    let lp = 0;
    for (let i = 0; i < x.length; i++) {
      const y = buf[k];
      lp = y * 0.65 + lp * 0.35;
      buf[k] = x[i] + lp * 0.8;
      out[i] += y * 0.25;
      k = (k + 1) % d;
    }
  }
  for (const d of [225, 556].map((v) => Math.round(((v + offset) * sr) / 44100))) {
    const buf = new Float32Array(d);
    let k = 0;
    for (let i = 0; i < out.length; i++) {
      const b = buf[k];
      const y = -out[i] + b;
      buf[k] = out[i] + b * 0.5;
      out[i] = y;
      k = (k + 1) % d;
    }
  }
  return out;
}

/** Ajoute une note de piano électrique (timbre doux, attaque nette, extinction naturelle). */
function epiano(L: Float32Array, R: Float32Array, send: Float32Array, sr: number, at: number, midi: number, len: number, vel: number, pan: number) {
  const f = hz(midi);
  const start = Math.round(at * sr);
  const n = Math.min(L.length - start, Math.round((len + 0.6) * sr));
  const gl = vel * (1 - pan) * 0.5;
  const gr = vel * (1 + pan) * 0.5;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const rel = t > len ? Math.exp(-(t - len) * 9) : 1;
    const env = (1 - Math.exp(-t * 600)) * Math.exp(-t * 1.6) * rel;
    const mod = 0.55 * Math.exp(-t * 4) * Math.sin(2 * Math.PI * f * t);
    const s = (Math.sin(2 * Math.PI * f * t + mod) + 0.18 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 3)) * env * (1 + 0.04 * Math.sin(2 * Math.PI * 4.5 * t));
    L[start + i] += s * gl;
    R[start + i] += s * gr;
    send[start + i] += s * vel * 0.5;
  }
}

/** Nappe douce (quelques harmoniques, attaque lente), légèrement désaccordée à gauche et à droite. */
function pad(L: Float32Array, R: Float32Array, send: Float32Array, sr: number, at: number, midi: number, len: number, vel: number) {
  const f = hz(midi);
  const start = Math.round(at * sr);
  const n = Math.min(L.length - start, Math.round((len + 0.8) * sr));
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.min(1, t / 0.6) * (t > len ? Math.exp(-(t - len) * 4) : 1);
    let sl = 0, sr2 = 0;
    for (let k = 1; k <= 4; k++) {
      sl += Math.sin(2 * Math.PI * f * k * 0.998 * t) / (k * k);
      sr2 += Math.sin(2 * Math.PI * f * k * 1.002 * t) / (k * k);
    }
    L[start + i] += sl * env * vel;
    R[start + i] += sr2 * env * vel;
    send[start + i] += (sl + sr2) * env * vel * 0.4;
  }
}

/** Basse ronde (fondamentale + octave, légère saturation). */
function bass(L: Float32Array, R: Float32Array, sr: number, at: number, midi: number, len: number, vel: number) {
  const f = hz(midi);
  const start = Math.round(at * sr);
  const n = Math.min(L.length - start, Math.round((len + 0.15) * sr));
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.min(1, t / 0.006) * Math.exp(-t * 1.8) * (t > len ? Math.exp(-(t - len) * 25) : 1);
    const s = Math.tanh(1.4 * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t))) * env * vel;
    L[start + i] += s;
    R[start + i] += s;
  }
}

function hit(L: Float32Array, R: Float32Array, sr: number, at: number, s: Float32Array, vel: number, pan = 0, send?: Float32Array) {
  const start = Math.round(at * sr);
  const n = Math.min(L.length - start, s.length);
  for (let i = 0; i < n; i++) {
    L[start + i] += s[i] * vel * (1 - pan) * 0.5 * 2;
    R[start + i] += s[i] * vel * (1 + pan) * 0.5 * 2;
    if (send) send[start + i] += s[i] * vel * 0.3;
  }
}

/** Accords (notes MIDI) : I – V – vi – IV en do majeur, voicings serrés autour du do central. */
const PROGRESSIONS: Record<Mood, { bpm: number; chords: { root: number; notes: number[] }[] }> = {
  pulse: {
    bpm: 102,
    chords: [
      { root: 36, notes: [60, 64, 67, 71] }, // Cmaj7
      { root: 43, notes: [59, 62, 67, 69] }, // G6/B
      { root: 45, notes: [60, 64, 69, 71] }, // Am(add9)
      { root: 41, notes: [60, 65, 69, 72] }, // F
    ],
  },
  calm: {
    bpm: 80,
    chords: [
      { root: 41, notes: [57, 60, 64, 69] }, // Fmaj7
      { root: 43, notes: [59, 62, 67, 71] }, // G
      { root: 45, notes: [57, 60, 64, 67] }, // Am7
      { root: 36, notes: [55, 60, 64, 67] }, // C
    ],
  },
};

/** Compose le morceau et renvoie un WAV 16 bits stéréo de la durée exacte voulue. */
export function composeMusic(duration: number, mood: Mood, sampleRate = SR_DEFAULT): Buffer {
  const sr = sampleRate;
  const n = Math.max(1, Math.ceil(duration * sr));
  const L = new Float32Array(n), R = new Float32Array(n), send = new Float32Array(n);
  const { bpm, chords } = PROGRESSIONS[mood];
  const beat = 60 / bpm;
  const barLen = beat * 4;
  const kit = drumKit(sr);
  const bars = Math.ceil(duration / barLen) + 1;
  for (let b = 0; b < bars; b++) {
    const t0 = b * barLen;
    if (t0 >= duration) break;
    const ch = chords[b % chords.length];
    const last = t0 + barLen >= duration - 0.01;
    // Nappe (les deux humeurs) : très discrète, elle lie les accords.
    for (const m of ch.notes.slice(0, 3)) pad(L, R, send, sr, t0, m - 12, barLen, mood === "calm" ? 0.035 : 0.022);
    if (mood === "pulse") {
      // Piano : accords rythmés (temps 1, « et » du 2, temps 4), basse sur 1 et 3, arpège en croches.
      for (const [pos, len, v] of [[0, 1.4, 0.11], [1.5, 0.4, 0.07], [3, 0.9, 0.08]] as const) for (const [k, m] of ch.notes.entries()) epiano(L, R, send, sr, t0 + pos * beat + k * 0.008, m, len * beat, v, (k - 1.5) * 0.25);
      bass(L, R, sr, t0, ch.root, beat * 1.8, 0.32);
      bass(L, R, sr, t0 + 2 * beat, ch.root, beat * 0.9, 0.26);
      bass(L, R, sr, t0 + 3.5 * beat, ch.root + 7, beat * 0.45, 0.2);
      const arp = [0, 2, 1, 3, 2, 1, 3, 2];
      for (let e = 0; e < 8; e++) epiano(L, R, send, sr, t0 + e * beat * 0.5, ch.notes[arp[e]] + 12, beat * 0.3, 0.035, e % 2 ? 0.5 : -0.5);
      // Batterie à partir de la 2e mesure (entrée en douceur), légère et sans agressivité.
      if (b > 0) {
        hit(L, R, sr, t0, kit.kick, 0.42);
        hit(L, R, sr, t0 + 2 * beat, kit.kick, 0.36);
        hit(L, R, sr, t0 + 2.75 * beat, kit.kick, 0.18);
        hit(L, R, sr, t0 + beat, kit.snare, 0.07, 0, send);
        hit(L, R, sr, t0 + 3 * beat, kit.snare, 0.07, 0, send);
        for (let e = 0; e < 8; e++) hit(L, R, sr, t0 + e * beat * 0.5 + (e % 2 ? beat * 0.06 : 0), kit.hat, e % 2 ? 0.035 : 0.05, 0.3);
      }
    } else {
      // Piano seul, arpège ample et lent, basse tenue.
      bass(L, R, sr, t0, ch.root, barLen * 0.95, 0.16);
      const order = [0, 1, 2, 3, 2, 1];
      for (let e = 0; e < 6; e++) epiano(L, R, send, sr, t0 + e * (barLen / 6), ch.notes[order[e]] + (e === 3 ? 12 : 0), barLen / 3, 0.075, (e - 2.5) * 0.15);
    }
    if (last) for (const m of ch.notes) epiano(L, R, send, sr, Math.max(0, duration - barLen * 0.5), m, barLen, 0.06, 0);
  }
  const wl = reverb(send, sr, 0);
  const wr = reverb(send, sr, 23);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const fade = Math.max(0, Math.min(1, t / 0.4, (duration - t) / 1.4));
    L[i] = Math.tanh((L[i] + wl[i] * 0.35) * 1.1) * fade;
    R[i] = Math.tanh((R[i] + wr[i] * 0.35) * 1.1) * fade;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const g = peak > 0 ? 0.85 / peak : 1;
  const data = Buffer.alloc(44 + n * 4);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + n * 4, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(sr, 24);
  data.writeUInt32LE(sr * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
  }
  return data;
}
