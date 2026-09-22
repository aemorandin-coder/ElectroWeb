'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiAlertTriangle, FiCheck, FiCopy, FiDollarSign, FiEye, FiGift, FiHash, FiPlus, FiPrinter, FiRefreshCw, FiSearch, FiShoppingBag, FiX } from 'react-icons/fi';
import GiftCard3D from '@/components/gift-card/GiftCard3D';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { formatUSD } from '@/lib/currency';
import { formatGiftCardCode } from '@/lib/gift-card-designs';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import {
  adminBadge, adminCard, adminEmpty, adminHint, adminIconButton, adminIconChip, adminInput, adminLabel, adminModalBody,
  adminModalFooter, adminModalHeader, adminModalOverlay, adminModalPanel, adminModalTitle, adminNotice, adminPageHeader,
  adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminRowHover, adminSecondaryButton, adminSpinner, adminStatCard,
  adminStatLabel, adminStatValue, adminSuccessButton, adminTable, adminTableWrap, adminTd, adminTh, type AdminTone,
} from '@/lib/admin-ui';

interface GiftCard {
  id: string;
  code: string;
  codeLast4: string | null;
  amountUSD: number | string;
  balanceUSD: number | string;
  status: string;
  recipientEmail: string | null;
  recipientName: string | null;
  activatedAt: string | null;
  redeemedAt: string | null;
  createdAt: string;
  design: { slug?: string | null; name: string } | null;
}

interface PrintedCard { code: string; pin: string; amountUSD: number }

const STATUS: Record<string, { label: string; tone: AdminTone }> = {
  INACTIVE: { label: 'Por activar', tone: 'warning' },
  ACTIVE: { label: 'Activa', tone: 'success' },
  PARTIALLY_USED: { label: 'Uso parcial', tone: 'success' },
  DEPLETED: { label: 'Canjeada', tone: 'brand' },
  EXPIRED: { label: 'Vencida', tone: 'neutral' },
  SUSPENDED: { label: 'Suspendida', tone: 'danger' },
  CANCELLED: { label: 'Cancelada', tone: 'danger' },
};

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'MOBILE_PAYMENT', label: 'Pago Móvil' },
  { value: 'CARD', label: 'Punto de venta' },
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'CRYPTO', label: 'Binance Pay' },
  { value: 'OTHER', label: 'Otro' },
];

const AMOUNT_PRESETS = [10, 25, 50, 100];

