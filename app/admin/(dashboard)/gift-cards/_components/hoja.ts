// C-71: la hoja para imprimir un lote de gift cards (frente y reverso, con el código y el PIN en la zona del raspadito).
// C-249b: sale de la página de Gift cards para que la use el asistente del lote (/admin/gift-cards/nuevo). La tarjeta
// impresa es la misma; solo la nota de la pantalla (no se imprime) deja el ámbar por el azul claro de lo que hay que
// hacer (C-226).
// C-250 (el equipo, 15/11): en la tarjeta impresa, "Se activa al pagar en caja" pasa del ámbar al azul oscuro del logo.
import { toast } from 'react-hot-toast';
import { formatUSD } from '@/lib/currency';
import { formatGiftCardCode } from '@/lib/gift-card-designs';

export interface PrintedCard { code: string; pin: string; amountUSD: number }

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Hoja para imprenta: tarjetas de 85,6 × 54 mm con frente y reverso (código + PIN en la zona del raspadito). */
export function printBatch(cards: PrintedCard[]) {
  const win = window.open('', '_blank');
  if (!win) {
    toast.error('Permite las ventanas emergentes para imprimir la hoja');
    return false;
  }
  const rows = cards.map((card) => {
    const code = escapeHtml(formatGiftCardCode(card.code));
    const pin = escapeHtml(card.pin.replace(/(\d{3})(?=\d)/g, '$1 '));
    return `
      <div class="pair">
        <div class="card front">
          <div class="brand">ELECTRO<span>SHOP</span></div>
          <div class="tag">GIFT CARD</div>
          <div class="amount">${escapeHtml(formatUSD(card.amountUSD))}<small>USD</small></div>
        </div>
        <div class="card back">
          <div class="label">Código de canje</div>
          <div class="code">${code}</div>
          <div class="pinrow"><div class="pin"><em>PIN · colocar raspadito</em>${pin}</div><div class="state">Se activa al pagar en caja</div></div>
          <div class="foot">Canjea en electroshopve.com/canjear-gift-card · Sin vencimiento</div>
        </div>
      </div>`;
  }).join('');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Gift Cards impresas · Electro Shop</title>
    <style>
      @page { size: A4; margin: 10mm; }
      * { box-sizing: border-box; }
      body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; color: #10182b; }
      .note { font-size: 12px; margin: 0 0 6mm; padding: 3mm 4mm; border: 1px solid #d4e0f5; background: #f4f7fc; color: #0e1f44; border-radius: 2mm; }
      .pair { display: flex; gap: 6mm; margin-bottom: 6mm; page-break-inside: avoid; }
      .card { width: 85.6mm; height: 54mm; border-radius: 3.2mm; padding: 4.5mm 5mm; position: relative; overflow: hidden;
        -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .front { background: linear-gradient(135deg, #0f347f, #1e4ba3 40%, #2a63cd 72%, #4f86ea); color: #fff; }
      .brand { font-weight: 700; letter-spacing: .08em; font-size: 4.2mm; line-height: 1; }
      .brand span { display: block; font-size: 2.4mm; letter-spacing: .42em; color: #cfe0ff; margin-top: .6mm; }
      .tag { position: absolute; top: 4.5mm; right: 5mm; font-size: 2.2mm; font-weight: 700; letter-spacing: .24em; border: .25mm solid rgba(255,255,255,.4); border-radius: 9mm; padding: .9mm 2mm; color: #cfe0ff; }
      .amount { position: absolute; left: 5mm; bottom: 4.5mm; font-size: 10mm; font-weight: 700; line-height: 1; }
      .amount small { font-size: 3.2mm; margin-left: 1.2mm; color: #cfe0ff; }
      .back { background: #f3f5fa; border: .25mm solid #cfd6e4; }
      .label { font-size: 2.2mm; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: #5d6677; }
      .code { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 700; font-size: 4.4mm; letter-spacing: .08em; margin-top: 1mm; }
      .pinrow { display: flex; align-items: center; justify-content: space-between; gap: 3mm; margin-top: 4mm; }
      .pin { width: 40mm; height: 12mm; border-radius: 2mm; border: .3mm dashed #5d6677; display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 700; font-size: 5mm; letter-spacing: .16em; }
      .pin em { font-family: system-ui, sans-serif; font-style: normal; font-size: 1.8mm; letter-spacing: .06em; font-weight: 600; color: #5d6677; }
      .state { font-size: 2.2mm; font-weight: 700; color: #1a3b7e; text-align: right; max-width: 28mm; }
      .foot { position: absolute; left: 5mm; right: 5mm; bottom: 4mm; font-size: 2.1mm; color: #5d6677; }
      @media print { .note { display: none; } }
    </style></head><body>
    <p class="note">Esta hoja es la única vez que se ven los PIN. Imprímela, cubre cada PIN con un raspadito y guarda las tarjetas: están inactivas hasta que se cobren en caja.</p>
    ${rows}
    <script>window.onload = () => window.print();</script>
    </body></html>`);
  win.document.close();
  return true;
}
