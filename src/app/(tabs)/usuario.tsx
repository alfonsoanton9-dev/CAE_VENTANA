import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { calcularRoiUsuario } from '@/domain/calculo';
import { formatoNumero } from '@/domain/formato';
import { CARGOS_FIRMA, ROLES_USUARIO, esIntermediarioInstalador, type UsuarioPerfil } from '@/domain/tipos';
import { textoContratoColaboracion } from '@/domain/usuario';
import { useAlmacen } from '@/store/almacen';
import { Boton, CampoNumero, CampoTexto, Cargando, Interruptor, Nota, Pantalla, Selector, Seccion } from '@/ui/componentes';
import { CampoFoto } from '@/ui/DocumentosActuacion';
import { color, radio } from '@/ui/tema';

export default function Usuario() {
  const { cargado, usuario, guardarUsuario, expedientes, parametros } = useAlmacen();
  const [d, setD] = useState<UsuarioPerfil>(usuario);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    if (cargado) setD(usuario);
  }, [cargado, usuario]);

  const contrato = useMemo(() => textoContratoColaboracion(d), [d]);
  const esIntermediario = esIntermediarioInstalador(d.rol);
  const cambiado = JSON.stringify({ ...d, actualizadoEn: '' }) !== JSON.stringify({ ...usuario, actualizadoEn: '' });
  const roi = useMemo(
    () => calcularRoiUsuario(expedientes, parametros, d.rol, d.feePactadoEurPorMWhAnio),
    [expedientes, parametros, d.rol, d.feePactadoEurPorMWhAnio],
  );

  if (!cargado) return <Cargando />;

  const set = <K extends keyof UsuarioPerfil>(k: K, v: UsuarioPerfil[K]) => {
    setMensaje(null);
    setD((x) => ({ ...x, [k]: v }));
  };

  const guardar = () => {
    if (!d.nombre.trim() || !d.nifNie.trim()) {
      setMensaje({ tipo: 'error', texto: 'Indica al menos el nombre y el NIF/NIE del usuario.' });
      return;
    }
    if (esIntermediario && d.feePactadoEurPorMWhAnio === undefined) {
      setMensaje({ tipo: 'error', texto: 'Indica el fee pactado (€/MWh·año) del contrato de colaboración.' });
      return;
    }
    const aGuardar: UsuarioPerfil = esIntermediario
      ? d
      : { ...d, feePactadoEurPorMWhAnio: undefined, contratoColaboracion: undefined, contratoGeneradoAceptado: false };
    guardarUsuario(aGuardar);
    setD(aGuardar);
    setMensaje({ tipo: 'ok', texto: 'Perfil de usuario guardado.' });
  };

  return (
    <Pantalla
      pie={
        <>
          <Boton titulo="Descartar cambios" variante="secundario" deshabilitado={!cambiado} onPress={() => setD(usuario)} flex />
          <Boton titulo="Guardar perfil" icono="checkmark" onPress={guardar} flex />
        </>
      }
    >
      <Seccion titulo="Espacio de usuario" ayuda="Datos personales y de la sociedad desde la que operas en CAE Ventanas.">
        <CampoTexto etiqueta="Nombre y apellidos" valor={d.nombre} onChange={(v) => set('nombre', v)} requerido placeholder="Ej. Carlos Ruiz Méndez" />
        <Fila2>
          <CampoTexto etiqueta="NIF/NIE" valor={d.nifNie} onChange={(v) => set('nifNie', v.toUpperCase())} mayusculas requerido />
          <CampoTexto etiqueta="Teléfono" valor={d.telefono} onChange={(v) => set('telefono', v)} teclado="phone-pad" />
        </Fila2>
        <CampoTexto etiqueta="Correo electrónico" valor={d.email} onChange={(v) => set('email', v)} teclado="email-address" />
        <CampoTexto etiqueta="Dirección personal" valor={d.direccion} onChange={(v) => set('direccion', v)} />
      </Seccion>

      <Seccion titulo="Cargo y sociedad" ayuda="Posición con facultad de firma y entidad a la que representas (empresa, particular o comunidad de propietarios).">
        <Selector
          etiqueta="Cargo / posición de firma"
          opciones={CARGOS_FIRMA}
          valor={d.cargoFirma}
          onChange={(v) => v && set('cargoFirma', v)}
        />
        {d.cargoFirma === 'otro' ? (
          <CampoTexto etiqueta="Especifica el cargo" valor={d.cargoFirmaOtro} onChange={(v) => set('cargoFirmaOtro', v)} placeholder="Ej. Consejero delegado" />
        ) : null}
        <CampoTexto
          etiqueta="Sociedad / razón social"
          valor={d.sociedad}
          onChange={(v) => set('sociedad', v)}
          ayuda="Empresa, particular o comunidad de propietarios."
          placeholder="Ej. Energía Eficiencia del Centro, S.L. / Juan Pérez / CDP Calle Mayor 12"
        />
        <Fila2>
          <CampoTexto etiqueta="NIF/CIF" valor={d.nifSociedad} onChange={(v) => set('nifSociedad', v.toUpperCase())} mayusculas />
          <CampoTexto etiqueta="Domicilio" valor={d.domicilioSociedad} onChange={(v) => set('domicilioSociedad', v)} />
        </Fila2>
      </Seccion>

      <Seccion titulo="ROL del usuario">
        <Selector opciones={ROLES_USUARIO} valor={d.rol} onChange={(v) => v && set('rol', v)} />
      </Seccion>

      {esIntermediario ? (
        <Seccion
          titulo="Fee pactado"
          ayuda="Precio fijo por cada MWh/año que aportas a la plataforma en expedientes de tus clientes. Se autorellena en el contrato y prellena los expedientes."
        >
          <CampoNumero
            etiqueta="Fee pactado"
            unidad="€ por MWh·año de los expedientes generados"
            valor={d.feePactadoEurPorMWhAnio}
            onChange={(v) => set('feePactadoEurPorMWhAnio', v)}
            ayuda="Retorno del intermediario/instalador = MWh/año del expediente × este fee."
          />
        </Seccion>
      ) : (
        <Nota
          tono="aviso"
          texto="Como propietario inicial negocias tú la venta del CAE: no hay fee de intermediario. Tu ROI en cada expediente es el importe de venta (MWh/año × €/MWh·año). El comprador (SO/SD) se indica en el expediente. A modo informativo: tu contrato de colaboración será el contrato de compraventa de CAEs."
        />
      )}

      <Seccion
        titulo="ROI DE USUARIO"
        ayuda={
          esIntermediario
            ? 'Retorno por estado de los expedientes: MWh/año × fee €/MWh·año de cada uno.'
            : 'Valor económico de los CAE dados de alta: MWh/año × €/MWh·año de venta asociados a cada expediente.'
        }
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <CeldaRoi titulo="Borrador" valor={roi.borrador} n={roi.nExpedientes.borrador} mwh={roi.energiaMWhAnio.borrador} />
          <CeldaRoi
            titulo="En verificación"
            valor={roi.enVerificacion}
            n={roi.nExpedientes['en-verificacion']}
            mwh={roi.energiaMWhAnio['en-verificacion']}
          />
          <CeldaRoi titulo="Verificados" valor={roi.verificado} n={roi.nExpedientes.verificado} mwh={roi.energiaMWhAnio.verificado} />
          <CeldaRoi
            titulo="Tramitados y pagados"
            valor={roi.tramitadoPagado}
            n={roi.nExpedientes['vendido-cobrado']}
            mwh={roi.energiaMWhAnio['vendido-cobrado']}
          />
          <CeldaRoi titulo="ROI total" valor={roi.total} n={roi.nExpedientes.total} mwh={roi.energiaMWhAnio.total} destacado />
        </View>
      </Seccion>

      {esIntermediario ? (
        <Seccion titulo="Contrato de colaboración" ayuda="Adjunta el contrato firmado o genera y acepta el borrador automático precargado con tus datos y el fee.">
          <CampoFoto
            etiqueta="Contrato adjunto (PDF/imagen)"
            ayuda="Opcional si firmas el contrato generado en la app."
            valor={d.contratoColaboracion}
            onChange={(a) => set('contratoColaboracion', a)}
            soloImagenes={false}
          />
          <Nota
            tono="ok"
            texto="El texto se genera con tus datos y el fee. El sujeto obligado/delegado concreto se formaliza en cada expediente."
          />
          <View style={{ backgroundColor: color.fondo, borderRadius: 10, borderWidth: 1, borderColor: color.borde, padding: 12 }}>
            <Text style={{ fontFamily: 'monospace', fontSize: 12, color: color.texto, lineHeight: 18 }}>{contrato}</Text>
          </View>
          <Interruptor
            etiqueta="Contrato generado aceptado / firmado en la app"
            ayuda="Marca esta casilla cuando el representante con facultad de firma acepte el contrato generado."
            valor={d.contratoGeneradoAceptado}
            onChange={(v) => set('contratoGeneradoAceptado', v)}
          />
        </Seccion>
      ) : null}

      {mensaje ? <Nota tono={mensaje.tipo === 'ok' ? 'ok' : 'aviso'} texto={mensaje.texto} /> : null}
    </Pantalla>
  );
}

function CeldaRoi({
  titulo,
  valor,
  n,
  mwh,
  destacado,
}: {
  titulo: string;
  valor: number;
  n: number;
  mwh: number;
  destacado?: boolean;
}) {
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: 140,
        minWidth: 140,
        backgroundColor: destacado ? color.primarioSuave : color.fondo,
        borderRadius: radio,
        borderWidth: 1,
        borderColor: destacado ? color.primario : color.borde,
        padding: 12,
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: destacado ? color.primario : color.textoSuave, textTransform: 'uppercase' }}>
        {titulo}
      </Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: destacado ? color.primario : color.texto }}>{formatoNumero(valor)} €</Text>
      <Text style={{ fontSize: 11.5, color: color.textoSuave }}>
        {n} exp. · {formatoNumero(mwh, 3)} MWh/año
      </Text>
    </View>
  );
}

function Fila2({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{children}</View>;
}
