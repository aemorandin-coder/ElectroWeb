// C-212: la página del sorteo (Andrés, 13/11: la PlayStation 4, con el resultado el 20/12). El premio, cómo participar,
// los boletos de quien entró con su cuenta y su enlace para invitar, las bases y, cuando ya se sorteó, quién ganó (con el
// correo tapado). Sin sorteo activo, lo dice y lleva al catálogo.
// C-255 (el equipo, 15/11: "explica mejor los pasos… ¿A juro tengo que comprar? ¿Cómo creo mi cuenta?"; "no uses tanto
// texto, iconiza de forma animada"; "la idea es que compren. Siempre habla claro sobre dos caminos"): Cómo participar en
// tres pasos con sus íconos (ComoParticipar: la cuenta, los dos caminos con la compra primero y el resultado), tus boletos
// al lado y las preguntas que la gente hace (PreguntasSorteo). Quien llega con el enlace de un amigo lo ve.
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import Footer from '@/components/Footer';
import { IconoRegalo } from '@/components/iconos';
import PublicHeader from '@/components/public/PublicHeader';
import ComoParticipar from '@/components/sorteo/ComoParticipar';
import PreguntasSorteo from '@/components/sorteo/PreguntasSorteo';
import PremioSorteo, { diaLargo } from '@/components/sorteo/PremioSorteo';
import Container from '@/components/ui/Container';
import { authOptions } from '@/lib/auth';
import { formatUSD } from '@/lib/currency';
import { compartirPagina } from '@/lib/og/datos';
import { prisma } from '@/lib/prisma';
import { siteUrl } from '@/lib/seo';
import { getPublicSettings } from '@/lib/site-settings';
import { avisoDeMarcas, leerQueTrae } from '@/lib/sorteo/premio';
import { correoTapado } from '@/lib/sorteo/reglas';
import { boletosDeCliente, esInvitacionVigente, getSorteoVigente } from '@/lib/sorteo/servidor';

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

export default async function SorteoPage({ searchParams }: { searchParams: Promise<{ invita?: string | string[] }> }) {
  const [sorteo, session, settings, params] = await Promise.all([getSorteoVigente(), getServerSession(authOptions), getPublicSettings(), searchParams]);

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
  const boletos = session?.user?.id && !cerrado ? await boletosDeCliente(sorteo, session.user.id) : null;
  const enlace = boletos ? `${siteUrl()}${boletos.enlace}` : null;
  const marcas = avisoDeMarcas(sorteo.premio, sorteo.nombreCorto);
  // C-255: si ya activó su correo se lee de la base (la sesión lo guarda desde que entró y no se entera si lo activó en otro
  // navegador, como el del correo en el teléfono)
  const usuario = session?.user?.id && !cerrado
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { emailVerified: true } })
    : null;
  // C-255: llegó con el enlace de un amigo. Cuenta el primer enlace que abrió (la cookie de proxy.ts); en la primera visita
  // la cookie todavía no viene en el pedido y vale el de la dirección
  const codigoInvita = (await cookies()).get('electroshop_sorteo')?.value ?? (typeof params.invita === 'string' ? params.invita : null);
  const invitado = !session?.user?.id && !cerrado && (await esInvitacionVigente(codigoInvita, sorteo.id));

  return (
    <div className="min-h-dvh bg-surface">
      <PublicHeader />
      <main>
        {/* El premio: la pieza fuerte, en el azul oscuro del logo (la misma pieza que revisa el panel antes de publicar, C-221) */}
        <PremioSorteo
          titulo={sorteo.titulo} premio={sorteo.premio} imagen={sorteo.imagen} resultadoEl={sorteo.resultadoEl} sorteadoAt={sorteo.sorteadoAt}
          incluye={leerQueTrae(sorteo.incluye)} lema={sorteo.lema} nombreCorto={sorteo.nombreCorto} participar={!cerrado}
        />

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
            {/* C-255: los tres pasos con los dos caminos (la compra primero), tus boletos al lado y las preguntas */}
            <ComoParticipar
              minimo={minimo} tope={sorteo.topeInvitar} resultadoEl={sorteo.resultadoEl}
              cuenta={session?.user?.id ? { correoActivo: Boolean(usuario?.emailVerified) } : null}
              enlace={enlace} mensaje={`Participa conmigo en el sorteo de Electro Shop: ${sorteo.premio}. Regístrate con mi enlace:`}
              boletos={boletos} invitado={invitado}
            />
            <PreguntasSorteo minimo={minimo} tope={sorteo.topeInvitar} hasta={sorteo.hasta} resultadoEl={sorteo.resultadoEl} />
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
              <li>Invitando amigos: cada 2 amigos que se registren con tu enlace, con su teléfono, y activen su cuenta desde el correo te dan 1 boleto, hasta {sorteo.topeInvitar}. Cada persona cuenta una sola vez.</li>
              <li>No se vende ningún boleto. Participar no cuesta nada aparte de lo que decidas comprar.</li>
              <li>El ganador se elige al azar entre todos los boletos: cada boleto es una oportunidad. Se publica en esta página con el correo tapado y se le escribe al correo de su cuenta.</li>
              <li>El premio es una {sorteo.premio}. Se entrega en la tienda en Guanare o se envía sin costo por ZOOM a cualquier estado. No se cambia por dinero.</li>
              <li>Los correos de los participantes se usan solo para el sorteo y no se publican completos.</li>
              <li>{marcas}</li>
            </ol>
          </details>
          {/* C-253 (pedido del equipo, 15/11): de quién son las marcas del premio, a la vista y no solo dentro de las bases */}
          <p className="mt-4 text-xs leading-relaxed text-muted">{marcas}</p>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
