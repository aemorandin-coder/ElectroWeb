// C-212: la página del sorteo (Andrés, 13/11: la PlayStation 4, con el resultado el 20/12). El premio, cómo participar,
// los boletos de quien entró con su cuenta y su enlace para invitar, las bases y, cuando ya se sorteó, quién ganó (con el
// correo tapado). Sin sorteo activo, lo dice y lleva al catálogo.
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import Footer from '@/components/Footer';
import { IconoCalendario, IconoCarrito, IconoClientes, IconoRegalo } from '@/components/iconos';
import PublicHeader from '@/components/public/PublicHeader';
import CompartirEnlace from '@/components/sorteo/CompartirEnlace';
import Container from '@/components/ui/Container';
import { authOptions } from '@/lib/auth';
import { formatUSD } from '@/lib/currency';
import { compartirPagina } from '@/lib/og/datos';
import { siteUrl } from '@/lib/seo';
import { getPublicSettings } from '@/lib/site-settings';
import { correoTapado } from '@/lib/sorteo/reglas';
import { boletosDeCliente, getSorteoVigente } from '@/lib/sorteo/servidor';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const sorteo = await getSorteoVigente();
  return {
    title: sorteo ? `${sorteo.titulo}: ${sorteo.premio}` : 'Sorteo',
    description: sorteo
      ? `Participa en el sorteo de Electro Shop: ${sorteo.premio}. Con cada compra de $${Number(sorteo.compraMinimaUSD)} o más, o invitando a 2 amigos.`
      : 'Los sorteos de Electro Shop.',
    alternates: { canonical: '/sorteo' },
    robots: sorteo ? undefined : { index: false },
    ...(await compartirPagina('sorteo', '/sorteo')),
  };
}

/** Los días que faltan para una fecha (0 si ya pasó) */
function diasHasta(fecha: Date): number {
  return Math.max(0, Math.ceil((fecha.getTime() - Date.now()) / 86_400_000));
}

const diaLargo = (fecha: Date) => new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'long', timeZone: 'America/Caracas' }).format(fecha);

