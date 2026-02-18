const crypto = require('crypto');

// CONFIGURACIÓN CON TU CLAVE REAL
const SECRET = 'whsec_7d4ab8471e518fd210f191d167116f6ce0314d6c6d1d3a3e';
const URL = 'http://localhost:3000/api/webhooks/sades';

// DATOS DE PRUEBA
const payload = {
    evento: 'STOCK_UPDATED',
    data: {
        sku: 'TEST-SKU-001',
        stockNuevo: 50,
        precioNuevo: 99.99
    },
    timestamp: new Date().toISOString()
};

// GENERAR FIRMA
const signature = crypto
    .createHmac('sha256', SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

console.log('🚀 Enviando Webhook de prueba...');
console.log('📦 Payload:', JSON.stringify(payload, null, 2));

// ENVIAR PETICIÓN
fetch(URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': `sha256=${signature}`
    },
    body: JSON.stringify(payload)
})
    .then(async res => {
        const data = await res.json();
        console.log(`\nESTADO: ${res.status} ${res.statusText}`);
        console.log('RESPUESTA:', data);

        if (res.ok) {
            console.log('\n✅ ¡ÉXITO! Tu servidor validó la firma correctamente.');
        } else if (res.status === 401) {
            console.log('\n❌ ERROR: Firma rechazada. Verifica el secreto en tu .env');
        } else {
            console.log('\n⚠️ ADVERTENCIA: Firma aceptada, pero hubo otro error (ej: SKU no encontrado).');
        }
    })
    .catch(err => console.error('\n❌ ERROR DE CONEXIÓN:', err.message));
