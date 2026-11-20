// Datos de prueba para sacar capturas reales de la tienda sin clientes de verdad (reel C-300). Llena un esquema aparte de la
// base local (nunca producción) con:
// - productos reales tomados de la API pública de la tienda (nombre, precio, descripción y fotos, bajadas a public/uploads);
// - el sorteo como en producción, con la regla de C-297, y su producto estrella de la semana;
// - la cuenta "Chispa Prueba" con dos amigos invitados (Luisa P., activa, y Carlos M., sin activar).
// Uso (desde la raíz del repo, con la tienda compilada):
//   DATABASE_URL=<...?schema=c300_demo> npx prisma db push --skip-generate
//   DATABASE_URL=<...?schema=c300_demo> node chispa/herramientas/tienda/sembrar-sorteo.mjs            siembra
//   DATABASE_URL=<...?schema=c300_demo> node chispa/herramientas/tienda/sembrar-sorteo.mjs activar    Carlos activa su cuenta
//   DATABASE_URL=<...?schema=c300_demo> node chispa/herramientas/tienda/sembrar-sorteo.mjs desactivar Carlos sin activar
// Al terminar: borrar el esquema (DROP SCHEMA ... CASCADE) y las fotos de public/uploads (no se suben: .gitignore).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(new URL('.', import.meta.url).pathname, '../../..');
const require = createRequire(path.join(RAIZ, 'package.json'));
const { PrismaClient } = require('@prisma/client');
if (!/schema=\w*(demo|test)/.test(process.env.DATABASE_URL ?? '')) throw new Error('Solo contra un esquema de prueba (DATABASE_URL con schema=…demo o …test).');
const prisma = new PrismaClient();
const TIENDA = 'https://electroshopve.com';
const PRODUCTOS = ['mini-dc-ups-de-20000-mah', 'audifonos-inalambricos-galaxy-buds4-pro-clase-b', 'bombillo-led-recargable-de-emergencia-30-w-run',
  'mini-ups-tronic-gt-1018-lcd-de-8000-mah-para-router-y-modem', 'protector-de-voltaje-protektor-par-110v'];
const ESTRELLA = 'mini-dc-ups-de-20000-mah';
const PREMIO = '/api/uploads/sorteo-1794751803126-b5df42.jpg';
const MARCA = ['/uploads/logo-1767940160984.png', '/uploads/favicon-1766597091847.png'];

async function bajar(ruta) {
  const destino = path.join(RAIZ, 'public', 'uploads', ruta.replace('/api/uploads/', '').replace('/uploads/', ''));
  mkdirSync(path.dirname(destino), { recursive: true });
  const r = await fetch(TIENDA + ruta, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
  writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
}

async function sembrar() {
  const todos = await (await fetch(TIENDA + '/api/products/public?limit=200')).json();
  const productos = PRODUCTOS.map((slug) => todos.find((p) => p.slug === slug)).filter(Boolean);
  for (const ruta of [PREMIO, ...MARCA, ...productos.flatMap((p) => p.images)]) await bajar(ruta);

  await prisma.companySettings.upsert({
    where: { id: 'default' }, update: {},
    create: { id: 'default', companyName: 'Electro Shop', tagline: 'Todo lo encuentras con nosotros.', logo: MARCA[0], favicon: MARCA[1], primaryColor: '#2a63cd', secondaryColor: '#1e4ba3' },
  });
  const ids = {};
  for (const p of productos) {
    const cat = await prisma.category.upsert({ where: { slug: p.category.slug }, update: {}, create: { name: p.category.name, slug: p.category.slug } });
    const prod = await prisma.product.upsert({
      where: { slug: p.slug }, update: {},
      create: {
        name: p.name, slug: p.slug, sku: 'PRUEBA-' + p.slug.slice(0, 28), description: p.description, priceUSD: p.priceUSD, images: JSON.stringify(p.images),
        stock: Math.max(3, p.stock), status: 'PUBLISHED', publishedAt: new Date('2026-11-10T12:00:00Z'), weightKg: p.weightKg ?? 0.5, categoryId: cat.id,
      },
    });
    ids[p.slug] = prod.id;
  }
  const sorteo = await prisma.sorteo.create({
    data: {
      titulo: 'Sorteo de Navidad', premio: 'PlayStation 4 Sony (Remanufacturada)', imagen: PREMIO,
      incluye: [{ texto: '1000 GB', detalle: 'de almacenamiento' }, { texto: '1 control', detalle: 'azul eléctrico' }, { texto: '1 cable HDMI', detalle: 'y 1 cable de poder' }],
      lema: '¡Lista para jugar!', nombreCorto: 'PS4', compraMinimaUSD: 5, boletosPorCompra: 2, escalaUSD: 50, boletosPorEscala: 5, boletosPorResena: 1, topeInvitar: 3,
      desde: new Date('2026-11-14T04:00:00Z'), hasta: new Date('2026-12-20T03:59:59Z'), resultadoEl: new Date('2026-12-20T16:00:00Z'), activo: true,
    },
  });
  await prisma.estrellaSorteo.create({ data: { sorteoId: sorteo.id, productId: ids[ESTRELLA], desde: new Date('2026-11-16T04:00:00Z'), hasta: new Date('2026-11-23T03:59:59Z'), boletos: 10 } });
  const persona = async (nombre, email, verificado, telefono) => {
    const u = await prisma.user.create({ data: { name: nombre, email, emailVerified: verificado ? new Date() : null, role: 'USER' } });
    await prisma.profile.create({ data: { userId: u.id, userEmail: email, phone: telefono } });
    return u;
  };
  const chispa = await persona('Chispa Prueba', 'chispa.prueba@example.com', true, '04140000001');
  const luisa = await persona('Luisa P.', 'luisa.prueba@example.com', true, '04140000002');
  const carlos = await persona('Carlos M.', 'carlos.prueba@example.com', false, '04140000003');
  const p = await prisma.participanteSorteo.create({ data: { sorteoId: sorteo.id, userId: chispa.id, codigo: 'CHISPA7' } });
  await prisma.participanteSorteo.create({ data: { sorteoId: sorteo.id, userId: luisa.id, codigo: 'LUISA22', invitadoPorId: p.id } });
  await prisma.participanteSorteo.create({ data: { sorteoId: sorteo.id, userId: carlos.id, codigo: 'CARLO35', invitadoPorId: p.id } });
  console.log(chispa.id);
}

const modo = process.argv[2];
(modo === 'activar' || modo === 'desactivar'
  ? prisma.user.update({ where: { email: 'carlos.prueba@example.com' }, data: { emailVerified: modo === 'activar' ? new Date() : null } }).then(() => console.log('Carlos M.', modo))
  : sembrar())
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
