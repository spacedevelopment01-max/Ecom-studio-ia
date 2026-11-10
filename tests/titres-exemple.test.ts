/**
 * Accroche d'exemple gardée mot pour mot après un montage (essai Éclat de thé du 10 novembre 2026 : « Pose ton écran.
 * Ces quelques minutes sont à toi. » restait le titre de l'ouverture) : signalée dans le rapport du montage.
 */
import { describe, expect, it } from "vitest";
import { exampleHeadlines } from "@/lib/syna-agent/custom-theme/brand";

describe("titres d'exemple gardés", () => {
  it("une accroche de la bibliothèque gardée est trouvée ; un titre pratique court ou un titre réécrit ne l'est pas", () => {
    const lib = `<h3 data-xwords>Pose ton écran. <em>Ces quelques minutes</em> sont à toi.</h3><h2>Mentions légales</h2>`;
    expect(exampleHeadlines(lib, `<h3 data-xwords>Pose ton écran. <em>Ces quelques minutes</em> sont&nbsp;à toi.</h3>`)).toEqual(["Pose ton écran. Ces quelques minutes sont à toi."]);
    expect(exampleHeadlines(lib, `<h2>Mentions légales</h2><h3>Le jasmin s'ouvre, ta journée aussi.</h3>`)).toEqual([]);
  });
});
