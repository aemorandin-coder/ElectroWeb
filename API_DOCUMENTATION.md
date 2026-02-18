# 🌐 API Externa ElectroCaja (eweb)

## Documentación Completa de Endpoints

**Versión:** 1.0  
**Base URL:** `{BASE_URL}/api/eweb`  
**Última actualización:** 2026-01-30

> ⚠️ Reemplaza `{BASE_URL}` con la URL de tu servidor de ElectroCaja  
> ⚠️ Reemplaza `{TU_API_KEY}` con tu API Key real

---

## 📋 Índice

1. [Autenticación](#-autenticación)
2. [Endpoints Públicos](#-endpoints-públicos)
3. [Endpoints de Catálogo](#-endpoints-de-catálogo-requiere-auth)
4. [Endpoints de Stock](#-endpoints-de-stock-requiere-auth)
5. [Endpoints de Imágenes](#-endpoints-de-imágenes-requiere-auth)
6. [Endpoints de Administración](#-endpoints-de-administración-solo-admin)
7. [Webhooks](#-webhooks)
8. [Códigos de Error](#-códigos-de-error)
9. [Ejemplos de Integración](#-ejemplos-de-integración)

---

## 🔐 Autenticación

### Métodos Soportados

| Método | Header/Param | Ejemplo |
|--------|--------------|---------|
| **API Key (Header)** | `X-API-Key` | `X-API-Key: {TU_API_KEY}` |
| **API Key (Query)** | `?api_key=` | `?api_key={TU_API_KEY}` |
| **JWT Bearer** | `Authorization` | `Authorization: Bearer {TU_JWT_TOKEN}` |

### Obtener API Key

1. Acceder a ElectroCaja como administrador
2. Ir a **Inventario** → **Configuración** → **Conexión API**
3. Crear nuevo cliente API
4. **¡IMPORTANTE!** Guardar la API Key generada (solo se muestra una vez)

### Permisos Disponibles

| Permiso | Descripción |
|---------|-------------|
| `read` | Consultar catálogo, stock, productos |
| `write` | Reservar/liberar stock, confirmar ventas |
| `webhook` | Recibir notificaciones de cambios |

---

## 🌍 Endpoints Públicos

### `GET /health`

> Verificar estado del servicio (no requiere autenticación)

**Request:**
```http
GET /api/eweb/health
```

**Response 200:**
```json
{
  "success": true,
  "status": "healthy",
  "service": "electrocaja-api",
  "version": "v1",
  "timestamp": "2026-01-30T12:00:00.000Z",
  "cache": {
    "memoria": { "items": 150, "maxItems": 1000, "usagePercent": "15.00" },
    "database": { "total": 1250, "valid": 1200, "expired": 50 }
  },
  "webhooks": {
    "total": 5420,
    "exitosos": 5400,
    "fallidos": 20,
    "pendientes": 3,
    "tasaExito": "99.63"
  }
}
```

**Posibles Errores:**

| Código | Error | Descripción |
|--------|-------|-------------|
| 503 | `SERVICE_UNAVAILABLE` | Base de datos no disponible |

---

## 📦 Endpoints de Catálogo (Requiere Auth)

### `GET /catalogo`

> Obtener listado de productos con paginación y filtros

**Request:**
```http
GET /api/eweb/catalogo?page=1&pageSize=50
X-API-Key: {TU_API_KEY}
```

**Query Parameters:**

| Param | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `page` | int | No | 1 | Número de página |
| `pageSize` | int | No | 50 | Items por página (máx 100) |
| `updated_since` | ISO 8601 | No | - | Solo productos modificados después de esta fecha |
| `categoria` | string | No | - | Filtrar por categoría (búsqueda parcial) |
| `tipo` | string | No | PRODUCTO | `PRODUCTO`, `SERVICIO`, `ELECTROBAR` |
| `activo` | boolean | No | true | Filtrar por estado activo/inactivo |
| `stock_min` | int | No | - | Solo productos con stock >= a este valor |
| `orderBy` | string | No | updated_at | `fechaActualizacion`, `descripcion`, `precioVenta`, `stock`, `id` |
| `order` | string | No | desc | `asc` o `desc` |
| `includeInternal` | boolean | No | false | Incluir campos internos (id, codigoInterno, precioCosto) |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "sku": "7891234567890",
      "nombre": "Cable HDMI 2m Premium",
      "descripcion": "Cable HDMI 2.0 alta velocidad con ethernet",
      "categoria": "Cables",
      "precioUSD": 5.99,
      "stock": 25,
      "stockDisponible": 23,
      "activo": true,
      "destacado": false,
      "imagen": "{BASE_URL}/uploads/products/original/cable-hdmi.webp",
      "imagenThumbnail": "{BASE_URL}/uploads/products/thumbnails/cable-hdmi.webp",
      "imagenApiUrl": "/api/eweb/imagen/7891234567890",
      "updatedAt": "2026-01-30T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 1250,
    "totalPages": 25,
    "hasMore": true
  },
  "meta": {
    "timestamp": "2026-01-30T12:00:00.000Z",
    "version": "v1"
  }
}
```

**Posibles Errores:**

| Código | Error | Descripción |
|--------|-------|-------------|
| 401 | `AUTH_REQUIRED` | No se proporcionó autenticación |
| 401 | `INVALID_API_KEY` | API Key inválida |
| 401 | `CLIENT_DISABLED` | Cliente API desactivado |
| 403 | `PERMISSION_DENIED` | Sin permiso `read` |
| 429 | `RATE_LIMIT_EXCEEDED` | Excedió límite de requests |

---

### `GET /producto/:sku`

> Obtener un producto específico por SKU (código de barras)

**Request:**
```http
GET /api/eweb/producto/{sku}
X-API-Key: {TU_API_KEY}
```

**URL Parameters:**

| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `sku` | string | Sí | Código de barras del producto |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "sku": "7891234567890",
    "codigoInterno": "CAB-HDMI-2M",
    "nombre": "Cable HDMI 2m Premium",
    "descripcion": "Cable HDMI 2.0 alta velocidad",
    "categoria": "Cables",
    "tipo": "PRODUCTO",
    "precioUSD": 5.99,
    "precioCosto": 3.50,
    "margen": 41.57,
    "stock": 25,
    "stockDisponible": 23,
    "stockMinimo": 5,
    "activo": true,
    "destacado": false,
    "ubicacion": "Estante A-3",
    "proveedor": "TechCables Venezuela",
    "imagen": "/uploads/products/original/cable-hdmi.webp",
    "imagenThumbnail": "/uploads/products/thumbnails/cable-hdmi.webp",
    "imagenApiUrl": "/api/eweb/imagen/7891234567890",
    "updatedAt": "2026-01-30T10:30:00.000Z"
  }
}
```

**Posibles Errores:**

| Código | Error | Descripción |
|--------|-------|-------------|
| 400 | `SKU_REQUIRED` | No se proporcionó SKU |
| 404 | `PRODUCT_NOT_FOUND` | Producto no existe o está inactivo |

---

### `GET /sync-batch`

> Sincronización masiva con cursor (para reconstruir catálogo completo)

**Request:**
```http
GET /api/eweb/sync-batch?cursor=0&limit=100
X-API-Key: ec_live_abc123...
```

**Query Parameters:**

| Param | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `cursor` | int | No | 0 | ID del último producto procesado |
| `limit` | int | No | 100 | Cantidad por batch (máx 500) |
| `updated_since` | ISO 8601 | No | - | Solo productos modificados después de esta fecha |

**Response 200:**
```json
{
  "success": true,
  "data": [ /* ... productos ... */ ],
  "pagination": {
    "nextCursor": 150,
    "hasMore": true,
    "count": 100
  },
  "meta": {
    "timestamp": "2026-01-30T12:00:00.000Z",
    "version": "v1"
  }
}
```

**Uso recomendado:**
```javascript
async function sincronizarTodo() {
  let cursor = 0;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(`/api/eweb/sync-batch?cursor=${cursor}&limit=100`);
    const data = await response.json();
    
    // Procesar productos
    await procesarProductos(data.data);
    
    cursor = data.pagination.nextCursor;
    hasMore = data.pagination.hasMore;
  }
}
```

---

## 📷 Endpoints de Imágenes (Requiere Auth)

### `GET /imagen/:sku`

> Descargar imagen del producto

**Request:**
```http
GET /api/eweb/imagen/{sku}?type=original
X-API-Key: {TU_API_KEY}
```

**URL Parameters:**

| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `sku` | string | Sí | Código de barras del producto |

**Query Parameters:**

| Param | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `type` | string | No | original | `original` (alta calidad) o `thumbnail` (miniatura) |

**Response 200:**
- Content-Type: `image/jpeg`, `image/png`, `image/webp`, etc.
- Body: Archivo binario de imagen

**Headers de respuesta:**
```http
Content-Type: image/webp
Cache-Control: public, max-age=3600
X-Content-Type-Options: nosniff
```

**Posibles Errores:**

| Código | Error | Descripción |
|--------|-------|-------------|
| 400 | `SKU_REQUIRED` | No se proporcionó SKU |
| 404 | `PRODUCT_NOT_FOUND` | Producto no existe |
| 404 | `IMAGE_NOT_FOUND` | Producto no tiene imagen |
| 404 | `FILE_NOT_FOUND` | Archivo de imagen no existe en disco |

---

## ✅ Endpoints de Stock (Requiere Auth)

### `POST /validar-stock`

> Validar disponibilidad de múltiples productos antes del pago

**Request:**
```http
POST /api/eweb/validar-stock
Content-Type: application/json
X-API-Key: {TU_API_KEY}

{
  "items": [
    { "sku": "7891234567890", "cantidad": 2 },
    { "sku": "7891234567891", "cantidad": 1 }
  ]
}
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `items` | array | Sí | Lista de productos a validar |
| `items[].sku` | string | Sí | Código de barras del producto |
| `items[].cantidad` | int | Sí | Cantidad a validar |

**Response 200:**
```json
{
  "success": true,
  "todosDisponibles": true,
  "items": [
    {
      "sku": "7891234567890",
      "nombre": "Cable HDMI 2m",
      "disponible": true,
      "motivo": "OK",
      "cantidadSolicitada": 2,
      "stockActual": 25,
      "precioUSD": 5.99,
      "updatedAt": "2026-01-30T10:30:00.000Z"
    },
    {
      "sku": "7891234567891",
      "nombre": "Mouse Inalámbrico",
      "disponible": false,
      "motivo": "STOCK_INSUFICIENTE",
      "cantidadSolicitada": 1,
      "stockActual": 0,
      "precioUSD": 12.99,
      "updatedAt": "2026-01-30T09:00:00.000Z"
    }
  ],
  "timestamp": "2026-01-30T12:00:00.000Z",
  "validezSegundos": 60
}
```

**Posibles Valores de `motivo`:**

| Valor | Descripción |
|-------|-------------|
| `OK` | Stock disponible |
| `STOCK_INSUFICIENTE` | No hay suficiente stock |
| `PRODUCTO_NO_ENCONTRADO` | SKU no existe |

---

### `POST /reservar-stock`

> Reservar stock temporalmente durante el checkout

**Request:**
```http
POST /api/eweb/reservar-stock
Content-Type: application/json
X-API-Key: {TU_API_KEY}

{
  "items": [
    { "sku": "7891234567890", "cantidad": 2 }
  ],
  "sesionId": "checkout_abc123xyz",
  "tiempoReservaMinutos": 5
}
```

**Body Parameters:**

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `items` | array | Sí | - | Productos a reservar |
| `items[].sku` | string | Sí | - | Código de barras |
| `items[].cantidad` | int | Sí | - | Cantidad a reservar |
| `sesionId` | string | Sí | - | ID único de la sesión de checkout |
| `tiempoReservaMinutos` | int | No | 5 | Tiempo de reserva (máx 15 min) |

**Response 200:**
```json
{
  "success": true,
  "items": [
    {
      "sku": "7891234567890",
      "reservado": true,
      "motivo": "OK",
      "stockReservado": 2
    }
  ],
  "sesionId": "checkout_abc123xyz",
  "expiresAt": "2026-01-30T12:05:00.000Z"
}
```

---

### `POST /liberar-stock`

> Liberar stock reservado (cuando el usuario cancela el checkout)

**Request:**
```http
POST /api/eweb/liberar-stock
Content-Type: application/json
X-API-Key: {TU_API_KEY}

{
  "sesionId": "checkout_abc123xyz"
}
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `sesionId` | string | Sí | ID de la sesión a liberar |

**Response 200:**
```json
{
  "success": true,
  "liberados": 2,
  "sesionId": "checkout_abc123xyz"
}
```

---

### `POST /confirmar-venta`

> Confirmar venta y descontar stock definitivamente

**Request:**
```http
POST /api/eweb/confirmar-venta
Content-Type: application/json
X-API-Key: {TU_API_KEY}

{
  "sesionId": "checkout_abc123xyz",
  "items": [
    { "sku": "7891234567890", "cantidad": 2 }
  ],
  "ordenId": "ORD-2026-001234"
}
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `sesionId` | string | No | ID de sesión (si hay reservas previas) |
| `items` | array | Sí | Productos vendidos |
| `items[].sku` | string | Sí | Código de barras |
| `items[].cantidad` | int | Sí | Cantidad vendida |
| `ordenId` | string | No | ID de la orden en tu sistema |

**Response 200:**
```json
{
  "success": true,
  "items": [
    {
      "sku": "7891234567890",
      "procesado": true,
      "stockAnterior": 25,
      "stockNuevo": 23
    }
  ],
  "ordenId": "ORD-2026-001234",
  "timestamp": "2026-01-30T12:00:00.000Z"
}
```

---

## 🔧 Endpoints de Administración (Solo Admin)

> Estos endpoints requieren autenticación con JWT de un usuario administrador de ElectroCaja

### `POST /admin/clientes`

> Crear nuevo cliente API

**Request:**
```http
POST /api/eweb/admin/clientes
Authorization: Bearer {TU_JWT_TOKEN}
Content-Type: application/json

{
  "nombre": "electroshopve",
  "descripcion": "Tienda online electroshopve.com",
  "ipWhitelist": ["45.55.123.45"],
  "permisos": {
    "read": true,
    "write": true,
    "webhook": true
  },
  "rateLimitRpm": 120,
  "rateLimitDaily": 50000
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "mi_app",
    "apiKey": "ec_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "message": "¡IMPORTANTE! Guarda esta API Key, no se volverá a mostrar"
  }
}
```

---

### `GET /admin/clientes`

> Listar todos los clientes API

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "electroshopve",
      "descripcion": "Tienda online",
      "activo": true,
      "permisos": { "read": true, "write": true, "webhook": true },
      "totalRequests": 5420,
      "lastRequest": "2026-01-30T11:59:00.000Z",
      "webhookEndpoints": [
        {
          "id": 1,
          "url": "https://tu-app.com/api/webhook",
          "eventos": ["STOCK_UPDATED", "PRODUCT_UPDATED"],
          "activo": true,
          "verificado": true,
          "enviosExitosos": 1520,
          "enviosFallidos": 3
        }
      ]
    }
  ]
}
```

---

### `POST /admin/clientes/:id/webhooks`

> Agregar webhook a un cliente

**Request:**
```http
POST /api/eweb/admin/clientes/{id}/webhooks
Authorization: Bearer {TU_JWT_TOKEN}
Content-Type: application/json

{
  "url": "https://tu-app.com/api/webhook/inventario",
  "eventos": ["STOCK_UPDATED", "PRICE_UPDATED", "PRODUCT_DELETED"],
  "maxReintentos": 5,
  "timeoutMs": 10000
}
```

---

### `POST /admin/webhooks/:id/test`

> Probar conexión a un webhook

**Response 200:**
```json
{
  "success": true,
  "httpStatus": 200,
  "duracionMs": 245,
  "message": "Webhook respondió correctamente"
}
```

---

### `GET /admin/webhook-logs`

> Ver logs de webhooks enviados

**Query Parameters:**

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `page` | int | 1 | Página |
| `pageSize` | int | 20 | Items por página |
| `estado` | string | - | `EXITOSO`, `FALLIDO`, `PENDIENTE`, `AGOTADO` |
| `endpointId` | int | - | Filtrar por endpoint |

---

## 🔔 Webhooks

### Eventos Disponibles

| Evento | Descripción | Prioridad |
|--------|-------------|-----------|
| `STOCK_UPDATED` | Stock de producto modificado | Alta (10) |
| `PRICE_UPDATED` | Precio de producto modificado | Alta (9) |
| `PRODUCT_DELETED` | Producto eliminado/desactivado | Alta (8) |
| `PRODUCT_UPDATED` | Datos del producto modificados | Media (5) |
| `PRODUCT_CREATED` | Nuevo producto creado | Media (5) |
| `IMAGE_UPDATED` | Imagen del producto actualizada | Baja (3) |
| `HEARTBEAT` | Ping de prueba de conexión | Mínima (0) |

### Estructura del Payload

```json
{
  "evento": "STOCK_UPDATED",
  "data": {
    "sku": "7891234567890",
    "stockAnterior": 27,
    "stockNuevo": 25,
    "diferencia": -2,
    "motivo": "Venta"
  },
  "meta": {
    "timestamp": "2026-01-30T12:00:00.000Z",
    "source": "electrocaja",
    "version": "v1",
    "userId": 5
  }
}
```

### Headers del Webhook

```http
Content-Type: application/json
X-Webhook-Signature: sha256=abc123def456...
X-Webhook-Event: STOCK_UPDATED
X-Webhook-Timestamp: 2026-01-30T12:00:00.000Z
User-Agent: ElectroCaja-Webhook/1.0
```

### Validar Firma (HMAC-SHA256)

```javascript
const crypto = require('crypto');

function validarWebhook(payload, signature, secreto) {
  const expected = crypto
    .createHmac('sha256', secreto)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === `sha256=${expected}`;
}

// En tu endpoint:
app.post('/api/webhook/inventario', (req, res) => {
  const firma = req.headers['x-webhook-signature'];
  const secreto = process.env.ELECTROCAJA_WEBHOOK_SECRET;
  
  if (!validarWebhook(req.body, firma, secreto)) {
    return res.status(401).json({ error: 'Firma inválida' });
  }
  
  // Procesar webhook...
  res.status(200).json({ received: true });
});
```

### Política de Reintentos

| Intento | Delay |
|---------|-------|
| 1 | Inmediato |
| 2 | 1 minuto |
| 3 | 5 minutos |
| 4 | 15 minutos |
| 5 | 1 hora |
| 6 | 4 horas (último) |

---

## 🚨 Códigos de Error

### Errores de Autenticación (4xx)

| HTTP | Código | Descripción |
|------|--------|-------------|
| 401 | `AUTH_REQUIRED` | No se proporcionó autenticación |
| 401 | `INVALID_API_KEY` | API Key no existe o es inválida |
| 401 | `INVALID_TOKEN` | Token JWT inválido o expirado |
| 401 | `CLIENT_DISABLED` | Cliente API desactivado |
| 403 | `IP_NOT_WHITELISTED` | IP no está en la lista blanca |
| 403 | `PERMISSION_DENIED` | Sin permiso para esta operación |
| 429 | `RATE_LIMIT_EXCEEDED` | Excedió límite de requests |

### Errores de Validación (4xx)

| HTTP | Código | Descripción |
|------|--------|-------------|
| 400 | `SKU_REQUIRED` | Falta parámetro SKU |
| 400 | `ITEMS_REQUIRED` | Falta array de items |
| 400 | `SESSION_REQUIRED` | Falta sesionId |
| 404 | `PRODUCT_NOT_FOUND` | Producto no existe |
| 404 | `IMAGE_NOT_FOUND` | Producto sin imagen |

### Errores del Servidor (5xx)

| HTTP | Código | Descripción |
|------|--------|-------------|
| 500 | `CATALOG_ERROR` | Error obteniendo catálogo |
| 500 | `VALIDATION_ERROR` | Error validando stock |
| 500 | `IMAGE_ERROR` | Error procesando imagen |
| 503 | `SERVICE_UNAVAILABLE` | Servicio no disponible |

### Formato de Respuesta de Error

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Producto no encontrado",
    "details": {
      "sku": "7891234567890"
    },
    "timestamp": "2026-01-30T12:00:00.000Z"
  }
}
```

---

## 💻 Ejemplos de Integración

### Next.js / React

```javascript
// lib/electrocaja-api.js
const API_BASE = process.env.ELECTROCAJA_API_URL;  // Ej: https://api.tu-servidor.com
const API_KEY = process.env.ELECTROCAJA_API_KEY;   // Ej: ec_live_XXXXX

const headers = {
  'X-API-Key': API_KEY,
  'Content-Type': 'application/json'
};

// Obtener catálogo paginado
export async function getCatalogo(page = 1, pageSize = 50) {
  const res = await fetch(
    `${API_BASE}/api/eweb/catalogo?page=${page}&pageSize=${pageSize}`,
    { headers, next: { revalidate: 60 } }
  );
  return res.json();
}

// Obtener producto por SKU
export async function getProducto(sku) {
  const res = await fetch(`${API_BASE}/api/eweb/producto/${sku}`, { headers });
  return res.json();
}

// Validar stock antes del pago
export async function validarStock(items) {
  const res = await fetch(`${API_BASE}/api/eweb/validar-stock`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ items })
  });
  return res.json();
}

// Confirmar venta
export async function confirmarVenta(items, ordenId) {
  const res = await fetch(`${API_BASE}/api/eweb/confirmar-venta`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ items, ordenId })
  });
  return res.json();
}
```

### Receptor de Webhooks (Express)

```javascript
// routes/webhook.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const WEBHOOK_SECRET = process.env.ELECTROCAJA_WEBHOOK_SECRET;

