'use client';

// C-249b: crear o cambiar un método de pago en su propia página, por pasos (PLAN.md §1.9, la A que eligió el equipo el
// 15/11): el método, los datos de la cuenta (según el tipo), lo que ve el cliente, el logo y el QR, y "Revisar y publicar".
// Al lado, lo que verá el cliente: en un método que se paga en el checkout, el mismo panel del checkout (PagoManualPanel);
// en Pago Móvil y efectivo, la tarjeta que mostraba la ventana de antes. Al cambiar uno, antes → después y cuántas recargas
// y órdenes esperan un pago con los datos de antes. La API (/api/admin/payments) y sus reglas no cambian: antes de guardar,
// el servidor dice si los datos pasan (POST /api/admin/payments/vista-previa, que no guarda nada).

import { useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { SiBinance, SiPaypal, SiZelle } from 'react-icons/si';
import Asistente, { Afecta, Campo, ElegirPublicar, FilaResumen, ListaCambios, VistaPrevia, type CambioCampo, type PasoAsistente } from '@/components/admin/Asistente';
import CampoUnidad from '@/components/admin/CampoUnidad';
import Opcion from '@/components/admin/Opcion';
import PagoManualPanel from '@/components/checkout/PagoManualPanel';
import {
  IconoBillete, IconoCheck, IconoClientes, IconoEliminar, IconoGarantia, IconoGuardar, IconoImagen, IconoInfo, IconoInterruptorApagado,
  IconoInterruptorEncendido, IconoPagoMovil, IconoQr, IconoSubir, IconoTarjeta, IconoVer, IconoWeb, type IconType,
} from '@/components/iconos';
import { useSettings } from '@/contexts/SettingsContext';
import { adminInput, adminNotice, adminSpinner } from '@/lib/admin-ui';
import { esPagoManual } from '@/lib/checkout-pago';
import { formatUSD } from '@/lib/currency';
import { BANCOS_VENEZUELA } from '@/lib/pago-movil/bancos-venezuela';

export interface MetodoPanel {
  id: string; type: string; name: string; bankName: string | null; accountNumber: string | null; accountType: string | null;
  holderName: string | null; holderId: string | null; phone: string | null; email: string | null; payId: string | null;
  walletAddress: string | null; network: string | null; instructions: string | null; logo: string | null; qrCodeImage: string | null;
  sortOrder: number; minAmount: number | null; maxAmount: number | null; displayNote: string | null; isActive: boolean;
}

interface Formulario {
  type: string; name: string; bankName: string; accountNumber: string; accountType: string; holderName: string; holderId: string;
  phone: string; email: string; payId: string; walletAddress: string; network: string; instructions: string; displayNote: string;
  logo: string; qrCodeImage: string; minAmount: string; maxAmount: string;
}

const TIPOS: { tipo: string; titulo: string; detalle: string; icono: IconType }[] = [
  { tipo: 'MOBILE_PAYMENT', titulo: 'Pago Móvil', detalle: 'Venezuela', icono: IconoPagoMovil },
  { tipo: 'BANK_TRANSFER', titulo: 'Transferencia', detalle: 'Bancaria, Venezuela', icono: IconoTarjeta },
  { tipo: 'BINANCE_PAY', titulo: 'Binance Pay', detalle: 'Cripto sin comisión', icono: SiBinance },
  { tipo: 'ZELLE', titulo: 'Zelle', detalle: 'Estados Unidos', icono: SiZelle },
  { tipo: 'ZINLI', titulo: 'Zinli', detalle: 'En dólares', icono: IconoTarjeta },
  { tipo: 'PAYPAL', titulo: 'PayPal', detalle: 'En dólares', icono: SiPaypal },
  { tipo: 'MERCANTIL_PANAMA', titulo: 'Mercantil Panamá', detalle: 'Cuenta o correo Mony', icono: IconoWeb },
  { tipo: 'CRYPTO', titulo: 'Criptomonedas', detalle: 'USDT-TRC20 y otras redes', icono: SiBinance },
  { tipo: 'CASH', titulo: 'Efectivo', detalle: 'Se paga al retirar', icono: IconoBillete },
  { tipo: 'OTHER', titulo: 'Otro', detalle: 'Un método manual', icono: IconoTarjeta },
];
const tipoDe = (t: string) => TIPOS.find((x) => x.tipo === t) ?? TIPOS[TIPOS.length - 1];

const PASOS: { titulo: string; queHacer: string; icono: IconType }[] = [
  { titulo: 'El método', queHacer: 'Cómo paga el cliente y cómo se llama.', icono: IconoTarjeta },
  { titulo: 'La cuenta', queHacer: 'Adónde llega el pago.', icono: IconoBillete },
  { titulo: 'Para el cliente', queHacer: 'Una nota y los montos que acepta.', icono: IconoInfo },
  { titulo: 'Logo y QR', queHacer: 'Se suben; los dos son opcionales.', icono: IconoImagen },
  { titulo: 'Revisar y publicar', queHacer: 'Mira cómo queda antes de guardarlo.', icono: IconoVer },
];

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const vacioSiNulo = (v: string | null | undefined) => v ?? '';

function formularioDe(m: MetodoPanel | null): Formulario {
  return {
    type: m?.type ?? 'MOBILE_PAYMENT', name: m?.name ?? '', bankName: m ? vacioSiNulo(m.bankName) : 'Banco de Venezuela',
    accountNumber: vacioSiNulo(m?.accountNumber), accountType: m?.accountType ?? 'Corriente', holderName: vacioSiNulo(m?.holderName),
    holderId: vacioSiNulo(m?.holderId), phone: vacioSiNulo(m?.phone), email: vacioSiNulo(m?.email), payId: vacioSiNulo(m?.payId),
    walletAddress: vacioSiNulo(m?.walletAddress), network: m ? vacioSiNulo(m.network) : 'USDT-TRC20', instructions: vacioSiNulo(m?.instructions),
    displayNote: vacioSiNulo(m?.displayNote), logo: vacioSiNulo(m?.logo), qrCodeImage: vacioSiNulo(m?.qrCodeImage),
    minAmount: m?.minAmount ? String(m.minAmount) : '', maxAmount: m?.maxAmount ? String(m.maxAmount) : '',
  };
}

function monto(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/** Lo que le falta a la cuenta para seguir: las mismas reglas que valida el servidor para cada tipo */
function problemaCuenta(f: Formulario): string | null {
  switch (f.type) {
    case 'MOBILE_PAYMENT':
      if (!f.bankName.trim()) return 'Falta el banco.';
      if (!f.phone.trim()) return 'Falta el teléfono.';
      if (!f.holderId.trim()) return 'Falta la cédula o el RIF.';
      return null;
    case 'BANK_TRANSFER':
      if (!f.bankName.trim()) return 'Falta el banco.';
      if (!/^\d{20}$/.test(f.accountNumber.replace(/\s+/g, ''))) return 'La cuenta lleva 20 dígitos.';
      if (!f.holderName.trim()) return 'Falta el titular.';
      if (!f.holderId.trim()) return 'Falta la cédula o el RIF.';
      return null;
    case 'BINANCE_PAY':
      if (!f.email.trim() && !f.payId.trim()) return 'Falta el correo o el Pay ID.';
      if (f.email.trim() && !CORREO.test(f.email.trim())) return 'El correo no es válido.';
      return null;
    case 'ZELLE': case 'PAYPAL': case 'ZINLI':
      if (!CORREO.test(f.email.trim())) return 'Falta un correo válido.';
      if (!f.holderName.trim()) return 'Falta el titular.';
      return null;
    case 'MERCANTIL_PANAMA':
      return !f.accountNumber.trim() && !f.email.trim() ? 'Falta la cuenta o el correo.' : null;
    case 'CRYPTO':
      if (!f.walletAddress.trim()) return 'Falta la dirección de depósito.';
      if (!f.network.trim()) return 'Falta la red.';
      return null;
    default:
      return null;
  }
}

function problemaCliente(f: Formulario): string | null {
  const min = monto(f.minAmount);
  const max = monto(f.maxAmount);
  if (min !== null && !(min > 0)) return 'El mínimo tiene que ser mayor que 0.';
  if (max !== null && !(max > 0)) return 'El máximo tiene que ser mayor que 0.';
  if (min !== null && max !== null && min > max) return 'El mínimo no puede ser mayor que el máximo.';
  return null;
}

/** Los datos que el servidor guarda para cada tipo (los demás los deja vacíos): lo que se ve en "Lo que cambia" */
const CAMPOS_DE: Record<string, (keyof Formulario)[]> = {
  MOBILE_PAYMENT: ['bankName', 'phone', 'holderId', 'holderName'],
  BANK_TRANSFER: ['bankName', 'accountNumber', 'accountType', 'holderId', 'holderName'],
  BINANCE_PAY: ['email', 'payId', 'holderName'],
  ZELLE: ['email', 'holderName'], PAYPAL: ['email', 'holderName'], ZINLI: ['email', 'holderName'],
  MERCANTIL_PANAMA: ['accountNumber', 'email', 'holderName'],
  CRYPTO: ['walletAddress', 'network'],
  CASH: ['instructions'], OTHER: ['instructions'],
};
const NOMBRES: Partial<Record<keyof Formulario, string>> = {
  type: 'Tipo', name: 'Nombre', bankName: 'Banco', accountNumber: 'Cuenta', accountType: 'Tipo de cuenta', holderName: 'Titular',
  holderId: 'Cédula o RIF', phone: 'Teléfono', email: 'Correo', payId: 'Binance Pay ID', walletAddress: 'Dirección', network: 'Red',
  instructions: 'Instrucciones', displayNote: 'Nota para el cliente', logo: 'Logo', qrCodeImage: 'Código QR', minAmount: 'Monto mínimo', maxAmount: 'Monto máximo',
};
/** Cambiar uno de estos desvía los pagos: se dice aparte */
const DE_LA_CUENTA: (keyof Formulario)[] = ['bankName', 'accountNumber', 'holderId', 'phone', 'email', 'payId', 'walletAddress', 'network'];

export default function AsistenteMetodo({ metodo, orden }: { metodo: MetodoPanel | null; orden: number }) {
  const router = useRouter();
  const { settings } = useSettings();
  const [inicial] = useState(() => formularioDe(metodo));
  const [form, setForm] = useState<Formulario>(inicial);
  const [paso, setPaso] = useState(0);
  const [activo, setActivo] = useState(metodo?.isActive ?? true);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState<'logo' | 'qrCodeImage' | null>(null);
  const [revision, setRevision] = useState<{ error: string | null; recargas: number; ordenes: number } | null>(null);
  const [contando, setContando] = useState(false);
  const archivoLogo = useRef<HTMLInputElement>(null);
  const archivoQr = useRef<HTMLInputElement>(null);
  const editar = Boolean(metodo);

  const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) => setForm((f) => ({ ...f, [k]: v }));
  const tipo = tipoDe(form.type);

  const cuerpo = () => ({
    ...(metodo ? { id: metodo.id } : {}),
    type: form.type, name: form.name, bankName: form.bankName, accountNumber: form.accountNumber, accountType: form.accountType,
    holderName: form.holderName, holderId: form.holderId, phone: form.phone, email: form.email, payId: form.payId,
    walletAddress: form.walletAddress, network: form.network, instructions: form.instructions, displayNote: form.displayNote,
    logo: form.logo || null, qrCodeImage: form.qrCodeImage || null,
    sortOrder: metodo?.sortOrder ?? orden,
    minAmount: form.minAmount ? Number(form.minAmount.replace(',', '.')) : null,
    maxAmount: form.maxAmount ? Number(form.maxAmount.replace(',', '.')) : null,
    isActive: activo,
  });

  // Lo que cambia (solo los datos que se guardan con el tipo elegido), y si el estado cambia
  const visibles: (keyof Formulario)[] = ['type', 'name', ...(CAMPOS_DE[form.type] ?? []), 'displayNote', 'minAmount', 'maxAmount', 'logo', 'qrCodeImage'];
  const ver = (k: keyof Formulario, f: Formulario) => {
    if (k === 'type') return tipoDe(f.type).titulo;
    if (k === 'logo' || k === 'qrCodeImage') return f[k] ? 'con imagen' : 'sin imagen';
    if (k === 'minAmount' || k === 'maxAmount') { const n = monto(f[k]); return n ? formatUSD(n) : 'sin límite'; }
    return f[k].trim() || '(vacío)';
  };
  const cambios: CambioCampo[] = editar
    ? [
      ...visibles.filter((k) => inicial[k].trim() !== form[k].trim()).map((k) => ({
        campo: k, nombre: NOMBRES[k] ?? k,
        antes: (k === 'logo' || k === 'qrCodeImage') && inicial[k] && form[k] ? 'la de antes' : ver(k, inicial),
        despues: (k === 'logo' || k === 'qrCodeImage') && inicial[k] && form[k] ? 'otra imagen' : ver(k, form),
      })),
      ...(metodo && metodo.isActive !== activo ? [{ campo: 'isActive', nombre: 'Estado', antes: metodo.isActive ? 'Activo' : 'Inactivo', despues: activo ? 'Activo' : 'Inactivo' }] : []),
    ]
    : [];
  const cambiaLaCuenta = cambios.some((c) => DE_LA_CUENTA.includes(c.campo as keyof Formulario) || c.campo === 'type');

  const revisar = async () => {
    setRevision(null);
    setContando(true);
    try {
      const r = await fetch('/api/admin/payments/vista-previa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo()) });
      setRevision(r.ok ? await r.json() : null);
    } catch {
      setRevision(null);
    } finally {
      setContando(false);
    }
  };
  const irA = (i: number) => { setPaso(i); if (i === PASOS.length - 1) void revisar(); };

  const subir = async (campo: 'logo' | 'qrCodeImage', file: File) => {
    setSubiendo(campo);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'payment-methods');
      const res = await fetch('/api/upload', { method: 'POST', body });
      if (res.ok) {
        const data = await res.json();
        set(campo, data.url);
        toast.success(campo === 'logo' ? 'Logo subido correctamente' : 'Código QR subido correctamente');
      } else {
        toast.error('Error al subir imagen');
      }
    } catch {
      toast.error('Error de conexión al subir imagen');
    } finally {
      setSubiendo(null);
      if (campo === 'logo' && archivoLogo.current) archivoLogo.current.value = '';
      if (campo === 'qrCodeImage' && archivoQr.current) archivoQr.current.value = '';
    }
  };

  const guardar = async () => {
    if (!form.name.trim()) { toast.error('El nombre del método es requerido'); return; }
    setGuardando(true);
    try {
      const response = await fetch('/api/admin/payments', { method: editar ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo()) });
      if (response.ok) {
        toast.success(editar ? 'Método actualizado' : 'Método creado exitosamente');
        router.push('/admin/payments');
        router.refresh();
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || 'Error al guardar el método');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  const problemas = [
    form.name.trim().length < 2 ? 'El nombre lleva al menos 2 letras.' : null,
    problemaCuenta(form),
    problemaCliente(form),
    subiendo ? 'Espera a que termine de subir la imagen.' : null,
  ];
  const pasos: PasoAsistente[] = PASOS.map((p, i) => ({
    ...p,
    problema: i < 4 ? problemas[i] : null,
    resumen: i === 0 ? (form.name.trim() ? `${tipo.titulo} · ${form.name.trim()}` : tipo.titulo)
      : i === 1 ? (problemaCuenta(form) ? 'Adónde llega' : resumenCuenta(form))
        : i === 2 ? limites(form)
          : i === 3 ? [form.logo ? 'con logo' : 'sin logo', form.qrCodeImage ? 'con QR' : 'sin QR'].join(' · ')
            : editar ? `${cambios.length} ${cambios.length === 1 ? 'cambio' : 'cambios'}` : 'Vista previa',
  }));

  // ---------- la vista previa
  const min = monto(form.minAmount);
  const max = monto(form.maxAmount);
  const totalMuestra = min && min > 25 ? min : max && max < 25 ? max : 25;
  const datosCliente = { id: metodo?.id ?? 'vista-previa', type: form.type, name: form.name.trim() || tipo.titulo, ...soloDelTipo(form), qrCodeImage: form.qrCodeImage || null, minAmount: min, maxAmount: max, displayNote: form.displayNote.trim() || null };
  const vista = esPagoManual(form.type) ? (
    <VistaPrevia rotulo="En el checkout" nota={`Con una compra de ${formatUSD(totalMuestra)}. El cliente copia cada dato con un toque.`}>
      <PagoManualPanel metodo={{ ...datosCliente, type: form.type }} totalUSD={totalMuestra} tasa={Number(settings?.exchangeRateVES) || 0} referencia="" onReferencia={() => undefined} listo />
    </VistaPrevia>
  ) : (
    <VistaPrevia rotulo="Así lo ve el cliente">
      <TarjetaCliente f={form} titulo={tipo.titulo} />
    </VistaPrevia>
  );

  const errorServidor = paso === PASOS.length - 1 ? revision?.error ?? null : null;
  const filasAfecta = (): { icono: IconType; texto: ReactNode }[] | null => {
    if (!revision) return null;
    const filas: { icono: IconType; texto: ReactNode }[] = [];
    if (revision.recargas > 0) filas.push({ icono: IconoClientes, texto: <><strong>{revision.recargas} {revision.recargas === 1 ? 'recarga de Puntos ES espera' : 'recargas de Puntos ES esperan'}</strong> que el equipo apruebe un pago a esta cuenta.</> });
    if (revision.ordenes > 0) filas.push({ icono: IconoClientes, texto: <><strong>{revision.ordenes} {revision.ordenes === 1 ? 'orden espera' : 'órdenes esperan'}</strong> la confirmación de un pago por {tipo.titulo}.</> });
    if (cambiaLaCuenta && (revision.recargas > 0 || revision.ordenes > 0)) filas.push({ icono: IconoGarantia, texto: 'Esos clientes vieron los datos de antes: confirma sus pagos con la cuenta anterior.' });
    if (metodo?.isActive && activo && cambios.length > 0) filas.push({ icono: IconoWeb, texto: 'Está activo: los clientes ven los datos nuevos apenas guardes.' });
    if (metodo?.isActive && !activo) filas.push({ icono: IconoInterruptorApagado, texto: 'Deja de salir en el checkout y en las recargas.' });
    return filas;
  };

  return (
    <Asistente
      titulo={metodo ? `Cambiar: ${metodo.name}` : 'Nuevo método de pago'}
      subtitulo={metodo ? `${tipoDe(metodo.type).titulo} · ${metodo.isActive ? 'Activo' : 'Inactivo'}` : 'Paso a paso, con lo que verá el cliente.'}
      icono={IconoTarjeta}
      volver={{ href: '/admin/payments', texto: 'Métodos de pago' }}
      etiqueta="Pasos del método de pago"
      pasos={pasos}
      paso={paso}
      onPaso={irA}
      editar={editar}
      final={{
        contenido: guardando ? 'Guardando…' : editar
          ? <><IconoGuardar className="h-4 w-4" aria-hidden="true" /> Guardar el cambio</>
          : activo ? <><IconoCheck className="h-4 w-4" aria-hidden="true" /> Crear y activar</> : <><IconoGuardar className="h-4 w-4" aria-hidden="true" /> Crear inactivo</>,
        onClick: () => void guardar(),
        deshabilitado: guardando || contando || Boolean(errorServidor) || (editar && cambios.length === 0),
        motivo: errorServidor ? 'El servidor no lo aceptaría: arriba dice por qué.' : editar && cambios.length === 0 ? 'No hay cambios que guardar.' : null,
      }}
      vistaPrevia={vista}
    >
      {paso === 0 && (
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">Tipo de método</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de método">
              {TIPOS.map((t) => (
                <Opcion key={t.tipo} role="radio" aria-checked={form.type === t.tipo} elegida={form.type === t.tipo} icono={t.icono} titulo={t.titulo} detalle={t.detalle}
                  onClick={() => setForm((f) => ({ ...f, type: t.tipo, name: f.name ? f.name : t.titulo }))} />
              ))}
            </div>
          </fieldset>
          <Campo etiqueta="Nombre visible" id="metodo-nombre" pista="Así sale en el checkout y en las recargas.">
            <input id="metodo-nombre" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Pago Móvil BDV, Binance Pay USDT..." className={`${adminInput()} sm:max-w-sm`} />
          </Campo>
        </div>
      )}

      {paso === 1 && (
        <div className="space-y-5">
          {(form.type === 'MOBILE_PAYMENT' || form.type === 'BANK_TRANSFER') && (
            <Campo etiqueta="Banco" id="metodo-banco">
              <select id="metodo-banco" value={form.bankName} onChange={(e) => set('bankName', e.target.value)} className={`${adminInput()} sm:max-w-sm`}>
                <option value="">Selecciona un banco</option>
                {form.bankName && !BANCOS_VENEZUELA.some((b) => b.nombreCorto === form.bankName) && <option value={form.bankName}>{form.bankName}</option>}
                {BANCOS_VENEZUELA.map((b) => <option key={b.codigo} value={b.nombreCorto}>{b.codigo} - {b.nombreCorto}</option>)}
              </select>
            </Campo>
          )}
          {form.type === 'BANK_TRANSFER' && (
            <div className="flex flex-wrap gap-x-6 gap-y-5">
              <Campo etiqueta="Número de cuenta" id="metodo-cuenta" pista={form.accountNumber && form.accountNumber.length !== 20 ? `Debe tener exactamente 20 dígitos (actual: ${form.accountNumber.length})` : '20 dígitos.'}>
                <input id="metodo-cuenta" inputMode="numeric" maxLength={20} value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value.replace(/\D/g, ''))} placeholder="01020123456789012345" className={`${adminInput()} w-64 font-mono`} />
              </Campo>
              <Campo etiqueta="Tipo de cuenta">
                <div className="flex gap-2" role="radiogroup" aria-label="Tipo de cuenta">
                  {['Corriente', 'Ahorro'].map((t) => (
                    <Opcion key={t} tamano="chica" role="radio" aria-checked={form.accountType === t} elegida={form.accountType === t} onClick={() => set('accountType', t)} titulo={t} />
                  ))}
                </div>
              </Campo>
            </div>
          )}
          {form.type === 'MOBILE_PAYMENT' && (
            <Campo etiqueta="Teléfono" id="metodo-telefono">
              <input id="metodo-telefono" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0412-1234567" className={`${adminInput()} w-48`} />
            </Campo>
          )}
          {(form.type === 'MOBILE_PAYMENT' || form.type === 'BANK_TRANSFER') && (
            <div className="flex flex-wrap gap-x-6 gap-y-5">
              <Campo etiqueta="Cédula o RIF" id="metodo-cedula">
                <input id="metodo-cedula" value={form.holderId} onChange={(e) => set('holderId', e.target.value)} placeholder="V-12345678 o J-12345678-9" className={`${adminInput()} w-56`} />
              </Campo>
              <Campo etiqueta={form.type === 'MOBILE_PAYMENT' ? 'Titular (opcional)' : 'Titular'} id="metodo-titular">
                <input id="metodo-titular" value={form.holderName} onChange={(e) => set('holderName', e.target.value)} placeholder="Nombre o Razón Social" className={`${adminInput()} sm:w-80`} />
              </Campo>
            </div>
          )}
          {['BINANCE_PAY', 'ZELLE', 'ZINLI', 'PAYPAL', 'MERCANTIL_PANAMA'].includes(form.type) && (
            <Campo etiqueta={form.type === 'BINANCE_PAY' ? 'Correo de la cuenta Binance' : form.type === 'MERCANTIL_PANAMA' ? 'Correo Mony / Panamá' : `Correo ${tipo.titulo}`} id="metodo-correo"
              pista={form.type === 'BINANCE_PAY' ? 'El correo o el Pay ID: al menos uno.' : form.type === 'MERCANTIL_PANAMA' ? 'La cuenta o el correo: al menos uno.' : undefined}>
              <input id="metodo-correo" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="pagos@ejemplo.com" className={`${adminInput()} sm:max-w-sm`} />
            </Campo>
          )}
          {form.type === 'BINANCE_PAY' && (
            <Campo etiqueta="Binance Pay ID" id="metodo-payid">
              <input id="metodo-payid" value={form.payId} onChange={(e) => set('payId', e.target.value)} placeholder="123456789" className={`${adminInput()} w-48 font-mono`} />
            </Campo>
          )}
          {form.type === 'MERCANTIL_PANAMA' && (
            <Campo etiqueta="Número de cuenta" id="metodo-cuenta">
              <input id="metodo-cuenta" value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} placeholder="0123456789" className={`${adminInput()} w-64 font-mono`} />
            </Campo>
          )}
          {['BINANCE_PAY', 'ZELLE', 'ZINLI', 'PAYPAL', 'MERCANTIL_PANAMA'].includes(form.type) && (
            <Campo etiqueta={form.type === 'BINANCE_PAY' ? 'Nombre o alias en Binance (opcional)' : form.type === 'PAYPAL' ? 'Nombre de la cuenta' : form.type === 'MERCANTIL_PANAMA' ? 'Titular (opcional)' : 'Titular de la cuenta'} id="metodo-titular">
              <input id="metodo-titular" value={form.holderName} onChange={(e) => set('holderName', e.target.value)} placeholder={form.type === 'BINANCE_PAY' ? 'ElectroShopVE' : 'Nombre y apellido'} className={`${adminInput()} sm:w-80`} />
            </Campo>
          )}
          {form.type === 'CRYPTO' && (
            <>
              <Campo etiqueta="Dirección de depósito" id="metodo-wallet">
                <input id="metodo-wallet" value={form.walletAddress} onChange={(e) => set('walletAddress', e.target.value)} placeholder="TYDzsYUE28N4e5g6..." className={`${adminInput()} font-mono`} />
              </Campo>
              <Campo etiqueta="Red / Blockchain" id="metodo-red">
                <input id="metodo-red" value={form.network} onChange={(e) => set('network', e.target.value)} placeholder="USDT-TRC20, BEP20, Polygon..." className={`${adminInput()} sm:max-w-xs`} />
              </Campo>
            </>
          )}
          {(form.type === 'CASH' || form.type === 'OTHER') && (
            <Campo etiqueta="Instrucciones para el cliente" id="metodo-instrucciones" pista="Opcional: dónde pagar o entregar.">
              <textarea id="metodo-instrucciones" rows={3} value={form.instructions} onChange={(e) => set('instructions', e.target.value)} placeholder="Indica dónde pagar o entregar..." className={`${adminInput()} h-auto py-2`} />
            </Campo>
          )}
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-5">
          <Campo etiqueta="Nota visible para el cliente (opcional)" id="metodo-nota" pista="Sale debajo de los datos de la cuenta.">
            <input id="metodo-nota" value={form.displayNote} onChange={(e) => set('displayNote', e.target.value)} placeholder="Ej: Incluir número de referencia sin guiones" className={adminInput()} />
          </Campo>
          <div className="flex flex-wrap gap-x-8 gap-y-5">
            <Campo etiqueta="Monto mínimo" id="metodo-minimo" pista="Vacío: sin mínimo.">
              <CampoUnidad id="metodo-minimo" unidad="$" inputMode="decimal" value={form.minAmount} onChange={(e) => set('minAmount', e.target.value.replace(/[^0-9.,-]/g, ''))} placeholder="Ej: 5.00" className="w-40" invalido={Boolean(problemaCliente(form)) && form.minAmount !== ''} />
            </Campo>
            <Campo etiqueta="Monto máximo" id="metodo-maximo" pista="Vacío: sin máximo.">
              <CampoUnidad id="metodo-maximo" unidad="$" inputMode="decimal" value={form.maxAmount} onChange={(e) => set('maxAmount', e.target.value.replace(/[^0-9.,-]/g, ''))} placeholder="Ej: 1000.00" className="w-40" invalido={Boolean(problemaCliente(form)) && form.maxAmount !== ''} />
            </Campo>
          </div>
        </div>
      )}

      {paso === 3 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <input ref={archivoLogo} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; if (f) void subir('logo', f); }} />
          <input ref={archivoQr} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; if (f) void subir('qrCodeImage', f); }} />
          <Imagen titulo="Logo del método" icono={IconoImagen} url={form.logo} subiendo={subiendo === 'logo'} onSubir={() => archivoLogo.current?.click()} onQuitar={() => set('logo', '')} textoSubir="Subir logo" textoQuitar="Quitar logo" />
          <Imagen titulo="Código QR de pago" icono={IconoQr} url={form.qrCodeImage} subiendo={subiendo === 'qrCodeImage'} onSubir={() => archivoQr.current?.click()} onQuitar={() => set('qrCodeImage', '')} textoSubir="Subir código QR" textoQuitar="Quitar QR" grande />
        </div>
      )}

      {paso === 4 && (
        <div className="space-y-4">
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            <FilaResumen icono={tipo.icono} titulo={`${tipo.titulo}: ${form.name.trim()}`} detalle={tipo.detalle} onCambiar={() => irA(0)} />
            <FilaResumen icono={IconoBillete} titulo={resumenCuenta(form)} detalle={form.holderName.trim() ? `Titular: ${form.holderName.trim()}` : undefined} onCambiar={() => irA(1)} />
            <FilaResumen icono={IconoInfo} titulo={limites(form)} detalle={form.displayNote.trim() ? `Nota: ${form.displayNote.trim()}` : 'Sin nota para el cliente'} onCambiar={() => irA(2)} />
            <FilaResumen icono={IconoImagen} titulo={[form.logo ? 'Con logo' : 'Sin logo', form.qrCodeImage ? 'con código QR' : 'sin código QR'].join(' · ')} onCambiar={() => irA(3)} />
          </ul>
          {errorServidor && <p className={adminNotice('danger')} role="alert">{errorServidor}</p>}
          <ElegirPublicar name="metodo-activo" publicar={activo} onCambiar={setActivo}
            ya={{ titulo: editar ? 'Activo' : 'Activarlo ya', detalle: 'Los clientes lo pueden elegir para pagar y recargar.', icono: IconoInterruptorEncendido }}
            sin={{ titulo: editar ? 'Inactivo' : 'Guardarlo inactivo', detalle: 'No sale para los clientes; lo activas después.', icono: IconoInterruptorApagado }} />
          {editar ? (
            <ListaCambios cambios={cambios}>
              {cambios.length > 0 && <Afecta cargando={contando} filas={filasAfecta()} />}
            </ListaCambios>
          ) : contando ? (
            <p className="flex items-center gap-2 text-sm text-muted"><span className={`${adminSpinner} h-4 w-4 border-2`} aria-hidden="true" /> Revisando los datos…</p>
          ) : null}
        </div>
      )}
    </Asistente>
  );
}

