import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { borradorActuacionVacio } from '@/domain/fabrica';
import { esIntermediarioInstalador } from '@/domain/tipos';
import { useAlmacen } from '@/store/almacen';
import { Cargando, Pantalla, Tarjeta, Vacio } from '@/ui/componentes';
import { FormularioActuacion } from '@/ui/FormularioActuacion';

export default function NuevaActuacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { cargado, obtenerExpediente, crearActuacion, usuario } = useAlmacen();
  const [inicial] = useState(() => {
    const b = borradorActuacionVacio();
    // Si el usuario es propietario inicial, precarga sus datos como titular del CAE
    if (!esIntermediarioInstalador(usuario.rol)) {
      b.cliente = {
        nombre: usuario.nombre,
        nifNie: usuario.nifNie,
        telefono: usuario.telefono,
        email: usuario.email,
        direccion: usuario.direccion,
      };
      b.propietarioAhorro = usuario.nombre;
    }
    return b;
  });
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
