// C-258 · El estrés de cada camino del cliente: recorre la tienda como un cliente, en el teléfono (390 × 844) y en la
// computadora (1440 × 900), y mide por pantalla lo que le cuesta llegar a la meta. Se queda en el repositorio para
// repetirlo antes y después de cada cambio de un camino (OPERACION.md §3, "Pruebas").
//
// ---------------------------------------------------------------------------------------------------------------------
// Cómo se corre (nunca contra producción: crea y borra clientes, órdenes y una gift card de prueba)
//   1. Una base de prueba (DATABASE_URL con schema=…test o …demo) con catálogo: productos publicados con foto, de
//      Guanare y de la ferretería, gift cards con montos, el sorteo encendido y un método de Pago Móvil activo.
//   2. La tienda compilada y corriendo con el simulador (OPERACION.md §3, "Servidor de prueba"):
//        NODE_OPTIONS="--require ./scripts/e2e/fetch-mock.cjs" E2E_ENVIOS=simulado SMTP_HOST= EMAIL_PROVIDER= \
//        HCAPTCHA_SECRET=test BDV_API_KEY=prueba BDV_TELEFONO_COMERCIO=04140000000 npx next start -p 3158
//      (E2E_ENVIOS=simulado: ZOOM y MRW responden desde fetch-mock.cjs; la API pública de ZOOM se corta a ratos)
//   3. Playwright no está en el repositorio: se usa playwright-core de una carpeta aparte con el Chrome del sistema.
//        PLAYWRIGHT_CORE=/ruta/a/node_modules/playwright-core CHROME=/opt/google/chrome/chrome \
//        E2E_BASE_URL=http://localhost:3158 npx tsx scripts/e2e/estres-caminos.ts --etiqueta=antes
//      Opciones: --solo=compra,registro (caminos por nombre), --dispositivo=telefono|computadora, --fotos (una captura
//      por pantalla), --sin-enlaces (no rastrea los enlaces). Las capturas y el resultado (JSON y Markdown) van a
//      E2E_SALIDA o, si no se da, a scripts/e2e/mock/estres/ (fuera de git).
//
// ---------------------------------------------------------------------------------------------------------------------
// Qué mide en cada pantalla
//   - toques: lo que el cliente toca (botones, enlaces, casillas); campos: lo que tiene que escribir.
//   - palabras: las que se ven en el contenido (sin el encabezado, el pie ni la barra de abajo de la tienda, que son
//     iguales en todas); "arriba" son las de la primera pantalla, antes de bajar.
//   - bajar: cuántas pantallas hay que bajar hasta lo que se toca para seguir (0 = está a la vista).
//   - opciones: cuántas cosas se pueden tocar en el contenido (botones, enlaces, campos): más opciones, más dudas.
//   - ms hasta usable: desde el toque (o la llegada) hasta que lo que se toca para seguir se ve, está activo y React ya lo
//     conectó (hidratado). En una página que se carga entera también se anota el primer pintado (FCP).
//   - consola: errores de la consola y de la página; http: respuestas 4xx y 5xx de la tienda.
//   - api: los pedidos a /api que hace la pantalla al cargar (sin /api/realtime, que queda abierto): cuántos, cuántos
//     se repiten (mismo método y dirección) y cuántos esperan a otro (empiezan cuando otro ya terminó: la cascada).
//     "niveles" es la cadena más larga de pedidos que se esperan uno al otro.
//   - enlaces: al final se pide cada enlace interno visto en todas las pantallas; los que dan 404 son rutas muertas.
//
// El puntaje de estrés de un camino (más alto, más difícil) suma por cada pantalla:
//     4 por pantalla + 1 por toque + 1,5 por campo + 1 por cada 40 palabras (unos 10 s de lectura)
//   + 2 por pantalla que hay que bajar hasta la acción + 1 por cada 5 opciones por encima de 7 (la ley de Hick)
//   + 2 por segundo de espera por encima de 1 s hasta que se puede usar
//   + 10 por error de consola o 5xx, 5 por 4xx, 10 por enlace muerto
//   + 1 por pedido repetido y 1 por cada nivel de cascada por encima de 2.
// Los pesos premian lo que más cansa en el teléfono: escribir, leer y bajar. Los tiempos son de la máquina de prueba:
// sirven para comparar antes y después en la misma máquina, no como el tiempo de un cliente con 4G.
// ---------------------------------------------------------------------------------------------------------------------

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { BASE, crearUsuario, prisma, type UsuarioPrueba } from './lib';
import { tokenParaGuardar } from '@/lib/token-huella';

