import nodemailer from 'nodemailer';

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendEmail = async ({ to, subject, html }: SendEmailOptions) => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.warn('SMTP credentials not configured. Email would have been sent to:', to);
        console.log('Subject:', subject);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME || 'ElectroShop'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
    const resetUrl = `${process.env.NEXTAUTH_URL}/recuperar-contrasena/${token}`;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9ecef; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #2a63cd; margin: 0;">ElectroShop</h1>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #212529; margin-top: 0;">Recuperación de Contraseña</h2>
        <p style="color: #6a6c6b; line-height: 1.5;">
          Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en ElectroShop.
          Si no has sido tú, puedes ignorar este correo.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2a63cd; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Restablecer Contraseña
          </a>
        </div>
        
        <p style="color: #6a6c6b; font-size: 12px; margin-top: 20px;">
          O copia y pega el siguiente enlace en tu navegador:<br>
          <a href="${resetUrl}" style="color: #2a63cd;">${resetUrl}</a>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #adb5bd; font-size: 12px;">
        &copy; ${new Date().getFullYear()} ElectroShop. Todos los derechos reservados.
      </div>
    </div>
  `;

    await sendEmail({
        to: email,
        subject: 'Recuperación de Contraseña - ElectroShop',
        html,
    });
};
