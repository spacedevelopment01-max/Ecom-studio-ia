import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, FONT, rnd, lin, pop, Ciel, Nuage, Soleil, Humain, Mer} from './dessins';
import {ease, T, txt, Fond} from './commun_moyenage';

const T0 = (t: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => T(t, -1, texte, taille, c, y);
const YAMA = {couleur: '#2c3442', chapeau: 'aucun' as const, cheveux: '#1a1a1a', jambesC: '#23262e', cravate: '#8a1e1e'};

const Bandages: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y - 310 * s}) scale(${s})`}>
		<path d="M -78 -40 Q 0 -70 78 -40" stroke="#fff" strokeWidth={22} fill="none" /><path d="M -80 -18 Q 0 -44 80 -18" stroke="#eee" strokeWidth={14} fill="none" />
		<rect x={30} y={10} width={44} height={30} rx={6} fill="#fff" stroke={INK} strokeWidth={3} transform="rotate(-15 50 25)" />
	</g>
);
const Valise: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}><rect x={-50} y={-36} width={100} height={72} rx={8} fill="#6b4226" stroke={INK} strokeWidth={5} /><path d="M -20 -36 L -20 -50 L 20 -50 L 20 -36" stroke={INK} strokeWidth={6} fill="none" /></g>
);
const MaisonJp: React.FC<{x: number; y: number; s?: number; c?: string; detruite?: number}> = ({x, y, s = 1, c = '#efe2c4', detruite = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`} opacity={1}>
		<rect x={-110} y={-170} width={220} height={170} fill={detruite > 0.5 ? '#6a6058' : c} stroke={INK} strokeWidth={6} />
		{detruite < 0.5 ? <path d="M -160 -170 Q -120 -200 -90 -230 L 90 -230 Q 120 -200 160 -170 Z" fill="#3a3f4a" stroke={INK} strokeWidth={6} strokeLinejoin="round" /> : <path d="M -110 -170 L -60 -210 L -20 -175 L 40 -220 L 110 -170 Z" fill="#3a3530" stroke={INK} strokeWidth={6} />}
		{detruite < 0.5 && [[-70, -120], [30, -120]].map(([a, b], i) => <rect key={i} x={a} y={b} width={50} height={60} fill="#f6efd8" stroke={INK} strokeWidth={4} />)}
		<rect x={-25} y={-80} width={50} height={80} fill="#5a3a22" stroke={INK} strokeWidth={4} />
	</g>
);
const VilleJp: React.FC<{id: string; f: number; nuit?: boolean; detruite?: number; port?: boolean}> = ({id, f, nuit, detruite = 0, port}) => (
	<>
		<Ciel id={id} haut={nuit ? '#1a2240' : detruite ? '#6a5a50' : '#7cc4ea'} bas={nuit ? '#3a3a60' : detruite ? '#a08a78' : '#ffe6ad'} />
		{!nuit && !detruite && <><Soleil x={880} y={300} f={f} /><Nuage x={220} y={330} /></>}
		{port && <Mer y={1350} f={f} c="#2f6fa0" />}
		{[[120, 1.0], [360, 1.15], [600, 0.95], [840, 1.1], [1060, 0.9]].map(([x, s], i) => <MaisonJp key={i} x={x} y={port ? 1360 : 1430} s={s} c={['#efe2c4', '#f4e6cc', '#e8d6b0'][i % 3]} detruite={detruite} />)}
		{!port && <rect x={-900} y={1430} width={2900} height={1500} fill={detruite ? '#5a5048' : '#b8a888'} stroke={INK} strokeWidth={6} />}
		{nuit && Array.from({length: 14}).map((_, i) => <rect key={i} x={60 + i * 75} y={1240 + (i % 3) * 30} width={18} height={24} fill="#ffe08a" opacity={0.7 + Math.sin(f * 0.1 + i) * 0.3} />)}
	</>
);
const Champignon: React.FC<{x: number; y: number; k: number; s?: number; f: number}> = ({x, y, k, s = 1, f}) => k <= 0 ? null : (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<path d={`M -70 0 Q -50 ${-400 * k} -60 ${-700 * k} L 60 ${-700 * k} Q 50 ${-400 * k} 70 0 Z`} fill="#b8a898" stroke={INK} strokeWidth={6} />
		<g transform={`translate(0 ${-760 * k}) scale(${k})`}>
			{Array.from({length: 11}).map((_, i) => <circle key={i} cx={Math.cos(i * 0.6 + 3.1) * (160 + rnd(i) * 60)} cy={Math.sin(i * 0.6 + 3.1) * 90 - 40 + Math.sin(f * 0.05 + i) * 6} r={90 + rnd(i + 3) * 50} fill={i % 3 ? '#d8c8b8' : '#c0a890'} stroke={INK} strokeWidth={5} />)}
			<ellipse cx={0} cy={60} rx={260} ry={60} fill="#e8783a" opacity={0.6} />
		</g>
		<ellipse cx={0} cy={0} rx={320 * k} ry={60 * k} fill="#c0a890" stroke={INK} strokeWidth={5} />
	</g>
);
const Train: React.FC<{x: number; y: number; s?: number; f: number}> = ({x, y, s = 1, f}) => (
	<g transform={`translate(${x} ${y + Math.sin(f * 0.6) * 2}) scale(${s})`}>
		{[0, 1].map((w) => <g key={w} transform={`translate(${w * 420} 0)`}><rect x={-200} y={-220} width={400} height={200} rx={20} fill={w ? '#3a5a4a' : '#4a6a5a'} stroke={INK} strokeWidth={7} />{[-150, -60, 30, 120].map((k) => <rect key={k} x={k} y={-190} width={60} height={60} rx={6} fill="#f6efd8" stroke={INK} strokeWidth={4} />)}{[-130, 130].map((k) => <circle key={k} cx={k} cy={-10} r={34} fill="#333" stroke={INK} strokeWidth={6} transform={`rotate(${f * 20} ${k} -10)`} />)}</g>)}
	</g>
);
const Carte: React.FC<{x: number; y: number; s?: number; r?: number; haut: string; bas: string}> = ({x, y, s = 1, r = 0, haut, bas}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}><rect x={-190} y={-170} width={380} height={340} rx={20} fill="#fff" stroke={INK} strokeWidth={8} /><rect x={-190} y={-170} width={380} height={90} rx={20} fill="#c0392b" stroke={INK} strokeWidth={8} />{txt(0, -105, haut, 56, '#fff')}<text x={0} y={110} textAnchor="middle" fontFamily={FONT} fontSize={190} fill={INK}>{bas}</text></g>
);
const Flash = (t: number, a: number) => t > a && t < a + 0.8 ? <Ecran><rect x={-1500} y={-1500} width={4080} height={5000} fill="#fff" opacity={lin(t, [a, a + 0.8], [1, 0])} /></Ecran> : null;

