# Etapa 09 — Exportación CSV e impresión de comanda

## RF-14: exportación CSV

En `admin.html`, la sección Pedidos contiene el botón `Exportar CSV`. En `js/admin.js`, `exportFilteredOrdersCSV()` solicita los pedidos mediante `PBData.getAdminOrders(getOrderFilters())`; por eso se exportan los mismos resultados que aparecen en la tabla según la búsqueda, estado, pago y fecha de recojo actuales.

El archivo `pelicanos-pedidos-AAAA-MM-DD.csv` contiene: código, fecha de creación, cliente, correo, teléfono, fecha/hora de recojo, productos y personalizaciones, total en PEN, método de pago, estado de pago, estado del pedido y nota para cocina. Se genera con UTF-8 BOM y CRLF para mejorar la apertura en Excel. Las comillas se duplican y los valores textuales que comienzan con caracteres de fórmula (=, +, - o @, incluyendo espacios/tabulaciones iniciales) se neutralizan con un apóstrofo. El total se conserva como valor numérico.

Si no hay resultados, se muestra un mensaje y no se descarga un archivo vacío.

## RF-15: impresión de comanda

La acción `Imprimir comanda` está disponible en cada fila de Pedidos y en cada tarjeta activa de Cocina. `printKitchenComanda(orderId)` recupera el registro mediante `PBData.getOrderById()`, que exige sesión administrativa, y abre una ventana de vista previa. El contenido dinámico se inserta con `textContent` y nodos DOM, no mediante concatenación de datos del pedido en HTML.

La comanda incluye marca, código, estado, fecha/hora de recojo, creación, cliente, teléfono, productos, cantidades, opciones de acompañamiento, importes, total, método y estado de pago, y nota de cocina. La hoja está diseñada para ticket térmico de 80 mm. El usuario pulsa `Imprimir comanda` en la vista previa para abrir el diálogo del navegador, o `Cerrar` para salir sin imprimir.

Si la ventana emergente es bloqueada, el panel informa que se debe permitir para el sitio local. El tamaño de papel real depende de la impresora y de las preferencias seleccionadas en el diálogo de impresión.

## Archivos modificados

- `admin.html`: habilita el botón de exportación CSV.
- `js/admin.js`: exportación de pedidos filtrados y generación de la vista previa imprimible.
- `README.md`: estado de RF-14 y RF-15 actualizado.

## Validaciones recomendadas

1. Filtrar por estado y descargar CSV; comprobar que solo aparecen los pedidos filtrados.
2. Filtrar por pago y fecha de recojo; comprobar que los mismos filtros se aplican a la exportación.
3. Abrir el CSV en Excel y verificar tildes, comillas, saltos de línea y columnas.
4. Exportar con un filtro sin resultados; debe mostrar un aviso sin descargar un archivo vacío.
5. Imprimir una comanda desde Pedidos y desde Cocina.
6. Revisar que aparezcan personalizaciones, nota, contacto, recojo y estado de pago.
7. Probar texto de usuario con caracteres especiales; no debe interpretarse como HTML ni como fórmula CSV.
