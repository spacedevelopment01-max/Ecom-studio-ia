import React from 'react';
import {Easing} from 'remotion';
import {Plan, Couche, Ecran, Exterieur} from './scene';
import {INK, FONT, rnd, lin, pop, sortie, Ciel, Soleil, Sol, Humain, Titre, Bulle, Lapin, Cage, PiqueNique, Caleche, Carotte, Arbre} from './dessins';

const ease = Easing.inOut(Easing.cubic);
const NAPO = {couleur: '#2d4a8a', chapeau: 'bicorne' as const, jambesC: '#f1ede2', meche: true, medailles: 1};
const BERT = {couleur: '#2d4a8a', chapeau: 'plume' as const, jambesC: '#f1ede2', moustache: true, medailles: 3};
const TSAR = {couleur: '#2f5d3a', chapeau: 'plume' as const, jambesC: '#f1ede2', medailles: 2};
const INV = [
	{couleur: '#7a2a20', chapeau: 'haut' as const, jambesC: '#3a3a3a'},
	{couleur: '#5a3f7a', chapeau: 'haut' as const, jambesC: '#3a3a3a'},
	{couleur: '#2f6b6b', chapeau: 'haut' as const, jambesC: '#3a3a3a'},
];
const T = (t: number, a: number, texte: string, taille = 120, c = '#FFD23F') => <Ecran><Titre x={540} y={400} texte={texte} taille={taille} k={pop(t, a)} c={c} /></Ecran>;

/* 0 : la phrase d'accroche */
export const Q01: React.FC = () => (
	<Plan debut={0} fin={2.57} sansEntree cam={(t) => ({z: lin(t, [0, 2.57], [1.05, 1.4], ease), y: lin(t, [0, 2.57], [-120, -260], ease)})}>
		{(t, f) => (<>
			<Exterieur id="q1" f={f} />
			<path d="M 120 1460 Q 540 1240 960 1460 Z" fill="#6fa63f" stroke={INK} strokeWidth={6} />
			<Humain x={540} y={1380} s={1.35} f={f} {...NAPO} pose="salut" humeur="content" />
			{T(t, 0.26, '1807', 220)}
		</>)}
	</Plan>
);

export const Q02: React.FC = () => (
	<Plan debut={2.57} fin={3.99} cam={() => ({z: 1.3, y: -250})}>
		{(t, f) => {
			const dx = (t - 2.57) * 1200;
			return (<>
				<Exterieur id="q2" f={f} dx={-dx} />
				<Humain x={330} y={1460} s={1.2} f={f * 1.6} {...NAPO} flip pas pose="crie" humeur="choc" />
				{[0, 1, 2, 3, 4, 5].map((i) => <Lapin key={i} x={620 + i * 95 + Math.sin(f * 0.2 + i) * 20} y={1470 + (i % 2) * 50} s={0.8} f={f} ph={i} c={i} saute vitesse={0.45} flip />)}
			</>);
		}}
	</Plan>
);

/* 1 : la paix, la gloire, l'envie de chasser */
export const Q03: React.FC = () => (
	<Plan debut={3.99} fin={5.96} cam={(t) => ({z: lin(t, [3.99, 5.96], [1.15, 1.45], ease), x: 0, y: -200})}>
		{(t, f) => (<>
			<Exterieur id="q3" f={f} />
			<Humain x={400} y={1440} s={1.2} f={f} {...NAPO} pose="main" humeur="content" />
			<Humain x={736} y={1440} s={1.2} f={f} {...TSAR} pose="main" humeur="content" flip />
			{t > 4.83 && (
				<g transform={`translate(568 820) scale(${pop(t, 4.83)}) rotate(-4)`}>
					<rect x={-170} y={-110} width={340} height={220} rx={10} fill="#fbf3dc" stroke={INK} strokeWidth={7} />
					<text x={0} y={30} textAnchor="middle" fontFamily={FONT} fontSize={110} fill="#2d4a8a">PAIX</text>
					<circle cx={120} cy={70} r={26} fill="#b5322c" stroke={INK} strokeWidth={4} />
				</g>
			)}
			<Ecran><Titre x={540} y={400} texte="RUSSIE" taille={110} k={pop(t, 5.45)} c="#fff" /></Ecran>
		</>)}
	</Plan>
);