// ---------- Playwright, con los tipos que se usan (no está en el repositorio)
interface Localizador {
  first(): Localizador;
  nth(i: number): Localizador;
  filter(o: { hasText?: string | RegExp; visible?: boolean }): Localizador;
  locator(selector: string): Localizador;
  getByRole(rol: string, o?: { name?: string | RegExp; exact?: boolean }): Localizador;
  click(o?: { timeout?: number; force?: boolean }): Promise<void>;
  fill(texto: string, o?: { timeout?: number }): Promise<void>;
  press(tecla: string): Promise<void>;
  check(o?: { timeout?: number; force?: boolean }): Promise<void>;
  waitFor(o: { state: 'visible' | 'attached' | 'hidden'; timeout?: number }): Promise<void>;
  isVisible(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  inputValue(): Promise<string>;
  count(): Promise<number>;
  evaluate<T>(fn: (el: Element) => T): Promise<T>;
  scrollIntoViewIfNeeded(): Promise<void>;
  textContent(): Promise<string | null>;
  selectOption(v: string | { index: number }): Promise<string[]>;
  boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null>;
}
interface PedidoPw { url(): string; method(): string; resourceType(): string; postData(): string | null }
interface RespuestaPw { url(): string; status(): number; request(): PedidoPw }
interface MensajePw { type(): string; text(): string; location(): { url?: string } }
interface Pagina {
  goto(url: string, o?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
  url(): string;
  locator(selector: string): Localizador;
  getByRole(rol: string, o?: { name?: string | RegExp; exact?: boolean }): Localizador;
  getByText(texto: string | RegExp, o?: { exact?: boolean }): Localizador;
  getByLabel(texto: string | RegExp, o?: { exact?: boolean }): Localizador;
  getByPlaceholder(texto: string | RegExp): Localizador;
  frameLocator(selector: string): { locator(selector: string): Localizador };
  evaluate<T>(fn: string | (() => T)): Promise<T>;
  waitForTimeout(ms: number): Promise<void>;
  waitForURL(url: RegExp | string, o?: { timeout?: number }): Promise<void>;
  screenshot(o: { path: string; fullPage?: boolean }): Promise<unknown>;
  keyboard: { press(tecla: string): Promise<void> };
  mouse: { move(x: number, y: number, o?: { steps?: number }): Promise<void>; down(): Promise<void>; up(): Promise<void> };
  on(evento: 'request' | 'requestfinished' | 'requestfailed', fn: (r: PedidoPw) => void): void;
  on(evento: 'response', fn: (r: RespuestaPw) => void): void;
  on(evento: 'console', fn: (m: MensajePw) => void): void;
  on(evento: 'pageerror', fn: (e: Error) => void): void;
  close(): Promise<void>;
}
interface Contexto {
  newPage(): Promise<Pagina>;
  addCookies(c: Array<{ name: string; value: string; domain: string; path: string }>): Promise<void>;
  addInitScript(fn: string): Promise<void>;
  grantPermissions(p: string[], o?: { origin?: string }): Promise<void>;
  close(): Promise<void>;
}
interface NavegadorPw { newContext(o: Record<string, unknown>): Promise<Contexto>; close(): Promise<void> }
interface Chromium { launch(o: Record<string, unknown>): Promise<NavegadorPw> }

const requerir = createRequire(import.meta.url);
const { chromium } = requerir(process.env.PLAYWRIGHT_CORE || 'playwright-core') as { chromium: Chromium };
const CHROME = process.env.CHROME || '/opt/google/chrome/chrome';

// ---------- opciones
const args = process.argv.slice(2);
const opcion = (nombre: string) => args.find((a) => a.startsWith(`--${nombre}=`))?.split('=')[1];
const SOLO = opcion('solo')?.split(',').filter(Boolean) ?? null;
const DISPOSITIVOS = (opcion('dispositivo')?.split(',') ?? ['telefono', 'computadora']) as Array<'telefono' | 'computadora'>;
const ETIQUETA = opcion('etiqueta') ?? new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const FOTOS = args.includes('--fotos');
const SIN_ENLACES = args.includes('--sin-enlaces');
const SALIDA = process.env.E2E_SALIDA || path.join(process.cwd(), 'scripts/e2e/mock/estres');
mkdirSync(path.join(SALIDA, ETIQUETA), { recursive: true });

const ORIGEN = new URL(BASE).origin;
const PERFILES = {
  telefono: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' },
  computadora: { viewport: { width: 1440, height: 900 } },
};

// ---------- lo que se mide
interface PedidoApi { metodo: string; ruta: string; inicio: number; fin: number | null; status: number | null }
interface Pantalla {
  camino: string; dispositivo: string; nombre: string; url: string;
  toques: number; campos: number; palabras: number; palabrasArriba: number; bajar: number; largo: number; opciones: number;
  msUsable: number | null; msFcp: number | null; hidratado: boolean;
  consola: string[]; http: string[]; enlaces: string[];
  api: { total: number; repetidos: string[]; enCascada: number; niveles: number; lista: string[] };
  guia: string | null; nota: string | null;
}
interface ResultadoCamino { camino: string; dispositivo: string; meta: string; logrado: boolean; error: string | null; pantallas: Pantalla[]; puntaje: number }

const MEDIR = `() => {
  // El encabezado, el pie y la barra de abajo de la tienda son iguales en todas las pantallas: no cuentan
  const main = document.querySelector('main');
  const esMarco = (el) => {
    const marco = el.closest('header, footer, nav, [data-marco-tienda]');
    return Boolean(marco) && !(main && main.contains(marco) && marco !== main);
  };
  const visible = (el) => el.checkVisibility ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : true;
  const H = window.innerHeight;
  let palabras = 0, palabrasArriba = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const nodo = walker.currentNode; const el = nodo.parentElement;
    if (!el || el.closest('script, style, noscript, template, [aria-hidden="true"], .sr-only')) continue;
    const texto = (nodo.textContent || '').trim(); if (!texto) continue;
    if (esMarco(el) || !visible(el)) continue;
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    const n = (texto.match(/[\\p{L}\\p{N}]+/gu) || []).length;
    palabras += n; if (r.top + window.scrollY < H) palabrasArriba += n;
  }
  const tocables = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=radio], [role=tab], summary')]
    .filter((el) => !esMarco(el) && visible(el) && !el.closest('[aria-hidden="true"]') && el.getBoundingClientRect().width > 0);
  const enlaces = [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => h.startsWith(location.origin)))];
  return { palabras, palabrasArriba, opciones: tocables.length, largo: Math.max(0, (document.documentElement.scrollHeight - H) / H), enlaces };
}`;

/** Lo que el cliente toca para seguir: visible, activo y ya conectado por React (sin eso, tocarlo no hace nada). */
const ESTADO_META = `(el) => {
  let hidratado = false;
  for (let n = el; n && !hidratado; n = n.parentElement) hidratado = Object.keys(n).some((k) => k.startsWith('__reactFiber') || k.startsWith('__reactProps'));
  const r = el.getBoundingClientRect();
  const arriba = r.top + window.scrollY;
  return { hidratado, bajar: Math.max(0, (arriba + r.height - window.innerHeight) / window.innerHeight) };
}`;

class Recorrido {
  pantallas: Pantalla[] = [];
  private actual: Pantalla | null = null;
  private marca = Date.now();
  private inicioPantalla = Date.now();
  private finCarga = Number.POSITIVE_INFINITY;
  private pedidos: PedidoApi[] = [];
  private enCurso = new Map<PedidoPw, PedidoApi>();
  private consola: Array<{ t: number; texto: string }> = [];
  private http: Array<{ t: number; texto: string }> = [];
  private n = 0;

  constructor(readonly page: Pagina, readonly camino: string, readonly dispositivo: string) {
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (u.origin !== ORIGEN || !u.pathname.startsWith('/api/') || u.pathname.startsWith('/api/realtime')) return;
      // La medición propia manda varios eventos a la misma dirección: se distinguen por el evento
      let ruta = u.pathname + u.search;
      if (u.pathname === '/api/analytics' && r.method() === 'POST') {
        try { const b = JSON.parse(r.postData() ?? '{}') as { eventType?: string; eventLabel?: string }; ruta += ` (${b.eventType}${b.eventLabel ? ` ${b.eventLabel}` : ''})`; } catch { /* sin cuerpo */ }
      }
      const p: PedidoApi = { metodo: r.method(), ruta, inicio: Date.now(), fin: null, status: null };
      this.pedidos.push(p);
      this.enCurso.set(r, p);
    });
    const terminar = (r: PedidoPw) => { const p = this.enCurso.get(r); if (p) { p.fin = Date.now(); this.enCurso.delete(r); } };
    page.on('requestfinished', terminar);
    page.on('requestfailed', terminar);
    page.on('response', (r) => {
      const p = this.enCurso.get(r.request()); if (p) p.status = r.status();
      const u = new URL(r.url());
      if (u.origin === ORIGEN && r.status() >= 400) this.http.push({ t: Date.now(), texto: `${r.status()} ${r.request().method()} ${u.pathname}${u.search}` });
    });
    page.on('console', (m) => { if (m.type() === 'error') this.consola.push({ t: Date.now(), texto: `${m.text().slice(0, 200)}${m.location().url ? ` (${m.location().url!.replace(ORIGEN, '')})` : ''}` }); });
    page.on('pageerror', (e) => this.consola.push({ t: Date.now(), texto: `Error en la página: ${e.message.slice(0, 200)}` }));
  }

  /** Llega a una pantalla escribiendo la dirección (como desde un enlace de afuera o un correo). */
  async ir(nombre: string, ruta: string, meta: () => Localizador, nota?: string): Promise<void> {
    this.marca = Date.now();
    await this.page.goto(BASE + ruta, { waitUntil: 'commit', timeout: 60_000 });
    await this.pantalla(nombre, meta, nota);
  }

