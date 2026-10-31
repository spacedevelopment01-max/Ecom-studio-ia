/** Le module fermé ne grossit pas la sortie structurée facturée de chaque dialogue. */
import {it,expect}from 'vitest';
import {zodOutputFormat}from '@anthropic-ai/sdk/helpers/zod';
import {cognitiveResponseSchema}from '@/lib/orchestrator/conversation/intelligence-contract';
import {strictTextQuoteInput,type LlmCall}from '@/lib/ai/llm';
const reply={message:'Précisons le projet.',status:'answer',business:null,businessEvidence:null,question:null,proposedChanges:[],knowledgeSourceIds:[],proposedTools:[],actionsExecuted:false};
it('aucun plan logo ni permission de dessin dans la sortie du dialogue quand le module est fermé',()=>{const schema=cognitiveResponseSchema(false),format=JSON.stringify(zodOutputFormat(schema));expect(format).not.toContain('logoPlan');expect(format).not.toContain('logos.create');expect(schema.safeParse(reply).success).toBe(true);expect(schema.safeParse({...reply,logoPlan:{tool:'logos.create'}}).success).toBe(false);});
it('ne réserve le schéma des identités complètes que pour un parcours qui le demande',()=>{const call:LlmCall={task:'logo_symbol',userId:'test',system:'Dialogue de test',prompt:'Décris le besoin sans exécuter d’action.',maxTokens:6000},closed=strictTextQuoteInput(call,cognitiveResponseSchema(false)),open=strictTextQuoteInput(call,cognitiveResponseSchema(true));expect(open.maximumTokens).toBeGreaterThan(closed.maximumTokens);expect(open.typicalTokens).toBeGreaterThan(closed.typicalTokens);expect(JSON.stringify(zodOutputFormat(cognitiveResponseSchema(true)))).toContain('logoPlan');});