export const Q04: React.FC = () => (
	<Plan debut={5.96} fin={7.47} cam={(t) => ({z: lin(t, [5.96, 7.47], [1.5, 1.2], ease), y: lin(t, [5.96, 7.47], [-60, -160], ease)})}>
		{(t, f) => (<>
			<Ciel id="q4" haut="#ffcf5a" bas="#fff3c4" />
			{Array.from({length: 16}).map((_, i) => <path key={i} d="M 540 900 L 515 -500 L 565 -500 Z" fill="#fff" opacity={0.35} transform={`rotate(${i * 22.5 + f * 0.8} 540 900)`} />)}
			<rect x={330} y={1300} width={420} height={600} rx={10} fill="#d8d2c4" stroke={INK} strokeWidth={8} />
			<rect x={300} y={1280} width={480} height={50} rx={8} fill="#c4bdae" stroke={INK} strokeWidth={7} />
			<Humain x={540} y={1290} s={1.3} f={f} {...NAPO} pose="salut" humeur="content" />
			<path d="M 470 850 q 70 -40 140 0" stroke="#4f9a35" strokeWidth={14} fill="none" strokeLinecap="round" opacity={pop(t, 7.04)} />
			{t > 7.0 && Array.from({length: 40}).map((_, i) => {
				const k = lin(t, [7.0, 7.47], [0, 1]);
				return <rect key={i} x={rnd(i) * 1080} y={-100 + k * (600 + rnd(i + 1) * 900)} width={18} height={10} fill={['#b5322c', '#fff', '#2f4f9a', '#ffd23f'][i % 4]} transform={`rotate(${f * 8 + i * 30} ${rnd(i) * 1080} ${-100 + k * 900})`} />;
			})}
			{T(t, 7.04, 'LA GLOIRE')}
		</>)}
	</Plan>
);

export const Q05: React.FC = () => (
	<Plan debut={7.47} fin={10.3}>
		{(t, f) => (<>
			<Exterieur id="q5" f={f} />
			<Humain x={330} y={1560} s={1.4} f={f} {...NAPO} humeur="content" regard={1} />
			<Bulle x={700} y={820} w={560} h={420} k={pop(t, 8.4, 0.45)} queue={[-240, 330]} pensee>
				<g transform="translate(-60 40)">
					<path d="M -150 30 L 120 -40" stroke="#6b4a2b" strokeWidth={22} strokeLinecap="round" />
					<path d="M -150 30 L 120 -40" stroke="#3b2414" strokeWidth={8} strokeLinecap="round" />
				</g>
				{t > 8.92 && <Lapin x={150} y={120} s={0.75 * pop(t, 8.92)} f={f} c={1} flip />}
			</Bulle>
			{T(t, 8.92, 'LA CHASSE !')}
		</>)}
	</Plan>
);

/* 2 : Berthier et le programme */
export const Q06: React.FC = () => (
	<Plan debut={10.3} fin={13.1} cam={(t) => ({z: 1.35, x: lin(t, [10.3, 11.4, 12.1], [180, 180, -150], ease), y: -230})}>
		{(t, f) => (<>
			<Exterieur id="q6" f={f} />
			<Humain x={330} y={1480} s={1.25} f={f} {...NAPO} pose={t < 11.5 ? 'crie' : 'debout'} humeur="content" />
			<Humain x={720} y={1480} s={1.25} f={f} {...BERT} pose={t > 12.0 ? 'salut' : 'debout'} humeur="content" flip />
			{T(t, 12.13, 'MARÉCHAL BERTHIER', 100, '#fff')}
		</>)}
	</Plan>
);

export const Q07: React.FC = () => (
	<Plan debut={13.1} fin={17.95} cam={(t) => ({z: lin(t, [13.1, 14.2, 15.3, 16.3, 17.95], [1.2, 1.35, 1.35, 1.35, 1.2], ease), x: lin(t, [13.1, 14.0, 14.9, 16.0, 16.6, 17.95], [0, 0, 420, 420, -420, -200], ease), y: -260})}>
		{(t, f) => (<>
			<Exterieur id="q7" f={f} />
			<g opacity={pop(t, 15.1)}>{INV.map((g, i) => <Humain key={i} x={-120 + i * 130} y={1470 + (i % 2) * 30} s={1.0 * pop(t, 15.1 + i * 0.1)} f={f} {...g} humeur="content" ph={i} />)}</g>
			<g transform={`translate(540 1450) scale(${pop(t, 14.1)})`}><PiqueNique x={0} y={0} s={1} /></g>
			{[0, 1, 2, 3].map((i) => <Cage key={i} x={940 + (i % 2) * 175} y={1460 - Math.floor(i / 2) * 120} s={pop(t, 16.2 + i * 0.08)} />)}
			{t > 16.6 && <Lapin x={1020} y={1260} s={0.55 * pop(t, 16.6)} f={f} c={0} flip />}
			<Ecran>
				<g transform={`translate(540 380) scale(${pop(t, 13.2)})`}>
					<rect x={-330} y={-150} width={660} height={300} rx={20} fill="#fbf3dc" stroke={INK} strokeWidth={8} />
					<text x={0} y={-80} textAnchor="middle" fontFamily={FONT} fontSize={64} fill={INK}>PROGRAMME</text>
					{[['Pique-nique', 14.21], ['Invités', 15.29], ['Lapins', 16.34]].map(([n, a], i) => (
						<g key={i} opacity={t > (a as number) ? 1 : 0.25}>
							<text x={-250} y={-10 + i * 60} fontFamily={FONT} fontSize={50} fill={INK}>{n as string}</text>
							{t > (a as number) && <path d={`M 180 ${-28 + i * 60} l 20 22 l 40 -44`} stroke="#3c8a4a" strokeWidth={12} fill="none" strokeLinecap="round" transform={`scale(${pop(t, a as number)})`} />}
						</g>
					))}
				</g>
			</Ecran>
		</>)}
	</Plan>
);

