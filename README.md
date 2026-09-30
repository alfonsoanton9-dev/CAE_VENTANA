# CAE Ventanas

Aplicación móvil (iOS / Android) y web para gestionar **expedientes de Certificados de Ahorro Energético (CAE)** generados por la **renovación o sustitución de ventanas** en edificios de viviendas, según la ficha oficial **RES070 v1.1** y su **Anexo II** (coeficiente G por zona climática).

- Interfaz y textos en español.
- Un mismo código (Expo / React Native + TypeScript + `react-native-web`) para móvil y web.
- Persistencia **local** (AsyncStorage; `localStorage` en web). Sin backend ni autenticación.

| Expediente y desglose | Ventana | Ajustes |
| --- | --- | --- |
| ![Expediente](docs/capturas/05-expediente-con-ventanas.png) | ![Ventana](docs/capturas/04-ventana-formulario.png) | ![Ajustes](docs/capturas/07-ajustes.png) |

## Funcionalidades

- **Expedientes**: referencia, estado, referencia catastral, dirección, ámbito (Península, Illes Balears, Ceuta, Melilla), altitud, zona climática (ZCI A–E y ZCV 1–4), envolvente térmica final, cliente, propietario del ahorro, representante del solicitante (NIF/NIE), fechas de actuación, duración indicativa Di, Fp propio y notas. Se pueden crear, editar, duplicar y eliminar.
- **Ventanas** por expediente (añadir, editar, duplicar, eliminar; “guardar y añadir otra”): tipo de hueco, ubicación, unidades, superficie S, descripción y transmitancia anterior (Uhi) y nueva (Uhf), material del marco, rotura de puente térmico, clase de permeabilidad al aire, marcado CE, persiana con clase y transmitancia del cajón.
- **Cálculo** del ahorro (kWh/año) y de los CAE por ventana y para el total del expediente, con el **desglose paso a paso** de la fórmula.
- **Comprobación de requisitos** de la ficha (límite del 25 % de la envolvente, permeabilidad al aire por zona, rotura de puente térmico ≥ 16 mm, cajón de persiana, marcado CE, edificio existente de uso residencial privado).
- **Lista de documentación** justificativa (apartado 5 de la ficha) por expediente.
- **Ajustes**: todos los parámetros (tabla G del Anexo II, Fp, umbrales y límites, kWh por CAE…) son editables; los valores oficiales son los predeterminados y hay un botón para **restaurarlos**.

## Cómo ejecutarlo

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run web        # web en http://localhost:19457
npm start          # servidor de desarrollo de Expo (puerto 19457) para Expo Go / emuladores
npm test           # tests unitarios del cálculo (Vitest)
npm run typecheck  # comprobación de tipos
```

El puerto de desarrollo es `19457` (definido en `package.json`). Para móvil, escanea el QR de `npm start` con Expo Go, o usa `npm run android` / `npm run ios`.

## Estructura

```
src/
  domain/            Lógica pura (sin React): tipos, parámetros oficiales, cálculo y validaciones
    tipos.ts           Modelo de datos (Expediente, Ventana…)
    parametros.ts      Valores oficiales por defecto (tabla G, Fp, límites) y normalización
    calculo.ts         Fórmula de la ficha, desglose y comprobación de requisitos
    fabrica.ts         Creación / duplicado de expedientes y ventanas
    formato.ts         Formato y parseo de números (coma decimal) y fechas
  store/almacen.tsx  Estado global + persistencia local (AsyncStorage)
  ui/                Componentes y formularios reutilizables
  app/               Pantallas (Expo Router): lista, ajustes, expediente, ventana
tests/calculo.test.ts  Tests del cálculo contra los valores de las fichas
docs/capturas/         Capturas de la interfaz
```

## Cómo se calculan los CAE

Fórmula de la ficha RES070 (apartado 3), en energía final:

```
AE_TOTAL = Fp · Σᵢ (Uhiᵢ − Uhfᵢ) · Sᵢ · G      [kWh/año]
```

| Símbolo | Significado | Unidad | Valor oficial |
| --- | --- | --- | --- |
| `Fp` | Factor de ponderación (ajusta la demanda estimada al consumo real) | — | 1 |
| `Uhi` | Transmitancia de cada ventana sustituida | W/m²·K | dato de la ventana |
| `Uhf` | Transmitancia de cada ventana nueva | W/m²·K | dato de la ventana |
| `S` | Superficie del hueco (ventana y/o lucernario) | m² | dato de la ventana (× unidades) |
| `G` | Coeficiente según zona climática (Anexo II) | miles de horas·K/año | tabla siguiente |
| `n` | Ventanas con la misma referencia catastral | — | las del expediente |

Como `G` se expresa en **miles** de horas·K/año, el producto sale directamente en kWh/año. **1 CAE = 1 kWh** de ahorro de energía final (configurable en Ajustes).

**Coeficiente G (Anexo II)**, en miles de horas·K/año. Filas = zona climática de verano (ZCV), columnas = zona climática de invierno (ZCI). `—` = combinación no definida:

| ZCV \ ZCI | A | B | C | D | E |
| --- | --- | --- | --- | --- | --- |
| 1 | — | — | 44 | 60 | 74 |
| 2 | — | — | 45 | 60 | — |
| 3 | 25 | 32 | 46 | 61 | — |
| 4 | 26 | 33 | 46 | — | — |

**Ejemplo** (zona D3, G = 61): ventana de 2,10 m² que pasa de Uhi = 5,70 a Uhf = 1,40 W/m²·K
→ AE = 1 · (5,70 − 1,40) · 2,10 · 61 = **550,83 kWh/año**.

### Requisitos que se comprueban (avisos, no bloquean el cálculo)

| Requisito de la ficha | Comprobación |
| --- | --- |
| Actuación ≤ 25 % de la envolvente térmica final | Σ S / superficie de envolvente ≤ 25 % |
| Permeabilidad al aire ≤ 9 m³/h·m² (zonas C, D, E) o ≤ 27 m³/h·m² (A, B) | Clase de la ventana (Clase 3 ≈ 9; Clase 2 ≈ 27) frente al máximo de la zona |
| Marco metálico con rotura de puente térmico ≥ 16 mm | Sólo aluminio / acero |
| Cajón de persiana de Clase 4 y U inferior a 1,5 | Sólo si la ventana lleva persiana |
| Declaración de prestaciones y marcado CE | Confirmación en la ventana |
| Edificio existente de uso residencial privado, en Península, Illes Balears, Ceuta o Melilla | Interruptores y selector del expediente |

La duración indicativa **Di** se registra como dato administrativo y, conforme a la ficha, **no interviene en el cálculo** (hay un ajuste opcional para multiplicar por Di, desactivado por defecto).

## Supuestos pendientes de confirmar

Consulta el resumen entregado con esta versión; en resumen: equivalencia 1 CAE = 1 kWh de ahorro anual, tratamiento de Di, clases de permeabilidad UNE-EN 12207 distintas de la 3, unidades de la transmitancia del cajón, ahorros negativos, y obtención automática de la zona climática (no incluida: la tabla a-Anejo B del CTE no forma parte de las fichas).
