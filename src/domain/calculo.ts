import { obtenerG, type Parametros } from './parametros';
import { MATERIALES_MARCO, type Expediente, type Ventana } from './tipos';

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
  /** Superficie unitaria (m²). */
  superficieUnitaria?: number;
  /** Superficie considerada = unitaria × unidades (m²). */
  superficie?: number;
  uhi?: number;
  uhf?: number;
  deltaU?: number;
  g: number | null;
  fp: number;
  /** AE_hueco antes de aplicar Fp: (Uhi − Uhf)·S·G (ya forzado a 0 si procede). */
  aeBruto: number | null;
  /** Valor calculado por la fórmula antes de forzar a 0 los ahorros negativos. */
  aeFormula: number | null;
  /** El ahorro era negativo y se ha forzado a 0 kWh según Ajustes. */
  forzadoACero: boolean;
  /** AE_hueco = Fp · (Uhi − Uhf)·S·G  [kWh/año]. */
  ae: number | null;
  /** Falta algún dato para calcular. */
  completa: boolean;
  avisos: Aviso[];
}

export interface ResultadoExpediente {
  fp: number;
  g: number | null;
  ventanas: DesgloseVentana[];
  ventanasCalculadas: number;
  superficieHuecos: number;
  porcentajeEnvolvente: number | null;
  /** Σ (Uhi − Uhf)·S·G sin Fp. */
  sumatorioBruto: number;
  /** AE_TOTAL [kWh/año]. */
  aeTotal: number;
  /** Multiplicador aplicado además de AE (Di si está activado, si no 1). */
  multiplicadorDuracion: number;
  /** CAE = AE_TOTAL · multiplicador / kWh por CAE. */
  cae: number;
  avisosExpediente: Aviso[];
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

export function fpAplicable(e: Pick<Expediente, 'fpPersonalizado'>, p: Parametros): number {
  return e.fpPersonalizado !== undefined && Number.isFinite(e.fpPersonalizado) ? e.fpPersonalizado : p.fp;
}

export function comprobarVentana(v: Ventana, e: Expediente, p: Parametros): Aviso[] {
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

  if (e.zonaInvierno) {
    const max = p.permeabilidadMaxPorZona[e.zonaInvierno];
    if (nueva.clasePermeabilidad === 0) {
      avisos.push({ gravedad: 'aviso', mensaje: `Indica la clase de permeabilidad al aire (máx. ${max} m³/h·m² a 100 Pa en zona ${e.zonaInvierno}).` });
    } else if (p.permeabilidadPorClase[nueva.clasePermeabilidad] > max) {
      avisos.push({
        gravedad: 'error',
        mensaje: `Permeabilidad al aire insuficiente: la clase ${nueva.clasePermeabilidad} (≤ ${p.permeabilidadPorClase[nueva.clasePermeabilidad]} m³/h·m²) supera el máximo de ${max} m³/h·m² para la zona ${e.zonaInvierno}.`,
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

export function desglosarVentana(v: Ventana, e: Expediente, p: Parametros): DesgloseVentana {
  const g = obtenerG(p, e.zonaInvierno, e.zonaVerano);
  const fp = fpAplicable(e, p);
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
    avisos: comprobarVentana(v, e, p),
  };
}

export function comprobarExpediente(e: Expediente, p: Parametros, porcentaje: number | null): Aviso[] {
  const avisos: Aviso[] = [];
  if (!e.zonaInvierno || !e.zonaVerano) {
    avisos.push({ gravedad: 'error', mensaje: 'Indica la zona climática (invierno y verano) para obtener el coeficiente G.' });
  } else if (obtenerG(p, e.zonaInvierno, e.zonaVerano) === null) {
    avisos.push({
      gravedad: 'error',
      mensaje: `La zona ${e.zonaInvierno}${e.zonaVerano} no tiene valor de G en el Anexo II (ni en Ajustes).`,
    });
  }
  if (e.ubicacion === 'canarias') {
    avisos.push({ gravedad: 'error', mensaje: 'La ficha RES070 no aplica en Canarias: sólo Península, Illes Balears, Ceuta y Melilla.' });
  }
  if (!e.edificioExistente) avisos.push({ gravedad: 'error', mensaje: 'La ficha RES070 aplica únicamente a edificios existentes.' });
  if (!e.usoResidencialPrivado) avisos.push({ gravedad: 'error', mensaje: 'La ficha RES070 aplica únicamente a edificios de uso residencial privado.' });
  if (e.superficieEnvolventeM2 === undefined || e.superficieEnvolventeM2 <= 0) {
    avisos.push({ gravedad: 'aviso', mensaje: 'Indica la superficie total de la envolvente térmica final para comprobar el límite del 25 %.' });
  } else if (porcentaje !== null && porcentaje > p.umbralEnvolventePct) {
    avisos.push({
      gravedad: 'error',
      mensaje: `La superficie de huecos rehabilitados (${porcentaje.toFixed(2).replace('.', ',')} %) supera el ${p.umbralEnvolventePct} % de la envolvente térmica final.`,
    });
  }
  if (e.ventanas.length === 0) avisos.push({ gravedad: 'aviso', mensaje: 'Todavía no hay ventanas en el expediente.' });
  return avisos;
}

export function calcularExpediente(e: Expediente, p: Parametros): ResultadoExpediente {
  const ventanas = e.ventanas.map((v) => desglosarVentana(v, e, p));
  const fp = fpAplicable(e, p);
  const g = obtenerG(p, e.zonaInvierno, e.zonaVerano);
  const sumatorioBruto = ventanas.reduce((acc, d) => acc + (d.aeBruto ?? 0), 0);
  const aeTotal = fp * sumatorioBruto;
  const superficieHuecos = e.ventanas.reduce((acc, v) => acc + (superficieVentana(v) ?? 0), 0);
  const porcentajeEnvolvente =
    e.superficieEnvolventeM2 !== undefined && e.superficieEnvolventeM2 > 0 ? (superficieHuecos / e.superficieEnvolventeM2) * 100 : null;
  const multiplicadorDuracion = p.multiplicarPorDuracion && e.duracionAnios !== undefined && e.duracionAnios > 0 ? e.duracionAnios : 1;
  const cae = (aeTotal * multiplicadorDuracion) / p.kwhPorCae;
  const avisosExpediente = comprobarExpediente(e, p, porcentajeEnvolvente);
  const negativos = ventanas.filter((d) => d.forzadoACero).length;
  if (negativos > 0) {
    avisosExpediente.push({
      gravedad: 'aviso',
      mensaje: `${negativos} ventana${negativos > 1 ? 's tienen' : ' tiene'} ahorro negativo y se ${negativos > 1 ? 'computan' : 'computa'} como 0 kWh.`,
    });
  }
  const cumple = avisosExpediente.every((a) => a.gravedad !== 'error') && ventanas.every((d) => d.avisos.every((a) => a.gravedad !== 'error'));
  return {
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
    avisosExpediente,
    cumple,
  };
}
