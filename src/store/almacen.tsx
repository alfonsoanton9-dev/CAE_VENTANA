import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { duplicarExpediente, duplicarVentana, normalizarExpediente, nuevoExpediente } from '@/domain/fabrica';
import { normalizarParametros, parametrosPorDefecto, type Parametros } from '@/domain/parametros';
import type { Expediente, ExpedienteBorrador, Ventana } from '@/domain/tipos';

const CLAVE_EXPEDIENTES = 'cae-ventana:expedientes:v1';
const CLAVE_AJUSTES = 'cae-ventana:ajustes:v1';

interface Almacen {
  cargado: boolean;
  expedientes: Expediente[];
  parametros: Parametros;
  obtenerExpediente: (id: string) => Expediente | undefined;
  crearExpediente: (borrador: ExpedienteBorrador) => Expediente;
  actualizarExpediente: (id: string, cambios: ExpedienteBorrador) => void;
  duplicarExpediente: (id: string) => string | undefined;
  eliminarExpediente: (id: string) => void;
  guardarVentana: (expedienteId: string, ventana: Ventana) => void;
  duplicarVentana: (expedienteId: string, ventanaId: string) => void;
  eliminarVentana: (expedienteId: string, ventanaId: string) => void;
  guardarParametros: (p: Parametros) => void;
  restaurarParametros: () => void;
}

const Contexto = createContext<Almacen | null>(null);

export function AlmacenProvider({ children }: { children: React.ReactNode }) {
  const [cargado, setCargado] = useState(false);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [parametros, setParametros] = useState<Parametros>(parametrosPorDefecto());
  const expedientesRef = useRef<Expediente[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [rawExp, rawAjustes] = await Promise.all([AsyncStorage.getItem(CLAVE_EXPEDIENTES), AsyncStorage.getItem(CLAVE_AJUSTES)]);
        if (rawExp) {
          const lista = JSON.parse(rawExp);
          if (Array.isArray(lista)) {
            const normalizada = lista.map(normalizarExpediente);
            expedientesRef.current = normalizada;
            setExpedientes(normalizada);
          }
        }
        if (rawAjustes) setParametros(normalizarParametros(JSON.parse(rawAjustes)));
      } catch {
        // Datos corruptos: se arranca con el estado vacío.
      } finally {
        setCargado(true);
      }
    })();
  }, []);

  const escribirExpedientes = useCallback((siguiente: Expediente[]) => {
    expedientesRef.current = siguiente;
    setExpedientes(siguiente);
    AsyncStorage.setItem(CLAVE_EXPEDIENTES, JSON.stringify(siguiente)).catch(() => {});
  }, []);

  const modificar = useCallback(
    (id: string, fn: (e: Expediente) => Expediente) => {
      escribirExpedientes(
        expedientesRef.current.map((e) => (e.id === id ? { ...fn(e), actualizadoEn: new Date().toISOString() } : e)),
      );
    },
    [escribirExpedientes],
  );

  const valor = useMemo<Almacen>(
    () => ({
      cargado,
      expedientes,
      parametros,
      obtenerExpediente: (id) => expedientes.find((e) => e.id === id),
      crearExpediente: (borrador) => {
        const e = nuevoExpediente(borrador);
        escribirExpedientes([e, ...expedientesRef.current]);
        return e;
      },
      actualizarExpediente: (id, cambios) => modificar(id, (e) => ({ ...e, ...cambios })),
      duplicarExpediente: (id) => {
        const origen = expedientesRef.current.find((e) => e.id === id);
        if (!origen) return undefined;
        const copia = duplicarExpediente(origen);
        escribirExpedientes([copia, ...expedientesRef.current]);
        return copia.id;
      },
      eliminarExpediente: (id) => escribirExpedientes(expedientesRef.current.filter((e) => e.id !== id)),
      guardarVentana: (expedienteId, ventana) =>
        modificar(expedienteId, (e) => {
          const existe = e.ventanas.some((v) => v.id === ventana.id);
          return { ...e, ventanas: existe ? e.ventanas.map((v) => (v.id === ventana.id ? ventana : v)) : [...e.ventanas, ventana] };
        }),
      duplicarVentana: (expedienteId, ventanaId) =>
        modificar(expedienteId, (e) => {
          const i = e.ventanas.findIndex((v) => v.id === ventanaId);
          if (i < 0) return e;
          const copia = duplicarVentana(e.ventanas[i]);
          const ventanas = [...e.ventanas];
          ventanas.splice(i + 1, 0, copia);
          return { ...e, ventanas };
        }),
      eliminarVentana: (expedienteId, ventanaId) =>
        modificar(expedienteId, (e) => ({ ...e, ventanas: e.ventanas.filter((v) => v.id !== ventanaId) })),
      guardarParametros: (p) => {
        setParametros(p);
        AsyncStorage.setItem(CLAVE_AJUSTES, JSON.stringify(p)).catch(() => {});
      },
      restaurarParametros: () => {
        const p = parametrosPorDefecto();
        setParametros(p);
        AsyncStorage.removeItem(CLAVE_AJUSTES).catch(() => {});
      },
    }),
    [cargado, expedientes, parametros, escribirExpedientes, modificar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAlmacen(): Almacen {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAlmacen debe usarse dentro de AlmacenProvider');
  return ctx;
}
