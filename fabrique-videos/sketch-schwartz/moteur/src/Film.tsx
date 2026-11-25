import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, delayRender, continueRender, interpolate} from 'remotion';
import {PLANS6, FIN} from './plans6';
import minutage from './minutage.json';

const FPS = 30;
export const DUREE = Math.round(FIN * FPS);
const fr = (s: number) => Math.round(s * FPS);
type Mot = {w: string; s: number; e: number};
const MOTS = (minutage as unknown as {mots: Mot[]}).mots.map((m) => ({...m, w: m.w.replace(/[«»]/g, '').replace(/[.,!?…:]+$/, '')})).filter((m) => m.w);
const COULEURS = ['#7CFC00', '#FFD23F', '#5ce1ff', '#ffffff', '#ff9ad5'];

const Mot: React.FC = () => {
	const t = useCurrentFrame() / FPS;
	let idx = -1;
	for (let i = 0; i < MOTS.length; i++) if (MOTS[i].s - 0.03 <= t) idx = i;
	if (idx < 0) return null;
	const m = MOTS[idx];
	const suivant = MOTS[idx + 1];
	if (t > m.e + 0.5 && (!suivant || t < suivant.s - 0.03)) return null;
	const k = interpolate(t, [m.s - 0.03, m.s + 0.08], [0.7, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 1380}}>
			<div style={{transform: `scale(${k})`, fontFamily: 'Lilita', fontSize: 120, color: COULEURS[idx % COULEURS.length], WebkitTextStroke: '22px #000', paintOrder: 'stroke fill', textTransform: 'uppercase', textShadow: '0 10px 0 rgba(0,0,0,0.35)'}}>{m.w}</div>
		</AbsoluteFill>
	);
};

const Bandeau: React.FC = () => (
	<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 170}}>
		<div style={{background: '#fff', color: '#111', fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 52, lineHeight: 1.2, textAlign: 'center', padding: '18px 34px', borderRadius: 18, maxWidth: 860, boxShadow: '0 8px 0 rgba(0,0,0,0.25)'}}>
			Quand tu demandes au conseiller d'épeler un mot 🤣
		</div>
	</AbsoluteFill>
);

export const Film: React.FC = () => {
	const [h] = useState(() => delayRender('police'));
	useEffect(() => {
		const ff = new FontFace('Lilita', `url(${staticFile('Lilita.woff2')})`);
		ff.load().then(() => { (document.fonts as any).add(ff); continueRender(h); });
	}, [h]);
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{PLANS6.map(([a, b, P], i) => (
				<Sequence key={i} from={fr(a)} durationInFrames={Math.max(1, fr(b) - fr(a))}><P /></Sequence>
			))}
			<Bandeau />
			<Mot />
			<Audio src={staticFile('voix_finale.wav')} />
		</AbsoluteFill>
	);
};
