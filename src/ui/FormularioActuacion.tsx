import { useState } from 'react';
import { Text, View } from 'react-native';
import { formatoNumero } from '@/domain/formato';
import { UBICACIONES, type ActuacionBorrador } from '@/domain/tipos';
import { useAlmacen } from '@/store/almacen';
import { Boton, CampoFecha, CampoNumero, CampoTexto, Interruptor, Pantalla, Selector, Seccion } from './componentes';
import { ESTADOS_OBRA } from './estado';
import { SeccionClima } from './SeccionClima';
import { color } from './tema';

export function FormularioActuacion({
  inicial,
  textoGuardar,
  onGuardar,
  onCancelar,
}: {
  inicial: ActuacionBorrador;
  textoGuardar: string;
  onGuardar: (a: ActuacionBorrador) => void;
  onCancelar: () => void;
}) {
  const { parametros } = useAlmacen();
  const [d, setD] = useState<ActuacionBorrador>(inicial);
  const [intentado, setIntentado] = useState(false);
  const set = <K extends keyof ActuacionBorrador>(k: K, v: ActuacionBorrador[K]) => setD((x) => ({ ...x, [k]: v }));
  const falta = d.etiqueta.trim() === '';

  const guardar = () => {
    setIntentado(true);
    if (falta) return;
    onGuardar({ ...d, etiqueta: d.etiqueta.trim() });
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
      <Seccion titulo="Identificación de la actuación" ayuda="Cada actuación es un inmueble / referencia catastral con sus ventanas y documentación.">
        <CampoTexto
          etiqueta="Etiqueta de la actuación"
          valor={d.etiqueta}
          onChange={(v) => set('etiqueta', v)}
          placeholder="Ej. Vivienda Calle Mayor 18, 3º B"
          requerido
        />
        {intentado && falta ? <Text style={{ color: color.error, fontSize: 12.5 }}>La etiqueta de la actuación es obligatoria.</Text> : null}
        <Selector etiqueta="Estado de la obra" opciones={ESTADOS_OBRA} valor={d.estadoObra} onChange={(v) => v && set('estadoObra', v)} />
        <CampoTexto
          etiqueta="Referencia catastral"
          valor={d.referenciaCatastral}
          onChange={(v) => set('referenciaCatastral', v.toUpperCase())}
          placeholder="20 caracteres"
          ayuda="Asociada a esta actuación (no al expediente completo)."
          mayusculas
        />
        <Fila2>
          <CampoFecha etiqueta="Fecha de inicio" valor={d.fechaInicio} onChange={(v) => set('fechaInicio', v)} />
          <CampoFecha etiqueta="Fecha de fin" valor={d.fechaFin} onChange={(v) => set('fechaFin', v)} />
        </Fila2>
        <CampoNumero
          etiqueta="Duración indicativa Di"
          unidad="años"
          valor={d.duracionAnios}
          onChange={(v) => set('duracionAnios', v)}
          ayuda="Recomendación (UE) 2019/1658 o criterio técnico. Dato administrativo: no interviene en el cálculo del ahorro."
        />
      </Seccion>

      <Seccion titulo="Edificio / vivienda">
        <CampoTexto etiqueta="Dirección del inmueble" valor={d.direccion} onChange={(v) => set('direccion', v)} />
        <Fila2>
          <CampoTexto etiqueta="Código postal" valor={d.codigoPostal} onChange={(v) => set('codigoPostal', v)} teclado="numeric" />
          <CampoTexto etiqueta="Municipio" valor={d.municipio} onChange={(v) => set('municipio', v)} />
        </Fila2>
        <Selector
          etiqueta="Ámbito territorial"
          ayuda="La ficha sólo aplica en la Península, las Illes Balears, Ceuta y Melilla."
          opciones={UBICACIONES}
          valor={d.ubicacion}
          onChange={(v) => v && set('ubicacion', v)}
        />
        <Interruptor etiqueta="Edificio existente" valor={d.edificioExistente} onChange={(v) => set('edificioExistente', v)} />
        <Interruptor
          etiqueta="Uso residencial privado"
          ayuda="Según el Anejo A del CTE DB HE."
          valor={d.usoResidencialPrivado}
          onChange={(v) => set('usoResidencialPrivado', v)}
        />
        <CampoNumero
          etiqueta="Superficie total de la envolvente térmica final"
          unidad="m²"
          valor={d.superficieEnvolventeM2}
          onChange={(v) => set('superficieEnvolventeM2', v)}
          ayuda={`Se usa para comprobar que los huecos rehabilitados no superan el ${parametros.umbralEnvolventePct} % (Anejo C del CTE DB HE).`}
        />
      </Seccion>

      <SeccionClima d={d} setD={setD} parametros={parametros} inicialTieneAltitud={inicial.altitudM !== undefined} />

      <Seccion titulo="Cliente / propietario">
        <CampoTexto etiqueta="Nombre o razón social" valor={d.cliente.nombre} onChange={(v) => set('cliente', { ...d.cliente, nombre: v })} />
        <Fila2>
          <CampoTexto etiqueta="NIF/NIE" valor={d.cliente.nifNie} onChange={(v) => set('cliente', { ...d.cliente, nifNie: v.toUpperCase() })} mayusculas />
          <CampoTexto etiqueta="Teléfono" valor={d.cliente.telefono} onChange={(v) => set('cliente', { ...d.cliente, telefono: v })} teclado="phone-pad" />
        </Fila2>
        <CampoTexto etiqueta="Correo electrónico" valor={d.cliente.email} onChange={(v) => set('cliente', { ...d.cliente, email: v })} teclado="email-address" />
        <CampoTexto etiqueta="Dirección postal del cliente" valor={d.cliente.direccion} onChange={(v) => set('cliente', { ...d.cliente, direccion: v })} />
        <CampoTexto
          etiqueta="Propietario inicial del ahorro de energía final"
          valor={d.propietarioAhorro}
          onChange={(v) => set('propietarioAhorro', v)}
          ayuda="Quien formaliza la declaración responsable (Anexo I de la ficha)."
        />
      </Seccion>

      <Seccion titulo="Parámetros de cálculo de la actuación">
        <CampoNumero
          etiqueta="Factor de ponderación Fp propio"
          valor={d.fpPersonalizado}
          onChange={(v) => set('fpPersonalizado', v)}
          placeholder={`Vacío = usar ajustes (${formatoNumero(parametros.fp, 2)})`}
          ayuda="Ajusta la demanda estimada al consumo real de energía final. Déjalo vacío para usar el valor de Ajustes."
        />
      </Seccion>

      <Seccion titulo="Notas">
        <CampoTexto etiqueta="Observaciones" valor={d.notas} onChange={(v) => set('notas', v)} multilinea />
      </Seccion>
    </Pantalla>
  );
}

function Fila2({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{children}</View>;
}
