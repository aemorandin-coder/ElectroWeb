# 🚨 ACTUALIZACIÓN CRÍTICA - 18/12/2024

## Cambios Requeridos Post-Despliegue

### 1. Promoción a SUPER_ADMIN (OBLIGATORIO)

El usuario administrador principal necesita ser promovido a `SUPER_ADMIN` en producción.

**Después de desplegar, ejecutar desde la consola del navegador (F12 → Console) en el sitio de producción:**

```javascript
fetch('/api/admin/promote-super-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'EMAIL_DEL_ADMIN',
    currentPassword: 'PASSWORD_DEL_ADMIN',
    secretKey: 'PROMOTE_TO_SUPER_ADMIN_2024'
  })
})
.then(r => r.json())
.then(console.log);
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "User EMAIL has been promoted to SUPER_ADMIN"
}
```

**Después de la promoción:** Cerrar sesión y volver a entrar para aplicar el nuevo rol.

---

## Resumen de Cambios en Este Commit

### 🔧 Correcciones
1. **WhatsApp Button**: Arreglado el link que no funcionaba (número con espacios/guiones)
2. **WhatsApp Auto-minimize**: El botón ahora se minimiza automáticamente en toda la página pública
3. **Login Logo**: Eliminado el "rayo" placeholder, ahora muestra skeleton mientras carga