  /** Una pantalla nueva después de un toque (navegó, se abrió un paso o una ventana). */
  async pantalla(nombre: string, meta: () => Localizador, nota?: string): Promise<void> {
    await this.cerrar();
    this.inicioPantalla = this.marca;
    this.finCarga = Number.POSITIVE_INFINITY;
    const p: Pantalla = {
      camino: this.camino, dispositivo: this.dispositivo, nombre, url: '', toques: 0, campos: 0, palabras: 0, palabrasArriba: 0, bajar: 0, largo: 0,
      opciones: 0, msUsable: null, msFcp: null, hidratado: false, consola: [], http: [], enlaces: [],
      api: { total: 0, repetidos: [], enCascada: 0, niveles: 0, lista: [] }, guia: null, nota: nota ?? null,
    };
    this.actual = p;
    this.pantallas.push(p);
    const el = meta().first();
    await el.waitFor({ state: 'visible', timeout: 30_000 });
    // Activo y conectado por React: se revisa cada 50 ms
    let estado = { hidratado: false, bajar: 0 };
    for (let i = 0; i < 400; i++) {
      estado = await el.evaluate(new Function(`return ${ESTADO_META}`)() as (e: Element) => { hidratado: boolean; bajar: number });
      if (estado.hidratado && (await el.isEnabled().catch(() => true))) break;
      await this.page.waitForTimeout(50);
    }
    p.msUsable = Date.now() - this.marca;
    p.hidratado = estado.hidratado;
    p.bajar = round(estado.bajar);
    p.url = this.page.url().replace(ORIGEN, '');
    p.msFcp = await this.page.evaluate(`(() => { const t = performance.timeOrigin; if (t < ${this.marca} - 100) return null; const e = performance.getEntriesByType('paint').find((x) => x.name === 'first-contentful-paint'); return e ? Math.round(t + e.startTime - ${this.marca}) : null; })()`);
    // Lo que se pide al cargar llega en el primer segundo y medio
    await this.page.waitForTimeout(1500);
    const m = await this.page.evaluate<{ palabras: number; palabrasArriba: number; opciones: number; largo: number; enlaces: string[] }>(`(${MEDIR})()`);
    Object.assign(p, { palabras: m.palabras, palabrasArriba: m.palabrasArriba, opciones: m.opciones, largo: round(m.largo), enlaces: m.enlaces.map((e) => e.replace(ORIGEN, '')) });
    this.n += 1;
    if (FOTOS) await this.page.screenshot({ path: path.join(SALIDA, ETIQUETA, `${this.camino}-${this.dispositivo}-${String(this.n).padStart(2, '0')}.png`) }).catch(() => undefined);
  }

  async tocar(el: Localizador, forzar = false): Promise<void> {
    if (this.actual) { this.actual.toques += 1; if (this.finCarga === Number.POSITIVE_INFINITY) this.finCarga = Date.now(); }
    await el.first().scrollIntoViewIfNeeded().catch(() => undefined);
    this.marca = Date.now();
    await el.first().click({ timeout: 20_000, force: forzar });
  }

  async escribir(el: Localizador, texto: string): Promise<void> {
    if (this.actual) { this.actual.campos += 1; if (this.finCarga === Number.POSITIVE_INFINITY) this.finCarga = Date.now(); }
    await el.first().fill(texto, { timeout: 20_000 });
  }

  async elegir(el: Localizador, valor: string | { index: number }): Promise<void> {
    if (this.actual) { this.actual.toques += 1; if (this.finCarga === Number.POSITIVE_INFINITY) this.finCarga = Date.now(); }
    await el.first().selectOption(valor);
  }

  /** La guía de bienvenida (C-257) puede abrirse sola: se anota dónde y se cierra con un toque, como lo haría el cliente. */
  async guiaSiAparece(espera = 2500): Promise<void> {
    const guia = this.page.locator('[data-tour-dialogo]');
    const hasta = Date.now() + espera;
    while (Date.now() < hasta) {
      if (await guia.first().isVisible().catch(() => false)) {
        const titulo = (await this.page.locator('#tour-titulo').first().textContent().catch(() => null))?.trim() ?? 'guía';
        if (this.actual) this.actual.guia = titulo;
        await this.tocar(this.page.getByRole('button', { name: 'Cerrar el recorrido' }));
        await guia.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
        return;
      }
      await this.page.waitForTimeout(250);
    }
  }

  nota(texto: string): void { if (this.actual) this.actual.nota = this.actual.nota ? `${this.actual.nota}; ${texto}` : texto; }

  /** Cierra la pantalla actual: reparte los pedidos, los errores y las respuestas que le tocan. */
  async cerrar(): Promise<void> {
    const p = this.actual;
    if (!p) return;
    this.actual = null;
    const desde = this.inicioPantalla;
    const hasta = Date.now();
    const carga = this.pedidos.filter((x) => x.inicio >= desde && x.inicio < Math.min(this.finCarga, hasta));
    const clave = (x: PedidoApi) => `${x.metodo} ${x.ruta}`;
    const veces = new Map<string, number>();
    for (const x of carga) veces.set(clave(x), (veces.get(clave(x)) ?? 0) + 1);
    // Un pedido espera a otro si empieza cuando otro de la misma carga ya terminó (hasta 1,5 s después)
    const niveles = new Map<PedidoApi, number>();
    const ordenados = [...carga].sort((a, b) => a.inicio - b.inicio);
    let enCascada = 0;
    for (const x of ordenados) {
      const antes = ordenados.filter((o) => o !== x && o.fin !== null && o.fin <= x.inicio + 2 && x.inicio - o.fin < 1500 && o.metodo === 'GET');
      if (antes.length && x.metodo === 'GET') enCascada += 1;
      niveles.set(x, 1 + Math.max(0, ...antes.map((o) => niveles.get(o) ?? 1)));
    }
    p.api = {
      total: carga.length,
      repetidos: [...veces].filter(([, n]) => n > 1).map(([k, n]) => `${k} ×${n}`),
      enCascada,
      niveles: Math.max(0, ...niveles.values()),
      lista: carga.map((x) => `${clave(x)} → ${x.status ?? 'sin respuesta'}`),
    };
    p.consola = this.consola.filter((x) => x.t >= desde && x.t < hasta).map((x) => x.texto);
    p.http = this.http.filter((x) => x.t >= desde && x.t < hasta).map((x) => x.texto);
  }
}

const round = (n: number) => Math.round(n * 10) / 10;

/** El puntaje de estrés de una pantalla (la fórmula del encabezado). */
function puntajePantalla(p: Pantalla, muertos: Set<string>): number {
  const espera = p.msUsable === null ? 0 : Math.max(0, p.msUsable - 1000) / 1000;
  const errores = p.consola.length + p.http.filter((h) => h.startsWith('5')).length;
  const cuatro = p.http.filter((h) => h.startsWith('4')).length;
  return 4 + p.toques + 1.5 * p.campos + p.palabras / 40 + 2 * p.bajar + Math.max(0, p.opciones - 7) / 5 + 2 * espera
    + 10 * errores + 5 * cuatro + 10 * p.enlaces.filter((e) => muertos.has(e)).length
    + p.api.repetidos.length + Math.max(0, p.api.niveles - 2);
}

