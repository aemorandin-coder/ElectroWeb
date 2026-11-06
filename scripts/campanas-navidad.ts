/**
 * C-190: los borradores de las dos campañas de correo de Navidad, en Marketing → Campañas de correo.
 * - La del aguinaldo, para mandarla la primera semana de diciembre.
 * - La de último minuto, para el 20 de diciembre.
 *
 *   npx tsx scripts/campanas-navidad.ts             (muestra lo que haría; no cambia nada)
 *   npx tsx scripts/campanas-navidad.ts --aplicar   (crea las que falten)
 *
 * Se corre en el servidor. Solo crea borradores: este guion nunca envía un correo. El envío lo hace el equipo desde el
 * panel, con su botón, después de revisarlas y de mandarse una de prueba.
 * Se puede correr otra vez: cada campaña tiene su identificador fijo por temporada (navidad-2026-aguinaldo), y si ya
 * existe (aunque se haya editado o enviado) no se toca ni se duplica.
 * Los textos no prometen ofertas, precios, porcentajes ni plazos de entrega: eso lo agrega Andrés en el panel si quiere.
 * El botón lleva a Ideas para regalar.
 */
import { prisma } from '../lib/prisma';
import { campanaSchema, type CampanaContenido } from '../lib/email-campaigns';
import { RUTA_REGALOS, temporadaSugerida } from '../lib/navidad';

const aplicar = process.argv.includes('--aplicar');
// La temporada que viene (o la que está en curso hasta el 6 de enero): 2026 para la Navidad de 2026
const ano = temporadaSugerida().desde.slice(0, 4);

const AYUDA = 'Si tienes dudas, escríbenos por WhatsApp: te ayudamos a elegir.';

const CAMPANAS: Array<{ id: string; cuando: string; contenido: CampanaContenido }> = [
  {
    id: `navidad-${ano}-aguinaldo`,
    cuando: 'la primera semana de diciembre',
    contenido: {
      subject: 'Ideas para regalar esta Navidad',
      preheader: 'Regalos para todos los presupuestos, ordenados para que elijas rápido.',
      bloques: [
        { tipo: 'titulo', texto: 'Ideas para regalar esta Navidad' },
        {
          tipo: 'texto',
          texto:
            'Hola, {nombre}:\n\nLlegó diciembre y con él la lista de regalos. Para que no tengas que recorrer toda la tienda, juntamos nuestras ideas para regalar por presupuesto: tecnología, gaming, accesorios y gift cards, cada una con su precio en dólares y en bolívares.',
        },
        { tipo: 'boton', texto: 'Ver ideas para regalar', url: RUTA_REGALOS },
        { tipo: 'texto', texto: `¿No sabes qué le gusta? Con una gift card de Electro Shop, quien la recibe elige su regalo.\n\n${AYUDA} ¡Felices fiestas!` },
      ],
    },
  },
  {
    id: `navidad-${ano}-ultimo-minuto`,
    cuando: 'el 20 de diciembre',
    contenido: {
      subject: '¿Te falta un regalo?',
      preheader: 'Las gift cards y las recargas digitales no dependen del envío.',
      bloques: [
        { tipo: 'titulo', texto: '¿Te falta un regalo?' },
        {
          tipo: 'texto',
          texto:
            'Hola, {nombre}:\n\nSi todavía te falta alguien en la lista, las gift cards y las recargas digitales son el regalo de último minuto: no dependen del envío y le dejan elegir a quien las recibe.\n\nTambién juntamos nuestras ideas para regalar por presupuesto, para que encuentres algo rápido.',
        },
        { tipo: 'boton', texto: 'Ver ideas para regalar', url: RUTA_REGALOS },
        { tipo: 'texto', texto: `${AYUDA} ¡Feliz Navidad!` },
      ],
    },
  },
];

async function main() {
  console.log(aplicar ? 'Creando los borradores que falten.' : 'Solo se muestra lo que haría. Para crearlos: --aplicar');
  let creadas = 0;
  for (const { id, cuando, contenido } of CAMPANAS) {
    // Lo que el panel no pueda leer no se guarda (mismas reglas que el editor de campañas)
    const valido = campanaSchema.parse(contenido);
    const existente = await prisma.emailCampaign.findUnique({ where: { id }, select: { status: true } });
    if (existente) {
      console.log(`= ya existe ${id} (${existente.status}): no se toca`);
      continue;
    }
    console.log(`+ ${aplicar ? 'creada' : 'crearía'} ${id}: «${valido.subject}», para ${cuando}`);
    if (!aplicar) continue;
    await prisma.emailCampaign.create({
      data: { id, subject: valido.subject, preheader: valido.preheader || null, content: JSON.stringify(valido.bloques), status: 'DRAFT' },
    });
    creadas++;
  }
  if (aplicar) console.log(`Borradores creados: ${creadas}. Quedan sin enviar en Marketing → Campañas de correo.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
