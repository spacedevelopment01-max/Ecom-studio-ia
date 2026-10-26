import { credentials } from "@/lib/ai/higgsfield/http";
import { higgsfieldMessage } from "@/lib/ai/higgsfield/errors";
import { z } from "zod";
import { requireAdmin, HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { setSetting } from "@/lib/settings";
import {
  overview,
  refreshPricing,
  approvePricing,
} from "@/lib/ai/higgsfield/pricing";
import { mask } from "@/lib/secrets";
// Internal credential fingerprints never leave the server, including in a refresh response.
const publicResult = (value: unknown) =>
  JSON.parse(
    JSON.stringify(value, (key, v) =>
      key === "credentialFingerprint" ? undefined : v,
    ),
  );
const adminOk = (value: unknown) =>
  ok(publicResult(value), {
    headers: { "Cache-Control": "private, no-store" },
  });
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const GET = handle(async () => {
  await requireAdmin();
  return adminOk({
    ...overview(),
    keyMasked: mask(credentials()?.id ?? null),
    secretPresent: !!credentials()?.secret,
  });
});
export const POST = handle(async (req: Request) => {
  const user = await requireAdmin();
  const b = await body(
    req,
    z.discriminatedUnion("action", [
      z.object({
        action: z.literal("credentials"),
        keyId: z
          .string()
          .trim()
          .min(1)
          .max(1000)
          .regex(/^[^\r\n]+$/),
        keySecret: z
          .string()
          .trim()
          .min(1)
          .max(1000)
          .regex(/^[^\r\n]+$/),
      }),
      z.object({ action: z.literal("refresh") }),
      z.object({
        action: z.literal("approve"),
        proposal: z.string(),
        models: z.array(z.string()).min(1),
        overrides: z
          .array(
            z.object({
              key: z.string(),
              usd: z.number().positive().finite(),
              reason: z.string().min(5),
            }),
          )
          .optional(),
      }),
      z.object({ action: z.literal("disable") }),
    ]),
  );
  try {
    if (b.action === "credentials") {
      setSetting("provider.higgsfield.keyId", b.keyId.trim(), true);
      setSetting("provider.higgsfield.keySecret", b.keySecret.trim(), true);
      setSetting("provider.higgsfield.disabled", "1");
      return adminOk({ saved: true });
    }
    if (b.action === "disable") {
      setSetting("provider.higgsfield.disabled", "1");
      return adminOk({ disabled: true });
    }
    if (b.action === "refresh") return adminOk(await refreshPricing());
    return adminOk(approvePricing(b.proposal, b.models, user.id, b.overrides));
  } catch (e) {
    const code =
      e instanceof Error && /^HIGGSFIELD_[A-Z_]+$/.test(e.message)
        ? e.message
        : "HIGGSFIELD_OPERATION_FAILED";
    throw new HttpError(400, higgsfieldMessage(code));
  }
});
