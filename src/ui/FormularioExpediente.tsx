import { useState } from 'react';
import { Text, View } from 'react-native';
import type { ExpedienteBorrador } from '@/domain/tipos';
import { Boton, CampoTexto, Pantalla, Selector, Seccion } from './componentes';
import { ESTADOS_EXPEDIENTE } from './estado';
import { color } from './tema';

const TIPOS_SUJETO = [
  { valor: 'obligado' as const, etiqueta: 'Sujeto obligado' },
  { valor: 'delegado' as const, etiqueta: 'Sujeto delegado' },
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
      <Seccion titulo="Identificación del expediente" ayuda="El expediente agrupa una o varias actuaciones y es la unidad que se lleva a verificación.">
        <CampoTexto
          etiqueta="Referencia / nº de expediente"
          valor={d.referencia}
          onChange={(v) => setD((x) => ({ ...x, referencia: v }))}
          placeholder="Ej. CAE-2026-014"
          requerido
        />
        {intentado && falta ? <Text style={{ color: color.error, fontSize: 12.5 }}>La referencia del expediente es obligatoria.</Text> : null}
        <Selector
          etiqueta="Estado del expediente"
          opciones={ESTADOS_EXPEDIENTE}
          valor={d.estado}
          onChange={(v) => v && setD((x) => ({ ...x, estado: v }))}
          ayuda="Borrador → en elaboración → verificado."
        />
      </Seccion>

      <Seccion titulo="Sujeto obligado / delegado" ayuda="Contrato a nivel de expediente. Habrá un sujeto por expediente.">
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

      <Seccion titulo="Notas del expediente">
        <CampoTexto etiqueta="Observaciones" valor={d.notas} onChange={(v) => setD((x) => ({ ...x, notas: v }))} multilinea />
      </Seccion>
    </Pantalla>
  );
}

function Fila2({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{children}</View>;
}
