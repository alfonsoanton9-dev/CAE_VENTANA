import { obtenerG, type Parametros } from './parametros';
import { MATERIALES_MARCO, type Actuacion, type Expediente, type Ventana } from './tipos';

/**
 * Fórmula de la ficha RES070 (apartado 3):
 *   AE_TOTAL = Fp · Σ (Uhi − Uhf)_i · S_i · G      [kWh/año]
 * con G en miles de horas·K/año (por eso el resultado sale directamente en kWh/año).
 */
export function ahorroVentana(uhi: number, uhf: number, superficie: number, g: number): number {
  return (uhi - uhf) * superficie * g;
}

export type Gravedad = 'error' | 'aviso';

export interface Aviso {
  gravedad: Gravedad;
  mensaje: string;
}

export interface DesgloseVentana {
  ventanaId: string;
  etiqueta: string;
  unidades: number;
  superficieUnitaria?: number;
  superficie?: number;
  uhi?: number;
  uhf?: number;
  deltaU?: number;
  g: number | null;
  fp: number;
  aeBruto: number | null;
  aeFormula: number | null;
  forzadoACero: boolean;
  ae: number | null;
  completa: boolean;
  avisos: Aviso[];
}

export interface ResultadoActuacion {
  actuacionId: string;
  etiqueta: string;
  fp: number;
  g: number | null;
  ventanas: DesgloseVentana[];
  ventanasCalculadas: number;
  superficieHuecos: number;
  porcentajeEnvolvente: number | null;
  sumatorioBruto: number;
  aeTotal: number;
  multiplicadorDuracion: number;
  cae: number;
  avisos: Aviso[];
  cumple: boolean;
}

export interface ResultadoExpediente {
  actuaciones: ResultadoActuacion[];
  ventanasCalculadas: number;
  ventanasTotales: number;
  superficieHuecos: number;
  /** Σ AE de todas las actuaciones [kWh/año]. */
  aeTotal: number;
  /** Σ CAE de todas las actuaciones. */
  cae: number;
  avisos: Aviso[];
  cumple: boolean;
}

export function esMarcoMetalico(v: Ventana): boolean {
  return MATERIALES_MARCO.find((m) => m.valor === v.nueva.materialMarco)?.metalico ?? false;
}

export function superficieVentana(v: Ventana): number | undefined {
  if (v.superficieM2 === undefined) return undefined;
  const u = Number.isFinite(v.unidades) && v.unidades > 0 ? v.unidades : 1;
  return v.superficieM2 * u;
}

export function fpAplicable(a: Pick<Actuacion, 'fpPersonalizado'>, p: Parametros): number {
  return a.fpPersonalizado !== undefined && Number.isFinite(a.fpPersonalizado) ? a.fpPersonalizado : p.fp;
}

