import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { FiArrowRight, FiClipboard } from 'react-icons/fi';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { adminBadge, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { cotizacionesDelCliente, type EstadoParaCliente } from '@/lib/cotizaciones/cliente';

// Mis cotizaciones (C-159): las que el cliente pidió con su cuenta y las que el equipo le mandó a su correo verificado.
// Cada una abre su documento (el mismo enlace de siempre), donde se imprime, se guarda en PDF y se aprueba.

export const metadata = { title: 'Mis cotizaciones' };

const ESTADOS: Record<EstadoParaCliente, { texto: string; tono: 'neutral' | 'brand' | 'success' | 'warning' | 'danger'; ayuda: string }> = {
  PREPARING: { texto: 'En preparación', tono: 'warning', ayuda: 'El equipo la está armando. Te la enviamos a tu correo o por WhatsApp cuando esté lista.' },
  SENT: { texto: 'Lista para revisar', tono: 'brand', ayuda: 'Revísala y, si estás de acuerdo, apruébala con tu nombre y tu cédula o RIF.' },
  EXPIRED: { texto: 'Vencida', tono: 'danger', ayuda: 'Pasó su validez y ya no se puede aprobar. Escríbenos y la renovamos.' },
  APPROVED: { texto: 'Aprobada', tono: 'success', ayuda: 'Ya diste tu conformidad. El equipo coordina contigo el pago y la entrega.' },
  CLOSED: { texto: 'No se concretó', tono: 'neutral', ayuda: 'Esta cotización se cerró sin concretarse.' },
};

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', year: 'numeric' });

export default async function MisCotizacionesPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/customer/cotizaciones');

  const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true } });
  const cotizaciones = await cotizacionesDelCliente(userId, usuario?.email ?? null, Boolean(usuario?.emailVerified));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center lg:p-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><FiClipboard className="h-6 w-6" aria-hidden="true" /></span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-ink lg:text-2xl">Mis cotizaciones</h1>
            <p className="text-sm text-muted">Los presupuestos que pediste o que te enviamos, para revisarlos y aprobarlos.</p>
          </div>
        </div>
        <Link href="/cotizacion" className={adminSecondaryButton}>Pedir una cotización</Link>
      </div>

      {cotizaciones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center">
          <p className="font-semibold text-ink">Todavía no tienes cotizaciones</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">Si tu empresa o institución necesita equipos con presupuesto, pídelo y el equipo te lo arma. Las que te enviemos a tu correo también aparecen aquí.</p>
          <Link href="/cotizacion" className={`${adminPrimaryButton} mt-5`}>Pedir una cotización</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {cotizaciones.map((c) => {
            const estado = ESTADOS[c.estado];
            return (
              <li key={c.number} className="rounded-2xl border border-line bg-white p-4 lg:p-5" data-cotizacion={c.number}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-mono text-sm font-semibold text-brand-700">N.º {c.number}</p>
                  <span className={adminBadge(estado.tono)}>{estado.texto}</span>
                </div>
                <p className="mt-1 break-words font-semibold text-ink">{c.titulo}</p>
                <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <div>
                    <dt className="inline text-muted">Total: </dt>
                    <dd className="inline font-semibold tabular-nums text-ink">{c.totalUSD > 0 ? formatUSD(c.totalUSD) : 'Por definir'}</dd>
                  </div>
                  {c.netoUSD !== null && (
                    <div>
                      <dt className="inline text-muted">Neto con retención del IVA: </dt>
                      <dd className="inline font-semibold tabular-nums text-ink">{formatUSD(c.netoUSD)}</dd>
                    </div>
                  )}
                  {c.venceEl && (
                    <div>
                      <dt className="inline text-muted">{c.estado === 'EXPIRED' ? 'Venció el: ' : 'Válida hasta el: '}</dt>
                      <dd className="inline font-semibold text-ink">{fecha(c.venceEl)}</dd>
                    </div>
                  )}
                  {c.approvedAt && (
                    <div>
                      <dt className="inline text-muted">Aprobada el: </dt>
                      <dd className="inline font-semibold text-ink">{fecha(c.approvedAt)}</dd>
                    </div>
                  )}
                  {!c.venceEl && !c.approvedAt && (
                    <div>
                      <dt className="inline text-muted">Pedida el: </dt>
                      <dd className="inline font-semibold text-ink">{fecha(c.createdAt)}</dd>
                    </div>
                  )}
                </dl>
                <p className="mt-2 text-sm text-ink-soft">{estado.ayuda}</p>
                {c.enlace && (
                  <Link href={c.enlace} className={`${c.estado === 'SENT' ? adminPrimaryButton : adminSecondaryButton} mt-3`}>
                    {c.estado === 'SENT' ? 'Ver y aprobar' : 'Ver el presupuesto'}
                    <FiArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
