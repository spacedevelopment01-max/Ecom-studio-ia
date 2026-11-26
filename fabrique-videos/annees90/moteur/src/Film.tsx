import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, delayRender, continueRender, interpolate, Easing} from 'remotion';
import minutage from './minutage.json';
import plan from './plan.json';

const FPS = 30;
const FIN = 63.7;
export const DUREE = Math.round(FIN * FPS);
const fr = (s: number) => Math.round(s * FPS);
const VOIX = 0.2;
type P = {debut: number; fin: number; fichier: string; type: 'photo' | 'video'};
const PLAN = plan as P[];
const CADRAGE: Record<string, string> = {'img_console_': '50% 50%', 'telephone_': '35% 50%', 'radio_': '62% 50%', 'rdv_8812': '45% 50%', 'parents_38045': '62% 50%'};
const cadrage = (f: string) => Object.entries(CADRAGE).find(([k]) => f.startsWith(k) || f.includes(k))?.[1] ?? '50% 50%';

type Mot = {w: string; s: number; e: number};
const MOTS = (minutage as {mots: Mot[]}).mots.map((m) => ({...m, w: m.w.replace(/[«»]/g, '')})).filter((m) => m.w.trim());
const GROUPES: Mot[][] = [];
let g: Mot[] = [];
MOTS.forEach((m, i) => {
	g.push(m);
	if (/[.,!?…:]$/.test(m.w) || g.length >= 3 || (MOTS[i + 1] && MOTS[i + 1].s - m.e > 0.35)) { GROUPES.push(g); g = []; }
});
if (g.length) GROUPES.push(g);

const SousTitres: React.FC = () => {
	const t = useCurrentFrame() / FPS;
	const idx = GROUPES.findIndex((gr, i) => t >= gr[0].s - 0.05 && t < (GROUPES[i + 1] ? Math.min(GROUPES[i + 1][0].s - 0.05, gr[gr.length - 1].e + 0.6) : gr[gr.length - 1].e + 0.9));
	if (idx < 0) return null;
	const gr = GROUPES[idx];
	const k = interpolate(t, [gr[0].s - 0.05, gr[0].s + 0.15], [0.85, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2))});
	return (
		<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 1330}}>
			<div style={{transform: `scale(${k})`, textAlign: 'center', maxWidth: 960, lineHeight: 1.1}}>
				{gr.map((m, i) => (
					<span key={i} style={{fontFamily: 'Lilita', fontSize: 92, color: t >= m.s - 0.03 ? '#FFE27A' : '#ffffff', WebkitTextStroke: '16px #1a0f08', paintOrder: 'stroke fill', margin: '0 10px', display: 'inline-block', textShadow: '0 8px 18px rgba(0,0,0,0.55)'}}>{m.w.replace(/[.,:]$/, '')}</span>
				))}
			</div>
		</AbsoluteFill>
	);
};

const Media: React.FC<{p: P; i: number}> = ({p, i}) => {
	const f = useCurrentFrame();
	const d = fr(p.fin) - fr(p.debut);
	const z = interpolate(f, [0, d], i % 2 ? [1.18, 1.06] : [1.06, 1.18]);
	const dx = interpolate(f, [0, d], i % 3 === 0 ? [-20, 20] : i % 3 === 1 ? [20, -20] : [0, 0]);
	const op = interpolate(f, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
	const style: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', objectPosition: cadrage(p.fichier), transform: `scale(${z}) translateX(${dx}px)`, filter: p.fichier.startsWith('cassette_13916') ? 'brightness(2.1) contrast(1.1)' : undefined};
	return (
		<AbsoluteFill style={{opacity: i === 0 ? 1 : op}}>
			{p.type === 'video' ? <OffthreadVideo src={staticFile('media/' + p.fichier)} muted style={style} /> : <Img src={staticFile('media/' + p.fichier)} style={style} />}
		</AbsoluteFill>
	);
};

const Cassette: React.FC = () => {
	const f = useCurrentFrame();
	const t = f / FPS;
	const graine = f % 9;
	const piste = (f * 7) % 2200 - 200;
	const bande = Math.floor(t / 4.3) % 3 === 0 && (f % 129) < 10;
	const neige = interpolate(t, [58.9, 59.7, FIN - 0.4, FIN], [0, 0.85, 0.85, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const date = `JUIL. 1996`;
	const heure = `${String(18 + Math.floor((t + 37) / 60)).padStart(2, '0')}:${String(Math.floor(t + 37) % 60).padStart(2, '0')}`;
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<svg width={1080} height={1920} style={{position: 'absolute', mixBlendMode: 'overlay', opacity: 0.32}}>
				<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={graine} /><feColorMatrix type="saturate" values="0" /></filter>
				<rect width={1080} height={1920} filter="url(#grain)" />
			</svg>
			<AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0px, rgba(0,0,0,0.14) 2px, transparent 2px, transparent 5px)'}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 50%, rgba(20,8,0,0.55) 100%)'}} />
			<AbsoluteFill style={{background: 'rgba(255,170,80,0.07)', mixBlendMode: 'multiply'}} />
			{bande && <div style={{position: 'absolute', left: 0, top: piste, width: 1080, height: 46, background: 'rgba(255,255,255,0.18)', filter: 'blur(3px)'}} />}
			<div style={{position: 'absolute', left: 70, top: 130, fontFamily: 'monospace', fontWeight: 900, fontSize: 52, color: '#fff', textShadow: '3px 3px 0 #000, 0 0 12px rgba(255,255,255,0.6)', letterSpacing: 4}}>{f % 60 < 40 ? '▶ PLAY' : '▶'}</div>
			<div style={{position: 'absolute', right: 70, bottom: 150, fontFamily: 'monospace', fontWeight: 900, fontSize: 46, color: '#fff', textAlign: 'right', textShadow: '3px 3px 0 #000, 0 0 12px rgba(255,255,255,0.6)', letterSpacing: 3}}>{date}<br />{heure}</div>
			{neige > 0 && (
				<svg width={1080} height={1920} style={{position: 'absolute', opacity: neige}}>
					<filter id="neige"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves={1} seed={f} /><feColorMatrix type="saturate" values="0" /></filter>
					<rect width={1080} height={1920} filter="url(#neige)" />
				</svg>
			)}
		</AbsoluteFill>
	);
};

