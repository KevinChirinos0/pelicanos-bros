# Corrección de carga del panel administrativo

## Síntoma
Las secciones Cocina, Clientes y Menú podían quedarse con sus valores iniciales aunque hubiera datos guardados.

## Causas corregidas
1. `setCustomerSession()` borraba la sesión administrativa y `setAdminSession()` borraba la sesión del cliente. Al iniciar sesión desde otra pestaña del mismo origen, el panel administrativo podía perder su sesión. Las vistas tenían comprobaciones que regresaban silenciosamente y dejaban contadores en cero.
2. `initialize()` solo creaba los productos cuando faltaba la clave. Si `pb_productos_v1` existía como `[]`, el catálogo permanecía vacío.
3. Los paneles ahora muestran un mensaje explícito si falta la sesión administrativa.

## Cambios
- Sesión cliente y sesión admin permanecen independientes en sus respectivas claves.
- Iniciar sesión como administrador ya no elimina la sesión del cliente ni vacía su carrito.
- Iniciar sesión como cliente ya no invalida la sesión administrativa.
- Un catálogo vacío se inicializa con los nueve productos por defecto. Un catálogo no vacío conserva los precios, disponibilidad y rutas de imagen existentes.
- Las vistas del panel informan cuando no hay una sesión administrativa activa.

## Comprobaciones recomendadas
1. Iniciar sesión como cliente en `index.html`.
2. Iniciar sesión como administrador en `admin.html` en otra pestaña del mismo origen.
3. Confirmar que ambas sesiones siguen activas.
4. Abrir Cocina, Clientes y Menú; deben cargar los registros existentes.
5. Comprobar que `PBData.getAdminOrders().length`, `PBData.getAdminCustomers().length` y `PBData.getProducts().length` devuelven valores coherentes.
6. Confirmar que el carrito del cliente no se vacía al iniciar sesión administrativa.

## Limitación
Las sesiones siguen almacenadas en `localStorage`; esta separación facilita la demostración con dos pestañas, pero no es un control de seguridad de producción.
