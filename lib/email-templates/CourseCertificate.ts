import { sendEmail } from '@/lib/email-service';
import { escapeHtml } from '@/lib/html';
import { CORREO, avisoCorreo, botonCorreo, exitoCorreo, notaCorreo, placaCorreo, placaInteriorCorreo, urlTienda } from './estilo';
import { marcoCorreo } from './marco';

const e = escapeHtml;
const primerNombre = (nombre: string) => e((nombre || '').trim().split(/\s+/)[0] || '');

export async function sendCourseEnrollmentEmail(
  email: string,
  data: { studentName: string; courseTitle: string; instructorName: string; courseSlug: string }
) {
  const nombre = primerNombre(data.studentName);
  const html = await marcoCorreo({
    preheader: `Ya puedes empezar: ${data.courseTitle}`,
    encabezado: {
      sello: 'INSCRIPCIÓN CONFIRMADA',
      titulo: `¡A aprender${nombre ? `, ${nombre}` : ''}!`,
      texto: 'Tu lugar en el curso está listo. Entra cuando quieras y avanza a tu ritmo.',
    },
    cuerpo: `
      ${placaCorreo(`
        <p style="${CORREO.placaRotulo}">Te inscribiste en</p>
        <p style="${CORREO.placaTitulo}">${e(data.courseTitle)}</p>
        <p style="${CORREO.placaTexto}">Con ${e(data.instructorName)}</p>`, '0 0 6px')}
      ${botonCorreo(`${urlTienda()}/cursos/${encodeURIComponent(data.courseSlug)}/aprender`, 'Empezar ahora')}`,
    chispa: { pose: 'senala', texto: 'Un consejo: una lección al día y en nada lo terminas. Al final te espera tu certificado.' },
  });
  return sendEmail({ to: email, subject: `¡Ya estás en "${data.courseTitle}"!`, html });
}

export async function sendCourseCertificateEmail(
  email: string,
  data: {
    studentName: string;
    courseTitle: string;
    instructorName: string;
    certificateId: string;
    completedAt: Date;
  }
) {
  const certUrl = `${urlTienda()}/certificado/${encodeURIComponent(data.certificateId)}`;
  const fecha = data.completedAt.toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });
  const nombre = primerNombre(data.studentName);

  const html = await marcoCorreo({
    preheader: `¡Completaste ${data.courseTitle}! Tu certificado ya está listo.`,
    encabezado: {
      sello: 'CURSO COMPLETADO',
      titulo: `¡Lo lograste${nombre ? `, ${nombre}` : ''}!`,
      texto: 'Terminaste el curso y tu certificado ya está listo para mostrarlo.',
    },
    cuerpo: `
      <!-- C-192: el certificado es la pieza fuerte (la placa, en el azul oscuro del logo desde C-243) -->
      ${placaCorreo(`
        <p style="${CORREO.placaRotulo}">Certificado de finalización</p>
        <p style="${CORREO.placaTitulo}">${e(data.courseTitle)}</p>
        <p style="${CORREO.placaTexto}">Con ${e(data.instructorName)} · ${e(fecha)}</p>
        ${placaInteriorCorreo('ID de verificación', e(data.certificateId), '', 15)}`, '0 0 6px')}
      <p style="${CORREO.textoMenor}text-align:center;margin-top:14px;">Cualquier persona puede confirmar que es auténtico con el enlace de abajo.</p>
      ${botonCorreo(certUrl, 'Ver mi certificado')}
      <p style="${CORREO.nota}">Para compartirlo: <a href="${certUrl}" style="${CORREO.enlace}">${certUrl}</a></p>`,
    chispa: { pose: 'celebra', texto: '¡Felicidades! Compártelo en tus redes: te lo ganaste.' },
  });
  return sendEmail({ to: email, subject: `¡Tu certificado de "${data.courseTitle}" está listo!`, html });
}

export async function sendCreatorStatusEmail(
  email: string,
  data: { creatorName: string; status: 'APPROVED' | 'REJECTED' | 'SUSPENDED'; notes?: string }
) {
  const app = urlTienda();
  const nombre = primerNombre(data.creatorName);
  const notas = data.notes ? e(data.notes).replace(/\n/g, '<br>') : '';

  const configs = {
    APPROVED: {
      asunto: '¡Tu solicitud de creador fue aprobada!',
      sello: 'CREADOR APROBADO',
      titulo: `¡Ya eres del equipo de creadores${nombre ? `, ${nombre}` : ''}!`,
      texto: 'Aprobamos tu solicitud: ya puedes crear tus cursos y empezar a ganar con lo que sabes.',
      cta: { texto: 'Ir a mi panel de creador', url: `${app}/creator/dashboard` },
      nota: notas ? exitoCorreo('Mensaje del equipo', notas) : '',
      chispa: { pose: 'celebra' as const, texto: 'Un consejo: empieza con un curso corto sobre lo que más dominas. Lo revisamos y lo publicamos.' },
    },
    REJECTED: {
      asunto: 'Revisamos tu solicitud de creador',
      sello: 'SOLICITUD DE CREADOR',
      titulo: 'Por ahora no pudimos aprobarte',
      texto: 'Revisamos tu solicitud con cuidado y esta vez no la aprobamos. Si quieres saber más o volver a intentarlo, escríbenos.',
      cta: { texto: 'Hablar con nosotros', url: `${app}/contacto` },
      nota: notas ? notaCorreo(`<strong style="${CORREO.fuerte}">Mensaje del equipo:</strong> ${notas}`) : '',
      chispa: { pose: 'explica' as const, texto: 'No es un no para siempre: con más experiencia o un tema distinto, vuelve a escribirnos.' },
    },
    SUSPENDED: {
      asunto: 'Tu cuenta de creador está suspendida',
      sello: 'CUENTA DE CREADOR',
      titulo: 'Suspendimos tu cuenta de creador',
      texto: 'Tu cuenta de creador quedó suspendida por ahora. Escríbenos para saber el motivo y cómo reactivarla.',
      cta: { texto: 'Hablar con nosotros', url: `${app}/contacto` },
      nota: notas ? avisoCorreo('Mensaje del equipo', notas, 'info') : '',
      chispa: { pose: 'explica' as const, texto: 'Escríbenos y lo revisamos juntos.' },
    },
  };
  const c = configs[data.status];
  const html = await marcoCorreo({
    preheader: c.asunto,
    encabezado: { sello: c.sello, titulo: c.titulo, texto: c.texto },
    cuerpo: `${c.nota}${botonCorreo(c.cta.url, c.cta.texto)}`,
    chispa: c.chispa,
  });
  return sendEmail({ to: email, subject: c.asunto, html });
}
