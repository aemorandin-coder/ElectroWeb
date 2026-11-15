import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { sendEmail } from '@/lib/email-service';
import { correoBienvenidaProveedor } from '@/lib/email-templates/proveedores';
import { datosBienvenida } from '@/lib/proveedores/despacho';

type Ctx = { params: Promise<{ id: string }> };

// C-227: la bienvenida del aliado comercial (decisión 7 del 14/11: sale con un botón del panel, cuando su catálogo ya
// está publicado). GET: la vista previa tal como sale (PLAN.md §1.9: se ve antes de enviarla). POST: la envía a su
// correo de despacho y guarda la fecha (la credencial dice "desde" la primera; reenviarla no la cambia).

export async function GET(_request: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  const { id } = await params;
  const b = await datosBienvenida(id);
  if (!b) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
  const { asunto, html } = await correoBienvenidaProveedor(b.datos);
  return NextResponse.json({ para: b.para, enviadaEl: b.enviadaEl, publicados: b.datos.publicados, asunto, html });
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  const { id } = await params;
  const b = await datosBienvenida(id);
  if (!b) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
  if (!b.para) return NextResponse.json({ error: 'Primero guarda su correo de despacho' }, { status: 409 });
  if (b.datos.publicados === 0) return NextResponse.json({ error: 'Todavía no tiene productos publicados: publícalos primero' }, { status: 409 });

  const { asunto, html } = await correoBienvenidaProveedor(b.datos);
  const envio = await sendEmail({ to: b.para, subject: asunto, html });
  if (!envio.success) return NextResponse.json({ error: 'No se pudo enviar el correo. Revisa Configuración → Correo.' }, { status: 502 });

  const enviadaEl = b.enviadaEl ?? new Date();
  const proveedor = await prisma.supplier.update({ where: { id }, data: { bienvenidaAt: enviadaEl }, select: { name: true } });
  await registrarAccionAdmin(session, 'PANEL_RECORD_UPDATED', { type: 'SUPPLIER', id }, {
    accion: b.enviadaEl ? 'Bienvenida reenviada al proveedor' : 'Bienvenida enviada al proveedor',
    proveedor: proveedor.name,
    para: b.para,
    publicados: b.datos.publicados,
  }, request);
  return NextResponse.json({ ok: true, para: b.para, enviadaEl });
}
