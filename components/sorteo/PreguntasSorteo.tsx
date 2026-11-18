// C-255: lo que la gente le pregunta al equipo del sorteo (Andrés, 15/11: "¿Cómo participo? ¿A juro tengo que comprar? ¿Cómo
// creo mi cuenta?"), con respuestas cortas. Todo sale de las bases de la página y de cómo cuenta el código:
// - lib/sorteo/reglas.ts: 1 boleto por compra pagada de la compra mínima o más en productos (sin envío; cancelada o devuelta
//   no cuenta); 1 por cada 2 invitados con el correo verificado y teléfono, hasta el tope, y cada persona una sola vez;
// - lib/sorteo/servidor.ts y app/api/auth/register: el invitado es una cuenta nueva creada desde el enlace (la cookie del
//   proxy), registrada entre las fechas del sorteo; el registro pide nombre, correo, teléfono y contraseña, y manda el
//   correo para activarla.
// C-297: la escala por monto, el producto estrella y las reseñas (lib/sorteo/escala.ts y reglas.ts). Y el equipo, 18/11
// ("diseño animado un poco más discreto", "mucho scroll"): en una sola tarjeta, una abierta a la vez (AcordeonPreguntas).
import type { ReactNode } from 'react';
import { LogoEmpresa } from '@/components/envios/LogoEmpresa';
import {
  IconoCalendario, IconoCarrito, IconoChat, IconoClientes, IconoCompartir, IconoCupon, IconoEnvio, IconoEstrella,
  IconoRegistrarse, type IconType,
} from '@/components/iconos';
import AcordeonPreguntas from '@/components/sorteo/AcordeonPreguntas';
import { diaLargo } from '@/components/sorteo/PremioSorteo';
import { boletosTexto, reglaCorta, reglaLarga, type ReglaDeCompra } from '@/lib/sorteo/escala';

/** "Desde $5…" después de dos puntos va en minúscula */
const minuscula = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);

export default function PreguntasSorteo({ tope, hasta, resultadoEl, regla, porResena, estrella }: {
  tope: number;
  hasta: Date;
  resultadoEl: Date;
  regla: ReglaDeCompra;
  /** Boletos por reseña (0: no dan) */
  porResena: number;
  /** El producto estrella de esta semana, si hay */
  estrella: { boletos: number } | null;
}) {
  const invitar = tope > 0;
  const resenas = porResena > 0;
  const caminos = 1 + (resenas ? 1 : 0) + (invitar ? 1 : 0);
  const extra = estrella ? ` El producto estrella de la semana te da ${estrella.boletos} más por cada uno.` : '';
  const preguntas: Array<{ Icono: IconType; pregunta: string; respuesta: ReactNode }> = [
    // El equipo, 15/11: "la idea es que compren. Siempre habla claro sobre dos caminos": la duda de "¿a juro tengo que
    // comprar?" se contesta con los caminos, en positivo y la compra primero
    caminos > 1
      ? {
        Icono: IconoCarrito,
        pregunta: '¿Hay más de una forma de ganar boletos?',
        respuesta: `Sí, ${caminos === 3 ? 'tres' : 'dos'}. Comprando, sin límite: ${minuscula(reglaCorta(regla))}${extra}${resenas ? ` Con tus reseñas: ${boletosTexto(porResena)} por cada una.` : ''}${invitar ? ` E invitando amigos: cada 2 que se registran con tu enlace y activan su cuenta te dan 1 boleto, hasta ${tope}.` : ''}`,
      }
      : {
        Icono: IconoCarrito,
        pregunta: '¿Cómo gano boletos?',
        respuesta: `Comprando, sin límite: ${minuscula(reglaCorta(regla))}${extra} Mientras más compras, más oportunidades.`,
      },
    {
      Icono: IconoRegistrarse,
      pregunta: '¿Cómo creo mi cuenta?',
      respuesta: 'Toca "Crear mi cuenta gratis" y escribe tu nombre, tu correo, tu teléfono y una contraseña. Te llega un correo para activarla: tócalo y listo.',
    },
    {
      Icono: IconoCupon,
      pregunta: '¿Cuántos boletos puedo tener?',
      respuesta: `Comprando, sin límite. ${reglaLarga(regla)}${extra}${resenas ? ' Con reseñas, también sin límite.' : ''}${invitar ? ` Invitando, hasta ${tope}.` : ''} Si una compra se cancela o se devuelve, sus boletos se anulan.`,
    },
    {
      Icono: IconoEstrella,
      pregunta: '¿Qué es el producto estrella?',
      respuesta: `Un producto que elegimos cada semana y que sale arriba en esta página. Cada uno que compres en su semana te da ${estrella ? estrella.boletos : 'sus'} boletos más, además de los de tu compra. Si compras dos, el doble.`,
    },
    ...(resenas ? [{
      Icono: IconoChat,
      pregunta: '¿Cómo cuentan las reseñas?',
      respuesta: `Cada reseña de un producto que compraste y te llegó te da ${boletosTexto(porResena)}, sin límite. La escribes desde Mis pedidos, en lo entregado. Cuenta cuando la aprobamos, sea de 1 o de 5 estrellas.`,
    }] : []),
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
      respuesta: `Cuentan las compras${resenas ? ', las reseñas' : ''} y las cuentas nuevas hasta el ${diaLargo(hasta)}. El ${diaLargo(resultadoEl)} sale el ganador, al azar entre todos los boletos: lo publicamos aquí, con el correo tapado, y le escribimos al correo de su cuenta.`,
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
      <AcordeonPreguntas
        preguntas={preguntas.map(({ Icono, pregunta, respuesta }, i) => ({ id: `p${i}`, icono: <Icono className="h-5 w-5" aria-hidden="true" />, pregunta, respuesta }))}
      />
    </section>
  );
}