/** Solo los datos que el servidor guarda para el tipo: así la vista previa no muestra lo que se va a borrar */
function soloDelTipo(f: Formulario) {
  const campos = CAMPOS_DE[f.type] ?? [];
  const dato = (k: keyof Formulario) => (campos.includes(k) && f[k].trim() ? f[k].trim() : null);
  return {
    bankName: dato('bankName') ?? (f.type === 'MERCANTIL_PANAMA' ? 'Mercantil Banco Panamá' : null),
    accountNumber: dato('accountNumber'), accountType: f.type === 'BANK_TRANSFER' ? f.accountType : null, holderName: dato('holderName'),
    holderId: dato('holderId'), phone: dato('phone'), email: dato('email'), payId: dato('payId'), walletAddress: dato('walletAddress'), network: dato('network'),
  };
}

function resumenCuenta(f: Formulario): string {
  const d = soloDelTipo(f);
  switch (f.type) {
    case 'MOBILE_PAYMENT': return [d.bankName, d.phone, d.holderId].filter(Boolean).join(' · ');
    case 'BANK_TRANSFER': return [d.bankName, d.accountNumber ? `cuenta …${d.accountNumber.slice(-4)}` : null].filter(Boolean).join(' · ');
    case 'BINANCE_PAY': return [d.email, d.payId ? `Pay ID ${d.payId}` : null].filter(Boolean).join(' · ');
    case 'CRYPTO': return [d.network, d.walletAddress ? `…${d.walletAddress.slice(-6)}` : null].filter(Boolean).join(' · ');
    case 'CASH': case 'OTHER': return f.instructions.trim() ? 'Con instrucciones' : 'Sin datos de cuenta';
    default: return [d.email, d.accountNumber].filter(Boolean).join(' · ') || 'Sin datos';
  }
}

