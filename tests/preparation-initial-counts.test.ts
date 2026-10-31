/** États effectivement rendus à partir des droits serveur ; pas de changement de forfait. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ authorization: {} as Record<string, unknown> }));
vi.mock("@/components/studio/project-context", () => ({ useProject: () => ({ id: "synthetic-only" }) }));
vi.mock("@/components/ui", async original => ({ ...await original<object>(), useApi: () => ({ data: state, reload: () => {} }) }));
import { InitialAuthorization } from "@/components/studio/initial-authorization";
it.each([10, 20])("le récapitulatif annonce %i créations selon les droits effectifs", required => {
  state.authorization = { available: true, status: "absent", required, organicRequired: 10, adsRequired: required - 10 };
  const html = renderToStaticMarkup(createElement(InitialAuthorization));
  expect(html).toContain(`vos ${required} créations`);
  expect(html).toContain(required === 10 ? "publicités non incluses dans ce forfait" : "10 publicités indépendantes");
  expect(html).not.toContain("vingt créations");
});
