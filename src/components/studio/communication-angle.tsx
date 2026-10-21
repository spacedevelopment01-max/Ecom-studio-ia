"use client";
import {useEffect,useState} from 'react';
import {useApi} from '../ui';
import {useT} from '../i18n';
import {useProject} from './project-context';
import type {StrategyState,AngleId} from '@/lib/marketing-strategy/types';
export function useCommunicationAngle(){return useState<AngleId|undefined>();}
export function CommunicationAngleSelector({value,onChange}:{value:AngleId|undefined;onChange:(value:AngleId|undefined)=>void}){
 const {id}=useProject(),t=useT();const {data}=useApi<StrategyState>(`/api/projects/${id}/marketing-strategy`);
 useEffect(()=>{if(data?.scope==='service_communication'&&!value&&data.active)onChange(data.active.angleId);},[data?.active?.id]);
 if(data?.scope!=='service_communication')return null;
 return <div className="grid gap-2 rounded-xl border border-line p-3" data-communication-angle>
 <label>{t('Angle de cette communication','Angle for this communication')}<select className="mt-1 block w-full rounded border border-line bg-paper p-2" value={value??''} onChange={e=>onChange((e.target.value||undefined) as AngleId|undefined)}>
 <option value="">{t('Choisir un angle autorisé','Choose an authorized angle')}</option>{data.angles.filter(a=>data.usedAngleIds.includes(a.id)).map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label>
 <p className="text-xs">{t('Cet angle suit le texte et les médias de ce contenu. Votre site général et vos autres campagnes restent inchangés.','This angle follows this content’s copy and media. Your general website and other campaigns stay unchanged.')}</p>
 <a className="text-sm underline" href={`/studio/${id}/strategie`}>{t('Comparer les cinq angles et autoriser mes choix','Compare five angles and authorize my choices')}</a></div>;
}
