import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, delayRender, continueRender, interpolate, Easing} from 'remotion';
import {PLANS4 as PLANS} from './plans4';
import minutage from './minutage.json';
import {versNouveau} from './temps';

const FPS = 30;
export const DUREE = Math.round(versNouveau(68.0) * FPS);
const fr = (s: number) => Math.round(s * FPS);

type Mot = {w: string; s: number; e: number; seg: number};
const MOTS = (minutage as {mots: Mot[]}).mots.map((m) => ({...m, w: m.w.replace(/[«»]/g, '')}));
// groupes de 1 à 3 mots, coupés à la ponctuation
const GROUPES: Mot[][] = [];
let g: Mot[] = [];
MOTS.forEach((m, i) => {
	g.push(m);
	const fin = /[.,!?…:]$/.test(m.w) || g.length >= 3 || (MOTS[i + 1] && MOTS[i + 1].seg !== m.seg) || (MOTS[i + 1] && MOTS[i + 1].s - m.e > 0.35);
	if (fin) { GROUPES.push(g); g = []; }
});
if (g.length) GROUPES.push(g);

const SousTitres: React.FC = () => {
	const t = useCurrentFrame() / FPS;
	const idx = GROUPES.findIndex((gr, i) => t >= gr[0].s - 0.05 && t < (GROUPES[i + 1] ? Math.min(GROUPES[i + 1][0].s - 0.05, gr[gr.length - 1].e + 0.6) : gr[gr.length - 1].e + 0.6));
	if (idx < 0) return null;
	const gr = GROUPES[idx];
	const k = interpolate(t, [gr[0].s - 0.05, gr[0].s + 0.12], [0.75, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2.5))});
	return (
		<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 1395}}>
			<div style={{transform: `scale(${k})`, textAlign: 'center', maxWidth: 980, lineHeight: 1.05}}>
				{gr.map((m, i) => {
					const actif = t >= m.s - 0.03;
					return (
						<span key={i} style={{fontFamily: 'Lilita', fontSize: 104, color: actif ? '#FFD23F' : '#ffffff', WebkitTextStroke: '20px #1a0f08', paintOrder: 'stroke fill', margin: '0 12px', display: 'inline-block', textShadow: '0 10px 0 rgba(0,0,0,0.35)'}}>
							{m.w.replace(/[.,:]$/, '')}
						</span>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};

const SONS: [number, string, number?][] = [
	[2.96, 'tampon'], [3.9, 'pop'], [5.26, 'clic', 0.8], [5.3, 'caisse', 0.5], [7.12, 'tampon'], [9.08, 'pop'], [10.26, 'pop'], [12.64, 'pop'], [13.92, 'pop'],
	[15.0, 'pop'], [17.44, 'pop'], [18.64, 'boing', 0.5], [20.30, 'pop', 0.25], [20.46, 'pop', 0.25], [20.62, 'pop', 0.25], [20.78, 'pop', 0.25], [20.94, 'pop', 0.25], [21.10, 'pop', 0.25], [21.26, 'pop', 0.25], [21.42, 'pop', 0.25], [21.58, 'pop', 0.25], [21.74, 'pop', 0.25], [23.26, 'pop'], [26.84, 'tampon'], [27.1, 'caisse', 0.6], [27.6, 'caisse', 0.6], [28.5, 'caisse', 0.7],
	[30.24, 'tampon'], [31.6, 'pop'], [33.72, 'tampon'], [37.28, 'clic', 0.5], [37.58, 'clic', 0.5], [37.88, 'clic', 0.5], [38.18, 'clic', 0.5], [38.48, 'clic', 0.5], [38.78, 'clic', 0.5], [39.08, 'clic', 0.5], [39.38, 'clic', 0.5], [40.3, 'caisse', 0.5], [41.0, 'caisse', 0.5], [42.4, 'pop'],
	[46.92, 'pop'], [49.5, 'ampoule'], [51.78, 'pop'], [53.78, 'pop'], [54.6, 'boing', 0.4], [56.72, 'caisse'], [57.2, 'tampon'], [58.4, 'pop'],
	[62.1, 'tampon'], [62.3, 'caisse', 0.6], [64.3, 'ampoule'], [66.3, 'tampon'],
];

export const Film: React.FC = () => {
	const [h] = useState(() => delayRender('police'));
	useEffect(() => {
		const ff = new FontFace('Lilita', `url(${staticFile('Lilita.woff2')})`);
		ff.load().then(() => { (document.fonts as any).add(ff); continueRender(h); });
	}, [h]);
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{PLANS.map(([a, b, P], i) => (
				<Sequence key={i} from={fr(versNouveau(a))} durationInFrames={fr(versNouveau(b)) - fr(versNouveau(a))}>
					<P />
				</Sequence>
			))}
			<SousTitres />
			<Audio src={staticFile('voix_finale.wav')} />
			<Audio src={staticFile('sons/marche.wav')} volume={(f) => interpolate(f, [0, 15, DUREE - 60, DUREE], [0, 0.16, 0.16, 0], {extrapolateRight: 'clamp'})} />
			{SONS.map(([s, n, v], i) => (
				<Sequence key={'s' + i} from={fr(versNouveau(s))} durationInFrames={fr(1.5)}>
					<Audio src={staticFile(`sons/${n}.wav`)} volume={v ?? 0.45} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
