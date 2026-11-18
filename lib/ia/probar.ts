// C-288 · "Probar" unas instrucciones antes de publicarlas (Configuración → IA · Claude, paso 3 de editarlas): corre ese uso de Claude
// con las instrucciones que se están escribiendo (reemplazan las del equipo, sin guardarlas) y un caso real, y devuelve el
// resultado en texto legible, qué reglas de la tienda pasó y lo que la tienda tuvo que atajar. Solo servidor.
//
// No guarda nada: ni el borrador de la respuesta, ni la urgencia, ni la propuesta del proveedor, ni la ficha. El pedido a Claude
// se anota como uso "prueba" (cuesta lo mismo que uno de verdad) y lo que atajaron las reglas no entra en las cifras del mes.

import { buscarProductoEnLaWeb } from '@/lib/busqueda-web';
import { formatUSD } from '@/lib/currency';
import { redactarCampana } from '@/lib/ia/campana';
import { probarCatalogo } from '@/lib/ia/catalogo-proveedor';
import { FallaIA, type RevisionFinal } from '@/lib/ia/pedir';
import { redactarRespuesta } from '@/lib/ia/respuesta-consulta';
import { resumirCliente } from '@/lib/ia/resumen-cliente';
import { probarUrgencia } from '@/lib/ia/urgencia';
import { reglasDeTienda, type Cambio, type UsoIa } from '@/lib/ia/reglas';
import { prisma } from '@/lib/prisma';

export type EstadoDeRegla = 'paso' | 'cambio' | 'pidio' | 'marca';

export interface ReglaProbada {
  id: string;
  estado: EstadoDeRegla;
}

export type ResultadoDePrueba =
  | { ok: true; texto: string; firma: string | null; ms: number; reglas: ReglaProbada[]; atajadas: Cambio[]; avisos: string[]; pidioOtraVez: boolean }
  | { ok: false; estado: 404 | 502 | 503 | 500; error: string };

const coma = (n: number) => String(n).replace('.', ',');
const lineas = (...partes: Array<string | null | undefined | false>) => partes.filter((p): p is string => Boolean(p)).join('\n');

/** El estado de cada regla de la tienda de este uso: la pasó, la arregló la tienda, se le pidió otra vez, o quedó para revisar */
function reglasProbadas(uso: UsoIa, r: RevisionFinal | null): ReglaProbada[] {
  return reglasDeTienda(uso).map((regla): ReglaProbada => {
    if (!r) return { id: regla.id, estado: 'paso' };
    if (r.marcadas.includes(regla.id)) return { id: regla.id, estado: 'marca' };
    if (r.cambios.some((c) => c.regla === regla.id && c.accion === 'pide')) return { id: regla.id, estado: 'pidio' };
    if (r.cambios.some((c) => c.regla === regla.id)) return { id: regla.id, estado: 'cambio' };
    return { id: regla.id, estado: 'paso' };
  });
}

