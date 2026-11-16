// C-255: "Cómo participar" en /sorteo. El equipo, 15/11: "explica mejor los pasos, la gente me pregunta: ¿Cómo participo?
// ¿A juro tengo que comprar? ¿Cómo creo mi cuenta?", y después "no uses tanto texto, iconiza de forma animada". Eligió la B
// de las maquetas (el camino de arriba hacia abajo) con una corrección: "la idea es que compren. Siempre habla claro sobre
// dos caminos". Nada de "no tienes que comprar": los dos caminos para ganar boletos, la compra primero.
// - Paso 1, la cuenta: sin sesión, "Crear mi cuenta gratis" (vuelve a /sorteo) y "Entra"; con sesión, hecho, y si falta
//   activar el correo, cómo hacerlo (para comprar hace falta).
// - Paso 2, los dos caminos: comprando (con los productos) e invitando amigos (con el enlace, si hay sesión).
// - Paso 3, el día del resultado.
// - Al lado (en el teléfono, debajo): tus boletos con sesión; sin sesión, que cada boleto es una oportunidad.
// Cada paso se entiende por su ícono y una frase; lo demás va en las preguntas (PreguntasSorteo). Los íconos entran una vez
// al llegar a la vista (Aparece y `.sorteo-*` en app/globals.css). Sin hooks.
// C-263 (el equipo eligió el boleto A y el flyer F1, 15/11): en "Tus boletos", los boletos épicos en lugar del número, con
// el monto chico debajo de cada uno (solo en la pantalla), "Descargar" y "Mi flyer"; "Invitando amigos" sigue debajo. En
// el camino 2, el enlace corto (/s/<código>) y "Mi flyer para el estado" junto a "Compartir por WhatsApp".
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import {
  IconoCalendario, IconoCarrito, IconoCheck, IconoClientes, IconoCompartir, IconoCorreo, IconoCupon, IconoRegalo,
  IconoVerificado, type IconType,
} from '@/components/iconos';
import AmigosInvitados from '@/components/sorteo/AmigosInvitados';
import Aparece from '@/components/sorteo/Aparece';
import CompartirEnlace from '@/components/sorteo/CompartirEnlace';
import { BoletosDelSorteo, BotonFlyer } from '@/components/sorteo/MisBoletos';
import { diaLargo } from '@/components/sorteo/PremioSorteo';
import { avisoAccion } from '@/lib/admin-ui';
import type { MisBoletosPublicos } from '@/lib/dto/sorteo';
import type { BoletosDeCliente } from '@/lib/sorteo/servidor';

/** El orden de entrada (cascada) y el largo del trazo que se dibuja */
const enCascada = (i: number, trazo?: number) => ({ '--i': i, ...(trazo ? { '--trazo': trazo } : null) }) as CSSProperties;

function Placa({ Icono, i, grande = false, trazo }: { Icono: IconType; i: number; grande?: boolean; trazo?: number }) {
  return (
    <span className={`sorteo-pop relative flex shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white ${grande ? 'h-16 w-16' : 'h-14 w-14'}`} style={enCascada(i)}>
      <Icono className={`${grande ? 'h-9 w-9' : 'h-8 w-8'} ${trazo ? 'sorteo-trazo' : ''}`} style={trazo ? enCascada(i, trazo) : undefined} aria-hidden="true" />
    </span>
  );
}

/** "+1" sobre la placa: salta al entrar */
const MasUno = ({ i }: { i: number }) => (
  <span aria-hidden="true" className="sorteo-salta absolute -right-2 -top-2 rounded-full bg-brand-700 px-2 py-0.5 text-xs font-bold text-white shadow ring-2 ring-white" style={enCascada(i)}>+1</span>
);

/** El tramo del camino hasta el paso siguiente: se dibuja hacia abajo, en orden */
const Tramo = ({ i }: { i: number }) => (
  <span aria-hidden="true" className="sorteo-linea-v absolute -bottom-5 left-5 top-10 w-0.5 bg-brand-200 lg:-bottom-6 lg:left-6 lg:top-12" style={enCascada(i)} />
);

/** El número del paso en el camino; hecho, el visto se dibuja en verde */
function Nodo({ n, hecho, i }: { n: number; hecho: boolean; i: number }) {
  return (
    <span className={`sorteo-pop relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold text-white ring-4 ring-surface lg:h-12 lg:w-12 lg:text-lg ${hecho ? 'bg-success-strong' : 'bg-brand-500'}`} style={enCascada(i)}>
      {hecho ? <IconoCheck className="sorteo-trazo h-5 w-5" style={enCascada(i, 22)} aria-hidden="true" /> : n}
      <span className="sr-only">{hecho ? `Paso ${n}, hecho` : `Paso ${n}`}</span>
    </span>
  );
}

