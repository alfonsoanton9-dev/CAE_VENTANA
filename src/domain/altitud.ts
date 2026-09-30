import type { OrigenAltitud } from './tipos';

type Fetch = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

export interface ConsultaUbicacion {
  direccion: string;
  codigoPostal: string;
  municipio?: string;
  provincia?: string;
}

export interface ResultadoAltitud {
  altitudM: number;
  latitud: number;
  longitud: number;
  origen: Extract<OrigenAltitud, 'geocodificacion' | 'centro-cp'>;
  detalle: string;
}

export interface Punto {
  lat: number;
  lon: number;
  servicio: string;
  /** Precisión: dirección exacta o sólo centro del código postal. */
  precision: 'direccion' | 'centro-cp';
}

const TIEMPO_MAX_MS = 9000;

async function pedir(url: string, f: Fetch): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIEMPO_MAX_MS);
  try {
    const r = await f(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

/** El código postal del resultado debe caer en la misma provincia (2 primeros dígitos). */
function mismaProvincia(cpResultado: string | undefined, cp: string): boolean {
  if (!cpResultado) return true;
  return cpResultado.trim().slice(0, 2) === cp.trim().slice(0, 2);
}

export async function geocodificar(c: ConsultaUbicacion, f: Fetch): Promise<Punto | undefined> {
  const cp = c.codigoPostal.trim();
  const consulta = [c.direccion, cp, c.municipio, c.provincia, 'España'].filter((x) => x && x.trim()).join(', ');

  const intentos: Array<() => Promise<Punto | undefined>> = [];

  if (c.direccion.trim()) {
    intentos.push(async () => {
      const j = await pedir(`https://photon.komoot.io/api/?limit=3&q=${encodeURIComponent(consulta)}`, f);
      for (const ft of j?.features ?? []) {
        const p = ft.properties ?? {};
        const [lon, lat] = ft.geometry?.coordinates ?? [];
        if (p.countrycode !== 'ES' || typeof lat !== 'number' || !mismaProvincia(p.postcode, cp)) continue;
        return { lat, lon, servicio: 'Photon (OpenStreetMap)', precision: 'direccion' };
      }
      return undefined;
    });
    intentos.push(async () => {
      const j = await pedir(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&addressdetails=1&countrycodes=es&q=${encodeURIComponent(consulta)}`,
        f,
      );
      for (const r of Array.isArray(j) ? j : []) {
        if (!mismaProvincia(r.address?.postcode, cp)) continue;
        const lat = Number(r.lat);
        const lon = Number(r.lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon, servicio: 'Nominatim (OpenStreetMap)', precision: 'direccion' };
      }
      return undefined;
    });
  }

  intentos.push(async () => {
    const j = await pedir(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=es&postalcode=${encodeURIComponent(cp)}&country=Spain`,
      f,
    );
    const r = Array.isArray(j) ? j[0] : undefined;
    const lat = Number(r?.lat);
    const lon = Number(r?.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon, servicio: 'Nominatim (OpenStreetMap)', precision: 'centro-cp' } : undefined;
  });

  for (const intento of intentos) {
    try {
      const r = await intento();
      if (r) return r;
    } catch {
      // Se prueba el siguiente servicio.
    }
  }
  return undefined;
}

export async function obtenerElevacion(lat: number, lon: number, f: Fetch): Promise<{ altitudM: number; servicio: string } | undefined> {
  const servicios: Array<[string, () => Promise<number | undefined>]> = [
    [
      'Open-Meteo (Copernicus DEM 90 m)',
      async () => (await pedir(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`, f))?.elevation?.[0],
    ],
    [
      'OpenTopoData (EU-DEM 25 m)',
      async () => (await pedir(`https://api.opentopodata.org/v1/eudem25m?locations=${lat},${lon}`, f))?.results?.[0]?.elevation,
    ],
    [
      'Open-Elevation (SRTM)',
      async () => (await pedir(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`, f))?.results?.[0]?.elevation,
    ],
  ];
  for (const [servicio, fn] of servicios) {
    try {
      const h = await fn();
      if (typeof h === 'number' && Number.isFinite(h)) return { altitudM: Math.round(h), servicio };
    } catch {
      // Se prueba el siguiente servicio.
    }
  }
  return undefined;
}

/**
 * Deduce la altitud a partir de la dirección y el código postal:
 * geocodificación (servicio público sin clave) + modelo digital de elevaciones.
 * Devuelve `undefined` si no hay forma fiable; el llamador decide el respaldo (altitud de la capital).
 */
export async function buscarAltitud(c: ConsultaUbicacion, f: Fetch = (fetch as unknown) as Fetch): Promise<ResultadoAltitud | undefined> {
  const punto = await geocodificar(c, f);
  if (!punto) return undefined;
  const elev = await obtenerElevacion(punto.lat, punto.lon, f);
  if (!elev) return undefined;
  const lugar = punto.precision === 'direccion' ? 'dirección' : 'centro del código postal';
  return {
    altitudM: elev.altitudM,
    latitud: punto.lat,
    longitud: punto.lon,
    origen: punto.precision === 'direccion' ? 'geocodificacion' : 'centro-cp',
    detalle: `${elev.altitudM} m (${elev.servicio}) en ${punto.lat.toFixed(5)}, ${punto.lon.toFixed(5)} · ${lugar} geocodificada con ${punto.servicio}`,
  };
}
