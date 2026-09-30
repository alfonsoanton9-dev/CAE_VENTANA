import { ANEJO_B } from './datos/anejoB';
import { ZONAS_INVIERNO, ZONAS_VERANO, type Ubicacion, type ZonaInvierno, type ZonaVerano } from './tipos';

export interface Tramo {
  /** Altitud máxima (m, inclusive) del tramo; `null` = sin límite superior. */
  hasta: number | null;
  /** Zona climática (letra de invierno + número de verano), p. ej. "D3". */
  zona: string;
}

export interface ProvinciaClima {
  nombre: string;
  capital: string;
  /** Altitud de referencia de la capital h0 (m); dato informativo. */
  altitudReferenciaM: number;
  /** Tramos ordenados por altitud creciente (Anejo B, tabla a). */
  tramos: Tramo[];
}

/** Indexada por los dos primeros dígitos del código postal ("01"…"52"). */
export type TablaZonas = Record<string, ProvinciaClima>;

export function tablaZonasOficial(): TablaZonas {
  const t: TablaZonas = {};
  for (const [codigo, nombre, capital, h0, tramos] of ANEJO_B) {
    t[codigo] = {
      nombre,
      capital,
      altitudReferenciaM: h0,
      tramos: tramos.map(([hasta, zona]) => ({ hasta, zona })),
    };
  }
  return t;
}

export function codigosProvincia(t: TablaZonas): string[] {
  return Object.keys(t).sort();
}

/** Los dos primeros dígitos del código postal identifican la provincia. */
export function provinciaDesdeCodigoPostal(cp: string, t: TablaZonas): { codigo: string; provincia: ProvinciaClima } | undefined {
  const limpio = cp.trim();
  if (!/^\d{5}$/.test(limpio)) return undefined;
  const codigo = limpio.slice(0, 2);
  const provincia = t[codigo];
  return provincia ? { codigo, provincia } : undefined;
}

export function ubicacionDeProvincia(codigo: string): Ubicacion {
  if (codigo === '07') return 'baleares';
  if (codigo === '51') return 'ceuta';
  if (codigo === '52') return 'melilla';
  if (codigo === '35' || codigo === '38') return 'canarias';
  return 'peninsula';
}

export interface ZonaParseada {
  texto: string;
  invierno?: ZonaInvierno;
  verano?: ZonaVerano;
  /** Zona sin correspondencia en el Anexo II de la ficha (p. ej. "α3" de Canarias). */
  fueraDeFicha: boolean;
}

export function parsearZona(zona: string): ZonaParseada | undefined {
  const m = /^\s*([αA-Ea-e])\s*([1-4])\s*$/.exec(zona);
  if (!m) return undefined;
  const letra = m[1] === 'α' ? 'α' : m[1].toUpperCase();
  const verano = Number(m[2]) as ZonaVerano;
  const invierno = (ZONAS_INVIERNO as readonly string[]).includes(letra) ? (letra as ZonaInvierno) : undefined;
  return {
    texto: `${letra}${verano}`,
    invierno,
    verano: (ZONAS_VERANO as readonly number[]).includes(verano) ? verano : undefined,
    fueraDeFicha: invierno === undefined,
  };
}

export interface ResultadoZona {
  zona: ZonaParseada;
  tramo: Tramo;
  altitudRedondeada: number;
}

/** Zona climática de una provincia a una altitud dada (tabla a-Anejo B). */
export function zonaPorAltitud(t: TablaZonas, codigo: string, altitudM: number): ResultadoZona | undefined {
  const prov = t[codigo];
  if (!prov || !Number.isFinite(altitudM)) return undefined;
  const h = Math.round(altitudM);
  const tramo = prov.tramos.find((x) => x.hasta === null || h <= x.hasta);
  if (!tramo) return undefined;
  const zona = parsearZona(tramo.zona);
  return zona ? { zona, tramo, altitudRedondeada: h } : undefined;
}

export function etiquetaTramo(prov: ProvinciaClima, i: number): string {
  const t = prov.tramos[i];
  const desde = i === 0 ? null : (prov.tramos[i - 1].hasta ?? 0) + 1;
  if (desde === null) return t.hasta === null ? 'Cualquier altitud' : `≤ ${t.hasta} m`;
  return t.hasta === null ? `≥ ${desde} m` : `${desde} – ${t.hasta} m`;
}

/** Fusiona una tabla guardada (posiblemente parcial o corrupta) con la oficial. */
export function normalizarTablaZonas(guardada: unknown): TablaZonas {
  const base = tablaZonasOficial();
  if (!guardada || typeof guardada !== 'object') return base;
  const g = guardada as Record<string, Partial<ProvinciaClima>>;
  for (const codigo of Object.keys(base)) {
    const s = g[codigo];
    if (!s || typeof s !== 'object') continue;
    const tramos = Array.isArray(s.tramos)
      ? s.tramos.filter((t): t is Tramo => !!t && typeof t.zona === 'string' && parsearZona(t.zona) !== undefined && (t.hasta === null || Number.isFinite(t.hasta)))
      : [];
    base[codigo] = {
      nombre: typeof s.nombre === 'string' && s.nombre ? s.nombre : base[codigo].nombre,
      capital: typeof s.capital === 'string' && s.capital ? s.capital : base[codigo].capital,
      altitudReferenciaM: typeof s.altitudReferenciaM === 'number' && Number.isFinite(s.altitudReferenciaM) ? s.altitudReferenciaM : base[codigo].altitudReferenciaM,
      tramos: tramos.length > 0 ? tramos : base[codigo].tramos,
    };
  }
  return base;
}

/** Comprueba coherencia de los tramos (orden creciente y último sin límite). */
export function validarTramos(tramos: Tramo[]): string | undefined {
  if (tramos.length === 0) return 'Debe haber al menos un tramo.';
  for (let i = 0; i < tramos.length; i++) {
    const t = tramos[i];
    if (!parsearZona(t.zona)) return `Zona no válida: “${t.zona}” (usa letra A–E y número 1–4).`;
    const ultimo = i === tramos.length - 1;
    if (ultimo && t.hasta !== null) return 'El último tramo debe quedar sin límite superior.';
    if (!ultimo) {
      if (t.hasta === null) return 'Sólo el último tramo puede quedar sin límite.';
      if (i > 0 && (tramos[i - 1].hasta ?? -Infinity) >= t.hasta) return 'Las altitudes deben ser crecientes.';
    }
  }
  return undefined;
}