/** Impresa si no va a un correo (las digitales siempre llevan destinatario). */
const isPrinted = (card: GiftCard) => !card.recipientEmail;

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Hoja para imprenta: tarjetas de 85,6 × 54 mm con frente y reverso (código + PIN en la zona del raspadito). */
function printBatch(cards: PrintedCard[]) {
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
      .note { font-size: 12px; margin: 0 0 6mm; padding: 3mm 4mm; border: 1px solid #b45309; color: #b45309; border-radius: 2mm; }
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
      .state { font-size: 2.2mm; font-weight: 700; color: #b45309; text-align: right; max-width: 28mm; }
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

/**
 * Gift cards del admin (C-71): tarjetas impresas que nacen inactivas con PIN, venta en caja que las activa,
 * y detalle con la tarjeta 3D. Los PIN solo existen en claro en la respuesta de creación: se imprimen en ese momento.
 */
export default function GiftCardsAdminPage() {
  const { confirm } = useConfirm();
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ amount: 25, quantity: 1 });
  const [creating, setCreating] = useState(false);
  const [batch, setBatch] = useState<PrintedCard[] | null>(null);
  const [batchPrinted, setBatchPrinted] = useState(false);

  const [showSell, setShowSell] = useState(false);
  const [sellForm, setSellForm] = useState({ code: '', paymentMethod: 'CASH', reference: '' });
  const [selling, setSelling] = useState(false);
  const [sellError, setSellError] = useState('');

  const [details, setDetails] = useState<GiftCard | null>(null);

  useBodyScrollLock(showCreate);
  useBodyScrollLock(Boolean(batch));
  useBodyScrollLock(showSell);
  useBodyScrollLock(Boolean(details));

  const fetchGiftCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gift-cards?type=admin');
      if (!res.ok) throw new Error('fetch');
      setGiftCards(await res.json());
    } catch {
      toast.error('No se pudieron cargar las gift cards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchGiftCards();
  }, [fetchGiftCards]);

  const stats = {
    total: giftCards.length,
    toActivate: giftCards.filter((c) => c.status === 'INACTIVE').length,
    active: giftCards.filter((c) => c.status === 'ACTIVE' || c.status === 'PARTIALLY_USED').length,
    activeBalance: giftCards.filter((c) => c.status === 'ACTIVE' || c.status === 'PARTIALLY_USED').reduce((sum, c) => sum + Number(c.balanceUSD), 0),
    redeemed: giftCards.filter((c) => c.status === 'DEPLETED').reduce((sum, c) => sum + Number(c.amountUSD), 0),
  };

  const handleCreate = async () => {
    const { amount, quantity } = createForm;
    if (!(amount >= 5 && amount <= 500)) { toast.error('El monto debe estar entre $5 y $500'); return; }
    if (!(quantity >= 1 && quantity <= 50)) { toast.error('La cantidad debe estar entre 1 y 50'); return; }
    setCreating(true);
    const created: PrintedCard[] = [];
    try {
      for (let i = 0; i < quantity; i++) {
        const res = await fetch('/api/gift-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountUSD: amount, forPrint: true, isGift: false }),
        });
        const data = await res.json();
        if (!res.ok || !data.giftCard?.code || !data.giftCard?.pin) throw new Error(data.error || 'No se pudo generar la tarjeta');
        created.push({ code: data.giftCard.code, pin: data.giftCard.pin, amountUSD: Number(data.giftCard.amountUSD) });
      }
      toast.success(`${created.length} ${created.length === 1 ? 'tarjeta generada' : 'tarjetas generadas'}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron generar las tarjetas');
    } finally {
      setCreating(false);
      if (created.length > 0) {
        setShowCreate(false);
        setBatch(created);
        setBatchPrinted(false);
        void fetchGiftCards();
      }
    }
  };

  const closeBatch = async () => {
    if (!batchPrinted) {
      const ok = await confirm({
        title: 'Cerrar sin imprimir',
        message: 'No imprimiste la hoja. Los PIN no se vuelven a mostrar y esas tarjetas no se podrán canjear. ¿Cerrar de todos modos?',
        confirmText: 'Cerrar de todos modos',
        cancelText: 'Volver',
        type: 'danger',
      });
      if (!ok) return;
    }
    setBatch(null);
  };

  const handleSell = async () => {
    setSelling(true);
    setSellError('');
    try {
      const res = await fetch('/api/admin/gift-cards/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sellForm),
      });
      const data = await res.json();
      if (!res.ok) { setSellError(data.error || 'No se pudo activar la tarjeta'); return; }
      toast.success(`Tarjeta ****${data.giftCard.codeLast4} activada por ${formatUSD(data.giftCard.amountUSD)}`);
      setShowSell(false);
      setSellForm({ code: '', paymentMethod: 'CASH', reference: '' });
      void fetchGiftCards();
    } catch {
      setSellError('No se pudo activar la tarjeta. Revisa tu conexión.');
    } finally {
      setSelling(false);
    }
  };

  const openSell = (code = '') => {
    setSellForm({ code: code ? formatGiftCardCode(code) : '', paymentMethod: 'CASH', reference: '' });
    setSellError('');
    setDetails(null);
    setShowSell(true);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(formatGiftCardCode(code));
      toast.success('Código copiado');
    } catch {
      toast.error('No se pudo copiar el código');
    }
  };

  const term = searchTerm.trim().toLowerCase();
  const filtered = giftCards.filter((card) => {
    const matches = !term
      || card.code.toLowerCase().includes(term.replace(/-/g, ''))
      || card.recipientEmail?.toLowerCase().includes(term)
      || card.recipientName?.toLowerCase().includes(term);
    return matches && (statusFilter === 'all' || card.status === statusFilter);
  });

  return (
    <div>
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Gift Cards</h1>
          <p className={adminPageSubtitle}>Genera las impresas y actívalas al cobrar. Las digitales se compran en la tienda.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void fetchGiftCards()} className={`${adminIconButton} h-11 w-11`} aria-label="Actualizar lista" title="Actualizar lista">
            <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => openSell()} className={adminSecondaryButton}>
            <FiShoppingBag className="h-4 w-4" aria-hidden="true" /> Vender en caja
          </button>
          <button type="button" onClick={() => setShowCreate(true)} className={`${adminPrimaryButton} order-first`}>
            <FiPlus className="h-4 w-4" aria-hidden="true" /> Generar impresas
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-5">
        {[
          { label: 'Total', value: String(stats.total), icon: FiHash, tone: 'neutral' as AdminTone },
          { label: 'Por activar', value: String(stats.toActivate), icon: FiAlertTriangle, tone: 'warning' as AdminTone },
          { label: 'Activas', value: String(stats.active), icon: FiCheck, tone: 'success' as AdminTone },
          { label: 'Saldo activo', value: formatUSD(stats.activeBalance), icon: FiDollarSign, tone: 'brand' as AdminTone },
          { label: 'Canjeado', value: formatUSD(stats.redeemed), icon: FiGift, tone: 'brand' as AdminTone },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`${adminStatCard} min-w-max shrink-0 p-3`}>
            <span className={`${adminIconChip(tone)} hidden`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className={adminStatLabel}>{label}</p>
              <p className={`${adminStatValue} text-lg tabular-nums`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <label htmlFor="gc-search" className="sr-only">Buscar gift cards</label>
          <input id="gc-search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Código, correo o nombre" className={`${adminInput()} pl-9`} />
        </div>
        <label htmlFor="gc-status" className="sr-only">Estado</label>
        <select id="gc-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${adminInput()} sm:w-52`}>
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className={adminSpinner} aria-label="Cargando" /></div>
      ) : filtered.length === 0 ? (
        <div className={adminEmpty}>
          <FiGift className="mb-3 h-10 w-10 text-subtle" aria-hidden="true" />
          <p className="font-semibold text-ink">No hay gift cards con ese filtro</p>
          <p className={adminHint}>Genera tarjetas impresas o espera las compras de la tienda.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 xl:hidden">
            {filtered.map((card) => {
              const status = STATUS[card.status] ?? { label: card.status, tone: 'neutral' as AdminTone };
              return (
                <article key={card.id} className={`${adminCard} relative p-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button type="button" onClick={() => setDetails(card)} className="min-h-11 font-mono text-sm font-semibold text-ink underline-offset-2 hover:underline">
                      ****{card.codeLast4 || card.code.slice(-4)}
                    </button>
                    <span className={adminBadge(status.tone)}>{status.label}</span>
                  </div>
                  <p className="text-xs text-muted">{isPrinted(card) ? 'Impresa' : 'Digital'} · {new Date(card.createdAt).toLocaleDateString('es-VE')}</p>
                  <dl className="my-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <div><dt className="text-muted">Monto</dt><dd className="whitespace-nowrap font-semibold tabular-nums">{formatUSD(Number(card.amountUSD))}</dd></div>
                    <div><dt className="text-muted">Saldo</dt><dd className="whitespace-nowrap font-semibold tabular-nums">{formatUSD(Number(card.balanceUSD))}</dd></div>
                  </dl>
                  {card.recipientEmail && <div className="mb-3 text-sm [overflow-wrap:anywhere]"><p className="font-medium text-ink">{card.recipientName}</p><p className="text-muted">{card.recipientEmail}</p></div>}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void copyCode(card.code)} className={`${adminSecondaryButton} relative px-3`}><FiCopy className="h-4 w-4" aria-hidden="true" /> Copiar código</button>
                    {card.status === 'INACTIVE' && <button type="button" onClick={() => openSell(card.code)} className={`${adminSuccessButton} relative px-3`}>Activar</button>}
                  </div>
                </article>
              );
            })}
          </div>
        <div className={`${adminTableWrap} hidden xl:block`}>
          <table className={`${adminTable} min-w-[760px]`}>
            <thead>
              <tr>
                <th className={adminTh}>Código</th>
                <th className={adminTh}>Tipo</th>
                <th className={adminTh}>Monto</th>
                <th className={adminTh}>Saldo</th>
                <th className={adminTh}>Estado</th>
                <th className={adminTh}>Destinatario</th>
                <th className={adminTh}>Fecha</th>
                <th className={`${adminTh} text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((card) => {
                const status = STATUS[card.status] ?? { label: card.status, tone: 'neutral' as AdminTone };
                return (
                  <tr key={card.id} className={adminRowHover}>
                    <td className={adminTd}>
                      <div className="flex items-center gap-1">
                        <code className="rounded bg-surface px-2 py-1 font-mono text-xs">****{card.codeLast4 || card.code.slice(-4)}</code>
                        <button type="button" onClick={() => void copyCode(card.code)} className={`${adminIconButton} h-11 w-11`} aria-label="Copiar código completo">
                          <FiCopy className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                    <td className={`${adminTd} text-ink-soft`}>{isPrinted(card) ? 'Impresa' : 'Digital'}</td>
                    <td className={`${adminTd} whitespace-nowrap font-semibold`}>{formatUSD(Number(card.amountUSD))}</td>
                    <td className={`${adminTd} whitespace-nowrap font-semibold ${Number(card.balanceUSD) > 0 ? 'text-success-strong' : 'text-muted'}`}>{formatUSD(Number(card.balanceUSD))}</td>
                    <td className={adminTd}><span className={adminBadge(status.tone)}>{status.label}</span></td>
                    <td className={adminTd}>
                      {card.recipientEmail ? (
                        <div className="text-sm"><p className="font-medium">{card.recipientName}</p><p className="text-muted">{card.recipientEmail}</p></div>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className={`${adminTd} text-muted`}>{new Date(card.createdAt).toLocaleDateString('es-VE')}</td>
                    <td className={adminTd}>
                      <div className="flex items-center justify-end gap-1">
                        {card.status === 'INACTIVE' && (
                          <button type="button" onClick={() => openSell(card.code)} className={`${adminSuccessButton} h-11 px-3 text-sm`}>Activar</button>
                        )}
                        <button type="button" onClick={() => setDetails(card)} className={adminIconButton} aria-label={`Ver tarjeta terminada en ${card.codeLast4 || card.code.slice(-4)}`}>
                          <FiEye className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Generar tarjetas impresas */}
      {showCreate && (
        <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="create-title">
          <div className={`${adminModalPanel} sm:max-w-md`}>
            <div className={adminModalHeader}>
              <h2 id="create-title" className={adminModalTitle}>Generar tarjetas impresas</h2>
              <button type="button" onClick={() => setShowCreate(false)} className={adminIconButton} aria-label="Cerrar"><FiX className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            <div className={`${adminModalBody} flex flex-col gap-4`}>
              <div>
                <span className={adminLabel}>Monto por tarjeta</span>
                <div className="mb-2 grid grid-cols-4 gap-2">
                  {AMOUNT_PRESETS.map((amount) => (
                    <button key={amount} type="button" onClick={() => setCreateForm((f) => ({ ...f, amount }))} aria-pressed={createForm.amount === amount}
                      className={`h-10 rounded-lg border text-sm font-semibold ${createForm.amount === amount ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line text-ink hover:bg-surface'}`}>
                      ${amount}
                    </button>
                  ))}
                </div>
                <label htmlFor="create-amount" className="sr-only">Otro monto</label>
                <input id="create-amount" type="number" min={5} max={500} value={createForm.amount} onChange={(e) => setCreateForm((f) => ({ ...f, amount: Number(e.target.value) }))} className={adminInput()} />
              </div>
              <div>
                <label htmlFor="create-quantity" className={adminLabel}>Cantidad</label>
                <input id="create-quantity" type="number" min={1} max={50} value={createForm.quantity} onChange={(e) => setCreateForm((f) => ({ ...f, quantity: Number(e.target.value) }))} className={adminInput()} />
                <p className={adminHint}>Hasta 50 por lote.</p>
              </div>
              <div className={adminNotice('warning')}>
                Se crean <strong>inactivas</strong>, con un PIN de 6 dígitos que se muestra <strong>solo en la hoja de impresión</strong> de este lote. Actívalas desde &quot;Vender en caja&quot; cuando el cliente pague.
              </div>
              <p className="text-sm text-ink-soft">Total del lote: <strong className="text-ink">{formatUSD(createForm.amount * createForm.quantity)}</strong> en {createForm.quantity} {createForm.quantity === 1 ? 'tarjeta' : 'tarjetas'}.</p>
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => setShowCreate(false)} className={adminSecondaryButton}>Cancelar</button>
              <button type="button" onClick={() => void handleCreate()} disabled={creating} className={adminPrimaryButton}>
                {creating ? 'Generando…' : 'Generar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lote generado: única vez que se ven los PIN */}
      {batch && (
        <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="batch-title">
          <div className={`${adminModalPanel} sm:max-w-2xl`}>
            <div className={adminModalHeader}>
              <h2 id="batch-title" className={adminModalTitle}>Lote listo para imprimir</h2>
              <button type="button" onClick={closeBatch} className={adminIconButton} aria-label="Cerrar"><FiX className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            <div className={`${adminModalBody} flex flex-col gap-4`}>
              <div className={adminNotice('danger')}>
                Esta es la <strong>única vez</strong> que se ven los PIN: en la base de datos quedan cifrados. Imprime la hoja ahora y cubre cada PIN con un raspadito.
              </div>
              <div className="mx-auto w-full max-w-sm">
                <GiftCard3D amountUSD={batch[0].amountUSD} kind="print" code={batch[0].code} pin={batch[0].pin} status="INACTIVE" face="front" />
              </div>
              <div className={adminTableWrap}>
                <table className={adminTable}>
                  <thead><tr><th className={adminTh}>Código</th><th className={adminTh}>PIN</th><th className={adminTh}>Monto</th></tr></thead>
                  <tbody>
                    {batch.map((card) => (
                      <tr key={card.code}>
                        <td className={`${adminTd} font-mono text-xs`}>{formatGiftCardCode(card.code)}</td>
                        <td className={`${adminTd} font-mono text-xs`}>{card.pin}</td>
                        <td className={adminTd}>{formatUSD(card.amountUSD)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={closeBatch} className={adminSecondaryButton}>Cerrar</button>
              <button type="button" onClick={() => { if (printBatch(batch)) setBatchPrinted(true); }} className={adminPrimaryButton}>
                <FiPrinter className="h-4 w-4" aria-hidden="true" /> Imprimir hoja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Venta en caja */}
      {showSell && (
        <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="sell-title">
          <form className={`${adminModalPanel} sm:max-w-md`} onSubmit={(e) => { e.preventDefault(); void handleSell(); }}>
            <div className={adminModalHeader}>
              <h2 id="sell-title" className={adminModalTitle}>Vender en caja</h2>
              <button type="button" onClick={() => setShowSell(false)} className={adminIconButton} aria-label="Cerrar"><FiX className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            <div className={`${adminModalBody} flex flex-col gap-4`}>
              <p className="text-sm text-ink-soft">Cobra la tarjeta al cliente y actívala aquí. Hasta entonces no se puede canjear.</p>
              <div>
                <label htmlFor="sell-code" className={adminLabel}>Código de la tarjeta</label>
                <input id="sell-code" value={sellForm.code} autoComplete="off" spellCheck={false} placeholder="ESMC-XXXX-XXXX-XXXX"
                  onChange={(e) => { setSellForm((f) => ({ ...f, code: formatGiftCardCode(e.target.value).slice(0, 19) })); setSellError(''); }}
                  className={`${adminInput(Boolean(sellError))} font-mono tracking-widest`} />
              </div>
              <div>
                <label htmlFor="sell-method" className={adminLabel}>Cómo pagó</label>
                <select id="sell-method" value={sellForm.paymentMethod} onChange={(e) => setSellForm((f) => ({ ...f, paymentMethod: e.target.value }))} className={adminInput()}>
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="sell-reference" className={adminLabel}>Referencia <span className="font-normal text-muted">(opcional)</span></label>
                <input id="sell-reference" value={sellForm.reference} maxLength={80} onChange={(e) => setSellForm((f) => ({ ...f, reference: e.target.value }))} placeholder="Nro. de Pago Móvil o factura" className={adminInput()} />
              </div>
              {sellError && <p className={adminNotice('danger')} role="alert">{sellError}</p>}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => setShowSell(false)} className={adminSecondaryButton}>Cancelar</button>
              <button type="submit" disabled={selling || sellForm.code.length < 19} className={adminSuccessButton}>
                <FiCheck className="h-4 w-4" aria-hidden="true" /> {selling ? 'Activando…' : 'Cobrado: activar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Detalle */}
      {details && (
        <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="details-title">
          <div className={`${adminModalPanel} sm:max-w-lg`}>
            <div className={adminModalHeader}>
              <h2 id="details-title" className={adminModalTitle}>Tarjeta ****{details.codeLast4 || details.code.slice(-4)}</h2>
              <button type="button" onClick={() => setDetails(null)} className={adminIconButton} aria-label="Cerrar"><FiX className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            <div className={`${adminModalBody} flex flex-col gap-4`}>
              <GiftCard3D
                design={details.design?.slug}
                amountUSD={Number(details.balanceUSD) > 0 ? Number(details.balanceUSD) : Number(details.amountUSD)}
                recipientName={details.recipientName}
                kind={isPrinted(details) ? 'print' : 'digital'}
                code={details.code}
                status={details.status === 'INACTIVE' ? 'INACTIVE' : details.status === 'ACTIVE' ? 'ACTIVE' : null}
              />
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="border-b border-line py-2"><dt className="text-muted">Monto</dt><dd className="font-semibold text-ink">{formatUSD(Number(details.amountUSD))}</dd></div>
                <div className="border-b border-line py-2"><dt className="text-muted">Saldo</dt><dd className="font-semibold text-ink">{formatUSD(Number(details.balanceUSD))}</dd></div>
                <div className="border-b border-line py-2"><dt className="text-muted">Estado</dt><dd><span className={adminBadge((STATUS[details.status] ?? STATUS.EXPIRED).tone)}>{STATUS[details.status]?.label ?? details.status}</span></dd></div>
                <div className="border-b border-line py-2"><dt className="text-muted">Creada</dt><dd className="font-semibold text-ink">{new Date(details.createdAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
                {details.activatedAt && <div className="border-b border-line py-2"><dt className="text-muted">Activada</dt><dd className="font-semibold text-ink">{new Date(details.activatedAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>}
                {details.redeemedAt && <div className="border-b border-line py-2"><dt className="text-muted">Canjeada</dt><dd className="font-semibold text-ink">{new Date(details.redeemedAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>}
              </dl>
              {isPrinted(details) && <p className={adminHint}>El PIN no se puede volver a ver: solo aparece en la hoja del lote.</p>}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => void copyCode(details.code)} className={adminSecondaryButton}><FiCopy className="h-4 w-4" aria-hidden="true" /> Copiar código</button>
              {details.status === 'INACTIVE' && <button type="button" onClick={() => openSell(details.code)} className={adminSuccessButton}>Vender en caja</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
