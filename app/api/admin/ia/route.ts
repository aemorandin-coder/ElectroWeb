import { NextResponse } from 'next/server';
import { leerAjustesIa, OTROS_PROVEEDORES } from '@/lib/ia/ajustes';
import { esRespuesta, exigirPersonaDeIa } from '@/lib/ia/acceso';
import { enmascarar } from '@/lib/ia/clave';
import { leerConsumo } from '@/lib/ia/consumo';
import { INSTRUCCIONES_DE_FABRICA } from '@/lib/ia/fabrica';
import { USOS_IA } from '@/lib/ia/reglas';

// C-288 · GET /api/admin/ia: todo lo que muestra Configuración → IA · Claude en un solo pedido: el motor, la clave (enmascarada:
// nunca entera), las instrucciones de cada uso (de fábrica, vigentes y quién las cambió), las frases, lo que consume cada uso,
// las fallas y lo que atajaron las reglas. Solo el dueño con los dos pasos. Las reglas y los textos de cada uso viven en
// lib/ia/reglas.ts (los importa la pantalla); aquí solo va lo que cambia.
export const dynamic = 'force-dynamic';

export async function GET() {
  const persona = await exigirPersonaDeIa('leer', null);
  if (esRespuesta(persona)) return persona;
  try {
    const [ajustes, consumo] = await Promise.all([leerAjustesIa(), leerConsumo()]);
    return NextResponse.json({
      updatedAt: ajustes.updatedAt?.toISOString() ?? null,
      motor: { modelo: ajustes.modelo, esfuerzo: ajustes.esfuerzo, fuente: ajustes.fuente },
      // C-292: quién responde, el respaldo, el motor propio de cada uso y los otros proveedores (la clave, nunca entera)
      proveedor: ajustes.proveedor,
      respaldo: ajustes.respaldo,
      porUso: ajustes.porUso,
      proveedores: OTROS_PROVEEDORES.map((id) => {
        const p = ajustes.otros[id];
        return {
          id,
          hay: p.clave !== null,
          enmascarada: p.clave ? enmascarar(p.clave) : null,
          fuente: p.fuenteClave,
          claveRota: p.claveRota,
          cambiadaAt: p.claveCambiadaAt?.toISOString() ?? null,
          modelo: p.modelo,
          precioEntrada: p.precioEntrada,
          precioSalida: p.precioSalida,
        };
      }),
      clave: {
        hay: ajustes.clave !== null,
        enmascarada: ajustes.clave ? enmascarar(ajustes.clave) : null,
        fuente: ajustes.fuenteClave,
        claveRota: ajustes.claveRota,
        // Hay una clave en el servidor (.env) a la que volver: solo sí o no
        hayEnServidor: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
        cambiadaAt: ajustes.claveCambiadaAt?.toISOString() ?? null,
      },
      // Solo si hay clave de Groq: sí o no, nunca la clave
      groq: ajustes.otros.groq.clave !== null,
      usos: USOS_IA.map((u) => {
        const propia = ajustes.instrucciones[u.id];
        return {
          id: u.id,
          deFabrica: INSTRUCCIONES_DE_FABRICA[u.id],
          vigente: propia?.texto ?? INSTRUCCIONES_DE_FABRICA[u.id],
          delEquipo: Boolean(propia),
          porNombre: propia?.porNombre ?? null,
          at: propia?.at || null,
        };
      }),
      frases: { lista: ajustes.frases, delPanel: ajustes.frasesDelPanel },
      consumo,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[ia] GET /api/admin/ia:', error instanceof Error ? error.name : 'desconocido');
    // Sin las tablas nuevas (antes de aplicar el SQL del deploy) la pantalla lo dice en vez de quedar en blanco
    return NextResponse.json({ error: 'No se pudieron leer los ajustes de la IA. Si es la primera vez, falta aplicar el SQL de la versión.' }, { status: 500 });
  }
}