export const Y01: React.FC = () => (
	<Plan debut={0} fin={2.5} sansEntree cam={(t) => ({z: lin(t, [0, 2.5], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<VilleJp id="y1" f={f} detruite={1} />
			<Champignon x={540} y={1430} k={1} s={1.05} f={f} />
			{T0(t, 'LA PIRE SEMAINE', 120)}
			{T(t, 0.8, "DE L'HISTOIRE", 120, '#fff', 560)}
		</>)}
	</Plan>
);
export const Y02: React.FC = () => (
	<Plan debut={2.5} fin={3.8} cam={(t) => ({z: lin(t, [2.5, 3.8], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#2a2a3a" />
			<Carte x={330} y={1100} s={pop(t, 2.55)} r={-6} haut="AOÛT" bas="6" />
			<Carte x={760} y={1150} s={pop(t, 2.9)} r={5} haut="AOÛT" bas="9" />
			{T(t, 2.55, 'ATTENDS LA FIN', 120)}
		</>)}
	</Plan>
);
export const Y03: React.FC = () => (
	<Plan debut={3.8} fin={8.6} cam={(t) => ({z: lin(t, [3.8, 8.6], [1.0, 1.2], ease), y: -150})}>
		{(t, f) => (<>
			<VilleJp id="y3" f={f} />
			<Humain x={lin(t, [3.9, 7.5], [-100, 520], ease)} y={1720} s={1.2} f={f} {...YAMA} pas={t < 7.5} pose="main" humeur="content" />
			<Valise x={lin(t, [3.9, 7.5], [-100, 520], ease) + 170} y={1520} s={1.1} />
			{T(t, 3.9, 'AOÛT 1945', 140)}
			{t > 5.7 && T(t, 5.7, 'HIROSHIMA', 120, '#fff', 560)}
			{t > 6.4 && <Ecran>{txt(540, 1250, 'TSUTOMU YAMAGUCHI', 76, '#FFD23F')}</Ecran>}
		</>)}
	</Plan>
);
export const Y04: React.FC = () => (
	<Plan debut={8.6} fin={12.0} secousse={(t) => (t > 9.5 ? 40 * lin(t, [9.5, 11], [1, 0.2]) : 0)} cam={(t) => ({z: lin(t, [8.6, 9.5, 12], [1.2, 1.0, 1.05], ease), y: -100})}>
		{(t, f) => (<>
			<VilleJp id="y4" f={f} detruite={t > 9.8 ? 1 : 0} />
			<Champignon x={540} y={1430} k={lin(t, [9.5, 11.2], [0, 1], Easing.out(Easing.cubic))} f={f} />
			{t > 10.3 && <g opacity={pop(t, 10.3)}><path d="M 150 1650 L 930 1650 M 150 1620 L 150 1680 M 930 1620 L 930 1680" stroke="#fff" strokeWidth={10} />{txt(540, 1760, '3 KM', 90, '#FFD23F')}</g>}
			{Flash(t, 9.5)}
			{T(t, 8.7, '6 AOÛT', 140)}
		</>)}
	</Plan>
);
export const Y05: React.FC = () => (
	<Plan debut={12.0} fin={13.5} cam={(t) => ({z: lin(t, [12, 13.5], [1.2, 1.35], ease), y: -250})}>
		{(t, f) => (<>
			<VilleJp id="y5" f={f} detruite={1} />
			<Humain x={540} y={1720} s={1.3} f={f} {...YAMA} humeur="triste" />
			{t > 12.8 && <Bandages x={540} y={1720} s={1.3} />}
			{T(t, 12.05, 'IL SURVIT', 130)}
			{t > 12.85 && T(t, 12.85, 'BRÛLÉ', 130, '#ff4b2b', 560)}
		</>)}
	</Plan>
);
export const Y06: React.FC = () => (
	<Plan debut={13.5} fin={14.7} cam={(t) => ({z: 1.0, x: lin(t, [13.5, 14.7], [-80, 80]), y: -100})}>
		{(t, f) => (<>
			<Ciel id="y6" /><Nuage x={220} y={330} />
			<rect x={-900} y={1350} width={2900} height={1500} fill="#9ccc65" stroke={INK} strokeWidth={6} />
			<rect x={-900} y={1400} width={2900} height={24} fill="#6a5a4a" />
			<Train x={lin(t, [13.5, 14.7], [100, 600])} y={1410} s={1.0} f={f} />
			{T(t, 13.55, 'IL RENTRE CHEZ LUI', 100)}
		</>)}
	</Plan>
);
export const Y07: React.FC = () => (
	<Plan debut={14.7} fin={17.1} cam={(t) => ({z: lin(t, [14.7, 15.8, 17.1], [1.0, 1.0, 1.2], ease), y: -150})}>
		{(t, f) => (<>
			<VilleJp id="y7" f={f} port />
			{T(t, 14.75, 'CHEZ LUI…', 120)}
			{t > 15.85 && <Ecran><g transform={`translate(540 1150) scale(${pop(t, 15.85)})`}><rect x={-380} y={-110} width={760} height={220} rx={24} fill="#fff" stroke={INK} strokeWidth={10} /><text x={0} y={45} textAnchor="middle" fontFamily={FONT} fontSize={140} fill="#c0392b">NAGASAKI</text></g></Ecran>}
		</>)}
	</Plan>
);
export const Y08: React.FC = () => (
	<Plan debut={17.1} fin={19.8} secousse={(t) => (t > 18.4 ? 40 * lin(t, [18.4, 19.8], [1, 0.2]) : 0)} cam={(t) => ({z: lin(t, [17.1, 18.4, 19.8], [1.15, 1.0, 1.05], ease), y: -100})}>
		{(t, f) => (<>
			<VilleJp id="y8" f={f} port detruite={t > 18.7 ? 1 : 0} />
			<Champignon x={540} y={1360} k={lin(t, [18.4, 19.7], [0, 1], Easing.out(Easing.cubic))} f={f} />
			{Flash(t, 18.4)}
			{T(t, 17.15, '3 JOURS PLUS TARD', 100)}
			{t > 18.4 && T(t, 18.4, '2E BOMBE', 130, '#ff4b2b', 560)}
		</>)}
	</Plan>
);
export const Y09: React.FC = () => (
	<Plan debut={19.8} fin={21.3} cam={(t) => ({z: lin(t, [19.8, 21.3], [1.3, 1.1], ease), y: -250})}>
		{(t, f) => (<>
			<VilleJp id="y9" f={f} detruite={1} port />
			<Humain x={540} y={1720} s={1.3} f={f} {...YAMA} humeur="choc" />
			<Bandages x={540} y={1720} s={1.3} />
			{T(t, 19.85, 'IL SURVIT ENCORE', 110, '#7be07b')}
		</>)}
	</Plan>
);
export const Y10: React.FC = () => (
	<Plan debut={21.3} fin={24.2} cam={(t) => ({z: lin(t, [21.3, 24.2], [1.0, 1.2], ease), y: -200})}>
		{(t, f) => (<>
			<Fond c="#f6ecd2" />
			<Humain x={400} y={1720} s={1.3} f={f} {...YAMA} cheveux="#e8e8e8" humeur="content" pose={t > 22.2 ? 'salut' : 'debout'} />
			{t > 22.2 && <g transform={`translate(800 1500) scale(${pop(t, 22.2)})`}><rect x={-140} y={-80} width={280} height={120} rx={14} fill="#f4c6d0" stroke={INK} strokeWidth={6} /><rect x={-140} y={-100} width={280} height={30} rx={10} fill="#fff" stroke={INK} strokeWidth={5} />{txt(0, 10, '93', 70, '#c0392b')}{[-80, 0, 80].map((k) => <g key={k}><rect x={k - 8} y={-160} width={16} height={60} fill="#7ac0ee" stroke={INK} strokeWidth={3} /><path d={`M ${k} -185 q -12 16 0 24 q 12 -8 0 -24 Z`} fill="#ffb43a" /></g>)}</g>}
			{T(t, 21.35, 'LE PLUS FOU ?', 120)}
			{t > 22.2 && T(t, 22.2, '93 ANS', 140, '#fff', 560)}
		</>)}
	</Plan>
);
export const Y11: React.FC = () => (
	<Plan debut={24.2} fin={29.4} cam={(t) => ({z: lin(t, [24.2, 29.4], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => (<>
			<Fond c="#e8eef0" />
			<Humain x={380} y={1720} s={1.25} f={f} {...YAMA} cheveux="#e8e8e8" humeur="neutre" pose="main" />
			{t > 25.5 && <g transform={`translate(780 1250) scale(${pop(t, 25.5)}) rotate(4)`}><rect x={-200} y={-260} width={400} height={520} rx={12} fill="#f6efd8" stroke={INK} strokeWidth={8} /><circle cx={0} cy={-150} r={50} fill="#c0392b" stroke={INK} strokeWidth={5} />{txt(0, -20, 'SURVIVANT', 44, INK)}{txt(0, 50, 'HIROSHIMA', 40, '#5a3a1a')}{txt(0, 110, '+', 50, '#5a3a1a')}{txt(0, 170, 'NAGASAKI', 40, '#5a3a1a')}</g>}
			{T(t, 24.3, 'LE SEUL AU MONDE', 110)}
			{t > 26.5 && T(t, 26.5, 'RECONNU OFFICIELLEMENT', 80, '#fff', 560)}
		</>)}
	</Plan>
);
export const PLANS_YAMA: [number, number, React.FC][] = [
	[0, 2.5, Y01], [2.5, 3.8, Y02], [3.8, 8.6, Y03], [8.6, 12.0, Y04], [12.0, 13.5, Y05], [13.5, 14.7, Y06], [14.7, 17.1, Y07], [17.1, 19.8, Y08], [19.8, 21.3, Y09], [21.3, 24.2, Y10], [24.2, 29.4, Y11],
];