export const Q08: React.FC = () => (
	<Plan debut={17.95} fin={20.15} cam={(t) => ({z: lin(t, [17.95, 20.15], [1.6, 1.0], ease), y: lin(t, [17.95, 20.15], [-120, 0], ease)})}>
		{(t, f) => (<>
			<Exterieur id="q8" f={f} />
			{Array.from({length: 7}).map((_, r) => Array.from({length: 7 - r}).map((__, i) => (
				<Cage key={`${r}-${i}`} x={540 + (i - (6 - r) / 2) * 150} y={1560 - r * 108} s={0.95} />
			)))}
			{[0, 1, 2].map((i) => <Lapin key={i} x={360 + i * 180} y={1560 - (i + 2) * 108 - 30} s={0.35} f={f} c={i + 1} ph={i} />)}
			{T(t, 18.99, '3 000 ?', 170)}
		</>)}
	</Plan>
);

/* 3 : les cages s'ouvrent, on attend */
export const Q09: React.FC = () => (
	<Plan debut={20.15} fin={22.2} cam={(t) => ({z: 1.35, x: lin(t, [20.15, 22.2], [220, -220], ease), y: -250})}>
		{(t, f) => (<>
			<Exterieur id="q9" f={f} />
			{[0, 1, 2, 3, 4, 5].map((i) => {
				const o = lin(t, [21.26 + i * 0.08, 21.5 + i * 0.08], [0, 1]);
				return (<g key={i}>
					<Cage x={60 + i * 200} y={1470} s={1.05} ouvert={o} />
					{o > 0.6 && <Lapin x={60 + i * 200} y={1462} s={0.42} f={f} c={i} ph={i} regard={0} />}
				</g>);
			})}
			{T(t, 21.26, 'ON OUVRE !')}
		</>)}
	</Plan>
);

export const Q10: React.FC = () => (
	<Plan debut={22.2} fin={23.4} cam={(t) => ({z: lin(t, [22.2, 23.4], [1.25, 1.45], ease), x: lin(t, [22.2, 23.4], [-200, 120], ease), y: -230})}>
		{(t, f) => (<>
			<Exterieur id="q10" f={f} />
			{INV.map((g, i) => <Humain key={i} x={160 + i * 290} y={1480 + (i % 2) * 40} s={1.15} f={f} {...g} pose="vise" humeur="fache" ph={i} />)}
		</>)}
	</Plan>
);

export const Q11: React.FC = () => (
	<Plan debut={23.4} fin={25.2} cam={(t) => ({z: lin(t, [23.4, 25.2], [1.5, 1.9], ease), y: lin(t, [23.4, 25.2], [-80, 30])})}>
		{(t, f) => (<>
			<Exterieur id="q11" f={f} />
			<Humain x={540} y={1560} s={1.35} f={f} {...NAPO} pose="vise" humeur={t > 24.4 ? 'perplexe' : 'neutre'} regard={1} />
			<Bulle x={760} y={820} w={260} h={150} k={pop(t, 24.3)} queue={[-90, 120]}>
				<text x={0} y={22} textAnchor="middle" fontFamily={FONT} fontSize={90} fill={INK}>…</text>
			</Bulle>
		</>)}
	</Plan>
);

/* 4 : les lapins ne fuient pas */
const PRES = Array.from({length: 9}).map((_, i) => ({x: 120 + (i % 5) * 210 + (Math.floor(i / 5)) * 100, y: 1330 + Math.floor(i / 5) * 170, c: i}));
export const Q12: React.FC = () => (
	<Plan debut={25.2} fin={26.94} cam={(t) => ({z: 1.25, x: lin(t, [25.2, 26.94], [160, -160], ease), y: -200})}>
		{(t, f) => (<>
			<Exterieur id="q12" f={f} />
			{PRES.map((l, i) => <Lapin key={i} x={l.x} y={l.y} s={0.65 + (l.y - 1330) / 800} f={f} c={l.c} ph={i} grignote={i % 3 === 0} />)}
			{T(t, 25.98, 'ILS NE BOUGENT PAS', 96, '#fff')}
		</>)}
	</Plan>
);

