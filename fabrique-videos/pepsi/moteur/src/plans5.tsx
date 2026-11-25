import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran, Exterieur} from './scene';
import {INK, FONT, rnd, lin, pop, sortie, Ciel, Nuage, Soleil, Humain, Titre, Bulle, Salon, Canape, Billet, Enveloppe, Bouteille, Jeton, Jet, Lycee, Calculatrice, Tribunal, Marteau, Cadeau, BLEU} from './dessins';

const ease = Easing.inOut(Easing.cubic);
const JOHN = {couleur: '#e0b21a', chapeau: 'aucun' as const, cheveux: '#3b2a1e', jambesC: '#2f3e5a'};
const CADRE = {couleur: '#2c3e66', chapeau: 'aucun' as const, cheveux: '#8f8f8f', jambesC: '#2c2f36', cravate: BLEU};
const CADRE2 = {couleur: '#3a3f4a', chapeau: 'aucun' as const, cheveux: '#4a2e1a', jambesC: '#2c2f36', cravate: '#c0392b'};
const JUGE = {couleur: '#1b1b1e', chapeau: 'aucun' as const, cheveux: '#d0d0d0', jambesC: '#1b1b1e'};
const ADO = {couleur: '#d6312c', chapeau: 'aucun' as const, cheveux: '#c9a060', jambesC: '#2f3e5a'};
const T = (t: number, a: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => <Ecran><Titre x={540} y={y} texte={texte} taille={taille} k={pop(t, a)} c={c} /></Ecran>;
const Bureau: React.FC = () => (
	<>
		<rect x={-800} y={-800} width={2680} height={3600} fill="#d9e4f2" />
		<rect x={120} y={360} width={840} height={620} fill="#9fc2e0" stroke={INK} strokeWidth={10} />
		{Array.from({length: 6}).map((_, i) => <rect key={i} x={150 + i * 135} y={650 - rnd(i) * 250} width={110} height={360} fill="#6f8fb0" />)}
		<rect x={-800} y={1450} width={2680} height={1200} fill="#5a6478" stroke={INK} strokeWidth={6} />
		<rect x={300} y={330} width={480} height={90} rx={12} fill={BLEU} stroke={INK} strokeWidth={8} />
		<text x={540} y={395} textAnchor="middle" fontFamily={FONT} fontSize={60} fill="#fff">PEPSI</text>
	</>
);

export const Y01: React.FC = () => (
	<Plan debut={0} fin={5.7} sansEntree cam={(t) => ({z: lin(t, [0, 5.7], [1.2, 1.35], ease), x: lin(t, [0, 3.2, 5.7], [200, 200, -60], ease), y: -230})}>
		{(t, f) => (<>
			<Exterieur id="y1" f={f} arbres={false} />
			<Humain x={330} y={1560} s={1.1} f={f} {...JOHN} humeur="content" pose={t > 3.9 ? 'main' : 'debout'} regard={1} />
			{t > 3.1 && <Jet x={lin(t, [3.1, 3.9], [1500, 860], sortie)} y={1380} s={0.75} f={f} pilote={false} />}
			{t > 4.4 && [0, 1, 2, 3].map((i) => <Bouteille key={i} x={180 + i * 60} y={1600 - (i % 2) * 10} s={0.55 * pop(t, 4.4 + i * 0.08)} />)}
			{T(t, 0.4, '1996', 200)}
			{T(t, 4.6, 'AVEC DES POINTS PEPSI', 72, '#fff', 560)}
		</>)}
	</Plan>
);

export const Y02: React.FC = () => (
	<Plan debut={5.7} fin={8.1} cam={(t) => ({z: lin(t, [5.7, 8.1], [1.1, 1.3], ease), y: -150})}>
		{(t, f) => (<>
			<rect x={-800} y={-800} width={2680} height={3600} fill={BLEU} />
			{Array.from({length: 16}).map((_, i) => <path key={i} d="M 540 960 L 515 -500 L 565 -500 Z" fill="#fff" opacity={0.12} transform={`rotate(${i * 22.5 + f * 0.8} 540 960)`} />)}
			{Array.from({length: 7}).map((_, i) => <Bouteille key={i} x={140 + i * 135} y={1450} s={0.9 * pop(t, 6.8 + i * 0.07)} r={(i - 3) * 3} />)}
			{t > 7.3 && Array.from({length: 40}).map((_, i) => { const k = lin(t, [7.3, 8.1], [0, 1]); return <rect key={i} x={rnd(i) * 1080} y={-50 + k * (500 + rnd(i + 1) * 900)} width={18} height={10} fill={['#fff', '#d6312c', '#ffd23f'][i % 3]} transform={`rotate(${f * 8 + i * 30} ${rnd(i) * 1080} 300)`} />; })}
			{T(t, 7.3, 'GRANDE PROMOTION', 92)}
		</>)}
	</Plan>
);

export const Y03: React.FC = () => (
	<Plan debut={8.1} fin={11.0} cam={(t) => ({z: lin(t, [8.1, 11.0], [1.5, 1.2], ease), y: -60})}>
		{(t, f) => (<>
			<rect x={-800} y={-800} width={2680} height={3600} fill="#cfe2f5" />
			<Bouteille x={380} y={1380} s={2.4} r={-6} />
			{Array.from({length: 6}).map((_, i) => {
				const k = lin(t, [9.7 + i * 0.12, 10.4 + i * 0.12], [0, 1], sortie);
				return <Jeton key={i} x={380 + k * (380 + (i % 3) * 60)} y={1180 - Math.sin(k * Math.PI) * 300 - k * 100 + Math.floor(i / 3) * 90} s={1} />;
			})}
			<rect x={700} y={1000} width={300} height={360} rx={16} fill="#fff" stroke={INK} strokeWidth={7} />
			<text x={850} y={1060} textAnchor="middle" fontFamily={FONT} fontSize={40} fill={BLEU}>MES POINTS</text>
			{T(t, 9.7, 'DES POINTS À COLLECTER', 86)}
		</>)}
	</Plan>
);

export const Y04: React.FC = () => (
	<Plan debut={11.0} fin={16.1} cam={(t) => ({z: lin(t, [11.0, 16.1], [1.25, 1.1], ease), x: lin(t, [11.0, 13.2, 14.1, 15.3, 16.1], [0, 260, 0, -260, -100], ease), y: -60})}>
		{(t, f) => (<>
			<rect x={-800} y={-800} width={2680} height={3600} fill="#fbf3dc" />
			<rect x={-200} y={600} width={1480} height={900} rx={30} fill="#fff" stroke={INK} strokeWidth={8} />
			<text x={540} y={700} textAnchor="middle" fontFamily={FONT} fontSize={52} fill={BLEU}>CATALOGUE DES CADEAUX</text>
			<g transform={`translate(280 1080) scale(${pop(t, 13.2)})`}><Cadeau x={0} y={0} s={1.4} type="tshirt" /></g>
			<g transform={`translate(540 1080) scale(${pop(t, 14.1)})`}><Cadeau x={0} y={0} s={1.3} type="lunettes" /></g>
			<g transform={`translate(800 1080) scale(${pop(t, 15.3)})`}><Cadeau x={0} y={0} s={1.2} type="blouson" /></g>
			{T(t, 12.0, 'DES CADEAUX', 120)}
		</>)}
	</Plan>
);

export const Y05: React.FC = () => (
	<Plan debut={16.1} fin={19.1} cam={(t) => ({z: lin(t, [16.1, 19.1], [1.1, 1.7], ease), x: lin(t, [16.1, 19.1], [0, -160], ease), y: lin(t, [16.1, 19.1], [-150, -170], ease)})}>
		{(t, f) => (<>
			<Salon f={f} ecran="eteint" />
			<g transform="translate(700 1150)"><rect x={-250} y={-150} width={500} height={280} rx={12} fill={BLEU} /><text x={0} y={-20} textAnchor="middle" fontFamily={FONT} fontSize={54} fill="#fff">PUBLICITÉ</text><text x={0} y={50} textAnchor="middle" fontFamily={FONT} fontSize={40} fill="#ffd23f">PEPSI</text></g>
			<Canape x={440} y={1640} s={1} />
			{T(t, 18.3, 'UNE BLAGUE…', 120)}
		</>)}
	</Plan>
);

export const Y06: React.FC = () => (
	<Plan debut={19.1} fin={22.7} cam={(t) => ({z: lin(t, [19.1, 22.7], [1.05, 1.25], ease), y: lin(t, [19.1, 22.7], [0, -180], ease)})} secousse={(t) => (t > 21.4 && t < 22.0 ? 12 : 0)}>
		{(t, f) => {
			const yj = lin(t, [20.4, 21.9], [500, 1300], Easing.out(Easing.quad));
			return (<>
				<Ciel id="y6" />
				<Soleil x={860} y={320} f={f} />
				<rect x={-800} y={1300} width={2680} height={1400} fill="#9a9a96" stroke={INK} strokeWidth={6} />
				<Lycee x={540} y={1300} s={0.95} />
				{[0, 1, 2, 3].map((i) => <Humain key={i} x={120 + i * 270} y={1640} s={0.8} f={f} {...[JOHN, CADRE2, ADO, JOHN][i]} humeur={t > 21.0 ? 'choc' : 'content'} ph={i} />)}
				{t > 20.0 && <Jet x={lin(t, [20.0, 20.4], [1500, 560], sortie)} y={yj - 200} s={0.75} f={f} feu={t > 20.4 && t < 22.0 ? 1 : 0} />}
				{t > 20.9 && T(t, 20.9, 'EN AVION DE CHASSE', 92)}
			</>);
		}}
	</Plan>
);

export const Y07: React.FC = () => (
	<Plan debut={22.7} fin={25.2} cam={(t) => ({z: lin(t, [22.7, 25.2], [1.0, 1.2], ease), y: -60})}>
		{(t, f) => (<>
			<rect x={-800} y={-800} width={2680} height={3600} fill={BLEU} />
			<Jet x={540} y={1250} s={0.95} f={f} />
			<g transform={`translate(540 760) scale(${pop(t, 23.8)}) rotate(-4)`}>
				<rect x={-430} y={-130} width={860} height={260} rx={30} fill="#ffd23f" stroke={INK} strokeWidth={10} />
				<text x={0} y={-35} textAnchor="middle" fontFamily={FONT} fontSize={60} fill={INK}>PRIX</text>
				<text x={0} y={80} textAnchor="middle" fontFamily={FONT} fontSize={100} fill="#c0392b">7 000 000 POINTS</text>
			</g>
		</>)}
	</Plan>
);

export const Y08: React.FC = () => (
	<Plan debut={25.2} fin={28.8} cam={(t) => ({z: lin(t, [25.2, 28.8], [1.15, 1.35], ease), y: -150})}>
		{(t, f) => (<>
			<Salon f={f} ecran="eteint" />
			<g transform="translate(700 1150)"><rect x={-250} y={-150} width={500} height={280} rx={12} fill={BLEU} /><g transform="translate(0 0) scale(0.35)"><Jet x={0} y={0} f={f} /></g></g>
			<Canape x={440} y={1640} s={1} />
			<Humain x={360} y={1560} s={1.0} f={f} {...JOHN} humeur={t > 27.8 ? 'perplexe' : 'content'} regard={1} />
			{T(t, 26.8, 'JOHN LEONARD, 21 ANS', 92, '#fff')}
		</>)}
	</Plan>
);

export const Y09: React.FC = () => (
	<Plan debut={28.8} fin={30.9} cam={(t) => ({z: lin(t, [28.8, 30.9], [1.3, 1.6], ease), y: -200})}>
		{(t, f) => (<>
			<rect x={-800} y={-800} width={2680} height={3600} fill="#f1dcc0" />
			<rect x={-800} y={1500} width={2680} height={1200} fill="#b5835a" stroke={INK} strokeWidth={6} />
			<Humain x={420} y={1600} s={1.15} f={f} {...JOHN} humeur="perplexe" pose="ecrit" regard={1} />
			<g transform="translate(640 1260) rotate(-8)">
				<rect x={-130} y={-170} width={260} height={340} rx={10} fill="#fff" stroke={INK} strokeWidth={8} />
				<text x={0} y={-110} textAnchor="middle" fontFamily={FONT} fontSize={40} fill={BLEU}>RÈGLEMENT</text>
				{Array.from({length: 7}).map((_, i) => <rect key={i} x={-100} y={-70 + i * 30} width={i % 3 === 2 ? 120 : 200} height={10} rx={5} fill="#c9c9c9" />)}
			</g>
			{T(t, 30.2, 'IL LIT LE RÈGLEMENT', 96)}
		</>)}
	</Plan>
);

export const Y10: React.FC = () => (
	<Plan debut={30.9} fin={37.2} cam={(t) => ({z: lin(t, [30.9, 33.1, 37.2], [1.0, 1.35, 1.45], ease), y: lin(t, [30.9, 33.1], [0, -120], ease)})}>
		{(t, f) => {
			const k = lin(t, [33.1, 36.3], [0, 1]);
			return (<>
				<rect x={-800} y={-800} width={2680} height={3600} fill="#e8dcc4" />
				<rect x={140} y={420} width={800} height={1100} rx={14} fill="#fff" stroke={INK} strokeWidth={10} />
				<text x={540} y={520} textAnchor="middle" fontFamily={FONT} fontSize={60} fill={BLEU}>RÈGLEMENT</text>
				{Array.from({length: 14}).map((_, i) => <rect key={i} x={200} y={590 + i * 60} width={i % 4 === 3 ? 400 : 680} height={14} rx={7} fill="#cfcfcf" />)}
				<rect x={190} y={1005} width={700 * k} height={70} fill="#fff27a" opacity={0.85} />
				<text x={210} y={1055} fontFamily={FONT} fontSize={40} fill={INK} opacity={lin(t, [32.2, 32.5], [0, 1])}>Points manquants : 0,10 $ le point</text>
				<g transform={`translate(${220 + 680 * k} 1080) rotate(-30)`}><rect x={-20} y={-120} width={40} height={130} rx={8} fill="#e0c020" stroke={INK} strokeWidth={6} /></g>
				{T(t, 35.6, '10 CENTIMES LE POINT', 96)}
			</>);
		}}
	</Plan>
);

export const Y11: React.FC = () => (
	<Plan debut={37.2} fin={41.6} cam={(t) => ({z: lin(t, [37.2, 41.6], [1.2, 1.4], ease), y: -60})}>
		{(t, f) => {
			const ecran = t < 38.8 ? '0' : t < 40.2 ? '7 000 000 x 0,10' : '700 000 $';
			return (<>
				<rect x={-800} y={-800} width={2680} height={3600} fill="#f1dcc0" />
				<Calculatrice x={540} y={1150} s={1.3} ecran={ecran} />
				<circle cx={lin(t, [37.4, 40.2], [420, 680])} cy={1300 + Math.abs(Math.sin(f * 0.6)) * 60} r={40} fill="#f5c9a0" stroke={INK} strokeWidth={6} />
				{T(t, 40.4, '700 000 $', 160, '#7be07b')}
			</>);
		}}
	</Plan>
);

export const Y12: React.FC = () => (
	<Plan debut={41.6} fin={44.8} cam={(t) => ({z: lin(t, [41.6, 44.8], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Ciel id="y12" />
			<Nuage x={200} y={400} /><Nuage x={800} y={600} s={0.8} />
			<Jet x={540} y={1150} s={1.0} f={f} />
			<g transform={`translate(540 1600) scale(${pop(t, 43.6)})`}>
				<rect x={-430} y={-110} width={860} height={220} rx={30} fill="#fff" stroke={INK} strokeWidth={10} />
				<text x={0} y={-20} textAnchor="middle" fontFamily={FONT} fontSize={50} fill={INK}>VRAIE VALEUR</text>
				<text x={0} y={75} textAnchor="middle" fontFamily={FONT} fontSize={90} fill="#c0392b">+ DE 30 MILLIONS $</text>
			</g>
		</>)}
	</Plan>
);

export const Y13: React.FC = () => (
	<Plan debut={44.8} fin={47.8} cam={(t) => ({z: lin(t, [44.8, 47.8], [1.3, 1.15], ease), y: -230})}>
		{(t, f) => (<>
			<rect x={-800} y={-800} width={2680} height={3600} fill="#d9e4f2" />
			<rect x={-800} y={1450} width={2680} height={1200} fill="#5a6478" stroke={INK} strokeWidth={6} />
			<Humain x={270} y={1580} s={1.05} f={f} {...JOHN} humeur="content" pose="main" />
			{[0, 1].map((i) => <Humain key={i} x={640 + i * 230} y={1580} s={1.05} f={f} {...(i ? CADRE2 : CADRE)} humeur="content" pose="main" flip ph={i} />)}
			{t > 46.6 && Array.from({length: 6}).map((_, i) => (
				<g key={i} transform={`translate(${400 + (i % 3) * 90} ${1560 - Math.floor(i / 3) * 70}) scale(${pop(t, 46.6 + i * 0.08)})`}>
					<path d="M -45 0 Q -55 -70 -15 -80 L 15 -80 Q 55 -70 45 0 Z" fill="#c9a46a" stroke={INK} strokeWidth={5} />
					<text x={0} y={-22} textAnchor="middle" fontFamily={FONT} fontSize={34} fill="#2f7a3a">$</text>
				</g>
			))}
			{T(t, 45.6, 'DES INVESTISSEURS', 100)}
		</>)}
	</Plan>
);

export const Y14: React.FC = () => (
	<Plan debut={47.8} fin={51.8} cam={(t) => ({z: lin(t, [47.8, 50.1, 51.8], [1.15, 1.2, 1.4], ease), x: lin(t, [47.8, 50.1], [80, -80], ease), y: -60})}>
		{(t, f) => {
			const k = lin(t, [48.0, 49.5], [0, 1], ease);
			return (<>
				<Ciel id="y14" />
				<rect x={-800} y={1450} width={2680} height={1200} fill="#9a9a96" stroke={INK} strokeWidth={6} />
				<g transform="translate(860 1450)">
					<rect x={-200} y={-900} width={400} height={900} fill="#9fc2e0" stroke={INK} strokeWidth={8} />
					{Array.from({length: 12}).map((_, i) => <rect key={i} x={-160 + (i % 3) * 110} y={-850 + Math.floor(i / 3) * 200} width={80} height={130} fill="#d9eaf7" stroke={INK} strokeWidth={4} />)}
					<rect x={-180} y={-990} width={360} height={90} rx={12} fill={BLEU} stroke={INK} strokeWidth={8} />
					<text x={0} y={-928} textAnchor="middle" fontFamily={FONT} fontSize={56} fill="#fff">PEPSI</text>
				</g>
				<Enveloppe x={120 + k * 600} y={1100 - Math.sin(k * Math.PI) * 300} s={1.1 - k * 0.5} r={k * 20} />
				{t > 49.0 && [0, 1, 2].map((i) => <Jeton key={i} x={200 + i * 80} y={1600} s={0.9 * pop(t, 49.0 + i * 0.1)} />)}
				{t > 50.1 && <g transform={`translate(380 800) scale(${pop(t, 50.1) * 0.8}) rotate(-5)`}><Billet x={0} y={0} texte="700 000 $" /></g>}
				{T(t, 48.5, '15 VRAIS POINTS + UN CHÈQUE', 66, '#fff', 250)}
			</>);
		}}
	</Plan>
);

export const Y15: React.FC = () => (
	<Plan debut={51.8} fin={55.8} cam={(t) => ({z: lin(t, [51.8, 52.8, 55.8], [1.15, 1.45, 1.3], ease), y: -200})}>
		{(t, f) => (<>
			<Bureau />
			{[0, 1, 2].map((i) => <Humain key={i} x={250 + i * 290} y={1600} s={1.05} f={f} {...(i === 1 ? CADRE2 : CADRE)} humeur={t > 52.8 ? (t > 54.7 ? 'content' : 'choc') : 'pouffe'} ph={i} />)}
			{t > 52.0 && <g transform="translate(540 1200) scale(0.4) rotate(-4)"><Billet x={0} y={0} texte="700 000 $" /></g>}
			{T(t, 52.8, 'PLUS PERSONNE NE RIT', 88, '#fff')}
			{T(t, 54.7, "« C'ÉTAIT UNE BLAGUE »", 92, '#FFD23F', 560)}
		</>)}
	</Plan>
);

export const Y16: React.FC = () => (
	<Plan debut={55.8} fin={58.9} cam={(t) => ({z: lin(t, [55.8, 58.9], [1.1, 1.3], ease), y: -200})}>
		{(t, f) => (<>
			<Tribunal />
			<Humain x={200} y={1620} s={1.0} f={f} {...JOHN} humeur="fache" pose="crie" />
			<Humain x={880} y={1620} s={1.0} f={f} {...CADRE} humeur="neutre" flip />
			{t > 57.9 && (
				<g transform={`translate(540 860) scale(${pop(t, 57.9) * 0.8})`}>
					<rect x={-180} y={-180} width={360} height={360} rx={30} fill="#fff" stroke={INK} strokeWidth={10} />
					<rect x={-180} y={-180} width={360} height={100} rx={30} fill="#c0392b" stroke={INK} strokeWidth={10} />
					<text x={0} y={80} textAnchor="middle" fontFamily={FONT} fontSize={110} fill={INK}>3 ANS</text>
				</g>
			)}
			{T(t, 56.2, 'AU TRIBUNAL', 120, '#FFD23F', 250)}
		</>)}
	</Plan>
);

export const Y17: React.FC = () => (
	<Plan debut={58.9} fin={64.5} cam={(t) => ({z: lin(t, [58.9, 59.7, 64.5], [1.3, 1.5, 1.25], ease), y: lin(t, [58.9, 64.5], [80, 140], ease)})} secousse={(t) => (t > 59.6 && t < 59.9 ? 20 : 0)}>
		{(t, f) => {
			const coup = t > 59.45 && t < 59.75;
			return (<>
				<Tribunal />
				<Humain x={540} y={980} s={0.95} f={f} {...JUGE} humeur={t > 61 ? 'perplexe' : 'neutre'} pose="debout" />
				<rect x={240} y={980} width={600} height={420} fill="#6b4226" stroke={INK} strokeWidth={8} />
				<rect x={220} y={950} width={640} height={50} fill="#5a3820" stroke={INK} strokeWidth={8} />
				<Marteau x={700} y={coup ? 930 : 860} r={coup ? 0 : -35} s={0.9} />
				<Ecran><Bulle x={540} y={290} w={820} h={290} k={pop(t, 61.0)} queue={[60, 200]}>
					<text x={0} y={-30} textAnchor="middle" fontFamily={FONT} fontSize={52} fill={INK}>UN AVION DE CHASSE</text>
					<text x={0} y={40} textAnchor="middle" fontFamily={FONT} fontSize={52} fill={INK}>AVEC DU SODA ?</text>
					<text x={0} y={105} textAnchor="middle" fontFamily={FONT} fontSize={52} fill="#c0392b">PERSONNE N'Y CROIT.</text>
				</Bulle></Ecran>
				{t < 61.0 && T(t, 59.7, 'PEPSI GAGNE', 130, '#FFD23F', 1150)}
			</>);
		}}
	</Plan>
);

export const Y18: React.FC = () => (
	<Plan debut={64.5} fin={66.8} cam={(t) => ({z: lin(t, [64.5, 66.8], [1.2, 1.4], ease), y: -230})}>
		{(t, f) => (<>
			<Ciel id="y18" haut="#8aa0b8" bas="#dfe6ee" />
			<rect x={-800} y={1300} width={2680} height={1400} fill="#9a9a96" stroke={INK} strokeWidth={6} />
			<g opacity={0.6}><g transform="translate(700 1420) scale(0.6)"><path d="M -340 -40 Q -340 -80 -280 -80 L 220 -80 Q 330 -70 400 -20 Q 330 30 220 30 L -280 30 Q -340 30 -340 -10 Z" fill="none" stroke="#fff" strokeWidth={10} strokeDasharray="30 20" /></g></g>
			<Humain x={330} y={1560} s={1.15} f={f} {...JOHN} humeur="triste" />
			{T(t, 64.8, "PAS D'AVION", 140, '#fff')}
		</>)}
	</Plan>
);

export const Y19: React.FC = () => (
	<Plan debut={66.8} fin={75.3} cam={(t) => ({z: lin(t, [66.8, 70.4, 72.5], [1.1, 1.25, 1.5], ease), y: lin(t, [66.8, 72.5], [-150, -100], ease)})}>
		{(t, f) => (<>
			<Salon f={f} ecran="eteint" />
			<g transform="translate(700 1150)">
				<rect x={-250} y={-150} width={500} height={280} rx={12} fill={BLEU} />
				<g transform="translate(0 -30) scale(0.3)"><Jet x={0} y={0} f={f} /></g>
				{t > 69.2 && <text x={0} y={100} textAnchor="middle" fontFamily={FONT} fontSize={34} fill="#ffd23f">{t > 70.4 ? '700 000 000 POINTS' : '7 000 000 POINTS'}</text>}
			</g>
			<Canape x={440} y={1640} s={1} />
			<Humain x={360} y={1560} s={1.0} f={f} {...JOHN} humeur={t > 70.4 ? 'choc' : 'perplexe'} regard={1} />
			{t < 73.0 && T(t, 70.4, '700 000 000 POINTS', 80, '#FFD23F')}
			{T(t, 73.0, 'FIN', 170)}
		</>)}
	</Plan>
);

export const PLANS5: [number, number, React.FC][] = [
	[0, 5.7, Y01], [5.7, 8.1, Y02], [8.1, 11.0, Y03], [11.0, 16.1, Y04], [16.1, 19.1, Y05], [19.1, 22.7, Y06], [22.7, 25.2, Y07],
	[25.2, 28.8, Y08], [28.8, 30.9, Y09], [30.9, 37.2, Y10], [37.2, 41.6, Y11], [41.6, 44.8, Y12], [44.8, 47.8, Y13], [47.8, 51.8, Y14],
	[51.8, 55.8, Y15], [55.8, 58.9, Y16], [58.9, 64.5, Y17], [64.5, 66.8, Y18], [66.8, 75.3, Y19],
];
