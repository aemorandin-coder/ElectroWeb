import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { qrSvg } from '../lib/qr';

const ROOT = process.cwd();
const OUT_PDF = path.join(ROOT, 'docs', 'guias', 'Guia-Contadora-ElectroShop.pdf');
const CACHE_DIR = '/home/andruwxox/.cache/electroshop-trabajo/g76b';
const OUT_HTML = path.join(CACHE_DIR, 'index.html');
const OUT_PDF_CACHE = path.join(CACHE_DIR, 'Guia-Contadora-ElectroShop.pdf');

const URL_PLAY = 'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2';
const URL_APPSTORE = 'https://apps.apple.com/app/google-authenticator/id388497605';
const URL_LOGIN = 'https://electroshopve.com/admin/login';

function svgQr(texto: string, sizePx: number, label: string): string {
  const qr = qrSvg(texto);
  return `<svg viewBox="0 0 ${qr.tamano} ${qr.tamano}" width="${sizePx}" height="${sizePx}" role="img" aria-label="${label}" shape-rendering="crispEdges" style="display:block;border-radius:8px;border:1px solid #d4d4d4;background:#fff;">
    <rect width="${qr.tamano}" height="${qr.tamano}" fill="#ffffff"/>
    <path d="${qr.camino}" fill="#0f172a"/>
  </svg>`;
}