export const Q13: React.FC = () => (
	<Plan debut={26.94} fin={28.85} cam={(t) => ({z: lin(t, [26.94, 28.85], [1.3, 1.9], Easing.in(Easing.quad)), y: lin(t, [26.94, 28.85], [-150, -40])})}>
		{(t, f) => (<>
			<Exterieur id="q13" f={f} />
			{[0, 1, 2].map((i) => <Lapin key={i} x={260 + i * 280} y={1500 + (i === 1 ? 60 : 0)} s={1.3} f={f} c={i + 1} ph={i} regard={0} flip={i === 2 && t < 27.3} />)}
		</>)}
	</Plan>
);

export const Q14: React.FC = () => (
	<Plan debut={28.85} fin={30.8} secousse={(t) => (t > 29.2 ? 16 : 0)} cam={() => ({z: 1.1, y: -120})}>
		{(t, f) => (<>
			<Exterieur id="q14" f={f} />
			{Array.from({length: 22}).map((_, i) => {
				const k = lin(t, [28.95 + rnd(i) * 0.5, 30.8], [0, 1], Easing.in(Easing.quad));
				const s = 0.25 + k * 1.6;
				const x = 540 + (rnd(i + 3) - 0.5) * (300 + k * 1400);
				const y = 1250 + k * 700 + rnd(i + 7) * 60;
				return {i, s, x, y};
			}).sort((a, b) => a.y - b.y).map(({i, s, x, y}) => <Lapin key={i} x={x} y={y} s={s} f={f} c={i} ph={i} saute vitesse={0.5} regard={0} flip={x < 540} />)}
			{T(t, 29.19, 'À L\'ATTAQUE !', 120, '#ff4b2b')}
		</>)}
	</Plan>
);

/* 5 : sur les bottes, sur les jambes */
export const Q15: React.FC = () => (
	<Plan debut={30.8} fin={33.81} cam={(t) => ({z: lin(t, [30.8, 32.6, 33.81], [2.0, 1.7, 1.25], ease), y: lin(t, [30.8, 32.6, 33.81], [-560, -480, -150], ease)})}>
		{(t, f) => (<>
			<Exterieur id="q15" f={f} />
			<Humain x={540} y={1500} s={1.3} f={f} {...NAPO} humeur={t > 33.2 ? 'choc' : 'perplexe'} pose={t > 33.2 ? 'crie' : 'debout'} />
			{Array.from({length: 10}).map((_, i) => {
				const a = 30.9 + i * 0.12;
				const x = 380 + (i % 5) * 80;
				const y = 1520 + (i > 4 ? 40 : 0);
				const k = lin(t, [a, a + 0.4], [0, 1]);
				return <Lapin key={i} x={i % 2 ? 1150 - (1150 - x) * k : -100 + (x + 100) * k} y={y - Math.sin(k * Math.PI) * 120} s={0.6} f={f} c={i} ph={i} saute={k < 1} flip={i % 2 === 1} regard={0} />;
			})}
		</>)}
	</Plan>
);

export const Q16: React.FC = () => (
	<Plan debut={33.81} fin={35.27} secousse={() => 6} cam={() => ({z: 1.4, y: -280})}>
		{(t, f) => (<>
			<Exterieur id="q16" f={f} />
			<Humain x={540} y={1520} s={1.3} f={f * 1.5} {...NAPO} humeur="choc" pose="crie" />
			{[[470, 1460], [610, 1470], [480, 1380], [600, 1340], [520, 1290]].map(([x, y], i) => (
				<Lapin key={i} x={x} y={y - lin(t, [33.9 + i * 0.12, 34.4 + i * 0.12], [0, 30])} s={0.42} f={f} c={i + 2} ph={i} debout flip={i % 2 === 0} regard={0} />
			))}
			{[0, 1, 2, 3].map((i) => <Lapin key={'s' + i} x={330 + i * 130} y={1560} s={0.55} f={f} c={i} ph={i} debout regard={0} flip={i < 2} />)}
		</>)}
	</Plan>
);

