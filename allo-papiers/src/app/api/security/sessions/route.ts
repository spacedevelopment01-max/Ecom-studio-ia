import { json, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export const GET = route(async () => {
  const { user, session } = await requireSession();
  const sessions = await sql()<{ id: string; created_at: Date; last_seen_at: Date; user_agent: string | null }[]>`
    select id, created_at, last_seen_at, user_agent from sessions
     where user_id = ${user.id} and revoked_at is null and expires_at > now() order by last_seen_at desc`;
  const passkeys = await sql()`select id, nickname, created_at, last_used_at, backed_up from webauthn_credentials where user_id = ${user.id} order by created_at`;
  const [codes] = await sql()<{ n: number }[]>`select count(*)::int as n from recovery_codes where user_id = ${user.id} and used_at is null`;
  const [rec] = await sql()<{ vault_recovery_ready_at: Date | null }[]>`select vault_recovery_ready_at from users where id = ${user.id}`;
  return json({
    current: session.id,
    sessions,
    passkeys,
    recoveryCodesLeft: codes.n,
    vaultRecoveryReadyAt: rec.vault_recovery_ready_at,
  });
});
