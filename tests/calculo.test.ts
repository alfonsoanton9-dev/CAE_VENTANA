import { describe, expect, it } from 'vitest';
import { ahorroVentana, calcularActuacion, calcularExpediente, comprobarVentana, desglosarVentana } from '../src/domain/calculo';
import { borradorActuacionVacio, borradorExpedienteVacio, duplicarVentana, nuevaActuacion, nuevoExpediente, ventanaVacia } from '../src/domain/fabrica';
import { fechaAIso, isoAFecha, parsearNumero } from '../src/domain/formato';
import { normalizarParametros, obtenerG, parametrosPorDefecto } from '../src/domain/parametros';
import type { Actuacion, Expediente, Ventana, ZonaInvierno, ZonaVerano } from '../src/domain/tipos';

/** Valores literales del Anexo II de la ficha RES070 (miles de horas·K/año). */
const ANEXO_II: Array<[ZonaInvierno, ZonaVerano, number | null]> = [
  ['A', 1, null], ['B', 1, null], ['C', 1, 44], ['D', 1, 60], ['E', 1, 74],
  ['A', 2, null], ['B', 2, null], ['C', 2, 45], ['D', 2, 60], ['E', 2, null],
  ['A', 3, 25], ['B', 3, 32], ['C', 3, 46], ['D', 3, 61], ['E', 3, null],
  ['A', 4, 26], ['B', 4, 33], ['C', 4, 46], ['D', 4, null], ['E', 4, null],
];

function ventana(uhi: number, uhf: number, s: number, extra: Partial<Ventana> = {}): Ventana {
  const v = ventanaVacia();
  v.superficieM2 = s;
  v.anterior.transmitancia = uhi;
  v.nueva.transmitancia = uhf;
  v.nueva.clasePermeabilidad = 3;
  v.nueva.marcadoCE = true;
  return { ...v, ...extra };
}

function actuacion(zci: ZonaInvierno, zcv: ZonaVerano, ventanas: Ventana[], extra: Partial<Actuacion> = {}): Actuacion {
  return {
    ...nuevaActuacion({ ...borradorActuacionVacio(), zonaInvierno: zci, zonaVerano: zcv, superficieEnvolventeM2: 500 }),
    ventanas,
    ...extra,
  };
}

function expediente(zci: ZonaInvierno, zcv: ZonaVerano, ventanas: Ventana[], extraAct: Partial<Actuacion> = {}): Expediente {
  const a = actuacion(zci, zcv, ventanas, extraAct);
  return { ...nuevoExpediente(borradorExpedienteVacio()), actuaciones: [a] };
}

describe('Parámetros oficiales (Anexo II)', () => {
  it.each(ANEXO_II)('G[%s%s] = %s', (zci, zcv, esperado) => {
    expect(obtenerG(parametrosPorDefecto(), zci, zcv)).toBe(esperado);
  });

  it('Fp por defecto = 1 y límites de la ficha', () => {
    const p = parametrosPorDefecto();
    expect(p.fp).toBe(1);
    expect(p.umbralEnvolventePct).toBe(25);
    expect(p.permeabilidadMaxPorZona).toEqual({ A: 27, B: 27, C: 9, D: 9, E: 9 });
    expect(p.roturaPuenteTermicoMinMm).toBe(16);
    expect(p.claseMinCajonPersiana).toBe(4);
    expect(p.transmitanciaMaxCajon).toBe(1.5);
    expect(p.kwhPorCae).toBe(1);
  });

  it('normalizarParametros rellena con valores por defecto y respeta los personalizados', () => {
    expect(normalizarParametros(undefined)).toEqual(parametrosPorDefecto());
    const p = normalizarParametros({ fp: 0.9, g: { C: { 3: 50 } } });
    expect(p.fp).toBe(0.9);
    expect(p.g.C[3]).toBe(50);
    expect(p.g.D[3]).toBe(61);
  });
});

