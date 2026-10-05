# CAE Ventanas

Aplicación móvil (iOS / Android) y web para gestionar **expedientes de Certificados de Ahorro Energético (CAE)** generados por la **renovación o sustitución de ventanas** en edificios de viviendas, según la ficha oficial **RES070 v1.1** y su **Anexo II** (coeficiente G por zona climática).

- Interfaz y textos en español.
- Un mismo código (Expo / React Native + TypeScript + `react-native-web`) para móvil y web.
- Persistencia **local** (AsyncStorage; `localStorage` en web). Sin backend ni autenticación.

Repositorio: https://github.com/alfonsoanton9-dev/CAE_VENTANA

| Expediente y desglose | Ventana | Ajustes |
| --- | --- | --- |
| ![Expediente](docs/capturas/05-expediente-con-ventanas.png) | ![Zona automática](docs/capturas/08-expediente-zona-automatica.png) | ![Ajustes zonas CTE](docs/capturas/09-ajustes-zonas-cte.png) |

## Clonar y ejecutar (compañeros)

Requisitos: **Node.js 20 o superior** y npm.

```bash
git clone https://github.com/alfonsoanton9-dev/CAE_VENTANA.git
cd CAE_VENTANA
npm install
npm run web
```

Abre en el navegador: **http://localhost:19457**

Otros comandos útiles:

```bash
npm start          # Expo (QR / Expo Go / emuladores), puerto 19457
npm test           # tests unitarios (Vitest)
npm run typecheck  # comprobación de tipos TypeScript
npm run android    # Android
npm run ios        # iOS (macOS)
```

No hace falta configurar `.env` ni claves API: la app funciona en local al instalar dependencias.

## Funcionalidades

- **Espacio de usuario**: perfil (nombre, NIF, sociedad/empresa/particular/comunidad), rol (**propietario inicial** o **intermediario/instalador**), fee pactado en **€/MWh·año**, contrato de colaboración generado, y **ROI de usuario** agregado por estado de expediente.
- **Expedientes**: código, estado (borrador → verificación → verificado → cerrado y cobrado), sujeto obligado/delegado, gestor, precio €/MWh·año, fee, contrato de compraventa, datos y nº de referencia de la **certificadora**, retorno económico según rol.
- **Actuaciones** dentro de cada expediente (inmueble / catastro): clima automático (CP, altitud, zona CTE), cliente y propietario inicial del CAE, ventanas y documentación del apartado 5.
- **Ventanas**: Uhi/Uhf, marco, permeabilidad, persiana, fotos antes/después; validación de **Uhf frente a límites CTE** por zona (máximo y recomendado).
- **Cálculo** AE/CAE con desglose de la fórmula RES070.
- **Ajustes**: tabla G, zonas CTE, Fp, umbrales, tabla de transmitancia U por zona, etc. (restaurables a valores oficiales).

## Estructura

```
src/
  domain/              Lógica pura (tipos, cálculo, CTE, clima, usuario…)
  store/almacen.tsx    Estado + persistencia local
  ui/                  Componentes y formularios
  app/                 Pantallas Expo Router
    (tabs)/              Expedientes · Usuario · Ajustes
    expediente/          Alta, ficha, actuaciones y ventanas
tests/                   Vitest (cálculo, zonas, clima)
docs/capturas/           Capturas de la interfaz
```

## Cómo se calculan los CAE

Fórmula de la ficha RES070 (apartado 3), en energía final:

```
AE_TOTAL = Fp · Σᵢ (Uhiᵢ − Uhfᵢ) · Sᵢ · G      [kWh/año]
```

| Símbolo | Significado | Unidad | Valor oficial |
| --- | --- | --- | --- |
| `Fp` | Factor de ponderación | — | 1 |
| `Uhi` / `Uhf` | Transmitancia anterior / nueva | W/m²·K | dato de la ventana |
| `S` | Superficie del hueco | m² | dato (× unidades) |
| `G` | Coeficiente por zona (Anexo II) | miles de horas·K/año | tabla en Ajustes |

**1 CAE = 1 kWh** de ahorro de energía final (configurable en Ajustes).

### ROI según rol de usuario

- **Propietario inicial**: ROI = MWh/año × precio de venta €/MWh·año.
- **Intermediario / instalador**: ROI = MWh/año × fee pactado €/MWh·año.

### Transmitancia U (CTE) por zona de invierno

| Zona | Ejemplo | U máximo CTE | U recomendado |
| --- | --- | --- | --- |
| A | Canarias, costa sur | 3,5 | &lt; 2,0 |
| B | Costa mediterránea | 3,0 | &lt; 1,8 |
| C | Madrid, interior sur | 2,5 | &lt; 1,6 |
| D | Navarra, Castilla y León | 2,0 | &lt; 1,4 |
| E | Alta montaña | 1,8 | &lt; 1,2 |

### Zona climática automática

1. **Provincia** desde el código postal (editable).
2. **Altitud** por geocodificación pública (Photon, Nominatim, Open-Meteo…), con respaldo a la capital.
3. **Zona** con la tabla a-Anejo B del CTE DB-HE (editable en Ajustes).

## Supuestos pendientes de confirmar

1. **1 CAE = 1 kWh** (ajustable).
2. **Di** no entra en el cálculo por defecto.
3. Equivalencias de clases de permeabilidad UNE-EN 12207 (editables).
4. Cajón de persiana “inferior a 1,5” interpretado como W/m²·K.
5. Ahorros negativos forzados a 0 por defecto (desactivable).
6. Varias ventanas idénticas en una fila (S × unidades).
