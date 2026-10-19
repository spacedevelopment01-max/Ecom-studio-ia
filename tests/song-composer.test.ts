/**
 * Compositeur du studio : style choisi pour le produit ou le métier, morceau dans sa tonalité (aucune fausse note),
 * fin sur l'accord de la tonalité à la durée exacte, variante propre au projet ; montage calé sur les temps.
 * Rendu réel avec les vrais instruments (banque GeneralUser GS installée avec le projet).
 */
import { describe, expect, it } from "vitest";
import { arrange, renderSong, songGrid, songStyleFor, SONG_STYLES } from "@/lib/media/song";
import { snapToBeat } from "@/lib/video-v2/engine";

describe("compositeur de musique des vidéos", () => {
  it("style adapté au produit ou au métier", () => {
    expect(songStyleFor({ business: "services", product: { category: "Plâtrier peintre" } })).toBe("acoustic");
    expect(songStyleFor({ business: "services", product: { category: "Boulangerie pâtisserie" } })).toBe("bistro");
    expect(songStyleFor({ business: "services", product: { category: "Restaurant bistrot" } })).toBe("bistro");
    expect(songStyleFor({ business: "products", product: { category: "Sérum visage" }, brand: { personality: ["premium"] } })).toBe("lounge");
    expect(songStyleFor({ business: "services", product: { category: "Massage bien-être" } })).toBe("calm");
    expect(songStyleFor({ business: "products", product: { category: "Casque audio sans fil" } })).toBe("pop");
    expect(songStyleFor({ business: "products", product: { category: "Logiciel SaaS d'analyse de données" } })).toBe("corporate");
    expect(songStyleFor({ business: "products", product: { category: "Joaillerie" } })).toBe("cinematic");
  });

  it("aucune fausse note : toutes les notes jouées sont dans la gamme du morceau", () => {
    for (const style of SONG_STYLES) {
      for (const seed of ["a", "b", "projet-123"]) {
        const { events } = arrange(style, 15, seed);
        const pitched = events.filter((e) => e.on && e.ch !== 9).map((e) => e.n);
        expect(pitched.length, style).toBeGreaterThan(20);
        // La tonalité est celle de la première note de basse jouée sur la dernière mesure (accord de la tonalité).
        const lastBass = events.filter((e) => e.on && e.ch === 2).at(-1)!.n;
        const scale = [0, 2, 4, 5, 7, 9, 11].map((x) => (x + lastBass) % 12);
        const wrong = pitched.filter((n) => !scale.includes(n % 12));
        expect(wrong, `${style}/${seed}`).toEqual([]);
      }
    }
  });

  it("variante propre au projet, reproductible", () => {
    const a = arrange("acoustic", 15, "projet-a").events.filter((e) => e.on).map((e) => e.n).join(",");
    const b = arrange("acoustic", 15, "projet-b").events.filter((e) => e.on).map((e) => e.n).join(",");
    expect(a).toBe(arrange("acoustic", 15, "projet-a").events.filter((e) => e.on).map((e) => e.n).join(","));
    expect(a).not.toBe(b);
  });

  it("vrais instruments : durée exacte, son présent jusqu'à la fin, aucune saturation", async () => {
    const wav = await renderSong("acoustic", 6, "test", 22050);
    expect(wav).not.toBeNull();
    expect(wav!.readUInt32LE(40)).toBe(6 * 22050 * 4);
    let peak = 0;
    let lateEnergy = 0;
    const lateStart = 44 + Math.floor(4.5 * 22050) * 4;
    for (let i = 44; i < wav!.length; i += 2) {
      const v = Math.abs(wav!.readInt16LE(i)) / 32767;
      peak = Math.max(peak, v);
      if (i >= lateStart && i < lateStart + 22050 * 4) lateEnergy += v;
    }
    expect(peak).toBeLessThanOrEqual(0.91);
    expect(peak).toBeGreaterThan(0.3);
    expect(lateEnergy).toBeGreaterThan(100); // l'accord final sonne encore
  }, 60_000);

  it("montage composé calé sur les temps : plans filmés raccourcis seulement, durée totale inchangée", () => {
    const { beatS } = songGrid("acoustic", 15);
    const clip = (d: number) => ({ id: String(d), shotId: "s", label: "", part: "development", durationS: d, source: d === 3.6 ? { kind: "video", assetId: "v", inS: 0, outS: d, muted: true } : { kind:"doc",assetId:null }, overlays: [], transitionIn: { kind: "cut", durationS: 0 } }) as any;
    const out = snapToBeat([clip(1.8), clip(3.6), clip(2), clip(1.9), clip(1.9), clip(1.6), clip(2.2)], beatS);
    const total = out.reduce((t, c) => t + c.durationS, 0);
    expect(Math.abs(total - 15)).toBeLessThan(0.01);
    let t = 0;
    for (const c of out.slice(0, -1)) {
      t += c.durationS;
      expect(Math.abs(t / beatS - Math.round(t / beatS))).toBeLessThan(0.01);
      expect(c.durationS).toBeGreaterThanOrEqual(2 * beatS - 0.001);
    }
    const s1 = out[1].source as { inS: number; outS: number };
    expect(s1.outS - s1.inS).toBeCloseTo(out[1].durationS, 3);
  });
  it("garde les coupes initiales si le rythme dépasserait les passages filmés approuvés", () => {
    const clips = [1.8,3.6,2,1.9,1.9,1.6,2.2].map((durationS,k)=>({id:String(k),shotId:String(k),label:"",part:"development",durationS,source:{kind:"video",assetId:"v",inS:2,outS:2+durationS,muted:true},overlays:[],transitionIn:{kind:"cut",durationS:0}})) as any;
    const before=structuredClone(clips);
    const out=snapToBeat(clips,songGrid("acoustic",15).beatS);
    expect(out).toEqual(before);
    expect(clips).toEqual(before);
    expect(out.reduce((sum:number,c:any)=>sum+c.durationS,0)).toBeCloseTo(15,6);
  });

});
