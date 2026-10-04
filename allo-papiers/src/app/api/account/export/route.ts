import { route } from "@/lib/http";
import { requireElevated } from "@/lib/auth";
import { exportAccount } from "@/lib/account";
import { audit } from "@/lib/audit";

export const GET = route(async () => {
  const { user } = await requireElevated();
  const data = await exportAccount(user.id);
  await audit(user.id, "export_donnees");
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="allo-papiers-mes-donnees.json"`,
      "cache-control": "no-store",
    },
  });
});
