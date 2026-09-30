import { describe, expect, it, vi } from 'vitest';
import { buscarAltitud } from '../src/domain/altitud';
import { deducirAltitud } from '../src/domain/clima';
import { tablaZonasOficial } from '../src/domain/zonasClimaticas';

const tabla = tablaZonasOficial();

function mockFetch(rutas: Array<{ match: RegExp; json: unknown }>) {
  return vi.fn(async (url: string) => {
    for (const r of rutas) {
      if (r.match.test(url)) return { ok: true, status: 200, json: async () => r.json };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  });
}

describe('buscarAltitud', () => {
  it('geocodifica y consulta elevación', async () => {
    const f = mockFetch([
      {
        match: /photon/,
        json: { features: [{ geometry: { coordinates: [-3.7, 40.4] }, properties: { countrycode: 'ES', postcode: '28001' } }] },
      },
      { match: /open-meteo/, json: { elevation: [650] } },
    ]);
    const r = await buscarAltitud({ direccion: 'Gran Vía 1', codigoPostal: '28001', provincia: 'Madrid' }, f);
    expect(r?.altitudM).toBe(650);
    expect(r?.origen).toBe('geocodificacion');
  });

  it('respaldo a capital si fallan los servicios', async () => {
    const f = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    const r = await deducirAltitud({ direccion: 'Calle X', codigoPostal: '47001', municipio: 'Valladolid' }, tabla, f);
    expect(r?.origen).toBe('capital');
    expect(r?.altitudM).toBe(tabla['47'].altitudReferenciaM);
    expect(r?.aviso).toMatch(/sin conexión|geocodificar/i);
  });
});