### 📊 Admin Panel - Reportes
1. **Colores**: Cambiado a azul corporativo (#2a63cd)
2. **Diseño compacto**: Todo reducido ~20% (fuentes, espaciados, cards)
3. **Usuarios en vivo**: Nuevo contador en tiempo real de visitantes activos
4. **Filtro de usuarios**: Los reportes ya no cuentan ADMIN/SUPER_ADMIN, solo clientes

### 🔐 Registro
1. **Botón "Volver atrás"**: Ahora redirige a /login en lugar de / (para mejor flujo de usuario)

### 🆕 Nuevo Endpoint
- `POST /api/admin/promote-super-admin` - Para promoción segura a SUPER_ADMIN

---

## Seguridad

⚠️ **Después de usar el endpoint de promoción:**
- Opción A: Agregar variable de entorno `SUPER_ADMIN_PROMOTION_KEY` con una clave secreta única
- Opción B: Eliminar el archivo `app/api/admin/promote-super-admin/route.ts` si no se necesita más

---

## Actualización 18/12/2024 - Sesión 2

### 🛒 Página de Carrito (`/carrito`)
1. **Precios en Bs.**: Ahora se muestran en USD y Bs. con la tasa de cambio
2. **Animaciones Premium**: Entrada de items, hover effects, botón "Vaciar" con shake
3. **React Icons**: Reemplazados emojis por iconos premium (FiShield, HiBadgeCheck, FiTruck)
4. **Footer**: Agregado footer con copyright dinámico
5. **Estado vacío mejorado**: Diseño más amplio y centrado

### 🏠 Homepage
1. **Productos Destacados**: Cambiado texto de "Ofertas del día" a "Productos Destacados"

### ⚙️ Panel del Cliente - Configuración (`/customer/settings`)
**Refactorización completa con backend funcional:**

#### Nuevos campos en DB (Profile):
- `lastLoginAt`, `lastLoginDevice`, `lastLoginIp` (sesión)
- `allowSurveys`, `shareAnonymousData` (privacidad)
- `accountStatus`, `deactivatedAt`, `deletionRequestedAt`, `deletionReason` (estado de cuenta)

#### Nuevas funcionalidades:
1. **Información de Sesión**: Último acceso, dispositivo, cerrar todas las sesiones
2. **Preferencias de Privacidad**: Encuestas y datos anónimos (guardado en DB)
3. **Zona de Peligro**: Desactivar cuenta temporal, solicitar eliminación permanente
4. **Cambio de Contraseña**: Ahora funcional con validación real
5. **Notificaciones**: Conectadas al modelo NotificationPreference

#### Layout mejorado:
- 3 columnas flexibles (estilo Marketing)
- Toggle switches compactos
- Iconos React Icons premium

### 🔧 Migración de Base de Datos
Ejecutar después del despliegue:
```bash
npx prisma db push
```

---

## 🔍 Sentry - Monitoreo de Errores (NUEVO)

Se ha integrado Sentry para monitoreo de errores en producción.

### Configuración Requerida:

1. **Crear cuenta en Sentry**: https://sentry.io
2. **Crear un nuevo proyecto** de tipo "Next.js"
3. **Agregar variables de entorno** en producción:

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o1234567.ingest.sentry.io/1234567
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=electroweb
SENTRY_AUTH_TOKEN=sntrys_your-auth-token
```

### Cómo obtener los valores:
- **DSN**: Settings → Client Keys (DSN)
- **ORG**: Settings → Organization Settings → Organization Slug
- **PROJECT**: Nombre del proyecto en Sentry
- **AUTH_TOKEN**: Settings → Auth Tokens → Create New Token

### Funcionalidades activas:
- ✅ Captura automática de errores de cliente y servidor
- ✅ Session Replay (reproduce lo que hacía el usuario)
- ✅ Stack traces con source maps
- ✅ Tunnel route `/monitoring` (evita ad-blockers)
- ✅ Página de error global con diseño profesional

---

## 🔧 Actualización 22/12/2024 - Correcciones Críticas

### 📧 Sistema de Correos Electrónicos (Email Templates)

**Problema reportado:** Los correos llegaban mostrando solo una "barra azul" porque las imágenes no cargaban.

**Solución implementada:**
1. **Header simplificado**: El logo/imagen de la empresa ya NO está en el header. Ahora usa solo texto (nombre de la empresa en blanco sobre fondo azul).
2. **Logo al final**: El logo de la empresa ahora aparece en el footer del correo (con fallback si no carga).
3. **Redes sociales dinámicas**: Se muestran todas las redes configuradas en el admin panel (Instagram, Facebook, WhatsApp, Telegram, TikTok, Twitter/X).
4. **Mejor compatibilidad**: Diseño email-safe que funciona en todos los clientes de correo.

**Archivos modificados:**
- `lib/email-service.ts` - Template base de emails

### 🚫 Cancelación de Órdenes desde Admin Panel

**Problema reportado:** Al cancelar órdenes no se enviaba correo y no se pedía nota.

**Solución implementada:**
1. **Nota obligatoria**: Cuando el admin cancela una orden, DEBE incluir una nota de al menos 10 caracteres explicando el motivo.
2. **Correo de cancelación**: Se envía automáticamente un email al cliente con:
   - Número de orden cancelada
   - Motivo de la cancelación (la nota del admin)
   - Información del reembolso (si aplica)
   - Enlace a soporte
3. **Liberación de stock**: Se restaura el stock y se liberan las reservaciones.

**Archivos modificados:**
- `app/api/orders/route.ts` - PATCH handler

### 📊 Dashboard de Clientes - Sincronización

**Problema reportado:** Las órdenes y resumen no se sincronizaban correctamente.

**Mejoras implementadas:**
1. **Consulta de transacciones mejorada**: Ahora usa el `balanceId` directamente en lugar de relación anidada.
2. **Más transacciones**: Se obtienen 10 transacciones recientes (antes 5).
3. **Conversión de Decimals**: Todos los campos Decimal se convierten a Number para evitar problemas de serialización.

**Archivos modificados:**
- `app/api/customer/dashboard/route.ts`

### 💰 Saldo y Pagos - Transacciones

**Problema reportado:** No se mostraban las transacciones del cliente.

**Mejoras implementadas:**
1. **Más transacciones**: Se obtienen 20 transacciones (antes 10).
2. **Conversión correcta**: Todos los campos Decimal convertidos a Number.
3. **Campos completos**: Se incluyen todos los campos de cada transacción.

**Archivos modificados:**
- `app/api/customer/balance/route.ts`

### 📱 WhatsApp Open Graph (Miniatura de productos)

**Problema reportado:** Al compartir productos en WhatsApp no se veía la miniatura.

**Mejoras implementadas:**
1. **URL absoluta garantizada**: Nueva función `ensureAbsoluteUrl` que siempre convierte URLs relativas a absolutas.
2. **Fallback chain**: Imagen del producto → Logo de la empresa → og-image.png por defecto.
3. **Metadata adicional**: Se añaden meta tags de precio para mejor visualización.
4. **Variable de entorno**: Se usa `NEXT_PUBLIC_BASE_URL` para la URL base.

**Archivos modificados:**
- `lib/product-metadata.ts`

### ⚙️ Configuración Requerida

Para que el Open Graph de WhatsApp funcione correctamente, asegúrate de tener estas variables en tu `.env`:

```env
# URL pública base (IMPORTANTE para WhatsApp/Facebook)
NEXT_PUBLIC_BASE_URL="https://tu-dominio.com"

# O usa la misma que NEXTAUTH_URL si es el mismo dominio
NEXTAUTH_URL="https://tu-dominio.com"
```

### 📷 Imagen OG por Defecto

Debes crear una imagen llamada `og-image.png` en la carpeta `public/` con:
- Dimensiones: 1200x630 píxeles
- Contenido: Logo de la empresa, nombre, slogan
- Formato: PNG o JPG

---

*Generado automáticamente - Antigravity AI*

