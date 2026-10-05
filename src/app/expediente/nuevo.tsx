import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { borradorExpedienteVacio } from '@/domain/fabrica';
import { esIntermediarioInstalador } from '@/domain/tipos';
import { useAlmacen } from '@/store/almacen';
import { FormularioExpediente } from '@/ui/FormularioExpediente';

export default function NuevoExpediente() {
  const router = useRouter();
  const { crearExpediente, usuario } = useAlmacen();
  const [inicial] = useState(() => {
    const b = borradorExpedienteVacio();
    if (esIntermediarioInstalador(usuario.rol)) {
      if (usuario.feePactadoEurPorMWhAnio !== undefined) b.feeIntermediarioEurPorMWhAnio = usuario.feePactadoEurPorMWhAnio;
      b.gestor = {
        rol: 'instalador',
        razonSocial: usuario.sociedad,
        nifNie: usuario.nifSociedad,
        telefono: usuario.telefono,
        email: usuario.email,
      };
    } else {
      // Propietario inicial: sin fee; el ROI es el importe de venta
      b.feeIntermediarioEurPorMWhAnio = undefined;
    }
    return b;
  });
  return (
    <>
      <Stack.Screen options={{ title: 'Nuevo expediente' }} />
      <FormularioExpediente
        inicial={inicial}
        rolUsuario={usuario.rol}
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
