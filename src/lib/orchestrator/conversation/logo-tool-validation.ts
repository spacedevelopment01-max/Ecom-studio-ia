/** Résolution serveur du nom et de la série réels, pas un deuxième interprète du langage client. */
import {HttpError}from '../../auth';
import {loadProject}from '../../projects';
import {currentSeries,directionNamingBrand}from '../../logo-v2/direction-series';
import {brandDiscovery}from '../../logo-v2/discovery';
import {acceptedDirections}from '../../logo-v2/accepted-directions';
import type {LogoCreationInput}from '../../logo-v2/creation-quote';
import type {ConversationRow}from './contract';
import {LogoToolPlanSchema}from './logo-tool-contract';
import {L}from '../../i18n-server';
export function validateLogoToolProposal(c:ConversationRow,raw:unknown,sources:{sources:{id:string;text:string}[];lastClientRequest:{sourceId:string|null;text:string}|null}){
 const plan=LogoToolPlanSchema.parse(raw),latest=sources.lastClientRequest,source=sources.sources.find(s=>s.id===plan.sourceId);
 if(!c.project_id||!latest?.sourceId||plan.sourceId!==latest.sourceId||!source?.text.includes(plan.quote)||!latest.text.includes(plan.quote))throw new HttpError(409,L('La proposition doit citer votre dernière demande exacte.','The proposal must cite your latest exact request.'));
 const p=loadProject(c.project_id),series=currentSeries(p.id),naming=directionNamingBrand(p.id);
 if(!naming?.name||!['provided','validated'].includes(naming.nameStatus??''))throw new HttpError(409,L('Confirmez un seul nom exact avant les logos.','Confirm one exact name before the logos.'));
 if(plan.expectedSeriesId!==(series?.id??null))throw new HttpError(409,L('La série désignée a changé.','The selected series has changed.'));
 if(plan.territories)acceptedDirections(plan.territories,brandDiscovery({...p,brand:naming},{instructions:latest.text}));
 if(!plan.territories&&!series)throw new HttpError(409,L('Trois concepts complets sont nécessaires avant le devis de dessin.','Three complete concepts are required before the drawing quote.'));
 const input:LogoCreationInput={action:plan.action,expectedSeriesId:plan.expectedSeriesId,territories:plan.territories,instructions:latest.text};return{plan,input,p};
}
