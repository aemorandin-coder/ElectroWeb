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

*Generado automáticamente - Antigravity AI*