// ---------- los datos de prueba
const SELLO = Date.now().toString(36);
// Cada dispositivo tiene sus cuentas y su gift card: lo que hace el teléfono (canjear, firmar, registrarse) no le cambia
// el camino a la computadora
const correosDe = (sello: string) => ({ cliente: `estres-cliente-${sello}@prueba.local`, nuevo: `estres-nuevo-${sello}@prueba.local`, sorteo: `estres-sorteo-${sello}@prueba.local`, olvido: `estres-olvido-${sello}@prueba.local` });
let CORREOS = correosDe(SELLO);
const CLAVE = 'Estres-C258-clave!';
const nuevaGift = () => `ESMC${crypto.randomBytes(6).toString('hex').toUpperCase().replace(/[^A-Z2-9]/g, 'X').slice(0, 12).padEnd(12, 'Q')}`;
let GIFT = nuevaGift();
interface Datos { cliente: UsuarioPrueba; fisico: { slug: string; name: string }; ferreteria: { slug: string } | null; digital: { slug: string } | null; pedidoEnviado: string; pedidoEntregado: string; pedidoDigital: string; giftId: string }

async function preparar(): Promise<Datos> {
  const fisico = await prisma.product.findFirst({ where: { status: 'PUBLISHED', deletedAt: null, productType: 'PHYSICAL', supplierId: null, stock: { gt: 2 }, priceUSD: { lte: 80 } }, orderBy: { priceUSD: 'desc' }, select: { id: true, slug: true, name: true, sku: true, priceUSD: true, mainImage: true } });
  if (!fisico) throw new Error('Falta un producto físico de Guanare publicado, con existencia y de $80 o menos');
  const ferreteria = await prisma.product.findFirst({ where: { status: 'PUBLISHED', deletedAt: null, productType: 'PHYSICAL', supplierId: { not: null }, stock: { gt: 0 } }, select: { slug: true } });
  const digital = await prisma.product.findFirst({ where: { status: 'PUBLISHED', deletedAt: null, productType: 'DIGITAL', digitalVariants: { some: { isActive: true } } }, select: { id: true, slug: true, name: true, sku: true } });
  if (!(await prisma.sorteo.count({ where: { activo: true } }))) throw new Error('Falta el sorteo encendido');

  const ahora = Date.now();
  const direcciones = JSON.stringify([{ id: 'dir-estres-1', type: 'ZOOM', firstName: '', lastName: '', addressLine1: 'Av. 20 con calle 25, local 3', addressLine2: '', address: 'Av. 20 con calle 25, local 3', city: 'Barquisimeto', state: 'Lara', phone: '', recipientIdNumber: '', isDefault: true, agencyName: 'Zoom Barquisimeto Centro', agencyCode: '4401', cityCode: '44', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]);
  const cliente = await crearUsuario(CORREOS.cliente, 'María Fernanda Rojas', 'USER', { puntos: 300, perfil: { phone: '+58 4145551234', idNumber: 'V-18456123', savedAddresses: direcciones, savedCart: '[]' } });
  const tasa = 911.6243;
  const orden = (datos: Record<string, unknown>, items: Array<{ id: string; name: string; sku: string; priceUSD: unknown; mainImage: string | null }>, dias: number) => {
    const total = items.reduce((s, i) => s + Number(i.priceUSD), 0);
    return prisma.order.create({ data: {
      orderNumber: `ORD-2026-E${SELLO.slice(-4)}${Math.floor(Math.random() * 900 + 100)}`, userId: cliente.id, subtotalUSD: total, taxUSD: Math.round((total - total / 1.16) * 100) / 100, shippingUSD: 0, totalUSD: total,
      exchangeRate: tasa, exchangeRateVES: tasa, totalVES: Math.round(total * tasa * 100) / 100, paymentMethod: 'WALLET', paymentStatus: 'PAID',
      recipientName: 'María Fernanda Rojas', recipientIdNumber: 'V-18456123', recipientPhone: '04145551234', billingType: 'PERSON', billingName: 'María Fernanda Rojas', billingTaxId: 'V-18456123',
      createdAt: new Date(ahora - dias * 86_400_000), paidAt: new Date(ahora - dias * 86_400_000), ...datos,
      items: { create: items.map((i) => ({ productId: i.id, productName: i.name, productSku: i.sku, productImage: i.mainImage, quantity: 1, priceUSD: Number(i.priceUSD), totalUSD: Number(i.priceUSD), productCondition: 'NEW', warrantyDays: 30 })) },
    }, include: { items: true } });
  };
  const enviado = await orden({ status: 'SHIPPED', deliveryMethod: 'SHIPPING', shippingCarrier: 'ZOOM', shippingMode: 'OFFICE', shippingPaidBy: 'CUSTOMER', trackingNumber: '1234567890', shippedAt: new Date(ahora - 2 * 86_400_000), shippingState: 'Lara', shippingCity: 'Barquisimeto', courierOfficeName: 'Zoom Barquisimeto Centro', courierOfficeCode: '4401', shippingAddress: 'ZOOM Barquisimeto Centro, Av. 20 con calle 25',
    shipmentEvents: { create: [{ source: 'ZOOM', description: 'Recibido en la agencia de origen', occurredAt: new Date(ahora - 2 * 86_400_000) }, { source: 'ZOOM', description: 'En tránsito hacia la agencia de destino', occurredAt: new Date(ahora - 86_400_000) }] } }, [fisico], 3);
  const entregado = await orden({ status: 'DELIVERED', deliveryMethod: 'SHIPPING', shippingCarrier: 'ZOOM', shippingMode: 'OFFICE', shippedAt: new Date(ahora - 8 * 86_400_000), deliveredAt: new Date(ahora - 5 * 86_400_000), shippingState: 'Lara', shippingCity: 'Barquisimeto', courierOfficeName: 'ZOOM Barquisimeto Centro', shippingAddress: 'ZOOM Barquisimeto Centro' }, [fisico], 10);
  let pedidoDigital = '';
  if (digital) {
    const d = await orden({ status: 'DELIVERED', deliveryMethod: 'DIGITAL', shippingAddress: 'Entrega digital', deliveredAt: new Date(ahora - 86_400_000) }, [{ ...digital, priceUSD: 16.5, mainImage: null }], 2);
    await prisma.digitalCode.create({ data: { productId: digital.id, code: `E258-${SELLO.toUpperCase()}`, status: 'DELIVERED', orderId: d.id, orderItemId: d.items[0].id, soldAt: new Date(), deliveredAt: new Date() } });
    pedidoDigital = d.id;
  }
  const codigo = GIFT;
  const gift = await prisma.giftCard.create({ data: { code: codigo, codeHash: crypto.createHash('sha256').update(codigo).digest('hex'), codeLast4: codigo.slice(-4), amountUSD: 10, balanceUSD: 10, status: 'ACTIVE', activatedAt: new Date(), expiresAt: new Date(ahora + 365 * 86_400_000) } });
  return { cliente, fisico, ferreteria, digital, pedidoEnviado: enviado.id, pedidoEntregado: entregado.id, pedidoDigital, giftId: gift.id };
}

async function limpiar(datos: Datos | null): Promise<void> {
  const usuarios = await prisma.user.findMany({ where: { email: { in: Object.values(CORREOS) } }, select: { id: true } });
  const ids = usuarios.map((u) => u.id);
  const ordenes = await prisma.order.findMany({ where: { userId: { in: ids } }, select: { id: true, paymentStatus: true, status: true, items: { select: { productId: true, quantity: true, product: { select: { productType: true } } } } } });
  // Lo que descontaron las compras del recorrido vuelve al inventario (las órdenes sembradas no lo descontaron)
  const sembradas = new Set([datos?.pedidoEnviado, datos?.pedidoEntregado, datos?.pedidoDigital].filter(Boolean));
  for (const o of ordenes) {
    if (sembradas.has(o.id) || o.status === 'CANCELLED') continue;
    for (const i of o.items) if (i.product?.productType === 'PHYSICAL') await prisma.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } });
  }
  const oids = ordenes.map((o) => o.id);
  await prisma.warrantyClaimEvent.deleteMany({ where: { claim: { userId: { in: ids } } } });
  await prisma.warrantyClaim.deleteMany({ where: { userId: { in: ids } } });
  await prisma.digitalCode.deleteMany({ where: { orderId: { in: oids } } });
  await prisma.shipmentEvent.deleteMany({ where: { orderId: { in: oids } } });
  await prisma.stockReservation.deleteMany({ where: { userId: { in: ids } } });
  await prisma.pagoMovilVerificacion.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined);
  await prisma.orderItem.deleteMany({ where: { orderId: { in: oids } } });
  await prisma.order.deleteMany({ where: { id: { in: oids } } });
  const cuentas = await prisma.userBalance.findMany({ where: { userId: { in: ids } }, select: { id: true } });
  await prisma.transaction.deleteMany({ where: { balanceId: { in: cuentas.map((c) => c.id) } } });
  await prisma.giftCard.deleteMany({ where: { code: GIFT } }); // sus movimientos se borran con ella
  await prisma.participanteSorteo.deleteMany({ where: { userId: { in: ids } } });
  await prisma.contactMessage.deleteMany({ where: { email: { in: Object.values(CORREOS) } } });
  await prisma.productRequest.deleteMany({ where: { OR: [{ userId: { in: ids } }, { email: { in: Object.values(CORREOS) } }] } }).catch(() => undefined);
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
  // La firma de los términos de los Puntos ES (la imagen queda en private-uploads/signatures/, fuera de git)
  await prisma.documentSignature.deleteMany({ where: { userId: { in: ids } } });
  await prisma.balanceTermsAcceptance.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

