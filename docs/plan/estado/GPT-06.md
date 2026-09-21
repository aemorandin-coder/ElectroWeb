# GPT-06 · Recuperar contraseña y verificar correo
Estado: HECHO — jerarquía y estados verificados
Rama: chatgpt/R1

## Inventario previo de acciones
- Solicitar recuperación: Volver al inicio, correo electrónico, hCaptcha, Enviar enlace y Volver al Login; el éxito conserva enlace al Login. POST original a `/api/auth/forgot-password` con `{ email, captchaToken }` y reinicio del captcha ante error.
- Restablecer: Nueva contraseña, confirmar contraseña, mostrar/ocultar cada campo, Restablecer Contraseña y Volver al Login. POST original a `/api/auth/reset-password` con `{ token, password }`; el éxito redirige al login después de 3 segundos. El servidor aplica `contrasenaSchema` de registro.
- Verificar correo: GET original a `/api/auth/verify-email/${token}`; éxito redirige al login verificado después de 3 segundos. Error conserva Ir al Login y Reenviar Email con `prompt` y POST original a `/api/auth/resend-verification`; Volver al inicio. Ningún permiso ni destino cambia.

## Jerarquía: antes → después
Las tres páginas usan `AuthShell`: en móvil el formulario empieza bajo el logo sobre fondo blanco, y desde `lg` aparece en una tarjeta centrada. En recuperación, el correo, la verificación de seguridad y la acción «Enviar enlace de recuperación» están en ese orden, sin el panel informativo de 350 px que antes desplazaba el formulario fuera de la primera pantalla. El correo desactiva autocapitalización y autocorrección. Los errores se ubican bajo el campo correspondiente y el foco vuelve a ese campo.

En restablecimiento se ven las cuatro reglas reales de `REGLAS_CONTRASENA` mientras se escribe, el control de visibilidad de cada campo y una sola acción de envío. La contraseña inválida o la confirmación distinta muestran un error fijo. Un token vencido muestra título, explicación y «Solicitar otro enlace». En verificación, las fases de espera, éxito y error comparten la misma jerarquía: mensaje breve y una acción primaria; el error conserva «Reenviar Email» como secundaria.

## Inventario después
Permanecen todas las acciones del inventario previo: enlaces de retorno e inicio de sesión, correo, hCaptcha, envío, dos campos de contraseña y sus botones de visibilidad, GET de verificación, redirecciones automáticas, y reenvío con `prompt`. El estado de enlace vencido añade «Solicitar otro enlace» hacia la ruta existente. Contratos revisados frente a `main`: recuperación 1→1 `fetch` con el mismo cuerpo; restablecimiento 1→1 `fetch` con el mismo cuerpo y 1→1 redirección; verificación 2→2 `fetch` con los mismos cuerpos y 1→1 redirección. Los destinos de Volver al inicio y Volver al Login pasan al `AuthShell` sin cambiar.

## Verificación real
```text
npx tsc --noEmit: exit 0 (sin salida)
ESLint contra main: recuperar 2→0, restablecer 1→0, verificar 1→0. Problemas nuevos: 0 en cada archivo.
npm run build -- --webpack (rev10_demo): exit 0; compilación, comprobación de tipos y generación de rutas completas.
git diff --check: exit 0
```

Firefox real: capturas persistentes en `docs/plan/estado/capturas/GPT-06/`, con 360, 768, 1024 y 1440 px para recuperación inicial, formulario de restablecimiento, verificación correcta y verificación vencida. Cada vista registró `scrollWidth === clientWidth`. En 360 px también se capturaron el correo en mayúsculas y el estado de enlace de restablecimiento vencido. El POST con token vencido mostró «Enlace vencido o inválido»; cuatro tokens válidos y cuatro vencidos de verificación produjeron los estados correctos. La contraseña de prueba activó las cuatro reglas visuales. Los tokens temporales se borraron y se restauró el estado original del usuario demo.

La entrada `QA-GPT06-UPPERCASE@INVALID.TEST` mantuvo su valor y atributos de teclado (`inputMode=email`, `autoCapitalize=none`) en Firefox. En el servidor local de desarrollo, el POST de ese correo inexistente a `/api/auth/forgot-password` respondió HTTP 200 con el texto genérico esperado; no generó token ni envió correo. La prueba de hCaptcha real queda pendiente: el widget externo no se cargó en Firefox automatizado, aunque su espacio se conservó sin desborde y el componente/ref y el cuerpo del POST son los originales.

## PEDIDOS y límites
- PEDIDO: ninguno. La ruta de restablecimiento usa exactamente el mismo `contrasenaSchema` que el registro, por lo que no hay discrepancia de reglas fuera de este carril.
