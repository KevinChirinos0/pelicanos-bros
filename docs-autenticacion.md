# Registro y autenticación — Pelícanos Bros

Esta etapa implementa los requisitos **RF-01** (registro de clientes) y **RF-02** (autenticación separada de clientes y administradores), tomando como especificación el documento oficial de Pelícanos Bros.

## Reglas tomadas del documento

- El registro solicita nombre, correo, teléfono y contraseña.
- La contraseña de una cuenta nueva debe tener al menos 6 caracteres.
- El cliente puede acceder con las credenciales de demostración `maria` o `juan`.
- El administrador utiliza la cuenta de demostración `admin` desde `admin.html`.
- Las cuentas de prueba se crean automáticamente al iniciar por primera vez la aplicación.
- Los datos se mantienen en `localStorage`; el documento advierte que se trata de una seguridad demostrativa y no debe utilizarse con datos reales.

## Decisiones de implementación

1. `PBData.createCustomer()` valida nombre, correo, teléfono y contraseña; normaliza el correo y rechaza duplicados. El rol se asigna internamente como `cliente`, nunca desde el formulario.
2. `PBData.authenticateCustomer()` permite iniciar sesión mediante nombre de usuario o correo, pero busca exclusivamente cuentas con rol `cliente`.
3. `PBData.authenticateAdmin()` acepta exclusivamente el nombre de usuario de una cuenta con rol `admin`.
4. Las claves `pb_sesion_cliente_v1` y `pb_sesion_admin_v1` guardan el ID de usuario. Al entrar con un rol, se limpia la sesión del otro rol.
5. Las consultas públicas de usuarios nunca devuelven `passwordHash`.
6. En una instalación nueva se generan cuatro pedidos ficticios para reproducir los estados de prueba descritos para María y Juan. Los productos y precios de estos registros se toman del menú documentado; no son ventas reales.

## Hash de contraseñas

Las altas nuevas se procesan con **PBKDF2-HMAC-SHA-256**, 600,000 iteraciones y un salt aleatorio de 16 bytes por usuario, utilizando Web Crypto. El valor almacenado incluye algoritmo, iteraciones, salt y hash:

```text
pbkdf2-sha256$iteraciones$salt_base64$hash_base64
```

Las tres cuentas de demostración tienen hashes precalculados con salts individuales; las contraseñas originales no se guardan en `localStorage`. La cantidad de iteraciones se eligió siguiendo la recomendación publicada por OWASP para PBKDF2-HMAC-SHA-256 cuando se requiere ese algoritmo. Referencia: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

**Importante:** este hash no convierte la aplicación en un sistema seguro de producción. El archivo JavaScript es público, el usuario controla el navegador y puede inspeccionar o modificar `localStorage`, incluidos los roles y las sesiones. La autorización definitiva, el control de intentos, el almacenamiento de credenciales y la protección de datos deben trasladarse a un backend. El documento oficial propone una API, cookies HttpOnly y bcrypt o Argon2 para la versión de producción.

## Cuentas de prueba

| Rol | Usuario | Correo | Contraseña |
|---|---|---|---|
| Administrador | `admin` | — | `Admin2026*` |
| Cliente | `maria` | `maria@demo.pe` | `Cliente2026*` |
| Cliente | `juan` | `juan@demo.pe` | `Cliente2026*` |

Un cliente nuevo no necesita crear un nombre de usuario: puede ingresar con el correo usado durante el registro.

## Pruebas efectuadas

- Creación automática e idempotente de las tres cuentas demo.
- Inicio de sesión de María por usuario y de Juan por correo.
- Inicio de sesión del administrador.
- Rechazo de credenciales incorrectas.
- Rechazo de cuentas de cliente en el acceso administrativo y viceversa.
- Limpieza de la sesión contraria al iniciar sesión con otro rol.
- Registro de un cliente nuevo y autenticación posterior.
- Rechazo de correos duplicados, teléfonos inválidos y contraseñas menores de 6 caracteres.
- Verificación de que la API pública no entrega hashes ni contraseñas en texto plano.
- Verificación de que María y Juan solo consultan los pedidos asociados a su propio ID desde la interfaz.

Las pruebas automatizadas de la capa `PBData` se ejecutaron en Node.js con Web Crypto. La prueba visual final debe realizarse en un navegador ejecutando el proyecto mediante un servidor local o HTTPS.