// Los enlaces se guardan como huella (lib/token-huella.ts, C-285): de la base ya no se lee el que va en el correo. Se deja en su
// lugar uno conocido, y ese es el que abre el camino.
const tokenDe = async (email: string, tabla: 'verificacion' | 'clave') => {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return null;
  const conocido = crypto.randomBytes(32).toString('hex');
  const guardado = tokenParaGuardar(conocido);
  if (tabla === 'verificacion') {
    const fila = await prisma.emailVerificationToken.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, select: { id: true } });
    if (!fila) return null;
    await prisma.emailVerificationToken.update({ where: { id: fila.id }, data: { token: guardado } });
  } else {
    const fila = await prisma.passwordResetToken.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, select: { id: true } });
    if (!fila) return null;
    await prisma.passwordResetToken.update({ where: { id: fila.id }, data: { token: guardado } });
  }
  return conocido;
};

// ---------- los caminos
type Paso = (r: Recorrido, d: Datos, telefono: boolean) => Promise<void>;
interface Camino { nombre: string; meta: string; conCliente: boolean; correr: Paso }

const buscador = (r: Recorrido) => r.page.locator('input[type=search]').filter({ visible: true });
// El contenido es el <main>; las páginas que no lo tienen (Cursos y Servicios, 15/11) se leen enteras
const enContenido = (r: Recorrido, selector: string) => r.page.locator(`:is(main, body:not(:has(main))) ${selector}`).filter({ visible: true });
const boton = (r: Recorrido, nombre: string | RegExp) => r.page.getByRole('button', { name: nombre }).filter({ visible: true });
const enlace = (r: Recorrido, nombre: string | RegExp) => r.page.getByRole('link', { name: nombre }).filter({ visible: true });

/** Del producto agregado al carrito: en el teléfono, la barra de abajo; en la computadora, el ícono del encabezado y "Ver carrito". */
async function irAlCarrito(r: Recorrido, telefono: boolean): Promise<void> {
  await r.page.waitForTimeout(800);
  if (telefono) {
    await r.tocar(r.page.locator('a[href="/carrito"]').filter({ visible: true }));
  } else {
    await r.tocar(r.page.locator('header button[aria-label^="Carrito"], header div.relative > button:not([aria-label])').filter({ visible: true }));
    await r.tocar(enlace(r, /Ver Carrito/i));
  }
  await r.pantalla('Carrito', () => boton(r, 'Proceder al pago'));
}

/** Del carrito con un producto al pedido hecho: Entrega, Revisar y Pagar (C-241). */
async function pagar(r: Recorrido, metodo: 'puntos' | 'pago-movil'): Promise<void> {
  await r.tocar(boton(r, 'Proceder al pago'));
  await r.pantalla('Checkout · Entrega', () => boton(r, /Siguiente: revisar/));
  await r.tocar(boton(r, /Siguiente: revisar/));
  await r.pantalla('Checkout · Revisar', () => r.page.locator('#acceptTerms'));
  await r.tocar(r.page.locator('label[for=acceptTerms]'));
  await r.tocar(boton(r, /Siguiente: pagar/));
  await r.pantalla('Checkout · Pagar', () => r.page.locator('input[name=metodo-pago]').locator('xpath=..'));
  if (metodo === 'puntos') {
    await r.tocar(r.page.locator('label').filter({ hasText: 'Puntos ES' }).filter({ visible: true }));
  } else {
    await r.tocar(r.page.locator('label').filter({ hasText: /Pago Móvil/ }).filter({ visible: true }));
  }
  await r.tocar(boton(r, /Completar Pedido/));
  await r.pantalla('Pedido hecho', () => enlace(r, /Mis pedidos|Ver mis pedidos|Ver pedido/));
}

