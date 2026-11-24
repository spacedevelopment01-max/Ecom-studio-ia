import React from 'react';
import {AbsoluteFill} from 'remotion';
import {INK, KHAKI} from './dessins';

const T = 16; // épaisseur du contour
export const Profil: React.FC = () => (
	<AbsoluteFill>
		<svg viewBox="0 0 1080 1080" width={1080} height={1080}>
			<defs>
				<radialGradient id="fond" cx="0.5" cy="0.42" r="0.7">
					<stop offset="0" stopColor="#ffd56b" />
					<stop offset="1" stopColor="#e9772f" />
				</radialGradient>
			</defs>
			<rect width={1080} height={1080} fill="url(#fond)" />
			{Array.from({length: 18}).map((_, i) => (
				<path key={i} d="M 540 500 L 515 -500 L 565 -500 Z" fill="#fff3c4" opacity={0.3} transform={`rotate(${i * 20} 540 500)`} />
			))}
			{/* cou */}
			<path d="M 470 700 Q 440 900 400 1120 L 690 1120 Q 640 900 640 700 Z" fill="#7d95ad" stroke={INK} strokeWidth={T} strokeLinejoin="round" />
			<path d="M 500 820 q 30 20 60 0 M 470 960 q 40 22 80 0" stroke="#5f7790" strokeWidth={12} fill="none" strokeLinecap="round" />
			{/* tête */}
			<ellipse cx={540} cy={560} rx={235} ry={205} fill="#6b8299" stroke={INK} strokeWidth={T} />
			{/* bec */}
			<path d="M 735 560 Q 940 585 742 650 Q 720 610 735 560 Z" fill="#4a4442" stroke={INK} strokeWidth={T} strokeLinejoin="round" />
			<path d="M 745 606 L 860 600" stroke={INK} strokeWidth={10} strokeLinecap="round" />
			{/* œil inquiet, qui regarde de côté */}
			<circle cx={575} cy={520} r={92} fill="#fff" stroke={INK} strokeWidth={T} />
			<circle cx={540} cy={540} r={40} fill={INK} />
			<circle cx={526} cy={526} r={13} fill="#fff" />
			<path d="M 480 395 Q 560 360 660 410" stroke={INK} strokeWidth={18} fill="none" strokeLinecap="round" />
			{/* joue */}
			<ellipse cx={680} cy={660} rx={40} ry={22} fill="#f19a8a" opacity={0.55} />
			{/* chapeau de soldat, un peu de travers */}
			<g transform="rotate(-10 520 330)">
				<path d="M 300 345 L 230 350 L 300 230 Z" fill="#a08550" stroke={INK} strokeWidth={T} strokeLinejoin="round" />
				<ellipse cx={520} cy={345} rx={290} ry={52} fill="#a08550" stroke={INK} strokeWidth={T} />
				<path d="M 365 345 Q 370 175 520 165 Q 670 175 675 345 Z" fill={KHAKI} stroke={INK} strokeWidth={T} strokeLinejoin="round" />
				<rect x={367} y={285} width={306} height={40} fill="#5a4325" />
			</g>
			{/* goutte de sueur */}
			<g transform="translate(300 520) rotate(-15)">
				<path d="M 0 -80 C 34 -24 55 10 55 38 A 55 55 0 0 1 -55 38 C -55 10 -34 -24 0 -80 Z" fill="#9fdcff" stroke={INK} strokeWidth={12} strokeLinejoin="round" />
				<ellipse cx={-16} cy={30} rx={11} ry={18} fill="#fff" opacity={0.85} />
			</g>
		</svg>
	</AbsoluteFill>
);