function validarFirma(payload, signature) {
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  return signature === `sha256=${expected}`;
}

router.post('/inventario', (req, res) => {
  const firma = req.headers['x-webhook-signature'];
  
  if (!validarFirma(req.body, firma)) {
    return res.status(401).json({ error: 'Firma inválida' });
  }
  
  const { evento, data } = req.body;
  
  switch (evento) {
    case 'STOCK_UPDATED':
      console.log(`Stock actualizado: ${data.sku} -> ${data.stockNuevo}`);
      // Actualizar tu base de datos local
      break;
      
    case 'PRICE_UPDATED':
      console.log(`Precio actualizado: ${data.sku} -> $${data.precioNuevo}`);
      break;
      
    case 'PRODUCT_DELETED':
      console.log(`Producto eliminado: ${data.sku}`);
      // Desactivar producto en tu catálogo
      break;
  }
  
  res.status(200).json({ received: true });
});

module.exports = router;
```

---

## 📞 Soporte

Para problemas con la API, contactar al equipo de desarrollo de ElectroCaja.

**Variables de entorno requeridas:**
```env
# En tu aplicación
ELECTROCAJA_API_URL=https://tu-servidor-electrocaja.com
ELECTROCAJA_API_KEY=ec_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
ELECTROCAJA_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXX
```
