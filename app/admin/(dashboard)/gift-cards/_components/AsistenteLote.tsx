'use client';

// C-249b: generar gift cards impresas por pasos, en su propia página (PLAN.md §1.9, la A que eligió el equipo el 15/11):
// el monto, cuántas y "Revisar y generar", con la tarjeta como se imprime al lado. Lo que hacía la ventana de antes sigue
// igual: el mismo pedido a /api/gift-cards por tarjeta ({ amountUSD, forPrint: true, isGift: false }), las mismas reglas
// ($5 a $500, hasta 50 por lote) y, al terminar, el lote con los PIN, que se ven una sola vez, y "Imprimir hoja".

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Asistente, { Campo, FilaResumen, VistaPrevia, type PasoAsistente } from '@/components/admin/Asistente';
import CampoUnidad from '@/components/admin/CampoUnidad';
import Opcion from '@/components/admin/Opcion';
import GiftCard3D from '@/components/gift-card/GiftCard3D';
import { IconoBillete, IconoCerrar, IconoCheck, IconoGiftCard, IconoImpresora, IconoNumero, IconoVer, type IconType } from '@/components/iconos';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import {
  adminIconButton, adminModalBody, adminModalFooter, adminModalHeader, adminModalOverlay, adminModalPanel, adminModalTitle, adminNotice,
  adminPrimaryButton, adminSecondaryButton, adminTable, adminTableWrap, adminTd, adminTh,
} from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { formatGiftCardCode } from '@/lib/gift-card-designs';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { printBatch, type PrintedCard } from './hoja';

const AMOUNT_PRESETS = [10, 25, 50, 100];
const PASOS: { titulo: string; queHacer: string; icono: IconType }[] = [
  { titulo: 'El monto', queHacer: 'Cuánto vale cada tarjeta.', icono: IconoBillete },
  { titulo: 'Cuántas', queHacer: 'Cuántas tarjetas lleva el lote.', icono: IconoNumero },
  { titulo: 'Revisar y generar', queHacer: 'Mira cómo queda antes de generarlas.', icono: IconoVer },
];

