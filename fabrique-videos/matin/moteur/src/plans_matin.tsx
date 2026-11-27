import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, FONT, rnd, lin, pop, Humain, Bulle} from './dessins';
import {ease, T, txt, Fond} from './commun_moyenage';

const T0 = (t: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => T(t, -1, texte, taille, c, y);
const PEAU = '#f5c9a0';

const Chambre: React.FC<{nuit?: boolean; f: number}> = ({nuit, f}) => (
	<>
		<rect x={-1500} y={-1500} width={4080} height={5000} fill={nuit ? '#2a3050' : '#cfe3f0'} />
		<g transform="translate(820 700)"><rect x={-170} y={-200} width={340} height={360} fill={nuit ? '#0d1530' : '#9fd3f0'} stroke={INK} strokeWidth={10} /><path d="M 0 -200 L 0 160 M -170 -20 L 170 -20" stroke={INK} strokeWidth={8} />{nuit ? <circle cx={60} cy={-110} r={45} fill="#f4f0c8" /> : <circle cx={60} cy={-110} r={55} fill="#ffd84a" />}{nuit && [0, 1, 2].map((i) => <circle key={i} cx={-100 + i * 50} cy={60 - i * 40} r={4} fill="#fff" />)}</g>
		<rect x={-800} y={1550} width={2680} height={1300} fill={nuit ? '#3a3a5a' : '#c8a87a'} stroke={INK} strokeWidth={6} />
	</>
);
const Lit: React.FC<{f: number; tente?: number; yeux?: 'dort' | 'ouvert' | 'choc' | 'fier'}> = ({f, tente = 0, yeux = 'dort'}) => {
	const respire = Math.sin(f * 0.08) * 6;
	return (
		<g>
			<rect x={40} y={1260} width={1000} height={300} rx={20} fill="#8a5a35" stroke={INK} strokeWidth={8} />
			<rect x={40} y={1120} width={60} height={440} rx={10} fill="#7a4a2a" stroke={INK} strokeWidth={7} />
			<ellipse cx={220} cy={1230} rx={130} ry={60} fill="#fff" stroke={INK} strokeWidth={6} />
			<g transform="translate(240 1180)">
				<circle r={78} fill={PEAU} stroke={INK} strokeWidth={6} />
				<path d="M -70 -30 Q -40 -90 30 -80 Q 80 -60 72 -20 Q 30 -60 -70 -30 Z" fill="#3b2a1e" stroke={INK} strokeWidth={5} />
				{yeux === 'dort' ? <><path d="M -36 4 q 12 10 24 0 M 12 4 q 12 10 24 0" stroke={INK} strokeWidth={5} fill="none" />{txt(110, -80 - (f % 60), 'Z', 50 + (f % 60) / 2, '#fff')}</> : yeux === 'fier' ? <path d="M -36 0 q 12 -12 24 0 M 12 0 q 12 -12 24 0" stroke={INK} strokeWidth={5} fill="none" /> : <><circle cx={-24} cy={0} r={yeux === 'choc' ? 14 : 10} fill="#fff" stroke={INK} strokeWidth={3} /><circle cx={24} cy={0} r={yeux === 'choc' ? 14 : 10} fill="#fff" stroke={INK} strokeWidth={3} /><circle cx={-24} cy={2} r={5} fill={INK} /><circle cx={24} cy={2} r={5} fill={INK} /></>}
				<path d={yeux === 'fier' ? 'M -20 34 Q 0 50 20 34' : yeux === 'choc' ? 'M -10 32 Q 0 48 10 32 Z' : 'M -14 36 L 14 36'} stroke={INK} strokeWidth={5} fill={yeux === 'choc' ? '#5a1a1a' : 'none'} />
			</g>
			<path d={`M 300 ${1250 + respire} Q 450 ${1200 + respire} 560 ${1230 + respire} L ${600} ${1230 - tente * 200} L ${680} ${1235 + respire} Q 850 ${1220 + respire} 1020 ${1250 + respire} L 1020 1450 L 300 1450 Z`} fill="#4a7ac0" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
			{[400, 520, 760, 900].map((k) => <circle key={k} cx={k} cy={1350} r={14} fill="#6a9ae0" />)}
		</g>
	);
};
const Cerveau: React.FC<{x: number; y: number; s?: number; children?: React.ReactNode}> = ({x, y, s = 1, children}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<path d="M -330 60 Q -380 -120 -240 -220 Q -150 -330 0 -300 Q 150 -330 250 -230 Q 380 -120 330 60 Q 320 200 150 220 Q 0 260 -150 220 Q -320 200 -330 60 Z" fill="#f4b6c0" stroke={INK} strokeWidth={10} />
		{[[-200, -150, -80, -100], [60, -220, 180, -120], [-250, 40, -120, 0], [100, 30, 250, 80], [-60, 120, 60, 160]].map(([a, b, c, d], i) => <path key={i} d={`M ${a} ${b} Q ${(a + c) / 2} ${b - 60} ${c} ${d}`} stroke="#d88a98" strokeWidth={10} fill="none" strokeLinecap="round" />)}
		{children}
	</g>
);
const Vigile: React.FC<{x: number; y: number; s?: number; f: number; dort?: boolean}> = ({x, y, s = 1, f, dort}) => (
	<g>
		<Humain x={x} y={y} s={s} f={f} couleur="#2a3a5a" chapeau="kepi" cheveux="#3b2a1e" jambesC="#1a2238" humeur={dort ? 'neutre' : 'fache'} pose={dort ? 'debout' : 'main'} />
		{!dort && <g transform={`translate(${x + 150 * s} ${y - 190 * s})`}><rect x={-14} y={-50} width={28} height={70} rx={8} fill="#333" stroke={INK} strokeWidth={4} /><path d="M 0 -50 L -80 -200 L 80 -200 Z" fill="#ffe98a" opacity={0.5} /></g>}
		{dort && <><rect x={x - 70 * s} y={y - 360 * s} width={140 * s} height={30 * s} fill={PEAU} />{txt(x + 90 * s, y - 380 * s - (f % 50), 'Z', 40 + (f % 50) / 2, '#fff')}{txt(x + 130 * s, y - 440 * s - (f % 50), 'z', 30, '#fff')}</>}
		{dort && <g transform={`translate(${x - 18 * s} ${y - 330 * s})`}><path d="M 0 0 q 10 8 20 0 M 30 0 q 10 8 20 0" stroke={INK} strokeWidth={4} fill="none" /></g>}
	</g>
);
const Timbres: React.FC<{x: number; y: number; s?: number; dechire?: number}> = ({x, y, s = 1, dechire = 0}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		{[0, 1, 2, 3, 4].map((i) => {
			const dx = i >= 3 ? dechire * 60 : 0, r = i >= 3 ? dechire * 12 : 0;
			return <g key={i} transform={`translate(${-250 + i * 125 + dx} 0) rotate(${r})`}><rect x={-58} y={-80} width={116} height={160} fill="#fff" stroke={INK} strokeWidth={5} strokeDasharray="10 6" /><rect x={-44} y={-64} width={88} height={100} fill={['#c0392b', '#2f6fb0', '#3c8a4a', '#e0b21a', '#7a3fa0'][i]} /><text x={0} y={66} textAnchor="middle" fontFamily={FONT} fontSize={26} fill={INK}>0,20 €</text></g>;
		})}
		{dechire > 0.3 && <path d="M 80 -90 l 10 30 l -14 25 l 12 30 l -10 30 l 14 30" stroke="#c0392b" strokeWidth={8} fill="none" />}
	</g>
);
const Medaille: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}><path d="M -60 -260 L -20 -100 L 20 -100 L 60 -260 Z" fill="#c0392b" stroke={INK} strokeWidth={6} /><circle r={130} fill="#ffd23f" stroke={INK} strokeWidth={10} /><circle r={100} fill="none" stroke="#c9a227" strokeWidth={8} />{txt(0, -10, 'IG', 70, '#5a3a1a')}{txt(0, 60, 'NOBEL', 44, '#5a3a1a')}</g>
);

