import type { StartInput } from "../project-start";
import { all } from "../db";
import { serviceProfileFromInput } from "../project-start";
import { initialize } from "./engine";
export function startPreparation(projectId: string, input: StartInput) {
  return initialize(projectId, {
    offerUrl: input.link || input.siteUrl || "",
    description: input.description || "",
    offerName: input.productName || "",
    brandName: input.brandName || "",
    target: input.target || "",
    constraints: input.request || "",
    business: input.businessType,
    photoIds: all<{ id: string }>(
      "SELECT id FROM assets WHERE project_id=? AND origin='upload' AND role IN ('original','lifestyle') AND deleted_at IS NULL",
      projectId,
    ).map((a) => a.id),
    referenceUrls: [],
    price: input.price || "",
    services: serviceProfileFromInput(input),
  });
}
