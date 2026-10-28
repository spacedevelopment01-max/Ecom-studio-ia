import{expect,it}from'vitest';
import{displayMaximumPct}from'@/lib/conversation-presentation';
it('un maximum positif ne paraît jamais nul ou inférieur au plafond transmis par le serveur',()=>{
  for(const value of [0,0.000001,0.049,0.10001,2.44,9.99,10.01,89.1,100]){const shown=displayMaximumPct(value);expect(shown).toBeGreaterThanOrEqual(value);if(value>0)expect(shown).toBeGreaterThan(0);}
  expect(()=>displayMaximumPct(NaN)).toThrow();expect(()=>displayMaximumPct(-1)).toThrow();
});
