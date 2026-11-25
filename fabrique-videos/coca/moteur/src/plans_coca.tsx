import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, FONT, rnd, lin, pop, Ciel, Nuage, Soleil, Humain, Titre, Bulle, Tribunal, Marteau} from './dessins';

const ease = Easing.inOut(Easing.cubic);
const T = (t: number, a: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => <Ecran><Titre x={540} y={y} texte={texte} taille={taille} k={pop(t, a)} c={c} /></Ecran>;
const ROUGE = '#d42a2a', BLEU = '#1f4fa8';
const PATRON = {couleur: '#2c3442', chapeau: 'aucun' as const, cheveux: '#9a9a9a', jambesC: '#2c2f36', cravate: ROUGE};
const MULLINS = {couleur: '#c98a3a', chapeau: 'aucun' as const, cheveux: '#5a3a20', jambesC: '#3a4a6a', moustache: true};
const CLIENTS = [
	{couleur: '#2f6fb0', chapeau: 'aucun' as const, cheveux: '#3b2a1e', jambesC: '#2f3e5a'},
	{couleur: '#c0573a', chapeau: 'aucun' as const, cheveux: '#a0522d', jambesC: '#2f3e5a'},
	{couleur: '#3c8a4a', chapeau: 'aucun' as const, cheveux: '#c9a060', jambesC: '#2f3e5a'},
	{couleur: '#7a3fa0', chapeau: 'aucun' as const, cheveux: '#2b1a10', jambesC: '#2f3e5a'},
	{couleur: '#e0b21a', chapeau: 'aucun' as const, cheveux: '#6a4426', jambesC: '#2f3e5a'},
];
const Fond: React.FC<{c?: string}> = ({c = '#fbe7c6'}) => (<><rect x={-1500} y={-1500} width={4080} height={5000} fill={c} />{Array.from({length: 16}).map((_, i) => <path key={i} d="M 540 960 L 515 -800 L 565 -800 Z" fill="#fff" opacity={0.25} transform={`rotate(${i * 22.5} 540 960)`} />)}</>);
const Rue: React.FC<{id: string; f: number}> = ({id, f}) => (<><Ciel id={id} /><Soleil x={880} y={300} f={f} /><Nuage x={220} y={330} /><rect x={-800} y={1330} width={2680} height={1400} fill="#b8b2a6" stroke={INK} strokeWidth={6} /></>);
const Sol: React.FC<{c?: string; y?: number}> = ({c = '#c9b48a', y = 1450}) => <rect x={-800} y={y} width={2680} height={1300} fill={c} stroke={INK} strokeWidth={6} />;
const txt = (x: number, y: number, s: string, taille = 70, c = '#fff') => <text x={x} y={y} textAnchor="middle" fontFamily={FONT} fontSize={taille} fill={c} stroke={INK} strokeWidth={taille / 7} paintOrder="stroke">{s}</text>;

/* ---------- dessins de cette histoire ---------- */
const Canette: React.FC<{x: number; y: number; s?: number; r?: number; c?: string; mot?: string; bande?: string}> = ({x, y, s = 1, r = 0, c = ROUGE, mot = 'COCA', bande = '#fff'}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
		<rect x={-62} y={-230} width={124} height={230} rx={18} fill={c} stroke={INK} strokeWidth={7} />
		<rect x={-52} y={-244} width={104} height={22} rx={8} fill="#c9c9c9" stroke={INK} strokeWidth={6} />
		<path d="M -62 -150 Q 0 -110 62 -150 L 62 -128 Q 0 -88 -62 -128 Z" fill={bande} stroke={INK} strokeWidth={4} />
		<text x={0} y={-50} textAnchor="middle" fontFamily={FONT} fontSize={mot.length > 5 ? 30 : 40} fill="#fff" stroke={INK} strokeWidth={6} paintOrder="stroke">{mot}</text>
		<rect x={-44} y={-215} width={14} height={180} rx={7} fill="#fff" opacity={0.3} />
	</g>
);
const Carton: React.FC<{x: number; y: number; s?: number; r?: number}> = ({x, y, s = 1, r = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
		<rect x={-110} y={-140} width={220} height={140} fill="#c89a5e" stroke={INK} strokeWidth={6} />
		<rect x={-110} y={-140} width={220} height={34} fill={ROUGE} stroke={INK} strokeWidth={5} />
		<text x={0} y={-114} textAnchor="middle" fontFamily={FONT} fontSize={26} fill="#fff">COCA × 24</text>
		<path d="M -60 -60 L 60 -60" stroke="#9a7040" strokeWidth={6} />
	</g>
);
const Caddie: React.FC<{x: number; y: number; s?: number; f: number; children?: React.ReactNode}> = ({x, y, s = 1, f, children}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		{children}
		<path d="M -180 -230 L 170 -230 L 140 -60 L -150 -60 Z" fill="none" stroke="#7a7f88" strokeWidth={12} strokeLinejoin="round" />
		{[-120, -60, 0, 60, 120].map((k) => <line key={k} x1={k} y1={-230} x2={k * 0.85} y2={-60} stroke="#7a7f88" strokeWidth={6} />)}
		<path d="M 170 -230 L 230 -300" stroke="#7a7f88" strokeWidth={12} strokeLinecap="round" />
		{[-120, 110].map((k) => <circle key={k} cx={k} cy={-20} r={22} fill="#333" stroke={INK} strokeWidth={6} transform={`rotate(${f * 20} ${k} -20)`} />)}
	</g>
);
const Telephone: React.FC<{x: number; y: number; s?: number; f: number; sonne?: boolean; c?: string}> = ({x, y, s = 1, f, sonne, c = '#c0392b'}) => {
	const v = sonne ? Math.sin(f * 2.2) * 10 : 0;
	return (
		<g transform={`translate(${x} ${y}) scale(${s})`}>
			<path d="M -90 0 L -70 -90 L 70 -90 L 90 0 Z" fill={c} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
			<circle cx={0} cy={-45} r={30} fill="#f4f0e6" stroke={INK} strokeWidth={5} />
			<g transform={`translate(0 ${-110 - Math.abs(v)}) rotate(${v})`}>
				<path d="M -100 0 Q 0 -40 100 0 L 90 22 Q 0 -10 -90 22 Z" fill={c} stroke={INK} strokeWidth={6} />
			</g>
			{sonne && [0, 1, 2].map((i) => <path key={i} d={`M ${-120 - i * 20} ${-150 - i * 15} q -20 20 0 40 M ${120 + i * 20} ${-150 - i * 15} q 20 20 0 40`} stroke={INK} strokeWidth={6} fill="none" opacity={(Math.sin(f * 0.5 - i) + 1) / 2} />)}
		</g>
	);
};
const Pupitre: React.FC<{x: number; y: number}> = ({x, y}) => (
	<g transform={`translate(${x} ${y})`}>
		<path d="M -170 0 L -130 -300 L 130 -300 L 170 0 Z" fill="#7a4a2a" stroke={INK} strokeWidth={8} />
		<rect x={-190} y={-320} width={380} height={40} rx={10} fill="#5a3820" stroke={INK} strokeWidth={7} />
		{[-150, 150].map((k) => <g key={k}><line x1={k} y1={-320} x2={k * 0.75} y2={-380} stroke={INK} strokeWidth={8} /><ellipse cx={k * 0.75} cy={-390} rx={18} ry={24} fill="#333" stroke={INK} strokeWidth={5} /></g>)}
		<circle cx={0} cy={-170} r={60} fill={ROUGE} stroke={INK} strokeWidth={6} />
		{txt(0, -152, 'COCA', 40)}
	</g>
);
const Photographe: React.FC<{x: number; y: number; s?: number; f: number; flash: number; flip?: boolean; ph?: number}> = ({x, y, s = 1, f, flash, flip, ph = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
		<Humain x={0} y={0} s={1} f={f} ph={ph} couleur="#5a6070" chapeau="aucun" cheveux="#3b2a1e" jambesC="#2c2f36" pose="main" humeur="neutre" />
		<rect x={95} y={-260} width={110} height={80} rx={10} fill="#2a2a2a" stroke={INK} strokeWidth={6} />
		<circle cx={150} cy={-220} r={24} fill="#8fb8d8" stroke={INK} strokeWidth={5} />
		<rect x={170} y={-300} width={34} height={30} fill="#ddd" stroke={INK} strokeWidth={4} />
		{flash > 0 && <circle cx={187} cy={-290} r={60 + flash * 140} fill="#fff" opacity={flash} />}
	</g>
);
const flashDe = (t: number, k: number) => { const p = (t * 1.3 + rnd(k) * 3) % 1.6; return p < 0.15 ? 1 - p / 0.15 : 0; };

/* ---------- les plans ---------- */
export const C01: React.FC = () => (
	<Plan debut={0} fin={6.6} sansEntree cam={(t) => ({z: lin(t, [0, 6.6], [1.0, 1.18], ease), y: -60})}>
		{(t, f) => {
			const recule = lin(t, [5.2, 6.4], [0, 1], ease);
			return (<>
				<Fond />
				<g transform={`translate(540 ${1450 - Math.sin(f * 0.1) * 10}) scale(${pop(t, 0.2) * 1.7}) rotate(${-recule * 360})`}><Canette x={0} y={0} mot={t > 1.9 ? 'NOUVEAU' : 'COCA'} /></g>
				{t > 1.9 && t < 3.3 && Array.from({length: 8}).map((_, i) => <circle key={i} cx={540 + Math.cos(i) * lin(t, [1.9, 2.6], [0, 330])} cy={1200 + Math.sin(i) * lin(t, [1.9, 2.6], [0, 330])} r={20} fill="#fff" stroke={INK} strokeWidth={4} />)}
				{t > 3.4 && <g transform={`translate(540 860) scale(${pop(t, 3.4)}) rotate(-4)`}><rect x={-270} y={-110} width={540} height={220} rx={28} fill="#fff" stroke={INK} strokeWidth={10} /><text x={0} y={40} textAnchor="middle" fontFamily={FONT} fontSize={120} fill={ROUGE}>{Math.min(79, Math.round(lin(t, [3.4, 4.8], [1, 79])))} JOURS</text></g>}
				{T(t, 0.2, '1985', 170)}
				{T(t, 5.3, 'MARCHE ARRIÈRE', 110, '#ff4b2b', 560)}
			</>);
		}}
	</Plan>
);

export const C02: React.FC = () => (
	<Plan debut={6.6} fin={9.3} cam={(t) => ({z: lin(t, [6.6, 9.3], [1.15, 1.3], ease), y: -120})}>
		{(t, f) => {
			const k = lin(t, [7.6, 8.8], [0, 1], ease);
			return (<>
				<Fond c="#e6eef8" />
				<rect x={60} y={1500} width={960} height={14} fill={INK} />
				<g transform={`translate(${340 - k * 60} ${1500 + k * 60}) rotate(${-k * 8})`}><Canette x={0} y={0} s={1.5} /></g>
				<g transform={`translate(${740 + k * 20} ${1500 - k * 120}) rotate(${k * 6})`}><Canette x={0} y={0} s={1.5 + k * 0.25} c={BLEU} mot="PEPSI" bande={ROUGE} /></g>
				{t > 8.0 && <path d="M 900 1050 l 0 -160 l -50 60 m 50 -60 l 50 60" stroke="#3c8a4a" strokeWidth={22} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={pop(t, 8.0)} />}
				{T(t, 7.3, 'PEPSI GAGNE DU TERRAIN', 88)}
			</>);
		}}
	</Plan>
);

export const C03: React.FC = () => (
	<Plan debut={9.3} fin={13.75} cam={(t) => ({z: lin(t, [9.3, 13.75], [1.3, 1.1], ease), y: -200})}>
		{(t, f) => (<>
			<Fond c="#fdeede" />
			<Sol c="#9a7a58" />
			<g transform="translate(540 1150)"><Canette x={0} y={0} s={1.5} mot="NOUVEAU" /></g>
			{t > 11.5 && Array.from({length: 6}).map((_, i) => { const y = lin(t, [11.5 + i * 0.12, 12.0 + i * 0.12], [500, 840]); return y < 840 ? <rect key={i} x={480 + (i % 3) * 40} y={y} width={44} height={44} rx={6} fill="#fff" stroke={INK} strokeWidth={5} /> : null; })}
			{t > 12.4 && CLIENTS.map((c, i) => <Humain key={i} x={110 + i * 215} y={1780} s={0.7} f={f} {...c} pose="main" humeur="perplexe" ph={i} flip={i > 2} />)}
			{T(t, 9.5, 'NOUVELLE RECETTE', 110)}
			{T(t, 11.6, 'PLUS SUCRÉE', 110, '#fff', 560)}
		</>)}
	</Plan>
);

export const C04: React.FC = () => (
	<Plan debut={13.75} fin={16.0} cam={(t) => ({z: lin(t, [13.75, 16.0], [1.1, 1.3], ease), y: -200})}>
		{(t, f) => (<>
			<Fond c="#e6f2dc" />
			<Sol c="#9a7a58" />
			{CLIENTS.slice(0, 3).map((c, i) => <Humain key={i} x={230 + i * 310} y={1650} s={1.0} f={f} {...c} pose={t > 14.8 ? 'salut' : 'debout'} humeur={t > 14.8 ? 'content' : 'perplexe'} ph={i} />)}
			{t > 14.8 && <g transform={`translate(540 860) scale(${pop(t, 14.8)}) rotate(-4)`}><rect x={-160} y={-120} width={320} height={240} rx={14} fill="#fbf3dc" stroke={INK} strokeWidth={8} /><path d="M -70 0 L -15 55 L 85 -60" stroke="#3c8a4a" strokeWidth={26} fill="none" strokeLinecap="round" /></g>}
			{T(t, 13.9, 'TESTS', 140)}
			{T(t, 14.9, 'ILS PRÉFÈRENT', 110, '#7be07b', 560)}
		</>)}
	</Plan>
);

export const C05: React.FC = () => (
	<Plan debut={16.0} fin={23.65} cam={(t) => ({z: lin(t, [16.0, 19.2, 23.65], [1.0, 1.2, 1.4], ease), y: lin(t, [16, 19.2, 23.65], [-150, -260, -200], ease)})}>
		{(t, f) => (<>
			<Fond c="#f1e3d0" />
			<rect x={-800} y={500} width={2680} height={180} fill={ROUGE} stroke={INK} strokeWidth={6} />
			{txt(540, 620, 'CONFÉRENCE DE PRESSE', 70)}
			<Sol c="#6b4a3a" />
			<Humain x={540} y={1450} s={1.1} f={f} {...PATRON} pose={t > 22.3 ? 'main' : 'debout'} humeur={t > 22.3 ? 'content' : 'neutre'} />
			<Pupitre x={540} y={1560} />
			{t > 20.3 && t < 22.3 && <g transform={`translate(200 1200) scale(${pop(t, 20.3)})`}><Canette x={0} y={0} s={1.1} />{t > 21.4 && <path d="M -90 -260 L 90 20 M 90 -260 L -90 20" stroke="#c0392b" strokeWidth={22} strokeLinecap="round" />}</g>}
			{t > 22.3 && <g transform={`translate(860 1250) scale(${pop(t, 22.3)}) rotate(${Math.sin(f * 0.2) * 4})`}><Canette x={0} y={0} s={1.2} mot="NOUVEAU" bande="#ffd23f" /></g>}
			{T(t, 16.1, '23 AVRIL 1985', 130)}
			{t > 21.4 && T(t, 21.4, "C'EST FINI", 120, '#ff4b2b', 560)}
		</>)}
	</Plan>
);

export const C06: React.FC = () => (
	<Plan debut={23.65} fin={25.8} secousse={(t) => (t > 24.4 ? 40 * lin(t, [24.4, 25.8], [1, 0.4]) : 0)} cam={(t) => ({z: lin(t, [23.65, 24.4, 25.8], [1.0, 1.0, 1.25], ease), y: -120})}>
		{(t, f) => (<>
			<Rue id="c6" f={f} />
			{CLIENTS.concat(CLIENTS).map((c, i) => <Humain key={i} x={80 + (i % 5) * 230} y={1500 + Math.floor(i / 5) * 260} s={0.85} f={f * (t > 24.4 ? 1.6 : 1)} {...c} pose={t > 24.4 ? 'crie' : 'debout'} humeur={t > 24.4 ? 'crie' : 'neutre'} ph={i} flip={i % 2 === 1} />)}
			{t > 24.4 && Array.from({length: 10}).map((_, i) => <text key={i} x={80 + (i % 5) * 230} y={1060 + Math.floor(i / 5) * 260} textAnchor="middle" fontFamily={FONT} fontSize={80} fill="#c0392b" stroke={INK} strokeWidth={8} paintOrder="stroke" opacity={pop(t, 24.4 + i * 0.05)}>!!</text>)}
			{T(t, 24.4, "L'AMÉRIQUE EXPLOSE", 100, '#ff4b2b')}
		</>)}
	</Plan>
);

export const C07: React.FC = () => (
	<Plan debut={25.8} fin={29.75} cam={(t) => ({z: 1.1, y: -200})}>
		{(t, f) => {
			const n = Math.floor(lin(t, [26.4, 29.4], [0, 7]));
			return (<>
				<rect x={-800} y={-800} width={2680} height={3600} fill="#eef0e6" />
				{[0, 1, 2].map((r) => <g key={r}><rect x={-700} y={700 + r * 260} width={2480} height={24} fill="#7a7f88" stroke={INK} strokeWidth={5} />{Array.from({length: 14}).map((_, i) => (r * 14 + i) % 9 < 9 - n ? <Carton key={i} x={-620 + i * 180} y={700 + r * 260} s={0.75} /> : null)}</g>)}
				<Sol c="#d8d2c2" />
				<g transform={`translate(${lin(t, [25.8, 29.75], [200, 560])} 0)`}>
					<Caddie x={150} y={1700} s={1.1} f={f}>{Array.from({length: Math.min(n + 2, 9)}).map((_, i) => <Carton key={i} x={-110 + (i % 3) * 110} y={-80 - Math.floor(i / 3) * 95} s={0.5} />)}</Caddie>
					<Humain x={-120} y={1700} s={1.0} f={f} {...CLIENTS[1]} pas humeur="choc" />
				</g>
				{T(t, 26.0, 'TOUT LE MONDE STOCKE', 96)}
				{T(t, 28.6, 'PAR CARTONS ENTIERS', 96, '#fff', 560)}
			</>);
		}}
	</Plan>
);

export const C08: React.FC = () => (
	<Plan debut={29.75} fin={33.3} cam={(t) => ({z: lin(t, [29.75, 33.3], [1.1, 1.35], ease), y: -200})}>
		{(t, f) => (<>
			<Fond c="#e6e1f2" />
			<Sol c="#8a8f9a" y={1400} />
			{[0, 1, 2].map((i) => <g key={i}><rect x={60 + i * 330} y={1400} width={300} height={40} fill="#7a4a2a" stroke={INK} strokeWidth={6} /><Humain x={210 + i * 330} y={1700} s={0.85} f={f * 1.3} {...CLIENTS[(i + 2) % 5]} pose="main" humeur={t > 31.0 ? 'choc' : 'perplexe'} ph={i} /><Telephone x={150 + i * 330} y={1400} s={0.6} f={f + i * 7} sonne /></g>)}
			{Array.from({length: Math.floor(lin(t, [30.0, 33.0], [0, 9]))}).map((_, i) => <Bulle key={i} x={140 + (i % 3) * 400 + rnd(i) * 60} y={720 + Math.floor(i / 3) * 170} w={230} h={120} k={pop(t, 30.0 + i * 0.33)} queue={[0, 90]}><text x={0} y={22} textAnchor="middle" fontFamily={FONT} fontSize={60} fill="#c0392b">{['GRRR', '!!!', 'RENDEZ-LE', '#@!', 'NON !', '!!!', 'SCANDALE', 'GRRR', '?!'][i]}</text></Bulle>)}
			{T(t, 29.9, 'LE STANDARD CROULE', 100)}
		</>)}
	</Plan>
);

export const C09: React.FC = () => (
	<Plan debut={33.3} fin={36.2} cam={(t) => ({z: lin(t, [33.3, 36.2], [1.25, 1.45], ease), y: -230})}>
		{(t, f) => (<>
			<Fond c="#f6dada" />
			<Humain x={340} y={1650} s={1.3} f={f} {...CLIENTS[3]} pose="main" humeur="triste" />
			<g transform="translate(530 1440) rotate(10)"><Canette x={0} y={0} s={0.6} /></g>
			{[0, 1].map((i) => { const y = ((t * 300 + i * 120) % 240); return <circle key={i} cx={312 + i * 50} cy={1250 + y} r={10} fill="#7ac0ee" stroke={INK} strokeWidth={3} />; })}
			<Bulle x={700} y={900} w={560} h={420} k={pop(t, 33.6)} queue={[-220, 300]} pensee>
				<Humain x={-90} y={150} s={0.55} f={f} {...CLIENTS[3]} pose="salut" humeur="content" />
				<Canette x={110} y={150} s={0.7} />
				<text x={0} y={-140} textAnchor="middle" fontFamily={FONT} fontSize={48} fill={INK}>ÉTÉ 1960</text>
			</Bulle>
			{T(t, 34.4, 'ON M\'A VOLÉ MON ENFANCE', 84, '#fff', 400)}
		</>)}
	</Plan>
);

export const C10: React.FC = () => (
	<Plan debut={36.2} fin={41.4} cam={(t) => ({z: lin(t, [36.2, 38.6, 41.4], [1.35, 1.15, 1.1], ease), y: lin(t, [36.2, 38.6], [-250, -160], ease)})}>
		{(t, f) => (<>
			<Rue id="c10" f={f} />
			{t > 39.0 && <g transform={`translate(540 980) scale(${pop(t, 39.0)}) rotate(-2)`}><rect x={-450} y={-130} width={900} height={260} rx={20} fill="#fff" stroke={INK} strokeWidth={10} /><text x={0} y={-25} textAnchor="middle" fontFamily={FONT} fontSize={66} fill={ROUGE}>ANCIENS BUVEURS</text><text x={0} y={70} textAnchor="middle" fontFamily={FONT} fontSize={66} fill={ROUGE}>DE COLA D'AMÉRIQUE</text></g>}
			<Humain x={540} y={1640} s={1.2} f={f} {...MULLINS} pose={t > 39.0 ? 'crie' : 'debout'} humeur={t > 39.0 ? 'crie' : 'fache'} />
			{t > 39.0 && [0, 1, 2, 3].map((i) => <Humain key={i} x={[120, 280, 800, 960][i]} y={1720} s={0.75} f={f} {...CLIENTS[i]} pose="crie" humeur="crie" ph={i} flip={i > 1} />)}
			{T(t, 36.9, 'GAY MULLINS', 130)}
		</>)}
	</Plan>
);

export const C11: React.FC = () => (
	<Plan debut={41.4} fin={46.8} cam={(t) => ({z: lin(t, [41.4, 44.5, 46.8], [1.1, 1.25, 1.2], ease), y: -180})}>
		{(t, f) => t < 44.5 ? (<>
			<Fond c="#fbf3dc" />
			<rect x={-800} y={1250} width={2680} height={60} fill="#7a4a2a" stroke={INK} strokeWidth={6} />
			<Sol c="#8a6a4a" y={1310} />
			{Array.from({length: Math.min(6, Math.floor(lin(t, [41.6, 43.2], [1, 7])))}).map((_, i) => <Telephone key={i} x={140 + i * 160} y={1250} s={0.55} f={f + i * 5} sonne c={['#c0392b', '#2f6fb0', '#3c8a4a', '#e0b21a', '#7a3fa0', '#e07a1e'][i]} />)}
			<Humain x={540} y={1800} s={0.9} f={f} {...MULLINS} pose="main" humeur="content" />
			{T(t, 41.6, 'LIGNES DES PLAINTES', 100)}
		</>) : (<>
			<Tribunal />
			<Humain x={300} y={1650} s={1.0} f={f} {...MULLINS} pose="main" humeur="fache" />
			<Humain x={800} y={1650} s={1.0} f={f} {...PATRON} humeur="choc" flip />
			<Marteau x={540} y={880} s={1.3} r={lin(t, [45.0, 45.2, 45.4], [-40, 20, -20])} />
			{T(t, 44.7, 'PROCÈS !', 150, '#ff4b2b')}
		</>)}
	</Plan>
);

export const C12: React.FC = () => (
	<Plan debut={46.8} fin={49.5} cam={(t) => ({z: lin(t, [46.8, 49.5], [1.15, 1.35], ease), y: -230})}>
		{(t, f) => {
			const k = lin(t, [47.9, 48.9], [0, 1]);
			return (<>
				<Fond c="#e8eef0" />
				<Sol c="#6b4a3a" />
				<Humain x={540} y={1650} s={1.25} f={f} {...PATRON} pose="blanc" humeur="triste" />
				{t > 47.9 && <g transform={`translate(${380 - k * 300} ${1350 - Math.sin(k * Math.PI) * 400 + k * 250}) rotate(${k * 500})`}><rect x={-70} y={-40} width={140} height={80} rx={20} fill="#f2d04a" stroke={INK} strokeWidth={6} />{[0, 1, 2, 3].map((i) => <circle key={i} cx={-40 + i * 27} cy={-5 + (i % 2) * 15} r={8} fill="#d8b030" />)}</g>}
				{T(t, 46.9, '11 JUILLET', 130)}
				{T(t, 48.0, "COCA JETTE L'ÉPONGE", 92, '#fff', 560)}
			</>);
		}}
	</Plan>
);

export const C13: React.FC = () => (
	<Plan debut={49.5} fin={54.0} cam={(t) => ({z: lin(t, [49.5, 54.0], [1.0, 1.2], ease), y: -120})}>
		{(t, f) => (<>
			<Fond />
			<g transform={`translate(540 ${1400 - Math.sin(f * 0.1) * 10}) scale(${pop(t, 49.7) * 1.7})`}><Canette x={0} y={0} mot={t > 52.3 ? 'CLASSIC' : 'COCA'} /></g>
			{t > 52.3 && Array.from({length: 12}).map((_, i) => <rect key={i} x={540 + Math.cos(i * 0.52) * lin(t, [52.3, 53.3], [100, 520])} y={1050 + Math.sin(i * 0.52) * lin(t, [52.3, 53.3], [100, 520]) + lin(t, [52.3, 54], [0, 200])} width={26} height={16} fill={['#ffd23f', '#ff4b2b', '#7be07b', '#2f6fb0'][i % 4]} transform={`rotate(${i * 40 + t * 300} ${540 + Math.cos(i * 0.52) * 300} 1050)`} />)}
			{T(t, 49.7, 'LE RETOUR', 140)}
			{T(t, 52.3, 'COCA-COLA CLASSIC', 100, '#fff', 560)}
		</>)}
	</Plan>
);

export const C14: React.FC = () => (
	<Plan debut={54.0} fin={58.1} cam={(t) => ({z: lin(t, [54.0, 56.8, 58.1], [1.3, 1.3, 1.1], ease), y: -200})}>
		{(t, f) => (<>
			<Fond c="#fdeede" />
			<Sol c="#9a7a58" />
			<g transform={`translate(${t > 56.8 ? 700 : 540} 1600) scale(${pop(t, 54.2)})`}>
				<rect x={-200} y={-180} width={400} height={180} fill={ROUGE} stroke={INK} strokeWidth={8} />
				{[-150, -75, 0, 75, 150].map((k) => <ellipse key={k} cx={k} cy={-185} rx={30} ry={12} fill="#c9c9c9" stroke={INK} strokeWidth={5} />)}
				{txt(0, -70, 'CAISSE N°1', 52)}
			</g>
			{t < 56.8 && <text x={540} y={1250} textAnchor="middle" fontFamily={FONT} fontSize={260} fill="#ffd23f" stroke={INK} strokeWidth={22} paintOrder="stroke" opacity={pop(t, 55.0)}>?</text>}
			{t > 56.8 && <Humain x={300} y={1680} s={1.15} f={f} {...MULLINS} pose="salut" humeur="content" />}
			{T(t, 54.4, 'LA TOUTE PREMIÈRE CAISSE', 86)}
			{T(t, 56.8, 'GAY MULLINS !', 120, '#fff', 560)}
		</>)}
	</Plan>
);

export const C15: React.FC = () => (
	<Plan debut={58.1} fin={62.95} cam={(t) => ({z: lin(t, [58.1, 60.7, 62.95], [1.0, 1.3, 1.45], ease), y: lin(t, [58.1, 60.7], [-120, -330], ease)})}>
		{(t, f) => {
			const verse = lin(t, [60.8, 61.3], [0, 1], ease);
			const head = {x: 540, y: 1680 - 310 * 1.2};
			return (<>
				<Fond c="#f1e3d0" />
				<Sol c="#6b4a3a" y={1680} />
				<Humain x={540} y={1680} s={1.2} f={f} {...MULLINS} pose={t > 59.3 ? 'main' : 'debout'} humeur={t > 60.8 ? 'pouffe' : 'content'} />
				{t > 59.3 && t < 60.8 && <Canette x={710} y={1430} s={0.55} r={-30} />}
				{t > 60.8 && <g transform={`translate(${head.x + 30} ${head.y - 230}) rotate(${150 * verse})`}><Canette x={0} y={0} s={0.55} /></g>}
				{t > 61.1 && Array.from({length: 14}).map((_, i) => { const p = ((t - 61.1) * 3 + i / 14) % 1; return <ellipse key={i} cx={head.x + (rnd(i) - 0.5) * 140} cy={head.y - 180 + p * 420} rx={10} ry={18} fill="#5a2a12" stroke={INK} strokeWidth={3} />; })}
				{t > 61.3 && <path d={`M ${head.x - 90} ${head.y - 70} Q ${head.x} ${head.y - 130} ${head.x + 90} ${head.y - 70} L ${head.x + 80} ${head.y + 10} L ${head.x + 60} ${head.y - 30} L ${head.x + 20} ${head.y + 30} L ${head.x - 30} ${head.y - 30} L ${head.x - 80} ${head.y + 20} Z`} fill="#5a2a12" opacity={0.85} stroke={INK} strokeWidth={4} />}
				<Photographe x={170} y={1760} s={0.7} f={f} flash={flashDe(t, 1)} ph={1} />
				<Photographe x={910} y={1760} s={0.7} f={f} flash={flashDe(t, 2)} flip ph={2} />
				{T(t, 58.2, 'DEVANT LES JOURNALISTES', 86)}
				{T(t, 61.4, 'SUR LA TÊTE', 130, '#ff4b2b', 560)}
			</>);
		}}
	</Plan>
);

export const C16: React.FC = () => (
	<Plan debut={62.95} fin={67.4} cam={(t) => ({z: lin(t, [62.95, 67.4], [1.05, 1.2], ease), y: -100})}>
		{(t, f) => {
			const k = lin(t, [65.2, 67.0], [0, 1], ease);
			const pts = [[160, 1200], [330, 1150], [480, 1240], [620, 1080], [760, 920], [900, 720]].slice(0, 2 + Math.ceil(k * 4));
			return (<>
				<Fond c="#e6f2dc" />
				<rect x={120} y={660} width={840} height={640} rx={20} fill="#fff" stroke={INK} strokeWidth={8} />
				{t > 65.0 && <polyline points={pts.map((p) => p.join(' ')).join(' ')} fill="none" stroke="#3c8a4a" strokeWidth={22} strokeLinejoin="round" strokeLinecap="round" />}
				{k > 0.95 && <path d="M 900 720 l -70 10 m 70 -10 l -10 70" stroke="#3c8a4a" strokeWidth={22} strokeLinecap="round" />}
				{t > 65.0 && <g transform={`translate(860 1270) scale(${pop(t, 65.6)})`}><Canette x={0} y={0} s={0.7} mot="CLASSIC" /></g>}
				{txt(330, 1270, 'VENTES', 70, '#3c8a4a')}
				{T(t, 63.0, 'LE PLUS FOU ?', 120, '#FFD23F', 330)}
				{T(t, 66.0, 'ENCORE MIEUX', 100, '#7be07b', 480)}
			</>);
		}}
	</Plan>
);

export const C17: React.FC = () => (
	<Plan debut={67.4} fin={72.4} cam={(t) => ({z: lin(t, [67.4, 71.0], [1.1, 1.35], ease), y: -150})}>
		{(t, f) => (<>
			<Fond c="#fbe0e4" />
			{t > 69.4 && <path d="M 540 1180 C 540 1100 420 1000 330 1060 C 210 1140 300 1300 540 1460 C 780 1300 870 1140 750 1060 C 660 1000 540 1100 540 1180 Z" transform={`translate(540 1230) scale(${pop(t, 69.4) * (1.6 + Math.sin(f * 0.25) * 0.05)}) translate(-540 -1230)`} fill="#ff6b81" stroke={INK} strokeWidth={6} />}
			<g transform="translate(540 1450)"><Canette x={0} y={0} s={1.3} mot="CLASSIC" /></g>
			{CLIENTS.slice(0, 4).map((c, i) => <Humain key={i} x={[120, 300, 780, 960][i]} y={1800} s={0.75} f={f} {...c} humeur={t > 69.4 ? 'content' : 'triste'} pose={t > 69.4 ? 'salut' : 'debout'} ph={i} flip={i > 1} />)}
			{t < 70.9 && T(t, 67.6, 'IL FALLAIT LE PERDRE…', 92)}
			{T(t, 70.9, 'FIN', 170)}
		</>)}
	</Plan>
);

export const PLANS_COCA: [number, number, React.FC][] = [
	[0, 6.6, C01], [6.6, 9.3, C02], [9.3, 13.75, C03], [13.75, 16.0, C04], [16.0, 23.65, C05], [23.65, 25.8, C06], [25.8, 29.75, C07],
	[29.75, 33.3, C08], [33.3, 36.2, C09], [36.2, 41.4, C10], [41.4, 46.8, C11], [46.8, 49.5, C12], [49.5, 54.0, C13], [54.0, 58.1, C14],
	[58.1, 62.95, C15], [62.95, 67.4, C16], [67.4, 72.4, C17],
];
