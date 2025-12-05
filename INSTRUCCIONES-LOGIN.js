/**
 * INSTRUCCIONES PARA RESOLVER EL PROBLEMA DE AUTENTICACIÓN
 * 
 * El problema es que tu sesión actual tiene un token JWT antiguo que no reconoce
 * el rol SUPER_ADMIN. Necesitas cerrar sesión y volver a entrar.
 * 
 * PASOS:
 * 
 * 1. Ve a la aplicación en el navegador
 * 
 * 2. Abre las DevTools (F12)
 * 
 * 3. Ve a la pestaña "Application" o "Almacenamiento"
 * 
 * 4. En el panel izquierdo, busca "Cookies" y expande
 * 
 * 5. Selecciona "http://localhost:3000"
 * 
 * 6. ELIMINA todas las cookies que empiecen con:
 *    - next-auth.session-token
 *    - __Secure-next-auth.session-token
 * 
 * 7. También ve a "Local Storage" y "Session Storage" y limpia todo
 * 
 * 8. Recarga la página (F5)
 * 
 * 9. Inicia sesión de nuevo con:
 *    Email: admin@electroshop.com
 *    Contraseña: admin123
 * 
 * 10. Ahora deberías ver el panel de administración
 * 
 * ALTERNATIVA RÁPIDA:
 * - Abre una ventana de incógnito/privada
 * - Ve a http://localhost:3000/login
 * - Inicia sesión con las credenciales de admin
 */

console.log('Lee las instrucciones en este archivo para resolver el problema de autenticación');
