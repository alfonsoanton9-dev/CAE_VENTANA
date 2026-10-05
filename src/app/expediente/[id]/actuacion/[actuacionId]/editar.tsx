import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAlmacen } from '@/store/almacen';
import { Cargando, Pantalla, Tarjeta, Vacio } from '@/ui/componentes';
import { FormularioActuacion } from '@/ui/FormularioActuacion';

export default function EditarActuacion() {
  const { id, actuacionId } = useLocalSearchParams<{ id: string; actuacionId: string }>();
  const router = useRouter();
  const { cargado, obtenerActuacion, actualizarActuacion } = useAlmacen();
  const act = obtenerActuacion(id, actuacionId);

  if (!cargado) return <Cargando />;
  if (!act)
    return (
      <Pantalla>
        <Tarjeta>
          <Vacio icono="alert-circle-outline" titulo="Actuación no encontrada" texto="Puede que se haya eliminado." />
        </Tarjeta>
      </Pantalla>
    );

  const { id: _id, ventanas: _v, creadoEn: _c, actualizadoEn: _a, ...borrador } = act;
  return (
    <>
      <Stack.Screen options={{ title: 'Editar actuación' }} />
      <FormularioActuacion
        inicial={borrador}
        textoGuardar="Guardar cambios"
        onCancelar={() => router.back()}
        onGuardar={(b) => {
          actualizarActuacion(id, act.id, b);
          router.back();
        }}
      />
    </>
  );
}
