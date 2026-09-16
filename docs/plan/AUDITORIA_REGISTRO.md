# Registro y acceso de clientes · análisis (C-84) y plan de Google, Facebook y Apple (C-85)

Fecha: 2026-09-16 · Autor: Claude · Para: Andrés

## 1. Qué le pasó al cliente ("Credenciales invalidas")

El teclado del teléfono escribió el correo con mayúsculas (`CONTACTO@FRANDING.COM.PE`). El registro lo guardaba en minúsculas, pero el login lo buscaba tal cual lo escribió el cliente, y en PostgreSQL `Contacto@…` y `contacto@…` son textos distintos. La cuenta sí existía; el login no la encontraba.

- **Arreglado en C-83** (ya en `main`): el login, la recuperación de contraseña y el reenvío de verificación buscan el correo sin distinguir mayúsculas ni espacios. Los campos de correo ya no ponen mayúscula automática en el teléfono.
- **Arreglado en C-84**: después de registrarse, la pantalla entra con el correo que guardó el servidor y no con el escrito a mano. Si aun así no puede entrar, muestra "Tu cuenta está lista, inicia sesión" en verde, no un error rojo.

## 2. Qué tan fácil era crear una cuenta

| | Antes | Ahora (C-84) |
|---|---|---|
| Campos | 8 (nombre, cédula, correo, teléfono, contraseña, repetir contraseña, términos, captcha) | 7 (sin "repetir contraseña": el ojo deja ver lo escrito) |
| Diseño a 360 px | dos columnas que se apilan, logo de 112 px, botón "Volver" encima del logo, captcha más ancho que la tarjeta | una columna, logo de 80 px, sin tarjeta en el teléfono: el captcha cabe |
| Barra inferior de la tienda | tapaba la contraseña | oculta en login, registro, recuperar y verificar |
| Errores | globo que se borraba a los 3 segundos, uno a la vez | texto fijo bajo cada campo, todos a la vez, foco en el primero |
| Ayudas ("?") | solo con el mouse: en el teléfono no existían | texto visible bajo el campo |
| Contraseña | la pantalla pedía 6 caracteres, el servidor 8 con mayúscula, minúscula y número: el cliente se enteraba después del captcha | la pantalla muestra las 4 reglas y las marca mientras escribe |
| Cédula | la pantalla aceptaba `P-…` (pasaporte) y el servidor la rechazaba; el servidor aceptaba `G-…` y la pantalla no | tipo (V, E, P, J, G) + número con teclado numérico; se guarda siempre como `V-12345678` |
| Teléfono | selector con banderas cargadas de un sitio externo; se guardaba `+58 04121234567` | selector nativo del teléfono; se guarda `+58 4121234567` (el formato de WhatsApp) |
| Nombre | rechazaba guiones y apóstrofos ("María-José", "O'Brien") | los acepta; pide nombre y apellido |
| Correo mal escrito | nada | "¿Quisiste decir ana@gmail.com?" para gmial, hotmal, .con y otros |
| Botón | bloqueado hasta resolver el captcha: sin captcha no se veía ningún error | siempre activo; si falta el captcha lo dice |
| Términos | el enlace sacaba de la página y se perdía lo escrito | abre en otra pestaña; también enlaza la política de privacidad |
| Volver después de registrarse | `?callbackUrl=//otro-sitio.com` mandaba al cliente a otro dominio | solo rutas internas (misma función que el login, en `lib/rutas.ts`) |

**Seguridad encontrada al pasar** (`/api/user/profile`, arreglado en C-84): la pantalla de perfil bloquea la cédula una vez escrita, pero la API la dejaba cambiar, y esa cédula es la que queda en la firma de los términos del saldo. También guardaba cualquier texto como nombre o imagen (por ejemplo `javascript:…`). Ahora la cédula solo se escribe si estaba vacía, y nombre, teléfono e imagen se validan.

### Decisiones tuyas que harían el registro aún más corto

1. **Cédula fuera del registro** (recomendado). Hoy el registro es el único momento en que se pide y después no se puede corregir. Se pediría en el primer pedido (checkout) y al aceptar los términos del saldo, que ya la pide. El registro bajaría a nombre, correo, teléfono y contraseña.
2. **Teléfono opcional en el registro.** Se necesita para coordinar entregas; se podría pedir en el checkout igual que la dirección. Menos importante que la cédula.
3. **Captcha.** hCaptcha visible es la mayor fricción que queda en el teléfono. El modo invisible de hCaptcha es de pago. Alternativa gratis: con Google (sección 3) no hace falta captcha.

## 3. Registro rápido con Google, Facebook y Apple

### Resumen

| | Google | Facebook | Apple |
|---|---|---|---|
| Prioridad | 1 | 2 | 3 |
| Costo | gratis | gratis | 99 USD al año (Apple Developer Program) |
| Qué tienes que crear | proyecto en Google Cloud + cliente OAuth | app en Meta for Developers | Services ID, dominio verificado y llave privada en Apple Developer |
| Tiempo de tu lado | 20-30 minutos | 1 hora + publicar la app | 1-2 horas; la llave caduca y hay que renovarla cada 6 meses |
| ¿Trae el correo verificado? | sí | casi siempre; cuentas creadas con teléfono no tienen correo | sí, pero puede ser un correo "oculto" de Apple (`@privaterelay.appleid.com`) |
| Uso en Venezuela | casi todos los Android tienen cuenta Google | alto, pero muchos no recuerdan la contraseña | bajo (iPhone) |
| Trabajo de código | C-85, base para las otras dos | pequeño sobre C-85 | medio: Apple responde con POST y hay que ajustar cookies de NextAuth |