const Connexion: React.FC = () => {
	const f = useCurrentFrame();
	if (f > fr(2.7)) return null;
	const k = interpolate(f, [0, fr(2.3)], [0, 1], {extrapolateRight: 'clamp'});
	const sortie = interpolate(f, [fr(2.3), fr(2.7)], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const titre = interpolate(f, [0, 6], [1.08, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2))});
	return (
		<AbsoluteFill style={{opacity: sortie}}>
			<div style={{position: 'absolute', top: 330, width: '100%', textAlign: 'center', transform: `scale(${titre})`}}>
				<span style={{fontFamily: 'Lilita', fontSize: 112, color: '#FFE27A', WebkitTextStroke: '18px #1a0f08', paintOrder: 'stroke fill', lineHeight: 1.1}}>TU RECONNAIS<br />CE BRUIT ? 🔊</span>
			</div>
			<div style={{position: 'absolute', left: 140, top: 900, width: 800, background: '#c0c0c0', border: '6px solid #fff', borderRightColor: '#404040', borderBottomColor: '#404040', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', fontFamily: 'monospace'}}>
				<div style={{background: 'linear-gradient(90deg,#000080,#1084d0)', color: '#fff', fontSize: 34, fontWeight: 900, padding: '10px 18px'}}>Connexion à Internet</div>
				<div style={{padding: 26, fontSize: 34, color: '#000'}}>
					<div>{k < 0.35 ? 'Numérotation…' : k < 0.75 ? 'Vérification…' : 'Connexion à 56 000 bit/s…'}</div>
					<div style={{marginTop: 22, height: 44, border: '4px solid #808080', background: '#fff', padding: 4}}>
						<div style={{display: 'flex', gap: 6, height: '100%'}}>{Array.from({length: Math.floor(k * 16)}).map((_, i) => <div key={i} style={{width: 38, height: '100%', background: '#000080'}} />)}</div>
					</div>
				</div>
			</div>
		</AbsoluteFill>
	);
};

export const Film: React.FC = () => {
	const [h] = useState(() => delayRender('police'));
	useEffect(() => {
		const ff = new FontFace('Lilita', `url(${staticFile('Lilita.woff2')})`);
		ff.load().then(() => { (document.fonts as any).add(ff); continueRender(h); });
	}, [h]);
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<AbsoluteFill style={{filter: 'sepia(0.28) saturate(1.15) contrast(1.06) brightness(1.03)'}}>
				{PLAN.map((p, i) => (
					<Sequence key={i} from={fr(p.debut)} durationInFrames={fr(i + 1 < PLAN.length ? PLAN[i + 1].debut + 0.27 : FIN) - fr(p.debut)}>
						<Media p={p} i={i} />
					</Sequence>
				))}
			</AbsoluteFill>
			<Connexion />
			<Cassette />
			<SousTitres />
			<Audio src={staticFile('modem.wav')} volume={(f) => interpolate(f, [0, fr(0.2), fr(0.5)], [0.6, 0.6, 0.2], {extrapolateRight: 'clamp'})} />
			<Sequence from={fr(VOIX)}><Audio src={staticFile('voix.wav')} /></Sequence>
			<Audio src={staticFile('piano.wav')} volume={(f) => interpolate(f, [0, fr(0.1), fr(0.4), fr(59.2), fr(60.7)], [0, 0, 0.17, 0.17, 0.26], {extrapolateRight: 'clamp'})} />
			<Sequence from={fr(60.1)}><Audio src={staticFile('modem.wav')} volume={0.5} /></Sequence>
		</AbsoluteFill>
	);
};
