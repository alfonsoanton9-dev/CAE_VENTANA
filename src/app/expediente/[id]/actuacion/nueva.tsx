import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { borradorActuacionVacio } from '@/domain/fabrica';
import { useAlmacen } from '@/store/almacen';
import { Cargando, Pantalla, Tarjeta, Vacio } from '@/ui/componentes';
import { FormularioActuacion } from '@/ui/FormularioActuacion';

export default function NuevaActuacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { cargado, obtenerExpediente, crearActuacion } = useAlmacen();
  const [inicial] = useState(borradorActuacionVacio);
  const exp = obtenerExpediente(id);

  if (!cargado) return <Cargando />;
  if (!exp)
    return (
      <Pantalla>
        <Tarjeta>
          <Vacio icono="alert-circle-outline" titulo="Expediente no encontrado" texto="Puede que se haya eliminado." />
        </Tarjeta>
      </Pantalla>
    );

  return (
    <>
      <Stack.Screen options={{ title: 'Nueva actuación' }} />
      <FormularioActuacion
        inicial={inicial}
        textoGuardar="Crear actuación"
        onCancelar={() => router.back()}
        onGuardar={(b) => {
          const creada = crearActuacion(exp.id, b);
          if (creada) router.replace(`/expediente/${exp.id}/actuacion/${creada.id}`);
          else router.back();
        }}
      />
    </>
  );
}
