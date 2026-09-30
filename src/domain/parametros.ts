import { normalizarTablaZonas, tablaZonasOficial, type TablaZonas } from './zonasClimaticas';
import { ZONAS_INVIERNO, ZONAS_VERANO, type ClasePermeabilidad, type ZonaInvierno, type ZonaVerano } from './tipos';

/**
 * Tabla del coeficiente G (miles de horas·K/año) indexada por [ZCI][ZCV].
 * `null` = combinación no definida en el Anexo II de la ficha RES070.
 */
export type TablaG = Record<ZonaInvierno, Record<ZonaVerano, number | null>>;

export const VERSION_PARAMETROS = 2;

export interface Parametros {
  /** Versión del esquema de ajustes (para migrar valores por defecto). */
  version: number;
  /** Tabla a-Anejo B del CTE DB-HE: zona climática por provincia y altitud. */
  zonasClimaticas: TablaZonas;
  /** Fp: factor de ponderación (ficha RES070, apartado 3). */
  fp: number;
  /** Coeficiente G por zona climática (Anexo II). */
  g: TablaG;
  /** Límite de superficie rehabilitada sobre la envolvente térmica final (%). */
  umbralEnvolventePct: number;
  /** Permeabilidad máxima admitida (m³/h·m² a 100 Pa) según zona climática de invierno. */
  permeabilidadMaxPorZona: Record<ZonaInvierno, number>;
  /** Permeabilidad máxima (m³/h·m² a 100 Pa) que corresponde a cada clase UNE-EN 12207. */
  permeabilidadPorClase: Record<Exclude<ClasePermeabilidad, 0>, number>;
  /** Rotura de puente térmico mínima para marcos metálicos (mm). */
  roturaPuenteTermicoMinMm: number;
  /** Clase mínima de permeabilidad al aire del cajón de persiana. */
  claseMinCajonPersiana: number;
  /** Transmitancia máxima del cajón de persiana (W/m²·K); debe ser inferior. */
  transmitanciaMaxCajon: number;
  /** kWh de ahorro de energía final que equivalen a 1 CAE. */
  kwhPorCae: number;
  /** Si se activa, CAE = ahorro anual × Di. Por defecto la ficha no usa Di en el cálculo. */
  multiplicarPorDuracion: boolean;
  /** Si se activa (por defecto), las ventanas con ahorro negativo cuentan como 0 kWh. */
  ignorarAhorrosNegativos: boolean;
}

const g = (a: number | null, b: number | null, c: number | null, d: number | null, e: number | null) => ({
  A: a,
  B: b,
  C: c,
  D: d,
  E: e,
});

/** Filas del Anexo II: ZCV 1..4 → valores para ZCI A..E. */
const FILAS_ANEXO_II: Record<ZonaVerano, [number | null, number | null, number | null, number | null, number | null]> = {
  1: [null, null, 44, 60, 74],
  2: [null, null, 45, 60, null],
  3: [25, 32, 46, 61, null],
  4: [26, 33, 46, null, null],
};

export function tablaGOficial(): TablaG {
  const tabla = {} as TablaG;
  ZONAS_INVIERNO.forEach((zci, i) => {
    const col = {} as Record<ZonaVerano, number | null>;
    ZONAS_VERANO.forEach((zcv) => {
      col[zcv] = FILAS_ANEXO_II[zcv][i];
    });
    tabla[zci] = col;
  });
  return tabla;
}

export function parametrosPorDefecto(): Parametros {
  return {
    version: VERSION_PARAMETROS,
    zonasClimaticas: tablaZonasOficial(),
    fp: 1,
    g: tablaGOficial(),
    umbralEnvolventePct: 25,
    permeabilidadMaxPorZona: { A: 27, B: 27, C: 9, D: 9, E: 9 },
    permeabilidadPorClase: { 1: 50, 2: 27, 3: 9, 4: 3 },
    roturaPuenteTermicoMinMm: 16,
    claseMinCajonPersiana: 4,
    transmitanciaMaxCajon: 1.5,
    kwhPorCae: 1,
    multiplicarPorDuracion: false,
    ignorarAhorrosNegativos: true,
  };
}

/** Fusiona parámetros guardados (posiblemente antiguos o incompletos) con los valores por defecto. */
export function normalizarParametros(guardados: unknown): Parametros {
  const base = parametrosPorDefecto();
  if (!guardados || typeof guardados !== 'object') return base;
  const s = guardados as Partial<Parametros>;
  const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
  const g2 = tablaGOficial();
  ZONAS_INVIERNO.forEach((zci) =>
    ZONAS_VERANO.forEach((zcv) => {
      const v = s.g?.[zci]?.[zcv];
      if (v === null || (typeof v === 'number' && Number.isFinite(v))) g2[zci][zcv] = v;
    }),
  );
  const perm = { ...base.permeabilidadMaxPorZona };
  ZONAS_INVIERNO.forEach((z) => (perm[z] = num(s.permeabilidadMaxPorZona?.[z], perm[z])));
  const clases = { ...base.permeabilidadPorClase };
  ([1, 2, 3, 4] as const).forEach((c) => (clases[c] = num(s.permeabilidadPorClase?.[c], clases[c])));
  const versionGuardada = typeof s.version === 'number' ? s.version : 1;
  return {
    version: VERSION_PARAMETROS,
    zonasClimaticas: normalizarTablaZonas(s.zonasClimaticas),
    fp: num(s.fp, base.fp),
    g: g2,
    umbralEnvolventePct: num(s.umbralEnvolventePct, base.umbralEnvolventePct),
    permeabilidadMaxPorZona: perm,
    permeabilidadPorClase: clases,
    roturaPuenteTermicoMinMm: num(s.roturaPuenteTermicoMinMm, base.roturaPuenteTermicoMinMm),
    claseMinCajonPersiana: num(s.claseMinCajonPersiana, base.claseMinCajonPersiana),
    transmitanciaMaxCajon: num(s.transmitanciaMaxCajon, base.transmitanciaMaxCajon),
    kwhPorCae: num(s.kwhPorCae, base.kwhPorCae) > 0 ? num(s.kwhPorCae, base.kwhPorCae) : base.kwhPorCae,
    multiplicarPorDuracion: typeof s.multiplicarPorDuracion === 'boolean' ? s.multiplicarPorDuracion : base.multiplicarPorDuracion,
    // v1 guardaba `false` como valor por defecto: se migra al nuevo por defecto (`true`).
    ignorarAhorrosNegativos:
      versionGuardada >= 2 && typeof s.ignorarAhorrosNegativos === 'boolean' ? s.ignorarAhorrosNegativos : base.ignorarAhorrosNegativos,
  };
}

export function obtenerG(p: Parametros, zci?: ZonaInvierno, zcv?: ZonaVerano): number | null {
  if (!zci || !zcv) return null;
  return p.g[zci]?.[zcv] ?? null;
}
