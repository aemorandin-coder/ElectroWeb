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
        border-radius: 12px;
        overflow: hidden;
      }
      .email-header {
        background: linear-gradient(135deg, ${primaryColor} 0%, #1e4ba3 100%);
        padding: 25px 30px;
        text-align: center;
      }
      .email-header h1 {
        color: #ffffff;
        margin: 0;
        font-size: 24px;
        font-weight: 800;
      }
      .email-header p {
        color: rgba(255,255,255,0.9);
        margin: 6px 0 0;
        font-size: 13px;
      }
      .email-body {
        padding: 40px 30px;
        color: #333333;
        line-height: 1.6;
      }
      .email-footer {
        background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
        padding: 30px;
        text-align: center;
        color: #6c757d;
        font-size: 14px;
      }
      .email-footer img.logo {
        max-height: 50px;
        max-width: 160px;
        border-radius: 8px;
        margin-bottom: 15px;
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
        margin: 15px 0;
      }
      .social-link {
        display: inline-block;
        margin: 0 5px;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        text-decoration: none;
        line-height: 32px;
        color: white;
        font-size: 12px;
        font-weight: bold;
      }
    </style>
  `;
}

// Header with TEXT ONLY (no images that might not load)
export function getEmailHeader({ companyName }: EmailTemplateProps) {
  return `
    <div class="email-header">
      <h1>${companyName.toUpperCase()}</h1>
      <p>Tu tienda de tecnología de confianza</p>
    </div>
  `;
}

// Footer with logo at bottom and social links
export function getEmailFooter({ companyName, companyLogo }: EmailTemplateProps) {
  return `
    <div class="email-footer">
      ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" class="logo" onerror="this.style.display='none'" />` : ''}
      <div class="social-links">
        <a href="#" class="social-link" style="background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);">IG</a>
        <a href="#" class="social-link" style="background:#1877f2;">FB</a>
        <a href="#" class="social-link" style="background:#25D366;">WA</a>
      </div>
      <p><strong>${companyName}</strong></p>
      <p style="font-size: 12px;">Este es un correo automático, por favor no responder.</p>
      <p style="font-size: 11px; color: #adb5bd; margin-top: 15px;">
        © ${new Date().getFullYear()} ${companyName}. Todos los derechos reservados.
      </p>
    </div>
  `;
}

