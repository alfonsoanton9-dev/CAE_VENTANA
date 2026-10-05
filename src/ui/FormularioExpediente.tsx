import { useState } from 'react';
import { Text, View } from 'react-native';
import { esIntermediarioInstalador, type ExpedienteBorrador, type RolUsuario } from '@/domain/tipos';
import { Boton, CampoNumero, CampoTexto, Insignia, Nota, Pantalla, Selector, Seccion } from './componentes';
import { CampoFoto } from './DocumentosActuacion';
import { etiquetaEstado, tonoEstado } from './estado';
import { color } from './tema';

const TIPOS_SUJETO = [
  { valor: 'obligado' as const, etiqueta: 'Sujeto obligado' },
  { valor: 'delegado' as const, etiqueta: 'Sujeto delegado' },
];

const ROLES_GESTOR = [
  { valor: 'instalador' as const, etiqueta: 'Instalador' },
  { valor: 'montador' as const, etiqueta: 'Montador' },
  { valor: 'partner' as const, etiqueta: 'Partner / intermediario' },
];

export function FormularioExpediente({
  inicial,
  textoGuardar,
  onGuardar,
  onCancelar,
  rolUsuario = 'intermediario-instalador',
}: {
  inicial: ExpedienteBorrador;
  textoGuardar: string;
  onGuardar: (e: ExpedienteBorrador) => void;
  onCancelar: () => void;
  /** Rol del usuario de la app: define reglas de fee / ROI y campos visibles. */
  rolUsuario?: RolUsuario;
}) {
  const [d, setD] = useState<ExpedienteBorrador>(inicial);
  const [intentado, setIntentado] = useState(false);
  const falta = d.referencia.trim() === '';
  const intermediario = esIntermediarioInstalador(rolUsuario);

  const guardar = () => {
    setIntentado(true);
    if (falta) return;
    onGuardar({
      ...d,
      referencia: d.referencia.trim(),
      // Propietario inicial: no aplica fee de intermediario
      feeIntermediarioEurPorMWhAnio: intermediario ? d.feeIntermediarioEurPorMWhAnio : undefined,
    });
  };

  return (
    <Pantalla
      pie={
        <>
          <Boton titulo="Cancelar" variante="secundario" onPress={onCancelar} flex />
          <Boton titulo={textoGuardar} icono="checkmark" onPress={guardar} flex />
        </>
      }
    >
      <Seccion titulo="Identificación del expediente" ayuda="El estado es un indicador de flujo: no se cambia aquí. Avanza desde la ficha del expediente.">
        <CampoTexto
          etiqueta="Referencia / nº de expediente"
          valor={d.referencia}
          onChange={(v) => setD((x) => ({ ...x, referencia: v }))}
          placeholder="Ej. CAE-2026-014"
          requerido
        />
        {intentado && falta ? <Text style={{ color: color.error, fontSize: 12.5 }}>La referencia del expediente es obligatoria.</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: color.textoSuave, fontSize: 13.5 }}>Estado actual</Text>
          <Insignia texto={etiquetaEstado(d.estado)} tono={tonoEstado(d.estado)} />
        </View>
      </Seccion>

      <Seccion
        titulo="Sujeto obligado / delegado (comprador del CAE)"
        ayuda="Contraparte de este expediente: quien compra el CAE. No forma parte del perfil de usuario; se indica aquí en cada expediente."
      >
        <Selector
          etiqueta="Tipo"
          opciones={TIPOS_SUJETO}
          valor={d.sujeto.tipo === 'intermediario' ? 'delegado' : d.sujeto.tipo}
          onChange={(v) => v && setD((x) => ({ ...x, sujeto: { ...x.sujeto, tipo: v } }))}
        />
        <CampoTexto
          etiqueta="Razón social"
          valor={d.sujeto.razonSocial}
          onChange={(v) => setD((x) => ({ ...x, sujeto: { ...x.sujeto, razonSocial: v } }))}
          placeholder="Empresa o entidad"
        />
        <Fila2>
          <CampoTexto
            etiqueta="NIF/CIF"
            valor={d.sujeto.nifNie}
            onChange={(v) => setD((x) => ({ ...x, sujeto: { ...x.sujeto, nifNie: v.toUpperCase() } }))}
            mayusculas
          />
          <CampoTexto
            etiqueta="Teléfono"
            valor={d.sujeto.telefono}
            onChange={(v) => setD((x) => ({ ...x, sujeto: { ...x.sujeto, telefono: v } }))}
            teclado="phone-pad"
          />
        </Fila2>
        <CampoTexto
          etiqueta="Domicilio"
          valor={d.sujeto.domicilio}
          onChange={(v) => setD((x) => ({ ...x, sujeto: { ...x.sujeto, domicilio: v } }))}
        />
        <CampoTexto
          etiqueta="Correo electrónico"
          valor={d.sujeto.email}
          onChange={(v) => setD((x) => ({ ...x, sujeto: { ...x.sujeto, email: v } }))}
          teclado="email-address"
        />
        <Fila2>
          <CampoTexto
            etiqueta="Representante legal"
            valor={d.sujeto.representante.nombre}
            onChange={(v) => setD((x) => ({ ...x, sujeto: { ...x.sujeto, representante: { ...x.sujeto.representante, nombre: v } } }))}
          />
          <CampoTexto
            etiqueta="NIF/NIE del representante"
            valor={d.sujeto.representante.nifNie}
            onChange={(v) =>
              setD((x) => ({ ...x, sujeto: { ...x.sujeto, representante: { ...x.sujeto.representante, nifNie: v.toUpperCase() } } }))
            }
            mayusculas
          />
        </Fila2>
      </Seccion>

      {intermediario ? (
        <Seccion
          titulo="Intermediario / instalador (gestión CAE)"
          ayuda="Tú gestionas el expediente. El propietario inicial del CAE se indica en cada actuación."
        >
          <Selector
            etiqueta="Rol"
            opciones={ROLES_GESTOR}
            valor={d.gestor.rol}
            onChange={(v) => v && setD((x) => ({ ...x, gestor: { ...x.gestor, rol: v } }))}
          />
          <CampoTexto
            etiqueta="Razón social"
            valor={d.gestor.razonSocial}
            onChange={(v) => setD((x) => ({ ...x, gestor: { ...x.gestor, razonSocial: v } }))}
          />
          <Fila2>
            <CampoTexto
              etiqueta="NIF/CIF"
              valor={d.gestor.nifNie}
              onChange={(v) => setD((x) => ({ ...x, gestor: { ...x.gestor, nifNie: v.toUpperCase() } }))}
              mayusculas
            />
            <CampoTexto
              etiqueta="Teléfono"
              valor={d.gestor.telefono}
              onChange={(v) => setD((x) => ({ ...x, gestor: { ...x.gestor, telefono: v } }))}
              teclado="phone-pad"
            />
          </Fila2>
          <CampoTexto
            etiqueta="Correo electrónico"
            valor={d.gestor.email}
            onChange={(v) => setD((x) => ({ ...x, gestor: { ...x.gestor, email: v } }))}
            teclado="email-address"
          />
          <Nota tono="aviso" texto="En cada actuación deberás indicar los datos del propietario inicial del CAE." />
        </Seccion>
      ) : (
        <Nota
          tono="ok"
          texto="Como propietario inicial eres tú quien negocia la venta. El comprador (SO/SD) está arriba; tu ROI será el importe de venta del CAE."
        />
      )}

      <Seccion
        titulo="PRECIO AHORRO CAE"
        ayuda="Precio que el sujeto obligado / delegado / intermediario paga al propietario inicial por cada MWh/año de ahorro de este expediente. Se fija en el expediente."
      >
        <CampoNumero
          etiqueta="PRECIO AHORRO CAE"
          unidad="€/MWh·año"
          valor={d.valorEconomicoEurPorMWhAnio}
          onChange={(v) => setD((x) => ({ ...x, valorEconomicoEurPorMWhAnio: v }))}
          ayuda="Importe unitario del ahorro CAE: € que recibe el propietario inicial por cada MWh/año del expediente."
          requerido
        />
        {intermediario ? (
          <CampoNumero
            etiqueta="Fee pactado"
            unidad="€ por MWh·año de los expedientes generados"
            valor={d.feeIntermediarioEurPorMWhAnio}
            onChange={(v) => setD((x) => ({ ...x, feeIntermediarioEurPorMWhAnio: v }))}
            ayuda="Tu retorno como intermediario/instalador (prellenado desde el perfil si lo tienes). ROI = MWh/año × fee."
          />
        ) : (
          <Nota tono="ok" texto="Como propietario inicial tu ROI = MWh/año × PRECIO AHORRO CAE. No aplica fee de intermediario." />
        )}
      </Seccion>

      <Seccion titulo="Contrato de compraventa del CAE" ayuda="Adjunta el contrato de compraventa del CAE de este expediente.">
        <CampoFoto
          etiqueta="Contrato de compraventa"
          ayuda="PDF o imagen del contrato firmado."
          valor={d.contratoCompraventa}
          onChange={(a) => setD((x) => ({ ...x, contratoCompraventa: a }))}
          soloImagenes={false}
        />
      </Seccion>

      <Seccion titulo="Certificadora del CAE" ayuda="Datos y nº de referencia de la certificadora que verifica el CAE.">
        <CampoTexto
          etiqueta="Certificadora"
          valor={d.certificadoraNombre}
          onChange={(v) => setD((x) => ({ ...x, certificadoraNombre: v }))}
          placeholder="Nombre o razón social de la certificadora"
        />
        <CampoTexto
          etiqueta="Nº de referencia"
          valor={d.certificadoraReferencia}
          onChange={(v) => setD((x) => ({ ...x, certificadoraReferencia: v }))}
          placeholder="Referencia del expediente en la certificadora"
        />
        <CampoTexto
          etiqueta="Información adicional"
          valor={d.certificadoraInfo}
          onChange={(v) => setD((x) => ({ ...x, certificadoraInfo: v }))}
          placeholder="Contacto, observaciones, fechas…"
          multilinea
        />
      </Seccion>

      <Seccion titulo="Notas del expediente">
        <CampoTexto etiqueta="Observaciones" valor={d.notas} onChange={(v) => setD((x) => ({ ...x, notas: v }))} multilinea />
      </Seccion>
    </Pantalla>
  );
}

function Fila2({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{children}</View>;
}
