import { sendEmail, getBaseTemplate } from '@/lib/email-service';
import { escapeHtml } from '@/lib/html';
import { CORREO, botonCorreo, selloCorreo } from './estilo';

export async function sendCourseEnrollmentEmail(
  email: string,
  data: { studentName: string; courseTitle: string; instructorName: string; courseSlug: string }
) {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || '';
  const content = `
    <h2 style="${CORREO.titulo}">Inscripción confirmada</h2>
    <p style="${CORREO.subtitulo}">Ya puedes empezar a aprender</p>
    <p style="${CORREO.texto}">Hola <strong style="${CORREO.fuerte}">${escapeHtml(data.studentName)}</strong>,</p>
    <p style="${CORREO.texto}">Te inscribiste en el curso:</p>
    <div style="${CORREO.cajaInfo}text-align:center;">
      <p style="${CORREO.cajaTitulo}${CORREO.tonoInfo}font-size:18px;">${escapeHtml(data.courseTitle)}</p>
      <p style="${CORREO.cajaTexto}${CORREO.tonoNeutro}">Instructor: ${escapeHtml(data.instructorName)}</p>
    </div>
    ${botonCorreo(`${appUrl}/cursos/${encodeURIComponent(data.courseSlug)}/aprender`, 'Comenzar ahora')}`;

  return sendEmail({
    to: email,
    subject: `¡Inscrito en "${data.courseTitle}"! - ElectroShop`,
    html: await getBaseTemplate(content, `Comienza tu curso: ${data.courseTitle}`),
  });
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
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || '';
  const certUrl = `${appUrl}/certificado/${encodeURIComponent(data.certificateId)}`;
  const dateStr = data.completedAt.toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });

  const content = `
    <div style="text-align:center;">
      ${selloCorreo('exito')}
      <h2 style="${CORREO.titulo}">¡Felicitaciones, ${escapeHtml(data.studentName)}!</h2>
      <p style="${CORREO.subtitulo}">Completaste el curso</p>
    </div>

    <div style="${CORREO.cajaAviso}text-align:center;">
      <p style="${CORREO.cajaTitulo}${CORREO.tonoAviso}font-size:18px;">${escapeHtml(data.courseTitle)}</p>
      <p style="${CORREO.cajaTexto}${CORREO.tonoAviso}">Instructor: ${escapeHtml(data.instructorName)} · Completado el ${dateStr}</p>
    </div>

    <div style="${CORREO.caja}text-align:center;">
      <p style="${CORREO.rotulo}">ID de verificación</p>
      <p style="${CORREO.dato}font-size:14px;letter-spacing:0;font-family:'Courier New',Courier,monospace;">${escapeHtml(data.certificateId)}</p>
    </div>

    <p style="${CORREO.textoMenor}text-align:center;">
      Tu certificado se puede verificar en nuestra página web: cualquier persona puede confirmar que es auténtico con el enlace de abajo.
    </p>

    ${botonCorreo(certUrl, 'Ver mi certificado')}
    <p style="${CORREO.nota}text-align:center;">
      También puedes compartir este enlace: <a href="${certUrl}" style="${CORREO.enlace}">${certUrl}</a>
    </p>`;

  return sendEmail({
    to: email,
    subject: `¡Certificado de "${data.courseTitle}" obtenido!`,
    html: await getBaseTemplate(content, `¡Completaste el curso: ${data.courseTitle}!`),
  });
}

export async function sendCreatorStatusEmail(
  email: string,
  data: { creatorName: string; status: 'APPROVED' | 'REJECTED' | 'SUSPENDED'; notes?: string }
) {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || '';

  const configs = {
    APPROVED: {
      title: 'Solicitud de creador aprobada',
      body: `Tu solicitud para ser creador de contenido en ElectroShop fue <strong style="${CORREO.tonoExito}">aprobada</strong>. Ya puedes entrar a tu panel de creador, crear cursos y empezar a ganar con lo que sabes.`,
      cta: { text: 'Ir a mi panel de creador', url: `${appUrl}/creator/dashboard` },
      caja: CORREO.cajaExito,
      tono: CORREO.tonoExito,
      preheader: 'Tu solicitud fue aprobada. Bienvenido al equipo de creadores.',
    },
    REJECTED: {
      title: 'Solicitud de creador no aprobada',
      body: `Revisamos tu solicitud y por ahora no podemos aprobarte como creador. Si tienes preguntas, contáctanos.`,
      cta: { text: 'Contactar a soporte', url: `${appUrl}/contacto` },
      caja: CORREO.cajaPeligro,
      tono: CORREO.tonoPeligro,
      preheader: 'Revisamos tu solicitud de creador.',
    },
    SUSPENDED: {
      title: 'Cuenta de creador suspendida',
      body: `Tu cuenta de creador fue suspendida temporalmente. Para más información, contáctanos.`,
      cta: { text: 'Contactar a soporte', url: `${appUrl}/contacto` },
      caja: CORREO.cajaAviso,
      tono: CORREO.tonoAviso,
      preheader: 'Tu cuenta de creador fue suspendida.',
    },
  };

  const cfg = configs[data.status];

  const content = `
    <h2 style="${CORREO.titulo}">${cfg.title}</h2>
    <p style="${CORREO.texto}">Hola <strong style="${CORREO.fuerte}">${escapeHtml(data.creatorName)}</strong>,</p>
    <p style="${CORREO.texto}">${cfg.body}</p>
    ${data.notes ? `
    <div style="${cfg.caja}">
      <p style="${CORREO.cajaTitulo}${cfg.tono}">Mensaje del equipo</p>
      <p style="${CORREO.cajaTexto}${cfg.tono}">${escapeHtml(data.notes).replace(/\n/g, '<br>')}</p>
    </div>
    ` : ''}
    ${botonCorreo(cfg.cta.url, cfg.cta.text)}`;

  return sendEmail({
    to: email,
    subject: `${cfg.title} - ElectroShop`,
    html: await getBaseTemplate(content, cfg.preheader),
  });
}
