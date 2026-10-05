import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  crearExpedienteTutorial,
  duplicarActuacion as clonarActuacion,
  duplicarExpediente as clonarExpediente,
  duplicarVentana as clonarVentana,
  normalizarExpediente,
  nuevaActuacion,
  nuevoExpediente,
} from '@/domain/fabrica';
import { normalizarParametros, parametrosPorDefecto, type Parametros } from '@/domain/parametros';
import type { Actuacion, ActuacionBorrador, Expediente, ExpedienteBorrador, UsuarioPerfil, Ventana } from '@/domain/tipos';
import { normalizarPerfilUsuario, perfilUsuarioTutorial } from '@/domain/usuario';

const CLAVE_EXPEDIENTES = 'cae-ventana:expedientes:v2';
const CLAVE_EXPEDIENTES_LEGACY = 'cae-ventana:expedientes:v1';
const CLAVE_AJUSTES = 'cae-ventana:ajustes:v1';
const CLAVE_USUARIO = 'cae-ventana:usuario:v1';

interface Almacen {
  cargado: boolean;
  expedientes: Expediente[];
  parametros: Parametros;
  usuario: UsuarioPerfil;
  obtenerExpediente: (id: string) => Expediente | undefined;
  obtenerActuacion: (expedienteId: string, actuacionId: string) => Actuacion | undefined;
  crearExpediente: (borrador: ExpedienteBorrador) => Expediente;
  actualizarExpediente: (id: string, cambios: ExpedienteBorrador) => void;
  duplicarExpediente: (id: string) => string | undefined;
  eliminarExpediente: (id: string) => void;
  crearActuacion: (expedienteId: string, borrador: ActuacionBorrador) => Actuacion | undefined;
  actualizarActuacion: (expedienteId: string, actuacionId: string, cambios: ActuacionBorrador) => void;
  duplicarActuacion: (expedienteId: string, actuacionId: string) => string | undefined;
  eliminarActuacion: (expedienteId: string, actuacionId: string) => void;
  guardarVentana: (expedienteId: string, actuacionId: string, ventana: Ventana) => void;
  duplicarVentana: (expedienteId: string, actuacionId: string, ventanaId: string) => void;
  eliminarVentana: (expedienteId: string, actuacionId: string, ventanaId: string) => void;
  guardarParametros: (p: Parametros) => void;
  restaurarParametros: () => void;
  guardarUsuario: (u: UsuarioPerfil) => void;
  restaurarTutorial: () => void;
}

const Contexto = createContext<Almacen | null>(null);