export async function probarInstrucciones(o: { uso: UsoIa; texto: string; caso: string; usuarioId: string }): Promise<ResultadoDePrueba> {
  const inicio = Date.now();
  let revision: RevisionFinal | null = null;
  const opciones = { instruccionesPrueba: o.texto, usuarioId: o.usuarioId, alRevisar: (r: RevisionFinal) => { revision = r; } };
  let texto = '';
  let firma: string | null = null;
  try {
    switch (o.uso) {
      case 'busqueda': {
        const f = await buscarProductoEnLaWeb({ nombre: o.caso }, opciones);
        firma = f.modeloIA || null;
        texto = lineas(
          f.marca && `Marca: ${f.marca.valor}`,
          f.codigoBarras && `Código de barras: ${f.codigoBarras.valor}`,
          f.peso && `Peso del paquete: ${coma(f.peso.valor)} kg${f.peso.estimado ? ' (estimado)' : ''}`,
          f.medidas && `Medidas del paquete: ${coma(f.medidas.valor.largo)} × ${coma(f.medidas.valor.ancho)} × ${coma(f.medidas.valor.alto)} cm${f.medidas.estimado ? ' (estimado)' : ''}`,
          f.especificaciones.length > 0 && `Especificaciones:\n${f.especificaciones.map((e) => `- ${e.nombre}: ${e.valor}`).join('\n')}`,
          `Descripción: ${f.descripcion || '(vacía)'}`,
          f.avisos.length > 0 && `Avisos:\n${f.avisos.map((a) => `- ${a}`).join('\n')}`,
        );
        break;
      }
      case 'proveedor': {
        const [codigo, ...resto] = o.caso.split(/\s*[·|]\s*/);
        const linea = resto.length > 0 ? { codigo: codigo.trim(), nombre: resto.join(' · ').trim() } : { codigo: '', nombre: codigo.trim() };
        const p = await probarCatalogo(linea, opciones);
        if (!p) return { ok: false, estado: 502, error: 'Claude no devolvió una propuesta para esa línea.' };
        firma = p.firma;
        texto = lineas(`Nombre: ${p.nombre}`, `Categoría: ${p.categoria ?? '(ninguna: queda para revisar)'}`, p.duda && `Duda: ${p.duda}`);
        break;
      }
      case 'respuesta': {
        const b = await redactarRespuesta(o.caso, opciones);
        if (!b) return { ok: false, estado: 404, error: 'Esa consulta ya no existe.' };
        firma = b.firma;
        texto = lineas(`Asunto: ${b.asunto}`, '', b.respuesta, b.porConfirmar.length > 0 && `\nPor confirmar:\n${b.porConfirmar.map((c) => `- ${c}`).join('\n')}`);
        break;
      }
      case 'urgencia': {
        const u = await probarUrgencia(o.caso, opciones);
        if (!u) return { ok: false, estado: 502, error: 'Claude no devolvió la urgencia de ese mensaje.' };
        texto = lineas(`Urgencia: ${u.urgencia}`, `De qué trata: ${u.tipo}`, `Motivo: ${u.motivo || '(sin motivo)'}`);
        break;
      }
      case 'cliente': {
        const cliente = await prisma.user.findFirst({ where: { email: { equals: o.caso.trim(), mode: 'insensitive' }, role: 'USER' }, select: { id: true } });
        if (!cliente) return { ok: false, estado: 404, error: 'No hay un cliente con ese correo.' };
        const r = await resumirCliente(cliente.id, opciones);
        if (!r) return { ok: false, estado: 404, error: 'No hay un cliente con ese correo.' };
        firma = r.ia.firma;
        texto = lineas(
          r.ia.resumen,
          r.ia.comoCompra.length > 0 && `\nCómo compra:\n${r.ia.comoCompra.map((c) => `- ${c}`).join('\n')}`,
          r.ia.ofrecer.length > 0 && `\nQué ofrecerle:\n${r.ia.ofrecer.map((p) => `- ${p.nombre} (${formatUSD(p.precioUSD)}): ${p.motivo}`).join('\n')}`,
          r.ia.siguientePaso && `\nSiguiente paso: ${r.ia.siguientePaso}`,
        );
        break;
      }
      case 'campana': {
        const c = await redactarCampana(o.caso, opciones);
        if (!c) return { ok: false, estado: 404, error: 'La tienda no tiene productos visibles para armar una campaña.' };
        firma = c.firma;
        texto = lineas(
          `Asunto: ${c.subject}`,
          c.preheader && `Vista previa: ${c.preheader}`,
          '',
          ...c.bloques.map((b) => (b.tipo === 'boton' ? `[Botón: ${b.texto}]` : b.tipo === 'imagen' ? '[Foto de un producto]' : b.texto)),
          c.productos.length > 0 && `\nProductos que eligió: ${c.productos.map((p) => `${p.nombre} (${formatUSD(p.precioUSD)})`).join(', ')}`,
        );
        break;
      }
    }
  } catch (error) {
    if (error instanceof FallaIA) return { ok: false, estado: error.motivo === 'sin-clave' ? 503 : 502, error: error.message };
    console.error('[ia] probar instrucciones:', error instanceof Error ? error.name : 'desconocido');
    return { ok: false, estado: 500, error: 'No se pudo hacer la prueba.' };
  }
  const final = revision as RevisionFinal | null;
  return {
    ok: true,
    texto,
    firma,
    ms: Date.now() - inicio,
    reglas: reglasProbadas(o.uso, final),
    atajadas: final?.cambios ?? [],
    avisos: final?.avisos ?? [],
    pidioOtraVez: final?.pidioOtraVez ?? false,
  };
}
