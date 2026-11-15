'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  IconoActualizar, IconoAdvertencia, IconoBillete, IconoBolsa, IconoBuscar, IconoCerrar, IconoCheck, IconoCopiar,
  IconoGiftCard, IconoMas, IconoNumero, IconoVer,
} from '@/components/iconos';
import GiftCard3D from '@/components/gift-card/GiftCard3D';
import { formatUSD } from '@/lib/currency';
import { formatGiftCardCode } from '@/lib/gift-card-designs';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import {
  adminBadge, adminCard, adminEmpty, adminHint, adminIconButton, adminIconChip, adminInput, adminLabel, adminModalBody,
  adminModalFooter, adminModalHeader, adminModalOverlay, adminModalPanel, adminModalTitle, adminNotice, adminPageHeader,
  adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminRowHover, adminSecondaryButton, adminSpinner, adminStatCard,
  adminStatLabel, adminStatValue, adminSuccessButton, adminTable, adminTableWrap, adminTd, adminTh, type AdminTone,
} from '@/lib/admin-ui';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';

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

/** Impresa si no va a un correo (las digitales siempre llevan destinatario). */
const isPrinted = (card: GiftCard) => !card.recipientEmail;

/**
 * Gift cards del admin (C-71): tarjetas impresas que nacen inactivas con PIN, venta en caja que las activa,
 * y detalle con la tarjeta 3D. Los PIN solo existen en claro en la respuesta de creación: se imprimen en ese momento.
 * C-249b: generar el lote va por pasos en su propia página (/admin/gift-cards/nuevo, PLAN.md §1.9).
 */
export default function GiftCardsAdminPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showSell, setShowSell] = useState(false);
  const [sellForm, setSellForm] = useState({ code: '', paymentMethod: 'CASH', reference: '' });
  const [selling, setSelling] = useState(false);
  const [sellError, setSellError] = useState('');

  const [details, setDetails] = useState<GiftCard | null>(null);

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

  useCargarAlMontar(fetchGiftCards, [fetchGiftCards]);

  const stats = {
    total: giftCards.length,
    toActivate: giftCards.filter((c) => c.status === 'INACTIVE').length,
    active: giftCards.filter((c) => c.status === 'ACTIVE' || c.status === 'PARTIALLY_USED').length,
    activeBalance: giftCards.filter((c) => c.status === 'ACTIVE' || c.status === 'PARTIALLY_USED').reduce((sum, c) => sum + Number(c.balanceUSD), 0),
    redeemed: giftCards.filter((c) => c.status === 'DEPLETED').reduce((sum, c) => sum + Number(c.amountUSD), 0),
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
            <IconoActualizar className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => openSell()} className={adminSecondaryButton}>
            <IconoBolsa className="h-4 w-4" aria-hidden="true" /> Vender en caja
          </button>
          <Link href="/admin/gift-cards/nuevo" className={`${adminPrimaryButton} order-first`}>
            <IconoMas className="h-4 w-4" aria-hidden="true" /> Generar impresas
          </Link>
        </div>
      </div>

      <div className="mb-4 flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-5">
        {[
          { label: 'Total', value: String(stats.total), icon: IconoNumero, tone: 'neutral' as AdminTone },
          { label: 'Por activar', value: String(stats.toActivate), icon: IconoAdvertencia, tone: 'warning' as AdminTone },
          { label: 'Activas', value: String(stats.active), icon: IconoCheck, tone: 'success' as AdminTone },
          { label: 'Valor sin canjear', value: formatUSD(stats.activeBalance), icon: IconoBillete, tone: 'brand' as AdminTone },
          { label: 'Canjeado', value: formatUSD(stats.redeemed), icon: IconoGiftCard, tone: 'brand' as AdminTone },
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
          <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
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
          <IconoGiftCard className="mb-3 h-10 w-10 text-subtle" aria-hidden="true" />
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
                    <div><dt className="text-muted">Disponible</dt><dd className="whitespace-nowrap font-semibold tabular-nums">{formatUSD(Number(card.balanceUSD))}</dd></div>
                  </dl>
                  {card.recipientEmail && <div className="mb-3 text-sm [overflow-wrap:anywhere]"><p className="font-medium text-ink">{card.recipientName}</p><p className="text-muted">{card.recipientEmail}</p></div>}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void copyCode(card.code)} className={`${adminSecondaryButton} relative px-3`}><IconoCopiar className="h-4 w-4" aria-hidden="true" /> Copiar código</button>
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
                <th className={adminTh}>Disponible</th>
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
                          <IconoCopiar className="h-3.5 w-3.5" aria-hidden="true" />
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
                          <IconoVer className="h-4 w-4" aria-hidden="true" />
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

      {/* Venta en caja */}
      {showSell && (
        <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="sell-title">
          <form className={`${adminModalPanel} sm:max-w-md`} onSubmit={(e) => { e.preventDefault(); void handleSell(); }}>
            <div className={adminModalHeader}>
              <h2 id="sell-title" className={adminModalTitle}>Vender en caja</h2>
              <button type="button" onClick={() => setShowSell(false)} className={adminIconButton} aria-label="Cerrar"><IconoCerrar className="h-5 w-5" aria-hidden="true" /></button>
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
                <IconoCheck className="h-4 w-4" aria-hidden="true" /> {selling ? 'Activando…' : 'Cobrado: activar'}
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
              <button type="button" onClick={() => setDetails(null)} className={adminIconButton} aria-label="Cerrar"><IconoCerrar className="h-5 w-5" aria-hidden="true" /></button>
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
                <div className="border-b border-line py-2"><dt className="text-muted">Disponible</dt><dd className="font-semibold text-ink">{formatUSD(Number(details.balanceUSD))}</dd></div>
                <div className="border-b border-line py-2"><dt className="text-muted">Estado</dt><dd><span className={adminBadge((STATUS[details.status] ?? STATUS.EXPIRED).tone)}>{STATUS[details.status]?.label ?? details.status}</span></dd></div>
                <div className="border-b border-line py-2"><dt className="text-muted">Creada</dt><dd className="font-semibold text-ink">{new Date(details.createdAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
                {details.activatedAt && <div className="border-b border-line py-2"><dt className="text-muted">Activada</dt><dd className="font-semibold text-ink">{new Date(details.activatedAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>}
                {details.redeemedAt && <div className="border-b border-line py-2"><dt className="text-muted">Canjeada</dt><dd className="font-semibold text-ink">{new Date(details.redeemedAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>}
              </dl>
              {isPrinted(details) && <p className={adminHint}>El PIN no se puede volver a ver: solo aparece en la hoja del lote.</p>}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => void copyCode(details.code)} className={adminSecondaryButton}><IconoCopiar className="h-4 w-4" aria-hidden="true" /> Copiar código</button>
              {details.status === 'INACTIVE' && <button type="button" onClick={() => openSell(details.code)} className={adminSuccessButton}>Vender en caja</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
