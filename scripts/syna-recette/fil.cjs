// node fil.cjs <email> [depuis_seq] — relit le fil SYNA du compte (messages, outils, changements)
const D = require('/home/user/ecom-claude/node_modules/better-sqlite3')(__dirname + '/../agent492/data/studio.db', { readonly: true });
const [, , email, from = '0'] = process.argv;
const u = D.prepare('SELECT id FROM users WHERE email=?').get(email);
const c = D.prepare('SELECT id,project_id FROM agent_conversations WHERE user_id=? ORDER BY updated_at DESC LIMIT 1').get(u.id);
console.log('fil', c.id, 'projet', c.project_id);
for (const m of D.prepare('SELECT seq,role,content_json FROM syna_messages WHERE conversation_id=? AND seq>? ORDER BY seq').all(c.id, Number(from))) {
  const x = JSON.parse(m.content_json);
  if (m.role === 'user') console.log(`\n#${m.seq} CLIENT: ${x.text}`);
  else if (m.role === 'assistant') console.log(`#${m.seq} SYNA: ${(x.message || '').slice(0, 600)}${x.actions?.length ? '\n   → ' + x.actions.map(a => a.tool + ' ' + JSON.stringify(a.args).slice(0, 160)).join('\n   → ') : ''}${x.question ? '\n   ? ' + x.question.text + ' ' + JSON.stringify(x.question.choices || []) : ''}`);
  else if (m.role === 'tool') console.log(`#${m.seq}   [${x.tool}] ${x.ok ? 'OK' : 'ÉCHEC'} ${String(x.summary).slice(0, 300)}${x.changes?.length ? ' | ' + x.changes.map(ch => `${ch.module}/${ch.object}${ch.verified ? '✓' : '?'}`).join(', ') : ''}`);
  else console.log(`#${m.seq}   (${x.kind}${x.message ? ': ' + x.message.slice(0, 200) : ''}${x.pending ? ': ' + x.pending.tool + ' ' + x.pending.reason : ''})`);
}
const r = D.prepare('SELECT status,step,error FROM syna_runs WHERE conversation_id=? ORDER BY created_at DESC LIMIT 1').get(c.id);
console.log('\nexécution :', JSON.stringify(r));
