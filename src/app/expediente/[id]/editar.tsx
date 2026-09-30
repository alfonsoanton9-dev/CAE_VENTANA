import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAlmacen } from '@/store/almacen';
import { Cargando, Tarjeta, Vacio, Pantalla } from '@/ui/componentes';
import { FormularioExpediente } from '@/ui/FormularioExpediente';

export default function EditarExpediente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { cargado, obtenerExpediente, actualizarExpediente } = useAlmacen();
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
  const { id: _id, ventanas: _v, creadoEn: _c, actualizadoEn: _a, ...borrador } = exp;
  return (
    <>
      <Stack.Screen options={{ title: 'Editar expediente' }} />
      <FormularioExpediente
        inicial={borrador}
        textoGuardar="Guardar cambios"
        onCancelar={() => router.back()}
        onGuardar={(b) => {
          actualizarExpediente(exp.id, b);
          router.back();
        }}
      />
    </>
  );
}