const CAMINOS: Camino[] = [
  {
    nombre: 'primera-visita', meta: 'Encontrar un producto con el buscador y agregarlo al carrito', conCliente: false,
    correr: async (r, _d, telefono) => {
      await r.ir('Inicio', '/', () => buscador(r));
      await r.escribir(buscador(r), 'taladro');
      await r.tocar(boton(r, 'Buscar'));
      await r.pantalla('Resultados de "taladro"', () => enContenido(r, 'a[href^="/productos/"]'));
      await r.tocar(enContenido(r, 'a[href^="/productos/"]'));
      await r.pantalla('Ficha del producto', () => boton(r, 'Agregar al carrito').filter({ hasText: /Agregar/ }));
      await r.tocar(boton(r, 'Agregar al carrito').filter({ hasText: /Agregar/ }));
      await irAlCarrito(r, telefono);
    },
  },
  {
    nombre: 'por-categorias', meta: 'Encontrar un producto por las categorías y agregarlo al carrito', conCliente: false,
    correr: async (r, _d, telefono) => {
      await r.ir('Inicio', '/', () => enlace(r, 'Ferretería'));
      await r.tocar(enlace(r, 'Ferretería'));
      await r.pantalla('Departamento Ferretería', () => enContenido(r, 'a[href^="/productos/"]'));
      await r.tocar(enContenido(r, 'a[href^="/productos/"]'));
      await r.pantalla('Ficha del producto', () => boton(r, 'Agregar al carrito').filter({ hasText: /Agregar/ }));
      await r.tocar(boton(r, 'Agregar al carrito').filter({ hasText: /Agregar/ }));
      await irAlCarrito(r, telefono);
    },
  },
  {
    nombre: 'compra-puntos', meta: 'Comprar con Puntos ES y ver el pedido en Mis pedidos', conCliente: true,
    correr: async (r, d, telefono) => {
      await r.ir('Ficha del producto', `/productos/${d.fisico.slug}`, () => boton(r, 'Agregar al carrito').filter({ hasText: /Agregar/ }));
      await r.tocar(boton(r, 'Agregar al carrito').filter({ hasText: /Agregar/ }));
      await irAlCarrito(r, telefono);
      await pagar(r, 'puntos');
      await r.tocar(enlace(r, /Mis pedidos|Ver mis pedidos|Ver pedido/));
      await r.pantalla('Mis pedidos', () => boton(r, /Detalle y recibo/));
    },
  },
  {
    nombre: 'registro', meta: 'Crear la cuenta, activarla desde el correo y llegar a Mi panel', conCliente: false,
    correr: async (r) => {
      await r.ir('Crear cuenta', '/registro', () => r.page.locator('#name'));
      await r.escribir(r.page.locator('#name'), 'Luisa Mendoza');
      await r.escribir(r.page.locator('#email'), CORREOS.nuevo);
      await r.escribir(r.page.locator('#phone'), '04125550000');
      await r.escribir(r.page.locator('#password'), CLAVE);
      await r.tocar(r.page.locator('label[for=acceptTerms], #acceptTerms').filter({ visible: true }));
      await resolverCaptcha(r);
      await r.tocar(r.page.locator('form button[type=submit]').filter({ visible: true }));
      await r.pantalla('Después de registrarse', () => buscador(r));
      await r.guiaSiAparece();
      const token = await tokenDe(CORREOS.nuevo, 'verificacion');
      if (!token) throw new Error('No se creó el enlace de activación');
      await r.ir('Activar la cuenta (enlace del correo)', `/verificar-email/${token}`, () => r.page.locator('main a, main button').filter({ hasText: /panel|Ir|Volver|Seguir|Comprar|tienda/i }));
      await r.tocar(r.page.locator('main a, main button').filter({ hasText: /panel|Ir|Volver|Seguir|Comprar|tienda/i }));
      await r.page.waitForTimeout(1000);
      await r.ir('Mi panel', '/customer', () => r.page.locator('main h1, main h2').first());
      await r.guiaSiAparece();
    },
  },
  {
    nombre: 'recargar-puntos', meta: 'Pedir una recarga de Puntos ES por Zelle (la primera vez, con los términos firmados)', conCliente: true,
    correr: async (r) => {
      await r.ir('Puntos ES', '/customer/balance', () => boton(r, /Recargar/));
      await r.tocar(boton(r, /Recargar/));
      // La primera recarga pide leer y firmar los términos de los Puntos ES (C-139): se lee hasta el final
      await r.pantalla('Términos de los Puntos ES', () => r.page.locator('[aria-label="Texto del documento"]'));
      await r.page.locator('[aria-label="Texto del documento"]').first().evaluate((el) => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); });
      r.nota('hay que bajar todo el texto para poder aceptar');
      await r.tocar(r.page.locator('[role=dialog] input[type=checkbox]').filter({ visible: true }));
      await r.tocar(boton(r, 'Continuar a la firma'));
      await r.pantalla('Firmar los términos', () => boton(r, /^Firmar$/));
      for (const [id, valor] of [['#firma-telefono', '04145551234'], ['#firma-direccion', 'Barquisimeto, Lara']] as const) {
        const campo = r.page.locator(id);
        if (!(await campo.inputValue().catch(() => ''))) await r.escribir(campo, valor);
      }
      const lienzo = r.page.locator('[role=dialog] canvas').first();
      const caja = await lienzo.boundingBox();
      if (caja) {
        if (r.pantallas.length) r.pantallas[r.pantallas.length - 1].toques += 1;
        await r.page.mouse.move(caja.x + 20, caja.y + caja.height / 2);
        await r.page.mouse.down();
        await r.page.mouse.move(caja.x + caja.width / 2, caja.y + 15, { steps: 8 });
        await r.page.mouse.move(caja.x + caja.width - 20, caja.y + caja.height - 15, { steps: 8 });
        await r.page.mouse.up();
        await r.page.waitForTimeout(1000); // el trazo se termina de dibujar (y de medir) en los cuadros siguientes
      }
      await r.tocar(boton(r, /^Firmar$/));
      await r.pantalla('Términos firmados', () => boton(r, /^Continuar$/));
      await r.tocar(boton(r, /^Continuar$/));
      await r.pantalla('Recargar Puntos ES', () => r.page.locator('[role=dialog] button, .fixed button').filter({ hasText: /Zelle/ }));
      await r.tocar(r.page.locator('button').filter({ hasText: /^USD\s*25$/ }).filter({ visible: true }));
      await r.tocar(r.page.locator('button').filter({ hasText: /Zelle/ }).filter({ visible: true }));
      await r.escribir(r.page.getByPlaceholder(/Ej: 123456789/), 'ZL-778812');
      await r.tocar(boton(r, /Confirmar Recarga/));
      await r.pantalla('¿Estás seguro?', () => boton(r, /Sí, recargar/));
      await r.tocar(boton(r, /Sí, recargar/));
      await r.pantalla('Recarga enviada', () => r.page.getByText(/por confirmar/i).filter({ visible: true }));
    },
  },
  {
    nombre: 'gift-card', meta: 'Canjear una gift card y ver Mis códigos', conCliente: true,
    correr: async (r, d) => {
      await r.ir('Canjear gift card', '/canjear-gift-card', () => enContenido(r, 'input'));
      await r.escribir(enContenido(r, 'input'), GIFT);
      await r.tocar(enContenido(r, 'button[type=submit], button').filter({ hasText: /Verificar|Canjear|Consultar/ }));
      await r.pantalla('Gift card verificada', () => enContenido(r, 'button').filter({ hasText: /Canjear/ }));
      await r.tocar(enContenido(r, 'button').filter({ hasText: /Canjear/ }));
      await r.page.waitForTimeout(1500);
      if (d.pedidoDigital) {
        await r.ir('Mis pedidos', '/customer/orders', () => enlace(r, /Ver mis códigos/));
        await r.tocar(enlace(r, /Ver mis códigos/));
        // La tarjeta se voltea y el código se raspa (o "Revelar sin raspar")
        await r.pantalla('Mis códigos', () => boton(r, /Voltear tarjeta/));
        await r.tocar(boton(r, /Voltear tarjeta/));
        await r.tocar(boton(r, /Revelar sin raspar/));
        await r.pantalla('Código a la vista', () => r.page.getByRole('button', { name: 'Copiar código revelado' }));
      }
    },
  },
  {
    nombre: 'seguir-pedido', meta: 'Ver dónde va un pedido enviado', conCliente: true,
    correr: async (r, d) => {
      // Mi panel enlaza cada pedido en curso a Mis pedidos con su detalle abierto (?orden=)
      const suPedido = () => r.page.locator(`main a[href="/customer/orders?orden=${d.pedidoEnviado}"]`).filter({ visible: true });
      await r.ir('Mi panel', '/customer', suPedido);
      await r.tocar(suPedido());
      await r.pantalla('Detalle del pedido', () => r.page.locator('[role=dialog]').getByText('1234567890').filter({ visible: true }));
    },
  },
  {
    nombre: 'garantia', meta: 'Pedir la garantía de un producto entregado', conCliente: true,
    correr: async (r) => {
      await r.ir('Garantía', '/customer/warranty', () => r.page.getByRole('tab', { name: /Nueva/ }));
      await r.tocar(r.page.getByRole('tab', { name: /Nueva/ }));
      await r.pantalla('Nueva solicitud', () => r.page.locator('main button:not([disabled])').filter({ hasText: /Elegible/ }));
      await r.tocar(r.page.locator('main button:not([disabled])').filter({ hasText: /Elegible/ }));
      await r.pantalla('Solicitar garantía', () => r.page.locator('#w-reason'));
      if (!(await r.page.locator('#w-item').inputValue().catch(() => ''))) await r.elegir(r.page.locator('#w-item'), { index: 1 });
      await r.elegir(r.page.locator('#w-reason'), { index: 1 });
      await r.escribir(r.page.locator('#w-descripcion'), 'Dejó de encender después de una semana de uso normal.');
      await r.tocar(boton(r, /Confirmar solicitud/));
      await r.pantalla('Solicitud enviada', () => r.page.getByText(/recibimos|enviada|en revisión|Recibida/i).filter({ visible: true }));
    },
  },
  {
    nombre: 'sorteo', meta: 'Entrar al sorteo, crear la cuenta y volver por el enlace para invitar', conCliente: false,
    correr: async (r) => {
      await r.ir('Sorteo', '/sorteo', () => enlace(r, /Quiero mi boleto/));
      await r.tocar(enlace(r, /Quiero mi boleto/));
      await r.page.waitForTimeout(600);
      await r.tocar(enlace(r, /Crear mi cuenta gratis/));
      await r.pantalla('Crear cuenta (desde el sorteo)', () => r.page.locator('#name'));
      await r.escribir(r.page.locator('#name'), 'Pedro Sorteo');
      await r.escribir(r.page.locator('#email'), CORREOS.sorteo);
      await r.escribir(r.page.locator('#phone'), '04125550001');
      await r.escribir(r.page.locator('#password'), CLAVE);
      await r.tocar(r.page.locator('label[for=acceptTerms], #acceptTerms').filter({ visible: true }));
      await resolverCaptcha(r);
      await r.tocar(r.page.locator('form button[type=submit]').filter({ visible: true }));
      await r.pantalla('De vuelta en el sorteo', () => r.page.locator('main').getByText(/\/s\/[A-Z2-9]{8}/).filter({ visible: true }));
      await r.guiaSiAparece();
    },
  },
  {
    nombre: 'contacto', meta: 'Mandar un mensaje a la tienda', conCliente: false,
    correr: async (r) => {
      await r.ir('Contacto', '/contacto', () => r.page.locator('#name'));
      await r.escribir(r.page.locator('#name'), 'Carlos Pérez');
      await r.escribir(r.page.locator('#email'), CORREOS.nuevo);
      await r.escribir(r.page.locator('#phone'), '04165550000');
      await r.elegir(r.page.locator('#subject'), { index: 1 });
      await r.escribir(r.page.locator('#message'), '¿Tienen el taladro percutor en existencia para retirar mañana?');
      await resolverCaptcha(r);
      await r.tocar(enContenido(r, 'form button[type=submit]'));
      await r.pantalla('Mensaje enviado', () => r.page.getByText(/enviado|recibimos|gracias/i).filter({ visible: true }));
    },
  },
  {
    // Pide una cuenta: sin sesión se llena todo y el botón queda apagado (anotado en estado/C-258.md)
    nombre: 'solicitar-producto', meta: 'Pedir un producto que no está en la tienda (con la cuenta abierta)', conCliente: true,
    correr: async (r) => {
      await r.ir('Solicitar producto', '/solicitar-producto', () => r.page.locator('#productName'));
      if (await r.page.locator('#customerName').isVisible().catch(() => false)) {
        await r.escribir(r.page.locator('#customerName'), 'Carlos Pérez');
        await r.escribir(r.page.locator('#customerEmail'), CORREOS.nuevo);
        await r.escribir(r.page.locator('#customerPhone'), '04165550000');
      }
      await r.escribir(r.page.locator('#productName'), 'Control de PS5 DualSense blanco');
      await r.elegir(r.page.locator('#category'), { index: 1 });
      await r.escribir(r.page.locator('#productDescription'), 'Original, nuevo, para regalo de Navidad.');
      await resolverCaptcha(r);
      await r.tocar(enContenido(r, 'form button[type=submit]'));
      await r.pantalla('Solicitud enviada', () => r.page.getByText(/enviad|recibimos|gracias/i).filter({ visible: true }));
    },
  },
  {
    nombre: 'cursos-servicios', meta: 'Ver un curso y los servicios del taller', conCliente: false,
    correr: async (r) => {
      await r.ir('Cursos', '/cursos', () => enContenido(r, 'a[href^="/cursos/"]'));
      await r.tocar(enContenido(r, 'a[href^="/cursos/"]'));
      await r.pantalla('Un curso', () => enContenido(r, 'h1'));
      await r.ir('Servicios', '/servicios', () => enContenido(r, 'h1'));
    },
  },
  {
    nombre: 'recuperar-clave', meta: 'Recuperar la contraseña desde el login y entrar', conCliente: false,
    correr: async (r) => {
      await crearUsuarioConClave(CORREOS.olvido);
      await r.ir('Entrar', '/login', () => enlace(r, /olvidaste/i));
      await r.tocar(enlace(r, /olvidaste/i));
      await r.pantalla('Recuperar contraseña', () => enContenido(r, 'input[type=email]'));
      await r.escribir(enContenido(r, 'input[type=email]'), CORREOS.olvido);
      await resolverCaptcha(r);
      await r.tocar(enContenido(r, 'button[type=submit]'));
      await r.pantalla('Correo enviado', () => r.page.locator('main').getByText(/correo|revisa|enviamos/i).filter({ visible: true }));
      const token = await tokenDe(CORREOS.olvido, 'clave');
      if (!token) throw new Error('No se creó el enlace para cambiar la contraseña');
      await r.ir('Nueva contraseña (enlace del correo)', `/recuperar-contrasena/${token}`, () => enContenido(r, 'input[type=password]'));
      const claves = enContenido(r, 'input[type=password]');
      const cuantas = await claves.count();
      for (let i = 0; i < cuantas; i++) await r.escribir(claves.nth(i), `${CLAVE}2`);
      await r.tocar(enContenido(r, 'button[type=submit]'));
      await r.pantalla('Contraseña cambiada', () => r.page.locator('main a, main button').filter({ hasText: /Ir al login|Entrar|Iniciar sesión/i }));
    },
  },
];

