import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran, Exterieur} from './scene';
import {INK, FONT, rnd, lin, pop, sortie, Ciel, Nuage, Soleil, Humain, Titre, Bulle, Magasin, Ampoule, Burger, Part, Balance} from './dessins';

const ease = Easing.inOut(Easing.cubic);
const T = (t: number, a: number, texte: string, taille = 120, c = '#FFD23F', y = 400) => <Ecran><Titre x={540} y={y} texte={texte} taille={taille} k={pop(t, a)} c={c} /></Ecran>;
const PATRON = {couleur: '#6b3a22', chapeau: 'aucun' as const, cheveux: '#8f8f8f', jambesC: '#2c2f36', cravate: '#e07a1e'};
const CHEF = {couleur: '#f4f4f4', chapeau: 'toque' as const, jambesC: '#2c2f36'};
const CLIENTS = [
	{couleur: '#2f6fb0', chapeau: 'aucun' as const, cheveux: '#3b2a1e', jambesC: '#2f3e5a'},
	{couleur: '#c0573a', chapeau: 'aucun' as const, cheveux: '#a0522d', jambesC: '#2f3e5a'},
	{couleur: '#3c8a4a', chapeau: 'aucun' as const, cheveux: '#c9a060', jambesC: '#2f3e5a'},
	{couleur: '#7a3fa0', chapeau: 'aucun' as const, cheveux: '#2b1a10', jambesC: '#2f3e5a'},
	{couleur: '#e0b21a', chapeau: 'aucun' as const, cheveux: '#6a4426', jambesC: '#2f3e5a'},
];
const AW = '#e07a1e', MC = '#c0392b';
const Fond: React.FC<{c?: string}> = ({c = '#fbe7c6'}) => (<><rect x={-1500} y={-1500} width={4080} height={5000} fill={c} />{Array.from({length: 16}).map((_, i) => <path key={i} d="M 540 960 L 515 -800 L 565 -800 Z" fill="#fff" opacity={0.25} transform={`rotate(${i * 22.5} 540 960)`} />)}</>);
const Rue: React.FC<{id: string; f: number}> = ({id, f}) => (<><Ciel id={id} /><Soleil x={880} y={300} f={f} /><Nuage x={220} y={330} /><rect x={-800} y={1330} width={2680} height={1400} fill="#b8b2a6" stroke={INK} strokeWidth={6} /></>);
const Table: React.FC = () => (<><rect x={-800} y={-800} width={2680} height={3600} fill="#e9dcc4" /><rect x={-800} y={1500} width={2680} height={1200} fill="#9a7a58" stroke={INK} strokeWidth={6} /><ellipse cx={540} cy={1500} rx={520} ry={90} fill="#8a5a35" stroke={INK} strokeWidth={8} /></>);

