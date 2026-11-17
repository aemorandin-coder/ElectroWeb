// C-218 · El catálogo de un proveedor con Claude (Andrés, 13/11, la idea F: "propone la categoría y el nombre de la
// tienda para los 3.114 códigos de su lista, para no hacerlo a mano"). Solo servidor.
//
// - Va de a 40 códigos por pedido (cada uno, bajo los 60 s de nginx); la pantalla los recorre todos y puede cortar.
// - Lo propuesto queda guardado en la lista (articulos_proveedor): no se vuelve a pedir mientras su nombre no cambie.
// - Las reglas de los nombres son las de la tienda (C-202, PLAN §7.2) y la regla automática (lib/nombres/producto.ts) va
//   como punto de partida. La categoría sale de las de la tienda; una que no existe no se guarda.
// - Es una propuesta: llena "Nombre en la tienda" y la categoría de cada fila, y el equipo la revisa antes de crear.

import { prisma } from '@/lib/prisma';
import { INSTRUCCIONES_DE_FABRICA } from '@/lib/ia/fabrica';
import { pedirJSON, type OpcionesDeUso } from '@/lib/ia/claude';
import { limpiarTextoIA } from '@/lib/ia/texto';
import { revisarCatalogoIa } from '@/lib/ia/revisar';
import { proponedorDeNombres } from '@/lib/nombres/producto';
import { propuestasGuardadas, type PropuestaCatalogo } from '@/lib/proveedores/articulos';
import { LOTE_CATALOGO } from '@/lib/proveedores/lista';


const ESQUEMA = {
  type: 'object',
  properties: {
    articulos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          clave: { type: 'string' },
          nombre: { type: 'string' },
          categoria: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          duda: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
        required: ['clave', 'nombre', 'categoria', 'duda'],
        additionalProperties: false,
      },
    },
  },
  required: ['articulos'],
  additionalProperties: false,
};

/** Lo que se le manda a Claude de cada artículo de la lista del proveedor */
interface ArticuloPendiente {
  id: string;
  codigo: string;
  nombre: string;
  departamento: string | null;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
}

/** La propuesta de Claude para un artículo, ya revisada por las reglas de la tienda */
interface PropuestaLimpia {
  articulo: ArticuloPendiente;
  nombre: string;
  categoriaId: string | null;
  duda: string | null;
}

/**
 * Le pide a Claude el nombre y la categoría de estos artículos (hasta 40). No guarda nada: quien llama decide (guardarlos en la
 * lista o, al probar unas instrucciones en Configuración, solo mostrarlos).
 */
