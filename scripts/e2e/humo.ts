// Prueba de humo antes de un deploy: recorre la tienda y el panel con una compra real de prueba (rev10_demo).
// Nació con el bloque de subida del 01/10 (C-149, C-147, C-150, C-146b, C-147b y C-151).
// Uso (con `next start -p 3100` sobre el esquema de prueba): npx tsx scripts/e2e/humo.ts <carpeta para las capturas>
import http from 'node:http';
import { abrirNavegador, api, BASE, borrarUsuarios, correr, crearUsuario, prisma, t } from './lib';
import { csvRelacionVentas, type FilaVenta } from '@/lib/relacion-ventas';

const CORREOS = ['bloque-cliente@demo.test', 'bloque-dueno@demo.test', 'bloque-admin@demo.test'];
const OUT = process.argv[2];
const leerAjustes = () => prisma.companySettings.findUniqueOrThrow({ where: { id: 'default' }, select: { taxEnabled: true, taxPercent: true, taxDigitalProducts: true, pickupEnabled: true, minOrderAmountUSD: true } });
let ajustes: Awaited<ReturnType<typeof leerAjustes>> | null = null;
const conHost = (ruta: string, host: string) => new Promise<{ status: number; location: string | null }>((resolve, reject) => {
  const url = new URL(BASE);
  const req = http.request({ host: url.hostname, port: url.port, path: ruta, method: 'GET', headers: { Host: host } }, (res) => { res.resume(); resolve({ status: res.statusCode ?? 0, location: res.headers.location ?? null }); });
  req.on('error', reject); req.end();
});

