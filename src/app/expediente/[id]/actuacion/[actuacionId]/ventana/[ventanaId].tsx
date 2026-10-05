import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { desglosarVentana, esMarcoMetalico } from '@/domain/calculo';
import { textoAyudaCteUhf, limitesCteTransmitancia } from '@/domain/cteTransmitancia';
import { ventanaVacia } from '@/domain/fabrica';
import { MATERIALES_MARCO, ORIENTACIONES, TIPOS_HUECO, type ClasePermeabilidad, type Ventana } from '@/domain/tipos';
import { formatoNumero } from '@/domain/formato';
import { useAlmacen } from '@/store/almacen';
import { Boton, CampoNumero, CampoTexto, Cargando, Fila, Interruptor, ListaAvisos, Nota, Pantalla, Selector, Seccion, Tarjeta, Vacio } from '@/ui/componentes';
import { CampoFoto } from '@/ui/DocumentosActuacion';
import { DesgloseLineaVentana } from '@/ui/Desglose';
import { color } from '@/ui/tema';

const CLASES = [
  { valor: 0, etiqueta: 'Sin clasificar' },
  { valor: 1, etiqueta: 'Clase 1' },
  { valor: 2, etiqueta: 'Clase 2' },
  { valor: 3, etiqueta: 'Clase 3' },
  { valor: 4, etiqueta: 'Clase 4' },
] as const;

export default function FormularioVentana() {
  const { id, actuacionId, ventanaId } = useLocalSearchParams<{ id: string; actuacionId: string; ventanaId: string }>();
  const { cargado, obtenerActuacion } = useAlmacen();
  const act = obtenerActuacion(id, actuacionId);
  if (!cargado) return <Cargando />;
  const existente = act?.ventanas.find((v) => v.id === ventanaId);
  if (!act || (ventanaId !== 'nueva' && !existente))
    return (
      <Pantalla>
        <Tarjeta>
          <Vacio icono="alert-circle-outline" titulo="Ventana no encontrada" texto="Puede que se haya eliminado." />
        </Tarjeta>
      </Pantalla>
    );
  return (
    <Editor
      expedienteId={id}
      actuacionId={act.id}
      ventanaInicial={existente ?? ventanaVacia(act.ventanas.length + 1)}
      esNueva={!existente}
    />
  );
}

