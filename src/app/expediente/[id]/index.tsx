import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { mensajeAvanceEstado, accionAvanceEstado, siguienteEstadoExpediente } from '@/domain/adjuntos';
import { calcularExpediente, type ResultadoActuacion, type ResultadoExpediente } from '@/domain/calculo';
import type { Actuacion, Adjunto, Expediente, RolUsuario } from '@/domain/tipos';
import { TIPOS_DOCUMENTO, esIntermediarioInstalador } from '@/domain/tipos';
import { formatoNumero } from '@/domain/formato';
import { useAlmacen } from '@/store/almacen';
import { Boton, BotonIcono, CampoTexto, Cargando, Fila, Insignia, ListaAvisos, Seccion, Tarjeta, useConfirmar, Vacio } from '@/ui/componentes';
import { CampoFoto } from '@/ui/DocumentosActuacion';
import { etiquetaEstado, etiquetaEstadoObra, etiquetaRolGestor, etiquetaTipoSujeto, tonoEstado, tonoEstadoObra } from '@/ui/estado';
import { color, radio } from '@/ui/tema';

type Pestana = 'expediente' | 'actuaciones';

export default function DetalleExpediente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const confirmar = useConfirmar();
  const { width } = useWindowDimensions();
  const lateral = width >= 780;
  const { cargado, obtenerExpediente, parametros, actualizarExpediente, duplicarExpediente, eliminarExpediente, duplicarActuacion, eliminarActuacion, usuario } =
    useAlmacen();
  const exp = obtenerExpediente(id);
  const r = useMemo(() => (exp ? calcularExpediente(exp, parametros, usuario.rol) : null), [exp, parametros, usuario.rol]);
  const [pestana, setPestana] = useState<Pestana>('expediente');
  const [editandoCodigo, setEditandoCodigo] = useState(false);
  const [codigoBorrador, setCodigoBorrador] = useState('');
  const [avisoCabecera, setAvisoCabecera] = useState<string | null>(null);
  const [panelVerificado, setPanelVerificado] = useState(false);
  const [contratoBorrador, setContratoBorrador] = useState<Adjunto | undefined>();
  const [informeBorrador, setInformeBorrador] = useState<Adjunto | undefined>();

  if (!cargado) return <Cargando />;
  if (!exp || !r)
    return (
      <View style={{ flex: 1, backgroundColor: color.fondo, padding: 16 }}>
        <Tarjeta>
          <Vacio icono="alert-circle-outline" titulo="Expediente no encontrado" texto="Puede que se haya eliminado.">
            <Boton titulo="Volver a expedientes" onPress={() => router.replace('/')} />
          </Vacio>
        </Tarjeta>
      </View>
    );

  const { id: _id, actuaciones: _act, creadoEn: _c, actualizadoEn: _u, ...borrador } = exp;
  const bajoMinimo = r.energiaMWhAnio < parametros.minimoMwhVerificacion;

  const guardarCodigo = () => {
    const ref = codigoBorrador.trim();
    if (ref && ref !== exp.referencia) actualizarExpediente(exp.id, { ...borrador, referencia: ref });
    setEditandoCodigo(false);
  };

  const guardarInformacion = () => {
    if (editandoCodigo) guardarCodigo();
    actualizarExpediente(exp.id, borrador);
    setAvisoCabecera('Información del expediente guardada.');
  };

  const validarExpediente = () => {
    if (r.avisos.some((a) => a.gravedad === 'error') || !r.cumple) {
      setAvisoCabecera('Validación no superada: revisa los avisos del expediente.');
      actualizarExpediente(exp.id, { ...borrador, validado: false });
      return;
    }
    actualizarExpediente(exp.id, { ...borrador, validado: true });
    setAvisoCabecera(
      bajoMinimo
        ? 'Expediente validado con aviso: no alcanza el mínimo de MWh/año para verificación.'
        : 'Expediente validado correctamente.',
    );
  };

  const enviarAVerificacion = async () => {
    if (exp.estado !== 'borrador') return;
    const ok = await confirmar({
      titulo: 'Enviar a verificación',
      mensaje: mensajeAvanceEstado('borrador') ?? 'El expediente se enviará a verificación.',
      textoConfirmar: 'Enviar a verificación',
    });
    if (!ok) return;
    actualizarExpediente(exp.id, { ...borrador, validado: true, estado: 'en-verificacion' });
    setAvisoCabecera('Expediente enviado a verificación.');
  };

  const abrirMarcarVerificado = () => {
    if (exp.estado !== 'en-verificacion') return;
    setContratoBorrador(exp.contratoDefinitivo);
    setInformeBorrador(exp.informeTecnico);
    setPanelVerificado(true);
  };

  const confirmarMarcarVerificado = async () => {
    if (!contratoBorrador || !informeBorrador) {
      setAvisoCabecera('Para marcar como verificado debes aportar el contrato definitivo y el informe técnico.');
      return;
    }
    const ok = await confirmar({
      titulo: 'Marcar como verificado',
      mensaje: 'Se cerrará la verificación con el contrato definitivo y el informe técnico aportados.',
      textoConfirmar: 'Marcar como verificado',
    });
    if (!ok) return;
    actualizarExpediente(exp.id, {
      ...borrador,
      estado: 'verificado',
      contratoDefinitivo: contratoBorrador,
      informeTecnico: informeBorrador,
    });
    setPanelVerificado(false);
    setAvisoCabecera('Expediente marcado como verificado.');
  };

  const marcarCerradoCobrado = async () => {
    if (exp.estado !== 'verificado') return;
    const ok = await confirmar({
      titulo: 'Marcar como cerrado y cobrado',
      mensaje: mensajeAvanceEstado('verificado') ?? 'El expediente se cerrará como cobrado.',
      textoConfirmar: 'Cerrar y cobrar',
    });
    if (!ok) return;
    actualizarExpediente(exp.id, { ...borrador, estado: 'vendido-cobrado' });
    setAvisoCabecera('Expediente cerrado y cobrado.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <Stack.Screen options={{ title: exp.referencia || 'Expediente' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 960, gap: 14 }}>
          <Cabecera
            exp={exp}
            r={r}
            bajoMinimo={bajoMinimo}
            minimoMwh={parametros.minimoMwhVerificacion}
            editandoCodigo={editandoCodigo}
            codigoBorrador={codigoBorrador}
            setCodigoBorrador={setCodigoBorrador}
            onEditarCodigo={() => {
              setCodigoBorrador(exp.referencia);
              setEditandoCodigo(true);
            }}
            onGuardarCodigo={guardarCodigo}
            onGuardarInformacion={guardarInformacion}
            onValidar={validarExpediente}
            onEnviarVerificacion={enviarAVerificacion}
            onMarcarVerificado={abrirMarcarVerificado}
            onCerradoCobrado={marcarCerradoCobrado}
            aviso={avisoCabecera}
          />

          <View style={{ flexDirection: lateral ? 'row' : 'column', gap: 14, alignItems: 'stretch' }}>
            <BarraPestanas pestana={pestana} onChange={setPestana} nActuaciones={exp.actuaciones.length} lateral={lateral} />

            <View style={{ flex: 1, gap: 14, minWidth: 0 }}>
              {pestana === 'expediente' ? (
                <PestanaExpediente
                  exp={exp}
                  r={r}
                  rolUsuario={usuario.rol}
                  onActualizar={(patch) => actualizarExpediente(exp.id, { ...borrador, ...patch })}
                  onEditar={() => router.push(`/expediente/${exp.id}/editar`)}
                  onDuplicar={() => {
                    const nuevo = duplicarExpediente(exp.id);
                    if (nuevo) router.replace(`/expediente/${nuevo}`);
                  }}
                  onEliminar={async () => {
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
              ) : (
                <PestanaActuaciones
                  exp={exp}
                  r={r}
                  onNueva={() => router.push(`/expediente/${exp.id}/actuacion/nueva`)}
                  onAbrir={(aId) => router.push(`/expediente/${exp.id}/actuacion/${aId}`)}
                  onDuplicar={(aId) => duplicarActuacion(exp.id, aId)}
                  onEliminar={async (a) => {
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
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={panelVerificado} transparent animationType="fade" onRequestClose={() => setPanelVerificado(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: radio, padding: 16, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: color.texto }}>Marcar como verificado</Text>
            <Text style={{ color: color.textoSuave, fontSize: 13.5 }}>
              Para cerrar la verificación aporta el contrato definitivo y el informe técnico del expediente.
            </Text>
            <CampoFoto
              etiqueta="Contrato definitivo"
              ayuda="PDF o imagen del contrato firmado."
              valor={contratoBorrador}
              onChange={setContratoBorrador}
              soloImagenes={false}
            />
            <CampoFoto
              etiqueta="Informe técnico"
              ayuda="PDF o imagen del informe técnico de verificación."
              valor={informeBorrador}
              onChange={setInformeBorrador}
              soloImagenes={false}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Boton titulo="Cancelar" variante="secundario" onPress={() => setPanelVerificado(false)} flex />
              <Boton titulo="Confirmar verificado" icono="checkmark" onPress={confirmarMarcarVerificado} flex />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Cabecera({
  exp,
  r,
  bajoMinimo,
  minimoMwh,
  editandoCodigo,
  codigoBorrador,
  setCodigoBorrador,
  onEditarCodigo,
  onGuardarCodigo,
  onGuardarInformacion,
  onValidar,
  onEnviarVerificacion,
  onMarcarVerificado,
  onCerradoCobrado,
  aviso,
}: {
  exp: Expediente;
  r: ResultadoExpediente;
  bajoMinimo: boolean;
  minimoMwh: number;
  editandoCodigo: boolean;
  codigoBorrador: string;
  setCodigoBorrador: (v: string) => void;
  onEditarCodigo: () => void;
  onGuardarCodigo: () => void;
  onGuardarInformacion: () => void;
  onValidar: () => void;
  onEnviarVerificacion: () => void;
  onMarcarVerificado: () => void;
  onCerradoCobrado: () => void;
  aviso: string | null;
}) {
  const puedeValidar = exp.estado === 'borrador' || exp.estado === 'en-verificacion';
  const puedeEnviar = exp.estado === 'borrador';
  const puedeVerificar = exp.estado === 'en-verificacion';
  const puedeCerrar = exp.estado === 'verificado';

  return (
    <Tarjeta style={{ backgroundColor: color.primario, borderColor: color.primario }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, gap: 4, minWidth: 220 }}>
          <Text style={{ color: '#CFE2F7', fontSize: 12.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Código del expediente CAE</Text>
          {editandoCodigo ? (
            <TextInput
              autoFocus
              value={codigoBorrador}
              onChangeText={setCodigoBorrador}
              onBlur={onGuardarCodigo}
              onSubmitEditing={onGuardarCodigo}
              placeholder="Ej. CAE-2026-014"
              placeholderTextColor="#9EC0E0"
              style={{ color: '#fff', fontSize: 22, fontWeight: '800', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#CFE2F7' }}
            />
          ) : (
            <Pressable onPress={onEditarCodigo} accessibilityRole="button" accessibilityLabel="Cambiar código del expediente">
              <Text testID="codigo-expediente" style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>
                {exp.referencia || 'Sin código'} <Text style={{ fontSize: 14, fontWeight: '500', color: '#CFE2F7' }}>✎</Text>
              </Text>
            </Pressable>
          )}
          <Text testID="cae-total" style={{ color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 8 }}>
            {formatoNumero(r.aeTotal)} kWh/año
          </Text>
          <Text style={{ color: '#CFE2F7' }}>
            {formatoNumero(r.energiaMWhAnio, 3)} MWh/año · {formatoNumero(r.cae)} CAE
          </Text>
          {bajoMinimo ? (
            <Text style={{ color: '#FDE68A', fontSize: 12.5, marginTop: 6 }}>
              Aviso: no alcanza el mínimo de {minimoMwh} MWh/año para verificación ({formatoNumero(r.energiaMWhAnio, 3)} MWh/año actuales).
            </Text>
          ) : (
            <Text style={{ color: '#BBF7D0', fontSize: 12.5, marginTop: 6 }}>Cumple el mínimo de {minimoMwh} MWh/año para verificación.</Text>
          )}
        </View>

        <View style={{ alignItems: 'stretch', gap: 7, minWidth: 200, maxWidth: 300, flexGrow: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: '#CFE2F7', fontSize: 12, fontWeight: '700' }}>Estado</Text>
            <Insignia texto={etiquetaEstado(exp.estado)} tono={tonoEstado(exp.estado)} />
          </View>
          <Text style={{ color: exp.validado ? '#BBF7D0' : '#FDE68A', fontSize: 11.5 }}>
            {exp.validado ? 'Validado internamente' : 'Pendiente de validar'}
          </Text>
          <BotonCabecera titulo="Guardar" icono="save-outline" onPress={onGuardarInformacion} tono="claro" />
          <BotonCabecera titulo="Validar expediente" icono="shield-checkmark-outline" onPress={onValidar} tono="claro" deshabilitado={!puedeValidar} />
          <BotonCabecera titulo="Enviar a verificación" icono="send-outline" onPress={onEnviarVerificacion} tono="acento" deshabilitado={!puedeEnviar} />
          <BotonCabecera titulo="Marcar como verificado" icono="checkmark-done-outline" onPress={onMarcarVerificado} tono="acento" deshabilitado={!puedeVerificar} />
          <BotonCabecera titulo="Cerrado y cobrado" icono="cash-outline" onPress={onCerradoCobrado} tono="ok" deshabilitado={!puedeCerrar} />
          {aviso ? <Text style={{ color: '#BBF7D0', fontSize: 11.5, textAlign: 'right' }}>{aviso}</Text> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 22, marginTop: 14, flexWrap: 'wrap' }}>
        <Resumen titulo="Actuaciones" valor={String(exp.actuaciones.length)} />
        <Resumen titulo="Ventanas" valor={`${r.ventanasCalculadas}/${r.ventanasTotales}`} />
        <Resumen titulo="Huecos" valor={`${formatoNumero(r.superficieHuecos)} m²`} />
      </View>
    </Tarjeta>
  );
}

function BotonCabecera({
  titulo,
  icono,
  onPress,
  tono,
  deshabilitado,
}: {
  titulo: string;
  icono: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tono: 'claro' | 'acento' | 'ok';
  deshabilitado?: boolean;
}) {
  const estilos =
    tono === 'acento'
      ? { fondo: color.acento, texto: '#78350F' }
      : tono === 'ok'
        ? { fondo: '#BBF7D0', texto: '#14532D' }
        : { fondo: '#fff', texto: color.primario };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: estilos.fondo,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        justifyContent: 'center',
        opacity: deshabilitado ? 0.38 : pressed ? 0.85 : 1,
      })}
    >
      <Ionicons name={icono} size={16} color={estilos.texto} />
      <Text style={{ color: estilos.texto, fontWeight: '700', fontSize: 13, textAlign: 'center' }}>{titulo}</Text>
    </Pressable>
  );
}

function BarraPestanas({
  pestana,
  onChange,
  nActuaciones,
  lateral,
}: {
  pestana: Pestana;
  onChange: (p: Pestana) => void;
  nActuaciones: number;
  lateral: boolean;
}) {
  const items: Array<{ id: Pestana; titulo: string; icono: 'document-text-outline' | 'home-outline'; detalle: string }> = [
    { id: 'expediente', titulo: 'Expediente', icono: 'document-text-outline', detalle: 'Datos, comprador y retorno' },
    { id: 'actuaciones', titulo: 'Actuaciones', icono: 'home-outline', detalle: `${nActuaciones} actuación${nActuaciones === 1 ? '' : 'es'}` },
  ];

  return (
    <View
      style={
        lateral
          ? {
              width: 220,
              backgroundColor: color.superficie,
              borderRadius: radio,
              borderWidth: 1,
              borderColor: color.borde,
              padding: 10,
              gap: 6,
              alignSelf: 'flex-start',
            }
          : {
              flexDirection: 'row',
              backgroundColor: color.superficie,
              borderRadius: radio,
              borderWidth: 1,
              borderColor: color.borde,
              padding: 6,
              gap: 6,
            }
      }
    >
      {lateral ? (
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: color.textoSuave, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 8, paddingTop: 4, paddingBottom: 6 }}>
          Navegación CAE
        </Text>
      ) : null}
      {items.map((item) => {
        const activa = pestana === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: activa }}
            onPress={() => onChange(item.id)}
            style={({ pressed }) => ({
              flex: lateral ? undefined : 1,
              flexDirection: lateral ? 'row' : 'column',
              alignItems: lateral ? 'center' : 'center',
              gap: lateral ? 10 : 4,
              paddingVertical: lateral ? 12 : 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: activa ? color.primarioSuave : pressed ? color.fondo : 'transparent',
              borderWidth: activa ? 1 : 0,
              borderColor: activa ? color.primario : 'transparent',
            })}
          >
            <Ionicons name={item.icono} size={20} color={activa ? color.primario : color.textoSuave} />
            <View style={{ flex: lateral ? 1 : undefined, alignItems: lateral ? 'flex-start' : 'center' }}>
              <Text style={{ fontWeight: '700', fontSize: 14, color: activa ? color.primario : color.texto }}>{item.titulo}</Text>
              {lateral ? <Text style={{ fontSize: 11.5, color: color.textoSuave }}>{item.detalle}</Text> : null}
            </View>
            {lateral && item.id === 'actuaciones' ? (
              <View style={{ backgroundColor: activa ? color.primario : color.fondo, borderRadius: 999, minWidth: 24, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: activa ? '#fff' : color.textoSuave, fontWeight: '700', fontSize: 12, textAlign: 'center' }}>{nActuaciones}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function PestanaExpediente({
  exp,
  r,
  rolUsuario,
  onActualizar,
  onEditar,
  onDuplicar,
  onEliminar,
}: {
  exp: Expediente;
  r: ResultadoExpediente;
  rolUsuario: RolUsuario;
  onActualizar: (patch: Partial<Expediente>) => void;
  onEditar: () => void;
  onDuplicar: () => void;
  onEliminar: () => void;
}) {
  const s = exp.sujeto;
  const g = exp.gestor;
  const intermediario = esIntermediarioInstalador(rolUsuario);
  const precio = exp.valorEconomicoEurPorMWhAnio;

  return (
    <>
      <View style={{ backgroundColor: color.primarioSuave, borderRadius: radio, padding: 12, borderWidth: 1, borderColor: '#B7D0EA' }}>
        <Text style={{ color: color.primario, fontWeight: '700', fontSize: 13 }}>Pestaña Expediente CAE</Text>
        <Text style={{ color: color.textoSuave, fontSize: 12.5, marginTop: 2 }}>
          {intermediario
            ? 'SO/SD, PRECIO AHORRO CAE, fee, gestor y propietario inicial (en actuaciones).'
            : 'SO/SD, PRECIO AHORRO CAE (tu ROI = MWh × ese precio) y certificadora.'}
        </Text>
      </View>

      <Tarjeta>
        <Text style={{ fontSize: 16, fontWeight: '700', color: color.texto, marginBottom: 4 }}>PRECIO AHORRO CAE y retorno</Text>
        <Text style={{ color: color.textoSuave, fontSize: 12.5, marginBottom: 12 }}>
          PRECIO AHORRO CAE = €/MWh·año que el SO/SD/intermediario paga al propietario inicial por el ahorro del expediente.
          {intermediario
            ? ' Tu ROI = MWh/año × fee (€/MWh·año).'
            : ' Tu ROI = MWh/año × PRECIO AHORRO CAE.'}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
          <DatoEco
            titulo="PRECIO AHORRO CAE"
            valor={precio === undefined ? '—' : `${formatoNumero(precio)} €/MWh·año`}
            sub="Pago al propietario inicial por MWh/año"
          />
          {intermediario ? (
            <DatoEco
              titulo="Fee pactado"
              valor={
                exp.feeIntermediarioEurPorMWhAnio === undefined
                  ? '—'
                  : `${formatoNumero(exp.feeIntermediarioEurPorMWhAnio)} €/MWh·año`
              }
              sub="€ por MWh·año de los expedientes generados"
            />
          ) : null}
          <DatoEco
            titulo="ROI €"
            valor={r.retornoEconomicoEur === null ? '—' : `${formatoNumero(r.retornoEconomicoEur)} €`}
            sub={
              intermediario
                ? exp.feeIntermediarioEurPorMWhAnio !== undefined
                  ? `${formatoNumero(r.energiaMWhAnio, 3)} MWh/año × ${formatoNumero(exp.feeIntermediarioEurPorMWhAnio)} €/MWh·año`
                  : 'Falta fee pactado (€/MWh·año)'
                : precio !== undefined
                  ? `${formatoNumero(r.energiaMWhAnio, 3)} MWh/año × ${formatoNumero(precio)} €/MWh·año`
                  : 'Falta PRECIO AHORRO CAE (€/MWh·año)'
            }
            destacado
          />
        </View>
        {intermediario && precio !== undefined ? (
          <Text style={{ color: color.textoSuave, fontSize: 12.5, marginTop: 10 }}>
            Valor bruto al propietario (PRECIO AHORRO CAE × MWh):{' '}
            {r.valorBrutoPropietarioEur === null ? '—' : `${formatoNumero(r.valorBrutoPropietarioEur)} €`}
          </Text>
        ) : null}
      </Tarjeta>

      <ListaAvisos avisos={r.avisos} />

      <Seccion
        titulo="Contrato de compraventa del CAE"
        ayuda="Adjunta el contrato de compraventa del CAE de este expediente."
      >
        <CampoFoto
          etiqueta="Contrato de compraventa"
          ayuda="PDF o imagen del contrato firmado."
          valor={exp.contratoCompraventa}
          onChange={(a) => onActualizar({ contratoCompraventa: a })}
          soloImagenes={false}
        />
      </Seccion>

      <Seccion
        titulo="Certificadora del CAE"
        ayuda="Datos y nº de referencia de la certificadora que verifica el CAE."
      >
        <CampoTexto
          etiqueta="Certificadora"
          valor={exp.certificadoraNombre}
          onChange={(v) => onActualizar({ certificadoraNombre: v })}
          placeholder="Nombre o razón social de la certificadora"
        />
        <CampoTexto
          etiqueta="Nº de referencia"
          valor={exp.certificadoraReferencia}
          onChange={(v) => onActualizar({ certificadoraReferencia: v })}
          placeholder="Referencia del expediente en la certificadora"
        />
        <CampoTexto
          etiqueta="Información adicional"
          valor={exp.certificadoraInfo}
          onChange={(v) => onActualizar({ certificadoraInfo: v })}
          placeholder="Contacto, observaciones, fechas…"
          multilinea
        />
      </Seccion>

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Boton titulo="Editar expediente" variante="secundario" icono="create-outline" onPress={onEditar} />
        <Boton titulo="Duplicar" variante="secundario" icono="copy-outline" onPress={onDuplicar} />
        <Boton titulo="Eliminar" variante="peligro" icono="trash-outline" onPress={onEliminar} />
      </View>

      <Seccion titulo="Sujeto obligado / delegado (comprador)">
        <Fila etiqueta="Tipo" valor={etiquetaTipoSujeto(s.tipo === 'intermediario' ? 'delegado' : s.tipo)} />
        <Fila etiqueta="Razón social" valor={s.razonSocial || '—'} />
        <Fila etiqueta="NIF/CIF" valor={s.nifNie || '—'} />
        <Fila etiqueta="Domicilio" valor={s.domicilio || '—'} />
        <Fila etiqueta="Contacto" valor={[s.telefono, s.email].filter(Boolean).join(' · ') || '—'} />
        <Fila etiqueta="Representante" valor={[s.representante.nombre, s.representante.nifNie].filter(Boolean).join(' · ') || '—'} />
      </Seccion>

      {intermediario ? (
        <>
          <Seccion titulo="Intermediario / instalador (gestión CAE)">
            <Fila etiqueta="Rol" valor={etiquetaRolGestor(g.rol)} />
            <Fila etiqueta="Razón social" valor={g.razonSocial || '—'} />
            <Fila etiqueta="NIF/CIF" valor={g.nifNie || '—'} />
            <Fila etiqueta="Contacto" valor={[g.telefono, g.email].filter(Boolean).join(' · ') || '—'} />
          </Seccion>
          <Seccion titulo="Propietario inicial del CAE (por actuación)" ayuda="Como intermediario/instalador debes indicar el propietario inicial en cada actuación.">
            {exp.actuaciones.length === 0 ? (
              <Text style={{ color: color.textoSuave }}>Aún no hay actuaciones. Añádelas en la pestaña Actuaciones.</Text>
            ) : (
              exp.actuaciones.map((a) => (
                <Fila
                  key={a.id}
                  etiqueta={a.etiqueta || 'Actuación'}
                  valor={[a.propietarioAhorro || a.cliente.nombre || '—', a.cliente.nifNie].filter(Boolean).join(' · ')}
                />
              ))
            )}
          </Seccion>
        </>
      ) : null}

      <Seccion titulo="Parámetros económicos">
        <Fila
          etiqueta="PRECIO AHORRO CAE"
          valor={precio === undefined ? '—' : `${formatoNumero(precio)} €/MWh·año`}
        />
        {intermediario ? (
          <Fila
            etiqueta="Fee pactado"
            valor={
              exp.feeIntermediarioEurPorMWhAnio === undefined
                ? '—'
                : `${formatoNumero(exp.feeIntermediarioEurPorMWhAnio)} €/MWh·año`
            }
          />
        ) : null}
        <Fila
          etiqueta="ROI €"
          valor={r.retornoEconomicoEur === null ? '—' : `${formatoNumero(r.retornoEconomicoEur)} €`}
        />
        {exp.notas ? <Fila etiqueta="Notas" valor={exp.notas} /> : null}
      </Seccion>
    </>
  );
}

function PestanaActuaciones({
  exp,
  r,
  onNueva,
  onAbrir,
  onDuplicar,
  onEliminar,
}: {
  exp: Expediente;
  r: ResultadoExpediente;
  onNueva: () => void;
  onAbrir: (id: string) => void;
  onDuplicar: (id: string) => void;
  onEliminar: (a: Actuacion) => void;
}) {
  return (
    <>
      <View style={{ backgroundColor: color.okSuave, borderRadius: radio, padding: 12, borderWidth: 1, borderColor: '#86EFAC' }}>
        <Text style={{ color: color.ok, fontWeight: '700', fontSize: 13 }}>Pestaña Actuaciones</Text>
        <Text style={{ color: color.textoSuave, fontSize: 12.5, marginTop: 2 }}>
          Cada actuación es un inmueble con su referencia catastral, ventanas y documentación. El expediente es la suma de todas ellas.
        </Text>
      </View>

      <Tarjeta>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: color.texto }}>Actuaciones ({exp.actuaciones.length})</Text>
            <Text style={{ color: color.textoSuave, fontSize: 13 }}>Unidad de trabajo del CAE por inmueble</Text>
          </View>
          <Boton titulo="Añadir actuación" icono="add" onPress={onNueva} />
        </View>

        {exp.actuaciones.length === 0 ? (
          <View style={{ marginTop: 12 }}>
            <Vacio
              icono="home-outline"
              titulo="Sin actuaciones todavía"
              texto="Cada actuación agrupa un inmueble (dirección, CP, referencia catastral, zona climática), sus ventanas y la documentación del apartado 5."
            />
          </View>
        ) : (
          <View style={{ marginTop: 14, gap: 12 }}>
            {r.actuaciones.map((ra) => {
              const a = exp.actuaciones.find((x) => x.id === ra.actuacionId)!;
              return <TarjetaActuacion key={a.id} a={a} ra={ra} onAbrir={onAbrir} onDuplicar={onDuplicar} onEliminar={onEliminar} />;
            })}
          </View>
        )}
      </Tarjeta>
    </>
  );
}

function TarjetaActuacion({
  a,
  ra,
  onAbrir,
  onDuplicar,
  onEliminar,
}: {
  a: Actuacion;
  ra: ResultadoActuacion;
  onAbrir: (id: string) => void;
  onDuplicar: (id: string) => void;
  onEliminar: (a: Actuacion) => void;
}) {
  const docs = TIPOS_DOCUMENTO.filter((t) => (a.documentacion[t.clave] ?? []).length > 0).length;
  return (
    <View style={{ borderWidth: 1, borderColor: color.borde, borderRadius: 10, padding: 12, gap: 8, backgroundColor: color.fondo }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontWeight: '700', fontSize: 15.5, color: color.texto }}>{a.etiqueta || 'Sin etiqueta'}</Text>
          <Text style={{ color: color.textoSuave, fontSize: 13 }} numberOfLines={2}>
            {[a.direccion, a.codigoPostal, a.municipio].filter(Boolean).join(', ') || 'Sin dirección'}
          </Text>
          {a.referenciaCatastral ? <Text style={{ color: color.textoSuave, fontSize: 12 }}>Ref. catastral {a.referenciaCatastral}</Text> : null}
          <Text style={{ color: color.textoSuave, fontSize: 12 }}>Propietario CAE: {a.propietarioAhorro || a.cliente.nombre || '—'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            <Insignia texto={etiquetaEstadoObra(a.estadoObra)} tono={tonoEstadoObra(a.estadoObra)} />
            {a.zonaInvierno && a.zonaVerano ? <Insignia texto={`Zona ${a.zonaInvierno}${a.zonaVerano}`} tono="neutro" /> : null}
            <Insignia texto={`Docs ${docs}/${TIPOS_DOCUMENTO.length}`} tono={docs === TIPOS_DOCUMENTO.length ? 'ok' : 'aviso'} />
          </View>
        </View>
        <BotonIcono icono="create-outline" etiqueta={`Abrir ${a.etiqueta}`} onPress={() => onAbrir(a.id)} />
        <BotonIcono icono="copy-outline" etiqueta={`Duplicar ${a.etiqueta}`} onPress={() => onDuplicar(a.id)} />
        <BotonIcono icono="trash-outline" peligro etiqueta={`Eliminar ${a.etiqueta}`} onPress={() => onEliminar(a)} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <Mini t="Ventanas" v={`${ra.ventanasCalculadas}/${a.ventanas.length}`} />
        <Mini t="AE" v={`${formatoNumero(ra.aeTotal)} kWh/año`} />
        <Mini t="CAE" v={formatoNumero(ra.cae)} fuerte />
      </View>
      {!ra.cumple ? <Insignia texto="Requisitos por revisar" tono="aviso" /> : null}
      <Boton titulo="Abrir actuación" variante="secundario" onPress={() => onAbrir(a.id)} />
    </View>
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
