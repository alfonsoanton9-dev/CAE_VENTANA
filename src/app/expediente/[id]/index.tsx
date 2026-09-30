import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { calcularExpediente } from '@/domain/calculo';
import { formatoNumero, isoAFecha } from '@/domain/formato';
import type { DocumentacionChecklist } from '@/domain/tipos';
import { UBICACIONES } from '@/domain/tipos';
import { useAlmacen } from '@/store/almacen';
import { Boton, BotonIcono, Cargando, Fila, Insignia, Interruptor, ListaAvisos, Pantalla, Seccion, Tarjeta, useConfirmar, Vacio } from '@/ui/componentes';
import { TablaDesglose } from '@/ui/Desglose';
import { etiquetaEstado, tonoEstado } from '@/ui/estado';
import { color } from '@/ui/tema';

const DOCUMENTOS: Array<{ clave: keyof DocumentacionChecklist; etiqueta: string }> = [
  { clave: 'fichaFirmada', etiqueta: 'Ficha cumplimentada y firmada por el representante legal' },
  { clave: 'declaracionResponsable', etiqueta: 'Declaración responsable sobre ayudas públicas (Anexo I)' },
  { clave: 'facturas', etiqueta: 'Facturas justificativas de la inversión' },
  { clave: 'informeFotografico', etiqueta: 'Informe fotográfico antes y después' },
  { clave: 'certificadoDirectorObra', etiqueta: 'Certificado de la dirección de obra (envolvente, transmitancias, variables)' },
  { clave: 'certificadoEficienciaEnergetica', etiqueta: 'Certificado de eficiencia energética con justificante de registro' },
  { clave: 'declaracionPrestacionesCE', etiqueta: 'Declaración de prestaciones y marcado CE' },
];

