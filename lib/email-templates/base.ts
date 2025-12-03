interface EmailTemplateProps {
    companyName: string;
    companyLogo?: string;
    primaryColor?: string;
}

export function getEmailStyles(primaryColor = '#2a63cd') {
    return `
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background-color: #f5f5f5;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
      }
      .email-header {
        background: linear-gradient(135deg, ${primaryColor} 0%, #1e4ba3 100%);
        padding: 40px 20px;
        text-align: center;
      }
      .email-logo {
        max-width: 150px;
        height: auto;
      }
      .email-body {
        padding: 40px 30px;
        color: #333333;
        line-height: 1.6;
      }
      .email-footer {
        background-color: #f8f9fa;
        padding: 30px;
        text-align: center;
        color: #6c757d;
        font-size: 14px;
      }
      .button {
        display: inline-block;
        padding: 14px 32px;
        background: linear-gradient(135deg, ${primaryColor} 0%, #1e4ba3 100%);
        color: #ffffff !important;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        margin: 20px 0;
      }
      .order-details {
        background-color: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }
      .order-item {
        border-bottom: 1px solid #e9ecef;
        padding: 15px 0;
      }
      .order-item:last-child {
        border-bottom: none;
      }
      .total-row {
        font-weight: 600;
        font-size: 18px;
        color: ${primaryColor};
        margin-top: 15px;
        padding-top: 15px;
        border-top: 2px solid ${primaryColor};
      }
      h1 {
        color: #ffffff;
        margin: 0;
        font-size: 28px;
      }
      h2 {
        color: #212529;
        margin-top: 0;
      }
      .social-links {
        margin: 20px 0;
      }
      .social-links a {
        display: inline-block;
        margin: 0 10px;
        color: #6c757d;
        text-decoration: none;
      }
    </style>
  `;
}

export function getEmailHeader({ companyName, companyLogo, primaryColor }: EmailTemplateProps) {
    return `
    <div class="email-header">
      ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" class="email-logo" />` : `<h1>${companyName}</h1>`}
    </div>
  `;
}

export function getEmailFooter({ companyName }: EmailTemplateProps) {
    return `
    <div class="email-footer">
      <p><strong>${companyName}</strong></p>
      <p>Este es un correo automático, por favor no responder.</p>
      <div class="social-links">
        <a href="#">Facebook</a> | 
        <a href="#">Instagram</a> | 
        <a href="#">WhatsApp</a>
      </div>
      <p style="font-size: 12px; color: #adb5bd; margin-top: 20px;">
        © ${new Date().getFullYear()} ${companyName}. Todos los derechos reservados.
      </p>
    </div>
  `;
}
