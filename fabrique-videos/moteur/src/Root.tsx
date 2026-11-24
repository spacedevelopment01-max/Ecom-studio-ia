import React from 'react';
import {Composition} from 'remotion';
import {Film, DUREE} from './Film';
import {Profil} from './Profil';
export const Root: React.FC = () => (<>
	<Composition id="Emeus" component={Film} durationInFrames={DUREE} fps={30} width={1080} height={1920} />
	<Composition id="Profil" component={Profil} durationInFrames={1} fps={30} width={1080} height={1080} />
</>);
