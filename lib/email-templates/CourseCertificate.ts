import { sendEmail, getBaseTemplate } from '@/lib/email-service';

export async function sendCourseEnrollmentEmail(
  email: string,
  data: { studentName: string; courseTitle: string; instructorName: string; courseSlug: string }
) {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || '';
  const content = `
    <div style="text-align:center;margin-bottom:30px;">
      <div style="width:70px;height:70px;background:linear-gradient(135deg,#2a63cd 0%,#06b6d4 100%);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-size:30px;">📚</span>
      </div>
      <h2 style="margin:0 0 6px;color:#212529;font-size:22px;font-weight:700;">¡Inscripción Exitosa!</h2>
      <p style="color:#6a6c6b;font-size:15px;margin:0;">Ya puedes empezar a aprender</p>
    </div>
    <p style="color:#6a6c6b;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hola <strong style="color:#212529;">${data.studentName}</strong>,<br><br>
      Te has inscrito exitosamente en el curso:
    </p>
    <div style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border-radius:14px;padding:22px;margin:20px 0;border-left:4px solid #2a63cd;text-align:center;">
      <p style="margin:0 0 6px;color:#1e40af;font-size:18px;font-weight:700;">${data.courseTitle}</p>
      <p style="margin:0;color:#6a6c6b;font-size:13px;">Instructor: ${data.instructorName}</p>
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${appUrl}/cursos/${data.courseSlug}/aprender" style="display:inline-block;background:linear-gradient(135deg,#2a63cd 0%,#1e4ba3 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;">
        Comenzar Ahora →
      </a>
    </div>`;

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
  const certUrl = `${appUrl}/certificado/${data.certificateId}`;
  const dateStr = data.completedAt.toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });

  const content = `
    <div style="text-align:center;margin-bottom:30px;">
      <div style="width:80px;height:80px;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(245,158,11,0.3);">
        <span style="color:white;font-size:36px;">🏆</span>
      </div>
      <h2 style="margin:0 0 6px;color:#212529;font-size:22px;font-weight:700;">¡Felicitaciones, ${data.studentName}!</h2>
      <p style="color:#6a6c6b;font-size:15px;margin:0;">Has completado el curso exitosamente</p>
    </div>

    <div style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:14px;padding:22px;margin:20px 0;text-align:center;border:1px solid #f59e0b;">
      <p style="margin:0 0 6px;color:#92400e;font-size:18px;font-weight:700;">${data.courseTitle}</p>
      <p style="margin:0;color:#78350f;font-size:13px;">Instructor: ${data.instructorName} · Completado el ${dateStr}</p>
    </div>

    <div style="background:#f8f9fa;border-radius:14px;padding:20px;margin:20px 0;text-align:center;border:1px solid #e9ecef;">
      <p style="margin:0 0 8px;color:#6a6c6b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">ID de Verificación</p>
      <p style="margin:0;color:#212529;font-size:13px;font-family:monospace;font-weight:700;word-break:break-all;">${data.certificateId}</p>
    </div>

    <p style="color:#6a6c6b;font-size:14px;text-align:center;line-height:1.6;margin:15px 0;">
      Tu certificado puede verificarse públicamente en nuestra página web.<br>
      Cualquier persona puede confirmar su autenticidad con el enlace de abajo.
    </p>

    <div style="text-align:center;margin:30px 0;">
      <a href="${certUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;box-shadow:0 8px 20px rgba(245,158,11,0.3);">
        Ver mi Certificado 🏆
      </a>
    </div>
    <p style="color:#adb5bd;font-size:12px;text-align:center;">
      También puedes compartir este enlace: <a href="${certUrl}" style="color:#2a63cd;">${certUrl}</a>
    </p>`;

  return sendEmail({
    to: email,
    subject: `🏆 ¡Certificado de "${data.courseTitle}" obtenido!`,
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
      emoji: '🎉',
      title: '¡Solicitud de Creador Aprobada!',
      body: `Tu solicitud para ser creador de contenido en ElectroShop ha sido <strong style="color:#059669;">aprobada</strong>. Ya puedes acceder a tu panel de creador, crear cursos y comenzar a monetizar tu conocimiento.`,
      cta: { text: 'Ir a mi Panel de Creador', url: `${appUrl}/creator/dashboard` },
      color: '#059669',
      bgColor: '#ecfdf5',
      borderColor: '#34d399',
      preheader: '¡Tu solicitud fue aprobada! Bienvenido al equipo de creadores.',
    },
    REJECTED: {
      emoji: '😔',
      title: 'Solicitud de Creador No Aprobada',
      body: `Hemos revisado tu solicitud y lamentablemente no podemos aprobarte como creador en este momento. Si tienes preguntas, contáctanos.`,
      cta: { text: 'Contactar Soporte', url: `${appUrl}/contacto` },
      color: '#dc2626',
      bgColor: '#fef2f2',
      borderColor: '#f87171',
      preheader: 'Tu solicitud de creador ha sido revisada.',
    },
    SUSPENDED: {
      emoji: '⏸',
      title: 'Cuenta de Creador Suspendida',
      body: `Tu cuenta de creador ha sido suspendida temporalmente. Para más información contáctanos.`,
      cta: { text: 'Contactar Soporte', url: `${appUrl}/contacto` },
      color: '#d97706',
      bgColor: '#fffbeb',
      borderColor: '#fbbf24',
      preheader: 'Tu cuenta de creador ha sido suspendida.',
    },
  };

  const cfg = configs[data.status];

  const content = `
    <div style="text-align:center;margin-bottom:25px;">
      <div style="font-size:50px;margin-bottom:15px;">${cfg.emoji}</div>
      <h2 style="margin:0;color:#212529;font-size:22px;font-weight:700;">${cfg.title}</h2>
    </div>
    <p style="color:#6a6c6b;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hola <strong style="color:#212529;">${data.creatorName}</strong>,<br><br>
      ${cfg.body}
    </p>
    ${data.notes ? `
    <div style="background:${cfg.bgColor};border-radius:12px;padding:16px;margin:20px 0;border-left:4px solid ${cfg.borderColor};">
      <p style="margin:0 0 6px;color:#374151;font-size:13px;font-weight:600;">Mensaje del equipo:</p>
      <p style="margin:0;color:#6a6c6b;font-size:13px;line-height:1.6;">${data.notes}</p>
    </div>
    ` : ''}
    <div style="text-align:center;margin:30px 0;">
      <a href="${cfg.cta.url}" style="display:inline-block;background:${cfg.color};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;">
        ${cfg.cta.text}
      </a>
    </div>`;

  return sendEmail({
    to: email,
    subject: `${cfg.emoji} ${cfg.title} - ElectroShop`,
    html: await getBaseTemplate(content, cfg.preheader),
  });
}