function logoBlancoDataUri(): string {
  const logoPath = path.join(ROOT, 'public', 'images', 'brand', 'logo-largo-blanco.png');
  const buf = fs.readFileSync(logoPath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

function htmlGuia(): string {
  const logoUri = logoBlancoDataUri();
  const qrPlay = svgQr(URL_PLAY, 64, 'Código QR Play Store Google Authenticator');
  const qrApp = svgQr(URL_APPSTORE, 64, 'Código QR App Store Google Authenticator');
  const qrLogin = svgQr(URL_LOGIN, 60, 'Código QR acceso a Electro Shop');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Guía práctica de Contabilidad — Electro Shop</title>
<style>
  @page {
    size: letter;
    margin: 0;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #e5e7eb;
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-size: 13px;
    line-height: 1.42;
  }
  .pagina {
    width: 8.5in;
    height: 11in;
    margin: 18px auto;
    background: #ffffff;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  }
  @media print {
    html, body { background: #ffffff; }
    .pagina {
      margin: 0;
      box-shadow: none;
      page-break-after: always;
      break-after: page;
    }
    .pagina:last-child {
      page-break-after: auto;
      break-after: auto;
    }
  }

  /* Cabeceras */
  .hero {
    background: #163e7a;
    color: #ffffff;
    padding: 15px 28px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .hero-logo { height: 30px; width: auto; display: block; margin-bottom: 4px; }
  .hero h1 {
    margin: 0;
    font-size: 20px;
    line-height: 1.18;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .hero p {
    margin: 2px 0 0;
    font-size: 12px;
    color: #dbeafe;
  }
  .badge-pag {
    background: rgba(255, 255, 255, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: #ffffff;
    border-radius: 999px;
    padding: 5px 12px;
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
  }
  .topbar {
    border-bottom: 2px solid #163e7a;
    padding: 13px 28px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f8fafc;
  }
  .topbar-titulo {
    font-size: 14px;
    font-weight: 700;
    color: #163e7a;
  }
  .topbar-pag {
    font-size: 11.5px;
    font-weight: 600;
    color: #475569;
  }

  .contenido {
    flex: 1;
    padding: 13px 28px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .intro {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 11px;
    padding: 9px 13px;
    color: #0f172a;
    font-size: 12.2px;
  }
  .intro strong { color: #163e7a; }

  .paso-card {
    border: 1px solid #d4d4d4;
    border-radius: 11px;
    padding: 10px 13px;
    background: #ffffff;
  }
  .paso-head {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 4px;
  }
  .num {
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: #163e7a;
    color: #ffffff;
    font-size: 11.5px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .paso-head h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
  }
  .sub {
    margin: 0;
    font-size: 11.8px;
    color: #475569;
  }

  /* Tarjeta app recomendada */
  .app-grid {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 12px;
    margin-top: 8px;
    align-items: center;
  }
  .app-destacada {
    border: 1.5px solid #2261bb;
    background: #f8fafc;
    border-radius: 10px;
    padding: 10px 12px;
  }
  .app-tag {
    display: inline-block;
    background: #163e7a;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    margin-bottom: 5px;
  }
  .app-nombre {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 3px;
  }
  .alt-apps {
    margin-top: 8px;
    padding-top: 7px;
    border-top: 1px solid #e5e7eb;
    font-size: 11.5px;
    color: #475569;
  }
  .qrs-tiendas {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .qr-box {
    border: 1px solid #d4d4d4;
    border-radius: 10px;
    padding: 8px;
    background: #ffffff;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }
  .qr-box strong { font-size: 11.5px; color: #0f172a; }
  .qr-link {
    font-size: 11px;
    font-weight: 600;
    color: #2261bb;
    text-decoration: none;
  }

  /* Teléfonos dibujados */
  .phones-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 7px;
  }
  .phone-step {
    border: 1px solid #e5e7eb;
    background: #f8fafc;
    border-radius: 10px;
    padding: 8px 10px;
    display: flex;
    align-items: center;
    gap: 11px;
  }
  .phone-frame {
    width: 100px;
    border: 3px solid #0f172a;
    border-radius: 15px;
    background: #ffffff;
    padding: 5px;
    flex-shrink: 0;
  }
  .phone-notch {
    width: 28px;
    height: 4px;
    border-radius: 99px;
    background: #0f172a;
    margin: 1px auto 4px;
  }
  .phone-hdr {
    font-size: 10.5px;
    font-weight: 700;
    color: #0f172a;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 3px;
    margin-bottom: 5px;
    text-align: center;
  }
  .phone-scan {
    border: 1.5px solid #2261bb;
    background: #eff6ff;
    color: #163e7a;
    border-radius: 7px;
    padding: 4px 4px;
    font-size: 10.5px;
    font-weight: 700;
    text-align: center;
    line-height: 1.2;
    margin-bottom: 5px;
  }
  .phone-plus {
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: #2261bb;
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: auto;
    box-shadow: 0 0 0 3px #dbeafe;
  }
  .phone-code-card {
    border: 1.5px solid #2261bb;
    background: #eff6ff;
    border-radius: 8px;
    padding: 7px 5px;
    text-align: center;
  }
  .phone-code-card span {
    display: block;
    font-size: 10.5px;
    font-weight: 600;
    color: #0f172a;
  }
  .phone-code-num {
    margin-top: 2px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13.5px;
    font-weight: 700;
    letter-spacing: 0.04em;
    white-space: nowrap;
    color: #163e7a;
  }

  .aviso-azul {
    margin-top: 8px;
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    border-radius: 10px;
    padding: 8px 11px;
    display: flex;
    align-items: flex-start;
    gap: 9px;
    font-size: 11.8px;
    color: #0f172a;
  }
  .placa-azul {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    background: #2261bb;
    color: #ffffff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .login-bar {
    margin-top: auto;
    border: 1.5px solid #163e7a;
    background: #f8fafc;
    border-radius: 12px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }
  .login-url {
    display: inline-block;
    margin: 3px 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12.5px;
    font-weight: 700;
    color: #163e7a;
  }

  /* Página 2 */
  .firma-banner {
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    border-radius: 12px;
    padding: 11px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .riel-tabs {
    border: 1px solid #d4d4d4;
    background: #ffffff;
    border-radius: 11px;
    padding: 4px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }
  .tab-pill {
    text-align: center;
    padding: 6px 8px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
  }
  .tab-pill.activa {
    background: #2261bb;
    color: #ffffff;
  }
  .grid-2x2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 11px;
  }
  .tab-card {
    border: 1px solid #d4d4d4;
    border-radius: 12px;
    padding: 11px 13px;
    background: #ffffff;
  }
  .tab-card-head {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 6px;
  }
  .icon-box {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #163e7a;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .tab-card h3 {
    margin: 0;
    font-size: 13.5px;
    font-weight: 700;
    color: #0f172a;
  }
  .tag-solo {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    color: #163e7a;
    background: #eff6ff;
    border-radius: 999px;
    padding: 1px 8px;
    margin-bottom: 5px;
  }
  .lista {
    margin: 0;
    padding-left: 16px;
    font-size: 12px;
    color: #334155;
  }
  .lista li { margin-bottom: 4px; }
  .excel-bar {
    border: 1px solid #d4d4d4;
    background: #ffffff;
    border-radius: 12px;
    padding: 11px 14px;
  }
  .excel-hojas {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    margin-top: 7px;
  }
  .excel-hoja {
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    border-radius: 8px;
    padding: 6px 8px;
    text-align: center;
    font-size: 11.5px;
    font-weight: 700;
    color: #163e7a;
  }
  .excel-hoja span {
    display: block;
    font-weight: 400;
    font-size: 11px;
    color: #475569;
    margin-top: 1px;
  }
  .no-toca {
    margin-top: auto;
    border: 1px solid #d4d4d4;
    background: #f8fafc;
    border-radius: 12px;
    padding: 12px 14px;
  }
  .no-toca h3 {
    margin: 0 0 6px;
    font-size: 13.5px;
    font-weight: 700;
    color: #0f172a;
  }

  /* Página 3 */
  .rutina-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 12px;
  }
  .rutina-item {
    border: 1px solid #d4d4d4;
    border-radius: 10px;
    padding: 8px 10px;
    display: flex;
    align-items: flex-start;
    gap: 9px;
    background: #ffffff;
  }
  .check-sq {
    width: 16px;
    height: 16px;
    border: 1.5px solid #94a3b8;
    border-radius: 4px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .fechas-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .fecha-card {
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    border-radius: 10px;
    padding: 8px 10px;
    text-align: center;
  }
  .fecha-dia {
    font-size: 15px;
    font-weight: 700;
    color: #163e7a;
  }
  .fecha-txt {
    font-size: 11.5px;
    color: #334155;
    margin-top: 2px;
  }

  table.seniat {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.6px;
    border: 1px solid #d4d4d4;
  }
  table.seniat th {
    background: #f1f5f9;
    color: #0f172a;
    text-align: left;
    padding: 6px 9px;
    border-bottom: 1px solid #d4d4d4;
    font-weight: 700;
  }
  table.seniat td {
    padding: 5.5px 9px;
    border-bottom: 1px solid #e5e7eb;
    color: #1e293b;
  }
  table.seniat tr:nth-child(even) td { background: #fafafa; }
  .cas {
    display: inline-block;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-weight: 700;
    color: #163e7a;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 5px;
    padding: 1px 6px;
  }
  .pie-pag {
    padding: 8px 30px 12px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #64748b;
  }
</style>
</head>
<body>

  <!-- PÁGINA 1: ENTRADA Y VERIFICACIÓN EN DOS PASOS -->
  <section class="pagina">
    <header class="hero">
      <div>
        <img src="${logoUri}" alt="Electro Shop" class="hero-logo" />
        <h1>Guía rápida para la Contadora</h1>
        <p>Cómo entrar con seguridad y qué puedes hacer cada mes en Contabilidad 2.0</p>
      </div>
      <span class="badge-pag">Página 1 de 3</span>
    </header>

    <div class="contenido">
      <div class="intro">
        <strong>Qué es este espacio:</strong> es tu mesa privada en Electro Shop para consultar las facturas del mes, revisar compras y gastos, llevar la hoja de IVA (Forma 99030), descargar el paquete en Excel y cerrar cada mes con tu firma y sello C.P.C.
      </div>

      <!-- Paso 1 -->
      <div class="paso-card">
        <div class="paso-head">
          <span class="num">1</span>
          <h2>Abre tu enlace de invitación y crea tu contraseña</h2>
        </div>
        <p class="sub">Andrés te enviará un enlace personal por correo o WhatsApp. Ábrelo y crea una contraseña segura (mínimo 8 caracteres) que solo conozcas tú.</p>
      </div>

      <!-- Paso 2 -->
      <div class="paso-card">
        <div class="paso-head">
          <span class="num">2</span>
          <h2>Instala una app gratis de códigos en tu teléfono</h2>
        </div>
        <p class="sub">Es una app gratuita que muestra un número nuevo de 6 cifras cada 30 segundos. Sin ese número nadie puede entrar aunque supiera tu contraseña.</p>

        <div class="app-grid">
          <div class="app-destacada">
            <span class="app-tag">Recomendada · la más simple</span>
            <p class="app-nombre">Google Authenticator</p>
            <p class="sub">Escanea con la cámara de tu teléfono el QR de al lado según el celular que uses (Android o iPhone), o abre el enlace directo si estás viendo esto en tu teléfono.</p>
            <div class="alt-apps">
              <strong>También puedes usar:</strong> Microsoft Authenticator o Authy (igualmente gratis en Play Store y App Store).
            </div>
          </div>

          <div class="qrs-tiendas">
            <div class="qr-box">
              <strong>Android · Play Store</strong>
              ${qrPlay}
              <a class="qr-link" href="${URL_PLAY}">Abrir Play Store</a>
            </div>
            <div class="qr-box">
              <strong>iPhone · App Store</strong>
              ${qrApp}
              <a class="qr-link" href="${URL_APPSTORE}">Abrir App Store</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Paso 3 -->
      <div class="paso-card">
        <div class="paso-head">
          <span class="num">3</span>
          <h2>Conecta Electro Shop en "Mi seguridad" (solo la primera vez)</h2>
        </div>
        <p class="sub">Al entrar con tu contraseña, el panel te guiará en 4 pasos muy visuales:</p>

        <div class="phones-row">
          <div class="phone-step">
            <div class="phone-frame" aria-hidden="true">
              <div class="phone-notch"></div>
              <div class="phone-hdr">Authenticator</div>
              <div class="phone-scan">Escanear un código QR</div>
              <div class="phone-plus">+</div>
            </div>
            <div>
              <strong style="font-size:12.5px;color:#0f172a;display:block;margin-bottom:3px;">1. Agrega la cuenta</strong>
              <p class="sub">Abre la app en tu teléfono, toca el botón <strong>+</strong> y elige <strong>Escanear un código QR</strong> apuntando a la pantalla de tu computadora. (Si estás en el mismo teléfono, toca <em>"Abrir en la app"</em>).</p>
            </div>
          </div>

          <div class="phone-step">
            <div class="phone-frame" aria-hidden="true">
              <div class="phone-notch"></div>
              <div class="phone-hdr">Authenticator</div>
              <div class="phone-code-card">
                <span>Electro Shop</span>
                <div class="phone-code-num">123 456</div>
              </div>
            </div>
            <div>
              <strong style="font-size:12.5px;color:#0f172a;display:block;margin-bottom:3px;">2. Escribe las 6 cifras</strong>
              <p class="sub">Copia en Electro Shop el número de 6 cifras que ves debajo de <em>Electro Shop</em> antes de que se acabe el círculo de 30 segundos.</p>
            </div>
          </div>
        </div>

        <div class="aviso-azul">
          <span class="placa-azul" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          </span>
          <div>
            <strong>Guarda tus llaves de repuesto:</strong> al terminar, la pantalla te dará unas llaves de emergencia. Anótalas o guárdalas fuera del teléfono; sirven para entrar si cambias o pierdes el celular.
          </div>
        </div>
      </div>

      <!-- Entrada habitual -->
      <div class="login-bar">
        <div>
          <strong style="font-size:13px;color:#0f172a;">¿Cómo entrarás todos los días?</strong><br/>
          <span class="login-url">${URL_LOGIN}</span>
          <p class="sub">Escribe tu correo, tu contraseña y el número de 6 cifras de tu app. Si usas tu computadora personal de oficina, puedes marcar <strong>"No pedir el número en esta computadora por 30 días"</strong> (la contraseña sí se pide; nunca lo marques en una PC compartida).</p>
        </div>
        <div style="text-align:center;flex-shrink:0;">
          ${qrLogin}
          <span style="display:block;font-size:11px;color:#475569;margin-top:2px;">Acceso directo</span>
        </div>
      </div>
    </div>

    <footer class="pie-pag">
      <span>Electro Shop Morandin C.A. · Guanare, Portuguesa</span>
      <span>Entrada y verificación en dos pasos</span>
    </footer>
  </section>

  <!-- PÁGINA 2: TU FIRMA + TUS 4 PESTAÑAS + QUÉ NO TE TOCA -->
  <section class="pagina">
    <header class="topbar">
      <span class="topbar-titulo">Electro Shop · Guía rápida de Contabilidad</span>
      <span class="topbar-pag">Página 2 de 3</span>
    </header>

    <div class="contenido">
      <div class="firma-banner">
        <span class="placa-azul" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </span>
        <div>
          <strong style="font-size:13px;color:#0f172a;">Lo primero al entrar (una sola vez): Dibuja tu firma y coloca tu C.P.C.</strong>
          <p class="sub" style="margin-top:2px;">En la pestaña <strong>Resumen y Cierre</strong> busca el bloque <strong>Tu firma y sello</strong>. Dibuja tu firma con el ratón o el dedo, escribe tu nombre, título y número de <strong>C.P.C.</strong> y guarda. Quedará lista para los cierres mensuales y el paquete Excel.</p>
        </div>
      </div>

      <div>
        <p class="sub" style="margin-bottom:6px;"><strong style="color:#0f172a;">Así se ve tu barra en Contabilidad:</strong> arriba cambias el mes de trabajo y navegas entre estas 4 pestañas:</p>
        <div class="riel-tabs" aria-hidden="true">
          <div class="tab-pill activa">Resumen y Cierre</div>
          <div class="tab-pill">Facturación</div>
          <div class="tab-pill">Libros e IVA</div>
          <div class="tab-pill">Movimientos</div>
        </div>
      </div>

      <div class="grid-2x2">
        <div class="tab-card">
          <div class="tab-card-head">
            <span class="icon-box" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
            </span>
            <h3>1. Resumen y Cierre</h3>
          </div>
          <span class="tag-solo">Vista general + cierre mensual</span>
          <ul class="lista">
            <li>Ver el <strong>IVA estimado del mes</strong> (Débito menos Crédito, Excedente anterior y Retenciones).</li>
            <li>Seguir el <strong>calendario de obligaciones</strong> (Alcaldía, IVA, Alquiler, Pensiones 9 % y nómina), cambiar su estado a <em>Declarada / Pagada</em> y subir el PDF de la planilla y el comprobante.</li>
            <li>Dejar <strong>notas del mes</strong> para Andrés (dudas o soportes faltantes).</li>
            <li>Descargar el <strong>Paquete Excel (.xlsx)</strong> de 5 hojas y pulsar <strong>Cerrar y firmar mes</strong> cuando todo esté cuadrado.</li>
          </ul>
        </div>

        <div class="tab-card">
          <div class="tab-card-head">
            <span class="icon-box" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
            </span>
            <h3>2. Facturación</h3>
          </div>
          <span class="tag-solo">Solo lectura + retenciones de IVA</span>
          <ul class="lista">
            <li>Consultar todas las <strong>facturas emitidas, Notas de Crédito, Notas de Débito y anuladas</strong> del mes.</li>
            <li>Ver el número de control, serie, hora, cliente, <strong>tasa BCV del día</strong> y descargar el PDF de cada documento.</li>
            <li><strong>Registrar retenciones de IVA (75 % o 100 %)</strong> que entreguen clientes contribuyentes especiales, anotando el número de comprobante, fecha, monto en Bs. y subiendo la foto o PDF del comprobante.</li>
          </ul>
        </div>

        <div class="tab-card">
          <div class="tab-card-head">
            <span class="icon-box" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            </span>
            <h3>3. Libros e IVA</h3>
          </div>
          <span class="tag-solo">Libros oficiales y Forma 99030</span>
          <ul class="lista">
            <li><strong>Libro de ventas:</strong> tabla oficial con las columnas fiscales acordadas, descarga Excel e impresión apaisada limpia.</li>
            <li><strong>Compras y gastos:</strong> cargar facturas de proveedores/servicios (con foto o PDF privado) o revisar las que subió el equipo como <strong>Aprobada</strong> u <strong>Observada</strong>.</li>
            <li><strong>Hoja Forma 99030:</strong> resumen listo con el número exacto de cada casilla del SENIAT para cargar el excedente anterior, anotar planilla y marcar <em>Declarada / Pagada</em>.</li>
          </ul>
        </div>

        <div class="tab-card">
          <div class="tab-card-head">
            <span class="icon-box" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
            </span>
            <h3>4. Movimientos</h3>
          </div>
          <span class="tag-solo">Conciliación contra bancos</span>
          <ul class="lista">
            <li>Ver los <strong>cobros web ordenados por método de pago</strong> (Pago Móvil, transferencia, Zelle, Binance, efectivo, etc.) con total en USD y Bs.</li>
            <li>Consultar comisiones bancarias o de pasarela asociadas al período.</li>
            <li>Revisar recargas/consumos de <strong>Puntos ES</strong> y canjes de <strong>Gift Cards</strong> del mes para cuadrar contra los estados de cuenta bancarios.</li>
          </ul>
        </div>
      </div>

      <div class="excel-bar">
        <strong style="font-size:13px;color:#0f172a;">Qué incluye el Paquete Excel (.xlsx) que descargas cada mes (5 hojas listas):</strong>
        <div class="excel-hojas">
          <div class="excel-hoja">1. Ventas<span>Libro con tasa BCV</span></div>
          <div class="excel-hoja">2. Compras<span>Gastos y crédito</span></div>
          <div class="excel-hoja">3. IVA 99030<span>Casillas SENIAT</span></div>
          <div class="excel-hoja">4. Obligaciones<span>Pagos y fechas</span></div>
          <div class="excel-hoja">5. Movimientos<span>Bancos y puntos</span></div>
        </div>
      </div>

      <div class="no-toca">
        <h3>Qué NO te toca hacer (protegido por diseño y seguridad)</h3>
        <ul class="lista" style="columns:2;column-gap:22px;">
          <li><strong>Facturación e imprenta:</strong> no emites ni anulas facturas, Notas de Crédito/Débito ni cargas talonarios; eso lo hace el equipo.</li>
          <li><strong>Ajustes y tienda:</strong> no ves <em>Ajustes de contabilidad</em>, Pedidos, Productos, Clientes, Costos internos ni Márgenes de ganancia.</li>
          <li><strong>Menú limpio:</strong> en tu barra izquierda solo aparecen <strong>Contabilidad</strong>, <strong>Mi seguridad</strong> y <strong>Versiones</strong>.</li>
          <li><strong>Meses cerrados con candado:</strong> una vez que cierras un mes, queda bloqueado; si hace falta corregir algo después, pídele a Andrés que lo reabra.</li>
        </ul>
      </div>
    </div>

    <footer class="pie-pag">
      <span>Electro Shop Morandin C.A. · Guanare, Portuguesa</span>
      <span>Tus 4 pestañas y permisos en Contabilidad 2.0</span>
    </footer>
  </section>

  <!-- PÁGINA 3: RUTINA MENSUAL + FORMA 99030 + AYUDA -->
  <section class="pagina">
    <header class="topbar">
      <span class="topbar-titulo">Electro Shop · Guía rápida de Contabilidad</span>
      <span class="topbar-pag">Página 3 de 3</span>
    </header>

    <div class="contenido">
      <div>
        <h2 style="margin:0 0 7px;font-size:14.5px;color:#0f172a;">Tu rutina mensual en 6 pasos (checklist de cierre)</h2>
        <div class="rutina-list">
          <div class="rutina-item">
            <span class="check-sq" aria-hidden="true"></span>
            <div><strong style="color:#163e7a;">1. Elige el mes</strong><br/><span class="sub">Usa el selector superior de Contabilidad para abrir el período por cerrar.</span></div>
          </div>
          <div class="rutina-item">
            <span class="check-sq" aria-hidden="true"></span>
            <div><strong style="color:#163e7a;">2. Revisa Compras y gastos</strong><br/><span class="sub">En <em>Libros e IVA</em>, marca <strong>Aprobada / Observada</strong> y sube compras faltantes.</span></div>
          </div>
          <div class="rutina-item">
            <span class="check-sq" aria-hidden="true"></span>
            <div><strong style="color:#163e7a;">3. Carga retenciones de IVA</strong><br/><span class="sub">En <em>Facturación</em>, registra los comprobantes (75 % o 100 %) recibidos.</span></div>
          </div>
          <div class="rutina-item">
            <span class="check-sq" aria-hidden="true"></span>
            <div><strong style="color:#163e7a;">4. Llena la Forma 99030</strong><br/><span class="sub">Confirma el excedente anterior y copia las casillas en el portal del SENIAT.</span></div>
          </div>
          <div class="rutina-item">
            <span class="check-sq" aria-hidden="true"></span>
            <div><strong style="color:#163e7a;">5. Sube planillas y pagos</strong><br/><span class="sub">Marca <em>Declarada / Pagada</em> y adjunta el PDF en IVA y en Obligaciones.</span></div>
          </div>
          <div class="rutina-item">
            <span class="check-sq" aria-hidden="true"></span>
            <div><strong style="color:#163e7a;">6. Descarga Excel y cierra</strong><br/><span class="sub">Baja el <strong>Paquete .xlsx</strong> (5 hojas) y pulsa <strong>Cerrar y firmar mes</strong>.</span></div>
          </div>
        </div>
      </div>

      <div>
        <h2 style="margin:0 0 7px;font-size:14.5px;color:#0f172a;">Fechas clave que vigila el calendario automático</h2>
        <div class="fechas-grid">
          <div class="fecha-card">
            <div class="fecha-dia">Día 5</div>
            <div class="fecha-txt">Alquiler del local e ISLR si aplica</div>
          </div>
          <div class="fecha-card">
            <div class="fecha-dia">Día 10</div>
            <div class="fecha-txt">Alcaldía de Guanare (Act. Econ.)</div>
          </div>
          <div class="fecha-card">
            <div class="fecha-dia">Día 15</div>
            <div class="fecha-txt">IVA mensual (Forma 99030 SENIAT)</div>
          </div>
          <div class="fecha-card">
            <div class="fecha-dia">Día 18</div>
            <div class="fecha-txt">Aporte Pensiones (9 %)</div>
          </div>
        </div>
      </div>

      <div>
        <h2 style="margin:0 0 7px;font-size:14.5px;color:#0f172a;">Mapa rápido del portal SENIAT · Forma 99030 (Contribuyente Ordinario)</h2>
        <table class="seniat">
          <thead>
            <tr>
              <th style="width:16%;">Bloque</th>
              <th style="width:14%;">Casilla</th>
              <th style="width:70%;">Qué copias desde Electro Shop (Libros e IVA → Hoja Forma 99030)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Ventas</strong></td>
              <td><span class="cas">40</span></td>
              <td>Ventas internas no gravadas / exentas o no sujetas (renglones con <strong>(E)</strong>).</td>
            </tr>
            <tr>
              <td><strong>Ventas</strong></td>
              <td><span class="cas">42</span> / <span class="cas">43</span></td>
              <td>Base imponible ventas internas gravadas al 16 % (Casilla <strong>42</strong>) y Débito Fiscal 16 % (<strong>43 / 49</strong>).</td>
            </tr>
            <tr>
              <td><strong>Compras</strong></td>
              <td><span class="cas">30</span></td>
              <td>Compras internas exentas o sin derecho a crédito fiscal.</td>
            </tr>
            <tr>
              <td><strong>Compras</strong></td>
              <td><span class="cas">33</span> / <span class="cas">34</span></td>
              <td>Base imponible compras gravadas al 16 % (Casilla <strong>33</strong>) y Crédito Fiscal 16 % (<strong>34 / 36</strong>).</td>
            </tr>
            <tr>
              <td><strong>Autoliquidación</strong></td>
              <td><span class="cas">20</span></td>
              <td>Excedente de crédito fiscal del mes anterior (confirmado contra tu último certificado).</td>
            </tr>
            <tr>
              <td><strong>Autoliquidación</strong></td>
              <td><span class="cas">39</span></td>
              <td>Total Crédito Fiscal deducible (Crédito del mes + Excedente anterior).</td>
            </tr>
            <tr>
              <td><strong>Retenciones</strong></td>
              <td><span class="cas">66</span> / <span class="cas">55</span></td>
              <td>Retenciones de IVA acumuladas/descontadas del período (cargadas en <em>Facturación</em>).</td>
            </tr>
            <tr>
              <td><strong>Resultado</strong></td>
              <td><span class="cas">60</span> · <span class="cas">90</span></td>
              <td><strong>Casilla 60:</strong> Excedente para el próximo mes · <strong>Casilla 90:</strong> Total IVA a pagar en planilla.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="aviso-azul" style="margin-top:auto;padding:11px 13px;">
        <span class="placa-azul" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
        </span>
        <div>
          <strong style="font-size:13px;color:#163e7a;">¿Te trabaste o cambiaste de teléfono? Tienes salida rápida:</strong>
          <ul class="lista" style="margin-top:4px;">
            <li><strong>"El número no sirve":</strong> espera unos segundos a que cambie el reloj de tu app y escribe el nuevo; verifica en el teléfono que la fecha y hora estén en <em>Automática</em>.</li>
            <li><strong>No tienes el teléfono a mano:</strong> en la pantalla de acceso toca <strong>"¿Sin el teléfono? Usa una llave de repuesto"</strong> y escribe una de las llaves que guardaste al inicio.</li>
            <li><strong>Cambiaste de celular o necesitas reabrir un mes cerrado:</strong> escribe por WhatsApp a <strong>Andrés (Electro Shop)</strong> y reiniciamos tu acceso o abrimos el mes en minutos.</li>
          </ul>
        </div>
      </div>
    </div>

    <footer class="pie-pag">
      <span>Electro Shop Morandin C.A. · Guanare, Portuguesa</span>
      <span>Rutina mensual, Forma 99030 y soporte</span>
    </footer>
  </section>

</body>
</html>`;
}

function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(OUT_PDF), { recursive: true });

  const html = htmlGuia();
  fs.writeFileSync(OUT_HTML, html, 'utf8');

  execFileSync(
    '/usr/bin/google-chrome',
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-pdf-header-footer',
      `--print-to-pdf=${OUT_PDF}`,
      `file://${OUT_HTML}`,
    ],
    { stdio: 'inherit' },
  );

  fs.copyFileSync(OUT_PDF, OUT_PDF_CACHE);
  console.log(`PDF generado en: ${OUT_PDF}`);
  console.log(`Copia caché en: ${OUT_PDF_CACHE}`);
}

main();
