// Solo para pruebas locales (C-72/C-73). Nunca se carga en producción.
// Precarga para next start: responde por Telegram, hCaptcha, BDV y DolarAPI sin salir a internet.
// Estado en archivos de la carpeta mock/ para que las pruebas lo controlen.
const fs = require('fs');
const path = require('path');
// Carpeta de estado: E2E_MOCK_DIR o ./mock junto a este archivo
const DIR = process.env.E2E_MOCK_DIR || path.join(__dirname, 'mock');
const realFetch = globalThis.fetch;
const readJson = (name, fallback) => { try { return JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8')); } catch { return fallback; } };
const append = (name, value) => fs.appendFileSync(path.join(DIR, name), JSON.stringify(value) + '\n');
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

globalThis.fetch = async function mockedFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const body = init.body ? (() => { try { return JSON.parse(init.body); } catch { return init.body; } })() : null;

  const tg = /^https:\/\/api\.telegram\.org\/bot([^/]+)\/(\w+)$/.exec(url);
  if (tg) {
    const [, token, method] = tg;
    append('telegram-calls.jsonl', { token: token.slice(0, 12), method, body });
    if (!token.startsWith('123456789:')) return json({ ok: false, error_code: 401, description: 'Unauthorized' }, 401);
    switch (method) {
      case 'getMe': return json({ ok: true, result: { id: 123456789, is_bot: true, first_name: 'Avisos Demo', username: 'DemoAvisosBot' } });
      case 'sendMessage':
        if (String(body.chat_id) === '777') return json({ ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' }, 403);
        return json({ ok: true, result: { message_id: Date.now() } });
      case 'getUpdates': {
        const updates = readJson('telegram-updates.json', []);
        fs.writeFileSync(path.join(DIR, 'telegram-updates.json'), '[]');
        const offset = body && body.offset;
        return json({ ok: true, result: offset ? updates.filter((u) => u.update_id >= offset) : updates });
      }
      case 'getWebhookInfo': return json({ ok: true, result: { url: '', pending_update_count: 0 } });
      default: return json({ ok: true, result: true });
    }
  }
  if (url.startsWith('https://api.hcaptcha.com/')) return json({ success: true });
  if (url.startsWith('https://bdvconciliacion')) {
    append('bdv-calls.jsonl', body);
    // C-125: con `movimientos` el mock busca como el banco, por referencia y monto exacto ("1115.25")
    const estado = readJson('bdv-next.json', { code: 1010, message: 'No encontrado' });
    if (Array.isArray(estado.movimientos)) {
      const mov = estado.movimientos.find((m) => m.referencia === body.referencia);
      if (!mov) return json({ code: 1010, message: 'El registro solicitado no existe' });
      if (mov.importe !== body.importe) return json({ code: 1010, message: 'El importe no coincide con el de la transaccion' });
      return json({ code: 1000, message: 'Transaccion realizada', data: { amount: mov.importe } });
    }
    return json(estado);
  }
  if (url.startsWith('https://ve.dolarapi.com/')) {
    return json([{ fuente: 'oficial', nombre: 'Oficial', promedio: readJson('rate.json', 842.21), fechaActualizacion: new Date().toISOString() }]);
  }
  // C-258: con E2E_ENVIOS=simulado, ZOOM y MRW responden aquí (la API pública de ZOOM se corta a ratos y las pruebas de
  // los caminos no pueden depender de ella). Sin la variable se usan las de verdad, como antes.
  if (process.env.E2E_ENVIOS === 'simulado') {
    const zoom = /^https:\/\/[\w.-]*zoom\.red\/.*\/(\w+)(?:\?|$)/.exec(url);
    if (zoom) {
      const q = new URL(url).searchParams;
      append('zoom-calls.jsonl', { metodo: zoom[1], params: Object.fromEntries(q) });
      const ok = (entidadRespuesta) => json({ codrespuesta: 'COD_000', mensaje: 'CONSULTA REALIZADA EXITOSAMENTE', entidadRespuesta });
      switch (zoom[1]) {
        case 'getCiudades': return ok(ZOOM_CIUDADES.map(([codciudad, nombre_ciudad, nombre_estado]) => ({ codciudad, nombre_ciudad, nombre_estado, pesomax: 200 })));
        case 'getOficinasGE': {
          const ciudad = ZOOM_CIUDADES.find(([codigo]) => String(codigo) === q.get('codigo_ciudad_destino'));
          if (!ciudad) return ok([]);
          return ok([
            { codoficina: `${ciudad[0]}01`, nombre: `ZOOM ${ciudad[1]} CENTRO`, direccion: 'Av. principal, local 1, frente a la plaza' },
            { codoficina: `${ciudad[0]}02`, nombre: `ZOOM ${ciudad[1]} ESTE`, direccion: 'Centro comercial del este, nivel 1' },
          ]);
        }
        // La tarifa de referencia crece con el peso: 3.200 Bs. el primer kilo y 900 Bs. cada kilo de más
        case 'CalcularTarifa': {
          const kilos = Math.max(1, Math.ceil(Number(q.get('peso')) || 1));
          const total = 3200 + (kilos - 1) * 900;
          return ok({ total: total.toLocaleString('es-VE', { minimumFractionDigits: 2 }) });
        }
        case 'getInfoTracking': return ok([
          { codigo_estatus: 'REC', descripcion_estatus: 'RECIBIDO EN OFICINA ORIGEN', siglas: 'GUANARE', fecha: new Date(Date.now() - 2 * 86400000).toLocaleDateString('es-VE'), hora: '10:15' },
          { codigo_estatus: 'TRA', descripcion_estatus: 'EN TRANSITO', siglas: 'ACARIGUA', fecha: new Date(Date.now() - 86400000).toLocaleDateString('es-VE'), hora: '16:40' },
        ]);
        default: return json({ codrespuesta: 'CODE_404', mensaje: 'Metodo no simulado', entidadRespuesta: [] });
      }
    }
    // MRW: un error lleva a la copia guardada en lib/envios/mrw-agencias.json
    if (url.startsWith('https://mrwve.com/')) return json({ error: 'simulado' }, 503);
  }
  return realFetch(input, init);
};

// C-258: una muestra de las ciudades con cobro a destino de ZOOM (código, ciudad y estado, como los devuelve ZOOM)
const ZOOM_CIUDADES = [
  [43, 'GUANARE', 'PORTUGUESA'], [25, 'ACARIGUA', 'PORTUGUESA'], [44, 'BARQUISIMETO', 'LARA'], [7, 'CABUDARE', 'LARA'],
  [244, 'LA VICTORIA', 'ARAGUA'], [3, 'MARACAY', 'ARAGUA'], [19, 'CARACAS', 'DISTRITO CAPITAL'], [4, 'VALENCIA', 'CARABOBO'],
  [6, 'MARACAIBO', 'ZULIA'], [33, 'BARINAS', 'BARINAS'], [17, 'SAN CRISTOBAL', 'TACHIRA'], [14, 'PUERTO ORDAZ', 'BOLIVAR'],
  [22, 'MATURIN', 'MONAGAS'],
];
