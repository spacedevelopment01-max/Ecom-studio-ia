/** Réponses/retours/corrections exactes du client, sans réflexion payante et sans moteur de mots-clés. */
import { HttpError } from '../../auth';
import { L } from '../../i18n-server';
import { writeFact } from './tools';
import type { Brief } from '../../preparation/types';
import type { Command, ConversationRow, ConversationState } from './contract';
import {clearConversationAnswer} from './answer-state';

export function applyCognitiveCommand(c: ConversationRow, b: Brief, m: ConversationState, cmd: Command) {
  const a = m.intelligence;
  if (cmd.action === 'back-ai') {
    const q = a?.questionHistory?.find(q => q.id === cmd.questionId);
    if (!q || !a?.lastReply) throw new HttpError(404, L('Question précédente introuvable.', 'Previous question not found.'));
    a.lastReply = { ...a.lastReply, question: q, status: 'question' };
    return { changed: false, message: L('Votre réponse reste conservée jusqu’à sa correction.', 'Your answer stays saved until you correct it.') };
  }
  if (cmd.action === 'accept-ai-changes') {
    if (!a?.lastReply || a.proposalId !== cmd.proposalId || a.sourceRevision !== c.revision || (a.sourceProjectRevision??null)!==cmd.projectRevision) throw new HttpError(409, L('La proposition est absente ou son contexte a changé. Relisez vos acquis avant de la reprendre.', 'The proposal is missing or its context changed. Review your work before resuming it.'), 'conversation_proposal_stale');
    if (a.lastReply.business && m.business !== a.lastReply.business) {
      m.business = b.input.business = a.lastReply.business; m.businessSource = 'client';
      const goals = b.profile.facts.find(f => f.key === 'conversation.goals');
      if (goals) { goals.status = 'unknown'; goals.value = ''; goals.later = true; }
    }
    for (const p of a.lastReply.proposedChanges) {
      const limits = { target: 1200, offerName: 160, brandName: 80, constraints: 5000, goals: 1200 };
      if (p.value.length > limits[p.field]) throw new HttpError(400, 'conversation_field_limit');
      if (p.field === 'goals') writeFact(b, 'conversation.goals', L('Objectifs confirmés', 'Confirmed goals'), p.value);
      else if (p.field === 'constraints') {
        // Une contrainte négative déjà acquise ne disparaît jamais dans une reformulation du modèle.
        if (!b.input.constraints.includes(p.value)) b.input.constraints = [b.input.constraints, p.value].filter(Boolean).join('\n');
        if (b.input.constraints.length > limits.constraints) throw new HttpError(400, 'conversation_field_limit');
      } else {
        b.input[p.field] = p.value;
        if (p.field === 'offerName') { b.profile.name = p.value; b.profile.nameStatus = 'provided'; }
        if (p.field === 'target') writeFact(b, 'conversation.target', L('Clientèle confirmée', 'Confirmed customers'), p.value);
      }
    }
    a.proposalId = undefined;
    return { changed: true, message: L('Les modifications acceptées sont dans la même fiche versionnée.', 'Accepted changes are in the same versioned brief.') };
  }
  if (cmd.action !== 'answer-ai') throw new HttpError(400, 'conversation_ai_command_unknown');
  const q = a?.lastReply?.question;
  if (!q || q.id !== cmd.questionId) throw new HttpError(409, L('La question a changé. Rechargez le dialogue.', 'The question changed. Reload the conversation.'), 'conversation_question_stale');
  if (new Set(cmd.choices).size !== cmd.choices.length || cmd.choices.some(id => !q.choices.some(x => x.id === id)) || !q.multiple && cmd.choices.length > 1) throw new HttpError(400, 'conversation_choice_invalid');
  if (cmd.unknown && (cmd.choices.length || cmd.text)) throw new HttpError(400, 'conversation_unknown_conflict');
  if (!cmd.unknown && !cmd.text && (!cmd.choices.length || cmd.choices.includes('other'))) throw new HttpError(400, L('Précisez votre réponse avec vos mots.', 'Explain your answer in your own words.'));
  const value = cmd.unknown ? '' : [...q.choices.filter(x => cmd.choices.includes(x.id) && x.id !== 'other').map(x => x.label), cmd.text].filter(Boolean).join(' ; ');
  if (value.length > 1200) throw new HttpError(400, 'conversation_answer_limit');
  const key = `conversation.ai.${q.id}`;
  if (cmd.unknown) {b.profile.facts = [...b.profile.facts.filter(f => f.key !== key), { key, label: q.title, value: '', status: 'unknown', source: 'user', later: true }];clearConversationAnswer(b,m,q.field);}
  else writeFact(b, key, q.title, value);
  b.profile.questions = [...b.profile.questions.filter(x => x.id !== q.id), { id: q.id, question: q.title, why: q.why, required: false, factKey: key, ...(value ? { answer: value } : { later: true }) }];
  if (!cmd.unknown) {
    if (q.field === 'target') { b.input.target = value; writeFact(b, 'conversation.target', q.title, value); }
    if (q.field === 'offerName' || q.field === 'brandName') {
      if (value.length > (q.field === 'brandName' ? 80 : 160)) throw new HttpError(400, 'conversation_field_limit');
      b.input[q.field] = value;
      if (q.field === 'offerName') { b.profile.name = value; b.profile.nameStatus = 'provided'; }
    }
    if (q.field === 'constraints') {
      b.input.constraints = [b.input.constraints, value].filter(Boolean).join('\n');
      if (b.input.constraints.length > 5000) throw new HttpError(400, 'conversation_field_limit');
    }
    if (q.field === 'business') {
      const type = cmd.choices.find(x => x === 'products' || x === 'services');
      if (type) { m.business = b.input.business = type; m.businessSource = 'client'; }
    }
    if (q.field === 'goals') {
      writeFact(b, 'conversation.goals', q.title, value);
      const modes = cmd.choices.filter((x): x is 'quote' | 'booking' | 'form' => ['quote','booking','form'].includes(x));
      if (m.business === 'services' && modes.length) { b.services.contactModes = b.input.services.contactModes = modes; b.services.contactMode = b.input.services.contactMode = modes[0]; }
    }
  }
  (cmd as Command & { clientAnswer?: string }).clientAnswer = cmd.unknown ? L('Je ne sais pas encore.', 'I do not know yet.') : value;
  return { changed: true, message: L('Réponse exacte conservée ; la prochaine réflexion IA demande votre accord.', 'Exact answer saved; the next AI reasoning requires your consent.') };
}