export function comprobarVentana(v: Ventana, a: Actuacion, p: Parametros): Aviso[] {
  const avisos: Aviso[] = [];
  const { nueva } = v;

  if (v.superficieM2 === undefined || v.superficieM2 <= 0) avisos.push({ gravedad: 'error', mensaje: 'Indica una superficie del hueco mayor que 0.' });
  if (v.anterior.transmitancia === undefined || v.anterior.transmitancia <= 0)
    avisos.push({ gravedad: 'error', mensaje: 'Indica la transmitancia anterior Uhi (W/m²·K).' });
  if (nueva.transmitancia === undefined || nueva.transmitancia <= 0)
    avisos.push({ gravedad: 'error', mensaje: 'Indica la transmitancia nueva Uhf (W/m²·K).' });

  if (v.anterior.transmitancia !== undefined && nueva.transmitancia !== undefined && nueva.transmitancia >= v.anterior.transmitancia) {
    const estrictamenteNegativo = nueva.transmitancia > v.anterior.transmitancia;
    avisos.push({
      gravedad: 'aviso',
      mensaje:
        p.ignorarAhorrosNegativos && estrictamenteNegativo
          ? 'La transmitancia nueva (Uhf) es mayor que la anterior (Uhi): el ahorro sería negativo y se computa como 0 kWh (Ajustes → ignorar ahorros negativos).'
          : 'La transmitancia nueva (Uhf) no es menor que la anterior (Uhi): el ahorro de esta ventana es nulo o negativo.',
    });
  }

  if (a.zonaInvierno) {
    const max = p.permeabilidadMaxPorZona[a.zonaInvierno];
    if (nueva.clasePermeabilidad === 0) {
      avisos.push({ gravedad: 'aviso', mensaje: `Indica la clase de permeabilidad al aire (máx. ${max} m³/h·m² a 100 Pa en zona ${a.zonaInvierno}).` });
    } else if (p.permeabilidadPorClase[nueva.clasePermeabilidad] > max) {
      avisos.push({
        gravedad: 'error',
        mensaje: `Permeabilidad al aire insuficiente: la clase ${nueva.clasePermeabilidad} (≤ ${p.permeabilidadPorClase[nueva.clasePermeabilidad]} m³/h·m²) supera el máximo de ${max} m³/h·m² para la zona ${a.zonaInvierno}.`,
      });
    }
  }

  if (esMarcoMetalico(v)) {
    if (nueva.roturaPuenteTermicoMm === undefined || nueva.roturaPuenteTermicoMm < p.roturaPuenteTermicoMinMm) {
      avisos.push({
        gravedad: 'error',
        mensaje: `Un marco metálico requiere rotura de puente térmico de al menos ${p.roturaPuenteTermicoMinMm} mm.`,
      });
    }
  }

  if (nueva.tienePersiana) {
    if (nueva.claseCajonPersiana < p.claseMinCajonPersiana) {
      avisos.push({ gravedad: 'error', mensaje: `El cajón de persiana debe tener permeabilidad al aire de clase ${p.claseMinCajonPersiana}.` });
    }
    if (nueva.transmitanciaCajon === undefined || nueva.transmitanciaCajon >= p.transmitanciaMaxCajon) {
      avisos.push({
        gravedad: 'error',
        mensaje: `El cajón de persiana debe tener una transmitancia inferior a ${p.transmitanciaMaxCajon} W/m²·K.`,
      });
    }
  }

  if (!nueva.marcadoCE) avisos.push({ gravedad: 'aviso', mensaje: 'Falta confirmar la declaración de prestaciones y el marcado CE de la ventana nueva.' });

  return avisos;
}

export function desglosarVentana(v: Ventana, a: Actuacion, p: Parametros): DesgloseVentana {
  const g = obtenerG(p, a.zonaInvierno, a.zonaVerano);
  const fp = fpAplicable(a, p);
  const S = superficieVentana(v);
  const uhi = v.anterior.transmitancia;
  const uhf = v.nueva.transmitancia;
  const completa = S !== undefined && S > 0 && uhi !== undefined && uhf !== undefined && g !== null;
  let aeBruto: number | null = null;
  let aeFormula: number | null = null;
  let ae: number | null = null;
  let forzadoACero = false;
  if (completa) {
    aeFormula = ahorroVentana(uhi, uhf, S, g);
    aeBruto = aeFormula;
    if (p.ignorarAhorrosNegativos && aeBruto < 0) {
      aeBruto = 0;
      forzadoACero = true;
    }
    ae = fp * aeBruto;
  }
  return {
    ventanaId: v.id,
    etiqueta: v.etiqueta,
    unidades: v.unidades,
    superficieUnitaria: v.superficieM2,
    superficie: S,
    uhi,
    uhf,
    deltaU: uhi !== undefined && uhf !== undefined ? uhi - uhf : undefined,
    g,
    fp,
    aeBruto,
    aeFormula,
    forzadoACero,
    ae,
    completa,
    avisos: comprobarVentana(v, a, p),
  };
}

export function comprobarActuacion(a: Actuacion, p: Parametros, porcentaje: number | null): Aviso[] {
  const avisos: Aviso[] = [];
  if (!a.zonaInvierno || !a.zonaVerano) {
    avisos.push({ gravedad: 'error', mensaje: 'Indica la zona climática (invierno y verano) para obtener el coeficiente G.' });
  } else if (obtenerG(p, a.zonaInvierno, a.zonaVerano) === null) {
    avisos.push({
      gravedad: 'error',
      mensaje: `La zona ${a.zonaInvierno}${a.zonaVerano} no tiene valor de G en el Anexo II (ni en Ajustes).`,
    });
  }
  if (a.ubicacion === 'canarias') {
    avisos.push({ gravedad: 'error', mensaje: 'La ficha RES070 no aplica en Canarias: sólo Península, Illes Balears, Ceuta y Melilla.' });
  }
  if (!a.edificioExistente) avisos.push({ gravedad: 'error', mensaje: 'La ficha RES070 aplica únicamente a edificios existentes.' });
  if (!a.usoResidencialPrivado) avisos.push({ gravedad: 'error', mensaje: 'La ficha RES070 aplica únicamente a edificios de uso residencial privado.' });
  if (a.superficieEnvolventeM2 === undefined || a.superficieEnvolventeM2 <= 0) {
    avisos.push({ gravedad: 'aviso', mensaje: 'Indica la superficie total de la envolvente térmica final para comprobar el límite del 25 %.' });
  } else if (porcentaje !== null && porcentaje > p.umbralEnvolventePct) {
    avisos.push({
      gravedad: 'error',
      mensaje: `La superficie de huecos rehabilitados (${porcentaje.toFixed(2).replace('.', ',')} %) supera el ${p.umbralEnvolventePct} % de la envolvente térmica final.`,
    });
  }
  if (a.ventanas.length === 0) avisos.push({ gravedad: 'aviso', mensaje: 'Todavía no hay ventanas en esta actuación.' });
  return avisos;
}

