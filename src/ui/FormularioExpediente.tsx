import { useState } from 'react';
import { Text, View } from 'react-native';
import type { ExpedienteBorrador } from '@/domain/tipos';
import { Boton, CampoNumero, CampoTexto, Insignia, Pantalla, Selector, Seccion } from './componentes';
import { etiquetaEstado, tonoEstado } from './estado';
import { color } from './tema';

const TIPOS_SUJETO = [
  { valor: 'obligado' as const, etiqueta: 'Sujeto obligado' },
  { valor: 'delegado' as const, etiqueta: 'Sujeto delegado' },
  { valor: 'intermediario' as const, etiqueta: 'Intermediario' },
];

const ROLES_GESTOR = [
  { valor: 'instalador' as const, etiqueta: 'Instalador' },
  { valor: 'montador' as const, etiqueta: 'Montador' },
  { valor: 'partner' as const, etiqueta: 'Partner' },
];

export function FormularioExpediente({
  inicial,
  textoGuardar,
  onGuardar,
  onCancelar,
}: {
  inicial: ExpedienteBorrador;
  textoGuardar: string;
  onGuardar: (e: ExpedienteBorrador) => void;
  onCancelar: () => void;
}) {
  const [d, setD] = useState<ExpedienteBorrador>(inicial);
  const [intentado, setIntentado] = useState(false);
  const falta = d.referencia.trim() === '';

  const guardar = () => {
    setIntentado(true);
    if (falta) return;
    onGuardar({ ...d, referencia: d.referencia.trim() });
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
        titulo="Comprador del CAE (SO / SD / intermediario)"
        ayuda="Sujeto obligado, delegado o intermediario que compra el CAE de este expediente."
      >
        <Selector
          etiqueta="Tipo"
          opciones={TIPOS_SUJETO}
          valor={d.sujeto.tipo}
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

      <Seccion
        titulo="Instalador / montador / partner"
        ayuda="Quien gestiona la documentación del CAE (instalador, montador o partner)."
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
      </Seccion>

      <Seccion
        titulo="Valor económico del CAE"
        ayuda="Precio €/MWh·año pagado al propietario del ahorro, y fee (%) del intermediario/instalador. El impacto = (AE kWh/1000) × precio × fee/100."
      >
        <CampoNumero
          etiqueta="Valor económico del CAE"
          unidad="€/MWh·año"
          valor={d.valorEconomicoEurPorMWhAnio}
          onChange={(v) => setD((x) => ({ ...x, valorEconomicoEurPorMWhAnio: v }))}
          ayuda="Precio que se paga al propietario del CAE por MWh de ahorro anual."
        />
        <CampoNumero
          etiqueta="Fee intermediario / instalador"
          unidad="%"
          valor={d.feeIntermediarioPct}
          onChange={(v) => setD((x) => ({ ...x, feeIntermediarioPct: v }))}
          ayuda="Porcentaje sobre el valor bruto del CAE destinado al intermediario o instalador."
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