/* 6 : bâtons, fouets, coups de fusil */
export const Q17: React.FC = () => (
	<Plan debut={35.27} fin={39.75} cam={(t) => ({z: 1.35, x: lin(t, [35.27, 36.6, 37.5, 38.3, 39.75], [0, 320, 0, -320, -320], ease), y: -240})} secousse={(t) => (t > 38.35 && t < 38.7 ? 14 : 0)}>
		{(t, f) => (<>
			<Exterieur id="q17" f={f} />
			<Humain x={230} y={1480} s={1.1} f={f} {...INV[0]} pose={t > 36.6 ? 'baton' : 'debout'} humeur="fache" />
			<Humain x={540} y={1500} s={1.1} f={f} {...INV[1]} pose={t > 37.5 ? 'fouet' : 'debout'} humeur="fache" ph={1} />
			<Humain x={860} y={1480} s={1.1} f={f} {...INV[2]} pose={t > 38.2 ? 'tirair' : 'debout'} humeur="fache" ph={2} />
			{t > 38.35 && (() => {
				const k = lin(t, [38.35, 39.4], [0, 1]);
				return <g>{[0, 1, 2].map((i) => <circle key={i} cx={900 + i * 20} cy={780 - k * 200 - i * 40} r={30 + k * 60} fill="#ddd" stroke={INK} strokeWidth={4} opacity={1 - k} />)}</g>;
			})()}
			{Array.from({length: 7}).map((_, i) => <Lapin key={i} x={80 + i * 150} y={1640 + (i % 2) * 40} s={0.6} f={f} c={i} ph={i} grignote={i % 2 === 0} regard={0} />)}
			<Ecran>
				<Titre x={300} y={420} texte="BÂTONS" taille={90} k={pop(t, 36.71)} c="#fff" rot={-6} />
				<Titre x={560} y={560} texte="FOUETS" taille={90} k={pop(t, 37.59)} c="#fff" rot={5} />
				<Titre x={800} y={420} texte="PAN !" taille={120} k={pop(t, 38.35)} c="#ff4b2b" rot={-4} />
			</Ecran>
		</>)}
	</Plan>
);

export const Q18: React.FC = () => (
	<Plan debut={39.75} fin={40.9} cam={(t) => ({z: lin(t, [39.75, 40.9], [1.5, 1.7], ease), y: -330})}>
		{(t, f) => (<>
			<Exterieur id="q18" f={f} />
			<Humain x={540} y={1520} s={1.3} f={f} {...NAPO} humeur="triste" />
			<Lapin x={560} y={1520 - 1.3 * 395} s={0.45} f={f} c={0} grignote regard={0} />
			{[0, 1, 2, 3, 4].map((i) => <Lapin key={i} x={300 + i * 120} y={1560 + (i % 2) * 20} s={0.5} f={f} c={i + 1} ph={i} grignote />)}
		</>)}
	</Plan>
);

/* 7 : le plus grand général recule */
export const Q19: React.FC = () => (
	<Plan debut={40.9} fin={43.5} cam={(t) => ({z: lin(t, [40.9, 42.9, 43.5], [1.2, 1.45, 1.3], ease), y: -220})}>
		{(t, f) => {
			const recul = t > 43.02;
			return (<>
				<Ciel id="q19" haut={recul ? '#74c4f0' : '#ffcf5a'} bas={recul ? '#e8f6d8' : '#fff3c4'} />
				{!recul && Array.from({length: 16}).map((_, i) => <path key={i} d="M 540 900 L 515 -500 L 565 -500 Z" fill="#fff" opacity={0.35} transform={`rotate(${i * 22.5 + f * 0.6} 540 900)`} />)}
				<Sol y={1300} c="#7db24a" cail="#5f9437" />
				<Humain x={recul ? lin(t, [43.02, 43.5], [540, 380]) : 540} y={1520} s={1.4} f={f} {...NAPO} pose={recul ? 'crie' : 'salut'} humeur={recul ? 'choc' : 'content'} flip={recul} />
				{recul && <Lapin x={lin(t, [43.02, 43.5], [1200, 800])} y={1560} s={0.8} f={f} c={1} saute flip />}
				{!recul && T(t, 41.6, 'LE PLUS GRAND GÉNÉRAL', 88)}
			</>);
		}}
	</Plan>
);

export const Q20: React.FC = () => (
	<Plan debut={43.5} fin={45.4} cam={(t) => ({z: 1.15, x: lin(t, [43.5, 45.4], [120, -60]), y: -200})}>
		{(t, f) => {
			const dx = (t - 43.5) * 700;
			return (<>
				<Exterieur id="q20" f={f} dx={dx} />
				<Caleche x={lin(t, [43.5, 45.4], [1300, 860], sortie)} y={1480} s={0.9} f={f} />
				<Humain x={lin(t, [43.5, 45.4], [200, 560])} y={1500} s={1.1} f={f * 1.8} {...NAPO} pas pose="crie" humeur="choc" />
				{[0, 1, 2].map((i) => <Lapin key={i} x={lin(t, [43.5, 45.4], [-150 - i * 120, 260 - i * 120])} y={1530 + (i % 2) * 40} s={0.6} f={f} c={i} ph={i} saute vitesse={0.5} />)}
			</>);
		}}
	</Plan>
);

