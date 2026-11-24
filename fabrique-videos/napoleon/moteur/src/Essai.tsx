import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Humain, Lapin, Cage, PiqueNique, Caleche, Arbre, Carotte} from './dessins';
const NAPO = {couleur: '#2d4a8a', chapeau: 'bicorne' as const, jambesC: '#f1ede2', meche: true, medailles: 1};
export const Essai: React.FC = () => (
	<AbsoluteFill style={{background: '#cfe8b0'}}>
		<svg viewBox="0 0 1920 1080" width={1920} height={1080}>
			<rect y={700} width={1920} height={380} fill="#7db24a" />
			<Arbre x={1800} y={720} f={0} />
			<Humain x={180} y={720} s={1.1} f={0} {...NAPO} humeur="content" pose="salut" />
			<Humain x={420} y={720} s={1.1} f={0} couleur="#2d4a8a" chapeau="plume" jambesC="#f1ede2" medailles={3} moustache humeur="neutre" />
			<Humain x={650} y={720} s={1.1} f={0} couleur="#2f5d3a" chapeau="plume" jambesC="#f1ede2" medailles={2} humeur="content" />
			<Humain x={870} y={720} s={1.1} f={0} couleur="#7a2a20" chapeau="haut" jambesC="#3a3a3a" humeur="choc" pose="vise" />
			<PiqueNique x={1250} y={720} s={0.8} />
			<Cage x={1600} y={720} s={0.9} ouvert={0.7} />
			{[0, 1, 2, 3, 4].map((i) => <Lapin key={i} x={150 + i * 200} y={1020} s={1.2} f={i * 7} c={i} ph={i} saute={i === 2} debout={i === 4} coeur={i === 3} />)}
			<Caleche x={1400} y={1040} s={0.75} f={0} />
			<Carotte x={1800} y={900} s={1} r={30} />
		</svg>
	</AbsoluteFill>
);