describe('Fórmula AE = Fp · Σ (Uhi − Uhf) · S · G', () => {
  it('ventana única: (5,7 − 1,4) · 2 · 46 = 395,6 kWh/año (zona C3)', () => {
    expect(ahorroVentana(5.7, 1.4, 2, 46)).toBeCloseTo(395.6, 6);
    const r = calcularActuacion(actuacion('C', 3, [ventana(5.7, 1.4, 2)]), parametrosPorDefecto());
    expect(r.aeTotal).toBeCloseTo(395.6, 6);
    expect(r.cae).toBeCloseTo(395.6, 6);
  });

  it('resultado por zona: (3 − 1) · 1 · G devuelve el propio G en kWh', () => {
    for (const [zci, zcv, g] of ANEXO_II.filter((x) => x[2] !== null)) {
      const r = calcularActuacion(actuacion(zci, zcv, [ventana(3, 1, 1)]), parametrosPorDefecto());
      expect(r.aeTotal).toBeCloseTo(2 * (g as number), 9);
    }
  });

  it('suma varias ventanas y aplica Fp fuera del sumatorio', () => {
    const p = { ...parametrosPorDefecto(), fp: 0.8 };
    const a = actuacion('D', 3, [ventana(5.7, 1.4, 2), ventana(3.3, 1.2, 1.5)]);
    const r = calcularActuacion(a, p);
    const bruto = (5.7 - 1.4) * 2 * 61 + (3.3 - 1.2) * 1.5 * 61;
    expect(r.sumatorioBruto).toBeCloseTo(bruto, 6);
    expect(r.aeTotal).toBeCloseTo(0.8 * bruto, 6);
    expect(r.ventanas[0].ae).toBeCloseTo(0.8 * (5.7 - 1.4) * 2 * 61, 6);
  });

  it('las unidades multiplican la superficie', () => {
    const r = calcularActuacion(actuacion('E', 1, [ventana(4, 1.5, 1.2, { unidades: 3 })]), parametrosPorDefecto());
    expect(r.superficieHuecos).toBeCloseTo(3.6, 9);
    expect(r.aeTotal).toBeCloseTo(2.5 * 3.6 * 74, 6);
  });

  it('Fp personalizado de la actuación prevalece sobre ajustes', () => {
    const a = actuacion('C', 3, [ventana(4, 2, 1)], { fpPersonalizado: 0.5 });
    expect(calcularActuacion(a, parametrosPorDefecto()).aeTotal).toBeCloseTo(0.5 * 2 * 46, 9);
  });

  it('parámetros modificados en ajustes cambian el resultado', () => {
    const p = parametrosPorDefecto();
    p.g.C[3] = 50;
    expect(calcularActuacion(actuacion('C', 3, [ventana(4, 2, 1)]), p).aeTotal).toBeCloseTo(100, 9);
  });

  it('CAE = ahorro / kWh por CAE, y Di sólo multiplica si se activa', () => {
    const a = actuacion('C', 3, [ventana(4, 2, 1)], { duracionAnios: 20 });
    const p = parametrosPorDefecto();
    expect(calcularActuacion(a, p).cae).toBeCloseTo(92, 9);
    expect(calcularActuacion(a, { ...p, multiplicarPorDuracion: true }).cae).toBeCloseTo(1840, 9);
    expect(calcularActuacion(a, { ...p, kwhPorCae: 2 }).cae).toBeCloseTo(46, 9);
  });

  it('zona sin G (E3) no calcula y avisa', () => {
    const r = calcularActuacion(actuacion('E', 3, [ventana(4, 2, 1)]), parametrosPorDefecto());
    expect(r.aeTotal).toBe(0);
    expect(r.ventanas[0].completa).toBe(false);
    expect(r.avisos.some((a) => a.gravedad === 'error')).toBe(true);
    expect(r.cumple).toBe(false);
  });

  it('ventanas incompletas no computan', () => {
    const v = ventanaVacia();
    v.superficieM2 = 2;
    const r = calcularActuacion(actuacion('C', 3, [v]), parametrosPorDefecto());
    expect(r.ventanasCalculadas).toBe(0);
    expect(r.aeTotal).toBe(0);
  });

  it('ahorro negativo: por defecto se fuerza a 0 con aviso; si se desactiva, resta', () => {
    const a = actuacion('C', 3, [ventana(2, 3, 1)]);
    const pDef = parametrosPorDefecto();
    expect(pDef.ignorarAhorrosNegativos).toBe(true);
    expect(calcularActuacion(a, pDef).aeTotal).toBe(0);
    expect(desglosarVentana(a.ventanas[0], a, pDef).forzadoACero).toBe(true);
    expect(calcularActuacion(a, { ...pDef, ignorarAhorrosNegativos: false }).aeTotal).toBeCloseTo(-46, 9);
  });

  it('Di no interviene por defecto (multiplicarPorDuracion desactivado)', () => {
    const a = actuacion('C', 3, [ventana(5.7, 1.4, 2)], { duracionAnios: 10 });
    const r = calcularActuacion(a, parametrosPorDefecto());
    expect(r.multiplicadorDuracion).toBe(1);
    expect(r.cae).toBeCloseTo(r.aeTotal, 9);
  });

  it('el expediente suma el CAE de varias actuaciones', () => {
    const e = expediente('D', 3, [ventana(5.7, 1.4, 2.1)]);
    const a2 = actuacion('D', 3, [ventana(4, 1.5, 1)]);
    e.actuaciones.push(a2);
    const r = calcularExpediente(e, parametrosPorDefecto());
    const r1 = calcularActuacion(e.actuaciones[0], parametrosPorDefecto());
    const r2 = calcularActuacion(a2, parametrosPorDefecto());
    expect(r.aeTotal).toBeCloseTo(r1.aeTotal + r2.aeTotal, 6);
    expect(r.cae).toBeCloseTo(r1.cae + r2.cae, 6);
    expect(r.ventanasTotales).toBe(2);
  });
});

