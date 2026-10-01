/**
 * C-163: ordena las categorías de la tienda (pedido de Andrés del 01/10).
 *
 *   npx tsx scripts/reorganizar-categorias.ts                  (muestra lo que haría; no cambia nada)
 *   npx tsx scripts/reorganizar-categorias.ts --aplicar        (lo hace)
 *   npx tsx scripts/reorganizar-categorias.ts --aplicar --borrar-vacias   (además borra "General" y "Otros" si están vacías)
 *
 * Se corre en el servidor. Qué estaba mal el 01/10 en producción:
 * - Las gift cards y las recargas estaban en "Software"; los juegos, en "Consolas"; los audífonos, en "Misceláneos
 *   y Adaptadores"; y la tablet, en "Smartphones".
 * - Varias categorías sin descripción o con una que no era la suya ("PC Escritorio": "Laptop…"), y tres sin ícono.
 *   La descripción sale en /categorias y en lo que leen Google y las IA (C-149).
 * - El inicio mostraba solo 3 categorías (ajuste "Cuántas categorías"): con 6 con productos, parecía que no se
 *   enteraba de las nuevas.
 *
 * Qué hace: crea las categorías que faltan, mueve los productos, corrige nombres, descripciones e íconos y sube
 * "Cuántas categorías" a 6 si estaba por debajo. No toca precios, existencias ni fotos. Se puede correr otra vez:
 * lo que ya está bien, lo deja.
 * Borrar es aparte y solo con --borrar-vacias: una categoría con productos (también en borrador) o con
 * subcategorías nunca se borra.
 */
import { prisma } from '../lib/prisma';

interface Ficha {
  /** Slug actual de la categoría (o el que tendrá si se crea) */
  slug: string;
  /** Si cambia de dirección: el slug nuevo */
  nuevoSlug?: string;
  nombre: string;
  icono: string;
  descripcion: string;
  /** Slug de la categoría madre, si es una subcategoría que se crea */
  madre?: string;
  crear?: boolean;
}

const CATEGORIAS: Ficha[] = [
  // Nuevas
  { slug: 'gift-cards-y-recargas', crear: true, nombre: 'Gift Cards y Recargas', icono: 'FiGift', descripcion: 'Tarjetas de regalo y recargas digitales para PlayStation, Xbox, Nintendo, Steam, Roblox y Free Fire. Las compras en línea y recibes el código o la recarga en tu cuenta.' },
  { slug: 'videojuegos', crear: true, nombre: 'Videojuegos', icono: 'MdGamepad', descripcion: 'Juegos en formato físico para PlayStation, Xbox y Nintendo Switch.' },
  { slug: 'audio', crear: true, nombre: 'Audio', icono: 'FiHeadphones', descripcion: 'Audífonos, parlantes y micrófonos para el teléfono, la computadora y la consola.' },
  // Cambia de nombre y de dirección: ahí están el teléfono y la tablet
  { slug: 'smartphones', nuevoSlug: 'celulares-y-tablets', nombre: 'Celulares y Tablets', icono: 'FiSmartphone', descripcion: 'Teléfonos y tablets, con garantía de la tienda.' },
  // Las que ya existen: descripción e ícono
  { slug: 'consolas', nombre: 'Consolas', icono: 'GiGameConsole', descripcion: 'Consolas PlayStation, Xbox y Nintendo Switch.' },
  { slug: 'controles-y-mandos', nombre: 'Controles y Mandos', icono: 'MdSportsEsports', descripcion: 'Controles y mandos para consola y PC.' },
  { slug: 'accesorios-gaming', nombre: 'Accesorios Gaming', icono: 'MdSportsEsports', descripcion: 'Teclados, mouse, alfombrillas y accesorios para jugar en PC y en consola.' },
  { slug: 'laptops', nombre: 'Laptops', icono: 'FaLaptop', descripcion: 'Laptops para trabajar, estudiar y jugar.' },
  { slug: 'pc-escritorio', nombre: 'PC Escritorio', icono: 'BsPcDisplay', descripcion: 'Computadoras de escritorio, equipos para gaming y cases.' },
  { slug: 'componentes-de-pc', nombre: 'Componentes de PC', icono: 'FiCpu', descripcion: 'Discos SSD, memorias RAM, tarjetas de video y otros componentes para armar o mejorar tu PC.' },
  { slug: 'cctv-y-redes', nombre: 'CCTV y Redes', icono: 'TbDeviceCctv', descripcion: 'Cámaras de seguridad, grabadores NVR y DVR, alarmas, control de acceso y equipos de red.' },
  { slug: 'electronica-y-repuestos', nombre: 'Electrónica y Repuestos', icono: 'FaMicrochip', descripcion: 'Componentes electrónicos y repuestos: desde resistencias y diodos hasta circuitos integrados.' },
  { slug: 'fuentes-de-poder-y-energia', nombre: 'Fuentes de poder y Energía', icono: 'FiBattery', descripcion: 'Fuentes de poder, cargadores, reguladores y baterías para tus equipos.' },
  { slug: 'miscelaneos-y-adaptadores', nombre: 'Misceláneos y Adaptadores', icono: 'BsPlugin', descripcion: 'Cables, adaptadores, convertidores y accesorios varios.' },
  { slug: 'software', nombre: 'Software', icono: 'IoLogoWindows', descripcion: 'Licencias de software y aplicaciones.' },
];

