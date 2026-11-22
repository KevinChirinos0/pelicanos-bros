# Historial y seguimiento del cliente — RF-08

## Alcance

El cliente autenticado consulta exclusivamente los pedidos asociados a su `userId`. La vista forma parte de `index.html`, en la sección `#mis-pedidos`.

## Datos mostrados

Cada tarjeta del historial presenta:

- Código único del pedido (`PB-000X`).
- Estado del pedido: Recibido, En preparación, Listo para recoger, Entregado o Cancelado.
- Indicador visual de avance para pedidos no cancelados.
- Fecha y hora de recojo y fecha de creación.
- Productos, cantidades y personalizaciones guardadas en la instantánea del pedido.
- Total histórico registrado al confirmar el pedido.
- Método y estado del pago.
- Nota de cocina, cuando exista.
- Movimientos registrados en `events`, con descripción y fecha.

## Capa de datos

`PBData.getCustomerOrders()` obtiene al cliente desde `pb_sesion_cliente_v1` y filtra internamente `pb_pedidos_v1` por el ID de esa sesión. No recibe un `userId` proporcionado por la interfaz. `PBData.getCustomerOrderById(id)` aplica la misma regla para una consulta individual.

La lista se ordena de más reciente a más antigua según `createdAt`, usando `pickupAt` como respaldo para datos antiguos. La función administrativa general `getOrders()` conserva sus filtros para el panel.

## Actualización

- Se vuelve a dibujar después de iniciar sesión, cerrar sesión y confirmar un pedido.
- El botón «Actualizar historial» consulta nuevamente los datos locales.
- La vista se actualiza al recibir un evento `storage` de cambios en pedidos o sesión desde otra pestaña del mismo origen.
- También se actualiza cuando la pestaña de la tienda recupera el foco.

## Seguridad y límites

Los datos dinámicos se insertan mediante `createElement()` y `textContent`, sin interpretar notas, nombres ni descripciones como HTML. La capa de datos no permite pedir el historial de otro usuario mediante un parámetro arbitrario; utiliza la sesión activa.

La aplicación sigue siendo una demostración estática con `localStorage`. Una persona que controla el navegador puede manipular sesiones y pedidos desde las herramientas del desarrollador. El filtro por sesión es una regla de consistencia de la demo, no autorización segura de producción. Para producción se requiere una API que valide la identidad y la propiedad de cada pedido en el servidor.

## Pruebas sugeridas

1. Sin iniciar sesión, la sección solicita autenticación y no muestra pedidos.
2. Iniciar sesión como `maria` muestra PB-0001 y PB-0002, pero no PB-0003 ni PB-0004.
3. Iniciar sesión como `juan` muestra PB-0003 y PB-0004, pero no PB-0001 ni PB-0002.
4. Un cliente nuevo sin pedidos ve el estado vacío y el enlace para explorar el menú.
5. Después de confirmar una compra, el nuevo pedido aparece al inicio del historial.
6. La tarjeta refleja estado, pago, fecha de recojo, productos y total del pedido.
7. Abrir el historial en una pestaña y modificar el pedido desde otra pestaña del mismo origen actualiza la lista mediante `storage`; el botón manual permite recargarla.
8. Las notas y los nombres se muestran como texto, incluso si contienen caracteres como `<` o `>`.
