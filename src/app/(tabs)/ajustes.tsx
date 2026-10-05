import { CTE_TRANSMITANCIA_VENTANAS } from '@/domain/cteTransmitancia';
import { normalizarParametros, parametrosPorDefecto, type Parametros } from '@/domain/parametros';
import { ZONAS_INVIERNO, ZONAS_VERANO } from '@/domain/tipos';
import { useAlmacen } from '@/store/almacen';
import { tablaZonasOficial } from '@/domain/zonasClimaticas';
import { Boton, CampoNumero, CampoNumeroCompacto, Cargando, Interruptor, Nota, Pantalla, Seccion, useConfirmar } from '@/ui/componentes';
import { EditorZonasClimaticas, validarTablaZonas } from '@/ui/EditorZonasClimaticas';
import { color } from '@/ui/tema';
import { formatoNumero } from '@/domain/formato';
import { Text, View } from 'react-native';
import { useEffect, useState } from 'react';

export default function Ajustes() {
  const { cargado, parametros, guardarParametros, restaurarParametros } = useAlmacen();
  const confirmar = useConfirmar();
  const [d, setD] = useState<Parametros>(parametros);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    if (cargado) setD(parametros);
  }, [cargado, parametros]);

  if (!cargado) return <Cargando />;

  const oficiales = parametrosPorDefecto();
  const cambiado = JSON.stringify(d) !== JSON.stringify(parametros);
  const distintoDeOficial = JSON.stringify(parametros) !== JSON.stringify(oficiales);
  const editar = (fn: (p: Parametros) => void) => {
    setMensaje(null);
    setD((prev) => {
      const copia = JSON.parse(JSON.stringify(prev)) as Parametros;
      fn(copia);
      return copia;
    });
  };
  const oficial = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

  const guardar = () => {
    const ok = [d.fp, d.umbralEnvolventePct, d.roturaPuenteTermicoMinMm, d.claseMinCajonPersiana, d.transmitanciaMaxCajon, d.kwhPorCae, d.minimoMwhVerificacion, ...Object.values(d.permeabilidadMaxPorZona), ...Object.values(d.permeabilidadPorClase)].every(
      (n) => typeof n === 'number' && Number.isFinite(n),
    );
    if (!ok || d.kwhPorCae <= 0) {
      setMensaje({ tipo: 'error', texto: 'Completa todos los parámetros con valores numéricos válidos (los kWh por CAE deben ser mayores que 0).' });
      return;
    }
    const errZonas = validarTablaZonas(d.zonasClimaticas);
    if (errZonas) {
      setMensaje({ tipo: 'error', texto: `Tabla de zonas climáticas: ${errZonas}` });
      return;
    }
    const limpio = normalizarParametros({
      ...d,
      g: Object.fromEntries(
        ZONAS_INVIERNO.map((z) => [z, Object.fromEntries(ZONAS_VERANO.map((v) => [v, d.g[z][v] ?? null]))]),
      ),
    });
    guardarParametros(limpio);
    setMensaje({ tipo: 'ok', texto: 'Ajustes guardados. Los expedientes se recalculan con estos valores.' });
  };

  const restaurar = async () => {
    if (
      await confirmar({
        titulo: 'Restaurar valores oficiales',
        mensaje: 'Se sustituirán todos los parámetros por los de las fichas RES070 y Anexo II. Los expedientes existentes se recalcularán.',
        textoConfirmar: 'Restaurar',
        peligro: true,
      })
    ) {
      restaurarParametros();
      setD(parametrosPorDefecto());
      setMensaje({ tipo: 'ok', texto: 'Valores oficiales restaurados.' });
    }
  };

  return (
    <Pantalla
      pie={
        <>
          <Boton titulo="Restaurar oficiales" variante="secundario" icono="refresh" onPress={restaurar} flex deshabilitado={!distintoDeOficial && !cambiado} />
          <Boton titulo="Guardar ajustes" icono="checkmark" onPress={guardar} flex deshabilitado={!cambiado} />
        </>
      }
    >
      {mensaje ? (
        <View style={{ padding: 12, borderRadius: 10, backgroundColor: mensaje.tipo === 'ok' ? color.okSuave : color.errorSuave }}>
          <Text style={{ color: mensaje.tipo === 'ok' ? color.ok : color.error, fontWeight: '600' }}>{mensaje.texto}</Text>
        </View>
      ) : null}
      {cambiado ? (
        <View style={{ padding: 12, borderRadius: 10, backgroundColor: color.avisoSuave }}>
          <Text style={{ color: color.aviso, fontWeight: '600' }}>Tienes cambios sin guardar.</Text>
        </View>
      ) : null}

      <Seccion
        titulo="Zonas climáticas (CTE DB-HE, tabla a-Anejo B)"
        ayuda="Provincia y altitud del emplazamiento → zona (invierno A–E y verano 1–4). Los expedientes deducen la provincia del código postal y la altitud de la dirección; aquí puedes ajustar la tabla oficial."
      >
        <EditorZonasClimaticas tabla={d.zonasClimaticas} onChange={(t) => editar((p) => (p.zonasClimaticas = t))} />
        <Boton
          titulo="Restaurar tabla de zonas oficial"
          variante="secundario"
          icono="refresh"
          onPress={() => editar((p) => (p.zonasClimaticas = tablaZonasOficial()))}
          deshabilitado={JSON.stringify(d.zonasClimaticas) === JSON.stringify(oficiales.zonasClimaticas)}
        />
      </Seccion>

      <Seccion
        titulo="Transmitancia U de ventanas (CTE)"
        ayuda="Valores máximos y recomendados de U (W/m²·K) según zona climática de invierno. Cuanto menor sea Uhf respecto a Uhi, mayor será el ahorro certificable."
      >
        <Nota tono="ok" texto="Referencia orientativa del CTE. La app valida Uhf de cada ventana nueva frente a estos límites según la zona de la actuación." />
        {ZONAS_INVIERNO.map((z) => {
          const lim = CTE_TRANSMITANCIA_VENTANAS[z];
          return (
            <View key={z} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: color.borde }}>
              <Text style={{ width: 70, fontWeight: '800', color: color.primario }}>Zona {z}</Text>
              <Text style={{ flex: 1, minWidth: 140, color: color.textoSuave, fontSize: 13 }}>{lim.ciudadesEjemplo}</Text>
              <Text style={{ minWidth: 110, color: color.texto, fontSize: 13 }}>Máx. {formatoNumero(lim.uMaximo, 1)}</Text>
              <Text style={{ minWidth: 120, color: color.texto, fontSize: 13 }}>Rec. &lt; {formatoNumero(lim.uRecomendado, 1)}</Text>
            </View>
          );
        })}
      </Seccion>

      <Seccion
        titulo="Coeficiente G (Anexo II)"
        ayuda="Miles de horas·K/año según zona climática de invierno (columnas) y de verano (filas). Deja una celda vacía para indicar que la combinación no está definida."
      >
        <View style={{ gap: 6 }} testID="tabla-g">
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <View style={{ width: 44 }}>
              <Text style={{ fontSize: 11, color: color.textoSuave }}>ZCV \ ZCI</Text>
            </View>
            {ZONAS_INVIERNO.map((z) => (
              <Text key={z} style={{ flex: 1, textAlign: 'center', fontWeight: '700', color: color.primario }}>
                {z}
              </Text>
            ))}
          </View>
          {ZONAS_VERANO.map((zv) => (
            <View key={zv} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end' }}>
              <Text style={{ width: 44, fontWeight: '700', color: color.primario, paddingBottom: 10 }}>{zv}</Text>
              {ZONAS_INVIERNO.map((zi) => (
                <View key={zi} style={{ flex: 1, minWidth: 0 }}>
                  <CampoTexto2
                    etiqueta={`G ${zi}${zv}`}
                    valor={d.g[zi][zv] ?? undefined}
                    modificado={!oficial(d.g[zi][zv], oficiales.g[zi][zv])}
                    onChange={(x) => editar((p) => (p.g[zi][zv] = x ?? null))}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      </Seccion>

      <Seccion titulo="Cálculo del ahorro">
        <CampoNumero etiqueta="Factor de ponderación Fp" valor={d.fp} onChange={(x) => editar((p) => (p.fp = x as number))} ayuda={`Oficial: ${oficiales.fp}. Ajusta la demanda estimada al consumo real de energía final.`} />
        <CampoNumero etiqueta="kWh de ahorro por cada CAE" unidad="kWh" valor={d.kwhPorCae} onChange={(x) => editar((p) => (p.kwhPorCae = x as number))} ayuda="La ficha expresa el ahorro en kWh/año. Se asume 1 CAE = 1 kWh de ahorro de energía final." />
        <CampoNumero etiqueta="Mínimo para verificación" unidad="MWh/año" valor={d.minimoMwhVerificacion} onChange={(x) => editar((p) => (p.minimoMwhVerificacion = x as number))} ayuda="Cantidad mínima de ahorro anual del expediente para poder verificarlo. Por defecto 30 MWh/año." />
        <Interruptor
          etiqueta="Multiplicar el ahorro por la duración Di"
          ayuda="Desactivado por defecto: según la ficha, Di es un dato administrativo que no se usa en el cálculo."
          valor={d.multiplicarPorDuracion}
          onChange={(x) => editar((p) => (p.multiplicarPorDuracion = x))}
        />
        <Interruptor
          etiqueta="Ignorar ahorros negativos por ventana"
          ayuda="Activado por defecto: si Uhf > Uhi, la ventana aporta 0 kWh y se muestra un aviso (en lugar de restar del total)."
          valor={d.ignorarAhorrosNegativos}
          onChange={(x) => editar((p) => (p.ignorarAhorrosNegativos = x))}
        />
      </Seccion>

      <Seccion titulo="Requisitos de la ficha (comprobaciones)">
        <CampoNumero etiqueta="Límite de huecos sobre la envolvente térmica final" unidad="%" valor={d.umbralEnvolventePct} onChange={(x) => editar((p) => (p.umbralEnvolventePct = x as number))} ayuda={`Oficial: ${oficiales.umbralEnvolventePct} %.`} />
        <CampoNumero etiqueta="Rotura de puente térmico mínima (marcos metálicos)" unidad="mm" valor={d.roturaPuenteTermicoMinMm} onChange={(x) => editar((p) => (p.roturaPuenteTermicoMinMm = x as number))} ayuda={`Oficial: ${oficiales.roturaPuenteTermicoMinMm} mm.`} />
        <CampoNumero etiqueta="Clase mínima de permeabilidad del cajón de persiana" valor={d.claseMinCajonPersiana} onChange={(x) => editar((p) => (p.claseMinCajonPersiana = x as number))} ayuda={`Oficial: clase ${oficiales.claseMinCajonPersiana}.`} />
        <CampoNumero etiqueta="Transmitancia máxima del cajón (exclusiva)" unidad="W/m²·K" valor={d.transmitanciaMaxCajon} onChange={(x) => editar((p) => (p.transmitanciaMaxCajon = x as number))} ayuda={`Oficial: inferior a ${oficiales.transmitanciaMaxCajon}.`} />
        <Text style={{ fontWeight: '600', color: color.texto, marginTop: 4 }}>Permeabilidad máxima admitida por zona de invierno (m³/h·m² a 100 Pa)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ZONAS_INVIERNO.map((z) => (
            <CampoNumero key={z} etiqueta={`Zona ${z}`} minAncho={90} valor={d.permeabilidadMaxPorZona[z]} onChange={(x) => editar((p) => (p.permeabilidadMaxPorZona[z] = x as number))} />
          ))}
        </View>
        <Text style={{ fontWeight: '600', color: color.texto, marginTop: 4 }}>Permeabilidad máxima por clase UNE-EN 12207 (m³/h·m² a 100 Pa)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {([1, 2, 3, 4] as const).map((c) => (
            <CampoNumero key={c} etiqueta={`Clase ${c}`} minAncho={90} valor={d.permeabilidadPorClase[c]} onChange={(x) => editar((p) => (p.permeabilidadPorClase[c] = x as number))} />
          ))}
        </View>
      </Seccion>
    </Pantalla>
  );
}

function CampoTexto2({ etiqueta, valor, onChange, modificado }: { etiqueta: string; valor: number | undefined; onChange: (v: number | undefined) => void; modificado: boolean }) {
  return (
    <View style={modificado ? { borderRadius: 10, backgroundColor: color.acentoSuave, padding: 2 } : { padding: 2 }}>
      <CampoNumeroCompacto etiqueta={etiqueta} valor={valor} onChange={onChange} />
    </View>
  );
}
