# Modelo de datos — Pelícanos Bros

Este modelo toma como base el apartado **07. Datos** del documento oficial y conserva sus claves `pb_*_v1`. Se añaden detalles de líneas de pedido e historial para apoyar los requisitos funcionales de personalización, trazabilidad y claridad de precios.

## Entidades y relaciones

```text
USUARIO (1) ──────────── (N) PEDIDO
                              │
                              ├── (N) DETALLE_PEDIDO / items (instantánea)
                              │
                              └── (N) EVENTO (creación, pago y cambio de estado)

PRODUCTO (1) ─────────── (N) DETALLE_PEDIDO

SESIÓN_CLIENTE ──────────────> USUARIO
SESIÓN_ADMIN ────────────────> USUARIO
CARRITO ─────────────────────> PRODUCTO (por productId)
CONTADOR ────────────────────> genera el código PB-0001, PB-0002, ...
```

## 1. Usuario — `pb_usuarios_v1`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único. |
| `name` | string | Nombre completo. |
| `username` | string o null | Nombre de acceso, útil para administración. |
| `email` | string | Correo normalizado en minúsculas. |
| `phone` | string | Teléfono de contacto. |
| `passwordHash` | string | Hash PBKDF2-HMAC-SHA-256 con iteraciones y salt incluidos; nunca guardar la contraseña original. |
| `role` | string | `cliente` o `admin`. |
| `createdAt` | ISO date | Fecha de registro. |

La función `createCustomer()` solo registra clientes y no permite elegir el rol desde el formulario. El cliente puede autenticarse con su nombre de usuario (cuentas demo) o correo electrónico; el administrador usa su nombre de usuario. Las cuentas nuevas se registran con nombre, correo, teléfono y contraseña de al menos 6 caracteres, tal como indica el documento oficial.

Las cuentas de demostración se agregan de forma idempotente al inicializar el módulo: administrador `admin`; clientes `maria` y `juan`. En una instalación nueva también se crean cuatro pedidos de prueba con los estados descritos en el documento: María tiene uno pendiente y uno entregado; Juan tiene uno en preparación y uno entregado. Los detalles de productos de esos pedidos son datos ficticios de prueba, seleccionados del menú documentado; no representan ventas reales. Las credenciales de prueba se describen en el README. El campo `passwordHash` guarda PBKDF2-HMAC-SHA-256, 600,000 iteraciones y salt individual. Este mecanismo solo mejora el almacenamiento de la contraseña en la demo: el rol, los usuarios y la sesión siguen bajo control del navegador.

## 2. Producto — `pb_productos_v1`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único. |
| `name` | string | Nombre mostrado en el menú. |
| `category` | string | `pelicanos`, `bebidas` o `extras`. |
| `price` | number | Precio base en soles. |
| `image` | string | Ruta local o URL HTTP(S) de la imagen. |
| `imageCredit` | string | Atribución breve de la fotografía. |
| `imageSource` | string | Enlace a la ficha original de la fotografía. |
| `description` | string | Descripción corta. |
| `customizable` | boolean | Indica si admite personalización de acompañamientos. |
| `available` | boolean | Disponibilidad manual del producto. |
| `label` | string | Etiqueta opcional. |
| `createdAt`, `updatedAt` | ISO date | Fechas de creación y actualización. |

Los productos iniciales y sus precios se tomaron de la tabla **El motor de precios** del documento: pollo S/ 14.00, carne S/ 16.00, mixto S/ 18.00, chicha morada S/ 6.00, Inca Kola S/ 4.00, agua S/ 2.50, papa extra S/ 3.00, crema extra S/ 1.00 y ensalada extra S/ 2.00. La disponibilidad inicial se establece como activa para que el menú de demostración pueda mostrarse; el administrador podrá cambiarla.

## 3. Carrito — `pb_carrito_v1`

```js
{
  userId: null,
  items: [
    {
      id: "cart-...",
      productId: "prod-pollo",
      quantity: 2,
      customizations: {
        arroz: "normal",
        papa: "sin",
        ensalada: "normal",
        cremas: "extra"
      }
    }
  ],
  updatedAt: "2026-11-15T...Z"
}
```

Cada línea guarda un identificador propio (`id`), la referencia del producto, cantidad y elecciones. El identificador permite que los botones de aumentar, disminuir y quitar actúen sobre una línea concreta. El precio se calcula desde el producto actual y las reglas centralizadas; el navegador no necesita guardar un total editable. `PBData.calculateCart()` expone ese identificador como `cartItemId` en cada línea calculada, junto con precio unitario y total de línea.