correr(async () => {
  await borrarUsuarios(CORREOS);
  ajustes = await leerAjustes();
  const teclado = await prisma.product.findUniqueOrThrow({ where: { slug: 'c102-teclado' }, select: { id: true, name: true, stock: true, priceUSD: true } });
  const gift = await prisma.product.findUniqueOrThrow({ where: { slug: 'c102giftcard' }, select: { id: true, name: true, priceUSD: true } });
  await prisma.companySettings.update({ where: { id: 'default' }, data: { taxEnabled: true, taxPercent: 16, taxDigitalProducts: false, pickupEnabled: true, minOrderAmountUSD: null } });
  const carrito = JSON.stringify([{ id: teclado.id, name: teclado.name, price: Number(teclado.priceUSD), quantity: 1, stock: teclado.stock, productType: 'PHYSICAL', weightKg: 1, isConsolidable: true }]);
  const cliente = await crearUsuario(CORREOS[0], 'Clienta Bloque', 'USER', { puntos: 500, perfil: { savedCart: carrito } });
  const dueno = await crearUsuario(CORREOS[1], 'Dueño Bloque', 'SUPER_ADMIN');
  const admin = await crearUsuario(CORREOS[2], 'Admin Bloque', 'ADMIN');
  await api('/api/settings', dueno.cookie, { method: 'PUT', body: { taxDigitalProducts: false } });

  // ---------- páginas públicas: todas responden
  for (const ruta of ['/', '/productos', '/categorias', '/categorias/demo', '/productos/c102-teclado', '/productos/c102giftcard', '/carrito', '/login', '/registro', '/cotizacion', '/terminos', '/privacidad', '/contacto', '/servicios', '/cursos', '/gift-cards', '/solicitar-producto', '/robots.txt', '/sitemap.xml', '/llms.txt', '/feed/productos.xml', '/api/products/public?limit=5', '/api/settings/public']) {
    const r = await api(ruta, null);
    t(`responde 200: ${ruta}`, r.status === 200, r.status);
  }

  // ---------- C-149
  const robots = (await api('/robots.txt', null)).text;
  const sitemap = (await api('/sitemap.xml', null)).text;
  const ficha = (await api('/productos/c102-teclado', null)).text;
  const categoria = (await api('/categorias/demo', null)).text;
  t('C-149 robots deja leer las fotos', /Allow: \/api\/uploads\//.test(robots));
  t('C-149 sitemap: categorías por slug, sin login', sitemap.includes('/categorias/demo</loc>') && !sitemap.includes('%20') && !/\/login<\/loc>/.test(sitemap));
  t('C-149 ficha: datos estructurados con sku y vendedor', /"@type":"Product"/.test(ficha) && /"sku":/.test(ficha) && /#tienda/.test(ficha));
  t('C-149 categoría: dirección propia', categoria.includes(`<link rel="canonical" href="${BASE}/categorias/demo"`));
  t('C-149 feed: XML sin digitales', /<rss version="2.0"/.test((await api('/feed/productos.xml', null)).text) && !(await api('/feed/productos.xml', null)).text.includes('c102giftcard'));
  const www = await conHost('/productos', 'www.localhost');
  t('C-149 www redirige al dominio principal', www.status === 308 && www.location === `${BASE}/productos`, www);
  t('C-149 títulos propios', /<title>Contacto \|/.test((await api('/contacto', null)).text) && /<title>Servicios \| [^|]*<\/title>/.test((await api('/servicios', null)).text));

  // ---------- C-151 y C-147: una compra mixta real
  const fichaGift = (await api('/productos/c102giftcard', null)).text;
  t('C-151 ficha digital sin "IVA incluido"; la física con', !/IVA incluido/.test(fichaGift) && /IVA incluido/.test(ficha));
  const compra = await api('/api/orders', cliente.cookie, { method: 'POST', body: { items: [{ productId: teclado.id, quantity: 1 }, { productId: gift.id, quantity: 1 }], deliveryMethod: 'PICKUP', paymentMethod: 'WALLET', billing: { type: 'PERSON', name: 'Otro Nombre' }, totalUSD: 0.01, userId: dueno.id } });
  const numeros = ((compra.json?.orders as Array<{ orderNumber: string }> | undefined) ?? []).map((o) => o.orderNumber);
  const ordenes = await prisma.order.findMany({ where: { orderNumber: { in: numeros } } });
  const fisica = ordenes.find((o) => o.deliveryMethod !== 'DIGITAL');
  const digital = ordenes.find((o) => o.deliveryMethod === 'DIGITAL');
  t('compra mixta: dos órdenes pagadas, del cliente de la sesión', ordenes.length === 2 && ordenes.every((o) => o.paymentStatus === 'PAID' && o.userId === cliente.id), { s: compra.status, e: compra.json?.error });
  t('el servidor cobra su total (60 y 10), no el del navegador', Number(fisica?.totalUSD) === 60 && Number(digital?.totalUSD) === 10);
  t('C-147 la orden guarda a nombre de quién va la factura (de la cuenta)', fisica?.billingType === 'PERSON' && fisica.billingName === 'Clienta Bloque' && fisica.billingTaxId === 'V-12345678');
  t('C-151 IVA: 8,28 en la física y 0 en la digital', Number(fisica?.taxUSD) === 8.28 && Number(digital?.taxUSD) === 0, { f: fisica?.taxUSD, d: digital?.taxUSD });
  t('el inventario bajó una unidad', (await prisma.product.findUniqueOrThrow({ where: { id: teclado.id } })).stock === teclado.stock - 1);
  t('los Puntos ES bajaron 70', Number((await prisma.userBalance.findUniqueOrThrow({ where: { userId: cliente.id } })).balance) === 430);

  // ---------- C-147 y C-147b: panel
  t('C-147 un cliente no anota facturas', (await api(`/api/admin/orders/${fisica!.id}/factura`, cliente.cookie, { method: 'PATCH', body: { invoiceNumber: '1' } })).status === 403);
  const factura = await api(`/api/admin/orders/${fisica!.id}/factura`, admin.cookie, { method: 'PATCH', body: { invoiceNumber: '000456' } });
  t('C-147 el equipo anota el número de factura', factura.status === 200 && factura.json?.invoiceNumber === '000456');
  const mias = await api('/api/orders?mine=1', cliente.cookie);
  const mia = ((mias.json?.orders as Array<Record<string, unknown>> | undefined) ?? []).find((o) => o.id === fisica!.id);
  t('C-147 el cliente lo ve en su pedido', mia?.invoiceNumber === '000456' && mia.billingName === 'Clienta Bloque' && !('adminNotes' in (mia ?? {})));
  const mes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
  const rel = await api(`/api/admin/reports/ventas?mes=${mes}`, admin.cookie);
  const filas = (rel.json?.filas as FilaVenta[] | undefined) ?? [];
  const filaF = filas.find((f) => f.orden === fisica!.orderNumber);
  const filaD = filas.find((f) => f.orden === digital!.orderNumber);
  t('C-147 relación de ventas: la física con factura, base e IVA', filaF?.factura === '000456' && filaF.baseUSD === 51.72 && filaF.ivaUSD === 8.28);
  t('C-151 relación: la digital con IVA 0', filaD?.ivaUSD === 0 && filaD.baseUSD === 10);
  t('C-147b relación: 16 columnas con la del embalaje', csvRelacionVentas(filas).split('\r\n')[0].split(';').length === 16 && typeof filaF?.entregaUSD === 'number');
  t('C-147 un cliente no baja la relación', (await api(`/api/admin/reports/ventas?mes=${mes}`, cliente.cookie)).status === 403);

  // ---------- C-150: contadores y permisos
  const contadores = await api('/api/admin/sidebar-counts', admin.cookie);
  t('C-150 contadores del menú con verificaciones', contadores.status === 200 && typeof contadores.json?.pendingVerifications === 'number');
  t('C-150 la API vieja de estadísticas ya no existe', [404, 307].includes((await api('/api/stats', admin.cookie)).status), (await api('/api/stats', admin.cookie)).status);
  t('el Administrador no cambia Configuración', (await api('/api/settings', admin.cookie, { method: 'PUT', body: { taxDigitalProducts: true } })).status === 403);

  // ---------- navegador
  const nav = await abrirNavegador(OUT);
  try {
    await nav.cookie(dueno.token);
    await nav.tamano(1440, 900);
    await nav.ir('/admin');
    await nav.hasta(`() => Boolean(document.getElementById('totales-titulo'))`);
    t('C-150 Dashboard carga con acciones, pendientes y ventas', await nav.js(`() => document.querySelector('main h1').innerText === 'Dashboard' && ['Por atender', 'Órdenes recientes', 'Ventas cobradas', 'En total'].every(x => document.querySelector('main').innerText.includes(x))`));
    t('C-150 la compra de hoy está en el Dashboard', await nav.js(`() => document.querySelector('[aria-labelledby=recientes-titulo]').innerText.includes('Clienta Bloque')`));
    t('C-150 menú: Dashboard y seis secciones', await nav.js(`() => document.querySelectorAll('#admin-sidebar nav button[aria-expanded]').length === 6 && document.querySelector('#admin-sidebar nav a').innerText.trim() === 'Dashboard'`));
    await nav.foto('bloque-dashboard-1440');

    await nav.ir('/admin/orders');
    const abierto = await nav.hasta(`() => { if (document.getElementById('orden-factura-numero')) return true; const fila = [...document.querySelectorAll('tr, li, article, div')].filter(x => x.innerText && x.innerText.includes('${fisica!.orderNumber}') && x.querySelector('[aria-label="Ver detalles"]')).pop(); const b = fila && fila.querySelector('[aria-label="Ver detalles"]'); if (b) b.click(); return false; }`);
    t('C-147 detalle de la orden: facturación con el número', abierto && await nav.js(`() => document.getElementById('orden-factura-numero').value === '000456' && /Copiar datos para facturar/.test(document.getElementById('orden-facturacion').closest('section').innerText)`));

    await nav.ir(`/admin/products/${teclado.id}`);
    await nav.hasta(`() => document.querySelectorAll('ol[aria-label="Pasos"] button').length > 1`);
    await nav.js(`() => document.querySelectorAll('ol[aria-label="Pasos"] button')[1].click()`);
    await nav.hasta(`() => Boolean(document.getElementById('p-costo'))`);
    await nav.escribir('p-costo', '10');
    t('C-146b asistente: precio sugerido 15,08', await nav.hasta(`() => /Precio sugerido: \\$15,08/.test(document.querySelector('[aria-labelledby=sec-precios]').innerText)`, 12));

    await nav.ir('/admin/reports');
    t('C-147 Reportes: relación de ventas del mes', await nav.hasta(`() => Boolean(document.getElementById('relacion-ventas-mes'))`));
    await nav.ir('/admin/settings');
    t('Configuración abre', await nav.hasta(`() => Boolean(document.querySelector('main h1'))`));

    // Tienda, en el teléfono
    await nav.cookie(cliente.token);
    await nav.tamano(360, 760);
    await nav.ir('/checkout');
    t('C-147 pago: "Datos de la factura"', await nav.hasta(`() => Boolean(document.getElementById('datos-factura'))`));
    t('pago 360: sin scroll horizontal', await nav.sinScrollHorizontal());
    await nav.ir('/customer/orders');
    t('Mis pedidos carga con la compra', await nav.hasta(`() => document.body.innerText.includes('${fisica!.orderNumber}')`));
    await nav.ir('/');
    t('portada 360: sin scroll horizontal y con productos', (await nav.sinScrollHorizontal()) && await nav.hasta(`() => document.querySelectorAll('a[href^="/productos/"]').length > 0`, 20));
    await nav.foto('bloque-portada-360');
    const errores = await nav.js<string>(`() => document.querySelector('[data-nextjs-dialog], #__next_error__') ? 'error de Next' : ''`);
    t('sin pantalla de error', errores === '', errores);
  } finally {
    await nav.cerrar();
  }
}, async () => {
  await borrarUsuarios(CORREOS);
  if (ajustes) await prisma.companySettings.update({ where: { id: 'default' }, data: ajustes });
});
