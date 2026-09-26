const crypto = require('crypto');

// Prueba del webhook de SADES en local:  node --env-file=.env scripts/test-webhook.js
// C-40: el secreto sale del .env. Antes estaba escrito aquí y el repositorio es público: ROTARLO en producción.
const SECRET = process.env.SADES_WEBHOOK_SECRET;
const URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/sades';
if (!SECRET) {
    console.error('Falta SADES_WEBHOOK_SECRET en el entorno (usa node --env-file=.env).');
    process.exit(1);
}

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

console.log('Enviando Webhook de prueba...');
console.log('Payload:', JSON.stringify(payload, null, 2));

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
            console.log('\n¡ÉXITO! Tu servidor validó la firma correctamente.');
        } else if (res.status === 401) {
            console.log('\nERROR: Firma rechazada. Verifica el secreto en tu .env');
        } else {
            console.log('\nADVERTENCIA: Firma aceptada, pero hubo otro error (ej: SKU no encontrado).');
        }
    })
    .catch(err => console.error('\nERROR DE CONEXIÓN:', err.message));