function limites(f: Formulario): string {
  const min = monto(f.minAmount);
  const max = monto(f.maxAmount);
  if (min && max) return `De ${formatUSD(min)} a ${formatUSD(max)}`;
  if (min) return `Desde ${formatUSD(min)}`;
  if (max) return `Hasta ${formatUSD(max)}`;
  return 'Cualquier monto';
}

/** Un logo o un QR: se sube, se ve y se quita (nunca se pega una dirección, §1.9) */
function Imagen({ titulo, icono: Icono, url, subiendo, onSubir, onQuitar, textoSubir, textoQuitar, grande = false }: {
  titulo: string; icono: IconType; url: string; subiendo: boolean; onSubir: () => void; onQuitar: () => void; textoSubir: string; textoQuitar: string; grande?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink">{titulo} <span className="font-normal text-muted">(opcional)</span></p>
      <div className="flex items-center gap-4 rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-3">
        <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white ${grande ? 'h-24 w-24' : 'h-16 w-16'}`}>
          {subiendo ? <span className={`${adminSpinner} h-6 w-6 border-2`} aria-label="Subiendo" />
            : url ? <Image src={url} alt="" fill sizes="96px" className="object-contain p-1" unoptimized={!url.startsWith('/')} />
              : <Icono className="h-7 w-7 text-subtle" aria-hidden="true" />}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <button type="button" onClick={onSubir} disabled={subiendo} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-500 hover:underline">
            <IconoSubir className="h-4 w-4" aria-hidden="true" /> {subiendo ? 'Subiendo...' : url ? 'Subir otra' : textoSubir}
          </button>
          {url && (
            <button type="button" onClick={onQuitar} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-deal hover:underline">
              <IconoEliminar className="h-4 w-4" aria-hidden="true" /> {textoQuitar}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** La tarjeta "Así lo ve el cliente" de la ventana de antes, para Pago Móvil y efectivo (no se pagan en el checkout manual) */
function TarjetaCliente({ f, titulo }: { f: Formulario; titulo: string }) {
  const d = soloDelTipo(f);
  const filas: [string, string | null][] = [
    ['Banco', d.bankName], ['Cuenta', d.accountNumber], ['Teléfono', d.phone], ['Cédula / RIF', d.holderId], ['Titular', d.holderName],
    ['Correo', d.email], ['Pay ID', d.payId], ['Dirección', d.walletAddress], ['Red', d.network],
  ];
  const min = monto(f.minAmount);
  const max = monto(f.maxAmount);
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface text-brand-600">
          {f.logo ? <Image src={f.logo} alt="" width={32} height={32} className="h-8 w-8 object-contain" unoptimized={!f.logo.startsWith('/')} /> : f.type === 'MOBILE_PAYMENT' ? <IconoPagoMovil className="h-5 w-5" aria-hidden="true" /> : <IconoBillete className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{f.name.trim() || 'Nombre del método'}</p>
          <p className="text-xs text-muted">{titulo}</p>
        </div>
      </div>
      {f.displayNote.trim() && <p className="rounded-lg border border-line bg-surface p-2 text-xs text-ink-soft">{f.displayNote.trim()}</p>}
      <dl className="space-y-1 text-xs">
        {filas.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2"><dt className="text-muted">{k}:</dt><dd className="min-w-0 text-right font-medium text-ink [overflow-wrap:anywhere]">{v}</dd></div>
        ))}
      </dl>
      {f.type === 'CASH' && f.instructions.trim() && <p className="text-xs text-ink-soft">{f.instructions.trim()}</p>}
      {f.qrCodeImage && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs text-muted">Escanea el código QR:</p>
          <Image src={f.qrCodeImage} alt="" width={110} height={110} className="rounded-lg border border-line bg-white object-contain" unoptimized={!f.qrCodeImage.startsWith('/')} />
        </div>
      )}
      {(min || max) && (
        <p className="text-xs text-muted">
          {min ? `Monto mínimo: ${formatUSD(min)}` : ''}{min && max ? ' · ' : ''}{max ? `Monto máximo: ${formatUSD(max)}` : ''}
        </p>
      )}
    </div>
  );
}