async function resolverCaptcha(r: Recorrido): Promise<void> {
  // La clave de prueba de hCaptcha pasa con un toque en la casilla (el servidor de prueba no la verifica: fetch-mock).
  // El título del marco sale en el idioma del navegador; con la clave de prueba un aviso tapa la casilla: toque forzado.
  // El marco carga su guion al llegar a la vista: se espera la casilla y se repite si el toque llegó antes de tiempo.
  const casilla = r.page.frameLocator('iframe[src*="hcaptcha"][title*="casilla"], iframe[src*="hcaptcha"][title*="checkbox"]').locator('#checkbox');
  for (let intento = 0; intento < 3; intento++) {
    await casilla.waitFor({ state: 'visible', timeout: 20_000 });
    await r.page.waitForTimeout(600);
    await r.tocar(casilla, true);
    for (let i = 0; i < 20; i++) {
      if (await r.page.evaluate("Boolean(document.querySelector('[name=h-captcha-response]')?.value)")) return;
      await r.page.waitForTimeout(250);
    }
  }
  throw new Error('El captcha de prueba no respondió');
}

async function crearUsuarioConClave(email: string): Promise<void> {
  const bcrypt = requerir('bcryptjs') as { hash(clave: string, vueltas: number): Promise<string> };
  await prisma.user.create({ data: { email, name: 'Rosa Olvido', role: 'USER', emailVerified: new Date(), password: await bcrypt.hash(CLAVE, 10), profile: { create: { phone: '04125550002' } } } });
}

