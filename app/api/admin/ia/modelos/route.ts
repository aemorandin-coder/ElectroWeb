import { NextRequest, NextResponse } from 'next/server';
import { esRespuesta, exigirPersonaDeIa } from '@/lib/ia/acceso';
import { leerAjustesIa, motorDeProveedor } from '@/lib/ia/ajustes';
import { MODELOS_IA } from '@/lib/ia/precios';
import { esProveedor, infoProveedor } from '@/lib/ia/proveedores/catalogo';
import { baseDe, listarModelos } from '@/lib/ia/proveedores/compatible';

// C-292 · GET /api/admin/ia/modelos?proveedor=google: los modelos de un proveedor. Los de Anthropic, de la lista de la tienda (con
// precio); los demás se los pide al proveedor con su clave (así están al día). Sin clave, 400.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const persona = await exigirPersonaDeIa('modelos', { maxRequests: 12, windowSeconds: 60 });
  if (esRespuesta(persona)) return persona;
  const proveedor = new URL(request.url).searchParams.get('proveedor');
  if (!esProveedor(proveedor)) return NextResponse.json({ error: 'Proveedor desconocido.' }, { status: 400 });
  if (proveedor === 'anthropic') return NextResponse.json({ modelos: MODELOS_IA.map((m) => m.id) });
  const info = infoProveedor(proveedor);
  const motor = motorDeProveedor(await leerAjustesIa(), proveedor);
  const base = baseDe(info);
  if (!motor.clave || !base) return NextResponse.json({ error: `Primero conecta la clave de ${info.empresa}.` }, { status: 400 });
  try {
    return NextResponse.json({ modelos: await listarModelos(base, motor.clave) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: `${info.empresa} no devolvió su lista de modelos. Prueba la conexión en su tarjeta.` }, { status: 502 });
  }
}
