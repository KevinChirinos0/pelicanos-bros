# RNF-07 — Accesibilidad básica

## Alcance revisado

Se revisaron ambas páginas (`index.html` y `admin.html`) y los elementos dinámicos generados desde `store.js` y `admin.js`.

## Hallazgos y mejoras aplicadas

- Las páginas declaran `lang="es"`, metadatos de viewport y título específico.
- Se usan regiones semánticas `header`, `nav`, `main`, `aside`, `section` y `footer` con nombres accesibles cuando corresponde.
- Los formularios estáticos asocian sus controles con `label for`; los selectores de personalización creados dinámicamente también reciben etiquetas enlazadas.
- Los botones de icono tienen nombres accesibles mediante `aria-label`; los botones de acción dinámica del administrador también describen el pedido al que afectan.
- Las tablas administrativas tienen `caption` y encabezados con `scope="col"`. Los contenedores desplazables de tablas ahora son regiones enfocables y tienen un nombre accesible.
- Las imágenes de productos y del carrito reciben texto alternativo breve basado en el nombre del producto. Los elementos decorativos se ocultan a tecnologías de asistencia.
- Se añadieron enlaces “Saltar al contenido principal” en ambas páginas.
- Las pestañas de acceso ahora tienen `aria-labelledby`, `tabindex` roving y navegación con flechas izquierda/derecha, Inicio y Fin.
- Se conserva el indicador global `:focus-visible` y se respeta `prefers-reduced-motion`.
- Se eliminó `aria-live` redundante del contenedor completo de tarjetas; el contador de resultados mantiene el anuncio del cambio de categoría.

## Comprobaciones estáticas realizadas

- Campos de formulario visibles con etiqueta asociada o nombre accesible.
- Botones con texto o nombre accesible.
- Imágenes HTML estáticas con atributo `alt` y asignación de `alt` a imágenes creadas dinámicamente.
- IDs únicos y referencias correctas de `aria-labelledby` y `aria-controls`.
- Enlaces de salto, regiones semánticas, tablas con caption y encabezados.
- Sintaxis JavaScript, HTML y CSS.

## Pruebas manuales recomendadas

1. Navegar por cada página usando solo `Tab`, `Shift+Tab`, `Enter` y `Espacio`. Confirmar que el foco sea visible.
2. En el diálogo de acceso, abrir las pestañas con teclado; usar flechas izquierda/derecha y `Home`/`End` para cambiar entre “Iniciar sesión” y “Crear cuenta”.
3. Activar el enlace “Saltar al contenido principal” al inicio y confirmar que el foco/posición vaya al contenido.
4. En el panel administrativo, navegar hasta cada tabla y comprobar que el contenedor pueda enfocarse y desplazarse horizontalmente con teclado si fuera necesario.
5. Con lector de pantalla, comprobar que los nombres de imágenes, botones, formularios, encabezados de tabla y mensajes de estado tengan sentido.
6. Activar la opción del sistema “Reducir movimiento” y comprobar que no se fuercen desplazamientos o transiciones animadas.

## Limitación

Esta revisión cubre accesibilidad básica y comprobaciones estáticas; no sustituye una auditoría completa WCAG ni pruebas con lectores de pantalla reales. La conformidad de contraste y la experiencia con tecnologías de asistencia deben validarse también manualmente.
