# Integración Pago Móvil BDV - Guía de Configuración

## Archivos Creados

Esta integración incluye los siguientes componentes:

### Backend (API & Servicios)
- `lib/pago-movil/bancos-venezuela.ts` - Lista de bancos y utilidades de validación
- `lib/pago-movil/verificar-pago.ts` - Servicio de verificación con API BDV
- `lib/pago-movil/index.ts` - Exports del módulo
- `app/api/pago-movil/verificar/route.ts` - Endpoint API para verificación

### Frontend (Componentes)
- `components/pago-movil/VerificarPagoMovilForm.tsx` - Formulario reutilizable de verificación
- `components/modals/RechargeModalV2.tsx` - Modal de recarga con verificación integrada

### Base de Datos
- `prisma/schema.prisma` - Nuevo modelo `PagoMovilVerificacion`
- `prisma/migrations/manual_pago_movil_verificaciones.sql` - Migración SQL manual

---

## Configuración Requerida

### 1. Variables de Entorno

Añade las siguientes variables a tu archivo `.env`:

```env
# API Key del Banco de Venezuela (obtener desde BDVenlinea Empresas)
BDV_API_KEY="tu_api_key_aqui"

# Teléfono del comercio registrado en Pago Móvil Comercio (sin guiones)
BDV_TELEFONO_COMERCIO="04121234567"

# Ambiente: PRODUCCION o CALIDAD (para pruebas)
BDV_AMBIENTE="PRODUCCION"
```

### 2. Obtener API Key de BDV

1. Ingresar a **BDVenlínea Empresas** con usuario único
2. Navegar a: `Administrador de perfiles > Perfil empresa > Gestión de productos > Solicitud de API Conciliación`
3. Completar el proceso de afiliación
4. El API Key se genera y puede consultarse en: `Consultas > Otras Consultas > Conciliación Automática > Ver API`

### 3. Ejecutar Migración de Base de Datos

Opción A - Prisma (si no hay conflictos):
```bash
npx prisma migrate dev --name add_pago_movil_verificacion
```

Opción B - SQL Manual (si hay conflictos con el schema):
```bash
# Conectarse a PostgreSQL y ejecutar:
psql -U usuario -d electroshop -f prisma/migrations/manual_pago_movil_verificaciones.sql
```

### 4. Regenerar Cliente Prisma

```bash
npx prisma generate
```

---

## Flujo de Funcionamiento

### Recarga de Saldo con Pago Móvil

1. Usuario selecciona "Pago Móvil" como método de pago
2. Sistema muestra datos del comercio (teléfono, banco, monto en Bs.)
3. Usuario realiza el pago desde su app bancaria
4. Usuario hace clic en "Continuar y Verificar Pago"
5. Usuario ingresa: teléfono, banco origen, referencia, fecha
6. Sistema llama a la API del BDV para verificar
7. Si código = 1000:
   - Pago verificado
   - Si es recarga: se aprueba automáticamente
   - Balance se actualiza al instante
8. Si código != 1000:
   - Se muestra mensaje de error
   - Usuario puede reintentar o esperar revisión manual

### Códigos de Respuesta BDV

| Código | Significado | Acción |
|--------|-------------|--------|
| 1000 | Pago verificado | Aprobar automáticamente |
| 1010 | Pago no encontrado | Verificar datos |
| 400 | Error de formato | Revisar campos |

---

## Uso en Otros Contextos

### Verificación en Checkout (Compras)

Puedes usar el componente en el checkout:

```tsx
import VerificarPagoMovilForm from '@/components/pago-movil/VerificarPagoMovilForm';

<VerificarPagoMovilForm
  montoEsperado={totalOrden}
  montoEnBs={totalEnBs}
  contexto="ORDER"
  orderId={orderId}
  onSuccess={(data) => {
    // Pago verificado - procesar orden
    if (data.verified) {
      confirmarOrden();
    }
  }}
  onError={(message) => {
    toast.error(message);
  }}
/>
```

### Verificación Manual desde Admin

El endpoint `/api/pago-movil/verificar` puede ser llamado desde cualquier parte:

```typescript
const response = await fetch('/api/pago-movil/verificar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    telefonoPagador: '04241234567',
    bancoOrigen: '0134',
    referencia: '12345678',
    fechaPago: '2024-12-22',
    importe: 50.00,
    contexto: 'GENERAL',
  }),
});

const { verified, message, amount } = await response.json();
```

---

## Seguridad

- El API Key NUNCA se expone en el frontend
- Todas las verificaciones se registran en la BD
- Se validan todos los campos antes de enviar a la API
- Los montos se verifican antes de aprobar automáticamente

---

## Soporte BDV

Para solicitar afiliación o soporte:
- ventas_especializadas@banvenez.com
- integracion_apis@banvenez.com
