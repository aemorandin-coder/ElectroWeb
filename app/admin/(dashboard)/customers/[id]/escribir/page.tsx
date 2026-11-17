import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { fichaDelCliente } from '@/lib/clientes/ficha';
import { PLANTILLAS, type Plantilla } from '@/lib/clientes/plantillas';
import EscribirCliente from '@/components/admin/clientes/EscribirCliente';

// C-276: "Escribirle" a un cliente desde su ficha (lo que eligió el equipo el 16/11: campana, correo y WhatsApp), por
// pasos (PLAN.md §1.9). Llega con ?plantilla= desde los "Recordarle" de la ficha y con ?pedido= desde un pedido.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Escribirle al cliente' };

export default async function PaginaEscribirCliente({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ plantilla?: string; pedido?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_USERS')) redirect('/admin');
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const f = await fichaDelCliente(id);
  if (!f) notFound();
  const plantilla = (PLANTILLAS as readonly string[]).includes(sp.plantilla ?? '') ? (sp.plantilla as Plantilla) : null;
  return (
    <EscribirCliente
      cliente={{
        id: f.id, nombre: f.nombre, correo: f.correo, correoVerificado: f.sellos.correo, cuentaActiva: f.cuenta === 'ACTIVE',
        telefono: f.datos.whatsapp || f.datos.telefono, firmoTerminos: f.sellos.terminos,
        carrito: f.interesa.carrito?.productos ?? 0,
        pedidos: f.pedidos.map((p) => ({ id: p.id, numero: p.numero, estado: p.estado, resumen: p.resumen })),
      }}
      plantillaInicial={plantilla}
      pedidoInicial={typeof sp.pedido === 'string' && f.pedidos.some((p) => p.id === sp.pedido) ? sp.pedido : null}
    />
  );
}