export function AlmacenProvider({ children }: { children: React.ReactNode }) {
  const [cargado, setCargado] = useState(false);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [parametros, setParametros] = useState<Parametros>(parametrosPorDefecto());
  const [usuario, setUsuario] = useState<UsuarioPerfil>(perfilUsuarioTutorial());
  const expedientesRef = useRef<Expediente[]>([]);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.removeItem(CLAVE_EXPEDIENTES_LEGACY);
        const [rawExp, rawAjustes, rawUsuario] = await Promise.all([
          AsyncStorage.getItem(CLAVE_EXPEDIENTES),
          AsyncStorage.getItem(CLAVE_AJUSTES),
          AsyncStorage.getItem(CLAVE_USUARIO),
        ]);
        if (rawExp === null) {
          const tutorial = crearExpedienteTutorial();
          expedientesRef.current = [tutorial];
          setExpedientes([tutorial]);
          await AsyncStorage.setItem(CLAVE_EXPEDIENTES, JSON.stringify([tutorial]));
        } else {
          const lista = JSON.parse(rawExp);
          if (Array.isArray(lista)) {
            const normalizada = lista.filter((x) => x && Array.isArray(x.actuaciones)).map(normalizarExpediente);
            expedientesRef.current = normalizada;
            setExpedientes(normalizada);
          }
        }
        if (rawAjustes) setParametros(normalizarParametros(JSON.parse(rawAjustes)));
        if (rawUsuario === null) {
          const tutorial = perfilUsuarioTutorial();
          setUsuario(tutorial);
          await AsyncStorage.setItem(CLAVE_USUARIO, JSON.stringify(tutorial));
        } else {
          setUsuario(normalizarPerfilUsuario(JSON.parse(rawUsuario)));
        }
      } catch {
        const tutorial = crearExpedienteTutorial();
        expedientesRef.current = [tutorial];
        setExpedientes([tutorial]);
        setUsuario(perfilUsuarioTutorial());
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

  const modificarActuacion = useCallback(
    (expedienteId: string, actuacionId: string, fn: (a: Actuacion) => Actuacion) => {
      modificar(expedienteId, (e) => ({
        ...e,
        actuaciones: e.actuaciones.map((a) => (a.id === actuacionId ? { ...fn(a), actualizadoEn: new Date().toISOString() } : a)),
      }));
    },
    [modificar],
  );

  const valor = useMemo<Almacen>(
    () => ({
      cargado,
      expedientes,
      parametros,
      usuario,
      obtenerExpediente: (id) => expedientes.find((e) => e.id === id),
      obtenerActuacion: (expedienteId, actuacionId) =>
        expedientes.find((e) => e.id === expedienteId)?.actuaciones.find((a) => a.id === actuacionId),
      crearExpediente: (borrador) => {
        const e = nuevoExpediente(borrador);
        escribirExpedientes([e, ...expedientesRef.current]);
        return e;
      },
      actualizarExpediente: (id, cambios) => modificar(id, (e) => ({ ...e, ...cambios })),
      duplicarExpediente: (id) => {
        const origen = expedientesRef.current.find((e) => e.id === id);
        if (!origen) return undefined;
        const copia = clonarExpediente(origen);
        escribirExpedientes([copia, ...expedientesRef.current]);
        return copia.id;
      },
      eliminarExpediente: (id) => escribirExpedientes(expedientesRef.current.filter((e) => e.id !== id)),
      crearActuacion: (expedienteId, borrador) => {
        const a = nuevaActuacion(borrador);
        let creada: Actuacion | undefined;
        modificar(expedienteId, (e) => {
          creada = a;
          return { ...e, actuaciones: [a, ...e.actuaciones] };
        });
        return creada;
      },
      actualizarActuacion: (expedienteId, actuacionId, cambios) =>
        modificarActuacion(expedienteId, actuacionId, (a) => ({ ...a, ...cambios })),
      duplicarActuacion: (expedienteId, actuacionId) => {
        const origen = expedientesRef.current.find((e) => e.id === expedienteId)?.actuaciones.find((a) => a.id === actuacionId);
        if (!origen) return undefined;
        const copia = clonarActuacion(origen);
        modificar(expedienteId, (e) => {
          const i = e.actuaciones.findIndex((a) => a.id === actuacionId);
          const actuaciones = [...e.actuaciones];
          actuaciones.splice(i + 1, 0, copia);
          return { ...e, actuaciones };
        });
        return copia.id;
      },
      eliminarActuacion: (expedienteId, actuacionId) =>
        modificar(expedienteId, (e) => ({ ...e, actuaciones: e.actuaciones.filter((a) => a.id !== actuacionId) })),
      guardarVentana: (expedienteId, actuacionId, ventana) =>
        modificarActuacion(expedienteId, actuacionId, (a) => {
          const existe = a.ventanas.some((v) => v.id === ventana.id);
          return { ...a, ventanas: existe ? a.ventanas.map((v) => (v.id === ventana.id ? ventana : v)) : [...a.ventanas, ventana] };
        }),
      duplicarVentana: (expedienteId, actuacionId, ventanaId) =>
        modificarActuacion(expedienteId, actuacionId, (a) => {
          const i = a.ventanas.findIndex((v) => v.id === ventanaId);
          if (i < 0) return a;
          const copia = clonarVentana(a.ventanas[i]);
          const ventanas = [...a.ventanas];
          ventanas.splice(i + 1, 0, copia);
          return { ...a, ventanas };
        }),
      eliminarVentana: (expedienteId, actuacionId, ventanaId) =>
        modificarActuacion(expedienteId, actuacionId, (a) => ({ ...a, ventanas: a.ventanas.filter((v) => v.id !== ventanaId) })),
      guardarParametros: (p) => {
        setParametros(p);
        AsyncStorage.setItem(CLAVE_AJUSTES, JSON.stringify(p)).catch(() => {});
      },
      restaurarParametros: () => {
        const p = parametrosPorDefecto();
        setParametros(p);
        AsyncStorage.removeItem(CLAVE_AJUSTES).catch(() => {});
      },
      guardarUsuario: (u) => {
        const siguiente = { ...u, actualizadoEn: new Date().toISOString() };
        setUsuario(siguiente);
        AsyncStorage.setItem(CLAVE_USUARIO, JSON.stringify(siguiente)).catch(() => {});
      },
      restaurarTutorial: () => {
        const tutorial = crearExpedienteTutorial();
        escribirExpedientes([tutorial, ...expedientesRef.current.filter((e) => !e.referencia.startsWith('CAE-TUTORIAL'))]);
      },
    }),
    [cargado, expedientes, parametros, usuario, escribirExpedientes, modificar, modificarActuacion],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAlmacen(): Almacen {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAlmacen debe usarse dentro de AlmacenProvider');
  return ctx;
}
