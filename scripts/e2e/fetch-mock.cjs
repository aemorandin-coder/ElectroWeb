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
    return json(readJson('bdv-next.json', { code: 1010, message: 'No encontrado' }));
  }
  if (url.startsWith('https://ve.dolarapi.com/')) {
    return json([{ fuente: 'oficial', nombre: 'Oficial', promedio: readJson('rate.json', 842.21), fechaActualizacion: new Date().toISOString() }]);
  }
  return realFetch(input, init);
};