### Lo que tienes que hacer tú para Google (paso a paso)

1. Entra a <https://console.cloud.google.com> con la cuenta Google de la empresa y crea un proyecto "ElectroShopVe".
2. **APIs y servicios → Pantalla de consentimiento OAuth**: tipo *Externo*. Nombre: "Electro Shop Morandin". Correo de soporte. Dominio autorizado: `electroshopve.com`. Enlaces: `https://www.electroshopve.com/privacidad` y `https://www.electroshopve.com/terminos`. Permisos: solo `email`, `profile` y `openid` (no requieren revisión de Google). Publica la app ("En producción").
   Si subes el logo, Google revisa la marca y tarda unos días; sin logo funciona desde el primer día.
3. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**.
   - Orígenes autorizados: `https://www.electroshopve.com` (y `https://electroshopve.com` si esa dirección también abre la tienda).
   - URI de redirección: `https://www.electroshopve.com/api/auth/callback/google` y, para probar en local, `http://localhost:3000/api/auth/callback/google`.
4. Google te da un **ID de cliente** y un **secreto**. Ponlos en el `.env` del servidor (no me los pegues en el chat):
   `GOOGLE_CLIENT_ID=…` y `GOOGLE_CLIENT_SECRET=…`. Confirma que `NEXTAUTH_URL=https://www.electroshopve.com`.
5. Reinicia con pm2. El botón "Continuar con Google" aparece solo cuando esas dos variables existen: el código puede subir antes sin romper nada.

### Cómo funcionaría (C-85)

- Botón "Continuar con Google" arriba del formulario, en registro y en login, con "o con tu correo" debajo.
- **Cliente nuevo**: se crea la cuenta con nombre, correo y foto de Google, ya verificada (no tiene que confirmar el correo). Se respeta el código de promotor, se avisa al equipo ("Cliente nuevo · llegó por Google") y recibe las notificaciones de bienvenida.
- **Cliente que ya tenía cuenta con ese correo**: se vincula y entra a su misma cuenta, con sus pedidos y saldo. Es seguro porque Google solo entrega correos verificados.
- **Teléfono y cédula**: la cuenta de Google no los trae. Se piden en el checkout la primera vez (y la cédula al aceptar los términos del saldo, que ya lo hace).
- **Contraseña**: una cuenta creada con Google no tiene. Si luego intenta entrar con correo y contraseña, el login le dice "Esta cuenta entra con Google" en vez de "Correo o contraseña incorrectos". Puede crear una con "¿La olvidaste?".
- **Administradores**: no pueden entrar con Google; siguen con contraseña.
- **No hace falta migración**: la tabla `accounts` ya existe en el esquema de Prisma.

### Decisiones que necesito antes de C-85

1. Cuenta existente con el mismo correo: **vincular sola** (recomendado) o pedir primero la contraseña.
2. Datos que faltan en cuentas de Google: **pedirlos en el checkout** (recomendado) o en una pantalla obligatoria apenas entra.
3. ¿Los administradores pueden entrar con Google? Recomendado: **no**.

### Facebook y Apple (después de Google)

- **Facebook**: crear la app en <https://developers.facebook.com>, producto "Inicio de sesión con Facebook", URI `https://www.electroshopve.com/api/auth/callback/facebook`, URL de política de privacidad y de eliminación de datos, y pasar la app a modo "Activo". `email` y `public_profile` son los permisos básicos y normalmente no pasan por revisión; si Meta pide verificar el negocio, se hace con el RIF de la empresa. Variables `FACEBOOK_CLIENT_ID` y `FACEBOOK_CLIENT_SECRET`. Si la cuenta no tiene correo, se le pide que use otro método.
- **Apple**: inscribirse en Apple Developer (99 USD/año), crear un App ID y un Services ID con "Sign in with Apple", verificar `electroshopve.com`, URI `https://www.electroshopve.com/api/auth/callback/apple` y crear una llave `.p8`. Con esa llave se genera el secreto, que vence a los 6 meses como máximo. Para escribir a los correos ocultos de Apple hay que registrar el dominio remitente en "Private Email Relay". Recomendación: dejarlo para cuando haya volumen de clientes con iPhone.

## 4. Pendientes que quedan anotados

- El captcha del login solo lo pide el navegador (se guarda en `localStorage`); el servidor no limita intentos de login → **C-80**.
- El login no mira `accountStatus`: una cuenta desactivada puede entrar → C-80.
- `GET /api/user/profile` devuelve el perfil completo de Prisma (IP del último acceso, carrito guardado…) al propio cliente. No es de otro usuario, pero va contra la regla de DTOs → C-80.
- "Recuperar contraseña" y "Verificar correo" siguen con el diseño viejo; conviene pasarlos a `components/auth/AuthShell.tsx` → carril ChatGPT (R1).