function Titulo({ children, linea }: { children: ReactNode; linea: ReactNode }) {
  return (
    <div className="min-w-0">
      <h3 className="text-lg font-semibold text-ink">{children}</h3>
      <p className="mt-0.5 text-sm text-ink-soft">{linea}</p>
    </div>
  );
}

const ROTULO = 'text-xs font-semibold uppercase tracking-[0.12em] text-brand-600';
const BOTON = 'inline-flex min-h-11 items-center rounded-full bg-brand-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
const ENLACE = 'inline-flex min-h-11 items-center text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline';

export interface DatosComoParticipar {
  /** "$5" */
  minimo: string;
  /** Hasta cuántos boletos se ganan invitando (0: este sorteo no tiene invitaciones) */
  tope: number;
  resultadoEl: Date;
  /** null sin sesión */
  cuenta: { correoActivo: boolean } | null;
  /** Su enlace para invitar (con el dominio) y el mensaje para WhatsApp */
  enlace: string | null;
  mensaje: string;
  /** Sus boletos (con sesión) */
  boletos: BoletosDeCliente | null;
  /** Llegó con el enlace de un amigo (sin sesión) */
  invitado: boolean;
  /** C-262: el premio, para el recordatorio por WhatsApp a los amigos que todavía no cuentan */
  premio: string;
  /** C-263: sus boletos épicos (lista blanca de lib/dto/sorteo.ts), con sesión */
  mis: MisBoletosPublicos | null;
  /** C-263: /sorteo con el dominio, para el recordatorio a los amigos */
  urlSorteo: string;
}

