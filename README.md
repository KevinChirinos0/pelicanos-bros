# Pelícanos Bros — reconstrucción académica

Proyecto de práctica reconstruido **exclusivamente a partir del documento oficial y de los requisitos compartidos**. No se ha consultado ni reutilizado el código fuente del cliente.

## Tecnologías

- HTML5 semántico.
- CSS3 responsive.
- JavaScript vanilla.
- `localStorage` como persistencia local de demostración.

## Estructura

- `index.html`: tienda del cliente, catálogo, carrito, acceso/registro, checkout y comprobante de pedido.
- `admin.html`: interfaz del panel administrativo.
- `css/styles.css`: estilos de la tienda y el panel.
- `js/data.js`: modelo de datos, reglas de negocio y única capa de acceso a `localStorage`.
- `js/store.js`: interacción de la tienda, registro/acceso de clientes, menú, personalización, carrito y checkout.
- `js/admin.js`: acceso administrativo y control visual del panel.
- `img/products/`: fotografías locales de los nueve productos.
- `docs-modelo-datos.md`: entidades, relaciones, reglas y limitaciones.
- `docs-autenticacion.md`: registro, sesiones y cuentas de demostración.
- `docs-menu-personalizacion.md`: RF-03 y RF-04.
- `docs-carrito.md`: RF-05, reglas y pruebas.
- `docs-checkout-pedidos.md`: RF-06/RF-07, validaciones de recojo, métodos de pago, código único y pruebas.
- `docs-historial-cliente.md`: RF-08, consulta de pedidos propios, actualización y pruebas de aislamiento.
- `docs-admin-pagos-estados.md`: RF-09/RF-10, verificación manual de pagos, transiciones de estado y trazabilidad administrativa.
- `docs-admin-cocina-clientes-menu.md`: RF-11/RF-12/RF-13, tablero de cocina, historial administrativo de clientes y edición del menú.
- `docs-creditos-imagenes.md`: atribución de fotografías y licencias.

## Estado de reconstrucción

| Etapa | Alcance | Estado |
|---|---|---|
| 01 | Estructura e interfaz inicial | Completada |
| 02 | Registro y autenticación (RF-01/RF-02) | Implementada |
| 03 | Menú y personalización (RF-03/RF-04) | Implementada |
| 04 | Carrito: agregar, quitar, cambiar cantidad y ver total (RF-05) | Implementada |
| 05 | Checkout y creación del pedido (RF-06/RF-07) | Implementada |
| 06 | Historial y seguimiento del cliente (RF-08) | Implementada |
| 07A | Gestión de pagos y estados (RF-09/RF-10) | Implementada |
| 07B / 08 | Tablero de cocina, clientes y edición del menú (RF-11/RF-12/RF-13) | Implementada |
| 09 | Exportación CSV e impresión de comanda (RF-14/RF-15) | Implementada |
| 10 | Pruebas integrales de calidad, seguridad y accesibilidad | Pendiente |

## Cuentas de demostración

| Rol | Usuario | Correo | Contraseña |
|---|---|---|---|
| Administrador | `admin` | — | `Admin2026*` |
| Cliente | `maria` | `maria@demo.pe` | `Cliente2026*` |
| Cliente | `juan` | `juan@demo.pe` | `Cliente2026*` |

Las cuentas se incorporan automáticamente al iniciar la aplicación, sin sobrescribir otras cuentas existentes. En una instalación nueva se añaden cuatro pedidos ficticios: María tiene uno pendiente y otro entregado; Juan tiene uno en preparación y otro entregado. Son datos de prueba, no ventas reales.

El registro solicita nombre, correo, teléfono y contraseña de al menos 6 caracteres. El cliente puede iniciar sesión mediante su usuario de demostración o correo electrónico. El administrador accede por separado desde `admin.html`.

## Fotografías del menú

Las rutas predeterminadas se configuran en `DEFAULT_PRODUCT_PRESENTATION`, dentro de `js/data.js`, y utilizan la carpeta `img/products/`:

- `pollo.jpg`
- `carne.jpg`
- `mixto.jpg`
- `chicha-morada.jpg`
- `inca-kola.jpg`
- `agua-mineral.jpg`
- `papa-extra.jpg`
- `crema-extra.jpg`
- `ensalada-extra.jpg`

Este proyecto incluye nueve fotografías en `img/products/`. Las rutas predeterminadas se mantienen en `DEFAULT_PRODUCT_PRESENTATION`, dentro de `js/data.js`. Si sustituyes una fotografía, conserva el nombre del archivo o actualiza su ruta en esa constante. Los campos `imageCredit` e `imageSource` mantienen los datos de atribución de las fuentes correspondientes.

## Ejecutar localmente en Windows

Puedes utilizar **Python HTTP Server** o la extensión **Live Server** de Visual Studio Code. Con Python, abre una terminal en la carpeta `pelicanos-bros-inicio` y ejecuta:

```bash
python -m http.server 5500
```

Abre la tienda en `http://localhost:5500/index.html` y el panel en `http://localhost:5500/admin.html`. Utiliza exactamente el mismo origen (protocolo, host y puerto) para que ambas páginas compartan el `localStorage`. Deja la terminal abierta mientras pruebas.

Como alternativa, puedes hacer clic derecho en `index.html` y seleccionar **Open with Live Server**. No abras directamente con `file://`; el proyecto utiliza almacenamiento del navegador y Web Crypto.

## Reglas del carrito (RF-05)

- Las cantidades son enteros de 1 a 99.
- El mismo producto con las mismas personalizaciones se acumula en una línea.
- El mismo producto con opciones distintas crea otra línea.
- Cada línea permite aumentar, disminuir o quitar unidades.
- Las bebidas y extras conservan su precio base.
- Los productos agotados no se pueden agregar; si pasan a estar agotados dentro del carrito, se puede reducir su cantidad o quitarlos.
- La clave `pb_carrito_v1` conserva el carrito al recargar la tienda.
- Subtotal y total coinciden en esta etapa, porque todavía no se aplican cargos adicionales.

Las operaciones se realizan en `PBData`, mientras que `store.js` se encarga de presentar los controles y actualizar la interfaz. Consulta `docs-carrito.md` para las pruebas recomendadas.

## Checkout y creación de pedidos (RF-06/RF-07)

El cliente debe iniciar sesión para confirmar el carrito. El formulario registra fecha/hora de recojo (mínimo 10 minutos de anticipación), teléfono de contacto, método de pago declarado y nota opcional para cocina. El pedido se vuelve a calcular desde el catálogo al confirmar, conserva una instantánea de productos, personalizaciones y precios, recibe un código `PB-000X`, se guarda con estado `pendiente` (presentado al cliente como “Recibido”) y pago `pendiente`. La confirmación vacía el carrito solo después de guardar el pedido.

El prototipo no cobra ni procesa Yape, Plin, transferencias o efectivo. Solo registra el método declarado; el administrador deberá verificar el pago manualmente en la etapa administrativa. Revisa `docs-checkout-pedidos.md` para las reglas y pruebas.

## Etapa 09 — Exportación e impresión (RF-14/RF-15)

El panel exporta a CSV los pedidos que coinciden con los filtros activos (búsqueda, estado, pago y fecha de recojo). El archivo usa UTF-8 con BOM, incluye datos del pedido y protege celdas de texto que podrían interpretarse como fórmulas al abrirse en hojas de cálculo.

Desde la tabla de Pedidos y las tarjetas de Cocina se puede abrir una comanda imprimible en formato ticket. Incluye código, recojo, cliente, teléfono, detalle, personalizaciones, importes, método/estado de pago y nota para cocina. La impresión usa el diálogo del navegador; la vista previa puede cerrarse sin imprimir.

Consulta `docs-exportacion-comandas.md` para el formato, las funciones y las pruebas.

## Próxima etapa

Pruebas integrales de seguridad, accesibilidad y comportamiento responsive (RNF-01 a RNF-07).

## Nota de seguridad

