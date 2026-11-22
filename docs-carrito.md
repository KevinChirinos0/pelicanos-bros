# Etapa 04 — Gestión del carrito (RF-05)

Esta etapa completa la interacción del carrito de compra a partir del requerimiento RF-05 del documento del proyecto.

## Funciones para el cliente

- Agregar productos simples directamente desde la tarjeta.
- Personalizar un Pelícano y agregarlo con la cantidad indicada.
- Aumentar o disminuir la cantidad de una línea existente.
- Quitar una línea concreta del carrito.
- Consultar las unidades, subtotales por línea, subtotal general y total.
- Mantener las líneas en `localStorage` mediante `pb_carrito_v1` para que sigan disponibles al recargar la tienda.

## Reglas aplicadas

1. La cantidad de cada línea debe ser un entero entre 1 y 99.
2. Si se agrega el mismo producto con las mismas personalizaciones, se acumula la cantidad en la misma línea.
3. Si las personalizaciones son diferentes, se crea una línea separada.
4. Las bebidas y extras conservan su precio base y no reciben ajustes de acompañamientos.
5. No se pueden agregar productos agotados.
6. Si un producto que ya está en el carrito pasa a estar agotado, se muestra una advertencia, se bloquea el aumento de cantidad y se permite reducirlo o quitarlo.
7. Si un dato antiguo del carrito apunta a un producto que ya no existe o contiene una línea inválida, se muestra como no disponible para que pueda quitarse; el checkout queda bloqueado mientras exista una incidencia.
8. En esta etapa no se confirma el pedido ni se vacía el carrito al continuar. El checkout pertenece a RF-06.

## Separación de responsabilidades

- `js/data.js`: operaciones `addCartItem()`, `updateCartQuantity()`, `removeCartItem()`, `getCart()` y `calculateCart()`. Toda lectura y escritura continúa pasando por `PBData`.
- `js/store.js`: crea los controles de cada línea, escucha las acciones y vuelve a renderizar el resumen.
- `index.html`: contiene el resumen del carrito y los indicadores de subtotal y total.
- `css/styles.css`: presenta las líneas, fotografías, botones de cantidad y adaptación a pantallas pequeñas.

`calculateCart()` devuelve `cartItemId` en cada línea calculada. Ese identificador permite que los controles modifiquen o eliminen la línea exacta, incluso cuando un mismo producto aparece con distintas personalizaciones.

## Precios

El subtotal y el total coinciden en esta etapa porque todavía no hay cargos de envío, impuestos adicionales ni descuentos en el alcance documentado. Cada línea se vuelve a calcular con el precio vigente del producto y su personalización. Al confirmar el pedido en RF-06/RF-07, se guardará una instantánea del precio para conservar el importe histórico.

## Imágenes locales

Las rutas predeterminadas están en `DEFAULT_PRODUCT_PRESENTATION` dentro de `js/data.js` y apuntan a `img/products/`. Los archivos de imagen del usuario no se incluyen en este paquete; deben copiarse a esa carpeta con los nombres indicados en la tabla de rutas del README o en el código de presentación. Los campos `imageCredit` e `imageSource` conservan la atribución y la ficha de la fuente cuando corresponda.

## Seguridad y accesibilidad

- Los nombres y opciones se incorporan con `createElement()` y `textContent`; no se insertan como HTML.
- Los botones tienen `type="button"` y etiquetas accesibles específicas por producto.
- Los botones de disminuir/aumentar se deshabilitan al llegar a los límites aplicables.
- El contador, el contenido del carrito y el anunciador comunican cambios mediante regiones accesibles.
- La capa de datos vuelve a validar cantidades y disponibilidad; no depende únicamente de que los botones estén deshabilitados.
- `localStorage` sigue siendo editable por quien controla el navegador. Estas validaciones son de consistencia de la demo, no una barrera de seguridad de producción.

## Pruebas de lógica realizadas

- Inicialización de los nueve productos y rutas locales.
- Agregar un producto simple.
- Acumular la misma bebida en una línea.
- Modificar cantidad hacia arriba y hacia abajo.
- Agregar un Pelícano personalizado como una línea independiente.
- Verificar dos Pelícanos de pollo sin arroz: S/ 24.00.
- Recalcular subtotal con varios productos.
- Quitar una línea sin alterar las demás.
- Rechazar la adición de productos agotados.
- Bloquear el aumento de cantidad de un producto agotado y permitir su reducción o eliminación.
- Mantener visible una línea obsoleta para poder quitarla.

## Pruebas manuales en el navegador

1. Abrir `index.html` con Live Server.
2. Agregar una Inca Kola. Debe aparecer una línea con cantidad 1 y total S/ 4.00.
3. Pulsar `+`. Debe mostrar cantidad 2 y total S/ 8.00.
4. Pulsar `−`. Debe volver a cantidad 1 y total S/ 4.00.
5. Agregar otra Inca Kola. Debe acumularse en la misma línea.
6. Personalizar dos Pelícanos de pollo sin arroz. Debe aparecer otra línea por S/ 24.00.
7. Quitar la bebida. El subtotal debe quedar en S/ 24.00.
8. Quitar el Pelícano. El contador y los importes deben regresar a cero.
9. Recargar la tienda mientras haya una línea guardada. El carrito debe conservarla.

## Límite de esta etapa

RF-05 queda conectado. El siguiente bloque será RF-06 y RF-07: validar datos de recojo, pedir teléfono y método de pago declarado, registrar una nota para cocina, guardar el pedido y generar un código único. El botón "Continuar pedido" solo abre el flujo de acceso/checkout preparado; esta etapa no confirma ni guarda un pedido.