export default function ComoParticipar({ minimo, tope, resultadoEl, cuenta, enlace, mensaje, boletos, invitado, premio, mis, urlSorteo }: DatosComoParticipar) {
  const invitar = tope > 0;
  const volver = encodeURIComponent('/sorteo');
  return (
    <>
      <h2 id="como-participar" className="scroll-mt-40 text-xl font-bold text-ink lg:text-2xl">Cómo participar</h2>
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Aparece>
          <ol className="space-y-5 lg:space-y-6">

            {/* 1. La cuenta */}
            <li className="relative flex gap-3 lg:gap-4">
              <Tramo i={0} />
              <Nodo n={1} hecho={Boolean(cuenta)} i={0} />
              <div className="min-w-0 flex-1 rounded-2xl border border-line bg-white p-4 lg:p-5">
                {cuenta ? (
                  <>
                    <div className="flex items-center gap-4">
                      <Placa Icono={IconoVerificado} i={0} trazo={6} />
                      <Titulo linea="Con ella sumas y sigues tus boletos aquí.">Ya tienes tu cuenta</Titulo>
                    </div>
                    {!cuenta.correoActivo && (
                      <p className={`mt-4 flex items-start gap-3 rounded-xl border p-3 text-sm ${avisoAccion}`}>
                        <IconoCorreo aria-hidden="true" />
                        <span>
                          Actívala con el enlace que te llegó al correo: la necesitas para comprar.{' '}
                          <Link href="/customer/profile?tab=datos" className="font-semibold text-brand-700 underline underline-offset-2">¿No te llegó?</Link>
                        </span>
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {invitado && (
                      <p className={`mb-4 flex items-start gap-3 rounded-xl border p-3 text-sm ${avisoAccion}`}>
                        <IconoRegalo aria-hidden="true" />
                        <span>Te invitó un amigo. Crea tu cuenta y actívala desde tu correo: así sumas para su boleto.</span>
                      </p>
                    )}
                    <div className="flex items-center gap-4">
                      <Placa Icono={IconoVerificado} i={0} trazo={6} />
                      <Titulo linea="Con tu correo y tu teléfono.">Crea tu cuenta gratis</Titulo>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <Link href={`/registro?callbackUrl=${volver}`} className={BOTON}>Crear mi cuenta gratis</Link>
                      <Link href={`/login?callbackUrl=${volver}`} className={ENLACE}>¿Ya tienes cuenta? Entra</Link>
                    </div>
                  </>
                )}
              </div>
            </li>

            {/* 2. Los dos caminos, la compra primero */}
            <li className="relative flex gap-3 lg:gap-4">
              <Tramo i={1} />
              <Nodo n={2} hecho={false} i={1} />
              <div className="min-w-0 flex-1 rounded-2xl border border-line bg-white p-4 lg:p-5">
                <h3 className="text-lg font-semibold text-ink">{invitar ? 'Gana boletos por dos caminos' : 'Gana boletos comprando'}</h3>
                <div className={`mt-3 grid gap-3 ${invitar ? 'sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2' : ''}`}>
                  <section aria-label="Comprando" className="flex flex-col rounded-xl border border-brand-200 bg-brand-50 p-4">
                    {invitar && <p className={ROTULO}>Camino 1</p>}
                    <div className={`flex items-center gap-3 ${invitar ? 'mt-2' : ''}`}>
                      <span className="relative"><Placa Icono={IconoCarrito} i={1} /><MasUno i={1} /></span>
                      <Titulo linea="1 boleto por compra, sin límite.">Compra {minimo} o más</Titulo>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-brand-700">Mientras más compras, más oportunidades.</p>
                    <Link href="/productos" className={`${BOTON} mt-3 self-start`}>Ver productos</Link>
                  </section>
                  {invitar && (
                    <section aria-label="Invitando amigos" className="flex flex-col rounded-xl border border-line p-4">
                      <p className={ROTULO}>Camino 2</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="relative"><Placa Icono={IconoClientes} i={2} /><MasUno i={2} /></span>
                        <Titulo linea={`2 amigos = 1 boleto. Hasta ${tope}.`}>Invita a tus amigos</Titulo>
                      </div>
                      <p className="mt-3 text-sm text-ink-soft">Cuenta cuando se registran con tu enlace y activan su cuenta.</p>
                      {enlace ? (
                        <div className="mt-3">
                          <CompartirEnlace enlace={enlace} mensaje={mensaje} />
                          {mis && <div className="mt-2"><BotonFlyer datos={mis} /></div>}
                        </div>
                      ) : (
                        <p className="mt-3 flex items-center gap-2 text-sm text-muted"><IconoCompartir className="h-4 w-4 shrink-0" aria-hidden="true" /> Tu enlace sale al crear tu cuenta.</p>
                      )}
                    </section>
                  )}
                </div>
              </div>
            </li>

            {/* 3. El resultado */}
            <li className="relative flex gap-3 lg:gap-4">
              <Nodo n={3} hecho={false} i={2} />
              <div className="min-w-0 flex-1 rounded-2xl border border-line bg-white p-4 lg:p-5">
                <div className="flex items-center gap-4">
                  <Placa Icono={IconoCalendario} i={3} />
                  <Titulo linea="Sale el ganador: lo publicamos aquí y le escribimos.">Espera el {diaLargo(resultadoEl)}</Titulo>
                </div>
              </div>
            </li>
          </ol>
        </Aparece>

        {/* Al lado: tus boletos (con sesión) o que cada boleto es una oportunidad */}
        {/* Con boletos, la columna crece con ellos: deja de quedarse pegada arriba (no cabría en la pantalla) */}
        <Aparece className={boletos && boletos.total > 0 ? '' : 'lg:sticky lg:top-40'}>
          {boletos ? (
            <section id="tus-boletos" aria-labelledby="tus-boletos-titulo" className="scroll-mt-40 rounded-2xl border border-line bg-white p-5">
              <div className="flex items-center gap-4">
                <span className="relative"><Placa Icono={IconoCupon} i={0} grande />{boletos.total > 0 && <MasUno i={0} />}</span>
                <div>
                  <h2 id="tus-boletos-titulo" className="text-lg font-semibold text-ink">Tus boletos</h2>
                  <p className="text-sm text-ink-soft">
                    {boletos.total > 0
                      ? `${boletos.total} ${boletos.total === 1 ? 'boleto' : 'boletos'}: cada uno es una oportunidad`
                      : `Todavía no tienes: compra ${minimo} o más${invitar ? ' o invita a 2 amigos' : ''}.`}
                  </p>
                </div>
              </div>
              {/* C-263: los boletos épicos, con el monto o los amigos debajo de cada uno */}
              {mis && <BoletosDelSorteo datos={mis} flyer />}
              {/* C-262: cuánto falta para el próximo boleto, cada amigo con su estado y el recordatorio por WhatsApp */}
              {invitar && (
                <AmigosInvitados
                  amigos={boletos.amigos} porInvitar={boletos.porInvitar} tope={boletos.tope} faltanParaProximo={boletos.faltanParaProximo}
                  premio={premio} urlSorteo={urlSorteo}
                />
              )}
            </section>
          ) : (
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center">
              <span className="relative mx-auto block w-fit"><Placa Icono={IconoCupon} i={0} grande /><MasUno i={0} /></span>
              <p className="mt-4 text-2xl font-bold leading-tight text-ink">Cada boleto es una oportunidad</p>
              <p className="mt-2 text-base text-ink-soft">El ganador sale al azar entre todos los boletos.</p>
            </div>
          )}
        </Aparece>
      </div>
    </>
  );
}
