# Etapa 05 — Checkout y creación de pedidos (RF-06/RF-07)

Esta etapa implementa la confirmación del pedido desde el carrito, de acuerdo con los requerimientos RF-06 y RF-07 y con las reglas de negocio del documento oficial de Pelícanos Bros.

## Datos solicitados al cliente (RF-06)

- Fecha y hora de recojo mediante `datetime-local`.
- Teléfono de contacto.
- Método de pago declarado: efectivo, Yape, Plin o transferencia.
- Nota opcional para cocina, de hasta 300 caracteres.
- Resumen de líneas, personalizaciones, precios y total antes de confirmar.

La fecha mínima del control se actualiza al abrir el checkout. El valor mínimo se calcula para asegurar al menos 10 minutos completos de anticipación y se redondea al siguiente minuto. La capa de datos vuelve a validar la fecha al confirmar, porque el tiempo transcurre mientras el formulario está abierto.

## Creación del pedido (RF-07)

Al confirmar, `PBData.createOrder()`:

1. Verifica que exista una sesión de cliente y que corresponda al usuario indicado.
2. Comprueba que el carrito pertenezca a esa sesión y no esté vacío.
3. Valida fecha/hora, teléfono, método de pago y nota.
4. Vuelve a consultar cada producto y comprueba que exista y esté disponible.
5. Recalcula precios y personalizaciones desde el catálogo; no confía en totales enviados por la interfaz.
6. Conserva una instantánea de nombre, categoría, imagen, cantidades, personalizaciones, precio base, ajuste, precio unitario y subtotal de cada línea.
7. Genera un código único con formato `PB-0001`, `PB-0002`, etc. La secuencia toma en cuenta el contador y los códigos que ya existen para evitar repetirlos si el contador quedó atrasado.
8. Guarda el pedido con estado inicial `pendiente` (etiqueta visible “Recibido”) y pago `pendiente`.
9. Registra un evento de creación con fecha, cliente y estado inicial.
10. Vacía el carrito solo después de guardar el pedido correctamente.

## Datos guardados en el pedido

- `id`, `code`, `userId` y datos de referencia del cliente.
- `items`: instantánea de productos y cálculos aplicados.
- `total`, `paymentMethod`, `paymentStatus` y `status`.
- `pickupAt`, `phone`, `note`, `createdAt`, `updatedAt`.
- `events`: evento inicial de creación con actor y fecha.

El pedido queda asociado al `userId` de la sesión. El detalle del historial del cliente se desarrollará en RF-08. La confirmación actual muestra un comprobante con código, recojo, total, método declarado y estados iniciales.

## Métodos de pago y limitaciones

El método de pago es una declaración del cliente. Esta demo no cobra ni se conecta con una pasarela. Todo pedido nuevo empieza con `paymentStatus: "pendiente"`; la verificación manual corresponde al administrador y se conectará en RF-09. La interfaz informa expresamente esta limitación.

## Separación de responsabilidades

- `js/data.js`: validación de negocio, re-cálculo, código único, persistencia del pedido, evento inicial y vaciado del carrito.
- `js/store.js`: mínimo de fecha/hora, previsualización del resumen, envío del formulario y comprobante de confirmación.
- `index.html`: controles del checkout, resumen previo y comprobante.
- `css/styles.css`: estilos del resumen y del comprobante.

La interfaz construye contenido dinámico con `createElement()` y `textContent`, sin interpretar nombres o notas como HTML.

## Pruebas de lógica realizadas

- Inicialización de nueve productos y las cuatro órdenes de demostración.
- Cálculo del total desde el carrito: dos Pelícanos de pollo sin arroz más una Inca Kola = S/ 28.00.
- Rechazo de fecha/hora con menos de 10 minutos de anticipación.
- Conservación del carrito cuando la validación falla.
- Rechazo de teléfono inválido.
- Rechazo de método de pago no permitido.
- Rechazo cuando el `userId` no coincide con la sesión de cliente activa.
- Creación del siguiente pedido `PB-0005`, con total recalculado S/ 28.00.
- Estado inicial `pendiente` y estado de pago `pendiente`.
- Guardado del teléfono, método de pago, nota, fecha/hora, instantánea de precios y evento de creación.
- Búsqueda por código y filtro por `userId`.
- Vaciado del carrito tras el registro correcto.
- Evitar código duplicado cuando el contador persistido queda atrasado (`PB-0006`).

## Pruebas manuales en Live Server

1. Iniciar sesión como María o registrar un cliente.
2. Agregar uno o más productos y personalizar un Pelícano.
3. Pulsar “Continuar pedido”; revisar que aparezca el resumen de líneas y el total.
4. Intentar seleccionar una hora a menos de 10 minutos; el navegador debe impedirla o la capa de datos debe rechazarla.
5. Ingresar teléfono, método de pago y una nota opcional.
6. Confirmar. Debe aparecer un comprobante con el código `PB-000X`, estado “Recibido”, pago pendiente y total correcto.
7. Cerrar el comprobante. El carrito debe quedar vacío y la sección “Mis pedidos” debe reflejar el nuevo número de pedidos.
8. Ingresar al panel administrativo: el pedido debe quedar guardado para su gestión en las siguientes etapas.

## Seguridad y limitaciones

La capa de datos exige coincidencia de sesión y usuario, vuelve a calcular el pedido y valida los campos. Sin embargo, al operar completamente en el navegador, `localStorage` y las sesiones pueden ser modificados por quien controla el dispositivo. Estas comprobaciones mejoran la consistencia de la demostración, pero no sustituyen autenticación, autorización y persistencia en servidor. No almacenar información ni procesar pagos reales en esta demo.
