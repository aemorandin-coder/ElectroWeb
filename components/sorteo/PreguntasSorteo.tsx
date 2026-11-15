// C-255: lo que la gente le pregunta al equipo del sorteo (Andrés, 15/11: "¿Cómo participo? ¿A juro tengo que comprar? ¿Cómo
// creo mi cuenta?"), con respuestas cortas. Todo sale de las bases de la página y de cómo cuenta el código:
// - lib/sorteo/reglas.ts: 1 boleto por compra pagada de la compra mínima o más en productos (sin envío; cancelada o devuelta
//   no cuenta); 1 por cada 2 invitados con el correo verificado y teléfono, hasta el tope, y cada persona una sola vez;
// - lib/sorteo/servidor.ts y app/api/auth/register: el invitado es una cuenta nueva creada desde el enlace (la cookie del
//   proxy), registrada entre las fechas del sorteo; el registro pide nombre, correo, teléfono y contraseña, y manda el
//   correo para activarla.
// Cada pregunta es un <details> (se abre con el teclado y con el lector de pantalla), con su ícono. Sin hooks.
import type { CSSProperties, ReactNode } from 'react';
import { LogoEmpresa } from '@/components/envios/LogoEmpresa';
import {
  IconoCalendario, IconoCarrito, IconoChevronAbajo, IconoClientes, IconoCompartir, IconoCupon, IconoEnvio, IconoRegistrarse,
  type IconType,
} from '@/components/iconos';
import Aparece from '@/components/sorteo/Aparece';
import { diaLargo } from '@/components/sorteo/PremioSorteo';

export default function PreguntasSorteo({ minimo, tope, hasta, resultadoEl }: { minimo: string; tope: number; hasta: Date; resultadoEl: Date }) {
  const invitar = tope > 0;
  const preguntas: Array<{ Icono: IconType; pregunta: string; respuesta: ReactNode }> = [
    // El equipo, 15/11: "la idea es que compren. Siempre habla claro sobre dos caminos": la duda de "¿a juro tengo que
    // comprar?" se contesta con los dos caminos, en positivo y la compra primero
    invitar
      ? {
        Icono: IconoCarrito,
        pregunta: '¿Hay más de una forma de ganar boletos?',
        respuesta: `Sí, dos. Comprando: cada compra pagada de ${minimo} o más en productos es 1 boleto, sin límite. E invitando amigos: cada 2 que se registran con tu enlace y activan su correo te dan 1 boleto, hasta ${tope}.`,
      }
      : {
        Icono: IconoCarrito,
        pregunta: '¿Cómo gano boletos?',
        respuesta: `Comprando: cada compra pagada de ${minimo} o más en productos es 1 boleto, sin límite. Mientras más compras, más oportunidades.`,
      },
    {
      Icono: IconoRegistrarse,
      pregunta: '¿Cómo creo mi cuenta?',
      respuesta: 'Toca "Crear mi cuenta gratis" y escribe tu nombre, tu correo, tu teléfono y una contraseña. Te llega un correo para activarla: tócalo y listo.',
    },
    {
      Icono: IconoCupon,
      pregunta: '¿Cuántos boletos puedo tener?',
      respuesta: `Comprando, sin límite: 1 por cada compra pagada de ${minimo} o más en productos, sin contar el envío.${invitar ? ` Invitando, hasta ${tope}.` : ''} Si una compra se cancela o se devuelve, su boleto se anula.`,
    },
    ...(invitar ? [{
      Icono: IconoCompartir,
      pregunta: '¿Cómo invito a mis amigos y cuándo cuenta?',
      respuesta: 'Con tu cuenta, aquí sale tu enlace: compártelo por WhatsApp. Cuenta cuando tu amigo crea su cuenta nueva desde tu enlace, con su teléfono, y la activa desde su correo. Cada persona cuenta una sola vez.',
    }] : []),
    {
      Icono: IconoClientes,
      pregunta: '¿Quién puede participar?',
      respuesta: 'Las personas mayores de 18 años que viven en Venezuela, con su cuenta en la tienda. El equipo de la tienda no participa.',
    },
    {
      Icono: IconoCalendario,
      pregunta: '¿Cuándo y cómo sé si gané?',
      respuesta: `Cuentan las compras y las cuentas nuevas hasta el ${diaLargo(hasta)}. El ${diaLargo(resultadoEl)} sale el ganador, al azar entre todos los boletos: lo publicamos aquí, con el correo tapado, y le escribimos al correo de su cuenta.`,
    },
    {
      Icono: IconoEnvio,
      pregunta: '¿Cuánto me cuesta si gano?',
      // El equipo, 15/11: "donde dice 'ZOOM', que usen el logo oficial de la marca" (sobre el blanco se lee sin píldora)
      respuesta: <>Nada. El premio te lo enviamos sin costo por <LogoEmpresa empresa="ZOOM" className="inline h-3 align-baseline" /> a cualquier estado, o lo buscas en la tienda en Guanare. No se cambia por dinero.</>,
    },
  ];

  return (
    <section aria-labelledby="preguntas-sorteo" className="mt-10">
      <h2 id="preguntas-sorteo" className="text-xl font-bold text-ink lg:text-2xl">Lo que más nos preguntan</h2>
      <Aparece className="mt-4 grid items-start gap-3 lg:grid-cols-2">
        {preguntas.map(({ Icono, pregunta, respuesta }, i) => (
          <details key={pregunta} open={i === 0} className="group rounded-2xl border border-line bg-white">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 focus-visible:outline-2 focus-visible:outline-brand-500 [&::-webkit-details-marker]:hidden">
              <span className="sorteo-pop iconos-marca flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700" style={{ '--i': i } as CSSProperties}>
                <Icono className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="flex-1 text-base font-semibold text-ink">{pregunta}</span>
              <IconoChevronAbajo className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
            </summary>
            <p className="px-4 pb-4 text-sm leading-relaxed text-ink-soft sm:pl-[4.25rem]">{respuesta}</p>
          </details>
        ))}
      </Aparece>
    </section>
  );
}
