/**
 * C-200: el departamento Ferretería y sus 9 categorías, con los nombres del archivo de la ferretería aliada (así la
 * Lista del proveedor encuentra cada categoría por su nombre al crear los productos).
 *
 *   npx tsx scripts/ferreteria-departamento.ts             (muestra lo que haría; no cambia nada)
 *   npx tsx scripts/ferreteria-departamento.ts --aplicar   (crea lo que falte)
 *
 * Se corre en el servidor. Se puede correr otra vez:
 * - lo que ya existe no se duplica;
 * - no se cambian los nombres, los textos ni los íconos que el equipo haya editado;
 * - solo se marca Ferretería como departamento aparte y se cuelgan de ella las categorías que no tengan otra madre.
 * El departamento no se ve en la tienda hasta que tenga productos publicados (y eso espera a C-199).
 * Los íconos son los 10 de ferretería del pack v1.2. A las categorías que ya existían les pone el suyo solo si no tienen ícono.
 */
import { prisma } from '../lib/prisma';

const aplicar = process.argv.includes('--aplicar');

const slugDe = (nombre: string) => nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const DEPARTAMENTO = {
  name: 'Ferretería',
  icon: 'IconoFerreteria',
  description: 'Herramientas, bombas, pinturas y más. Salen desde La Victoria (Aragua), solo con envío y cobro a destino.',
};

const CATEGORIAS: Array<{ name: string; icon: string }> = [
  { name: 'Herramientas eléctricas', icon: 'IconoTaladro' },
  { name: 'Pinturas', icon: 'IconoPintura' },
  { name: 'Electricidad y protección', icon: 'IconoEnchufe' },
  { name: 'Jardín y agro', icon: 'IconoJardin' },
  { name: 'Bombas y agua', icon: 'IconoAgua' },
  { name: 'Cerrajería y hogar', icon: 'IconoLlave' },
  { name: 'Iluminación', icon: 'IconoBombillo' },
  { name: 'Kits y herramientas manuales', icon: 'IconoHerramientas' },
  { name: 'Soldadura y aire', icon: 'IconoSoldadura' },
];

async function main() {
  console.log(aplicar ? 'Aplicando:' : 'Lo que haría (sin --aplicar no cambia nada):');
  const slug = slugDe(DEPARTAMENTO.name);
  let depto = await prisma.category.findUnique({ where: { slug }, select: { id: true, isDepartment: true, parentId: true, icon: true } });
  if (!depto) {
    console.log(`- Crear el departamento "${DEPARTAMENTO.name}" (/categorias/${slug}), con su aviso del envío.`);
    if (aplicar) depto = await prisma.category.create({ data: { ...DEPARTAMENTO, slug, isDepartment: true }, select: { id: true, isDepartment: true, parentId: true, icon: true } });
  } else if (!depto.isDepartment || depto.parentId) {
    console.log(`- Marcar "${DEPARTAMENTO.name}" como departamento aparte${depto.parentId ? ' y sacarla de su categoría madre' : ''}.`);
    if (aplicar) await prisma.category.update({ where: { id: depto.id }, data: { isDepartment: true, parentId: null } });
  } else {
    console.log(`- "${DEPARTAMENTO.name}" ya es un departamento aparte.`);
  }
  if (depto && !depto.icon) {
    console.log(`- Ponerle a "${DEPARTAMENTO.name}" su ícono.`);
    if (aplicar) await prisma.category.update({ where: { id: depto.id }, data: { icon: DEPARTAMENTO.icon } });
  }

  for (const c of CATEGORIAS) {
    const s = slugDe(c.name);
    const actual = await prisma.category.findUnique({ where: { slug: s }, select: { id: true, parentId: true, isDepartment: true, icon: true } });
    if (!actual) {
      console.log(`- Crear "${c.name}" dentro de ${DEPARTAMENTO.name}.`);
      if (aplicar && depto) await prisma.category.create({ data: { name: c.name, slug: s, icon: c.icon, parentId: depto.id } });
    } else if (depto && actual.parentId === depto.id) {
      console.log(`- "${c.name}" ya está dentro de ${DEPARTAMENTO.name}${actual.icon ? '' : '; se le pone su ícono'}.`);
      if (aplicar && !actual.icon) await prisma.category.update({ where: { id: actual.id }, data: { icon: c.icon } });
    } else if (actual.parentId || actual.isDepartment) {
      console.log(`- "${c.name}" ya existe con otra categoría madre o como departamento: no se toca. Revísala en Categorías.`);
    } else {
      console.log(`- Poner "${c.name}" (ya existe) dentro de ${DEPARTAMENTO.name}.`);
      if (aplicar && depto) await prisma.category.update({ where: { id: actual.id }, data: { parentId: depto.id, ...(actual.icon ? {} : { icon: c.icon }) } });
    }
  }
  if (!aplicar) console.log('\nPara crearlo: npx tsx scripts/ferreteria-departamento.ts --aplicar');
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