/* 8 : les lapins encerclent la voiture */
export const Q21: React.FC = () => (
	<Plan debut={45.4} fin={46.61} cam={() => ({z: 1.25, y: -220})}>
		{(t, f) => {
			const dx = (t - 45.4) * 600;
			return (<>
				<Exterieur id="q21" f={f} dx={dx} />
				{Array.from({length: 8}).map((_, i) => <Lapin key={i} x={((i * 170 + (t - 45.4) * 500) % 1400) - 150} y={1480 + (i % 3) * 50} s={0.75} f={f} c={i} ph={i} saute vitesse={0.5} />)}
			</>);
		}}
	</Plan>
);

export const Q22: React.FC = () => (
	<Plan debut={46.61} fin={49.7} fond="#e8d8b0" cam={(t) => ({z: lin(t, [46.61, 49.7], [1.0, 1.15], ease)})}>
		{(t, f) => {
			const k = lin(t, [46.83, 48.3], [0, 1], ease);
			return (<>
				<rect x={-800} y={-800} width={2680} height={3600} fill="#eadbb4" />
				{Array.from({length: 12}).map((_, i) => <path key={i} d={`M ${rnd(i) * 1080} ${rnd(i + 2) * 1920} q 40 -20 80 0`} stroke="#c9b48a" strokeWidth={6} fill="none" />)}
				<rect x={60} y={420} width={960} height={1260} rx={20} fill="none" stroke="#8a6a3a" strokeWidth={10} strokeDasharray="30 18" />
				<g transform="translate(540 1050) scale(0.55)"><Caleche x={0} y={0} f={f} secoue={2} /></g>
				{[-1, 1].map((sd) => (
					<g key={sd}>
						<path d={`M ${540 + sd * 480} 1400 Q ${540 + sd * 420} 900 ${540 + sd * (480 - 300 * k)} ${1250 - 500 * k}`} stroke="#c0392b" strokeWidth={22} fill="none" strokeLinecap="round" opacity={0.85} />
						{Array.from({length: 6}).map((_, i) => {
							const kk = Math.max(0, k - i * 0.06);
							return <Lapin key={i} x={540 + sd * (480 - 260 * kk) + (i % 2) * 30 * sd} y={1500 - 550 * kk + i * 50} s={0.32} f={f} c={i} ph={i} saute vitesse={0.5} flip={sd > 0} />;
						})}
					</g>
				))}
				{t > 48.37 && Array.from({length: 3}).map((_, r) => Array.from({length: 5}).map((__, i) => (
					<Lapin key={`${r}-${i}`} x={330 + i * 105} y={1480 + r * 80} s={0.3 * pop(t, 48.37 + r * 0.1)} f={f} c={i + r} ph={i} regard={0} />
				)))}
				{T(t, 46.83, 'ENCERCLÉ !', 130, '#c0392b')}
			</>);
		}}
	</Plan>
);

export const Q23: React.FC = () => (
	<Plan debut={49.7} fin={52.45} cam={(t) => ({z: lin(t, [49.7, 52.45], [1.25, 1.55], ease), x: -60, y: -150})} secousse={(t) => (t > 50.2 ? 6 : 0)}>
		{(t, f) => (<>
			<Exterieur id="q23" f={f} />
			<g transform="translate(560 1500)">
				<Caleche x={0} y={0} s={1.2} f={f} secoue={t > 50.2 ? 6 : 0} />
				<defs><clipPath id="fenetre"><rect x={-180} y={-384} width={144} height={120} rx={14} /></clipPath></defs>
				<g clipPath="url(#fenetre)"><Humain x={-108} y={-30} s={0.95} f={f} {...NAPO} humeur="choc" /></g>
			</g>
			{Array.from({length: 6}).map((_, i) => {
				const a = 50.16 + i * 0.3;
				const k = lin(t, [a, a + 0.5], [0, 1]);
				if (k <= 0 || k >= 1) return null;
				const x0 = i % 2 ? 1100 : -50, x1 = 560 + (i % 2 ? 80 : -110), y1 = 1500 - 1.2 * 270;
				return <Lapin key={i} x={x0 + (x1 - x0) * k} y={1560 + (y1 - 1560) * k - Math.sin(k * Math.PI) * 300} s={0.55} f={f} c={i} ph={i} saute flip={i % 2 === 1} />;
			})}
			{T(t, 50.76, 'DANS LA VOITURE !', 96)}
		</>)}
	</Plan>
);

/* 9 : l'explication */
export const Q24: React.FC = () => (
	<Plan debut={52.45} fin={54.55} fond="#2a3550" nuit cam={(t) => ({z: lin(t, [52.45, 54.55], [1.0, 1.15])})}>
		{(t, f) => (<>
			<rect x={-800} y={-800} width={2680} height={3600} fill="#2a3550" />
			<Lapin x={540} y={1300} s={1.6} f={f} c={0} regard={0} />
			<g transform={`translate(${540 + Math.sin(t * 2.5) * 160} ${1050 + Math.cos(t * 2) * 60})`}>
				<circle r={150} fill="#cfe9f5" opacity={0.25} stroke={INK} strokeWidth={18} />
				<circle r={150} fill="none" stroke="#c9a227" strokeWidth={8} />
				<path d="M 105 105 L 230 230" stroke="#6b4a2b" strokeWidth={36} strokeLinecap="round" />
			</g>
			{T(t, 52.56, "L'EXPLICATION", 120)}
		</>)}
	</Plan>
);

