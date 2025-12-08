import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Template types available for preview
const EMAIL_TEMPLATES = [
    { id: 'welcome', name: 'Bienvenida', description: 'Email de bienvenida al registrarse' },
    { id: 'verification', name: 'Verificacion de Email', description: 'Verificar cuenta nueva' },
    { id: 'password_reset', name: 'Recuperar Contrasena', description: 'Enlace para restablecer contrasena' },
    { id: 'order_confirmation', name: 'Confirmacion de Pedido', description: 'Nuevo pedido creado' },
    { id: 'order_shipped', name: 'Pedido Enviado', description: 'Notificacion de envio' },
    { id: 'order_delivered', name: 'Pedido Entregado', description: 'Confirmacion de entrega' },
    { id: 'marketing', name: 'Campana de Marketing', description: 'Email promocional' },
    { id: 'notification', name: 'Notificacion General', description: 'Avisos del sistema' },
    { id: 'test', name: 'Email de Prueba', description: 'Verificar configuracion' },
];

// Generate email HTML with company settings
const generateEmailHtml = async (templateId: string, settings: any) => {
    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const year = 2024;

    const companyName = settings?.companyName || 'Electro Shop';
    const tagline = settings?.tagline || 'Tu tienda de tecnologia de confianza';
    const logo = settings?.logo || '';
    const primaryColor = settings?.primaryColor || '#2a63cd';
    const secondaryColor = settings?.secondaryColor || '#1e4ba3';
    const phone = settings?.phone || '';
    const whatsapp = settings?.whatsapp || '';
    const email = settings?.email || '';
    const address = settings?.address || '';
    const instagram = settings?.instagram || '';
    const facebook = settings?.facebook || '';

    // Base template with company branding
    const getTemplate = (content: string, preheader: string = '') => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${companyName}</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden;">${preheader}</span>` : ''}
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          
          <!-- HEADER PREMIUM -->
          <tr>
            <td style="background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);padding:40px;border-radius:20px 20px 0 0;text-align:center;">
              ${logo ? `
              <div style="margin-bottom:20px;">
                <img src="${logo}" alt="${companyName}" style="max-height:60px;max-width:200px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.2);">
              </div>
              ` : `
              <div style="width:70px;height:70px;background:rgba(255,255,255,0.2);border-radius:16px;margin:0 auto 15px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.3);">
                <span style="font-size:32px;font-weight:bold;color:white;">${companyName.charAt(0)}</span>
              </div>
              `}
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;text-shadow:0 2px 4px rgba(0,0,0,0.1);">${companyName.toUpperCase()}</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;font-weight:500;">${tagline}</p>
              <div style="margin-top:15px;height:2px;width:60px;background:rgba(255,255,255,0.4);margin-left:auto;margin-right:auto;border-radius:1px;"></div>
            </td>
          </tr>
          
          <!-- CONTENT -->
          <tr>
            <td style="background-color:#ffffff;padding:45px 40px;border-left:1px solid #e9ecef;border-right:1px solid #e9ecef;">
              ${content}
            </td>
          </tr>
          
          <!-- FOOTER -->
          <tr>
            <td style="background:linear-gradient(180deg,#f8f9fa 0%,#e9ecef 100%);padding:35px 40px;border-radius:0 0 20px 20px;border:1px solid #e9ecef;border-top:none;">
              
              <!-- Social Links -->
              <div style="text-align:center;margin-bottom:20px;">
                ${instagram ? `<a href="${instagram}" style="display:inline-block;margin:0 6px;width:36px;height:36px;background:${primaryColor};border-radius:8px;text-decoration:none;line-height:36px;"><img src="https://cdn-icons-png.flaticon.com/32/174/174855.png" alt="Instagram" style="width:18px;height:18px;margin-top:9px;filter:brightness(0) invert(1);"></a>` : ''}
                ${facebook ? `<a href="${facebook}" style="display:inline-block;margin:0 6px;width:36px;height:36px;background:${primaryColor};border-radius:8px;text-decoration:none;line-height:36px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" alt="Facebook" style="width:18px;height:18px;margin-top:9px;filter:brightness(0) invert(1);"></a>` : ''}
                ${whatsapp ? `<a href="https://wa.me/${whatsapp}" style="display:inline-block;margin:0 6px;width:36px;height:36px;background:#25D366;border-radius:8px;text-decoration:none;line-height:36px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733585.png" alt="WhatsApp" style="width:18px;height:18px;margin-top:9px;filter:brightness(0) invert(1);"></a>` : ''}
              </div>
              
              <!-- Contact Info -->
              <div style="text-align:center;margin-bottom:15px;">
                ${phone ? `<p style="margin:4px 0;color:#6a6c6b;font-size:12px;">Tel: ${phone}</p>` : ''}
                ${email ? `<p style="margin:4px 0;color:#6a6c6b;font-size:12px;">Email: ${email}</p>` : ''}
                ${address ? `<p style="margin:4px 0;color:#6a6c6b;font-size:12px;">${address}</p>` : ''}
              </div>
              
              <!-- Copyright -->
              <p style="margin:0;text-align:center;color:#adb5bd;font-size:11px;">
                &copy; ${year} ${companyName}. Todos los derechos reservados.
              </p>
              <p style="margin:8px 0 0;text-align:center;">
                <a href="${appUrl}/contacto" style="color:${primaryColor};font-size:11px;text-decoration:none;font-weight:500;">Contacto</a>
                <span style="color:#adb5bd;margin:0 8px;">|</span>
                <a href="${appUrl}/terminos" style="color:${primaryColor};font-size:11px;text-decoration:none;font-weight:500;">Terminos</a>
                <span style="color:#adb5bd;margin:0 8px;">|</span>
                <a href="${appUrl}/privacidad" style="color:${primaryColor};font-size:11px;text-decoration:none;font-weight:500;">Privacidad</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Generate content based on template type
    const templates: Record<string, { content: string; preheader: string }> = {
        welcome: {
            preheader: `Bienvenido a ${companyName}`,
            content: `
                <div style="text-align:center;margin-bottom:30px;">
                    <div style="width:80px;height:80px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 25px rgba(16,185,129,0.3);">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <h2 style="margin:0 0 10px;color:#212529;font-size:26px;font-weight:700;">Bienvenido a ${companyName}</h2>
                    <p style="color:#6a6c6b;font-size:16px;margin:0;">Tu cuenta ha sido creada exitosamente</p>
                </div>
                <p style="color:#6a6c6b;font-size:15px;line-height:1.7;margin:0 0 25px;">
                    Hola <strong style="color:#212529;">{{nombre}}</strong>,<br><br>
                    Gracias por unirte a nuestra comunidad. Ahora tienes acceso a:<br>
                </p>
                <ul style="color:#6a6c6b;font-size:14px;line-height:2;margin:0 0 30px;padding-left:20px;">
                    <li>Los mejores productos de tecnologia</li>
                    <li>Ofertas exclusivas para miembros</li>
                    <li>Seguimiento de tus pedidos en tiempo real</li>
                    <li>Soporte tecnico personalizado</li>
                </ul>
                <div style="text-align:center;">
                    <a href="${appUrl}/productos" style="display:inline-block;background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 4px 15px rgba(42,99,205,0.3);">
                        Explorar Productos
                    </a>
                </div>
            `,
        },
        verification: {
            preheader: 'Activa tu cuenta para comenzar',
            content: `
                <div style="text-align:center;margin-bottom:30px;">
                    <div style="width:80px;height:80px;background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 25px rgba(42,99,205,0.3);">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    </div>
                    <h2 style="margin:0 0 10px;color:#212529;font-size:26px;font-weight:700;">Verifica tu email</h2>
                </div>
                <p style="color:#6a6c6b;font-size:15px;line-height:1.7;margin:0 0 25px;">
                    Hola <strong style="color:#212529;">{{nombre}}</strong>,<br><br>
                    Gracias por registrarte en ${companyName}. Para activar tu cuenta y poder realizar compras, verifica tu correo electronico haciendo clic en el boton:
                </p>
                <div style="text-align:center;margin:35px 0;">
                    <a href="${appUrl}/verificar-email/{{token}}" style="display:inline-block;background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 4px 15px rgba(42,99,205,0.3);">
                        Verificar mi cuenta
                    </a>
                </div>
                <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:25px 0;border-left:4px solid ${primaryColor};">
                    <p style="margin:0;color:#6a6c6b;font-size:13px;">
                        <strong>Nota:</strong> Este enlace expirara en 24 horas. Si no solicitaste esta verificacion, puedes ignorar este mensaje.
                    </p>
                </div>
            `,
        },
        password_reset: {
            preheader: 'Solicitud de restablecimiento de contrasena',
            content: `
                <div style="text-align:center;margin-bottom:30px;">
                    <div style="width:80px;height:80px;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 25px rgba(245,158,11,0.3);">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                    <h2 style="margin:0 0 10px;color:#212529;font-size:26px;font-weight:700;">Restablecer Contrasena</h2>
                </div>
                <p style="color:#6a6c6b;font-size:15px;line-height:1.7;margin:0 0 25px;">
                    Hola <strong style="color:#212529;">{{nombre}}</strong>,<br><br>
                    Recibimos una solicitud para restablecer la contrasena de tu cuenta. Haz clic en el boton para crear una nueva:
                </p>
                <div style="text-align:center;margin:35px 0;">
                    <a href="${appUrl}/recuperar-contrasena/{{token}}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 4px 15px rgba(245,158,11,0.3);">
                        Restablecer Contrasena
                    </a>
                </div>
                <div style="background:#fef3c7;border-radius:12px;padding:20px;margin:25px 0;border-left:4px solid #f59e0b;">
                    <p style="margin:0;color:#92400e;font-size:13px;">
                        <strong>Importante:</strong> Este enlace expirara en 1 hora. Si no solicitaste este cambio, ignora este mensaje y tu contrasena permanecera igual.
                    </p>
                </div>
            `,
        },
        order_confirmation: {
            preheader: 'Tu pedido ha sido recibido',
            content: `
                <div style="text-align:center;margin-bottom:30px;">
                    <div style="width:80px;height:80px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 25px rgba(16,185,129,0.3);">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    </div>
                    <h2 style="margin:0 0 10px;color:#212529;font-size:26px;font-weight:700;">Pedido Confirmado</h2>
                    <p style="color:${primaryColor};font-size:18px;font-weight:600;margin:0;">Orden #{{orderNumber}}</p>
                </div>
                <div style="background:linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%);border-radius:16px;padding:25px;margin:25px 0;border:1px solid #e9ecef;">
                    <table width="100%" style="border-collapse:collapse;">
                        <tr><td style="padding:8px 0;color:#6a6c6b;font-size:14px;">Producto ejemplo x2</td><td style="text-align:right;color:#212529;font-weight:600;">$99.99</td></tr>
                        <tr><td style="padding:8px 0;color:#6a6c6b;font-size:14px;">Envio</td><td style="text-align:right;color:#212529;font-weight:600;">$5.00</td></tr>
                        <tr style="border-top:2px solid #e9ecef;"><td style="padding:15px 0 0;color:#212529;font-size:16px;font-weight:700;">Total</td><td style="text-align:right;color:${primaryColor};font-size:20px;font-weight:700;padding-top:15px;">$104.99</td></tr>
                    </table>
                </div>
                <div style="text-align:center;">
                    <a href="${appUrl}/customer/orders" style="display:inline-block;background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 4px 15px rgba(42,99,205,0.3);">
                        Ver mi Pedido
                    </a>
                </div>
            `,
        },
        order_shipped: {
            preheader: 'Tu pedido esta en camino',
            content: `
                <div style="text-align:center;margin-bottom:30px;">
                    <div style="width:80px;height:80px;background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 25px rgba(59,130,246,0.3);">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                    </div>
                    <h2 style="margin:0 0 10px;color:#212529;font-size:26px;font-weight:700;">Pedido Enviado</h2>
                    <p style="color:${primaryColor};font-size:18px;font-weight:600;margin:0;">Orden #{{orderNumber}}</p>
                </div>
                <p style="color:#6a6c6b;font-size:15px;line-height:1.7;margin:0 0 25px;text-align:center;">
                    Tu pedido ha sido enviado y esta en camino. Puedes rastrear tu envio con el siguiente numero de guia:
                </p>
                <div style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border-radius:12px;padding:20px;margin:25px 0;text-align:center;border:1px solid #3b82f6;">
                    <p style="margin:0 0 5px;color:#6a6c6b;font-size:13px;">Numero de Guia</p>
                    <p style="margin:0;color:#1d4ed8;font-size:22px;font-weight:700;letter-spacing:2px;">{{trackingNumber}}</p>
                </div>
                <div style="text-align:center;">
                    <a href="${appUrl}/customer/orders" style="display:inline-block;background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 4px 15px rgba(42,99,205,0.3);">
                        Seguir mi Pedido
                    </a>
                </div>
            `,
        },
        order_delivered: {
            preheader: 'Tu pedido ha sido entregado',
            content: `
                <div style="text-align:center;margin-bottom:30px;">
                    <div style="width:80px;height:80px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 25px rgba(16,185,129,0.3);">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <h2 style="margin:0 0 10px;color:#212529;font-size:26px;font-weight:700;">Pedido Entregado</h2>
                    <p style="color:#10b981;font-size:16px;font-weight:600;margin:0;">Tu pedido ha llegado a su destino</p>
                </div>
                <p style="color:#6a6c6b;font-size:15px;line-height:1.7;margin:0 0 25px;text-align:center;">
                    Esperamos que disfrutes tu compra. Si tienes alguna pregunta o comentario, estamos aqui para ayudarte.
                </p>
                <div style="background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border-radius:12px;padding:25px;margin:25px 0;text-align:center;border:1px solid #10b981;">
                    <p style="margin:0 0 10px;color:#065f46;font-size:14px;">Tu opinion es muy importante para nosotros</p>
                    <a href="${appUrl}/productos" style="color:#059669;font-weight:600;text-decoration:none;">Dejanos una reseña</a>
                </div>
                <div style="text-align:center;">
                    <a href="${appUrl}/productos" style="display:inline-block;background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 4px 15px rgba(42,99,205,0.3);">
                        Seguir Comprando
                    </a>
                </div>
            `,
        },
        marketing: {
            preheader: 'Ofertas exclusivas para ti',
            content: `
                <div style="text-align:center;margin-bottom:30px;">
                    <h2 style="margin:0 0 10px;color:#212529;font-size:28px;font-weight:800;">OFERTAS ESPECIALES</h2>
                    <p style="color:${primaryColor};font-size:18px;font-weight:600;margin:0;">Hasta 50% de descuento</p>
                </div>
                <div style="background:linear-gradient(135deg,${primaryColor}10 0%,${secondaryColor}10 100%);border-radius:16px;padding:30px;margin:25px 0;text-align:center;border:2px dashed ${primaryColor};">
                    <p style="margin:0 0 15px;color:#212529;font-size:16px;font-weight:600;">Usa el codigo:</p>
                    <p style="margin:0;color:${primaryColor};font-size:32px;font-weight:800;letter-spacing:4px;">PROMO2024</p>
                </div>
                <p style="color:#6a6c6b;font-size:15px;line-height:1.7;margin:0 0 25px;text-align:center;">
                    Aprovecha estas ofertas por tiempo limitado. Stock disponible hasta agotar existencias.
                </p>
                <div style="text-align:center;">
                    <a href="${appUrl}/productos" style="display:inline-block;background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);color:#ffffff;text-decoration:none;padding:16px 50px;border-radius:10px;font-weight:600;font-size:16px;box-shadow:0 4px 15px rgba(42,99,205,0.3);">
                        VER OFERTAS
                    </a>
                </div>
            `,
        },
        notification: {
            preheader: 'Tienes una nueva notificacion',
            content: `
                <div style="text-align:center;margin-bottom:30px;">
                    <div style="width:80px;height:80px;background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 25px rgba(42,99,205,0.3);">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    </div>
                    <h2 style="margin:0 0 10px;color:#212529;font-size:26px;font-weight:700;">Nueva Notificacion</h2>
                </div>
                <div style="background:#f8f9fa;border-radius:12px;padding:25px;margin:25px 0;border-left:4px solid ${primaryColor};">
                    <p style="margin:0;color:#212529;font-size:15px;line-height:1.7;">
                        Este es un ejemplo de notificacion del sistema. Aqui iria el mensaje personalizado que deseas comunicar al usuario.
                    </p>
                </div>
                <div style="text-align:center;">
                    <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 4px 15px rgba(42,99,205,0.3);">
                        Ver Detalles
                    </a>
                </div>
            `,
        },
        test: {
            preheader: 'Configuracion de email verificada',
            content: `
                <div style="text-align:center;margin-bottom:30px;">
                    <div style="width:80px;height:80px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 25px rgba(16,185,129,0.3);">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <h2 style="margin:0 0 10px;color:#212529;font-size:26px;font-weight:700;">Email de Prueba Exitoso</h2>
                    <p style="color:#10b981;font-size:16px;font-weight:600;margin:0;">La configuracion funciona correctamente</p>
                </div>
                <div style="background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border-radius:12px;padding:25px;margin:25px 0;border:1px solid #10b981;">
                    <table width="100%" style="border-collapse:collapse;">
                        <tr><td style="padding:8px 0;color:#6a6c6b;font-size:14px;">Proveedor</td><td style="text-align:right;color:#212529;font-weight:600;">Resend API</td></tr>
                        <tr><td style="padding:8px 0;color:#6a6c6b;font-size:14px;">Fecha</td><td style="text-align:right;color:#212529;font-weight:600;">${new Date().toLocaleDateString('es-VE')}</td></tr>
                        <tr><td style="padding:8px 0;color:#6a6c6b;font-size:14px;">Estado</td><td style="text-align:right;color:#10b981;font-weight:600;">Verificado</td></tr>
                    </table>
                </div>
                <p style="color:#6a6c6b;font-size:14px;text-align:center;margin:0;">
                    Este correo confirma que tu configuracion de email esta funcionando correctamente.
                </p>
            `,
        },
    };

    const template = templates[templateId] || templates.test;
    return getTemplate(template.content, template.preheader);
};

// GET - List templates or get preview
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const templateId = searchParams.get('template');

        // Get company settings
        const settings = await prisma.companySettings.findFirst();

        if (templateId) {
            // Return HTML preview for specific template
            const html = await generateEmailHtml(templateId, settings);
            return NextResponse.json({
                html,
                template: EMAIL_TEMPLATES.find(t => t.id === templateId)
            });
        }

        // Return list of templates
        return NextResponse.json({ templates: EMAIL_TEMPLATES });
    } catch (error) {
        console.error('Error in email preview:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
