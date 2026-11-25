import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran, Exterieur} from './scene';
import {INK, FONT, rnd, lin, pop, sortie, Ciel, Sol, Humain, Titre, Bulle, Magasin, Rayon, Cassette, Enveloppe, Avion, Maison, Salon, Canape, Billet, Nuage} from './dessins';

const ease = Easing.inOut(Easing.cubic);
const F1 = {couleur: '#2f6fb0', chapeau: 'aucun' as const, cheveux: '#3b2a1e', jambesC: '#2f3e5a'};
const F2 = {couleur: '#3c8a4a', chapeau: 'aucun' as const, cheveux: '#c9a060', jambesC: '#2f3e5a'};
const PATRON = {couleur: '#3a3f4a', chapeau: 'aucun' as const, cheveux: '#8f8f8f', jambesC: '#2c2f36', cravate: '#c0392b'};
const PERE = {couleur: '#d86a4a', chapeau: 'aucun' as const, cheveux: '#4a2e1a', jambesC: '#2f3e5a'};
const MERE = {couleur: '#7a3fa0', chapeau: 'aucun' as const, cheveux: '#a0522d', jambesC: '#2f3e5a'};
const ENFANT = {couleur: '#e0b21a', chapeau: 'aucun' as const, cheveux: '#c9a060', jambesC: '#2f6fb0'};
const T = (t: number, a: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => <Ecran><Titre x={540} y={y} texte={texte} taille={taille} k={pop(t, a)} c={c} /></Ecran>;

const Ville: React.FC<{id: string; f: number; nuit?: boolean}> = ({id, f, nuit}) => (
	<>
		<Ciel id={id} haut={nuit ? '#1c2747' : '#74c4f0'} bas={nuit ? '#3d4f86' : '#dff0fa'} />
		{!nuit && <><Nuage x={200} y={300} /><Nuage x={850} y={480} s={0.8} /></>}
		{nuit && Array.from({length: 30}).map((_, i) => <circle key={i} cx={rnd(i) * 1080} cy={rnd(i + 5) * 900} r={3 + rnd(i + 2) * 3} fill="#fff" opacity={0.5 + 0.5 * Math.sin(f * 0.1 + i)} />)}
		{Array.from({length: 9}).map((_, i) => <rect key={i} x={-200 + i * 170} y={900 - rnd(i) * 300} width={150} height={600} fill={nuit ? '#2b3557' : '#a9bccd'} stroke={INK} strokeWidth={5} />)}
		<rect x={-800} y={1300} width={2680} height={1400} fill={nuit ? '#4a4a52' : '#b8b2a6'} stroke={INK} strokeWidth={6} />
		<rect x={-800} y={1300} width={2680} height={40} fill={nuit ? '#5c5c66' : '#d6d0c4'} />
	</>
);

/* l'accroche */
export const R01: React.FC = () => (
	<Plan debut={0} fin={5.63} sansEntree cam={(t) => ({z: lin(t, [0, 5.63], [1.05, 1.3], ease), y: -60})}>
		{(t, f) => (<>
			<rect x={-800} y={-800} width={2680} height={3600} fill="#2a3550" />
			<rect x={-200} y={1150} width={1480} height={900} fill="#7a5532" stroke={INK} strokeWidth={8} />
			<g transform={`translate(${lin(t, [1.1, 1.9], [-500, 540], sortie)} 1000) rotate(-4)`}><Billet x={0} y={0} s={1.1} texte={t > 3.76 ? '50 000 000 $' : '… $'} /></g>
			<Humain x={540} y={1840} s={1.6} f={f} {...PATRON} humeur={t > 2.75 ? 'perplexe' : 'neutre'} />
			{T(t, 0.19, '2000', 200)}
			{T(t, 2.75, 'NETFLIX À VENDRE', 90, '#fff', 560)}
		</>)}
	</Plan>
);

export const R02: React.FC = () => (
	<Plan debut={5.63} fin={8.55} cam={(t) => ({z: lin(t, [5.63, 8.55], [1.2, 1.35], ease), y: -340})}>
		{(t, f) => {
			const poof = lin(t, [7.1, 7.6], [0, 1]);
			return (<>
				<Ville id="r2" f={f} />
				<g opacity={1 - poof} transform={`translate(540 1330) scale(${1 - poof * 0.3})`}><Magasin x={0} y={0} s={1.15} nom="BLOCKBUSTER" /></g>
				{poof > 0 && Array.from({length: 10}).map((_, i) => <circle key={i} cx={540 + (rnd(i) - 0.5) * 900 * poof} cy={1150 - rnd(i + 3) * 400 * poof} r={60 + poof * 80} fill="#ddd" stroke={INK} strokeWidth={4} opacity={1 - poof * 0.8} />)}
				{T(t, 5.92, 'NON.', 200, '#ff4b2b', 250)}
			</>);
		}}
	</Plan>
);

/* Blockbuster, le roi */
export const R03: React.FC = () => (
	<Plan debut={8.55} fin={13.77} cam={(t) => ({z: lin(t, [8.55, 13.77], [1.35, 1.12], ease), y: -340})}>
		{(t, f) => (<>
			<Ville id="r3" f={f} />
			<Magasin x={540} y={1330} s={1.15} nom="BLOCKBUSTER" />
			{t > 11.63 && (
				<g transform={`translate(540 ${lin(t, [11.63, 11.95], [400, 690], Easing.out(Easing.bounce))}) scale(1.3)`}>
					<path d="M -110 40 L -130 -60 L -60 -10 L 0 -90 L 60 -10 L 130 -60 L 110 40 Z" fill="#ffd23f" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
					{[-70, 0, 70].map((cx) => <circle key={cx} cx={cx} cy={15} r={12} fill="#c0392b" stroke={INK} strokeWidth={4} />)}
				</g>
			)}
			{[0, 1, 2, 3].map((i) => <Humain key={i} x={lin(t, [8.6, 13.7], [-150 + i * 90, 260 + i * 90])} y={1620 + (i % 2) * 40} s={0.8} f={f} pas {...[PERE, MERE, F1, ENFANT][i]} humeur="content" ph={i} />)}
		</>)}
	</Plan>
);

export const R04: React.FC = () => (
	<Plan debut={13.77} fin={16.08} cam={(t) => ({z: lin(t, [13.77, 16.08], [1.5, 0.85], ease), y: -60})}>
		{(t, f) => (<>
			<rect x={-1500} y={-1500} width={4080} height={5000} fill="#4ea4d9" />
			{Array.from({length: 49}).map((_, i) => {
				const cx = 540 + ((i % 7) - 3) * 330, cy = 1000 + (Math.floor(i / 7) - 3) * 330;
				return <g key={i} transform={`translate(${cx} ${cy}) scale(${0.32 * pop(t, 13.85 + rnd(i) * 1.6)})`}><Magasin x={0} y={0} nom="BLOCKBUSTER" /></g>;
			})}
			{T(t, 13.96, 'DES MILLIERS DE MAGASINS', 80)}
		</>)}
	</Plan>
);

/* le vendredi soir */
export const R05: React.FC = () => (
	<Plan debut={16.08} fin={20.27} cam={(t) => ({z: lin(t, [16.08, 20.27], [1.15, 1.45], ease), x: lin(t, [16.08, 20.27], [120, -40], ease), y: lin(t, [16.08, 20.27], [-150, -260], ease)})}>
		{(t, f) => (<>
			<rect x={-800} y={-800} width={2680} height={3600} fill="#f4e7c8" />
			<rect x={-800} y={1480} width={2680} height={1200} fill="#c9b48a" stroke={INK} strokeWidth={6} />
			<Rayon x={170} y={1480} s={1} graine={1} />
			<Rayon x={880} y={1480} s={1} graine={4} />
			<Humain x={400} y={1640} s={1.1} f={f} {...PERE} humeur="content" regard={1} />
			<Humain x={640} y={1640} s={1.05} f={f} {...MERE} humeur="content" regard={-1} ph={1} flip />
			<Humain x={520} y={1700} s={0.75} f={f} {...ENFANT} pose={t > 18.6 ? 'salut' : 'debout'} humeur="content" ph={2} />
			{t > 19.0 && <Cassette x={560} y={lin(t, [19.0, 19.3], [1500, 1290], sortie)} s={0.9} r={-8} c="#2f5fa8" />}
			{T(t, 16.23, 'VENDREDI SOIR', 120)}
		</>)}
	</Plan>
);

/* Netflix, minuscule */
export const R06: React.FC = () => (
	<Plan debut={20.27} fin={22.84} cam={(t) => ({z: lin(t, [20.27, 21.6, 22.84], [1.1, 1.1, 2.6], ease), x: lin(t, [21.6, 22.84], [0, -330], ease), y: lin(t, [21.6, 22.84], [-200, -330], ease)})}>
		{(t, f) => (<>
			<Ville id="r6" f={f} />
			<Magasin x={380} y={1330} s={1.0} nom="BLOCKBUSTER" />
			<g transform="translate(870 1330) scale(0.32)">
				<rect x={-160} y={-260} width={320} height={260} fill="#f0e6d6" stroke={INK} strokeWidth={14} />
				<rect x={-180} y={-330} width={360} height={80} rx={10} fill="#d6312c" stroke={INK} strokeWidth={14} />
				<text x={0} y={-272} textAnchor="middle" fontFamily={FONT} fontSize={60} fill="#fff">NETFLIX</text>
				<rect x={-50} y={-150} width={100} height={150} fill="#7a5532" stroke={INK} strokeWidth={10} />
			</g>
			{T(t, 21.27, 'NETFLIX', 130, '#ff4b2b')}
			{T(t, 21.94, 'MINUSCULE', 90, '#fff', 540)}
		</>)}
	</Plan>
);

export const R07: React.FC = () => (
	<Plan debut={22.84} fin={27.34} cam={(t) => ({z: lin(t, [22.84, 27.34], [1.25, 1.45], ease), x: lin(t, [22.84, 27.34], [-60, 80]), y: -200})}>
		{(t, f) => (<>
			<rect x={-800} y={-800} width={2680} height={3600} fill="#e9dcc6" />
			<rect x={-800} y={1450} width={2680} height={1200} fill="#9a7a58" stroke={INK} strokeWidth={6} />
			<rect x={100} y={1250} width={560} height={40} fill="#7a5532" stroke={INK} strokeWidth={6} />
			<rect x={130} y={1290} width={30} height={170} fill="#7a5532" stroke={INK} strokeWidth={5} />
			<rect x={600} y={1290} width={30} height={170} fill="#7a5532" stroke={INK} strokeWidth={5} />
			<Humain x={360} y={1520} s={1.05} f={f} {...F1} pose="ecrit" humeur="content" />
			<g transform="translate(860 1500)">
				<rect x={-90} y={-260} width={180} height={260} rx={20} fill="#2f5fa8" stroke={INK} strokeWidth={8} />
				<rect x={-60} y={-200} width={120} height={18} rx={9} fill={INK} />
			</g>
			{Array.from({length: 8}).map((_, i) => {
				const k = ((t - 24.0) * 0.9 + i * 0.125) % 1;
				if (t < 24.0) return null;
				return <Enveloppe key={i} x={470 + k * 390} y={1220 - Math.sin(k * Math.PI) * 260 + k * 80} s={0.55} r={k * 40 - 20} />;
			})}
			{t > 26.3 && Array.from({length: 7}).map((_, i) => <Enveloppe key={'p' + i} x={240 + (i % 4) * 70} y={1235 - Math.floor(i / 4) * 40} s={0.5 * pop(t, 26.3 + i * 0.05)} r={(i % 3 - 1) * 8} />)}
			{T(t, 24.51, 'DES DVD PAR LA POSTE', 84)}
		</>)}
	</Plan>
);

export const R08: React.FC = () => (
	<Plan debut={27.34} fin={29.07} cam={(t) => ({z: lin(t, [27.34, 29.07], [1.1, 1.25], ease)})}>
		{(t, f) => {
			const k = lin(t, [27.5, 28.9], [0, 1]);
			return (<>
				<rect x={-800} y={-800} width={2680} height={3600} fill="#f6efe0" />
				{[0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1={140} y1={700 + i * 150} x2={940} y2={700 + i * 150} stroke="#e0d4bc" strokeWidth={4} />)}
				<path d={`M 160 760 L ${160 + 260 * Math.min(1, k * 3)} ${760 + 180 * Math.min(1, k * 3)} ${k > 0.33 ? `L ${420 + 220 * Math.min(1, (k - 0.33) * 3)} ${940 - 80 * Math.min(1, (k - 0.33) * 3)}` : ''} ${k > 0.66 ? `L ${640 + 280 * (k - 0.66) * 3} ${860 + 520 * (k - 0.66) * 3}` : ''}`} stroke="#d6312c" strokeWidth={22} fill="none" strokeLinecap="round" strokeLinejoin="round" />
				{Array.from({length: 10}).map((_, i) => {
					const kk = ((t - 27.34) * 1.2 + i * 0.1) % 1;
					return <circle key={i} cx={240 + i * 70} cy={1450 + kk * 400} r={28} fill="#ffd23f" stroke={INK} strokeWidth={5} opacity={1 - kk} />;
				})}
				{T(t, 27.73, 'ET ELLE PERD DE L\'ARGENT', 76, '#fff')}
			</>);
		}}
	</Plan>
);

/* l'avion, la réunion */
export const R09: React.FC = () => (
	<Plan debut={29.07} fin={32.71} cam={(t) => ({z: 1.15, x: lin(t, [29.07, 32.71], [100, -100]), y: -100})}>
		{(t, f) => (<>
			<Ciel id="r9" haut="#5aa9e0" bas="#ffe1b0" />
			{Array.from({length: 6}).map((_, i) => <Nuage key={i} x={((1400 - (t - 29) * 500 - i * 300) % 1700 + 1700) % 1700 - 300} y={500 + i * 220} s={0.8 + (i % 3) * 0.3} />)}
			<Avion x={lin(t, [29.07, 32.71], [380, 700])} y={1000 + Math.sin(t * 2) * 20} s={1.1} r={-4} />
			{T(t, 32.2, 'DALLAS', 150)}
		</>)}
	</Plan>
);

const Bureau: React.FC<{f: number}> = () => (
	<>
		<rect x={-800} y={-800} width={2680} height={3600} fill="#3a4766" />
		<rect x={80} y={300} width={920} height={700} fill="#8fb4d8" stroke={INK} strokeWidth={10} />
		{Array.from({length: 7}).map((_, i) => <rect key={i} x={110 + i * 130} y={700 - rnd(i) * 300} width={110} height={400} fill="#5a7aa0" />)}
		<line x1={540} y1={300} x2={540} y2={1000} stroke={INK} strokeWidth={8} />
		<rect x={-800} y={1450} width={2680} height={1200} fill="#6b4a3a" stroke={INK} strokeWidth={6} />
	</>
);
export const R10: React.FC = () => (
	<Plan debut={32.71} fin={38.49} cam={(t) => ({z: lin(t, [32.71, 35.4, 36.5, 38.49], [1.1, 1.25, 1.35, 1.25], ease), x: lin(t, [32.71, 35.4, 36.5], [-120, 60, 0], ease), y: -200})}>
		{(t, f) => (<>
			<Bureau f={f} />
			<path d="M 620 1060 Q 620 860 760 860 Q 900 860 900 1060 L 900 1300 L 620 1300 Z" fill="#2a2a2e" stroke={INK} strokeWidth={8} />
			<Humain x={760} y={1420} s={1.15} f={f} {...PATRON} humeur="neutre" regard={-1} />
			<rect x={520} y={1180} width={520} height={50} fill="#5a3b26" stroke={INK} strokeWidth={8} />
			<rect x={560} y={1230} width={440} height={240} fill="#6b4a2b" stroke={INK} strokeWidth={8} />
			<Humain x={180} y={1600} s={1.1} f={f} {...F1} humeur="content" pose={t > 35.4 ? 'main' : 'debout'} flip={false} regard={1} />
			<Humain x={360} y={1620} s={1.1} f={f} {...F2} humeur="content" regard={1} ph={1} />
			{t > 35.4 && <g transform={`translate(${lin(t, [35.4, 36.1], [300, 760], sortie)} 1150) scale(0.55) rotate(-3)`}><Billet x={0} y={0} texte={t > 36.51 ? '50 000 000 $' : '… $'} /></g>}
			{T(t, 36.51, '50 MILLIONS', 140, '#7be07b')}
		</>)}
	</Plan>
);

export const R11: React.FC = () => (
	<Plan debut={38.49} fin={41.02} cam={(t) => ({z: lin(t, [38.49, 41.02], [1.8, 2.2], ease), x: -220, y: -90})}>
		{(t, f) => {
			const tremble = t > 39.75 ? Math.sin(f * 2.1) * 6 : 0;
			return (<>
				<Bureau f={f} />
				<path d="M 620 1060 Q 620 860 760 860 Q 900 860 900 1060 L 900 1300 L 620 1300 Z" fill="#2a2a2e" stroke={INK} strokeWidth={8} />
				<g transform={`translate(${tremble} 0)`}><Humain x={760} y={1420} s={1.15} f={f} {...PATRON} humeur={t > 39.75 ? 'pouffe' : 'neutre'} regard={-1} /></g>
				<rect x={520} y={1180} width={520} height={50} fill="#5a3b26" stroke={INK} strokeWidth={8} />
				{t > 40.2 && [0, 1].map((i) => <ellipse key={i} cx={700 + i * 120} cy={lin(t, [40.2 + i * 0.1, 40.9 + i * 0.1], [950, 1050])} rx={10} ry={16} fill="#9fdcff" stroke={INK} strokeWidth={3} />)}
			</>);
		}}
	</Plan>
);

export const R12: React.FC = () => (
	<Plan debut={41.02} fin={43.78} cam={(t) => ({z: lin(t, [41.02, 42.4, 43.78], [1.3, 1.6, 1.35], ease), x: lin(t, [41.02, 42.4, 43.05], [-150, 100, -100], ease), y: -230})}>
		{(t, f) => (<>
			<Bureau f={f} />
			<Humain x={760} y={1420} s={1.15} f={f} {...PATRON} humeur={t > 43.05 ? 'content' : 'perplexe'} pose={t > 42.4 && t < 43.05 ? 'main' : t > 43.05 ? 'salut' : 'debout'} flip regard={-1} />
			<rect x={520} y={1180} width={520} height={50} fill="#5a3b26" stroke={INK} strokeWidth={8} />
			<rect x={560} y={1230} width={440} height={240} fill="#6b4a2b" stroke={INK} strokeWidth={8} />
			<Enveloppe x={520} y={1150} s={0.35 * (t > 42.4 ? 1 + 0.15 * Math.sin(f * 0.5) : 1)} r={-6} />
			<Humain x={250} y={1600} s={1.1} f={f} {...F1} humeur={t > 43.05 ? 'triste' : 'perplexe'} regard={1} />
			{T(t, 41.02, '50 MILLIONS ?', 110, '#fff')}
			{t > 42.4 && t < 43.05 && T(t, 42.4, 'POUR ÇA ?', 120, '#fff', 560)}
			{T(t, 43.05, 'NON MERCI.', 140, '#ff4b2b', 560)}
		</>)}
	</Plan>
);

/* les années passent */
export const R13: React.FC = () => (
	<Plan debut={43.78} fin={45.24} fond="#2a3550" cam={() => ({z: 1.1})}>
		{(t, f) => {
			const an = Math.min(2009, 2001 + Math.floor(lin(t, [43.9, 45.1], [0, 9])));
			return (<>
				<rect x={-800} y={-800} width={2680} height={3600} fill="#2a3550" />
				<g transform="translate(540 980)">
					<rect x={-280} y={-300} width={560} height={600} rx={30} fill="#fff" stroke={INK} strokeWidth={10} />
					<rect x={-280} y={-300} width={560} height={150} rx={30} fill="#d6312c" stroke={INK} strokeWidth={10} />
					<text x={0} y={140} textAnchor="middle" fontFamily={FONT} fontSize={220} fill={INK}>{an}</text>
					{[-160, 160].map((cx) => <rect key={cx} x={cx - 18} y={-350} width={36} height={100} rx={18} fill="#9a9a9a" stroke={INK} strokeWidth={6} />)}
				</g>
				{T(t, 43.99, 'LES ANNÉES PASSENT', 92, '#fff')}
			</>);
		}}
	</Plan>
);

export const R14: React.FC = () => (
	<Plan debut={45.24} fin={47.52} cam={(t) => ({z: 1.2, x: lin(t, [45.24, 47.52], [160, -160], ease), y: -200})}>
		{(t, f) => (<>
			<Exterieur id="r14" f={f} arbres={false} />
			{[0, 1, 2, 3, 4].map((i) => <Maison key={i} x={-100 + i * 320} y={1400 + (i % 2) * 40} s={0.95} c={['#e8c07a', '#a8c8e8', '#e8a8a0', '#c0e0a0', '#e0c8f0'][i]} allume={lin(t, [45.6 + i * 0.25, 45.9 + i * 0.25], [0, 1])} />)}
			{T(t, 45.24, 'INTERNET', 140, '#2f9be0')}
		</>)}
	</Plan>
);

export const R15: React.FC = () => (
	<Plan debut={47.52} fin={50.01} cam={(t) => ({z: lin(t, [47.52, 50.01], [1.1, 1.3], ease), y: -150})}>
		{(t, f) => (<>
			<Salon f={f} ecran="cassette" />
			<Humain x={330} y={1560} s={1.0} f={f} {...PERE} humeur="content" regard={1} />
			<Humain x={560} y={1560} s={0.95} f={f} {...MERE} humeur="content" regard={1} ph={1} />
			<Canape x={440} y={1640} s={1} />
			<Humain x={800} y={1640} s={0.7} f={f} {...ENFANT} humeur="content" ph={2} />
			{T(t, 47.52, 'PLUS BESOIN DE SORTIR', 84)}
		</>)}
	</Plan>
);

export const R16: React.FC = () => (
	<Plan debut={50.01} fin={55.05} cam={(t) => ({z: lin(t, [50.01, 52.49, 55.05], [1.4, 1.3, 1.15], ease), x: lin(t, [50.01, 52.49], [-140, 0], ease), y: -160})}>
		{(t, f) => {
			const k = lin(t, [52.49, 53.4], [0, 1], ease);
			return (<>
				<Salon f={f} ecran={t > 53.36 ? 'lecture' : 'eteint'} />
				<Canape x={440} y={1640} s={1} />
				{k < 1 && <Enveloppe x={540 + 160 * k} y={1050 - 20 * k} s={1.4 * (1 - k * 0.7)} r={-6 + 6 * k} />}
				{t > 53.36 && Array.from({length: 6}).map((_, i) => <circle key={i} cx={700} cy={1130} r={300 + ((f * 6 + i * 50) % 300)} fill="none" stroke="#d6312c" strokeWidth={6} opacity={0.4 - ((f * 6 + i * 50) % 300) / 750} />)}
				{T(t, 50.01, 'NETFLIX', 130, '#ff4b2b')}
				{T(t, 53.36, 'LES FILMS SUR INTERNET', 80, '#fff', 560)}
			</>);
		}}
	</Plan>
);

/* la faillite */
export const R17: React.FC = () => (
	<Plan debut={55.05} fin={57.86} cam={(t) => ({z: lin(t, [55.05, 57.86], [1.15, 1.4], ease), y: -230})} secousse={(t) => (t > 56.78 && t < 57.1 ? 22 : 0)}>
		{(t, f) => (<>
			<Ville id="r17" f={f} />
			<Magasin x={540} y={1330} s={1.15} nom="BLOCKBUSTER" ferme={lin(t, [55.9, 56.7], [0, 1], Easing.in(Easing.quad))} />
			{t > 56.78 && (
				<g transform={`translate(540 1100) rotate(-12) scale(${lin(t, [56.78, 56.9], [1.5, 1])})`}>
					<rect x={-330} y={-100} width={660} height={200} rx={20} fill="none" stroke="#c0392b" strokeWidth={18} />
					<text x={0} y={50} textAnchor="middle" fontFamily={FONT} fontSize={140} fill="#c0392b">FAILLITE</text>
				</g>
			)}
			{T(t, 55.28, '2010', 200)}
		</>)}
	</Plan>
);

export const R18: React.FC = () => (
	<Plan debut={57.86} fin={61.68} fond="#141b33" nuit cam={(t) => ({z: lin(t, [57.86, 61.68], [1.4, 1.05], ease)})}>
		{(t, f) => (<>
			<rect x={-1500} y={-1500} width={4080} height={5000} fill="#141b33" />
			{Array.from({length: 40}).map((_, i) => <circle key={i} cx={rnd(i) * 1080} cy={rnd(i + 9) * 1920} r={3} fill="#fff" opacity={0.5} />)}
			<g transform={`translate(540 1050) rotate(${f * 0.3})`}>
				<circle r={330} fill="#4ea4d9" stroke={INK} strokeWidth={10} />
				<path d="M -220 -120 q 80 -100 180 -40 q 60 60 -20 120 q -100 60 -160 -80 M 60 80 q 100 -60 180 20 q -20 120 -120 140 q -80 -40 -60 -160" fill="#6f9e45" stroke={INK} strokeWidth={8} />
			</g>
			{Array.from({length: 26}).map((_, i) => {
				const a = rnd(i) * Math.PI * 2, d = 380 + rnd(i + 4) * 260;
				return (
					<g key={i} transform={`translate(${540 + Math.cos(a) * d} ${1050 + Math.sin(a) * d}) scale(${0.5 * pop(t, 58.81 + rnd(i + 2) * 1.8)})`}>
						<rect x={-60} y={-40} width={120} height={80} rx={10} fill="#141414" stroke="#d6312c" strokeWidth={8} />
						<path d="M -12 -18 L 18 0 L -12 18 Z" fill="#d6312c" />
					</g>
				);
			})}
			{T(t, 59.74, 'DES CENTAINES DE MILLIONS', 76)}
			{T(t, 60.65, "D'ABONNÉS", 100, '#fff', 520)}
		</>)}
	</Plan>
);

/* le dernier magasin */
export const R19: React.FC = () => (
	<Plan debut={61.68} fin={65.45} fond="#141b33" nuit cam={(t) => ({z: lin(t, [61.68, 63.83, 65.45], [1.0, 1.2, 2.2], ease), x: 0, y: 0})}>
		{(t, f) => (<>
			<rect x={-1500} y={-1500} width={4080} height={5000} fill="#141b33" />
			{Array.from({length: 49}).map((_, i) => {
				const cx = 540 + ((i % 7) - 3) * 230, cy = 1000 + (Math.floor(i / 7) - 3) * 230;
				const garde = i === 24;
				const eteint = garde ? 0 : lin(t, [62.0 + rnd(i) * 1.2, 62.3 + rnd(i) * 1.2], [0, 1]);
				return (<g key={i}>{garde && <circle cx={cx} cy={cy} r={50 + (f % 30) * 2} fill="none" stroke="#ffd23f" strokeWidth={6} opacity={1 - (f % 30) / 30} />}<circle cx={cx} cy={cy} r={garde ? 30 : 22} fill="#ffd23f" opacity={1 - eteint * 0.92} stroke={INK} strokeWidth={4} /></g>);
			})}
			{T(t, 63.83, 'UN SEUL MAGASIN', 110)}
		</>)}
	</Plan>
);

export const R20: React.FC = () => (
	<Plan debut={65.45} fin={67.54} cam={(t) => ({z: lin(t, [65.45, 67.54], [1.45, 1.2], ease), y: -230})}>
		{(t, f) => (<>
			<Exterieur id="r20" f={f} />
			<Magasin x={540} y={1380} s={1.0} nom="BLOCKBUSTER" />
			{T(t, 65.6, 'BEND, OREGON', 120)}
		</>)}
	</Plan>
);

export const R21: React.FC = () => (
	<Plan debut={67.54} fin={73.1} cam={(t) => ({z: lin(t, [67.54, 70.5], [1.15, 1.35], ease), x: lin(t, [67.54, 70.5], [80, -40], ease), y: -230})}>
		{(t, f) => (<>
			<Exterieur id="r21" f={f} />
			<Magasin x={540} y={1330} s={1.0} nom="BLOCKBUSTER" />
			{[0, 1, 2, 3, 4].map((i) => {
				const flash = ((f + i * 23) % 60) < 3 && t > 67.9;
				const p = [PERE, MERE, F1, F2, ENFANT][i];
				return (
					<g key={i}>
						<Humain x={lin(t, [67.54, 68.6], [-200 + i * 60, 120 + i * 200], sortie)} y={1640 + (i % 2) * 40} s={i === 4 ? 0.7 : 0.95} f={f} {...p} pose={t > 68.6 ? 'main' : 'debout'} pas={t < 68.6} humeur="content" flip={false} ph={i} regard={1} />
						{flash && <circle cx={120 + i * 200 + 130} cy={1640 - 210} r={60} fill="#fff" opacity={0.9} />}
					</g>
				);
			})}
			{t < 71.2 && T(t, 69.29, 'COMME UN MUSÉE', 110)}
			{T(t, 71.2, 'FIN', 160, '#FFD23F', 250)}
		</>)}
	</Plan>
);

export const PLANS3: [number, number, React.FC][] = [
	[0, 5.63, R01], [5.63, 8.55, R02], [8.55, 13.77, R03], [13.77, 16.08, R04], [16.08, 20.27, R05], [20.27, 22.84, R06], [22.84, 27.34, R07],
	[27.34, 29.07, R08], [29.07, 32.71, R09], [32.71, 38.49, R10], [38.49, 41.02, R11], [41.02, 43.78, R12], [43.78, 45.24, R13], [45.24, 47.52, R14],
	[47.52, 50.01, R15], [50.01, 55.05, R16], [55.05, 57.86, R17], [57.86, 61.68, R18], [61.68, 65.45, R19], [65.45, 67.54, R20], [67.54, 73.1, R21],
];