export default function DetalleExpediente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const confirmar = useConfirmar();
  const { cargado, obtenerExpediente, parametros, actualizarExpediente, duplicarExpediente, eliminarExpediente, duplicarVentana, eliminarVentana } = useAlmacen();
  const exp = obtenerExpediente(id);
  const r = useMemo(() => (exp ? calcularExpediente(exp, parametros) : null), [exp, parametros]);

  if (!cargado) return <Cargando />;
  if (!exp || !r)
    return (
      <Pantalla>
        <Tarjeta>
          <Vacio icono="alert-circle-outline" titulo="Expediente no encontrado" texto="Puede que se haya eliminado.">
            <Boton titulo="Volver a expedientes" onPress={() => router.replace('/')} />
          </Vacio>
        </Tarjeta>
      </Pantalla>
    );

  const docsHechos = DOCUMENTOS.filter((d) => exp.documentacion[d.clave]).length;
  const ubic = UBICACIONES.find((u) => u.valor === exp.ubicacion)?.etiqueta;

  return (
    <Pantalla>
      <Stack.Screen options={{ title: exp.referencia || 'Expediente' }} />

      <Tarjeta style={{ backgroundColor: color.primario, borderColor: color.primario }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#CFE2F7', fontSize: 12.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>CAE del expediente</Text>
            <Text testID="cae-total" style={{ color: '#fff', fontSize: 38, fontWeight: '800' }}>
              {formatoNumero(r.cae)}
            </Text>
            <Text style={{ color: '#CFE2F7' }}>{formatoNumero(r.aeTotal)} kWh/año de ahorro de energía final</Text>
          </View>
          <Insignia texto={etiquetaEstado(exp.estado)} tono={tonoEstado(exp.estado)} />
        </View>
        <View style={{ flexDirection: 'row', gap: 22, marginTop: 14, flexWrap: 'wrap' }}>
          <Resumen titulo="Ventanas" valor={`${r.ventanasCalculadas}/${exp.ventanas.length}`} />
          <Resumen titulo="Superficie huecos" valor={`${formatoNumero(r.superficieHuecos)} m²`} />
          <Resumen titulo="% envolvente" valor={r.porcentajeEnvolvente === null ? '—' : `${formatoNumero(r.porcentajeEnvolvente)} %`} />
          <Resumen titulo="Zona · G" valor={exp.zonaInvierno && exp.zonaVerano ? `${exp.zonaInvierno}${exp.zonaVerano} · ${r.g ?? '—'}` : '—'} />
        </View>
      </Tarjeta>

      <ListaAvisos avisos={r.avisosExpediente} />

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Boton titulo="Editar datos" variante="secundario" icono="create-outline" onPress={() => router.push(`/expediente/${exp.id}/editar`)} />
        <Boton
          titulo="Duplicar"
          variante="secundario"
          icono="copy-outline"
          onPress={() => {
            const nuevo = duplicarExpediente(exp.id);
            if (nuevo) router.replace(`/expediente/${nuevo}`);
          }}
        />
        <Boton
          titulo="Eliminar"
          variante="peligro"
          icono="trash-outline"
          onPress={async () => {
            if (await confirmar({ titulo: 'Eliminar expediente', mensaje: `Se eliminará “${exp.referencia}” con sus ${exp.ventanas.length} ventanas. Esta acción no se puede deshacer.`, textoConfirmar: 'Eliminar', peligro: true })) {
              eliminarExpediente(exp.id);
              router.replace('/');
            }
          }}
        />
      </View>

      <Tarjeta>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: color.texto }}>Ventanas ({exp.ventanas.length})</Text>
          <Boton titulo="Añadir ventana" icono="add" onPress={() => router.push(`/expediente/${exp.id}/ventana/nueva`)} />
        </View>
        {exp.ventanas.length === 0 ? (
          <Vacio
            icono="grid-outline"
            titulo="Sin ventanas todavía"
            texto="Añade cada ventana, puerta-ventana o lucernario sustituido con su superficie y las transmitancias anterior y nueva."
          />
        ) : (
          <View style={{ marginTop: 12, gap: 10 }}>
            {r.ventanas.map((d) => {
              const v = exp.ventanas.find((x) => x.id === d.ventanaId)!;
              const errores = d.avisos.filter((a) => a.gravedad === 'error').length;
              return (
                <View key={v.id} style={{ borderWidth: 1, borderColor: color.borde, borderRadius: 10, padding: 12, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', fontSize: 15.5, color: color.texto }}>{v.etiqueta || 'Sin etiqueta'}</Text>
                      <Text style={{ color: color.textoSuave, fontSize: 13 }}>
                        {[v.estancia, v.planta && `Planta ${v.planta}`, v.orientacion].filter(Boolean).join(' · ') || 'Sin ubicación'}
                      </Text>
                    </View>
                    <BotonIcono icono="create-outline" etiqueta={`Editar ${v.etiqueta}`} onPress={() => router.push(`/expediente/${exp.id}/ventana/${v.id}`)} />
                    <BotonIcono icono="copy-outline" etiqueta={`Duplicar ${v.etiqueta}`} onPress={() => duplicarVentana(exp.id, v.id)} />
                    <BotonIcono
                      icono="trash-outline"
                      peligro
                      etiqueta={`Eliminar ${v.etiqueta}`}
                      onPress={async () => {
                        if (await confirmar({ titulo: 'Eliminar ventana', mensaje: `¿Eliminar “${v.etiqueta}” del expediente?`, textoConfirmar: 'Eliminar', peligro: true })) eliminarVentana(exp.id, v.id);
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

      <Seccion titulo="Desglose del cálculo" ayuda="Aplicación paso a paso de la fórmula de la ficha RES070 con los parámetros vigentes en Ajustes.">
        <TablaDesglose r={r} p={parametros} />
      </Seccion>

      <Seccion titulo="Datos del expediente">
        <Fila etiqueta="Referencia catastral" valor={exp.referenciaCatastral || '—'} />
        <Fila etiqueta="Inmueble" valor={[exp.direccion, exp.codigoPostal, exp.municipio, exp.provincia].filter(Boolean).join(', ') || '—'} />
        <Fila etiqueta="Ámbito" valor={ubic ?? '—'} />
        <Fila etiqueta="Altitud" valor={exp.altitudM === undefined ? '—' : `${formatoNumero(exp.altitudM, 0)} m`} />
        <Fila etiqueta="Envolvente térmica final" valor={exp.superficieEnvolventeM2 === undefined ? '—' : `${formatoNumero(exp.superficieEnvolventeM2)} m²`} />
        <Fila etiqueta="Cliente" valor={[exp.cliente.nombre, exp.cliente.nifNie].filter(Boolean).join(' · ') || '—'} />
        <Fila etiqueta="Contacto" valor={[exp.cliente.telefono, exp.cliente.email].filter(Boolean).join(' · ') || '—'} />
        <Fila etiqueta="Propietario del ahorro" valor={exp.propietarioAhorro || '—'} />
        <Fila etiqueta="Representante del solicitante" valor={[exp.representante.nombre, exp.representante.nifNie].filter(Boolean).join(' · ') || '—'} />
        <Fila etiqueta="Inicio · fin de la actuación" valor={`${exp.fechaInicio ? isoAFecha(exp.fechaInicio) : '—'} · ${exp.fechaFin ? isoAFecha(exp.fechaFin) : '—'}`} />
        <Fila etiqueta="Duración indicativa Di" valor={exp.duracionAnios === undefined ? '—' : `${formatoNumero(exp.duracionAnios, 0)} años`} />
        {exp.notas ? <Fila etiqueta="Notas" valor={exp.notas} /> : null}
      </Seccion>

      <Seccion titulo={`Documentación justificativa (${docsHechos}/${DOCUMENTOS.length})`} ayuda="Lista de comprobación del apartado 5 de la ficha.">
        {DOCUMENTOS.map((doc) => (
          <Interruptor
            key={doc.clave}
            etiqueta={doc.etiqueta}
            valor={exp.documentacion[doc.clave]}
            onChange={(v) => {
              const { id: _i, ventanas: _v, creadoEn: _c, actualizadoEn: _a, ...b } = exp;
              actualizarExpediente(exp.id, { ...b, documentacion: { ...exp.documentacion, [doc.clave]: v } });
            }}
          />
        ))}
      </Seccion>
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