describe('Requisitos de la ficha', () => {
  const p = parametrosPorDefecto();

  it('límite del 25 % de la envolvente', () => {
    const ok = calcularActuacion(actuacion('C', 3, [ventana(4, 2, 125)], { superficieEnvolventeM2: 500 }), p);
    expect(ok.porcentajeEnvolvente).toBeCloseTo(25, 9);
    expect(ok.cumple).toBe(true);
    const ko = calcularActuacion(actuacion('C', 3, [ventana(4, 2, 126)], { superficieEnvolventeM2: 500 }), p);
    expect(ko.cumple).toBe(false);
  });

  it('permeabilidad: clase 3 vale en C/D/E; clase 2 sólo en A/B', () => {
    const v2 = ventana(4, 2, 1);
    v2.nueva.clasePermeabilidad = 2;
    const enA = actuacion('A', 3, [v2]);
    const enC = actuacion('C', 3, [v2]);
    expect(comprobarVentana(v2, enA, p).some((a) => a.mensaje.includes('Permeabilidad'))).toBe(false);
    expect(comprobarVentana(v2, enC, p).some((a) => a.mensaje.includes('Permeabilidad'))).toBe(true);
  });

  it('marco metálico exige rotura de puente térmico ≥ 16 mm', () => {
    const v = ventana(4, 2, 1);
    v.nueva.materialMarco = 'aluminio';
    v.nueva.roturaPuenteTermicoMm = 15;
    const a = actuacion('C', 3, [v]);
    expect(comprobarVentana(v, a, p).some((x) => x.mensaje.includes('rotura'))).toBe(true);
    v.nueva.roturaPuenteTermicoMm = 16;
    expect(comprobarVentana(v, a, p).some((x) => x.mensaje.includes('rotura'))).toBe(false);
  });

  it('cajón de persiana: clase 4 y U < 1,5', () => {
    const v = ventana(4, 2, 1);
    v.nueva.tienePersiana = true;
    v.nueva.claseCajonPersiana = 3;
    v.nueva.transmitanciaCajon = 1.5;
    const a = actuacion('C', 3, [v]);
    expect(comprobarVentana(v, a, p).filter((x) => x.mensaje.includes('cajón')).length).toBe(2);
    v.nueva.claseCajonPersiana = 4;
    v.nueva.transmitanciaCajon = 1.4;
    expect(comprobarVentana(v, a, p).filter((x) => x.mensaje.includes('cajón')).length).toBe(0);
  });

  it('ventana correcta no tiene errores', () => {
    const a = actuacion('C', 3, [ventana(5.7, 1.4, 2)]);
    expect(desglosarVentana(a.ventanas[0], a, p).avisos).toEqual([]);
  });
});

describe('Utilidades', () => {
  it('duplicar ventana crea id nuevo y copia profunda', () => {
    const v = ventana(4, 2, 1);
    const d = duplicarVentana(v);
    expect(d.id).not.toBe(v.id);
    d.anterior.transmitancia = 9;
    expect(v.anterior.transmitancia).toBe(4);
  });

  it('parseo de números y fechas', () => {
    expect(parsearNumero('1,45')).toBe(1.45);
    expect(parsearNumero(' 2.5 ')).toBe(2.5);
    expect(parsearNumero('')).toBeUndefined();
    expect(parsearNumero('abc')).toBeUndefined();
    expect(fechaAIso('05/03/2025')).toBe('2025-03-05');
    expect(fechaAIso('31/02/2025')).toBeUndefined();
    expect(isoAFecha('2025-03-05')).toBe('05/03/2025');
  });
});