export const Q25: React.FC = () => (
	<Plan debut={54.55} fin={57.1} cam={(t) => ({z: lin(t, [54.55, 57.1], [1.2, 1.45], ease), y: -220})}>
		{(t, f) => (<>
			<Exterieur id="q25" f={f} />
			<ellipse cx={540} cy={1500} rx={170} ry={46} fill="#3b2414" stroke={INK} strokeWidth={7} />
			<Lapin x={540} y={1500 - lin(t, [54.7, 55.2], [0, 40])} s={1.0} f={f} c={4} regard={-0.5} />
			{t > 56.11 && (
				<g transform={`translate(540 1300) scale(${pop(t, 56.11)})`}>
					<path d="M -230 -230 L 230 230 M 230 -230 L -230 230" stroke="#c0392b" strokeWidth={40} strokeLinecap="round" opacity={0.9} />
				</g>
			)}
			{T(t, 56.11, 'PAS SAUVAGES', 110, '#fff')}
		</>)}
	</Plan>
);

export const Q26: React.FC = () => (
	<Plan debut={57.1} fin={59.35} cam={(t) => ({z: 1.3, x: lin(t, [57.1, 59.35], [-80, 80]), y: -230})}>
		{(t, f) => (<>
			<Exterieur id="q26" f={f} arbres={false} />
			<g transform="translate(900 1260)">
				<rect x={-200} y={-300} width={400} height={300} fill="#b5422c" stroke={INK} strokeWidth={8} />
				<path d="M -240 -300 L 0 -470 L 240 -300 Z" fill="#7a2a20" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
				<rect x={-70} y={-170} width={140} height={170} fill="#5a2018" stroke={INK} strokeWidth={6} />
			</g>
			<Humain x={300} y={1500} s={1.15} f={f} chapeau="paille" couleur="#5c7fa6" humeur="content" pose="main" />
			<Humain x={660} y={1500} s={1.15} f={f} {...BERT} humeur="content" pose="main" flip />
			<g transform="translate(480 1530)"><Cage x={0} y={0} s={0.8} /><Lapin x={0} y={-12} s={0.35} f={f} c={2} /></g>
			{t > 57.69 && Array.from({length: 6}).map((_, i) => {
				const k = lin(t, [57.69 + i * 0.1, 58.2 + i * 0.1], [0, 1]);
				return <circle key={i} cx={620 - k * 260} cy={1250 - Math.sin(k * Math.PI) * 200} r={22} fill="#ffd23f" stroke={INK} strokeWidth={5} opacity={k < 1 ? 1 : 0} />;
			})}
			{T(t, 57.69, 'ACHETÉS', 120)}
			<Ecran><Titre x={540} y={250} texte="QUELQUES JOURS AVANT" taille={56} k={pop(t, 57.15)} c="#fff" /></Ecran>
		</>)}
	</Plan>
);

const Enclos: React.FC = () => (
	<g>
		{Array.from({length: 12}).map((_, i) => <rect key={i} x={-40 + i * 100} y={1300} width={26} height={180} fill="#c9a46a" stroke={INK} strokeWidth={5} />)}
		<rect x={-60} y={1330} width={1200} height={22} fill="#b08850" stroke={INK} strokeWidth={5} />
		<rect x={-60} y={1410} width={1200} height={22} fill="#b08850" stroke={INK} strokeWidth={5} />
	</g>
);
export const Q27: React.FC = () => (
	<Plan debut={59.35} fin={62.7} cam={(t) => ({z: lin(t, [59.35, 62.7], [1.2, 1.4], ease), x: lin(t, [59.35, 62.7], [-100, 120], ease), y: -230})}>
		{(t, f) => {
			const arrive = t > 61.2;
			return (<>
				<Exterieur id="q27" f={f} arbres={false} />
				{Array.from({length: 7}).map((_, i) => {
					const k = lin(t, [61.3 + i * 0.05, 62.1 + i * 0.05], [0, 1], sortie);
					return <Lapin key={i} x={(200 + i * 120) - k * (120 + i * 60)} y={1440 + (i % 2) * 30} s={0.55} f={f} c={i} ph={i} saute={arrive && k < 1} debout={k >= 1} flip={arrive} regard={arrive ? -1 : 0} coeur={k >= 1 && i % 2 === 0} />;
				})}
				<Enclos />
				<Humain x={lin(t, [60.8, 61.6], [-200, 130], sortie)} y={1640} s={1.2} f={f} chapeau="paille" couleur="#5c7fa6" humeur="content" pas={t < 61.6} />
			</>);
		}}
	</Plan>
);

