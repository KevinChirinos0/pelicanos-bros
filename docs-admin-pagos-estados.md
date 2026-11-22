# Gestión administrativa de pagos y estados — RF-09 / RF-10

## Alcance de esta etapa

Esta etapa habilita en `admin.html` la consulta administrativa de pedidos, la verificación manual del pago y la actualización controlada del estado del pedido. No implementa todavía el tablero operativo de cocina (RF-11), el historial de clientes del panel (RF-12), la edición del menú (RF-13), la exportación CSV (RF-14) ni la comanda (RF-15).

## RF-09 — Verificación de pagos

- El listado muestra el método declarado y el estado de pago.
- Un pago pendiente puede marcarse como pagado mediante el botón **Verificar pago**.
- Un pago pagado puede volver a pendiente para corregir una verificación manual equivocada.
- Cada modificación añade un evento `pago` con estado anterior, nuevo estado, fecha, rol e ID del administrador.
- Un pedido con estado `cancelado` no admite verificaciones ni correcciones posteriores de pago. La interfaz oculta el botón de pago y la capa de datos rechaza igualmente cualquier intento.
- Los pedidos cancelados con pago pendiente no se cuentan en la métrica de pagos pendientes.
- Si un pedido ya estaba marcado como pagado antes de cancelarse, ese registro histórico se conserva; esta demo no gestiona reembolsos.
- La demo no procesa pagos ni se conecta con Yape, Plin o bancos.

## RF-10 — Estado del pedido

Las transiciones se toman de las reglas centrales de `data.js`:

- `pendiente` (presentado como Recibido) → `en_preparacion` o `cancelado`.
- `en_preparacion` → `listo` o `cancelado`.
- `listo` → `entregado`.
- `entregado` y `cancelado` son estados finales.

La interfaz solo presenta las transiciones permitidas. La cancelación solicita confirmación. Cada transición genera un evento `cambio_estado`.

## Panel de pedidos

- Búsqueda por código, cliente, correo o teléfono.
- Filtro por estado del pedido, estado de pago y fecha de recojo.
- Orden de resultados por fecha de recojo, desde la capa de datos.
- Actualización manual y refresco periódico cada 30 segundos mientras el panel está visible.
- Resumen con pedidos del día, pedidos por preparar, pagos pendientes y ventas pagadas.

## Reglas de acceso de la demo

`PBData.getAdminOrders()`, `PBData.updatePaymentStatus()` y `PBData.updateOrderStatus()` requieren una sesión administrativa activa. Los eventos atribuyen la operación al ID obtenido de esa sesión, no a un actor suministrado por la interfaz.

Este control mejora la consistencia del prototipo, pero no constituye autorización segura: `localStorage` puede manipularse desde el navegador. Una versión de producción requiere API y validación de permisos en el servidor.

## Pruebas sugeridas

1. Sin sesión administrativa, intentar consultar con `PBData.getAdminOrders()` o cambiar un estado: debe rechazarse.
2. Iniciar sesión como `admin` y abrir Pedidos: deben mostrarse los pedidos.
3. Filtrar por pago pendiente y marcar uno como pagado: el estado cambia y se agrega un evento.
4. Volver a marcarlo como pendiente: se registra otro evento de corrección.
5. Cambiar un pedido Recibido a En preparación.
6. Cambiarlo de En preparación a Listo y luego a Entregado.
7. Intentar una transición no permitida (por ejemplo, Recibido a Entregado): debe rechazarse.
8. Cancelar un pedido Recibido o En preparación y confirmar el diálogo.
9. Comprobar que el historial del cliente refleja el pago y el nuevo estado después de actualizarlo.
10. Buscar por código, cliente, correo y teléfono; probar los filtros por estado y fecha de recojo.


## Regla adicional: pedidos cancelados

La cancelación cierra también la gestión de pago dentro de esta demo. No se puede marcar como pagado ni volver a pendiente después de cancelar el pedido. La restricción se valida en `PBData.updatePaymentStatus()` y se refleja en `admin.js` mostrando el mensaje **Pago bloqueado por cancelación**. Si el pago se había verificado antes de cancelar, el estado `pagado` se conserva como antecedente; no se interpreta como reembolso.
