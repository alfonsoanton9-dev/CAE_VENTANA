import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { accionAvanceEstado, siguienteEstadoExpediente } from '@/domain/adjuntos';
import { calcularExpediente } from '@/domain/calculo';
import { TIPOS_DOCUMENTO } from '@/domain/tipos';
import { formatoNumero } from '@/domain/formato';
import { useAlmacen } from '@/store/almacen';
import { Boton, BotonIcono, Cargando, Fila, Insignia, ListaAvisos, Pantalla, Seccion, Tarjeta, useConfirmar, Vacio } from '@/ui/componentes';
import { etiquetaEstado, etiquetaEstadoObra, etiquetaRolGestor, etiquetaTipoSujeto, tonoEstado, tonoEstadoObra } from '@/ui/estado';
import { color } from '@/ui/tema';

export default function DetalleExpediente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const confirmar = useConfirmar();
  const { cargado, obtenerExpediente, parametros, actualizarExpediente, duplicarExpediente, eliminarExpediente, duplicarActuacion, eliminarActuacion } =
    useAlmacen();
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

  const s = exp.sujeto;
  const g = exp.gestor;
  const siguiente = siguienteEstadoExpediente(exp.estado);
  const accion = accionAvanceEstado(exp.estado);
  const { id: _id, actuaciones: _act, creadoEn: _c, actualizadoEn: _u, ...borrador } = exp;
  const propietarios = [...new Set(exp.actuaciones.map((a) => a.propietarioAhorro || a.cliente.nombre).filter(Boolean))];

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
            <Text style={{ color: '#CFE2F7' }}>
              {formatoNumero(r.aeTotal)} kWh/año · suma de {exp.actuaciones.length} actuación{exp.actuaciones.length === 1 ? '' : 'es'}
            </Text>
          </View>
          <Insignia texto={etiquetaEstado(exp.estado)} tono={tonoEstado(exp.estado)} />
        </View>
        <View style={{ flexDirection: 'row', gap: 22, marginTop: 14, flexWrap: 'wrap' }}>
          <Resumen titulo="Actuaciones" valor={String(exp.actuaciones.length)} />
          <Resumen titulo="Ventanas" valor={`${r.ventanasCalculadas}/${r.ventanasTotales}`} />
          <Resumen titulo="Huecos" valor={`${formatoNumero(r.superficieHuecos)} m²`} />
        </View>
      </Tarjeta>

      <Tarjeta>
        <Text style={{ fontSize: 16, fontWeight: '700', color: color.texto, marginBottom: 8 }}>Indicadores económicos</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
          <DatoEco titulo="Energía ahorrada" valor={`${formatoNumero(r.aeTotal)} kWh/año`} sub={`${formatoNumero(r.energiaMWhAnio, 3)} MWh/año`} />
          <DatoEco
            titulo="Impacto intermediario / instalador"
            valor={r.impactoEconomicoIntermediarioEur === null ? '—' : `${formatoNumero(r.impactoEconomicoIntermediarioEur)} €`}
            sub={
              exp.valorEconomicoEurPorMWhAnio !== undefined && exp.feeIntermediarioPct !== undefined
                ? `${formatoNumero(exp.valorEconomicoEurPorMWhAnio, 0)} €/MWh·año × fee ${formatoNumero(exp.feeIntermediarioPct, 0)} %`
                : 'Falta valor económico o fee'
            }
            destacado
          />
        </View>
        {r.valorBrutoPropietarioEur !== null ? (
          <Text style={{ color: color.textoSuave, fontSize: 12.5, marginTop: 10 }}>
            Valor bruto al propietario del CAE: {formatoNumero(r.valorBrutoPropietarioEur)} €
          </Text>
        ) : null}
      </Tarjeta>

      <ListaAvisos avisos={r.avisos} />

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {siguiente && accion ? (
          <Boton
            titulo={accion}
            icono="arrow-forward"
            onPress={async () => {
              if (
                await confirmar({
                  titulo: accion,
                  mensaje: `El expediente pasará a “${etiquetaEstado(siguiente)}”.`,
                  textoConfirmar: accion,
                })
              ) {
                actualizarExpediente(exp.id, { ...borrador, estado: siguiente });
              }
            }}
          />
        ) : null}
        <Boton titulo="Editar expediente" variante="secundario" icono="create-outline" onPress={() => router.push(`/expediente/${exp.id}/editar`)} />
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
            if (
              await confirmar({
                titulo: 'Eliminar expediente',
                mensaje: `Se eliminará “${exp.referencia}” con sus ${exp.actuaciones.length} actuaciones. Esta acción no se puede deshacer.`,
                textoConfirmar: 'Eliminar',
                peligro: true,
              })
            ) {
              eliminarExpediente(exp.id);
              router.replace('/');
            }
          }}
        />
      </View>

      <Seccion titulo="Comprador del CAE">
        <Fila etiqueta="Tipo" valor={etiquetaTipoSujeto(s.tipo)} />
        <Fila etiqueta="Razón social" valor={s.razonSocial || '—'} />
        <Fila etiqueta="NIF/CIF" valor={s.nifNie || '—'} />
        <Fila etiqueta="Contacto" valor={[s.telefono, s.email].filter(Boolean).join(' · ') || '—'} />
        <Fila etiqueta="Representante" valor={[s.representante.nombre, s.representante.nifNie].filter(Boolean).join(' · ') || '—'} />
      </Seccion>

      <Seccion titulo="Instalador / montador / partner (gestión CAE)">
        <Fila etiqueta="Rol" valor={etiquetaRolGestor(g.rol)} />
        <Fila etiqueta="Razón social" valor={g.razonSocial || '—'} />
        <Fila etiqueta="NIF/CIF" valor={g.nifNie || '—'} />
        <Fila etiqueta="Contacto" valor={[g.telefono, g.email].filter(Boolean).join(' · ') || '—'} />
      </Seccion>

      <Seccion titulo="Cliente / propietario del ahorro (actuaciones)" ayuda="Nombre al que irá asociado el CAE en cada actuación.">
        {propietarios.length === 0 ? (
          <Text style={{ color: color.textoSuave }}>Aún no hay actuaciones con propietario.</Text>
        ) : (
          propietarios.map((p) => <Fila key={p} etiqueta="Propietario / cliente" valor={p} />)
        )}
        {exp.actuaciones.map((a) => (
          <Fila
            key={a.id}
            etiqueta={a.etiqueta || 'Actuación'}
            valor={[a.propietarioAhorro || a.cliente.nombre || '—', a.cliente.nifNie].filter(Boolean).join(' · ')}
          />
        ))}
      </Seccion>

      <Seccion titulo="Parámetros económicos">
        <Fila
          etiqueta="Valor económico del CAE"
          valor={exp.valorEconomicoEurPorMWhAnio === undefined ? '—' : `${formatoNumero(exp.valorEconomicoEurPorMWhAnio)} €/MWh·año`}
        />
        <Fila etiqueta="Fee intermediario / instalador" valor={exp.feeIntermediarioPct === undefined ? '—' : `${formatoNumero(exp.feeIntermediarioPct)} %`} />
        {exp.notas ? <Fila etiqueta="Notas" valor={exp.notas} /> : null}
      </Seccion>

      <Tarjeta>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: color.texto }}>Actuaciones ({exp.actuaciones.length})</Text>
          <Boton titulo="Añadir actuación" icono="add" onPress={() => router.push(`/expediente/${exp.id}/actuacion/nueva`)} />
        </View>
        {exp.actuaciones.length === 0 ? (
          <Vacio
            icono="home-outline"
            titulo="Sin actuaciones todavía"
            texto="Cada actuación agrupa un inmueble (dirección, CP, referencia catastral, zona climática), sus ventanas y la documentación del apartado 5."
          />
        ) : (
          <View style={{ marginTop: 12, gap: 10 }}>
            {r.actuaciones.map((ra) => {
              const a = exp.actuaciones.find((x) => x.id === ra.actuacionId)!;
              const docs = TIPOS_DOCUMENTO.filter((t) => (a.documentacion[t.clave] ?? []).length > 0).length;
              return (
                <View key={a.id} style={{ borderWidth: 1, borderColor: color.borde, borderRadius: 10, padding: 12, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontWeight: '700', fontSize: 15.5, color: color.texto }}>{a.etiqueta || 'Sin etiqueta'}</Text>
                      <Text style={{ color: color.textoSuave, fontSize: 13 }} numberOfLines={2}>
                        {[a.direccion, a.codigoPostal, a.municipio].filter(Boolean).join(', ') || 'Sin dirección'}
                      </Text>
                      {a.referenciaCatastral ? <Text style={{ color: color.textoSuave, fontSize: 12 }}>Ref. catastral {a.referenciaCatastral}</Text> : null}
                      <Text style={{ color: color.textoSuave, fontSize: 12 }}>
                        Propietario CAE: {a.propietarioAhorro || a.cliente.nombre || '—'}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                        <Insignia texto={etiquetaEstadoObra(a.estadoObra)} tono={tonoEstadoObra(a.estadoObra)} />
                        {a.zonaInvierno && a.zonaVerano ? <Insignia texto={`Zona ${a.zonaInvierno}${a.zonaVerano}`} tono="neutro" /> : null}
                        <Insignia texto={`Docs ${docs}/${TIPOS_DOCUMENTO.length}`} tono={docs === TIPOS_DOCUMENTO.length ? 'ok' : 'aviso'} />
                      </View>
                    </View>
                    <BotonIcono icono="create-outline" etiqueta={`Abrir ${a.etiqueta}`} onPress={() => router.push(`/expediente/${exp.id}/actuacion/${a.id}`)} />
                    <BotonIcono icono="copy-outline" etiqueta={`Duplicar ${a.etiqueta}`} onPress={() => duplicarActuacion(exp.id, a.id)} />
                    <BotonIcono
                      icono="trash-outline"
                      peligro
                      etiqueta={`Eliminar ${a.etiqueta}`}
                      onPress={async () => {
                        if (
                          await confirmar({
                            titulo: 'Eliminar actuación',
                            mensaje: `¿Eliminar “${a.etiqueta}” y sus ${a.ventanas.length} ventanas?`,
                            textoConfirmar: 'Eliminar',
                            peligro: true,
                          })
                        )
                          eliminarActuacion(exp.id, a.id);
                      }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                    <Mini t="Ventanas" v={`${ra.ventanasCalculadas}/${a.ventanas.length}`} />
                    <Mini t="AE" v={`${formatoNumero(ra.aeTotal)} kWh/año`} />
                    <Mini t="CAE" v={formatoNumero(ra.cae)} fuerte />
                  </View>
                  {!ra.cumple ? <Insignia texto="Requisitos por revisar" tono="aviso" /> : null}
                  <Boton titulo="Abrir actuación" variante="secundario" onPress={() => router.push(`/expediente/${exp.id}/actuacion/${a.id}`)} />
                </View>
              );
            })}
          </View>
        )}
      </Tarjeta>
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

function DatoEco({ titulo, valor, sub, destacado }: { titulo: string; valor: string; sub?: string; destacado?: boolean }) {
  return (
    <View style={{ minWidth: 160, flex: 1 }}>
      <Text style={{ fontSize: 11.5, color: color.textoSuave, textTransform: 'uppercase' }}>{titulo}</Text>
      <Text style={{ fontSize: destacado ? 22 : 18, fontWeight: '800', color: destacado ? color.primario : color.texto }}>{valor}</Text>
      {sub ? <Text style={{ color: color.textoSuave, fontSize: 12 }}>{sub}</Text> : null}
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
