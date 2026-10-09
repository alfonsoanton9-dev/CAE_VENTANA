import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { calcularActuacion } from '@/domain/calculo';
import { deducirZona } from '@/domain/clima';
import { formatoNumero, isoAFecha } from '@/domain/formato';
import { UBICACIONES } from '@/domain/tipos';
import { useAlmacen } from '@/store/almacen';
import { Boton, BotonIcono, Cargando, Fila, Insignia, ListaAvisos, Pantalla, Seccion, Tarjeta, useConfirmar, Vacio } from '@/ui/componentes';
import { DocumentosActuacion } from '@/ui/DocumentosActuacion';
import { TablaDesglose } from '@/ui/Desglose';
import { etiquetaEstadoObra, tonoEstadoObra } from '@/ui/estado';
import { color } from '@/ui/tema';

export default function DetalleActuacion() {
  const { id, actuacionId } = useLocalSearchParams<{ id: string; actuacionId: string }>();
  const router = useRouter();
  const confirmar = useConfirmar();
  const {
    cargado,
    obtenerExpediente,
    obtenerActuacion,
    parametros,
    actualizarActuacion,
    duplicarActuacion,
    eliminarActuacion,
    duplicarVentana,
    eliminarVentana,
  } = useAlmacen();
  const exp = obtenerExpediente(id);
  const act = obtenerActuacion(id, actuacionId);
  const r = useMemo(() => (act ? calcularActuacion(act, parametros) : null), [act, parametros]);

  if (!cargado) return <Cargando />;
  if (!exp || !act || !r)
    return (
      <Pantalla>
        <Tarjeta>
          <Vacio icono="alert-circle-outline" titulo="Actuación no encontrada" texto="Puede que se haya eliminado.">
            <Boton titulo="Volver al expediente" onPress={() => router.replace(`/expediente/${id}`)} />
          </Vacio>
        </Tarjeta>
      </Pantalla>
    );

  const ubic = UBICACIONES.find((u) => u.valor === act.ubicacion)?.etiqueta;
  const zonaTabla = deducirZona(parametros.zonasClimaticas, act.provinciaCodigo, act.altitudM);
  const oc = act.origenClima;
  const { id: _aid, ventanas: _vent, creadoEn: _c, actualizadoEn: _u, ...borradorBase } = act;

  return (
    <Pantalla>
      <Stack.Screen options={{ title: act.etiqueta || 'Actuación' }} />

      <Tarjeta style={{ backgroundColor: color.primario, borderColor: color.primario }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#CFE2F7', fontSize: 12.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>CAE de la actuación</Text>
            <Text testID="cae-actuacion" style={{ color: '#fff', fontSize: 38, fontWeight: '800' }}>
              {formatoNumero(r.cae)}
            </Text>
            <Text style={{ color: '#CFE2F7' }}>{formatoNumero(r.aeTotal)} kWh/año de ahorro de energía final</Text>
            <Text style={{ color: '#9EC0E0', fontSize: 12, marginTop: 4 }}>ID actuación: {act.id}</Text>
          </View>
          <Insignia texto={etiquetaEstadoObra(act.estadoObra)} tono={tonoEstadoObra(act.estadoObra)} />
        </View>
        <View style={{ flexDirection: 'row', gap: 22, marginTop: 14, flexWrap: 'wrap' }}>
          <Resumen titulo="Ventanas" valor={`${r.ventanasCalculadas}/${act.ventanas.length}`} />
          <Resumen titulo="Superficie huecos" valor={`${formatoNumero(r.superficieHuecos)} m²`} />
          <Resumen titulo="% envolvente" valor={r.porcentajeEnvolvente === null ? '—' : `${formatoNumero(r.porcentajeEnvolvente)} %`} />
          <Resumen titulo="Zona · G" valor={act.zonaInvierno && act.zonaVerano ? `${act.zonaInvierno}${act.zonaVerano} · ${r.g ?? '—'}` : '—'} />
        </View>
      </Tarjeta>

      <ListaAvisos avisos={r.avisos} />

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Boton titulo="Editar datos" variante="secundario" icono="create-outline" onPress={() => router.push(`/expediente/${exp.id}/actuacion/${act.id}/editar`)} />
        <Boton
          titulo="Duplicar"
          variante="secundario"
          icono="copy-outline"
          onPress={() => {
            const nuevo = duplicarActuacion(exp.id, act.id);
            if (nuevo) router.replace(`/expediente/${exp.id}/actuacion/${nuevo}`);
          }}
        />
        <Boton
          titulo="Eliminar"
          variante="peligro"
          icono="trash-outline"
          onPress={async () => {
            if (await confirmar({ titulo: 'Eliminar actuación', mensaje: `¿Eliminar “${act.etiqueta}” con sus ${act.ventanas.length} ventanas?`, textoConfirmar: 'Eliminar', peligro: true })) {
              eliminarActuacion(exp.id, act.id);
              router.replace(`/expediente/${exp.id}`);
            }
          }}
        />
        <Boton titulo="Volver al expediente" variante="texto" onPress={() => router.push(`/expediente/${exp.id}`)} />
      </View>

      <Tarjeta>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: color.texto }}>Ventanas ({act.ventanas.length})</Text>
          <Boton titulo="Añadir ventana" icono="add" onPress={() => router.push(`/expediente/${exp.id}/actuacion/${act.id}/ventana/nueva`)} />
        </View>
        {act.ventanas.length === 0 ? (
          <Vacio
            icono="grid-outline"
            titulo="Sin ventanas todavía"
            texto="Añade cada ventana, puerta-ventana o lucernario: material, permeabilidad, Uhi/Uhf, persiana y marcado CE."
          />
        ) : (
          <View style={{ marginTop: 12, gap: 10 }}>
            {r.ventanas.map((d) => {
              const v = act.ventanas.find((x) => x.id === d.ventanaId)!;
              const errores = d.avisos.filter((a) => a.gravedad === 'error').length;
              return (
                <View key={v.id} style={{ borderWidth: 1, borderColor: color.borde, borderRadius: 10, padding: 12, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', fontSize: 15.5, color: color.texto }}>{v.etiqueta || 'Sin etiqueta'}</Text>
                      <Text style={{ color: color.textoSuave, fontSize: 13 }}>
                        {[v.estancia, v.planta && `Planta ${v.planta}`, v.orientacion, v.nueva.materialMarco, v.codigoInstalador && `Cód. ${v.codigoInstalador}`]
                          .filter(Boolean)
                          .join(' · ') || 'Sin ubicación'}
                      </Text>
                      {v.nueva.modelo || v.nueva.numeroSerie ? (
                        <Text style={{ color: color.textoSuave, fontSize: 12 }}>
                          {[v.nueva.modelo && `Modelo ${v.nueva.modelo}`, v.nueva.numeroSerie && `S/N ${v.nueva.numeroSerie}`]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      ) : null}
                      <Text style={{ color: color.textoSuave, fontSize: 11.5 }}>ID {v.id}</Text>
                    </View>
                    <BotonIcono icono="create-outline" etiqueta={`Editar ${v.etiqueta}`} onPress={() => router.push(`/expediente/${exp.id}/actuacion/${act.id}/ventana/${v.id}`)} />
                    <BotonIcono icono="copy-outline" etiqueta={`Duplicar ${v.etiqueta}`} onPress={() => duplicarVentana(exp.id, act.id, v.id)} />
                    <BotonIcono
                      icono="trash-outline"
                      peligro
                      etiqueta={`Eliminar ${v.etiqueta}`}
                      onPress={async () => {
                        if (await confirmar({ titulo: 'Eliminar ventana', mensaje: `¿Eliminar “${v.etiqueta}”?`, textoConfirmar: 'Eliminar', peligro: true }))
                          eliminarVentana(exp.id, act.id, v.id);
                      }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                    <Mini t="S" v={d.superficie === undefined ? '—' : `${formatoNumero(d.superficie)} m²`} />
                    <Mini t="Uhi → Uhf" v={`${formatoNumero(d.uhi)} → ${formatoNumero(d.uhf)}`} />
                    <Mini t="AE" v={d.ae === null ? '—' : `${formatoNumero(d.ae)} kWh/año`} fuerte />
                  </View>
                  {!d.completa || errores > 0 ? (
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {!d.completa ? <Insignia texto="Datos incompletos" tono="aviso" /> : null}
                      {errores > 0 ? <Insignia texto={`${errores} requisito${errores > 1 ? 's' : ''} sin cumplir`} tono="error" /> : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </Tarjeta>

      <Seccion titulo="Desglose del cálculo" ayuda="Aplicación paso a paso de la fórmula RES070 con los parámetros de esta actuación.">
        <TablaDesglose r={r} p={parametros} />
      </Seccion>

      <Seccion titulo="Datos de la actuación">
        <Fila etiqueta="Referencia catastral" valor={act.referenciaCatastral || '—'} />
        <Fila etiqueta="Inmueble" valor={[act.direccion, act.codigoPostal, act.municipio, act.provincia].filter(Boolean).join(', ') || '—'} />
        <Fila etiqueta="Ámbito" valor={ubic ?? '—'} />
        <Fila
          etiqueta="Zona climática"
          valor={act.zonaInvierno && act.zonaVerano ? `${act.zonaInvierno}${act.zonaVerano}${r.g !== null ? ` (G = ${formatoNumero(r.g, 0)})` : ''}` : '—'}
        />
        {oc?.zona === 'automatica' && zonaTabla ? (
          <Text style={{ color: color.textoSuave, fontSize: 12.5 }}>Zona automática: {zonaTabla.descripcion}</Text>
        ) : oc?.zona === 'manual' ? (
          <Text style={{ color: color.textoSuave, fontSize: 12.5 }}>Zona elegida a mano{zonaTabla ? ` (la tabla daría ${zonaTabla.texto})` : ''}.</Text>
        ) : null}
        <Fila etiqueta="Altitud" valor={act.altitudM === undefined ? '—' : `${formatoNumero(act.altitudM, 0)} m`} />
        <Fila etiqueta="Envolvente térmica final" valor={act.superficieEnvolventeM2 === undefined ? '—' : `${formatoNumero(act.superficieEnvolventeM2)} m²`} />
        <Fila etiqueta="Cliente" valor={[act.cliente.nombre, act.cliente.nifNie].filter(Boolean).join(' · ') || '—'} />
        <Fila etiqueta="Propietario del ahorro" valor={act.propietarioAhorro || '—'} />
        <Fila etiqueta="Inicio · fin" valor={`${act.fechaInicio ? isoAFecha(act.fechaInicio) : '—'} · ${act.fechaFin ? isoAFecha(act.fechaFin) : '—'}`} />
        <Fila etiqueta="Duración indicativa Di" valor={act.duracionAnios === undefined ? '—' : `${formatoNumero(act.duracionAnios, 0)} años`} />
        {act.notas ? <Fila etiqueta="Notas" valor={act.notas} /> : null}
      </Seccion>

      <DocumentosActuacion
        documentacion={act.documentacion}
        onChange={(docs) => actualizarActuacion(exp.id, act.id, { ...borradorBase, documentacion: docs })}
      />
    </Pantalla>
  );
}

function Resumen({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <View>
      <Text style={{ color: '#CFE2F7', fontSize: 11.5, textTransform: 'uppercase' }}>{titulo}</Text>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{valor}</Text>
    </View>
  );
}

function Mini({ t, v, fuerte }: { t: string; v: string; fuerte?: boolean }) {
  return (
    <Text style={{ color: color.textoSuave, fontSize: 13.5 }}>
      {t}: <Text style={{ color: fuerte ? color.primario : color.texto, fontWeight: fuerte ? '700' : '500' }}>{v}</Text>
    </Text>
  );
}
