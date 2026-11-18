import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { anotarIa, esRespuesta, exigirPersonaDeIa } from '@/lib/ia/acceso';
import { guardarProveedor, OTROS_PROVEEDORES, type OtroProveedor } from '@/lib/ia/ajustes';
import { infoProveedor } from '@/lib/ia/proveedores/catalogo';

// C-292 · PUT /api/admin/ia/proveedor { proveedor, precioEntrada, precioSalida }: lo que cuesta un proveedor que no es Anthropic, en
// dólares por millón de tokens, copiado de su página oficial (la tienda no lo sabe: los precios cambian y las páginas que los
// comparan no coinciden). Con null, sin precio: el consumo cuenta solo los tokens.
export const dynamic = 'force-dynamic';

const precio = z.number().min(0).max(1000).nullable();
const cuerpo = z.object({ proveedor: z.string(), precioEntrada: precio, precioSalida: precio });

export async function PUT(request: NextRequest) {
  const persona = await exigirPersonaDeIa('precio');
  if (esRespuesta(persona)) return persona;
  const datos = cuerpo.safeParse(await request.json().catch(() => null));
  if (!datos.success || !OTROS_PROVEEDORES.includes(datos.data.proveedor as OtroProveedor)) {
    return NextResponse.json({ error: 'Escribe los dos precios en dólares por millón de tokens, o déjalos vacíos.' }, { status: 400 });
  }
  const { proveedor, precioEntrada, precioSalida } = datos.data as { proveedor: OtroProveedor; precioEntrada: number | null; precioSalida: number | null };
  if ((precioEntrada === null) !== (precioSalida === null)) return NextResponse.json({ error: 'Escribe los dos precios, o ninguno.' }, { status: 400 });
  const at = await guardarProveedor(proveedor, persona.id, { precioEntrada, precioSalida });
  await anotarIa(persona, request, `Cambió el precio de ${infoProveedor(proveedor).empresa}`, { precioEntrada, precioSalida });
  return NextResponse.json({ ok: true, updatedAt: at.toISOString() });
}
