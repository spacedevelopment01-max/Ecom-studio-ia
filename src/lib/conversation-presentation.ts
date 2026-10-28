/** Le maximum montré au client reste une borne supérieure malgré l'arrondi d'affichage. */
export function displayMaximumPct(value:number){if(!Number.isFinite(value)||value<0)throw Error('invalid_quote_maximum');return value<10?Math.ceil(value*10)/10:Math.ceil(value);}