export const M01: React.FC = () => (
	<Plan debut={0} fin={4.54} sansEntree cam={(t) => ({z: lin(t, [0, 4.54], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => (<>
			<Chambre f={f} />
			<Lit f={f} tente={lin(t, [0, 0.8], [0.6, 1], Easing.out(Easing.back(2)))} yeux={t > 2.1 ? 'choc' : 'ouvert'} />
			{T0(t, 'POURQUOI LE MATIN… ?', 92)}
			{t > 2.15 && <Bulle x={360} y={900} w={460} h={200} k={pop(t, 2.15)} queue={[-60, 160]} pensee><text x={0} y={20} textAnchor="middle" fontFamily={FONT} fontSize={48} fill={INK}>J'AI RIEN RÊVÉ…</text></Bulle>}
		</>)}
	</Plan>
);
export const M02: React.FC = () => (
	<Plan debut={4.54} fin={8.86} cam={(t) => ({z: lin(t, [4.54, 8.86], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#e4dcf2" />
			<g transform={`translate(540 1100) scale(${pop(t, 4.6)})`}><Bulle x={0} y={0} w={520} h={340} k={1} queue={[0, 0]} pensee><text x={0} y={30} textAnchor="middle" fontFamily={FONT} fontSize={80} fill={INK}>RÊVE ?</text></Bulle>{t > 5.3 && <path d="M -240 -150 L 240 150 M 240 -150 L -240 150" stroke="#c0392b" strokeWidth={26} strokeLinecap="round" opacity={pop(t, 5.3)} />}</g>
			{T(t, 4.6, 'SPOILER :', 120)}
			{t > 5.3 && T(t, 5.3, "C'EST PAS LE RÊVE", 100, '#fff', 560)}
			{t > 6.8 && <Ecran>{txt(540, 1600, 'BIEN PLUS BIZARRE…', 80, '#FFD23F')}</Ecran>}
		</>)}
	</Plan>
);
export const M03: React.FC = () => (
	<Plan debut={8.86} fin={13.76} cam={(t) => ({z: lin(t, [8.86, 13.76], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#fbe7c6" />
			<Cerveau x={540} y={1100} s={1.2}><Vigile x={0} y={160} s={0.7} f={f} /></Cerveau>
			{T(t, 8.9, 'TON CERVEAU A UN VIGILE', 78)}
			{t > 11.86 && T(t, 11.86, 'GARDER LE CALME… EN BAS', 76, '#fff', 560)}
			{t > 12.9 && <g transform="translate(540 1620)" opacity={pop(t, 12.9)}><path d="M 0 -40 L 0 80 M -50 30 L 0 80 L 50 30" stroke="#c0392b" strokeWidth={22} fill="none" strokeLinecap="round" /></g>}
		</>)}
	</Plan>
);
export const M04: React.FC = () => (
	<Plan debut={13.76} fin={20.55} cam={(t) => ({z: lin(t, [13.76, 16.4, 20.55], [1.0, 1.1, 1.25], ease), y: -60})}>
		{(t, f) => (<>
			<rect x={-1500} y={-1500} width={4080} height={5000} fill="#2a3050" />
			{Array.from({length: 30}).map((_, i) => <circle key={i} cx={rnd(i) * 1300 - 100} cy={rnd(i + 9) * 2200 - 200} r={3} fill="#fff" />)}
			<Cerveau x={540} y={1100} s={1.2}><Vigile x={0} y={160} s={0.7} f={f} dort={t > 16.4} /></Cerveau>
			{T(t, 13.8, 'PENDANT TON SOMMEIL…', 86)}
			{t > 16.4 && T(t, 16.4, 'LE VIGILE DORT', 120, '#fff', 560)}
			{t > 18.9 && <Ecran>{txt(540, 1620, 'PLUS PERSONNE NE SURVEILLE', 64, '#FFD23F')}</Ecran>}
		</>)}
	</Plan>
);
export const M05: React.FC = () => (
	<Plan debut={20.55} fin={27.67} cam={(t) => ({z: lin(t, [20.55, 27.67], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => {
			const n = Math.min(5, Math.max(0, Math.floor(lin(t, [21.3, 23.1], [1, 5.99]))));
			const pulse = t < 24.3 ? (Math.sin(t * 5) > 0.3 ? 1 : 0.2) : (t > 25.4 ? 1 : 0.3);
			return (<>
				<Chambre nuit={t < 24.4} f={f} />
				<Lit f={f} tente={pulse} yeux={t > 25.4 ? 'ouvert' : 'dort'} />
				{t < 24.4 && <Ecran><g transform="translate(540 1050)"><rect x={-280} y={-90} width={560} height={180} rx={30} fill="#fff" stroke={INK} strokeWidth={8} /><text x={0} y={30} textAnchor="middle" fontFamily={FONT} fontSize={90} fill="#c0392b">{n} / NUIT</text></g></Ecran>}
				{t > 24.4 && <g transform={`translate(860 1170) rotate(${t > 25.4 ? Math.sin(f * 2) * 10 : 0}) scale(${pop(t, 24.4)})`}><circle r={80} fill="#e23b2b" stroke={INK} strokeWidth={7} /><circle r={60} fill="#fff" stroke={INK} strokeWidth={4} /><path d="M 0 0 L 0 -40 M 0 0 L 28 12" stroke={INK} strokeWidth={6} /><circle cx={-55} cy={-70} r={22} fill="#e23b2b" stroke={INK} strokeWidth={5} /><circle cx={55} cy={-70} r={22} fill="#e23b2b" stroke={INK} strokeWidth={5} /></g>}
				{T(t, 20.6, '3 À 5 FOIS PAR NUIT', 100)}
				{t > 25.4 && T(t, 25.4, 'LE MATIN : PILE PENDANT', 80, '#fff', 560)}
			</>);
		}}
	</Plan>
);
export const M06: React.FC = () => (
	<Plan debut={27.67} fin={29.18} secousse={() => 10} cam={(t) => ({z: lin(t, [27.67, 29.18], [1.0, 1.2], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#2a2a3a" />
			{txt(540, 1150, '!', 400, '#ffd23f')}
			{T(t, 27.7, 'MAIS ATTENDS…', 130)}
			{t > 28.3 && T(t, 28.3, 'LE PLUS FOU', 120, '#ff4b2b', 560)}
		</>)}
	</Plan>
);
export const M07: React.FC = () => (
	<Plan debut={29.18} fin={36.56} cam={(t) => ({z: lin(t, [29.18, 33.6, 36.56], [1.0, 1.1, 1.3], ease), y: -100})}>
		{(t, f) => (<>
			<Fond c="#e8eef0" />
			<Humain x={250} y={1760} s={1.0} f={f} couleur="#f4f4f4" chapeau="aucun" cheveux="#9a9a9a" jambesC="#2c2f36" cravate="#2f6fb0" pose="main" humeur="neutre" />
			{t > 31.0 && <Timbres x={600} y={1100} s={pop(t, 31.0) * 1.5} dechire={lin(t, [35.0, 35.6], [0, 1])} />}
			{t > 32.7 && <Ecran>{txt(640, 1350, '(TU VOIS OÙ)', 60, '#c0392b', -4)}</Ecran>}
			{T(t, 29.2, 'UN TEST DE MÉDECIN', 100)}
			{t > 35.5 && T(t, 35.5, 'DÉCHIRÉS = TOUT VA BIEN', 76, '#7be07b', 560)}
		</>)}
	</Plan>
);
export const M08: React.FC = () => (
	<Plan debut={36.56} fin={42.87} cam={(t) => ({z: lin(t, [36.56, 42.87], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond />
			<g transform={`translate(540 1150) rotate(${Math.sin(f * 0.08) * 4})`}><Medaille x={0} y={0} s={pop(t, 38.9) * 1.6} /></g>
			{T(t, 36.6, 'UN VRAI PRIX', 120)}
			{t > 38.95 && T(t, 38.95, "L'IG NOBEL 2018", 110, '#fff', 560)}
			{t > 39.9 && <Ecran>{txt(540, 1620, "RIRE… PUIS RÉFLÉCHIR", 70, '#FFD23F')}</Ecran>}
		</>)}
	</Plan>
);
export const M09: React.FC = () => (
	<Plan debut={42.87} fin={48.4} cam={(t) => ({z: lin(t, [42.87, 48.4], [1.0, 1.2], ease), y: -150})}>
		{(t, f) => (<>
			<Chambre f={f} />
			<Lit f={f} tente={1} yeux="fier" />
			{t > 45.3 && <g transform={`translate(600 980) scale(${pop(t, 45.3)})`}><rect x={-130} y={-60} width={260} height={120} rx={20} fill="#7be07b" stroke={INK} strokeWidth={6} />{txt(0, 22, 'OK ✓', 64, '#fff')}</g>}
			{T(t, 42.9, 'TON CORPS FAIT TOUT SEUL', 80)}
			{t > 46.45 && T(t, 46.45, 'TOUS LES MATINS', 110, '#fff', 560)}
		</>)}
	</Plan>
);
export const PLANS_MATIN: [number, number, React.FC][] = [
	[0, 4.54, M01], [4.54, 8.86, M02], [8.86, 13.76, M03], [13.76, 20.55, M04], [20.55, 27.67, M05], [27.67, 29.18, M06], [29.18, 36.56, M07], [36.56, 42.87, M08], [42.87, 48.4, M09],
];
