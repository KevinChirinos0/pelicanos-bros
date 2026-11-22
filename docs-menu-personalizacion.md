# Etapa 03 — Menú y personalización

Esta etapa implementa los requerimientos RF-03 y RF-04 a partir de la documentación oficial de Pelícanos Bros.

## RF-03 — Menú por categorías

`index.html` contiene el contenedor `#product-grid` y los botones de categoría. `js/store.js` consulta los productos mediante `PBData.getProducts()` y genera las tarjetas de manera dinámica.

Las tres categorías son:

- Pelícanos
- Bebidas
- Extras

Cada tarjeta presenta nombre, descripción, precio base, categoría, disponibilidad e imagen referencial. Cuando el producto está agotado, la tarjeta lo indica y deshabilita la acción para agregarlo.

Los productos y precios iniciales son los documentados:

| Categoría | Producto | Precio |
|---|---|---:|
| Pelícanos | Pelícano de pollo completo | S/ 14.00 |
| Pelícanos | Pelícano de carne completo | S/ 16.00 |
| Pelícanos | Pelícano mixto completo | S/ 18.00 |
| Bebidas | Chicha morada 1 L | S/ 6.00 |
| Bebidas | Inca Kola 500 ml | S/ 4.00 |
| Bebidas | Agua mineral 625 ml | S/ 2.50 |
| Extras | Porción extra de papa | S/ 3.00 |
| Extras | Crema extra | S/ 1.00 |
| Extras | Ensalada extra | S/ 2.00 |

Los campos `description`, `image`, `imageCredit` e `imageSource` se guardan en los registros de productos. La función `migrateProductPresentation()` agrega los valores visuales que falten en datos creados en la etapa anterior sin reemplazar precios ni disponibilidad que ya hayan sido modificados.

## RF-04 — Personalización y cálculo

Los tres Pelícanos permiten configurar cuatro acompañamientos:

| Acompañamiento | Sin | Normal | Extra |
|---|---:|---:|---:|
| Arroz | −S/ 2.00 | S/ 0.00 | +S/ 2.00 |
| Papa | −S/ 2.00 | S/ 0.00 | +S/ 2.00 |
| Ensalada | −S/ 2.00 | S/ 0.00 | +S/ 2.00 |
| Cremas de la casa | −S/ 1.00 | S/ 0.00 | +S/ 1.00 |

Las reglas viven en `CUSTOMIZATION_GROUPS` dentro de `js/data.js`. La interfaz crea los selectores a partir de `PBData.getPublicConfig()` y obtiene la vista previa mediante `PBData.calculateLine()`. No se repiten las reglas de precio en `store.js`.

Ejemplo de prueba: dos Pelícanos de pollo sin arroz cuestan `2 × (S/ 14.00 − S/ 2.00) = S/ 24.00`.

Los productos de las categorías Bebidas y Extras no muestran personalización; se agregan con su precio base.

## Disponibilidad

La tarjeta muestra `Disponible` o `Agotado` en función de `product.available`. El botón se deshabilita cuando el artículo no está disponible. `PBData.addCartItem()` también rechaza productos agotados, para no depender únicamente del control visual.

## Seguridad y accesibilidad

- Los nombres y descripciones se insertan como texto mediante `textContent`/`createElement`; no se usa `innerHTML` para contenido dinámico del menú.
- Los botones de categoría exponen `aria-pressed` y una región de resultados `aria-live`.
- Las imágenes tienen texto alternativo y un marcador de respaldo cuando falta la imagen o no puede cargarse.
- Los enlaces de atribución abren la ficha de Wikimedia Commons en otra pestaña con `rel="noopener noreferrer"`.

## Imágenes y licencias

Las rutas predeterminadas de las imágenes son locales y se configuran en `DEFAULT_PRODUCT_PRESENTATION`, dentro de `js/data.js`, mediante la carpeta `img/products/`. Los créditos y las fichas de origen de las fotografías de terceros se conservan en `imageCredit` e `imageSource`; la lista de autores, licencias y fuentes está en `docs-creditos-imagenes.md`. El ZIP no incorpora las fotografías del usuario: deben colocarse manualmente en `img/products/` con los nombres de archivo definidos en las rutas. La tarjeta del Pelícano mixto muestra un marcador si su archivo no está disponible.

## Pruebas recomendadas

1. Abrir la tienda con `python -m http.server 5500` y navegar a `http://localhost:5500`.
2. Comprobar que la categoría Todos muestra nueve tarjetas.
3. Comprobar que Pelícanos, Bebidas y Extras muestran tres tarjetas cada una.
4. Abrir Pelícano de pollo, seleccionar `Sin` para arroz y cantidad `2`; la vista previa debe mostrar S/ 12.00 por unidad y S/ 24.00 de total.
5. Seleccionar `Extra` en arroz, papa, ensalada y cremas para el Pelícano de pollo; el total unitario debe ser S/ 21.00.
6. Agregar una bebida o un extra; debe usar el precio base y aumentar el resumen del carrito. La edición de cantidad y la eliminación de líneas se detallan en `docs-carrito.md`.
7. Marcar un producto como no disponible desde la capa `PBData.saveProduct()` y recargar; la tarjeta debe mostrar `Agotado`, deshabilitar el botón y `PBData.addCartItem()` debe rechazarlo.
8. Verificar que las fotos que no carguen muestren un marcador de respaldo y que los créditos abran la ficha correspondiente.

## Alcance de esta etapa

Se conecta la visualización del catálogo, filtros, disponibilidad, personalización y adición inicial de productos al carrito. La edición de cantidades y eliminación de líneas se completan en la etapa 04 (RF-05). El checkout y la creación del pedido corresponden a RF-06/RF-07.