// ---------- los enlaces: cada uno una vez
async function revisarEnlaces(enlaces: string[], cookie: string): Promise<Map<string, number>> {
  const estados = new Map<string, number>();
  const unicos = [...new Set(enlaces.map((e) => e.split('#')[0]).filter((e) => e && !e.startsWith('/api/') && !e.startsWith('/_next/')))];
  for (const ruta of unicos) {
    const res = await fetch(BASE + ruta, { redirect: 'manual', headers: { Cookie: cookie } }).catch(() => null);
    estados.set(ruta, res?.status ?? 0);
  }
  return estados;
}

// ---------- informe
function tabla(resultados: ResultadoCamino[]): string {
  const filas = ['| Camino | Dispositivo | Logrado | Pantallas | Toques | Campos | Palabras | Bajar | Opciones (máx.) | Usable (ms, máx.) | Errores | API (repetidos / cascada) | Puntaje |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const c of resultados) {
    const s = (f: (p: Pantalla) => number) => c.pantallas.reduce((a, p) => a + f(p), 0);
    const max = (f: (p: Pantalla) => number) => Math.max(0, ...c.pantallas.map(f));
    filas.push(`| ${c.camino} | ${c.dispositivo} | ${c.logrado ? 'sí' : `no: ${c.error?.slice(0, 60)}`} | ${c.pantallas.length} | ${s((p) => p.toques)} | ${s((p) => p.campos)} | ${s((p) => p.palabras)} | ${round(s((p) => p.bajar))} | ${max((p) => p.opciones)} | ${max((p) => p.msUsable ?? 0)} | ${s((p) => p.consola.length + p.http.length)} | ${s((p) => p.api.total)} (${s((p) => p.api.repetidos.length)} / ${s((p) => p.api.enCascada)}) | ${round(c.puntaje)} |`);
  }
  return filas.join('\n');
}

async function main(): Promise<void> {
  const resultados: ResultadoCamino[] = [];
  let datos: Datos | null = null;
  const navegador = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    for (const dispositivo of DISPOSITIVOS) {
      if (datos) await limpiar(datos);
      CORREOS = correosDe(`${SELLO}${dispositivo.slice(0, 1)}`);
      GIFT = nuevaGift();
      datos = await preparar();
      for (const camino of CAMINOS) {
        if (SOLO && !SOLO.includes(camino.nombre)) continue;
        // Cada camino empieza de cero: sin la sesión ni el carrito del anterior
        await prisma.profile.update({ where: { userId: datos.cliente.id }, data: { savedCart: '[]' } });
        const ctx = await navegador.newContext({ ...PERFILES[dispositivo], locale: 'es-VE', timezoneId: 'America/Caracas' });
        await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGEN }).catch(() => undefined);
        // Quien ya es cliente ya vio la guía de bienvenida (C-257 la rehace: se mide en los caminos de una cuenta nueva)
        // C-257: 'electroweb_guias' = 'todo' apaga también las hojas "Así funciona" de /sorteo, /checkout y /customer/balance
        if (camino.conCliente) await ctx.addInitScript("try { localStorage.setItem('electroweb_onboarding_done', '1'); localStorage.setItem('electroweb_guias', 'todo'); } catch {}");
        if (camino.conCliente) await ctx.addCookies([{ name: 'next-auth.session-token', value: datos.cliente.token, domain: new URL(BASE).hostname, path: '/' }]);
        const page = await ctx.newPage();
        const r = new Recorrido(page, camino.nombre, dispositivo);
        let error: string | null = null;
        try {
          await camino.correr(r, datos, dispositivo === 'telefono');
        } catch (e) {
          error = e instanceof Error ? e.message.split('\n')[0] : String(e);
          await page.screenshot({ path: path.join(SALIDA, ETIQUETA, `FALLA-${camino.nombre}-${dispositivo}.png`) }).catch(() => undefined);
        }
        await r.cerrar();
        resultados.push({ camino: camino.nombre, dispositivo, meta: camino.meta, logrado: !error, error, pantallas: r.pantallas, puntaje: 0 });
        console.log(`${error ? 'NO ' : 'OK '} ${camino.nombre} · ${dispositivo} · ${r.pantallas.length} pantallas${error ? ` · ${error}` : ''}`);
        await ctx.close();
      }
    }
    const enlaces = SIN_ENLACES ? new Map<string, number>() : await revisarEnlaces(resultados.flatMap((c) => c.pantallas.flatMap((p) => p.enlaces)), `next-auth.session-token=${datos.cliente.token}`);
    const muertos = new Set([...enlaces].filter(([, s]) => s === 404).map(([e]) => e));
    for (const c of resultados) c.puntaje = c.pantallas.reduce((a, p) => a + puntajePantalla(p, muertos), 0);
    const md = [`# Estrés de los caminos (${ETIQUETA})`, '', tabla(resultados), '', `Enlaces revisados: ${enlaces.size}; muertos (404): ${muertos.size ? [...muertos].join(', ') : 'ninguno'}`, '',
      ...resultados.flatMap((c) => [`## ${c.camino} · ${c.dispositivo} (${round(c.puntaje)})`, '', '| Pantalla | Toques | Campos | Palabras (arriba) | Bajar | Opciones | Usable ms | FCP ms | API | Repetidos | Cascada (niveles) | Errores | Guía |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
        ...c.pantallas.map((p) => `| ${p.nombre} | ${p.toques} | ${p.campos} | ${p.palabras} (${p.palabrasArriba}) | ${p.bajar} | ${p.opciones} | ${p.msUsable ?? ''} | ${p.msFcp ?? ''} | ${p.api.total} | ${p.api.repetidos.join(', ')} | ${p.api.enCascada} (${p.api.niveles}) | ${[...p.consola, ...p.http].join('; ').slice(0, 300)} | ${p.guia ?? ''} |`), ''])].join('\n');
    writeFileSync(path.join(SALIDA, `estres-${ETIQUETA}.json`), JSON.stringify({ etiqueta: ETIQUETA, base: BASE, resultados, enlaces: Object.fromEntries(enlaces) }, null, 2));
    writeFileSync(path.join(SALIDA, `estres-${ETIQUETA}.md`), md);
    console.log(`\n${tabla(resultados)}\n\nEnlaces revisados: ${enlaces.size}; muertos: ${[...muertos].join(', ') || 'ninguno'}\nResultado: ${path.join(SALIDA, `estres-${ETIQUETA}.md`)}`);
  } finally {
    await navegador.close();
    await limpiar(datos).catch((e) => console.error('Error limpiando:', e));
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
