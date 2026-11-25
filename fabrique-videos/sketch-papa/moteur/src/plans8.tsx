import React from 'react';
import {Easing} from 'remotion';
import {Plan, Ecran} from './scene';
import {INK, lin, pop, Humain, Bulle, Canape} from './dessins';
import minutage from './minutage.json';
import bouche from './bouche.json';
import jeu from './jeu.json';

type Ligne = {qui: string; s: number; e: number};
const LIGNES = (minutage as unknown as {lignes: Ligne[]}).lignes;
export const FIN = (minutage as unknown as {duree: number}).duree + 0.6;
const ENV = bouche as number[];
const ease = Easing.inOut(Easing.cubic);
const FILS = {couleur: '#2f6fb0', chapeau: 'aucun' as const, cheveux: '#3b2a1e', jambesC: '#2f3e5a'};
const PERE = {couleur: '#8a6a4a', chapeau: 'aucun' as const, cheveux: '#cfcfcf', jambesC: '#2f3e5a', moustache: true, lunettes: true};
// visage du fils pendant chaque réplique (quand il écoute ou parle)
const HUMEUR = (jeu as {humeur: string[]}).humeur;
const ligneA = (t: number) => { let i = 0; for (let k = 0; k < LIGNES.length; k++) if (LIGNES[k].s - 0.05 <= t) i = k; return i; };
const COUPS = (jeu as {coups: number[]}).coups;
const SELFIE = (jeu as {selfie: number[]}).selfie;

const Salon: React.FC<{t: number; f: number}> = ({t, f}) => {
	const i = ligneA(t); const l = LIGNES[i];
	const parle = l.qui === 'F' && t >= l.s - 0.05 && t <= l.e + 0.1;
	const ouv = parle ? (ENV[Math.floor(t * 30)] || 0) : 0;
	const selfie = SELFIE.includes(i);
	const debutSelfie = SELFIE.includes(i - 1) ? LIGNES[SELFIE.filter((k) => k <= i).reduce((a, k) => (SELFIE.includes(k - 1) ? a : k), i)].s : l.s;
	return (
		<>
			<rect x={-800} y={-800} width={2680} height={3600} fill="#f1dcc0" />
			<rect x={-800} y={1500} width={2680} height={1200} fill="#b5835a" stroke={INK} strokeWidth={6} />
			<rect x={620} y={420} width={300} height={360} fill="#bfe3f2" stroke={INK} strokeWidth={10} />
			<line x1={770} y1={420} x2={770} y2={780} stroke={INK} strokeWidth={6} />
			<rect x={90} y={520} width={220} height={160} fill="#e8c07a" stroke={INK} strokeWidth={8} />
			<path d="M 120 650 L 170 590 L 210 630 L 250 570 L 290 650 Z" fill="#6f9e45" />
			<g transform="translate(980 1500)"><rect x={-50} y={-120} width={100} height={120} fill="#c0573a" stroke={INK} strokeWidth={6} /><circle cx={0} cy={-170} r={70} fill="#5e9c3f" stroke={INK} strokeWidth={6} /></g>
			<Canape x={540} y={1660} s={1.1} />
			<Humain x={460} y={1600} s={1.45} f={f} {...FILS} pose="tel" humeur={HUMEUR[i] as never} ouverture={ouv} regard={0} />
			{selfie && (
				<Ecran>
					<Bulle x={780} y={620} w={420} h={420} k={pop(t, debutSelfie + 0.2, 0.4)} queue={[-170, 260]}>
						<defs><clipPath id="selfie"><rect x={-190} y={-190} width={380} height={380} rx={40} /></clipPath></defs>
						<g clipPath="url(#selfie)"><rect x={-200} y={-200} width={400} height={400} fill="#d9e4f2" /><Humain x={0} y={330} s={1.1} f={f} {...PERE} humeur={HUMEUR[i] === 'perplexe' ? 'content' : 'perplexe'} /></g>
					</Bulle>
				</Ecran>
			)}
		</>
	);
};

const Unique: React.FC = () => (
	<Plan debut={0} fin={FIN} coupe cam={(t) => {
		const i = ligneA(t);
		const coup = COUPS.includes(i) && t - LIGNES[i].s < 1.2 ? 0.15 : 0;
		return {z: lin(t, [0, FIN], [1.35, 1.55], ease) + coup, x: 60, y: -130 + coup * 150};
	}}>
		{(t, f) => <Salon t={t} f={f} />}
	</Plan>
);
export const PLANS8: [number, number, React.FC][] = [[0, FIN, Unique]];
