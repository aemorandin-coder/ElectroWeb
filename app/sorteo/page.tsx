// C-212: la página del sorteo (Andrés, 13/11: la PlayStation 4, con el resultado el 20/12). El premio, cómo participar,
// los boletos de quien entró con su cuenta y su enlace para invitar, las bases y, cuando ya se sorteó, quién ganó (con el
// correo tapado). Sin sorteo activo, lo dice y lleva al catálogo.
// C-255 (el equipo, 15/11: "explica mejor los pasos… ¿A juro tengo que comprar? ¿Cómo creo mi cuenta?"; "no uses tanto
// texto, iconiza de forma animada"; "la idea es que compren. Siempre habla claro sobre dos caminos"): Cómo participar en
// tres pasos con sus íconos (ComoParticipar: la cuenta, los dos caminos con la compra primero y el resultado), tus boletos
// al lado y las preguntas que la gente hace (PreguntasSorteo). Quien llega con el enlace de un amigo lo ve.
// C-254 (el equipo eligió la B viendo las maquetas): ya sorteado, el banner cuenta quién ganó (GanadorSorteo). Con la
// entrega publicada y su permiso, su nombre, su foto y su video; sin eso, el correo tapado, como antes.
// C-297 (Andrés, 18/11): comprar vale más ($5 → 2 boletos, cada $50 → 5), "Descubre el producto estrella" de la semana
// (sus boletos de más por cada uno), las reseñas como un camino más, y las bases y las preguntas con la regla nueva.
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import Footer from '@/components/Footer';
import AsiFunciona from '@/components/onboarding/AsiFunciona';
import { IconoRegalo } from '@/components/iconos';
import PublicHeader from '@/components/public/PublicHeader';
import ComoParticipar from '@/components/sorteo/ComoParticipar';
import PreguntasSorteo from '@/components/sorteo/PreguntasSorteo';
import ProductoEstrella from '@/components/sorteo/ProductoEstrella';
import GanadorSorteo from '@/components/sorteo/GanadorSorteo';
import PremioSorteo, { diaLargo } from '@/components/sorteo/PremioSorteo';
import Container from '@/components/ui/Container';
import { authOptions } from '@/lib/auth';
import { formatUSD } from '@/lib/currency';
import { ganadorPublico, misBoletosPublicos, sorteoParaBoletos } from '@/lib/dto/sorteo';
import { compartirPagina } from '@/lib/og/datos';
import { prisma } from '@/lib/prisma';
import { siteUrl } from '@/lib/seo';
import { getPublicSettings } from '@/lib/site-settings';
import { boletosPorMonto, boletosTexto, reglaDe, reglaLarga } from '@/lib/sorteo/escala';
import { estrellaPublica } from '@/lib/sorteo/estrella';
import { avisoDeMarcas, leerQueTrae } from '@/lib/sorteo/premio';
import { boletosDeCliente, esInvitacionVigente, getSorteoVigente } from '@/lib/sorteo/servidor';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const sorteo = await getSorteoVigente();
  // C-254: ya sorteado, "¡ya hay ganador!" (sin su nombre: el texto viaja por los chats)
  return {
    title: sorteo ? `${sorteo.titulo}: ${sorteo.sorteadoAt ? '¡ya hay ganador!' : sorteo.premio}` : 'Sorteo',
    description: sorteo
      ? sorteo.sorteadoAt
        ? `Ya hay ganador del sorteo de Electro Shop: la ${sorteo.premio} se sorteó el ${diaLargo(sorteo.sorteadoAt)}, al azar entre todos los boletos.`
        : `Participa en el sorteo de Electro Shop: ${sorteo.premio}. Cada compra de $${Number(sorteo.compraMinimaUSD)} o más te da ${boletosTexto(boletosPorMonto(Number(sorteo.compraMinimaUSD), reglaDe(sorteo)))}.`
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
  // C-263 (el equipo eligió el enlace corto, 15/11): /s/<código>, que lleva a /sorteo?invita=<código> (app/s/[codigo])
  const enlace = boletos ? `${siteUrl()}${boletos.enlaceCorto}` : null;
  const mis = boletos ? misBoletosPublicos(sorteo, boletos, siteUrl()) : null;
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
  const ganador = ganadorPublico(sorteo);
  // C-297: la regla por monto y el producto estrella de esta semana (null si no hay o no está a la venta)
  const regla = reglaDe(sorteo);
  const estrella = cerrado ? null : await estrellaPublica();

  return (
    <div className="min-h-dvh bg-surface">
      <PublicHeader />
      <main>
        {/* El premio: la pieza fuerte, en el azul oscuro del logo (la misma pieza que revisa el panel antes de publicar, C-221).
            C-254: ya sorteado, el mismo banner cuenta quién ganó */}
        {ganador ? (
          <GanadorSorteo
            titulo={sorteo.titulo} premio={sorteo.premio} imagen={sorteo.imagen} nombreCorto={sorteo.nombreCorto}
            incluye={leerQueTrae(sorteo.incluye)} ganador={ganador}
          />
        ) : (
          <PremioSorteo
            titulo={sorteo.titulo} premio={sorteo.premio} imagen={sorteo.imagen} resultadoEl={sorteo.resultadoEl} sorteadoAt={sorteo.sorteadoAt}
            incluye={leerQueTrae(sorteo.incluye)} lema={sorteo.lema} nombreCorto={sorteo.nombreCorto} participar={!cerrado}
          />
        )}

        {!cerrado && (
          <Container className="py-8 lg:py-10">
            {/* C-297: el producto estrella de la semana, antes de los pasos: es lo que más boletos da */}
            {estrella && <div className="mb-10"><ProductoEstrella estrella={estrella} /></div>}
            {/* C-255: los tres pasos con los caminos (la compra primero), tus boletos al lado y las preguntas */}
            <ComoParticipar
              minimo={minimo} tope={sorteo.topeInvitar} resultadoEl={sorteo.resultadoEl}
              cuenta={session?.user?.id ? { correoActivo: Boolean(usuario?.emailVerified) } : null}
              enlace={enlace} mensaje={`Participa conmigo en el sorteo de Electro Shop: ${sorteo.premio}. Regístrate con mi enlace:`}
              boletos={boletos} invitado={invitado} premio={sorteo.premio} mis={mis} urlSorteo={`${siteUrl()}/sorteo`}
              regla={regla} porResena={sorteo.boletosPorResena} estrella={estrella} muestra={boletos ? null : sorteoParaBoletos(sorteo)}
            />
            <PreguntasSorteo
              tope={sorteo.topeInvitar} hasta={sorteo.hasta} resultadoEl={sorteo.resultadoEl}
              regla={regla} porResena={sorteo.boletosPorResena} estrella={estrella ? { boletos: estrella.boletos } : null}
            />
            {/* C-257: la primera vez, el camino en tres íconos y un botón que lleva a "Cómo participar". Los dos caminos, la compra primero */}
            <AsiFunciona
              clave="sorteo"
              titulo="Así participas"
              nota={`Una compra de ${minimo} ya te da ${boletosTexto(boletosPorMonto(regla.minimoUSD, regla))}.`}
              pasos={[
                { icono: 'verificado', texto: 'Crea tu cuenta gratis', hecho: Boolean(session?.user?.id) },
                { icono: 'carrito', texto: `Compra ${minimo} o más`, accion: 'carrito' },
                { icono: 'calendario', texto: `Ganador el ${diaLargo(sorteo.resultadoEl)}` },
              ]}
              boton="Quiero participar"
              destino="como-participar"
            />
          </Container>
        )}

        {/* C-254: cerrado, sin "Cómo participar", las bases no quedan pegadas al banner */}
        <Container className={cerrado ? 'pb-12 pt-8' : 'pb-12'}>
          <details className="rounded-2xl border border-line bg-white p-5 open:pb-6">
            <summary className="flex cursor-pointer items-center gap-2 text-lg font-semibold text-ink">
              <IconoRegalo className="h-5 w-5 text-brand-600" aria-hidden="true" /> Las bases del sorteo
            </summary>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
              <li>Lo organiza {settings.companyName}. Cuentan las compras pagadas y los registros del {diaLargo(sorteo.desde)} al {diaLargo(sorteo.hasta)}, hora de Venezuela. El resultado se da el {diaLargo(sorteo.resultadoEl)}.</li>
              <li>Participan las personas mayores de 18 años con una cuenta en la tienda y que vivan en Venezuela. No participa el equipo de la tienda.</li>
              <li>{reglaLarga(regla)} Una compra que llega en dos paquetes cuenta como una. Si una compra se cancela o se devuelve, sus boletos se anulan.</li>
              {/* C-297: el producto estrella y las reseñas */}
              <li>Cada semana la tienda elige un producto estrella y lo publica en esta página. Cada unidad que se compre en su semana da los boletos que se anuncian{estrella ? ` (esta semana, ${estrella.boletos})` : ''}, además de los de la compra.</li>
              {sorteo.boletosPorResena > 0 && (
                <li>Cada reseña aprobada, escrita durante el sorteo, de un producto que la persona compró y recibió, da {boletosTexto(sorteo.boletosPorResena)}, sin límite. La aprobación no depende de la calificación: solo se rechazan las ofensivas o las que no hablan del producto.</li>
              )}
              <li>Invitando amigos: cada 2 amigos que se registren con tu enlace, con su teléfono, y activen su cuenta desde el correo te dan 1 boleto, hasta {sorteo.topeInvitar}. Cada persona cuenta una sola vez: si se registra con el enlace de dos participantes, cuenta para quien la invitó primero.</li>
              <li>No se vende ningún boleto. Participar no cuesta nada aparte de lo que decidas comprar.</li>
              <li>El ganador se elige al azar entre todos los boletos: cada boleto es una oportunidad. Se publica en esta página con el correo tapado y se le escribe al correo de su cuenta. Solo si la persona lo acepta, se publican también su nombre, su foto y el video de la entrega.</li>
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