/** Productos que cambian de categoría. `producto` es el slug del producto; `digitalesDe`, todos los digitales de esa categoría */
const MUDANZAS: Array<{ a: string; producto?: string; digitalesDe?: string }> = [
  { digitalesDe: 'software', a: 'gift-cards-y-recargas' },
  { producto: 'sonic-frontier', a: 'videojuegos' },
  { producto: 'grand-theft-auto-v-ps5', a: 'videojuegos' },
  { producto: 'audifonos-piston-mi-xiaomi', a: 'audio' },
];

/** Solo con --borrar-vacias, y solo si no tienen productos ni subcategorías */
const BORRAR_SI_VACIAS = ['general', 'otros'];
const CATEGORIAS_EN_INICIO = 6;

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  const borrar = process.argv.includes('--borrar-vacias');
  const dice = (texto: string) => console.log(texto);

  dice(aplicar ? '== Reorganizar categorías: APLICANDO ==' : '== Reorganizar categorías: solo se muestra (nada cambia) ==');

  await prisma.$transaction(async (tx) => {
    const existentes = await tx.category.findMany({ select: { id: true, slug: true, name: true, icon: true, description: true, parentId: true } });
    const porSlug = new Map(existentes.map((c) => [c.slug, c]));
    /** Id de cada categoría por su slug de antes y por el nuevo; las que se crearían sin --aplicar llevan un id provisional */
    const ids = new Map<string, string>(existentes.map((c) => [c.slug, c.id]));

    dice('\n1. Categorías');
    for (const ficha of CATEGORIAS) {
      const destino = ficha.nuevoSlug ?? ficha.slug;
      const actual = porSlug.get(ficha.slug) ?? (ficha.nuevoSlug ? porSlug.get(ficha.nuevoSlug) : undefined);
      if (!actual) {
        if (!ficha.crear) { dice(`   (no existe "${ficha.slug}": se deja pasar)`); continue; }
        dice(`   + Crear "${ficha.nombre}" (/categorias/${destino})`);
        if (aplicar) {
          const creada = await tx.category.create({
            data: { name: ficha.nombre, slug: destino, icon: ficha.icono, description: ficha.descripcion, parentId: ficha.madre ? ids.get(ficha.madre) ?? null : null },
            select: { id: true },
          });
          ids.set(destino, creada.id);
        } else {
          ids.set(destino, `nueva:${destino}`);
        }
        continue;
      }
      ids.set(destino, actual.id);
      const cambios: string[] = [];
      if (actual.name !== ficha.nombre) cambios.push(`nombre "${actual.name}" → "${ficha.nombre}"`);
      if (actual.slug !== destino) cambios.push(`dirección /categorias/${actual.slug} → /categorias/${destino}`);
      // El ícono solo se pone si falta: uno elegido a mano se respeta
      if (!actual.icon) cambios.push(`ícono ${ficha.icono}`);
      if ((actual.description ?? '').trim() !== ficha.descripcion) cambios.push(`descripción: "${(actual.description ?? '').trim().slice(0, 50) || 'vacía'}" → "${ficha.descripcion.slice(0, 60)}…"`);
      if (cambios.length === 0) { dice(`   = "${ficha.nombre}": ya está bien`); continue; }
      dice(`   ~ "${actual.name}": ${cambios.join('; ')}`);
      if (aplicar) {
        await tx.category.update({
          where: { id: actual.id },
          data: { name: ficha.nombre, slug: destino, description: ficha.descripcion, ...(actual.icon ? {} : { icon: ficha.icono }) },
        });
      }
    }

    dice('\n2. Productos que cambian de categoría');
    let movidos = 0;
    for (const mudanza of MUDANZAS) {
      const destinoId = ids.get(mudanza.a);
      if (!destinoId) { dice(`   (no existe la categoría "${mudanza.a}": no se mueve nada hacia ella)`); continue; }
      const origenId = mudanza.digitalesDe ? ids.get(mudanza.digitalesDe) : undefined;
      if (mudanza.digitalesDe && !origenId) continue;
      const productos = await tx.product.findMany({
        where: mudanza.digitalesDe ? { categoryId: origenId, productType: 'DIGITAL' } : { slug: mudanza.producto },
        select: { id: true, name: true, status: true, categoryId: true, category: { select: { name: true } } },
      });
      if (productos.length === 0 && mudanza.producto) dice(`   (no existe el producto "${mudanza.producto}")`);
      for (const p of productos) {
        if (p.categoryId === destinoId) { dice(`   = ${p.name}: ya está en su categoría`); continue; }
        dice(`   > ${p.name}${p.status === 'PUBLISHED' ? '' : ' (sin publicar)'}: "${p.category.name}" → "${CATEGORIAS.find((c) => (c.nuevoSlug ?? c.slug) === mudanza.a)?.nombre ?? mudanza.a}"`);
        movidos += 1;
        if (aplicar) await tx.product.update({ where: { id: p.id }, data: { categoryId: destinoId } });
      }
    }
    if (movidos === 0) dice('   Ninguno.');

    dice('\n3. Inicio: "Compra por categoría"');
    const ajustes = await tx.companySettings.findFirst({ select: { id: true, maxCategoriesDisplay: true } });
    if (ajustes && ajustes.maxCategoriesDisplay < CATEGORIAS_EN_INICIO) {
      dice(`   ~ Cuántas categorías: ${ajustes.maxCategoriesDisplay} → ${CATEGORIAS_EN_INICIO} (se muestran las que más productos tienen)`);
      if (aplicar) await tx.companySettings.update({ where: { id: ajustes.id }, data: { maxCategoriesDisplay: CATEGORIAS_EN_INICIO } });
    } else {
      dice(`   = Cuántas categorías: ${ajustes?.maxCategoriesDisplay ?? 'sin ajustes'}: se deja`);
    }

    dice('\n4. Categorías vacías');
    for (const slug of BORRAR_SI_VACIAS) {
      const categoria = porSlug.get(slug);
      if (!categoria) { dice(`   = "${slug}": no existe`); continue; }
      const [productos, hijas] = await Promise.all([
        tx.product.count({ where: { categoryId: categoria.id } }),
        tx.category.count({ where: { parentId: categoria.id } }),
      ]);
      if (productos > 0 || hijas > 0) { dice(`   = "${categoria.name}": tiene ${productos} productos y ${hijas} subcategorías: no se borra`); continue; }
      if (!borrar) { dice(`   ? "${categoria.name}" está vacía. Para borrarla, agrega --borrar-vacias`); continue; }
      dice(`   - Borrar "${categoria.name}" (vacía)`);
      if (aplicar) await tx.category.delete({ where: { id: categoria.id } });
    }
  }, { timeout: 30_000 });

  dice(aplicar
    ? '\nListo. La tienda lo muestra en un par de minutos (el inicio se actualiza solo cada minuto).'
    : '\nNada cambió. Si la lista está bien: npx tsx scripts/reorganizar-categorias.ts --aplicar');
}

main()
  .catch((error) => {
    console.error('[ERROR] No se aplicó nada:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