export function calcularActuacion(a: Actuacion, p: Parametros): ResultadoActuacion {
  const ventanas = a.ventanas.map((v) => desglosarVentana(v, a, p));
  const fp = fpAplicable(a, p);
  const g = obtenerG(p, a.zonaInvierno, a.zonaVerano);
  const sumatorioBruto = ventanas.reduce((acc, d) => acc + (d.aeBruto ?? 0), 0);
  const aeTotal = fp * sumatorioBruto;
  const superficieHuecos = a.ventanas.reduce((acc, v) => acc + (superficieVentana(v) ?? 0), 0);
  const porcentajeEnvolvente =
    a.superficieEnvolventeM2 !== undefined && a.superficieEnvolventeM2 > 0 ? (superficieHuecos / a.superficieEnvolventeM2) * 100 : null;
  const multiplicadorDuracion = p.multiplicarPorDuracion && a.duracionAnios !== undefined && a.duracionAnios > 0 ? a.duracionAnios : 1;
  const cae = (aeTotal * multiplicadorDuracion) / p.kwhPorCae;
  const avisos = comprobarActuacion(a, p, porcentajeEnvolvente);
  const negativos = ventanas.filter((d) => d.forzadoACero).length;
  if (negativos > 0) {
    avisos.push({
      gravedad: 'aviso',
      mensaje: `${negativos} ventana${negativos > 1 ? 's tienen' : ' tiene'} ahorro negativo y se ${negativos > 1 ? 'computan' : 'computa'} como 0 kWh.`,
    });
  }
  const cumple = avisos.every((x) => x.gravedad !== 'error') && ventanas.every((d) => d.avisos.every((x) => x.gravedad !== 'error'));
  return {
    actuacionId: a.id,
    etiqueta: a.etiqueta,
    fp,
    g,
    ventanas,
    ventanasCalculadas: ventanas.filter((d) => d.completa).length,
    superficieHuecos,
    porcentajeEnvolvente,
    sumatorioBruto,
    aeTotal,
    multiplicadorDuracion,
    cae,
    avisos,
    cumple,
  };
}

export function calcularExpediente(e: Expediente, p: Parametros): ResultadoExpediente {
  const actuaciones = e.actuaciones.map((a) => calcularActuacion(a, p));
  const aeTotal = actuaciones.reduce((acc, r) => acc + r.aeTotal, 0);
  const cae = actuaciones.reduce((acc, r) => acc + r.cae, 0);
  const superficieHuecos = actuaciones.reduce((acc, r) => acc + r.superficieHuecos, 0);
  const ventanasCalculadas = actuaciones.reduce((acc, r) => acc + r.ventanasCalculadas, 0);
  const ventanasTotales = e.actuaciones.reduce((acc, a) => acc + a.ventanas.length, 0);
  const avisos: Aviso[] = [];
  if (e.actuaciones.length === 0) avisos.push({ gravedad: 'aviso', mensaje: 'El expediente no tiene actuaciones todavía.' });
  if (!e.sujeto.razonSocial.trim()) avisos.push({ gravedad: 'aviso', mensaje: 'Indica el sujeto obligado o delegado del expediente.' });
  const cumple = avisos.every((a) => a.gravedad !== 'error') && actuaciones.every((r) => r.cumple);
  return { actuaciones, ventanasCalculadas, ventanasTotales, superficieHuecos, aeTotal, cae, avisos, cumple };
}