export default async function SorteoPage() {
  const [sorteo, session, settings] = await Promise.all([getSorteoVigente(), getServerSession(authOptions), getPublicSettings()]);

  if (!sorteo) {
    return (
      <div className="min-h-dvh bg-surface">
        <PublicHeader />
        <main>
          <Container className="py-16 text-center">
            <h1 className="text-2xl font-bold text-ink">Ahora no hay un sorteo</h1>
            <p className="mt-2 text-ink-soft">Cuando haya uno, lo vas a ver aquí y en el inicio.</p>
            <Link href="/productos" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-brand-500 px-6 text-sm font-semibold text-white hover:bg-brand-600">Ver productos</Link>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  // "$10" y no "$10,00": un monto redondo se lee mejor
  const monto = Number(sorteo.compraMinimaUSD);
  const minimo = Number.isInteger(monto) ? `$${monto}` : formatUSD(monto);
  const cerrado = new Date() > sorteo.hasta;
  const faltan = diasHasta(sorteo.resultadoEl);
  const boletos = session?.user?.id && !cerrado ? await boletosDeCliente(sorteo, session.user.id) : null;
  const enlace = boletos ? `${siteUrl()}${boletos.enlace}` : null;
  const foto = sorteo.imagen && sorteo.imagen.startsWith('/') && !sorteo.imagen.startsWith('//') ? sorteo.imagen : null;

  return (
    <div className="min-h-dvh bg-surface">
      <PublicHeader />
      <main>
        {/* El premio: la pieza fuerte, en azul noche */}
        <section aria-labelledby="sorteo-titulo" className="bg-brand-950 text-white">
          <Container className="grid items-center gap-6 py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-14">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-200">{sorteo.titulo}</p>
              <h1 id="sorteo-titulo" className="mt-2 text-3xl font-bold leading-tight text-balance lg:text-5xl">Gana una {sorteo.premio}</h1>
              <p className="mt-4 flex items-center gap-2 text-base text-brand-100">
                <IconoCalendario className="h-5 w-5 shrink-0" aria-hidden="true" />
                {sorteo.sorteadoAt ? `Se sorteó el ${diaLargo(sorteo.sorteadoAt)}.` : `Resultado el ${diaLargo(sorteo.resultadoEl)}${faltan > 0 ? ` · faltan ${faltan} ${faltan === 1 ? 'día' : 'días'}` : ''}.`}
              </p>
              <p className="mt-2 text-sm text-brand-200">Si ganas, te lo enviamos sin costo por ZOOM a cualquier estado.</p>
            </div>
            {foto && (
              <div className="relative aspect-square w-full max-w-[22rem] overflow-hidden rounded-2xl bg-white">
                <Image src={foto} alt={sorteo.premio} fill sizes="352px" className="object-contain" priority />
              </div>
            )}
          </Container>
        </section>

        {sorteo.sorteadoAt && sorteo.ganadorEmail && (
          <Container className="pt-8">
            <div className="rounded-2xl border border-success-strong/30 bg-white p-5 text-center">
              <p className="text-sm text-ink-soft">Ganó el boleto de</p>
              <p className="mt-1 text-2xl font-bold text-ink">{correoTapado(sorteo.ganadorEmail)}</p>
              <p className="mt-1 text-sm text-muted">Entre {sorteo.boletosAlSortear} boletos. Le escribimos al correo de su cuenta para coordinar la entrega.</p>
            </div>
          </Container>
        )}

        {!cerrado && (
          <Container className="py-8 lg:py-10">
            <h2 className="text-xl font-bold text-ink lg:text-2xl">Cómo participar</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-line bg-white p-5">
                <span className="iconos-marca flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-950"><IconoCarrito className="h-6 w-6" aria-hidden="true" /></span>
                <h3 className="mt-3 text-lg font-semibold text-ink">Compra {minimo} o más</h3>
                <p className="mt-1 text-sm text-ink-soft">Cada compra pagada de {minimo} o más en productos es 1 boleto. Mientras más compras, más oportunidades.</p>
                <Link href="/productos" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600">Ver productos</Link>
              </div>
              <div className="rounded-2xl border border-line bg-white p-5">
                <span className="iconos-marca flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-950"><IconoClientes className="h-6 w-6" aria-hidden="true" /></span>
                <h3 className="mt-3 text-lg font-semibold text-ink">O invita a 2 amigos, sin comprar</h3>
                <p className="mt-1 text-sm text-ink-soft">
                  Comparte tu enlace en tu estado de WhatsApp. Cuando 2 amigos se registran con él y verifican su correo, ganas 1 boleto. Hasta {sorteo.topeInvitar}.
                </p>
                <div className="mt-4">
                  {enlace ? (
                    <CompartirEnlace enlace={enlace} mensaje={`Participa conmigo en el sorteo de Electro Shop: ${sorteo.premio}. Regístrate con mi enlace:`} />
                  ) : (
                    <Link href="/login?callbackUrl=/sorteo" className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink hover:border-brand-300 hover:text-brand-600">Entra con tu cuenta para tener tu enlace</Link>
                  )}
                </div>
              </div>
            </div>

            {boletos && (
              <section aria-labelledby="tus-boletos" className="mt-6 rounded-2xl border border-line bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="tus-boletos" className="text-lg font-semibold text-ink">Tus boletos</h2>
                  <p className="text-3xl font-bold tabular-nums text-brand-600">{boletos.total}</p>
                </div>
                {boletos.compras.length > 0 ? (
                  <ul className="mt-3 divide-y divide-line text-sm">
                    {boletos.compras.map((c) => (
                      <li key={c.ordenes} className="flex justify-between gap-3 py-2"><span className="text-ink-soft">Compra {c.ordenes}</span><span className="tabular-nums text-ink">{formatUSD(c.subtotalUSD)}</span></li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-ink-soft">Todavía no tienes boletos por compra.</p>
                )}
                <p className="mt-3 text-sm text-ink-soft">
                  Por invitar: {boletos.porInvitar} {boletos.porInvitar === 1 ? 'boleto' : 'boletos'}
                  {boletos.invitados > 0 ? ` (${boletos.invitadosValidos} de ${boletos.invitados} amigos ya verificaron su correo)` : ''}.
                </p>
              </section>
            )}
          </Container>
        )}

        <Container className="pb-12">
          <details className="rounded-2xl border border-line bg-white p-5 open:pb-6">
            <summary className="flex cursor-pointer items-center gap-2 text-lg font-semibold text-ink">
              <IconoRegalo className="h-5 w-5 text-brand-600" aria-hidden="true" /> Las bases del sorteo
            </summary>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
              <li>Lo organiza {settings.companyName}. Cuentan las compras pagadas y los registros del {diaLargo(sorteo.desde)} al {diaLargo(sorteo.hasta)}, hora de Venezuela. El resultado se da el {diaLargo(sorteo.resultadoEl)}.</li>
              <li>Participan las personas mayores de 18 años con una cuenta en la tienda y que vivan en Venezuela. No participa el equipo de la tienda.</li>
              <li>Cada compra pagada de {minimo} o más en productos (sin contar el envío) es 1 boleto. Una compra que llega en dos paquetes cuenta como una. Si una compra se cancela o se devuelve, su boleto se anula.</li>
              <li>Sin comprar: cada 2 amigos que se registren con tu enlace, con su teléfono, y verifiquen su correo te dan 1 boleto, hasta {sorteo.topeInvitar}. Cada persona cuenta una sola vez.</li>
              <li>No se vende ningún boleto. Participar no cuesta nada aparte de lo que decidas comprar.</li>
              <li>El ganador se elige al azar entre todos los boletos: cada boleto es una oportunidad. Se publica en esta página con el correo tapado y se le escribe al correo de su cuenta.</li>
              <li>El premio es una {sorteo.premio}. Se entrega en la tienda en Guanare o se envía sin costo por ZOOM a cualquier estado. No se cambia por dinero.</li>
              <li>Los correos de los participantes se usan solo para el sorteo y no se publican completos.</li>
            </ol>
          </details>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
