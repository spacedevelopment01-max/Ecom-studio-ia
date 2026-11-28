import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, FONT, rnd, lin, pop, Humain, Bulle} from './dessins';
import {ease, T, txt, Fond} from './commun_moyenage';

const T0 = (t: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => T(t, -1, texte, taille, c, y);
const PEAU = '#f5c9a0';
const TENUES = ['#e05a8a', '#7a3fa0', '#2f9f8f', '#e0a030', '#3a7ae0'];
const CHEV = ['#3b2a1e', '#c9a060', '#6a2a1a', '#1a1a1a', '#a0522d'];

const Fille: React.FC<{x: number; y: number; s?: number; f: number; i?: number; humeur?: any; pose?: any; regard?: 'plafond' | 'normal'}> = ({x, y, s = 1, f, i = 0, humeur = 'neutre', pose = 'debout', regard = 'normal'}) => (
	<g>
		<circle cx={x - 70 * s} cy={y - 330 * s} r={34 * s} fill={CHEV[i % 5]} stroke={INK} strokeWidth={5} />
		<Humain x={x} y={y} s={s} f={f} couleur={TENUES[i % 5]} chapeau="aucun" cheveux={CHEV[i % 5]} jambesC="#2a2a3a" humeur={humeur} pose={pose} ph={i} />
		{regard === 'plafond' && <g transform={`translate(${x} ${y - 330 * s})`}><circle cx={-20 * s} cy={-14 * s} r={9 * s} fill="#fff" stroke={INK} strokeWidth={3} /><circle cx={20 * s} cy={-14 * s} r={9 * s} fill="#fff" stroke={INK} strokeWidth={3} /><circle cx={-20 * s} cy={-20 * s} r={4 * s} fill={INK} /><circle cx={20 * s} cy={-20 * s} r={4 * s} fill={INK} /></g>}
	</g>
);
const Chien: React.FC<{x: number; y: number; s?: number; f: number; i?: number; tremble?: number}> = ({x, y, s = 1, f, i = 0, tremble = 0}) => {
	const tr = tremble ? (rnd(f + i * 7) - 0.5) * tremble : 0;
	return (
		<g transform={`translate(${x + tr} ${y}) scale(${s})`}>
			<path d="M -150 0 L 0 -200 L 160 0" stroke={INK} strokeWidth={46} fill="none" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M -150 0 L 0 -200" stroke={TENUES[i % 5]} strokeWidth={32} fill="none" strokeLinecap="round" />
			<path d="M 0 -200 L 160 0" stroke="#2a2a3a" strokeWidth={32} fill="none" strokeLinecap="round" />
			<circle cx={-180} cy={-30} r={44} fill={PEAU} stroke={INK} strokeWidth={5} />
			<circle cx={-200} cy={-70} r={26} fill={CHEV[i % 5]} stroke={INK} strokeWidth={4} />
			<circle cx={-170} cy={-26} r={5} fill={INK} /><path d="M -190 -6 q 10 6 20 0" stroke={INK} strokeWidth={3} fill="none" />
			{tremble > 0 && [0, 1].map((k) => { const p = (f * 0.05 + k / 2) % 1; return <path key={k} d="M 0 0 q -8 14 0 20 q 8 -6 0 -20 Z" transform={`translate(${-150 + k * 20} ${-80 + p * 60})`} fill="#bfe6fa" stroke={INK} strokeWidth={3} opacity={1 - p} />; })}
		</g>
	);
};
const Tapis: React.FC<{x: number; y: number; c?: string}> = ({x, y, c = '#7ac0a0'}) => <rect x={x - 220} y={y - 10} width={440} height={30} rx={10} fill={c} stroke={INK} strokeWidth={5} />;
const Salle: React.FC<{f: number}> = ({f}) => (
	<>
		<rect x={-1500} y={-1500} width={4080} height={5000} fill="#f4e8dc" />
		{[160, 540, 920].map((x) => <g key={x}><rect x={x - 120} y={500} width={240} height={360} fill="#bfe3f2" stroke={INK} strokeWidth={8} /><path d={`M ${x} 500 L ${x} 860`} stroke={INK} strokeWidth={6} /></g>)}
		<g transform="translate(900 880)"><ellipse cx={0} cy={0} rx={60} ry={30} fill="#7a9a3a" /><rect x={-40} y={0} width={80} height={90} fill="#c0573a" stroke={INK} strokeWidth={5} /></g>
		<rect x={-800} y={1300} width={2680} height={1300} fill="#c9a87a" stroke={INK} strokeWidth={6} />
		{Array.from({length: 12}).map((_, i) => <path key={i} d={`M ${-200 + i * 130} 1300 L ${-100 + i * 130} 2000`} stroke="#b8946a" strokeWidth={4} />)}
	</>
);
const Direct: React.FC<{t: number; f: number}> = ({f}) => (
	<Ecran><g transform="translate(110 200)"><rect x={-60} y={-36} width={260} height={72} rx={12} fill="#c0392b" stroke={INK} strokeWidth={5} /><circle cx={-24} cy={0} r={14} fill="#fff" opacity={f % 30 < 18 ? 1 : 0.2} />{txt(80, 18, 'EN DIRECT', 40, '#fff')}</g></Ecran>
);
const Commentateur: React.FC<{f: number; t: number; crie?: boolean}> = ({f, crie}) => (
	<Ecran><g transform="translate(870 1000)"><rect x={-170} y={-220} width={340} height={260} rx={20} fill="#2a2a3a" stroke={INK} strokeWidth={6} /><g transform="translate(0 30)"><Humain x={0} y={0} s={0.55} f={f * (crie ? 2 : 1)} couleur="#c0392b" chapeau="aucun" cheveux="#3b2a1e" jambesC="#2a2a3a" humeur={crie ? 'crie' : 'content'} pose={crie ? 'crie' : 'main'} /></g><path d="M -40 -190 Q 0 -230 40 -190" stroke="#888" strokeWidth={8} fill="none" /><circle cx={-42} cy={-180} r={12} fill="#444" /><circle cx={42} cy={-180} r={12} fill="#444" /></g></Ecran>
);

export const Y01: React.FC = () => (
	<Plan debut={0} fin={3.33} sansEntree cam={(t) => ({z: lin(t, [0, 3.33], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => (<>
			<Salle f={f} />
			<Tapis x={540} y={1300} /><Chien x={540} y={1300} s={1.3} f={f} i={0} />
			{T0(t, 'POURQUOI LES FILLES', 96)}
			{T0(t, 'PÈTENT PAR DEVANT ?', 96, '#fff', 560)}
		</>)}
	</Plan>
);
export const Y02: React.FC = () => (
	<Plan debut={3.33} fin={9.16} cam={(t) => ({z: lin(t, [3.33, 7.5, 9.16], [1.0, 1.05, 1.2], ease), y: -150})}>
		{(t, f) => (<>
			<Salle f={f} />
			{[0, 1, 2, 3].map((i) => <g key={i}><Tapis x={170 + i * 250} y={1300} c={['#7ac0a0', '#e0a0c0', '#a0b0e0', '#e0d080'][i]} /><Fille x={170 + i * 250} y={1300} s={0.85} f={f} i={i} pose={i % 2 ? 'salut' : 'debout'} humeur="content" /></g>)}
			<Direct t={t} f={f} /><Commentateur f={f} t={t} crie={t < 6.8} />
			{T(t, 3.35, 'EN DIRECT DU YOGA', 110)}
			{t > 6.05 && T(t, 6.05, 'AMBIANCE ÉLECTRIQUE', 96, '#fff', 560)}
			{t > 7.51 && <Ecran>{txt(330, 800, 'CHUUUT…', 90, '#FFD23F')}</Ecran>}
		</>)}
	</Plan>
);
export const Y03: React.FC = () => (
	<Plan debut={9.16} fin={14.47} cam={(t) => ({z: lin(t, [9.16, 12.4, 14.47], [1.0, 1.1, 1.45], ease), y: lin(t, [12.4, 14.47], [-150, -300], ease)})}>
		{(t, f) => (<>
			<Salle f={f} />
			{[0, 1, 2].map((i) => <g key={i}><Tapis x={200 + i * 340} y={1300} c={['#7ac0a0', '#e0a0c0', '#a0b0e0'][i]} /><Chien x={200 + i * 340} y={1300} s={0.75} f={f} i={i} tremble={t > 12.4 ? (i === 1 ? 14 : 5) : 0} /></g>)}
			<Direct t={t} f={f} />
			{T(t, 9.2, 'CHIEN TÊTE EN BAS', 110)}
			{t > 12.46 && T(t, 12.46, 'ELLES TIENNENT…', 110, '#fff', 560)}
		</>)}
	</Plan>
);
export const Y04: React.FC = () => (
	<Plan debut={14.47} fin={16.62} secousse={(t) => (t > 15.56 ? 36 * lin(t, [15.56, 16.6], [1, 0.3]) : 0)} cam={(t) => ({z: lin(t, [14.47, 15.56, 16.62], [1.5, 1.2, 1.25], ease), x: 0, y: -300})}>
		{(t, f) => (<>
			<Salle f={f} />
			<Tapis x={420} y={1300} c="#e0a0c0" /><Chien x={420} y={1300} s={1.1} f={f} i={1} tremble={8} />
			{t > 15.56 && <g transform={`translate(780 1000) scale(${pop(t, 15.56) * 1.2}) rotate(-8)`}><path d="M -200 -40 L -120 -110 L -60 -50 L 0 -130 L 60 -50 L 130 -110 L 210 -30 L 140 30 L 200 100 L 80 70 L 0 140 L -70 70 L -190 90 L -140 20 Z" fill="#ffd23f" stroke={INK} strokeWidth={8} /><text x={0} y={30} textAnchor="middle" fontFamily={FONT} fontSize={90} fill="#c0392b">PRRRT</text></g>}
			<Direct t={t} f={f} />
			{T(t, 14.5, "ET LÀ, C'EST LE DRAME", 96, '#ff4b2b')}
		</>)}
	</Plan>
);
export const Y05: React.FC = () => (
	<Plan debut={16.62} fin={20.53} cam={(t) => ({z: lin(t, [16.62, 20.53], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => (<>
			<Salle f={f} />
			{Array.from({length: 8}).map((_, i) => <Fille key={i} x={110 + (i % 4) * 280} y={1060 + Math.floor(i / 4) * 280} s={0.6} f={f} i={i} regard="plafond" humeur="neutre" />)}
			{t > 18.22 && <g><Fille x={540} y={1330} s={0.9} f={f} i={2} pose="main" humeur="neutre" regard="plafond" />{txt(660, 960, '♪', 70, INK)}</g>}
			{T(t, 16.65, '20 PERSONNES', 110)}
			{T(t, 17.2, 'REGARDENT LE PLAFOND', 92, '#fff', 560)}
		</>)}
	</Plan>
);
export const Y06: React.FC = () => (
	<Plan debut={20.53} fin={26.45} cam={(t) => ({z: lin(t, [20.53, 26.45], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#e8eef0" />
			<Commentateur f={f} t={t} crie={t < 22.8} />
			<g transform="translate(540 1050)">
				{t > 22.82 && <g transform={`translate(-210 0) scale(${pop(t, 22.82)})`}><rect x={-180} y={-200} width={360} height={400} rx={24} fill="#fff" stroke={INK} strokeWidth={8} />{txt(0, -130, 'PET', 70, '#8a5a2a')}<ellipse cx={0} cy={10} rx={110} ry={80} fill="#f4c6a0" stroke={INK} strokeWidth={5} /><path d="M -40 0 q 20 -30 40 0 q 20 30 40 0" stroke="#8a5a2a" strokeWidth={6} fill="none" />{txt(0, 160, 'GAZ DU VENTRE', 34, INK)}</g>}
				{t > 25.22 && <g transform={`translate(210 0) scale(${pop(t, 25.22)})`}><rect x={-180} y={-200} width={360} height={400} rx={24} fill="#fff" stroke={INK} strokeWidth={8} />{txt(0, -130, 'ÇA', 70, '#2f6fb0')}{[0, 1, 2].map((i) => <path key={i} d={`M -100 ${-40 + i * 50} q 50 -30 100 0 q 50 30 100 0`} stroke="#7ac0ee" strokeWidth={10} fill="none" />)}{txt(0, 160, 'JUSTE DE L\'AIR', 34, INK)}</g>}
			</g>
			{T(t, 20.55, 'REBONDISSEMENT !', 120, '#ff4b2b')}
			{T(t, 21.36, "CE N'EST PAS UN PET", 96, '#fff', 560)}
		</>)}
	</Plan>
);
export const Y07: React.FC = () => (
	<Plan debut={26.45} fin={31.31} cam={(t) => ({z: lin(t, [26.45, 31.31], [1.0, 1.15], ease), y: -150})}>
		{(t, f) => {
			const k = lin(t, [27.9, 28.8], [0, 1]);
			return (<>
				<Salle f={f} />
				<Tapis x={540} y={1300} /><Chien x={540} y={1300} s={1.3} f={f} i={3} />
				{t > 27.9 && [0, 1, 2].map((i) => <path key={i} d={`M ${200 + i * 40} ${910 + i * 40} q 60 -30 120 0 q 60 30 120 0`} stroke="#7ac0ee" strokeWidth={10} fill="none" opacity={k} transform={`translate(${k * 120} 0)`} />)}
				{t > 29 && <path d="M 760 960 l 80 -20 m -80 20 l 70 40" stroke="#c0392b" strokeWidth={10} opacity={pop(t, 29)} />}
				{T(t, 26.5, 'LE CORPS S\'ÉTIRE', 110)}
				{t > 27.96 && T(t, 27.96, "L'AIR RENTRE…", 110, '#bfe6fa', 560)}
				{t > 28.98 && <Ecran>{txt(540, 760, '…ET RESSORT', 90, '#FFD23F')}</Ecran>}
			</>);
		}}
	</Plan>
);
export const Y08: React.FC = () => (
	<Plan debut={31.31} fin={38.33} cam={(t) => ({z: lin(t, [31.31, 38.33], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#1a2a4a" />
			<g transform="translate(540 1050)"><rect x={-400} y={-260} width={800} height={520} rx={20} fill="#0d1530" stroke={INK} strokeWidth={10} />{txt(0, -170, 'TABLEAU DES SCORES', 44, '#ffd23f')}<text x={-200} y={20} textAnchor="middle" fontFamily={FONT} fontSize={60} fill="#fff">ODEUR</text><text x={200} y={40} textAnchor="middle" fontFamily={FONT} fontSize={140} fill="#7be07b" opacity={pop(t, 32.3)}>0</text>{t > 35.66 && <><text x={-200} y={180} textAnchor="middle" fontFamily={FONT} fontSize={60} fill="#fff">NORMAL</text><text x={200} y={190} textAnchor="middle" fontFamily={FONT} fontSize={90} fill="#7be07b" opacity={pop(t, 35.66)}>OUI ✓</text></>}</g>
			<Direct t={t} f={f} />
			{T(t, 31.35, "L'INFO DU JOUR", 120)}
			{t > 34.34 && T(t, 34.34, 'LES MÉDECINS SONT FORMELS', 76, '#fff', 560)}
		</>)}
	</Plan>
);
export const Y09: React.FC = () => (
	<Plan debut={38.33} fin={44.5} cam={(t) => ({z: lin(t, [38.33, 44.5], [1.0, 1.2], ease), y: -150})}>
		{(t, f) => (<>
			<Salle f={f} />
			<Humain x={320} y={1320} s={1.1} f={f} couleur="#1a1a1a" chapeau="aucun" cheveux="#3b2a1e" jambesC="#1a1a1a" pose="main" humeur="content" />
			{[0, 1, 2, 3].map((i) => <rect key={i} x={240 + i * 40} y={1320 - 280 * 1.1} width={20} height={150} fill="#fff" opacity={0.9} />)}
			<g transform={`translate(${320 + 160} ${1320 - 200})`}><rect x={-10} y={-10} width={50} height={30} rx={8} fill="#c0c0c0" stroke={INK} strokeWidth={4} /></g>
			{t > 39.44 && <g transform={`translate(560 900) rotate(-8) scale(${pop(t, 39.44)})`}><rect x={-60} y={-90} width={120} height={180} rx={10} fill="#ffd23f" stroke={INK} strokeWidth={6} /></g>}
			<Fille x={820} y={1330} s={1.0} f={f} i={1} pose="salut" humeur="content" />
			{T(t, 38.35, "VERDICT DE L'ARBITRE", 100)}
			{t > 40.8 && T(t, 40.8, '« C\'EST PAS UN PET »', 92, '#fff', 560)}
			{t > 42.31 && <Ecran>{txt(540, 760, 'ET ELLE A RAISON ✓', 80, '#7be07b')}</Ecran>}
		</>)}
	</Plan>
);
export const PLANS_YOGA: [number, number, React.FC][] = [
	[0, 3.33, Y01], [3.33, 9.16, Y02], [9.16, 14.47, Y03], [14.47, 16.62, Y04], [16.62, 20.53, Y05], [20.53, 26.45, Y06], [26.45, 31.31, Y07], [31.31, 38.33, Y08], [38.33, 44.5, Y09],
];
