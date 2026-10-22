"use client";
import { MarketingStrategy } from './marketing-strategy';
import { useProject } from './project-context';
export default function StrategyTab(){const {id,reload}=useProject();return <div className="mx-auto max-w-6xl"><MarketingStrategy projectId={id} onChange={reload}/></div>;}
