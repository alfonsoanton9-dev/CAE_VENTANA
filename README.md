# CAE Ventanas

Aplicación móvil (iOS / Android) y web para gestionar **expedientes de Certificados de Ahorro Energético (CAE)** generados por la **renovación o sustitución de ventanas** en edificios de viviendas, según la ficha oficial **RES070 v1.1** y su **Anexo II** (coeficiente G por zona climática).

- Interfaz y textos en español.
- Un mismo código (Expo / React Native + TypeScript + `react-native-web`) para móvil y web.
- Persistencia **local** (AsyncStorage; `localStorage` en web). Sin backend ni autenticación.

| Expediente y desglose | Ventana | Ajustes |
| --- | --- | --- |
| ![Expediente](docs/capturas/05-expediente-con-ventanas.png) | ![Zona automática](docs/capturas/08-expediente-zona-automatica.png) | ![Ajustes zonas CTE](docs/capturas/09-ajustes-zonas-cte.png) |

## Funcionalidades

- **Expedientes**: referencia, estado, referencia catastral, dirección y **código postal**, ámbito territorial, **provincia deducida del CP** (editable), **altitud deducida de la dirección** (servicios públicos sin clave, con respaldo a la capital), **zona climática automática** según la tabla **a-Anejo B del CTE DB-HE** (ZCI A–E y ZCV 1–4, editable a mano con indicación del origen de cada dato), envolvente térmica final, cliente, propietario del ahorro, representante del solicitante (NIF/NIE), fechas de actuación, duración indicativa Di, Fp propio y notas. Se pueden crear, editar, duplicar y eliminar.
- **Ventanas** por expediente (añadir, editar, duplicar, eliminar; “guardar y añadir otra”): tipo de hueco, ubicación, unidades, superficie S, descripción y transmitancia anterior (Uhi) y nueva (Uhf), material del marco, rotura de puente térmico, clase de permeabilidad al aire, marcado CE, persiana con clase y transmitancia del cajón.
- **Cálculo** del ahorro (kWh/año) y de los CAE por ventana y para el total del expediente, con el **desglose paso a paso** de la fórmula.
- **Comprobación de requisitos** de la ficha (límite del 25 % de la envolvente, permeabilidad al aire por zona, rotura de puente térmico ≥ 16 mm, cajón de persiana, marcado CE, edificio existente de uso residencial privado).
- **Lista de documentación** justificativa (apartado 5 de la ficha) por expediente.
- **Ajustes**: todos los parámetros (tabla **G** del Anexo II, **tabla de zonas climáticas** del CTE, Fp, umbrales y límites, kWh por CAE, ignorar ahorros negativos…) son editables; los valores oficiales son los predeterminados y hay botones para **restaurarlos** (global o solo la tabla de zonas).

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
    parametros.ts      Valores oficiales por defecto (tabla G, zonas CTE, Fp, límites) y normalización
    zonasClimaticas.ts Tabla a-Anejo B (provincia + altitud → zona)
    datos/anejoB.ts    Datos oficiales de las 52 provincias
    altitud.ts         Geocodificación y elevación (Photon, Nominatim, Open-Meteo…)
    clima.ts           Orquestación provincia / altitud / zona para expedientes
    calculo.ts         Fórmula de la ficha, desglose y comprobación de requisitos
    fabrica.ts         Creación / duplicado de expedientes y ventanas
    formato.ts         Formato y parseo de números (coma decimal) y fechas
  store/almacen.tsx  Estado global + persistencia local (AsyncStorage)
  ui/                Componentes y formularios reutilizables
  app/               Pantallas (Expo Router): lista, ajustes, expediente, ventana
tests/                 Tests del cálculo, zonas climáticas y geocodificación (Vitest)
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

La duración indicativa **Di** se registra como dato administrativo y, conforme a la ficha, **no interviene en el cálculo** (hay un ajuste opcional para multiplicar por Di, **desactivado por defecto**).

Si **Uhf > Uhi**, el ahorro de esa ventana se **fuerza a 0 kWh por defecto** (con aviso en el desglose); se puede desactivar en Ajustes para que reste del total.

### Zona climática automática

1. **Provincia**: los dos primeros dígitos del código postal (01…52). Se puede corregir a mano.
2. **Altitud**: al indicar dirección y CP válido, la app consulta (sin claves API) **Photon** y **Nominatim** para geocodificar, y **Open-Meteo**, **OpenTopoData** o **Open-Elevation** para la cota. Si falla la red o la dirección, usa la **altitud de referencia h0 de la capital** de provincia (aviso visible). Siempre editable.
3. **Zona**: con provincia y altitud se aplica la **tabla a-Anejo B** del CTE DB-HE (tramos de altitud → zona tipo `D3`). La tabla completa está en **Ajustes** (editable por provincia, con restauración).
4. **Ceuta y Melilla**: en el CTE vigente y en versiones anteriores consultadas, **Ceuta = B3** (G = 32) y **Melilla = A3** (G = 25); no comparten la misma zona.
5. **Canarias** (CP 35/38): zonas con letra **α** u otras sin entrada en el Anexo II; la ficha RES070 no aplica y no hay G.

La precisión de la altitud depende del DEM (~25–90 m) y de si la geocodificación acierta la dirección o cae en el centro del CP: conviene revisar cota y zona antes de cerrar el expediente.

## Supuestos pendientes de confirmar

1. **1 CAE = 1 kWh**: la ficha da el ahorro en kWh/año y no define la conversión a CAE; se asume 1 CAE = 1 kWh de ahorro anual (ajustable). Si los CAE deben computarse sobre el ahorro acumulado en la vida útil, se puede activar “multiplicar por Di”.
2. **Di** no entra en el cálculo (así lo indica la nota 4 de la ficha).
3. **Clases de permeabilidad**: la ficha sólo cita “Clase 3” (≤ 9 m³/h·m²) y ≤ 27 m³/h·m²; el resto de equivalencias (clase 1 ≤ 50, clase 2 ≤ 27, clase 4 ≤ 3) proceden de la UNE-EN 12207 y son editables.
4. **Cajón de persiana**: la ficha escribe “inferior a 1,5 W/m2”; se interpreta como W/m²·K.
5. **Ahorros negativos**: por defecto se limitan a 0 con aviso; desactivable en Ajustes.
6. **Unidades**: se permite registrar varias ventanas idénticas en una fila (S × unidades).
7. **Tabla CTE**: digitada desde el DB-HE actual (tabla por altitud absoluta del emplazamiento); versiones antiguas usaban capital + h0 + Δh. El PDF del anejo puede contener erratas tipográficas en cabeceras de columnas.
