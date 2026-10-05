import { describe, expect, it } from 'vitest';
import { obtenerG, parametrosPorDefecto } from '../src/domain/parametros';
import { ZONAS_INVIERNO, ZONAS_VERANO } from '../src/domain/tipos';
import { ANEJO_B } from '../src/domain/datos/anejoB';
import {
  normalizarTablaZonas,
  parsearZona,
  provinciaDesdeCodigoPostal,
  tablaZonasOficial,
  validarTramos,
  zonaPorAltitud,
} from '../src/domain/zonasClimaticas';
import { normalizarActuacion, normalizarExpediente } from '../src/domain/fabrica';
import { normalizarParametros, VERSION_PARAMETROS } from '../src/domain/parametros';

const tabla = tablaZonasOficial();

describe('Provincia desde código postal', () => {
  it('47001 → Valladolid (47)', () => {
    const r = provinciaDesdeCodigoPostal('47001', tabla);
    expect(r?.codigo).toBe('47');
    expect(r?.provincia.nombre).toBe('Valladolid');
  });

  it('rechaza CP inválidos', () => {
    expect(provinciaDesdeCodigoPostal('4700', tabla)).toBeUndefined();
    expect(provinciaDesdeCodigoPostal('', tabla)).toBeUndefined();
  });
});

describe('Zona por altitud (tabla a-Anejo B)', () => {
  it('Madrid: umbrales 500, 950, 1000', () => {
    expect(zonaPorAltitud(tabla, '28', 500)?.zona.texto).toBe('C3');
    expect(zonaPorAltitud(tabla, '28', 501)?.zona.texto).toBe('D3');
    expect(zonaPorAltitud(tabla, '28', 950)?.zona.texto).toBe('D3');
    expect(zonaPorAltitud(tabla, '28', 1000)?.zona.texto).toBe('D2');
    expect(zonaPorAltitud(tabla, '28', 1001)?.zona.texto).toBe('E1');
  });

  it('Valladolid h0 704 m → D2', () => {
    expect(zonaPorAltitud(tabla, '47', 704)?.zona.texto).toBe('D2');
  });

  it('Ceuta → B3 y Melilla → A3 (CTE en todas las versiones consultadas)', () => {
    expect(zonaPorAltitud(tabla, '51', 0)?.zona.texto).toBe('B3');
    expect(zonaPorAltitud(tabla, '52', 200)?.zona.texto).toBe('A3');
    expect(obtenerG(parametrosPorDefecto(), 'B', 3)).toBe(32);
    expect(obtenerG(parametrosPorDefecto(), 'A', 3)).toBe(25);
  });
});

describe('parsearZona y validarTramos', () => {
  it('acepta α3 como fuera de ficha', () => {
    const z = parsearZona('α3');
    expect(z?.texto).toBe('α3');
    expect(z?.fueraDeFicha).toBe(true);
  });

  it('validarTramos exige último tramo sin límite', () => {
    expect(validarTramos([{ hasta: 100, zona: 'C3' }])).toMatch(/último tramo/);
    expect(validarTramos([{ hasta: null, zona: 'D3' }])).toBeUndefined();
  });

  it('normalizarTablaZonas conserva 52 provincias', () => {
    expect(Object.keys(normalizarTablaZonas(undefined))).toHaveLength(52);
  });
});

describe('Anexo II: zonas de la tabla peninsular tienen G', () => {
  it('cada zona A–E / 1–4 de la tabla (salvo Canarias) tiene G', () => {
    const p = parametrosPorDefecto();
    const vistos = new Set<string>();
    for (const [codigo, , , , tramos] of ANEJO_B) {
      if (codigo === '35' || codigo === '38') continue;
      for (const [, zona] of tramos) {
        const z = parsearZona(zona);
        if (!z || z.fueraDeFicha || !z.invierno || !z.verano || vistos.has(z.texto)) continue;
        vistos.add(z.texto);
        expect(obtenerG(p, z.invierno, z.verano)).not.toBeNull();
      }
    }
    expect(vistos.size).toBeGreaterThan(10);
  });
});

describe('Migración de parámetros y expedientes', () => {
  it('v1 sin ignorar negativos migra a true por defecto', () => {
    const p = normalizarParametros({ version: 1, ignorarAhorrosNegativos: false });
    expect(p.version).toBe(VERSION_PARAMETROS);
    expect(p.ignorarAhorrosNegativos).toBe(true);
  });

  it('v2 respeta ignorarAhorrosNegativos explícito', () => {
    expect(normalizarParametros({ version: 2, ignorarAhorrosNegativos: false }).ignorarAhorrosNegativos).toBe(false);
  });

  it('normalizarActuacion añade origenClima', () => {
    const a = normalizarActuacion({
      id: '1',
      etiqueta: 'X',
      zonaInvierno: 'C',
      zonaVerano: 3,
      ventanas: [],
      creadoEn: '',
      actualizadoEn: '',
    } as any);
    expect(a.origenClima.zona).toBe('manual');
    expect(a.provinciaCodigo).toBe('');
  });

  it('normalizarExpediente rellena sujeto y actuaciones', () => {
    const e = normalizarExpediente({
      id: '1',
      referencia: 'X',
      creadoEn: '',
      actualizadoEn: '',
    } as any);
    expect(e.sujeto.tipo).toBe('obligado');
    expect(e.actuaciones).toEqual([]);
  });
});