export const Q28: React.FC = () => (
	<Plan debut={62.7} fin={64.35} cam={(t) => ({z: lin(t, [62.7, 64.35], [1.35, 1.6], ease), x: 140, y: -260})}>
		{(t, f) => (<>
			<Exterieur id="q28" f={f} arbres={false} />
			<Humain x={300} y={1600} s={1.2} f={f} chapeau="paille" couleur="#5c7fa6" humeur="content" pose="main" />
			<g transform={`translate(480 1340) scale(${pop(t, 62.77)})`}>
				<path d="M -90 0 L 90 0 L 70 80 L -70 80 Z" fill="#c9a46a" stroke={INK} strokeWidth={6} />
				{[-50, -10, 30, 60].map((cx, i) => <Carotte key={i} x={cx} y={-20} s={0.6} r={180 + (i - 1.5) * 15} />)}
			</g>
			{Array.from({length: 5}).map((_, i) => <Lapin key={i} x={560 + i * 110} y={1600 + (i % 2) * 30} s={0.6} f={f} c={i} ph={i} debout flip coeur regard={-1} />)}
			{T(t, 62.77, 'À MANGER !', 120)}
		</>)}
	</Plan>
);

/* 10 : la chute */
export const Q29: React.FC = () => (
	<Plan debut={64.35} fin={66.2} cam={(t) => ({z: lin(t, [64.35, 66.2], [1.2, 1.45], ease), y: -250})}>
		{(t, f) => (<>
			<Exterieur id="q29" f={f} />
			<Humain x={540} y={1460} s={1.25} f={f} {...NAPO} humeur="perplexe" />
			{Array.from({length: 8}).map((_, i) => {
				const a = (i / 8) * Math.PI * 2;
				return <Lapin key={i} x={540 + Math.cos(a) * 330} y={1500 + Math.sin(a) * 90} s={0.55} f={f} c={i} ph={i} debout flip={Math.cos(a) > 0} regard={Math.cos(a) > 0 ? 1 : -1} />;
			})}
		</>)}
	</Plan>
);

export const Q30: React.FC = () => (
	<Plan debut={66.2} fin={71.3} cam={(t) => ({z: lin(t, [66.2, 69.0], [1.3, 1.55], ease), x: lin(t, [66.2, 69.0], [0, 60], ease), y: lin(t, [66.2, 69.0], [-200, -260], ease)})}>
		{(t, f) => {
			const donne = t > 67.78;
			return (<>
				<Exterieur id="q30" f={f} />
				<PiqueNique x={850} y={1420} s={0.8} />
				<Humain x={480} y={1480} s={1.25} f={f} {...NAPO} humeur={donne ? 'content' : 'perplexe'} pose={donne ? 'main' : 'debout'} />
				{donne && <Carotte x={480 + 140 * 1.25} y={1480 - 190 * 1.25} s={0.7} r={100} />}
				{Array.from({length: 6}).map((_, i) => (
					<Lapin key={i} x={260 + i * 115} y={1530 + (i % 2) * 40} s={0.6} f={f} c={i} ph={i} debout={!donne || i % 2 === 0} grignote={donne} coeur={donne && i % 2 === 1} flip={i > 2} regard={0} />
				))}
				{t < 69.4 && T(t, 67.78, 'LE DÉJEUNER', 120)}
				<Ecran><Titre x={540} y={400} texte="FIN" taille={170} k={pop(t, 69.4)} /></Ecran>
			</>);
		}}
	</Plan>
);

export const PLANS2: [number, number, React.FC][] = [
	[0, 2.57, Q01], [2.57, 3.99, Q02], [3.99, 5.96, Q03], [5.96, 7.47, Q04], [7.47, 10.3, Q05], [10.3, 13.1, Q06], [13.1, 17.95, Q07],
	[17.95, 20.15, Q08], [20.15, 22.2, Q09], [22.2, 23.4, Q10], [23.4, 25.2, Q11], [25.2, 26.94, Q12], [26.94, 28.85, Q13], [28.85, 30.8, Q14],
	[30.8, 33.81, Q15], [33.81, 35.27, Q16], [35.27, 39.75, Q17], [39.75, 40.9, Q18], [40.9, 43.5, Q19], [43.5, 45.4, Q20], [45.4, 46.61, Q21],
	[46.61, 49.7, Q22], [49.7, 52.45, Q23], [52.45, 54.55, Q24], [54.55, 57.1, Q25], [57.1, 59.35, Q26], [59.35, 62.7, Q27], [62.7, 64.35, Q28],
	[64.35, 66.2, Q29], [66.2, 71.3, Q30],
];
