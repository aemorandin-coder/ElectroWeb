# 🏦 Guía de Integración: Verificación de Pago Móvil - Banco de Venezuela

## Propósito de este Documento

Este documento proporciona toda la información técnica necesaria para integrar la **verificación de pagos móviles (P2C)** del Banco de Venezuela en cualquier aplicación web de comercio electrónico. Permite validar automáticamente que un cliente ha realizado un pago móvil antes de procesar su compra.

---

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Flujo de Compra con Pago Móvil](#flujo-de-compra-con-pago-móvil)
3. [Requisitos Previos](#requisitos-previos)
4. [API de Conciliación BDV](#api-de-conciliación-bdv)
5. [Implementación Backend](#implementación-backend)
6. [Implementación Frontend](#implementación-frontend)
7. [Códigos de Respuesta](#códigos-de-respuesta)
8. [Ejemplo Completo de Integración](#ejemplo-completo-de-integración)
9. [Seguridad](#seguridad)
10. [Solución de Problemas](#solución-de-problemas)

---

## Descripción General

### ¿Qué es la API de Conciliación BDV?

Es un servicio del Banco de Venezuela que permite a comercios (personas jurídicas) verificar en tiempo real si un pago móvil ha sido recibido en su cuenta. Esto elimina la necesidad de verificación manual de capturas de pantalla.

### Caso de Uso: E-commerce

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE COMPRA                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Cliente selecciona productos en tu tienda web               │
│                          ↓                                      │
│  2. Cliente elige "Pago Móvil" como método de pago              │
│                          ↓                                      │
│  3. Tu sistema muestra los datos para hacer el pago:            │
│     - Teléfono destino: 04XX-XXXXXXX                            │
│     - Banco: Venezuela (0102)                                   │
│     - RIF: J-XXXXXXXXX                                          │
│     - Monto exacto: Bs. XXX.XX                                  │
│                          ↓                                      │
│  4. Cliente realiza el pago desde su app bancaria               │
│                          ↓                                      │
│  5. Cliente ingresa los datos del pago en tu formulario:        │
│     - Número de referencia                                      │
│     - Teléfono desde donde pagó                                 │
│     - Banco origen                                              │
│     - Fecha del pago                                            │
│                          ↓                                      │
│  6. Tu backend llama a la API de Conciliación BDV               │
│                          ↓                                      │
│  7. Si code=1000 → Pago verificado → Procesar pedido ✅         │
│     Si code≠1000 → Pago no válido → Mostrar error ❌            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flujo de Compra con Pago Móvil

### Paso 1: Mostrar Datos de Pago al Cliente

Tu sistema debe mostrar al cliente la información necesaria para hacer el pago móvil:

```javascript
const datosPagoMovil = {
    telefono: "04121234567",      // Tu teléfono registrado en Pago Móvil Comercio
    banco: "Venezuela (0102)",
    rif: "J-12345678-9",          // RIF de tu empresa
    monto: "150.00",              // Monto exacto de la compra
    concepto: "Compra #12345"     // Referencia del pedido
};
```

### Paso 2: Recibir Datos del Pago del Cliente

Después de que el cliente pague, debe ingresar:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| Referencia | Número de confirmación del pago | `12345678` |
| Teléfono Pagador | Desde qué número hizo el pago | `04241234567` |
| Banco Origen | Banco desde donde pagó | `0134` (Banesco) |
| Fecha | Fecha del pago | `2024-12-22` |

### Paso 3: Verificar con API BDV

Tu backend verifica el pago llamando a la API.

### Paso 4: Procesar Resultado

- **Código 1000**: Pago verificado ✅ → Confirmar pedido
- **Código ≠ 1000**: Pago no encontrado ❌ → Pedir al cliente que verifique datos

---

## Requisitos Previos

### Para usar la API necesitas:

1. **Cuenta jurídica** en el Banco de Venezuela
2. **Afiliación a Pago Móvil Comercio** (desde BDVenlínea Empresas)
3. **API Key** generado desde BDVenlínea Empresas

### Cómo obtener el API Key:

1. Ingresar a **BDVenlínea Empresas** con usuario único
2. Navegar a: `Administrador de perfiles > Perfil empresa > Gestión de productos > Solicitud de API Conciliación`
3. Completar el proceso de afiliación
4. El API Key se genera y puede consultarse en: `Consultas > Otras Consultas > Conciliación Automática > Ver API`

### Seguridad del API Key:

- ⚠️ **NUNCA** exponer el API Key en el frontend
- ⚠️ Almacenar en variables de entorno (`.env`)
- ⚠️ No subir a repositorios públicos
- ✅ Usar software **Kleopatra** para compartir de forma segura

---

## API de Conciliación BDV

### Endpoint de Producción

```
POST https://bdvconciliacion.banvenez.com/getMovement
```

### Endpoint de Calidad (Pruebas)

```
POST https://bdvconciliacionqa.banvenez.com:444/getMovement/v2
```

### Headers Requeridos

```http
Content-Type: application/json
X-API-KEY: tu_api_key_aqui
```

### Campos del Request (JSON)

```json
{
    "cedulaPagador": "V12345678",
    "telefonoPagador": "04241234567",
    "telefonoDestino": "04121234567",
    "referencia": "12345678",
    "fechaPago": "2024-12-22",
    "importe": "150.00",
    "bancoOrigen": "0134",
    "reqCed": false
}
```

### Descripción de Campos

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `cedulaPagador` | string | No* | Cédula del cliente (ej: "V12345678") |
| `telefonoPagador` | string | Sí | Teléfono desde donde se hizo el pago |
| `telefonoDestino` | string | Sí | Tu teléfono de Pago Móvil Comercio |
| `referencia` | string | Sí | Número de referencia (4-8 dígitos) |
| `fechaPago` | string | Sí | Formato: YYYY-MM-DD |
| `importe` | string | Sí | Monto con decimales (ej: "150.00") |
| `bancoOrigen` | string | Sí | Código del banco origen (4 dígitos) |
| `reqCed` | boolean | No | Si `true`, valida la cédula (solo BDV-BDV) |

*La cédula solo es obligatoria si `reqCed` es `true`, y solo funciona para pagos BDV-BDV.

### Respuesta Exitosa (code: 1000)

```json
{
    "code": 1000,
    "message": "Monto: 150.00 - estatus: Transacción realizada",
    "data": {
        "status": "1000",
        "amount": "150.00",
        "reason": "Transacción realizada"
    },
    "status": 200
}
```

### Respuesta de Error (code: 1010)

```json
{
    "code": 1010,
    "message": "No se pudo validar el movimiento: Registro solicitado no existe",
    "data": null,
    "status": 200
}
```

---

## Códigos de Respuesta

| Código | Significado | Acción |
|--------|-------------|--------|
| `1000` | ✅ Pago verificado exitosamente | Procesar el pedido |
| `1010` | ❌ Pago no encontrado | Verificar datos ingresados |
| `1010` | ❌ Datos mandatorios en null | Revisar campos obligatorios |
| `1010` | ❌ Cliente no afiliado | Verificar API Key y afiliación |
| `400` | ❌ Bad Request | Error en formato JSON |

---

## Implementación Backend

### Node.js / Express

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const app = express();

const BDV_API_URL = 'https://bdvconciliacion.banvenez.com/getMovement';
const API_KEY = process.env.BDV_API_KEY;

app.use(express.json());

/**
 * Endpoint para verificar pago móvil
 * POST /api/verificar-pago
 */
app.post('/api/verificar-pago', async (req, res) => {
    const {
        cedulaPagador,
        telefonoPagador,
        telefonoDestino,  // Tu teléfono de comercio
        referencia,
        fechaPago,
        importe,
        bancoOrigen,
        reqCed = false
    } = req.body;

    // Validar campos obligatorios
    if (!telefonoPagador || !referencia || !fechaPago || !importe || !bancoOrigen) {
        return res.status(400).json({
            success: false,
            message: 'Faltan campos obligatorios'
        });
    }

    try {
        const response = await fetch(BDV_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': API_KEY
            },
            body: JSON.stringify({
                cedulaPagador: cedulaPagador || '',
                telefonoPagador,
                telefonoDestino,
                referencia,
                fechaPago,
                importe,
                bancoOrigen,
                reqCed
            })
        });

        const data = await response.json();

        // Verificar si el pago fue exitoso
        if (data.code === 1000) {
            return res.json({
                success: true,
                verified: true,
                amount: data.data.amount,
                message: 'Pago verificado exitosamente'
            });
        } else {
            return res.json({
                success: true,
                verified: false,
                code: data.code,
                message: data.message
            });
        }
    } catch (error) {
        console.error('Error al verificar pago:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al conectar con el banco'
        });
    }
});

app.listen(3000, () => {
    console.log('Servidor corriendo en puerto 3000');
});
```

### Variables de Entorno (.env)

```env
# API Key del Banco de Venezuela
BDV_API_KEY=tu_api_key_real_aqui

# Tu teléfono registrado en Pago Móvil Comercio
TELEFONO_COMERCIO=04121234567
```

---

## Implementación Frontend

### Formulario de Verificación de Pago

```html
<form id="formVerificarPago">
    <h3>Verificar tu Pago Móvil</h3>
    
    <!-- Teléfono del pagador -->
    <label>Teléfono desde donde pagaste:</label>
    <input type="tel" 
           id="telefonoPagador" 
           placeholder="04241234567" 
           pattern="04[0-9]{9}" 
           required>
    
    <!-- Banco origen -->
    <label>Banco desde donde pagaste:</label>
    <select id="bancoOrigen" required>
        <option value="">Seleccione...</option>
        <option value="0102">Banco de Venezuela</option>
        <option value="0134">Banesco</option>
        <option value="0105">Mercantil</option>
        <option value="0108">Provincial</option>
        <option value="0175">Bicentenario</option>
        <!-- Agregar más bancos -->
    </select>
    
    <!-- Referencia -->
    <label>Número de Referencia:</label>
    <input type="text" 
           id="referencia" 
           placeholder="12345678" 
           minlength="4" 
           maxlength="8" 
           required>
    
    <!-- Fecha -->
    <label>Fecha del pago:</label>
    <input type="date" id="fechaPago" required>
    
    <button type="submit">Verificar Pago</button>
</form>
```

### JavaScript para Enviar Verificación

```javascript
document.getElementById('formVerificarPago').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const datos = {
        telefonoPagador: document.getElementById('telefonoPagador').value,
        bancoOrigen: document.getElementById('bancoOrigen').value,
        referencia: document.getElementById('referencia').value,
        fechaPago: document.getElementById('fechaPago').value,
        importe: "150.00", // El monto de la compra
        telefonoDestino: "04121234567" // Tu teléfono comercio
    };
    
    try {
        const response = await fetch('/api/verificar-pago', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        
        const result = await response.json();
        
        if (result.verified) {
            // ✅ Pago verificado - Procesar pedido
            alert('¡Pago verificado! Procesando tu pedido...');
            procesarPedido();
        } else {
            // ❌ Pago no encontrado
            alert('No pudimos verificar tu pago. Por favor revisa los datos.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión. Intenta de nuevo.');
    }
});
```

---

## Ejemplo Completo de Integración

### Flujo en E-commerce (Pseudocódigo)

```javascript
// 1. Cliente completa carrito de compras
const pedido = {
    id: generarIdPedido(),
    productos: carrito.productos,
    total: carrito.total,
    estado: 'pendiente_pago'
};

// 2. Guardar pedido en base de datos
await guardarPedido(pedido);

// 3. Mostrar datos para pago móvil
mostrarDatosPago({
    telefono: process.env.TELEFONO_COMERCIO,
    banco: "Venezuela (0102)",
    monto: pedido.total,
    concepto: `Pedido #${pedido.id}`
});

// 4. Cliente hace el pago y envía datos
const datosPago = await recibirDatosPago();

// 5. Verificar con API BDV
const verificacion = await verificarPagoMovil({
    ...datosPago,
    importe: pedido.total.toFixed(2),
    telefonoDestino: process.env.TELEFONO_COMERCIO
});

// 6. Procesar resultado
if (verificacion.verified) {
    // ✅ Actualizar pedido como pagado
    await actualizarPedido(pedido.id, { 
        estado: 'pagado',
        referenciaPago: datosPago.referencia,
        fechaPago: new Date()
    });
    
    // Enviar confirmación al cliente
    await enviarEmailConfirmacion(pedido);
    
    // Continuar con el proceso (envío, etc.)
    await procesarEnvio(pedido);
    
} else {
    // ❌ Pago no verificado
    await actualizarPedido(pedido.id, { 
        estado: 'pago_fallido',
        error: verificacion.message
    });
    
    // Notificar al cliente
    mostrarError('No pudimos verificar tu pago. Por favor revisa los datos.');
}
```

---

## Seguridad

### ✅ Buenas Prácticas

1. **API Key en Backend**: Nunca exponer en el frontend
2. **Variables de Entorno**: Usar `.env` para credenciales
3. **HTTPS**: Siempre usar conexiones seguras
4. **Validación**: Validar todos los datos de entrada
5. **Rate Limiting**: Limitar solicitudes para evitar abuso
6. **Logs**: Registrar todas las verificaciones

### ⚠️ Evitar

1. API Key en código fuente visible
2. API Key en repositorios públicos
3. Confiar ciegamente en datos del cliente
4. Omitir validación de monto

### Validación de Monto

```javascript
// IMPORTANTE: Siempre validar que el monto verificado coincida con el pedido
if (verificacion.verified && parseFloat(verificacion.amount) === parseFloat(pedido.total)) {
    // Monto correcto - Procesar pedido
} else {
    // Monto incorrecto - Posible fraude
    console.warn('Monto no coincide:', verificacion.amount, 'vs', pedido.total);
}
```

---

## Solución de Problemas

### Error: "Cliente no afiliado al producto"

- **Causa**: API Key inválido o empresa no afiliada
- **Solución**: Verificar afiliación en BDVenlínea Empresas

### Error: "Registro solicitado no existe"

- **Causa**: Datos del pago incorrectos
- **Solución**: Verificar referencia, fecha, monto y teléfonos

### Error: "Datos Mandatorios no pueden estar en null"

- **Causa**: Campos obligatorios vacíos
- **Solución**: Asegurar que todos los campos requeridos tengan valor

### Error de conexión

- **Causa**: Problemas de red o servicio no disponible
- **Solución**: Reintentar después o contactar soporte BDV

---

## Bancos de Venezuela (Códigos)

| Código | Banco |
|--------|-------|
| 0102 | Banco de Venezuela |
| 0104 | Venezolano de Crédito |
| 0105 | Mercantil |
| 0108 | Provincial |
| 0114 | Bancaribe |
| 0115 | Exterior |
| 0128 | Caroní |
| 0134 | Banesco |
| 0137 | Sofitasa |
| 0138 | Banco Plaza |
| 0146 | Banco de la Gente Emprendedora |
| 0151 | Fondo Común |
| 0156 | 100% Banco |
| 0157 | Delsur |
| 0163 | Del Tesoro |
| 0166 | Agrícola de Venezuela |
| 0168 | Bancrecer |
| 0169 | Mi Banco |
| 0171 | Activo |
| 0172 | Bancamiga |
| 0173 | Internacional de Desarrollo |
| 0174 | Banplus |
| 0175 | Bicentenario |
| 0177 | BANFANB |
| 0191 | BNC |

---

## Contacto BDV

Para solicitar afiliación o soporte:

- 📧 ventas_especializadas@banvenez.com
- 📧 integracion_apis@banvenez.com

---

## Resumen

### Para integrar pago móvil en tu e-commerce:

1. ✅ Afiliarse a Pago Móvil Comercio
2. ✅ Obtener API Key de BDVenlínea Empresas
3. ✅ Crear endpoint backend que llame a la API BDV
4. ✅ Crear formulario frontend para datos del pago
5. ✅ Verificar pago antes de confirmar pedido
6. ✅ Validar que el monto coincida con el pedido

### Endpoint clave:

```
POST https://bdvconciliacion.banvenez.com/getMovement
Header: X-API-KEY: tu_api_key
```

### Respuesta exitosa:

```json
{ "code": 1000 } = Pago verificado ✅
```

---

*Documento generado: Diciembre 2024*
*Basado en documentación oficial del Banco de Venezuela*