async function pedirPropuestas(faltan: ArticuloPendiente[], opciones: OpcionesDeUso = {}): Promise<{ propuestas: PropuestaLimpia[]; firma: string }> {
  const [categorias, marcas] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true, isDepartment: true, parent: { select: { name: true } } }, orderBy: { name: 'asc' } }),
    prisma.brand.findMany({ select: { name: true } }),
  ]);
  // Las categorías donde va un producto (no los departamentos que solo agrupan), con su departamento
  const usables = categorias.filter((c) => !c.isDepartment || !categorias.some((x) => x.parent?.name === c.name));
  const claveCategoria = new Map(usables.map((c, i) => [`c${i + 1}`, c.id]));
  const regla = proponedorDeNombres(marcas.map((m) => m.name));
  const pedido = [
    'Categorías de la tienda (clave · categoría · departamento):',
    ...usables.map((c, i) => `- c${i + 1} · ${c.name}${c.parent ? ` · ${c.parent.name}` : ''}`),
    '',
    `Artículos (${faltan.length}):`,
    ...faltan.map((a, i) => [
      `[k${i + 1}] "${a.nombre}"`,
      a.departamento ? ` · departamento del proveedor: ${a.departamento}` : '',
      a.categoria ? ` · su categoría: ${a.categoria}` : '',
      a.marca ? ` · marca: ${a.marca}` : '',
      a.modelo ? ` · modelo: ${a.modelo}` : '',
      ` · la regla propone: "${regla(a.nombre).nombre}"`,
    ].join('')),
  ].join('\n');

  // C-288: la tienda comprueba la respuesta: la categoría tiene que ser una de la lista y el nombre va sin el código del
  // proveedor ni precios, hasta 90 caracteres
  const codigos = new Map(faltan.map((a, i) => [`k${i + 1}`, a.codigo]));
  const respuesta = await pedirJSON({
    donde: 'catálogo del proveedor', uso: 'proveedor', deFabrica: INSTRUCCIONES_DE_FABRICA.proveedor, pedido, esquema: ESQUEMA,
    referencia: 'Lista de un proveedor',
    revisar: (datos, { frases }) => revisarCatalogoIa(datos, { categorias: new Set(claveCategoria.keys()), codigos, frases }),
    ...opciones,
  });
  const propuestas: PropuestaLimpia[] = [];
  for (const r of (Array.isArray(respuesta.datos.articulos) ? respuesta.datos.articulos : []) as Array<Record<string, unknown>>) {
    const clave = typeof r.clave === 'string' && /^k\d+$/.test(r.clave) ? r.clave : null;
    const a = clave ? faltan[Number(clave.slice(1)) - 1] : undefined;
    const nombre = limpiarTextoIA(r.nombre, 150);
    if (!a || !nombre) continue;
    const categoriaId = typeof r.categoria === 'string' ? claveCategoria.get(r.categoria) ?? null : null;
    const duda = limpiarTextoIA(r.duda, 200) || (typeof r.categoria === 'string' && !categoriaId ? 'La categoría que propuso no existe en la tienda.' : null);
    propuestas.push({ articulo: a, nombre, categoriaId, duda });
  }
  return { propuestas, firma: respuesta.firma };
}

/**
 * Propone el nombre y la categoría de estos códigos (hasta 40) y los guarda. Los que ya tienen propuesta para su nombre
 * actual no se vuelven a pedir. Devuelve las propuestas de todos los códigos pedidos. Lanza FallaIA si Claude no responde.
 */
export async function proponerCatalogo(supplierId: string, codigos: string[]): Promise<{ propuestas: Record<string, PropuestaCatalogo>; pedidos: number; firma: string | null }> {
  const articulos = await prisma.articuloProveedor.findMany({
    where: { supplierId, codigo: { in: codigos.slice(0, LOTE_CATALOGO) } },
    select: { id: true, codigo: true, nombre: true, departamento: true, categoria: true, marca: true, modelo: true, iaNombreDe: true, iaRevisadoAt: true },
  });
  const faltan = articulos.filter((a) => !a.iaRevisadoAt || a.iaNombreDe !== a.nombre);
  let firma: string | null = null;
  if (faltan.length > 0) {
    const respuesta = await pedirPropuestas(faltan);
    firma = respuesta.firma;
    const ahora = new Date();
    await prisma.$transaction(respuesta.propuestas.map((p) => prisma.articuloProveedor.update({
      where: { id: p.articulo.id },
      data: { iaNombre: p.nombre, iaCategoriaId: p.categoriaId, iaDuda: p.duda, iaNombreDe: p.articulo.nombre, iaRevisadoAt: ahora },
    })));
  }
  return { propuestas: await propuestasGuardadas(supplierId, codigos), pedidos: faltan.length, firma };
}

/** Para probar las instrucciones en Configuración: la propuesta de una línea suelta, sin tocar la lista guardada de ningún proveedor */
export async function probarCatalogo(linea: { codigo: string; nombre: string }, opciones: OpcionesDeUso): Promise<{ nombre: string; categoria: string | null; duda: string | null; firma: string } | null> {
  const { propuestas, firma } = await pedirPropuestas([{ id: 'prueba', codigo: linea.codigo, nombre: linea.nombre, departamento: null, categoria: null, marca: null, modelo: null }], opciones);
  const p = propuestas[0];
  if (!p) return null;
  const categoria = p.categoriaId ? (await prisma.category.findUnique({ where: { id: p.categoriaId }, select: { name: true } }))?.name ?? null : null;
  return { nombre: p.nombre, categoria, duda: p.duda, firma };
}
