import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { borradorExpedienteVacio } from '@/domain/fabrica';
import { useAlmacen } from '@/store/almacen';
import { FormularioExpediente } from '@/ui/FormularioExpediente';

export default function NuevoExpediente() {
  const router = useRouter();
  const { crearExpediente } = useAlmacen();
  const [inicial] = useState(borradorExpedienteVacio);
  return (
    <>
      <Stack.Screen options={{ title: 'Nuevo expediente' }} />
      <FormularioExpediente
        inicial={inicial}
        textoGuardar="Crear expediente"
        onCancelar={() => router.back()}
        onGuardar={(b) => {
          const creado = crearExpediente(b);
          router.replace(`/expediente/${creado.id}`);
        }}
      />
    </>
  );
}