Este es un prototipo estático de demostración. `localStorage`, roles y sesiones pueden ser inspeccionados o modificados por quien controla el navegador. El hash de contraseña en el cliente no equivale a autenticación de producción. No utilizar con cuentas ni datos reales. Para producción se necesita una API con autenticación y autorización en servidor, base de datos, HTTPS y controles adecuados.


## Administración de pagos y estados (RF-09/RF-10)

El panel `admin.html` permite buscar y filtrar pedidos por código, cliente, correo, teléfono, estado, estado de pago y fecha de recojo. Desde la tabla, el administrador puede marcar un pago como pagado o pendiente y avanzar el pedido únicamente por las transiciones válidas: recibido → en preparación → listo → entregado. La cancelación está permitida antes de que el pedido quede listo. Cada cambio añade un evento de trazabilidad. El panel actualiza los datos manualmente y cada 30 segundos mientras permanece visible. La verificación de pagos es manual; no se realiza ningún cobro. Consulta `docs-admin-pagos-estados.md`.


## Etapa 08 — Panel administrativo

Se implementaron RF-11, RF-12 y RF-13: tablero de cocina por hora de recojo, consulta de clientes e historial completo, y edición de precios/disponibilidad con restauración del menú original. Ver `docs-admin-cocina-clientes-menu.md`.


## Panel administrativo: cocina, clientes y menú (RF-11/RF-12/RF-13)

- **Cocina:** muestra pedidos recibidos, en preparación y listos en tres columnas, ordenados por hora de recojo. Las acciones avanzan el estado mediante las transiciones permitidas y registran eventos.
- **Clientes:** lista nombre, correo, teléfono, cantidad de pedidos, total pagado y último pedido. El total pagado excluye pedidos cancelados. La ventana de historial presenta los pedidos y sus movimientos.
- **Menú:** permite editar el precio base y la disponibilidad de los nueve productos. La opción de restaurar devuelve precios y disponibilidad iniciales. Las imágenes locales, descripciones, categorías e identificadores se conservan. Los pedidos antiguos mantienen sus precios históricos.

Las funciones de administración requieren una sesión con rol `admin` en la demostración local. Esta validación en JavaScript no equivale a autorización de servidor. Consulta `docs-admin-cocina-clientes-menu.md` para las pruebas.

## Corrección del panel administrativo (Etapa 8)

La sesión de cliente (`pb_sesion_cliente_v1`) y la sesión administrativa (`pb_sesion_admin_v1`) son independientes para permitir probar la tienda y el panel en pestañas distintas del mismo origen. Iniciar o cerrar una sesión en una interfaz no elimina la sesión de la otra. Si el catálogo guardado existe pero está vacío, la inicialización recupera los nueve productos predeterminados sin sobrescribir un catálogo no vacío.


## Exportación CSV e impresión de comanda (RF-14/RF-15)

- **CSV:** el botón Exportar CSV de Pedidos utiliza exactamente los filtros activos en pantalla. Exporta código, fechas, cliente, contacto, productos y personalizaciones, total, método/estado de pago, estado del pedido y nota de cocina.
- **Comanda:** la acción Imprimir comanda aparece en la tabla de Pedidos y en las tarjetas de Cocina. Abre una vista de ticket en otra ventana con un botón para invocar el diálogo de impresión del navegador. Si el navegador bloquea ventanas emergentes, hay que permitirlas para el sitio local.
- **Seguridad:** el texto dinámico de la comanda se agrega mediante `textContent`; el CSV escapa comillas y neutraliza prefijos típicos de fórmulas en campos de texto.


## Validación no funcional — RNF-01, RNF-05 y RNF-07

- RNF-01: validado manualmente por el usuario en escritorio, tablet y móvil; se ajustó la navegación móvil administrativa para mostrar sus cinco secciones sin desplazamiento horizontal.
- RNF-05: validado manualmente por el usuario en menú, carrito, checkout e historial.
- RNF-07: se añadieron enlaces de salto, nombres alternativos de imágenes, semántica de tablas y controles, navegación por teclado en pestañas y preferencia de movimiento reducido. Ver `docs-rnf07-accesibilidad.md` para el detalle y las comprobaciones manuales pendientes.