function Editor({
  expedienteId,
  actuacionId,
  ventanaInicial,
  esNueva,
}: {
  expedienteId: string;
  actuacionId: string;
  ventanaInicial: Ventana;
  esNueva: boolean;
}) {
  const router = useRouter();
  const { obtenerActuacion, parametros, guardarVentana } = useAlmacen();
  const act = obtenerActuacion(expedienteId, actuacionId)!;
  const [v, setV] = useState<Ventana>(ventanaInicial);
  const setNueva = <K extends keyof Ventana['nueva']>(k: K, val: Ventana['nueva'][K]) => setV((x) => ({ ...x, nueva: { ...x.nueva, [k]: val } }));
  const set = <K extends keyof Ventana>(k: K, val: Ventana[K]) => setV((x) => ({ ...x, [k]: val }));

  const desglose = useMemo(() => desglosarVentana(v, { ...act, ventanas: [v] }, parametros), [v, act, parametros]);
  const metalico = esMarcoMetalico(v);

  const guardar = (otra: boolean) => {
    const limpia = { ...v, etiqueta: v.etiqueta.trim() || 'Ventana', unidades: v.unidades > 0 ? Math.round(v.unidades) : 1 };
    guardarVentana(expedienteId, actuacionId, limpia);
    if (otra) setV(ventanaVacia(act.ventanas.length + 2));
    else router.back();
  };

  return (
    <Pantalla
      pie={
        <>
          <Boton titulo="Cancelar" variante="secundario" onPress={() => router.back()} flex />
          {esNueva ? <Boton titulo="Guardar y añadir otra" variante="secundario" onPress={() => guardar(true)} flex /> : null}
          <Boton titulo="Guardar" icono="checkmark" onPress={() => guardar(false)} flex />
        </>
      }
    >
      <Stack.Screen options={{ title: esNueva ? 'Nueva ventana' : v.etiqueta || 'Editar ventana' }} />

      <Seccion titulo="Identificación">
        <Fila etiqueta="ID de ventana" valor={v.id} />
        <CampoTexto
          etiqueta="Código del instalador"
          valor={v.codigoInstalador}
          onChange={(x) => set('codigoInstalador', x)}
          placeholder="Ej. INST-MAD-001"
          ayuda="Código libre que rellenan los instaladores de ventanas (distinto del ID interno)."
        />
        <View style={fila}>
          <CampoTexto etiqueta="Etiqueta" valor={v.etiqueta} onChange={(x) => set('etiqueta', x)} placeholder="Ej. V1 – Salón" />
          <CampoNumero etiqueta="Unidades iguales" valor={v.unidades} onChange={(x) => set('unidades', x ?? 1)} ayuda="Nº de huecos idénticos que se registran juntos." />
        </View>
        <Selector etiqueta="Tipo de hueco" opciones={TIPOS_HUECO} valor={v.tipo} onChange={(x) => x && set('tipo', x)} />
        <View style={fila}>
          <CampoTexto etiqueta="Estancia" valor={v.estancia} onChange={(x) => set('estancia', x)} placeholder="Salón, dormitorio…" />
          <CampoTexto etiqueta="Planta" valor={v.planta} onChange={(x) => set('planta', x)} placeholder="Ej. 2" />
        </View>
        <Selector
          etiqueta="Orientación"
          opciones={ORIENTACIONES.map((o) => ({ valor: o, etiqueta: o }))}
          valor={v.orientacion}
          onChange={(x) => set('orientacion', x)}
          permitirVacio
        />
      </Seccion>

      <Seccion titulo="Fotos antes / después" ayuda="Una foto del hueco antes de la sustitución y otra después.">
        <View style={fila}>
          <CampoFoto etiqueta="Foto antes" valor={v.fotoAntes} onChange={(a) => set('fotoAntes', a)} />
          <CampoFoto etiqueta="Foto después" valor={v.fotoDespues} onChange={(a) => set('fotoDespues', a)} />
        </View>
      </Seccion>

      <Seccion titulo="Hueco y situación anterior">
        <CampoNumero
          etiqueta="Superficie del hueco S (por unidad)"
          unidad="m²"
          valor={v.superficieM2}
          onChange={(x) => set('superficieM2', x)}
          requerido
          ayuda="Superficie del hueco de la envolvente térmica rehabilitada (ventana y/o lucernario)."
        />
        <CampoTexto
          etiqueta="Descripción de la ventana anterior"
          valor={v.anterior.descripcion}
          onChange={(x) => set('anterior', { ...v.anterior, descripcion: x })}
          placeholder="Ej. Marco de aluminio sin RPT, vidrio simple"
        />
        <CampoNumero
          etiqueta="Transmitancia anterior Uhi"
          unidad="W/m²·K"
          valor={v.anterior.transmitancia}
          onChange={(x) => set('anterior', { ...v.anterior, transmitancia: x })}
          requerido
          ayuda="Cálculo justificado por la dirección de obra (certificado del apartado 5.5.b de la ficha)."
        />
      </Seccion>

      <Seccion titulo="Situación nueva">
        <CampoTexto
          etiqueta="Descripción de la ventana nueva"
          valor={v.nueva.descripcion}
          onChange={(x) => setNueva('descripcion', x)}
          placeholder="Ej. PVC 5 cámaras, doble acristalamiento bajo emisivo"
        />
        <CampoNumero
          etiqueta="Transmitancia nueva Uhf"
          unidad="W/m²·K"
          valor={v.nueva.transmitancia}
          onChange={(x) => setNueva('transmitancia', x)}
          requerido
          ayuda={textoAyudaCteUhf(act.zonaInvierno)}
        />
        {act.zonaInvierno ? (
          <Nota
            tono="ok"
            texto={`CTE zona ${act.zonaInvierno}: U máx. ${formatoNumero(limitesCteTransmitancia(act.zonaInvierno)!.uMaximo, 1)} W/m²·K · recomendado < ${formatoNumero(limitesCteTransmitancia(act.zonaInvierno)!.uRecomendado, 1)} W/m²·K. Menor Uhf frente a Uhi = mayor ahorro certificable.`}
          />
        ) : (
          <Nota tono="aviso" texto="Define la zona climática en la actuación para validar Uhf frente a los límites CTE." />
        )}
        <Selector etiqueta="Material del marco" opciones={MATERIALES_MARCO} valor={v.nueva.materialMarco} onChange={(x) => x && setNueva('materialMarco', x)} />
        {metalico ? (
          <CampoNumero
            etiqueta="Rotura de puente térmico"
            unidad="mm"
            valor={v.nueva.roturaPuenteTermicoMm}
            onChange={(x) => setNueva('roturaPuenteTermicoMm', x)}
            ayuda={`Los marcos metálicos requieren al menos ${parametros.roturaPuenteTermicoMinMm} mm.`}
          />
        ) : null}
        <Selector
          etiqueta="Clase de permeabilidad al aire (UNE-EN 12207:2016)"
          opciones={CLASES}
          valor={v.nueva.clasePermeabilidad}
          onChange={(x) => setNueva('clasePermeabilidad', (x ?? 0) as ClasePermeabilidad)}
          ayuda={
            act.zonaInvierno
              ? `Zona ${act.zonaInvierno}: se exige ≤ ${parametros.permeabilidadMaxPorZona[act.zonaInvierno]} m³/h·m² a 100 Pa.`
              : 'Indica la zona climática en la actuación para validar el requisito.'
          }
        />
        <Interruptor etiqueta="Declaración de prestaciones y marcado CE" valor={v.nueva.marcadoCE} onChange={(x) => setNueva('marcadoCE', x)} />
        <Interruptor etiqueta="Incluye persiana" valor={v.nueva.tienePersiana} onChange={(x) => setNueva('tienePersiana', x)} />
        {v.nueva.tienePersiana ? (
          <>
            <Selector
              etiqueta="Permeabilidad al aire del cajón de persiana"
              opciones={CLASES}
              valor={v.nueva.claseCajonPersiana}
              onChange={(x) => setNueva('claseCajonPersiana', (x ?? 0) as ClasePermeabilidad)}
              ayuda={`Se exige clase ${parametros.claseMinCajonPersiana}.`}
            />
            <CampoNumero
              etiqueta="Transmitancia del cajón"
              unidad="W/m²·K"
              valor={v.nueva.transmitanciaCajon}
              onChange={(x) => setNueva('transmitanciaCajon', x)}
              ayuda={`Debe ser inferior a ${parametros.transmitanciaMaxCajon} W/m²·K (aislante térmico incorporado).`}
            />
          </>
        ) : null}
        <CampoTexto etiqueta="Notas" valor={v.notas} onChange={(x) => set('notas', x)} multilinea />
      </Seccion>

      <Seccion titulo="Cálculo de esta ventana" ayuda="Se actualiza al editar los datos.">
        <View testID="resultado-ventana">
          <DesgloseLineaVentana d={desglose} />
        </View>
        <ListaAvisos avisos={desglose.avisos} />
        {desglose.avisos.length === 0 ? <Text style={{ color: color.ok, fontWeight: '600' }}>Cumple los requisitos de la ficha para esta ventana.</Text> : null}
      </Seccion>
    </Pantalla>
  );
}

const fila = { flexDirection: 'row', flexWrap: 'wrap', gap: 14 } as const;