## 4. Pedido — `pb_pedidos_v1`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador interno. |
| `code` | string | Código visible, por ejemplo `PB-0001`. |
| `userId` | string | Propietario del pedido. |
| `customer` | object | Instantánea del nombre, correo y teléfono. |
| `items` | array | Instantánea de productos, opciones y precios al confirmar. |
| `total` | number | Total final guardado en el momento de compra. |
| `paymentMethod` | string | Efectivo, Yape, Plin o transferencia. |
| `paymentStatus` | string | `pendiente` o `pagado`. |
| `status` | string | `pendiente`, `en_preparacion`, `listo`, `entregado` o `cancelado`. |
| `pickupAt` | ISO date | Fecha y hora de recojo. |
| `phone`, `note` | string | Contacto y nota para cocina. |
| `createdAt`, `updatedAt` | ISO date | Fechas de registro y modificación. |
| `events` | array | Historial de creación, pagos y cambios de estado. |

Cada elemento de `items` conserva `baseUnitPrice`, `customizationAdjustment`, `unitPrice` y `lineTotal`. Así, una modificación posterior del precio de un producto no cambia un pedido histórico.

### Estado inicial y etiqueta visible

El documento oficial establece que un pedido nace como `pendiente`. Para mantener esa terminología de almacenamiento y cumplir con la vista del requisito funcional, la interfaz mostrará ese estado como **Recibido**.

Transiciones permitidas por el módulo:

- `pendiente` → `en_preparacion` o `cancelado`.
- `en_preparacion` → `listo` o `cancelado`.
- `listo` → `entregado`.
- `entregado` y `cancelado` son estados finales.

## 5. Sesiones y contador

| Clave | Contenido |
|---|---|
| `pb_sesion_cliente_v1` | ID del cliente con sesión iniciada o `null`. |
| `pb_sesion_admin_v1` | ID del administrador con sesión iniciada o `null`. |
| `pb_contador_v1` | Último correlativo utilizado para generar códigos de pedido. |

## Reglas centrales implementadas en `js/data.js`

- Todos los accesos al almacenamiento se concentran en un único módulo.
- Se crean datos iniciales del menú solo cuando no existe la clave de productos.
- Se validan cantidades, precios, categorías, correo, teléfono, opciones, disponibilidad y hora mínima de recojo (10 minutos).
- El carrito permite acumular productos iguales con las mismas opciones, cambiar la cantidad entre 1 y 99, quitar líneas y recalcular subtotal/total.
- Se recalcula el precio desde los productos y ajustes vigentes al confirmar el pedido.
- Se guardan instantáneas de los precios y eventos para conservar la trazabilidad.
- El hash de contraseña se excluye de las consultas públicas de usuarios.
- La contraseña se deriva mediante PBKDF2-HMAC-SHA-256 con salt aleatorio por alta; las cuentas de demostración usan hashes precalculados con salt individual.
- Las funciones de autenticación separan los roles de cliente y administrador y evitan aceptar un usuario del otro rol.
- La sesión de cliente y la sesión administrativa son excluyentes en este navegador.
- Las imágenes aceptan únicamente rutas locales permitidas o URL HTTP/HTTPS.

## Limitaciones conocidas

Este es un modelo para una demostración estática. Un visitante puede inspeccionar y alterar `localStorage`, invocar funciones desde la consola y manipular el rol o los pedidos. Por tanto, el aislamiento por `userId`, la sesión y las comprobaciones administrativas son controles de consistencia del lado del cliente, no autorización segura. Para producción se necesita una API, autorización en servidor, almacenamiento relacional, HTTPS y hashing de contraseñas con un algoritmo adecuado como Argon2id o bcrypt.


## 6. Presentación y personalización del menú

La etapa 03 conecta los nueve productos con tarjetas renderizadas desde `PBData.getProducts()`. Las tarjetas muestran categoría, descripción, precio base y disponibilidad. Las imágenes son referenciales y sus autores/licencias se documentan en `docs-creditos-imagenes.md`.

Los tres Pelícanos permiten seleccionar arroz, papa, ensalada y cremas. Cada opción aplica el ajuste definido en `CUSTOMIZATION_GROUPS` y `PBData.calculateLine()` calcula precio unitario y total de la cantidad seleccionada. Las bebidas y extras se agregan sin opciones de acompañamiento.

La función `migrateProductPresentation()` completa descripciones y datos visuales ausentes de los productos existentes sin reemplazar precios ni disponibilidad guardados por el administrador.


## 7. Gestión del carrito (RF-05)

La interfaz `js/store.js` renderiza una línea por combinación de producto y personalización. Cada línea presenta imagen, nombre, opciones elegidas, precio por unidad, cantidad, subtotal de línea y controles para disminuir, aumentar o quitar. `index.html` contiene los totales generales; el subtotal y el total son iguales en esta etapa porque todavía no hay cargos adicionales. Las operaciones y el recálculo permanecen en `js/data.js`; el navegador guarda cada cambio en `pb_carrito_v1`. Los controles no sustituyen las validaciones de datos: `addCartItem()` y `updateCartQuantity()` comprueban nuevamente cantidad y disponibilidad.
