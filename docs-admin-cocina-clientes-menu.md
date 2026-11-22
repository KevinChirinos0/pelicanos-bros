# Etapa 08 — Cocina, clientes y menú (RF-11, RF-12 y RF-13)

## RF-11 — Tablero de cocina
- Tres columnas: Por preparar (`pendiente`), En preparación (`en_preparacion`) y Listos (`listo`).
- Cada columna ordena los pedidos por `pickupAt` ascendente.
- Las tarjetas incluyen código, cliente, teléfono, hora de recojo, productos, personalizaciones, nota y método/estado de pago.
- Acciones: Recibido → En preparación → Listo → Entregado.
- Las actualizaciones reutilizan `PBData.updateOrderStatus`, que valida transiciones y registra eventos.

## RF-12 — Historial de clientes en administración
- El listado incluye nombre, correo, teléfono, número de pedidos, total pagado y último pedido.
- El total pagado suma pedidos marcados `pagado` y excluye pedidos cancelados, de acuerdo con las reglas de totales históricos del documento.
- “Ver historial” abre un diálogo accesible con todos los pedidos, productos, personalizaciones, importes, recojo, pago, nota y eventos.
- Las funciones administrativas requieren una sesión de administrador y no devuelven hashes de contraseña.

## RF-13 — Edición del menú
- El administrador selecciona un producto existente y modifica su precio base y disponibilidad.
- El nombre, categoría, descripción, imagen, créditos, personalización e identificador se conservan.
- “Restaurar menú original” restaura los nueve productos, precios y disponibilidad inicial. Los IDs y las rutas locales `img/products/` se conservan.
- La modificación del catálogo no reescribe los precios ni los detalles guardados en pedidos antiguos.

## Pruebas recomendadas
1. Entrar como `admin` / `Admin2026*`.
2. Cocina: comprobar que pedidos recibidos, en preparación y listos aparecen en su columna y ordenados por recojo.
3. Avanzar un pedido desde cocina y comprobar que cambia también en Pedidos y en el historial del cliente.
4. Clientes: comprobar cantidad de pedidos y abrir el historial de María y Juan.
5. Menú: cambiar el precio de un producto y su disponibilidad; abrir `index.html` en otra pestaña del mismo origen y comprobar los cambios.
6. Marcar un producto agotado y comprobar que la tienda lo muestra como agotado y no permite agregarlo.
7. Restaurar el menú y confirmar que vuelven los precios y la disponibilidad iniciales.

## Limitación
La autenticación y la autorización se ejecutan en el navegador para esta demostración estática. No constituyen controles de seguridad de producción. `localStorage` no sincroniza datos entre dispositivos.