export const B01: React.FC = () => (
	<Plan debut={0} fin={6.9} sansEntree cam={(t) => ({z: lin(t, [0, 6.9], [1.0, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond />
			<g transform={`translate(300 ${1150 - Math.sin(f * 0.1) * 10}) scale(${pop(t, 1.9)})`}><Burger x={0} y={0} s={1.2} viande={1.8} /></g>
			<g transform={`translate(800 ${1170 - Math.sin(f * 0.1 + 1) * 10}) scale(${pop(t, 5.6)})`}><Burger x={0} y={0} s={0.9} viande={1} /></g>
			{t > 3.6 && <text x={300} y={1340} textAnchor="middle" fontFamily={FONT} fontSize={60} fill={AW} stroke={INK} strokeWidth={10} paintOrder="stroke">PLUS GROS</text>}
			{t > 4.1 && <text x={300} y={1420} textAnchor="middle" fontFamily={FONT} fontSize={60} fill="#2f7a3a" stroke={INK} strokeWidth={10} paintOrder="stroke">MOINS CHER</text>}
			{t > 5.1 && <text x={300} y={1500} textAnchor="middle" fontFamily={FONT} fontSize={60} fill="#fff" stroke={INK} strokeWidth={10} paintOrder="stroke">MEILLEUR</text>}
			{t > 5.8 && <text x={800} y={1340} textAnchor="middle" fontFamily={FONT} fontSize={56} fill={MC} stroke={INK} strokeWidth={10} paintOrder="stroke">McDONALD'S</text>}
			{T(t, 0.7, 'ANNÉES 80', 150)}
		</>)}
	</Plan>
);

export const B02: React.FC = () => (
	<Plan debut={6.9} fin={10.3} cam={(t) => ({z: lin(t, [6.9, 10.3], [1.2, 1.35], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#dfe6ee" />
			<g transform={`translate(540 ${lin(t, [7.3, 7.9], [1100, 1500], Easing.in(Easing.quad))}) rotate(${lin(t, [7.3, 7.9], [0, 40])})`}><Burger x={0} y={0} s={1.2} viande={1.8} /></g>
			{t > 8.4 && ['1/3', '1/4', '+', '÷', '=', '?', '3 < 4'].map((m, i) => (
				<text key={i} x={540 + Math.cos(i * 0.9) * lin(t, [8.4, 9.6], [0, 360])} y={900 + Math.sin(i * 0.9) * lin(t, [8.4, 9.6], [0, 360])} textAnchor="middle" fontFamily={FONT} fontSize={90} fill="#2f5fa8" stroke={INK} strokeWidth={10} paintOrder="stroke" opacity={pop(t, 8.4 + i * 0.05)}>{m}</text>
			))}
			{T(t, 7.5, 'ÉCHEC', 170, '#ff4b2b')}
			{T(t, 9.4, 'À CAUSE DES MATHS', 92, '#fff', 560)}
		</>)}
	</Plan>
);

export const B03: React.FC = () => (
	<Plan debut={10.3} fin={12.9} cam={(t) => ({z: lin(t, [10.3, 12.9], [1.15, 1.0], ease), y: -280})}>
		{(t, f) => (<><Rue id="b3" f={f} /><Magasin x={540} y={1330} s={1.15} nom="A&W" couleur={AW} /></>)}
	</Plan>
);

export const B04: React.FC = () => (
	<Plan debut={12.9} fin={18.6} cam={(t) => ({z: lin(t, [12.9, 15.5, 18.6], [1.15, 1.15, 1.4], ease), y: lin(t, [12.9, 15.5, 18.6], [-330, -330, -100], ease)})}>
		{(t, f) => (<>
			<Rue id="b4" f={f} />
			<Magasin x={540} y={1330} s={1.15} nom="McDONALD'S" couleur={MC} />
			{t > 15.5 && <g transform={`translate(540 ${1320}) scale(${pop(t, 15.5)})`}><Burger x={0} y={0} s={1.1} viande={1} /></g>}
			{t > 17.1 && <g transform={`translate(540 1080) scale(${pop(t, 17.1)}) rotate(-5)`}><rect x={-230} y={-80} width={460} height={160} rx={24} fill="#fff" stroke={INK} strokeWidth={8} /><text x={0} y={30} textAnchor="middle" fontFamily={FONT} fontSize={90} fill={MC}>1/4 LIVRE</text></g>}
			{T(t, 14.9, 'QUARTER POUNDER', 100)}
		</>)}
	</Plan>
);

export const B05: React.FC = () => (
	<Plan debut={18.6} fin={23.2} cam={(t) => ({z: lin(t, [18.6, 23.2], [1.2, 1.35], ease), y: -200})}>
		{(t, f) => (<>
			<Fond />
			<Humain x={320} y={1600} s={1.3} f={f} {...CHEF} pose="main" humeur="content" />
			<g transform={`translate(700 ${1250}) scale(${pop(t, 21.4)})`}><Burger x={0} y={0} s={1.1} viande={1.8} /></g>
			{t > 22.2 && <g transform={`translate(700 900) scale(${pop(t, 22.2)}) rotate(5)`}><rect x={-230} y={-80} width={460} height={160} rx={24} fill="#fff" stroke={INK} strokeWidth={8} /><text x={0} y={30} textAnchor="middle" fontFamily={FONT} fontSize={90} fill={AW}>1/3 LIVRE</text></g>}
			{T(t, 20.5, 'LA RIPOSTE', 130)}
		</>)}
	</Plan>
);

export const B06: React.FC = () => (
	<Plan debut={23.2} fin={25.1} cam={(t) => ({z: lin(t, [23.2, 25.1], [1.05, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#e6f2dc" />
			<Balance x={540} y={1550} s={1.15} penche={lin(t, [23.3, 23.9], [0, -1], Easing.out(Easing.back(2)))}
				gauche={<rect x={-110} y={-80} width={220} height={80} rx={30} fill="#6b3a22" stroke={INK} strokeWidth={6} />}
				droite={<rect x={-90} y={-50} width={180} height={50} rx={24} fill="#6b3a22" stroke={INK} strokeWidth={6} />} />
			<text x={200} y={1650} textAnchor="middle" fontFamily={FONT} fontSize={70} fill={AW} stroke={INK} strokeWidth={10} paintOrder="stroke">1/3</text>
			<text x={880} y={1650} textAnchor="middle" fontFamily={FONT} fontSize={70} fill={MC} stroke={INK} strokeWidth={10} paintOrder="stroke">1/4</text>
			{T(t, 23.5, 'PLUS DE VIANDE', 110)}
			{T(t, 24.2, 'MÊME PRIX', 110, '#7be07b', 560)}
		</>)}
	</Plan>
);

export const B07: React.FC = () => (
	<Plan debut={25.1} fin={28.7} cam={(t) => ({z: lin(t, [25.1, 28.7], [1.25, 1.1], ease), y: -230})}>
		{(t, f) => (<>
			<Table />
			{CLIENTS.slice(0, 3).map((c, i) => <Humain key={i} x={250 + i * 290} y={1480} s={1.05} f={f} {...c} pose={t > 26.7 ? 'salut' : 'debout'} humeur={t > 26.7 ? 'content' : 'neutre'} ph={i} />)}
			{[0, 1, 2].map((i) => <g key={i} transform={`translate(${250 + i * 290} 1460)`}><Burger x={0} y={0} s={0.45} viande={1.6} /></g>)}
			{t > 27.4 && <g transform={`translate(540 840) scale(${pop(t, 27.4)}) rotate(-4)`}><rect x={-200} y={-140} width={400} height={280} rx={14} fill="#fbf3dc" stroke={INK} strokeWidth={8} /><path d="M -80 0 L -20 60 L 100 -70" stroke="#3c8a4a" strokeWidth={26} fill="none" strokeLinecap="round" /></g>}
			{T(t, 25.4, 'TEST DE GOÛT', 120)}
			{T(t, 28.4, "C'EST GAGNÉ", 120, '#7be07b', 560)}
		</>)}
	</Plan>
);

export const B08: React.FC = () => (
	<Plan debut={28.7} fin={32.3} cam={(t) => ({z: lin(t, [28.7, 32.3], [1.4, 1.1], ease), y: -200})}>
		{(t, f) => (<>
			<Rue id="b8" f={f} />
			<rect x={520} y={1100} width={40} height={240} fill="#7a7a76" stroke={INK} strokeWidth={6} />
			<g transform={`translate(540 900) scale(${pop(t, 29.9) * 0.9})`}>
				<rect x={-460} y={-260} width={920} height={500} rx={16} fill={AW} stroke={INK} strokeWidth={10} />
				<g transform="translate(-200 120)"><Burger x={0} y={0} s={0.9} viande={1.8} /></g>
				<text x={200} y={-60} textAnchor="middle" fontFamily={FONT} fontSize={110} fill="#fff" stroke={INK} strokeWidth={14} paintOrder="stroke">1/3</text>
				<text x={200} y={60} textAnchor="middle" fontFamily={FONT} fontSize={70} fill="#fff" stroke={INK} strokeWidth={10} paintOrder="stroke">DE LIVRE !</text>
			</g>
			{T(t, 30.9, 'GRANDE CAMPAGNE DE PUB', 84)}
		</>)}
	</Plan>
);

export const B09: React.FC = () => (
	<Plan debut={32.3} fin={35.7} cam={(t) => ({z: lin(t, [32.3, 35.7], [1.15, 1.3], ease), y: -250})}>
		{(t, f) => (<>
			<Fond c="#f4e7c8" />
			<rect x={-800} y={1450} width={2680} height={1200} fill="#c9b48a" stroke={INK} strokeWidth={6} />
			<rect x={100} y={1150} width={880} height={60} fill="#7a5532" stroke={INK} strokeWidth={7} />
			{Array.from({length: 7}).map((_, i) => <g key={i} transform={`translate(${200 + (i % 4) * 220} ${1150 - Math.floor(i / 4) * 90}) scale(${pop(t, 32.5 + i * 0.1)})`}><Burger x={0} y={0} s={0.45} viande={1.6} /></g>)}
			<Humain x={540} y={1650} s={1.0} f={f} {...CHEF} humeur="triste" />
			{t > 34.2 && <g transform={`translate(${lin(t, [34.2, 35.7], [1300, -200])} 1620) rotate(${-t * 400})`}><circle r={70} fill="none" stroke="#a07a40" strokeWidth={8} /><path d="M -50 -20 Q 0 50 50 -20 M -40 30 Q 0 -40 40 30" stroke="#a07a40" strokeWidth={6} fill="none" /></g>}
			{T(t, 34.2, 'PERSONNE NE L\'ACHÈTE', 92, '#fff')}
		</>)}
	</Plan>
);

export const B10: React.FC = () => (
	<Plan debut={35.7} fin={40.9} cam={(t) => ({z: lin(t, [35.7, 37.4, 40.9], [1.5, 1.15, 1.2], ease), y: lin(t, [35.7, 37.4], [-120, -230], ease)})}>
		{(t, f) => (<>
			<Table />
			{t < 37.4 ? <Humain x={540} y={1480} s={1.3} f={f} {...PATRON} humeur="perplexe" /> : (<>
				<Humain x={180} y={1480} s={1.0} f={f} {...PATRON} pose="main" humeur="neutre" />
				{CLIENTS.slice(0, 4).map((c, i) => <Humain key={i} x={400 + i * 170} y={1480} s={0.85} f={f} {...c} humeur="neutre" ph={i} flip={i > 1} />)}
			</>)}
			{t > 38.8 && <Ampoule x={180} y={860} k={pop(t, 38.8)} f={f} />}
			{T(t, 36.1, 'IL NE COMPREND PAS', 100)}
			{T(t, 39.5, 'LE PROBLÈME…', 110, '#fff', 560)}
		</>)}
	</Plan>
);

export const B11: React.FC = () => (
	<Plan debut={40.9} fin={44.9} cam={(t) => ({z: lin(t, [40.9, 44.9], [1.05, 1.15], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#fbf3dc" />
			<g transform={`translate(300 1050) scale(${pop(t, 41.0)}) translate(-300 -1050)`}><Part x={300} y={1050} n={4} c={MC} /></g>
			<text x={300} y={1320} textAnchor="middle" fontFamily={FONT} fontSize={90} fill={MC} stroke={INK} strokeWidth={12} paintOrder="stroke" opacity={pop(t, 41.1)}>1/4</text>
			{t > 42.7 && <Part x={780} y={1050} n={3} c={AW} />}
			{t > 42.7 && <text x={780} y={1320} textAnchor="middle" fontFamily={FONT} fontSize={90} fill={AW} stroke={INK} strokeWidth={12} paintOrder="stroke">1/3</text>}
			{T(t, 41.1, 'UN SUR QUATRE', 100, MC)}
			{T(t, 42.9, 'UN SUR TROIS', 100, AW, 560)}
		</>)}
	</Plan>
);

export const B12: React.FC = () => (
	<Plan debut={44.9} fin={50.9} cam={(t) => ({z: lin(t, [44.9, 50.9], [1.1, 1.3], ease), y: -150})}>
		{(t, f) => (<>
			<Fond c="#dfe6ee" />
			{CLIENTS.slice(0, 3).map((c, i) => <Humain key={i} x={200 + i * 340} y={1650} s={1.0} f={f} {...c} humeur={t > 48.4 ? 'content' : 'perplexe'} ph={i} />)}
			<Bulle x={540} y={950} w={760} h={420} k={pop(t, 45.5)} queue={[-120, 320]} pensee>
				<text x={0} y={-30} textAnchor="middle" fontFamily={FONT} fontSize={150} fill={INK} opacity={t > 46.4 ? 1 : 0}>3 &lt; 4</text>
				{t > 48.4 && <text x={0} y={120} textAnchor="middle" fontFamily={FONT} fontSize={100} fill="#c0392b">1/3 &lt; 1/4 ?!</text>}
			</Bulle>
			{T(t, 48.4, 'DONC…', 120)}
		</>)}
	</Plan>
);

export const B13: React.FC = () => (
	<Plan debut={50.9} fin={55.7} cam={(t) => ({z: lin(t, [50.9, 55.7], [1.0, 1.15], ease), y: -100})}>
		{(t, f) => (<>
			<Table />
			{Array.from({length: 10}).map((_, i) => {
				const arnaque = i < 6 && t > 53.4;
				return <Humain key={i} x={110 + (i % 5) * 215} y={1260 + Math.floor(i / 5) * 300} s={0.62} f={f} {...CLIENTS[i % 5]} humeur={arnaque ? 'fache' : 'neutre'} ph={i} />;
			})}
			{t > 53.4 && Array.from({length: 6}).map((_, i) => <text key={i} x={110 + (i % 5) * 215} y={880 + Math.floor(i / 5) * 300} textAnchor="middle" fontFamily={FONT} fontSize={70} fill="#c0392b" stroke={INK} strokeWidth={8} paintOrder="stroke" opacity={pop(t, 53.4 + i * 0.08)}>!!</text>)}
			{T(t, 53.0, 'PLUS DE LA MOITIÉ', 110)}
			{T(t, 54.9, 'SE CROIENT ARNAQUÉS', 90, '#fff', 560)}
		</>)}
	</Plan>
);

export const B14: React.FC = () => (
	<Plan debut={55.7} fin={58.9} cam={(t) => ({z: lin(t, [55.7, 58.9], [1.3, 1.5], ease), y: -230})}>
		{(t, f) => (<>
			<Fond c="#f6dada" />
			<Humain x={380} y={1620} s={1.35} f={f * 1.4} {...CLIENTS[1]} pose="crie" humeur="crie" />
			<g transform="translate(760 1350)"><Burger x={0} y={0} s={0.8} viande={1.8} /></g>
			{T(t, 55.7, 'MÊME PRIX ?!', 120)}
			{T(t, 57.9, 'MOINS DE VIANDE ?!', 100, '#ff4b2b', 560)}
		</>)}
	</Plan>
);

export const B15: React.FC = () => (
	<Plan debut={58.9} fin={62.7} cam={(t) => ({z: lin(t, [58.9, 62.7], [1.05, 1.2], ease), y: -60})}>
		{(t, f) => (<>
			<Fond c="#e6f2dc" />
			<Balance x={540} y={1550} s={1.15} penche={-1}
				gauche={<rect x={-110} y={-80} width={220} height={80} rx={30} fill="#6b3a22" stroke={INK} strokeWidth={6} />}
				droite={<rect x={-90} y={-50} width={180} height={50} rx={24} fill="#6b3a22" stroke={INK} strokeWidth={6} />} />
			<text x={200} y={1650} textAnchor="middle" fontFamily={FONT} fontSize={70} fill={AW} stroke={INK} strokeWidth={10} paintOrder="stroke">1/3</text>
			<text x={880} y={1650} textAnchor="middle" fontFamily={FONT} fontSize={70} fill={MC} stroke={INK} strokeWidth={10} paintOrder="stroke">1/4</text>
			{t > 60.4 && <text x={540} y={1800} textAnchor="middle" fontFamily={FONT} fontSize={130} fill="#7be07b" stroke={INK} strokeWidth={16} paintOrder="stroke" opacity={pop(t, 60.4)}>1/3 &gt; 1/4</text>}
			{T(t, 59.5, "C'ÉTAIT L'INVERSE", 110)}
		</>)}
	</Plan>
);

export const B16: React.FC = () => (
	<Plan debut={62.7} fin={64.6} cam={(t) => ({z: lin(t, [62.7, 64.6], [1.2, 1.3], ease), y: -60})}>
		{(t, f) => {
			const k = lin(t, [63.0, 63.8], [0, 1]);
			return (<>
				<Fond c="#dfe6ee" />
				<g opacity={1 - k} transform={`translate(540 1150) scale(${1 - k * 0.4})`}><Burger x={0} y={0} s={1.3} viande={1.8} /></g>
				{k > 0 && Array.from({length: 9}).map((_, i) => <circle key={i} cx={540 + (rnd(i) - 0.5) * 700 * k} cy={1050 - rnd(i + 3) * 400 * k} r={50 + k * 70} fill="#ddd" stroke={INK} strokeWidth={4} opacity={1 - k * 0.8} />)}
				{T(t, 63.5, 'DISPARU', 150, '#ff4b2b')}
			</>);
		}}
	</Plan>
);

export const B17: React.FC = () => (
	<Plan debut={64.6} fin={70.1} cam={(t) => ({z: lin(t, [64.6, 67.6, 70.1], [1.2, 1.15, 1.35], ease), y: -200})}>
		{(t, f) => {
			const an = Math.round(lin(t, [64.6, 66.4], [1981, 2021]));
			return (<>
				{t < 66.6 ? (<>
					<rect x={-800} y={-800} width={2680} height={3600} fill="#2a3550" />
					<g transform="translate(540 1000)">
						<rect x={-280} y={-300} width={560} height={600} rx={30} fill="#fff" stroke={INK} strokeWidth={10} />
						<rect x={-280} y={-300} width={560} height={150} rx={30} fill={AW} stroke={INK} strokeWidth={10} />
						<text x={0} y={140} textAnchor="middle" fontFamily={FONT} fontSize={220} fill={INK}>{an}</text>
					</g>
					{T(t, 64.6, '40 ANS PLUS TARD', 110, '#fff')}
				</>) : (<>
					<Fond />
					<g transform={`translate(540 1250) scale(${pop(t, 66.6)})`}><Burger x={0} y={0} s={1.3} viande={1.8} /></g>
					{t > 68.5 && <g transform={`translate(540 860) scale(${pop(t, 68.5)}) rotate(-5)`}><rect x={-260} y={-80} width={520} height={160} rx={24} fill="#fff" stroke={INK} strokeWidth={8} /><text x={0} y={30} textAnchor="middle" fontFamily={FONT} fontSize={80} fill={AW}>NOUVEAU !</text></g>}
					{T(t, 67.1, 'LE RETOUR', 130)}
				</>)}
			</>);
		}}
	</Plan>
);

export const B18: React.FC = () => (
	<Plan debut={70.1} fin={77.2} cam={(t) => ({z: lin(t, [70.1, 74.0], [1.15, 1.4], ease), y: -120})}>
		{(t, f) => (<>
			<Fond />
			<g transform="translate(540 1350)"><Burger x={0} y={0} s={1.1} viande={1.8} /></g>
			<g transform="translate(540 860) rotate(-4)">
				<rect x={-330} y={-110} width={660} height={220} rx={28} fill="#fff" stroke={INK} strokeWidth={10} />
				<text x={0} y={40} textAnchor="middle" fontFamily={FONT} fontSize={110} fill={AW}>{t > 72.6 ? '3/9 LIVRE' : '1/3 LIVRE'}</text>
				{t > 71.0 && t < 72.6 && <path d="M -300 -80 L 300 80 M 300 -80 L -300 80" stroke="#c0392b" strokeWidth={22} strokeLinecap="round" opacity={pop(t, 71.0)} />}
			</g>
			{t > 72.8 && CLIENTS.slice(0, 3).map((c, i) => <Humain key={i} x={200 + i * 340} y={1760} s={0.7} f={f} {...c} humeur="content" pose="salut" ph={i} />)}
			{t < 75.2 && T(t, 72.6, 'TROIS NEUVIÈMES', 110)}
			{T(t, 75.2, 'FIN', 170)}
		</>)}
	</Plan>
);

export const PLANS7: [number, number, React.FC][] = [
	[0, 6.9, B01], [6.9, 10.3, B02], [10.3, 12.9, B03], [12.9, 18.6, B04], [18.6, 23.2, B05], [23.2, 25.1, B06], [25.1, 28.7, B07],
	[28.7, 32.3, B08], [32.3, 35.7, B09], [35.7, 40.9, B10], [40.9, 44.9, B11], [44.9, 50.9, B12], [50.9, 55.7, B13], [55.7, 58.9, B14],
	[58.9, 62.7, B15], [62.7, 64.6, B16], [64.6, 70.1, B17], [70.1, 77.2, B18],
];