/** Un número escrito en el panel ("25", "25,5"); null si está vacío o no es un número */
function numero(valor: string): number | null {
  if (!valor.trim()) return null;
  const n = Number(valor.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export default function AsistenteLote() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const [paso, setPaso] = useState(0);
  const [monto, setMonto] = useState('25');
  const [cantidad, setCantidad] = useState('1');
  const [creating, setCreating] = useState(false);
  const [batch, setBatch] = useState<PrintedCard[] | null>(null);
  const [batchPrinted, setBatchPrinted] = useState(false);
  useBodyScrollLock(Boolean(batch));

  // Los PIN se ven una sola vez: cerrar o recargar la pestaña con el lote sin imprimir pide confirmación
  useEffect(() => {
    if (!batch || batchPrinted) return;
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [batch, batchPrinted]);

  const amount = numero(monto) ?? 0;
  const quantity = numero(cantidad) ?? 0;
  const problemaMonto = !(amount >= 5 && amount <= 500) ? 'El monto debe estar entre $5 y $500.' : null;
  const problemaCantidad = !(Number.isInteger(quantity) && quantity >= 1 && quantity <= 50) ? 'La cantidad debe estar entre 1 y 50.' : null;
  const total = problemaMonto || problemaCantidad ? 0 : Math.round(amount * quantity * 100) / 100;
  const tarjetas = (n: number) => `${n} ${n === 1 ? 'tarjeta' : 'tarjetas'}`;

  const pasos: PasoAsistente[] = [
    { ...PASOS[0], problema: problemaMonto, resumen: problemaMonto ? 'Cuánto vale' : `${formatUSD(amount)} cada una` },
    { ...PASOS[1], problema: problemaCantidad, resumen: problemaCantidad ? 'Cuántas' : tarjetas(quantity) },
    { ...PASOS[2], problema: null, resumen: total ? `${formatUSD(total)} en total` : 'Vista previa' },
  ];

  // Igual que antes: una tarjeta por pedido, y si una falla se queda con las que sí salieron
  const handleCreate = async () => {
    if (problemaMonto) { toast.error(problemaMonto); return; }
    if (problemaCantidad) { toast.error(problemaCantidad); return; }
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
        setBatch(created);
        setBatchPrinted(false);
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
    router.push('/admin/gift-cards');
    router.refresh();
  };

  return (
    <>
      <Asistente
        titulo="Generar tarjetas impresas"
        subtitulo="Nacen inactivas y se activan al cobrarlas en caja."
        icono={IconoGiftCard}
        volver={{ href: '/admin/gift-cards', texto: 'Gift cards' }}
        etiqueta="Pasos del lote"
        pasos={pasos}
        paso={paso}
        onPaso={setPaso}
        final={{
          contenido: creating ? 'Generando…' : <><IconoCheck className="h-4 w-4" aria-hidden="true" /> Generar {tarjetas(quantity)}</>,
          onClick: () => void handleCreate(),
          deshabilitado: creating || Boolean(batch),
        }}
        vistaPrevia={
          <VistaPrevia rotulo="Así sale cada tarjeta" nota="La hoja trae el frente y el reverso de cada una (85,6 × 54 mm), con el código y el PIN en la zona del raspadito.">
            <div className="mx-auto w-full max-w-xs">
              <GiftCard3D amountUSD={amount >= 5 ? amount : 25} kind="print" status="INACTIVE" face="front" interactive={false} entrance={false} />
            </div>
          </VistaPrevia>
        }
      >
        {paso === 0 && (
          <Campo etiqueta="Monto por tarjeta" id="create-amount" pista="De $5 a $500 por tarjeta.">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Montos de siempre">
                {AMOUNT_PRESETS.map((a) => (
                  <Opcion key={a} tamano="chica" role="radio" aria-checked={amount === a} elegida={amount === a} onClick={() => setMonto(String(a))} titulo={`$${a}`} className="w-20" />
                ))}
              </div>
              <CampoUnidad id="create-amount" aria-label="Otro monto" unidad="$" inputMode="decimal" value={monto}
                onChange={(e) => setMonto(e.target.value.replace(/[^0-9.,]/g, ''))} invalido={Boolean(problemaMonto) && monto.trim() !== ''} />
            </div>
          </Campo>
        )}

        {paso === 1 && (
          <div className="space-y-4">
            <Campo etiqueta="Cantidad" id="create-quantity" pista="Hasta 50 por lote.">
              <CampoUnidad id="create-quantity" unidad="tarjetas" inputMode="numeric" value={cantidad}
                onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ''))} invalido={Boolean(problemaCantidad) && cantidad.trim() !== ''} className="w-40" />
            </Campo>
            <p className="text-sm text-ink-soft">Total del lote: <strong className="text-ink">{formatUSD(total)}</strong> en {tarjetas(problemaCantidad ? 0 : quantity)}.</p>
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-4">
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              <FilaResumen icono={IconoBillete} titulo={`${formatUSD(amount)} cada una`} detalle="Monto por tarjeta" onCambiar={() => setPaso(0)} />
              <FilaResumen icono={IconoNumero} titulo={tarjetas(quantity)} detalle={`Total del lote: ${formatUSD(total)}`} onCambiar={() => setPaso(1)} />
            </ul>
            <div className={`${adminNotice('warning')} flex items-start gap-3`}>
              <IconoImpresora aria-hidden="true" />
              <p>Se crean <strong>inactivas</strong>, con un PIN de 6 dígitos que se muestra <strong>solo en la hoja de impresión</strong> de este lote. Actívalas desde &quot;Vender en caja&quot; cuando el cliente pague.</p>
            </div>
          </div>
        )}
      </Asistente>

      {/* Lote generado: única vez que se ven los PIN */}
      {batch && (
        <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="batch-title">
          <div className={`${adminModalPanel} sm:max-w-2xl`}>
            <div className={adminModalHeader}>
              <h2 id="batch-title" className={adminModalTitle}>Lote listo para imprimir</h2>
              <button type="button" onClick={() => void closeBatch()} className={`${adminIconButton} h-11 w-11`} aria-label="Cerrar"><IconoCerrar className="h-5 w-5" aria-hidden="true" /></button>
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
              <button type="button" onClick={() => void closeBatch()} className={adminSecondaryButton}>Cerrar</button>
              <button type="button" onClick={() => { if (printBatch(batch)) setBatchPrinted(true); }} className={adminPrimaryButton}>
                <IconoImpresora className="h-4 w-4" aria-hidden="true" /> Imprimir hoja
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
