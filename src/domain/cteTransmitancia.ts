import type { ZonaInvierno } from './tipos';

/**
 * Valores de transmitancia térmica U (W/m²·K) para ventanas según zona climática de invierno (CTE).
 * Cuanto menor sea Uhf respecto a Uhi, mayor será el ahorro certificable (RES070).
 */
export const CTE_TRANSMITANCIA_VENTANAS: Record<
  ZonaInvierno,
  { ciudadesEjemplo: string; uMaximo: number; uRecomendado: number }
> = {
  A: { ciudadesEjemplo: 'Canarias, costa sur', uMaximo: 3.5, uRecomendado: 2.0 },
  B: { ciudadesEjemplo: 'Costa mediterránea', uMaximo: 3.0, uRecomendado: 1.8 },
  C: { ciudadesEjemplo: 'Madrid, interior sur', uMaximo: 2.5, uRecomendado: 1.6 },
  D: { ciudadesEjemplo: 'Navarra, Castilla y León', uMaximo: 2.0, uRecomendado: 1.4 },
  E: { ciudadesEjemplo: 'Alta montaña', uMaximo: 1.8, uRecomendado: 1.2 },
};

export function limitesCteTransmitancia(zona: ZonaInvierno | undefined) {
  if (!zona) return undefined;
  return CTE_TRANSMITANCIA_VENTANAS[zona];
}

export function textoAyudaCteUhf(zona: ZonaInvierno | undefined): string {
  const lim = limitesCteTransmitancia(zona);
  if (!lim) return 'Indica la zona climática en la actuación para contrastar Uhf con el CTE.';
  return `Zona ${zona} (${lim.ciudadesEjemplo}): U máximo CTE ${String(lim.uMaximo).replace('.', ',')} W/m²·K · recomendado < ${String(lim.uRecomendado).replace('.', ',')} W/m²·K. Cuanto menor sea Uhf frente a Uhi, mayor el ahorro certificable.`;
}
