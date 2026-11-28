import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, FONT, rnd, lin, pop, Ciel, Nuage, Soleil, Humain, Bulle} from './dessins';
import {ease, T, txt, Fond} from './commun_moyenage';

const T0 = (t: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => T(t, -1, texte, taille, c, y);
type HB = 'content' | 'froid' | 'chaud' | 'choc' | 'cool';
const Boule: React.FC<{x: number; y: number; s?: number; f: number; humeur?: HB; ph?: number}> = ({x, y, s = 1, f, humeur = 'content', ph = 0}) => {
	const tr = humeur === 'froid' ? (rnd(f + ph * 9) - 0.5) * 6 : 0;
	return (
		<g transform={`translate(${x + tr} ${y + Math.sin(f * 0.1 + ph) * 4}) scale(${s})`}>
			<circle r={70} fill={humeur === 'froid' ? '#b8d4f0' : humeur === 'chaud' ? '#f4a080' : '#f2c09a'} stroke={INK} strokeWidth={6} />
			<ellipse cx={-22} cy={-28} rx={16} ry={10} fill="#fff" opacity={0.4} />
			{humeur === 'cool' ? <rect x={-48} y={-22} width={96} height={26} rx={10} fill="#1a1a1a" /> : [-22, 22].map((k) => <g key={k}><ellipse cx={k} cy={-10} rx={humeur === 'choc' ? 13 : 10} ry={humeur === 'choc' ? 15 : 12} fill="#fff" stroke={INK} strokeWidth={3} /><circle cx={k} cy={-8} r={5} fill={INK} /></g>)}
			<path d={humeur === 'froid' ? 'M -20 28 l 8 -6 l 8 6 l 8 -6 l 8 6' : humeur === 'choc' ? 'M -10 24 Q 0 40 10 24 Z' : 'M -20 22 Q 0 40 20 22'} stroke={INK} strokeWidth={4} fill={humeur === 'choc' ? '#5a1a1a' : 'none'} />
			{humeur === 'chaud' && [0, 1].map((i) => { const p = (f * 0.05 + i / 2) % 1; return <path key={i} d="M 0 0 q -8 14 0 20 q 8 -6 0 -20 Z" transform={`translate(${40 + i * 12} ${-60 + p * 60})`} fill="#bfe6fa" stroke={INK} strokeWidth={3} opacity={1 - p} />; })}
		</g>
	);
};
const Duo: React.FC<{x: number; y: number; s?: number; f: number; humeur?: HB; sac?: boolean}> = ({x, y, s = 1, f, humeur = 'content', sac = true}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${Math.sin(f * 0.06) * 5})`}>
		{sac && <><path d="M 0 -260 L 0 -110" stroke="#8a6a4a" strokeWidth={10} /><path d="M -170 -110 Q -180 110 0 120 Q 180 110 170 -110 Z" fill="#c8a07a" stroke={INK} strokeWidth={7} opacity={0.85} /></>}
		<Boule x={-75} y={0} f={f} humeur={humeur} /><Boule x={75} y={10} f={f} humeur={humeur} ph={2} />
	</g>
);
const Maison: React.FC<{f: number; fenetre?: boolean}> = ({f, fenetre = true}) => (
	<g>
		<rect x={140} y={500} width={800} height={1000} fill="#f1e2c0" stroke={INK} strokeWidth={10} />
		<path d="M 100 520 L 540 220 L 980 520 Z" fill="#c0573a" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
		{txt(540, 450, 'TON CORPS', 60, '#fff')}
		{fenetre && <rect x={660} y={820} width={240} height={200} fill="#bfe3f2" stroke={INK} strokeWidth={8} />}
	</g>
);
const Coffre: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}><rect x={-110} y={-110} width={220} height={220} rx={16} fill="#8a8f9a" stroke={INK} strokeWidth={8} /><circle r={50} fill="#6a6f7a" stroke={INK} strokeWidth={6} />{[0, 60, 120, 180, 240, 300].map((a) => <path key={a} d="M 0 -30 L 0 -50" stroke={INK} strokeWidth={6} transform={`rotate(${a})`} />)}</g>
);
const Cerveau: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}><path d="M -90 20 Q -100 -40 -60 -60 Q -30 -90 0 -80 Q 40 -90 70 -60 Q 100 -30 90 20 Q 80 60 0 60 Q -80 60 -90 20 Z" fill="#f4b6c0" stroke={INK} strokeWidth={6} /><path d="M -50 -30 q 20 -20 40 0 M 10 -40 q 20 -10 40 10 M -40 20 q 30 -10 60 10" stroke="#d88a98" strokeWidth={6} fill="none" /></g>
);
const Coeur: React.FC<{x: number; y: number; s?: number; f: number}> = ({x, y, s = 1, f}) => (
	<g transform={`translate(${x} ${y}) scale(${s * (1 + Math.max(0, Math.sin(f * 0.4)) * 0.08)})`}><path d="M 0 -20 C -40 -70 -100 -20 0 60 C 100 -20 40 -70 0 -20 Z" fill="#e23b5a" stroke={INK} strokeWidth={6} /></g>
);
const Thermo: React.FC<{x: number; y: number; k: number; label: string; s?: number}> = ({x, y, k, label, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}><rect x={-30} y={-300} width={60} height={300} rx={30} fill="#fff" stroke={INK} strokeWidth={6} /><rect x={-14} y={-20 - k * 260} width={28} height={20 + k * 260} rx={14} fill="#e23b2b" /><circle cx={0} cy={20} r={50} fill="#e23b2b" stroke={INK} strokeWidth={6} />{txt(0, -330, label, 56, INK)}</g>
);
const Elephant: React.FC<{x: number; y: number; s?: number; f: number}> = ({x, y, s = 1, f}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		{[-150, -60, 80, 170].map((k) => <rect key={k} x={k - 40} y={-200} width={80} height={200} rx={20} fill="#9a9aa6" stroke={INK} strokeWidth={6} />)}
		<ellipse cx={0} cy={-300} rx={280} ry={190} fill="#a8a8b4" stroke={INK} strokeWidth={8} />
		<g transform="translate(-280 -390)"><ellipse cx={60} cy={20} rx={90} ry={120} fill="#9494a0" stroke={INK} strokeWidth={6} /><circle r={120} fill="#a8a8b4" stroke={INK} strokeWidth={7} /><path d={`M -80 40 Q -150 160 ${-110 + Math.sin(f * 0.1) * 20} 260`} stroke={INK} strokeWidth={60} fill="none" strokeLinecap="round" /><path d={`M -80 40 Q -150 160 ${-110 + Math.sin(f * 0.1) * 20} 260`} stroke="#a8a8b4" strokeWidth={44} fill="none" strokeLinecap="round" /><circle cx={-30} cy={-20} r={12} fill={INK} /></g>
		<g transform="translate(60 -300)"><rect x={-140} y={-90} width={280} height={180} rx={30} fill="#fff3d0" stroke={INK} strokeWidth={6} /><Boule x={-55} y={10} s={0.6} f={f} humeur="cool" /><Boule x={55} y={10} s={0.6} f={f} humeur="cool" ph={2} /></g>
	</g>
);

export const B01: React.FC = () => (
	<Plan debut={0} fin={3.13} sansEntree cam={(t) => ({z: lin(t, [0, 3.13], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#e4dcf2" />
			<Duo x={540} y={1250} s={1.5} f={f} humeur="choc" />
			{T0(t, 'POURQUOI ELLES SONT', 100)}
			{T0(t, 'DEHORS ?!', 140, '#fff', 560)}
		</>)}
	</Plan>
);
export const B02: React.FC = () => (
	<Plan debut={3.13} fin={9.47} cam={(t) => ({z: lin(t, [3.13, 9.47], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Ciel id="b2" /><Soleil x={880} y={300} f={f} />
			<rect x={-800} y={1500} width={2680} height={1300} fill="#9ccc65" stroke={INK} strokeWidth={6} />
			<Maison f={f} />
			{t > 5.6 && <g transform={`translate(780 ${1020 + pop(t, 5.6) * 20})`}><Duo x={0} y={150} s={0.8} f={f} humeur="choc" /></g>}
			{t > 3.98 && T(t, 3.98, 'LE PLUS PRÉCIEUX', 110)}
			{t > 5.6 && T(t, 5.6, 'RANGÉ DEHORS', 110, '#ff4b2b', 560)}
			{t > 8.05 && <Ecran>{txt(540, 1620, 'SANS PROTECTION', 80, '#FFD23F')}</Ecran>}
		</>)}
	</Plan>
);
export const B03: React.FC = () => (
	<Plan debut={9.47} fin={14.4} cam={(t) => ({z: lin(t, [9.47, 14.4], [1.0, 1.15], ease), y: -100})}>
		{(t, f) => (<>
			<Fond c="#fbe7c6" />
			<Maison f={f} />
			{t > 9.5 && <g transform={`translate(540 700) scale(${pop(t, 9.5)})`}><Coffre x={0} y={0} s={1.1} /><g transform="translate(0 -10) scale(0.6)"><Cerveau x={0} y={0} /></g></g>}
			{t > 10.96 && <g transform={`translate(540 1000) scale(${pop(t, 10.96)})`}><Coeur x={0} y={0} s={1.3} f={f} />{[-90, -45, 0, 45, 90].map((k) => <rect key={k} x={k - 8} y={-110} width={16} height={200} rx={8} fill="#f6efd8" stroke={INK} strokeWidth={4} />)}</g>}
			{t > 12.76 && <g transform={`translate(780 1040)`}><Duo x={0} y={150} s={0.75} f={f * 1.5} humeur="choc" /></g>}
			{T(t, 9.5, 'CERVEAU : COFFRE-FORT', 84)}
			{t > 10.96 && T(t, 10.96, 'CŒUR : DERRIÈRE LES CÔTES', 72, '#fff', 560)}
			{t > 13.11 && <Ecran>{txt(540, 1650, 'ELLES : DEHORS', 90, '#ff4b2b')}</Ecran>}
		</>)}
	</Plan>
);
export const B04: React.FC = () => (
	<Plan debut={14.4} fin={21.47} cam={(t) => ({z: lin(t, [14.4, 21.47], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#e8eef0" />
			{t > 16.2 && <g transform={`translate(540 950) scale(${pop(t, 16.2)})`}><rect x={-300} y={-160} width={600} height={320} rx={30} fill="#fff" stroke={INK} strokeWidth={8} />{txt(0, -60, 'USINE À', 50, INK)}{txt(0, 20, 'SPERMATOZOÏDES', 56, '#2f6fb0')}{Array.from({length: 6}).map((_, i) => <g key={i} transform={`translate(${-200 + ((f * 4 + i * 80) % 400)} 100)`}><circle r={12} fill="#fff" stroke={INK} strokeWidth={3} /><path d={`M 12 0 q 20 ${Math.sin(f * 0.5 + i) * 12} 40 0`} stroke={INK} strokeWidth={3} fill="none" /></g>)}</g>}
			{t > 19.2 && <><Thermo x={330} y={1650} k={0.85} label="37°" s={0.8} /><Thermo x={750} y={1650} k={0.6} label="34°" s={0.8} /></>}
			{T(t, 14.45, 'UNE VRAIE RAISON', 110)}
			{t > 17.86 && T(t, 17.86, 'IL FAUT DU FRAIS', 110, '#bfe6fa', 560)}
		</>)}
	</Plan>
);
export const B05: React.FC = () => (
	<Plan debut={21.47} fin={24.24} cam={(t) => ({z: lin(t, [21.47, 24.24], [1.0, 1.2], ease), y: -200})}>
		{(t, f) => (<>
			<Ciel id="b5" /><Nuage x={200} y={330} />
			<rect x={-800} y={1500} width={2680} height={1300} fill="#9ccc65" stroke={INK} strokeWidth={6} />
			<Maison f={f} />
			<g transform="translate(780 1020)"><Duo x={0} y={150} s={0.8} f={f} humeur="content" /></g>
			{T(t, 21.5, 'À LA FENÊTRE', 130)}
		</>)}
	</Plan>
);
export const B06: React.FC = () => (
	<Plan debut={24.24} fin={31.25} cam={(t) => ({z: lin(t, [24.24, 31.25], [1.0, 1.1], ease), y: -60})}>
		{(t, f) => {
			const froid = t > 26.0 && t < 29.0;
			const h = t < 26 ? 0 : t < 29 ? lin(t, [26.8, 27.6], [0, -300], ease) : lin(t, [29.8, 30.6], [-300, 120], ease);
			return (<>
				<rect x={-1500} y={-1500} width={4080} height={5000} fill={froid ? '#cfe6f6' : t > 29 ? '#ffd8a0' : '#e8eef0'} />
				{froid && Array.from({length: 20}).map((_, i) => <circle key={i} cx={rnd(i) * 1080} cy={(f * 4 + rnd(i + 3) * 1900) % 1900} r={8} fill="#fff" />)}
				{t > 29 && <Soleil x={850} y={450} f={f} r={130} />}
				<rect x={340} y={500} width={400} height={60} rx={20} fill="#c0573a" stroke={INK} strokeWidth={7} />
				<path d={`M 540 560 L 540 ${1050 + h}`} stroke="#8a6a4a" strokeWidth={12} />
				<circle cx={540} cy={530} r={40} fill="#8a8f9a" stroke={INK} strokeWidth={6} />
				<Duo x={540} y={1150 + h} s={1.0} f={f} humeur={froid ? 'froid' : t > 29 ? 'cool' : 'content'} />
				<Ecran><g transform={`translate(540 230) scale(${pop(t, 24.3)})`}><rect x={-330} y={-56} width={660} height={112} rx={56} fill="#fff" stroke={INK} strokeWidth={7} /><text x={0} y={22} textAnchor="middle" fontFamily={FONT} fontSize={56} fill={INK}>THERMOSTAT AUTOMATIQUE</text></g></Ecran>
				{froid && T(t, 26.0, 'FROID : ON REMONTE', 96, '#fff')}
				{t > 29 && T(t, 29.0, 'CHAUD : ON DESCEND', 96, '#ff4b2b')}
			</>);
		}}
	</Plan>
);
export const B07: React.FC = () => (
	<Plan debut={31.25} fin={36.69} cam={(t) => ({z: lin(t, [31.25, 36.69], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => (<>
			<Ciel id="b7" haut="#f6b26b" bas="#fde4b8" /><Soleil x={860} y={300} f={f} />
			<rect x={-800} y={1600} width={2680} height={1300} fill="#d8b860" stroke={INK} strokeWidth={6} />
			<Elephant x={600} y={1650} s={1.0} f={f} />
			{T(t, 31.3, "MAIS L'ÉLÉPHANT…", 110)}
			{t > 33.29 && T(t, 33.29, 'LES GARDE DEDANS', 110, '#fff', 560)}
			{t > 35.56 && <Ecran>{txt(540, 1750, 'ET ÇA MARCHE TRÈS BIEN', 70, '#FFD23F')}</Ecran>}
		</>)}
	</Plan>
);
export const B08: React.FC = () => (
	<Plan debut={36.69} fin={40.53} cam={(t) => ({z: lin(t, [36.69, 40.53], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => (<>
			<Fond c="#eef0e6" />
			{[0, 1, 2].map((i) => <Humain key={i} x={230 + i * 310} y={1650} s={1.0} f={f} couleur="#f4f4f4" chapeau="aucun" cheveux={['#9a9a9a', '#3b2a1e', '#c9a060'][i]} jambesC="#2c2f36" cravate="#2f6fb0" humeur="perplexe" pose={i === 1 ? 'main' : 'debout'} ph={i} />)}
			{[0, 1, 2].map((i) => <text key={i} x={230 + i * 310} y={1150 - Math.sin(f * 0.1 + i) * 10} textAnchor="middle" fontFamily={FONT} fontSize={110} fill="#7a5ac0" stroke={INK} strokeWidth={10} paintOrder="stroke" opacity={pop(t, 37.5 + i * 0.2)}>?</text>)}
			{T(t, 36.7, 'LES SCIENTIFIQUES', 110)}
			{t > 37.5 && T(t, 37.5, 'SE DEMANDENT ENCORE', 96, '#fff', 560)}
		</>)}
	</Plan>
);
export const B09: React.FC = () => (
	<Plan debut={40.53} fin={45.4} cam={(t) => ({z: lin(t, [40.53, 45.4], [1.0, 1.2], ease), y: -200})}>
		{(t, f) => (<>
			<Ciel id="b9" /><Soleil x={880} y={300} f={f} />
			<rect x={-800} y={1500} width={2680} height={1300} fill="#9ccc65" stroke={INK} strokeWidth={6} />
			<Maison f={f} />
			<g transform="translate(780 1020)"><Duo x={0} y={150} s={0.8} f={f} humeur="cool" /></g>
			{t > 42.6 && <g transform={`translate(480 980) scale(${pop(t, 42.6)})`}><circle r={90} fill="#bfe3f2" stroke={INK} strokeWidth={7} />{[0, 120, 240].map((a) => <ellipse key={a} cx={0} cy={-45} rx={22} ry={45} fill="#fff" stroke={INK} strokeWidth={4} transform={`rotate(${a + f * 25})`} />)}<circle r={14} fill={INK} />{txt(0, 150, 'CLIM', 50, '#2f6fb0')}</g>}
			{T(t, 40.6, 'LES BIJOUX DE FAMILLE', 92)}
			{t > 42.6 && T(t, 42.6, 'ONT BESOIN DE LA CLIM', 92, '#fff', 560)}
		</>)}
	</Plan>
);
export const PLANS_BIJOUX: [number, number, React.FC][] = [
	[0, 3.13, B01], [3.13, 9.47, B02], [9.47, 14.4, B03], [14.4, 21.47, B04], [21.47, 24.24, B05], [24.24, 31.25, B06], [31.25, 36.69, B07], [36.69, 40.53, B08], [40.53, 45.4, B09],
];
