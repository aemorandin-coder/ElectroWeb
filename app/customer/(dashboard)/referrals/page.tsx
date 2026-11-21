'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  IconoBillete, IconoCarrito, IconoClientes, IconoCompartir, IconoConfirmado, IconoCopiar,
  IconoPremio, IconoRegalo, IconoRegistrarse, IconoReloj, IconoVentas,
} from '@/components/iconos';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { formatUSD } from '@/lib/currency';
import {
  adminBadge, adminCard, adminNotice, adminPageHeader, adminPageSubtitle, adminPrimaryButton,
  adminSecondaryButton,
} from '@/lib/admin-ui';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { useDelNavegador } from '@/lib/hooks/useMontado';

interface Influencer {
  id: string;
  code: string;
  name: string;
  commissionRate: number;
  customerDiscountPercent: number;
  codeWorks: boolean;
  status: string;
  createdAt: string;
}

interface Stats {
  totalConversions: number;
  approvedConversions: number;
  pendingEarnings: number;
  approvedEarnings: number;
  totalEarnings: number;
  thisMonthEarnings: number;
}

interface Conversion {
  id: string;
  type: string;
  source: string | null;
  baseAmount: number;
  commission: number;
  status: string;
  enRevision: boolean;
  creditsAt: string | null;
  createdAt: string;
}

interface Solicitud {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  conversionsCount: number;
  isCurrentUser: boolean;
}

interface ReferralData {
  enrolled: boolean;
  puedePedir?: boolean;
  correoVerificado?: boolean;
  solicitud?: Solicitud | null;
  reglas?: { diasParaAcreditar: number };
  influencer?: Influencer;
  stats?: Stats;
  conversions?: Conversion[];
  currentUserRank?: number | null;
  leaderboard?: LeaderboardEntry[];
}

const CONVERSION_LABELS: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  REGISTRATION: { label: 'Registro', Icon: IconoRegistrarse, color: 'text-brand-500' },
  PURCHASE: { label: 'Compra', Icon: IconoCarrito, color: 'text-success-strong' },
  RECHARGE: { label: 'Recarga', Icon: IconoBillete, color: 'text-brand-700' },
};

/** El estado de una comisión, como lo entiende el promotor: cuándo se acredita o por qué espera. */
function estadoDeComision(c: Conversion): { texto: string; tono: 'success' | 'warning' | 'danger' | 'brand' } {
  if (c.type === 'REGISTRATION') return { texto: 'Registro', tono: 'brand' };
  if (c.status === 'APPROVED') return { texto: 'Acreditada', tono: 'success' };
  if (c.status === 'REJECTED') return { texto: 'Anulada', tono: 'danger' };
  // C-192: esperar no es un aviso: el promotor no tiene que hacer nada
  if (c.enRevision) return { texto: 'En revisión', tono: 'brand' };
  // C-251: una fecha que ya pasó no se promete (la tarea diaria la acredita en estos días)
  if (c.creditsAt) return new Date(c.creditsAt).getTime() > Date.now()
    ? { texto: `Se acredita el ${format(new Date(c.creditsAt), 'dd/MM', { locale: es })}`, tono: 'brand' }
    : { texto: 'Se acredita pronto', tono: 'brand' };
  return { texto: 'Espera la entrega', tono: 'brand' };
}

function StatCard({
  label,
  value,
  Icon,
  color,
  bg,
  suffix = '',
}: {
  label: string;
  value: string;
  Icon: React.ElementType;
  color: string;
  bg: string;
  suffix?: string;
}) {
  return (
    <div className={`${adminCard} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
        <span className="text-xs text-muted">{label}</span>
      </div>
      <p className="text-xl font-bold text-ink">
        {value}
        <span className="text-xs font-normal text-muted">{suffix}</span>
      </p>
    </div>
  );
}

function NotEnrolledView() {
  return (
    <div className="space-y-5">
      <div className={adminPageHeader}>
        <div>
          <h1 className="text-xl font-bold text-ink text-balance lg:text-2xl">Programa de promotores</h1>
          <p className={adminPageSubtitle}>Este programa está temporalmente en pausa para nuevas solicitudes.</p>
        </div>
      </div>

      <div className={`${adminCard} space-y-4`}>
        <div className={adminNotice('brand')}>
          <p className="font-semibold text-ink">Inscripciones en pausa</p>
          <p className="mt-1 text-sm text-ink-soft">
            Estamos reordenando nuestras promociones en cupones directos para ofrecer mejores descuentos en toda la tienda. Si ya tenías un código activo o invitación previa, se conserva sin cambios.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/productos" className={adminPrimaryButton}>
            Ir a la tienda
          </Link>
          <Link href="/customer" className={adminSecondaryButton}>
            Volver a Mi panel
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const siteUrl = useDelNavegador(() => window.location.origin, '');


  const cargar = async () => {
    try {
      const res = await fetch('/api/customer/referrals');
      if (res.ok) setData(await res.json());
      else toast.error('No se pudieron cargar los datos del programa');
    } catch {
      toast.error('No se pudieron cargar los datos del programa');
    } finally {
      setLoading(false);
    }
  };
  useCargarAlMontar(cargar);

  const referralUrl =
    data?.influencer && siteUrl ? `${siteUrl}/?ref=${data.influencer.code}` : '';

  const handleCopy = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success('Enlace copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const copiarCodigo = async () => {
    if (!data?.influencer) return;
    try {
      await navigator.clipboard.writeText(data.influencer.code);
      toast.success('Código copiado');
    } catch {
      toast.error('No se pudo copiar el código');
    }
  };

  // Lo que el promotor pega en sus redes: el código y lo que gana quien lo usa
  const textoParaCompartir = data?.influencer
    ? `Compra en Electro Shop con mi código ${data.influencer.code} y recibe ${data.influencer.customerDiscountPercent} % de descuento`
    : '';

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${textoParaCompartir}: ${referralUrl}`)}`, '_blank');
  };

  const shareTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(textoParaCompartir)}`,
      '_blank'
    );
  };

  const shareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(textoParaCompartir)}`,
      '_blank'
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (!data?.enrolled) {
    return <NotEnrolledView />;
  }

  const { influencer, stats, conversions, leaderboard, currentUserRank } = data;
  if (!influencer || !stats) return null;
  const dias = data.reglas?.diasParaAcreditar ?? 7;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={adminPageHeader}>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-ink text-balance lg:text-2xl">Mi programa de promotor</h1>
            {influencer.status === 'PAUSED' && (
              <span className={adminBadge('neutral')}>
                Pausado
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            Ganas{' '}
            <span className="font-semibold text-brand-500">
              {influencer.commissionRate} %
            </span>{' '}
            en Puntos ES del valor de los productos (sin IVA ni envío) de cada compra con tu código o tu enlace.
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Por acreditar"
          value={formatUSD(stats.pendingEarnings)}
          suffix=" Puntos ES"
          Icon={IconoReloj}
          color="text-brand-600"
          bg="bg-brand-50"
        />
        <StatCard
          label="Acreditado"
          value={formatUSD(stats.approvedEarnings)}
          suffix=" Puntos ES"
          Icon={IconoConfirmado}
          color="text-success-strong"
          bg="bg-success-strong/10"
        />
        <StatCard
          label="Acreditado este mes"
          value={formatUSD(stats.thisMonthEarnings)}
          suffix=" Puntos ES"
          Icon={IconoVentas}
          color="text-brand-500"
          bg="bg-brand-50"
        />
        <StatCard
          label="Ventas"
          value={stats.totalConversions.toString()}
          Icon={IconoClientes}
          color="text-brand-700"
          bg="bg-surface"
          suffix={` · ${stats.approvedConversions} acreditadas`}
        />
      </div>

      {/* Referral link card */}
      <div className={`${adminCard} p-5 border-brand-500/30`}>
        <div className="flex items-center gap-2 mb-3">
          <IconoCompartir className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-ink">Tu código y tu enlace</h3>
        </div>

        {/* El código: lo que más se comparte en historias y videos */}
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-brand-700">Tu código</p>
            <p className="break-all font-mono text-2xl font-bold tracking-wider text-ink">{influencer.code}</p>
            <p className="mt-0.5 text-xs text-muted">
              {influencer.codeWorks
                ? `Quien lo escribe en el carrito recibe ${influencer.customerDiscountPercent} % de descuento (no aplica a productos digitales ni usados), y la compra cuenta para ti aunque ya tenga cuenta.`
                : 'Por ahora tu código no está activo en el carrito. Escríbenos para revisarlo; tu enlace sigue contando.'}
            </p>
          </div>
          <button type="button" onClick={copiarCodigo} className={`${adminPrimaryButton} shrink-0 text-xs py-2.5 px-4`}>
            <IconoCopiar className="w-4 h-4" aria-hidden="true" />
            Copiar código
          </button>
        </div>

        <p className="mb-1.5 text-xs text-muted">Tu enlace: cuenta las compras de quien se registra desde él, aunque no escriba el código.</p>

        {/* URL row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-surface border border-line rounded-xl px-3.5 py-2.5 font-mono text-xs text-ink truncate min-w-0">
            {referralUrl || 'Cargando...'}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={`${adminPrimaryButton} text-xs py-2.5 px-4 flex-shrink-0 flex items-center gap-1.5`}
          >
            {copied ? (
              <>
                <IconoConfirmado className="w-4 h-4 text-white" />
                Copiado
              </>
            ) : (
              <>
                <IconoCopiar className="w-4 h-4" />
                Copiar
              </>
            )}
          </button>
        </div>

        {/* Social share */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted">Compartir en:</span>
          <button
            type="button"
            onClick={shareWhatsApp}
            className="flex h-11 items-center gap-1.5 px-3 bg-whatsapp hover:brightness-110 text-white rounded-lg text-sm font-semibold transition-all"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </button>
          <button
            type="button"
            onClick={shareTelegram}
            className={adminSecondaryButton}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Telegram
          </button>
          <button
            type="button"
            onClick={shareTwitter}
            className={adminSecondaryButton}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Twitter / X
          </button>
        </div>
      </div>

      {/* How it works */}
      <div>
        <h3 className="text-base font-bold text-ink mb-3">¿Cómo funciona?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              title: 'Comparte tu código',
              desc: `Tus seguidores lo escriben en el carrito y reciben ${influencer.customerDiscountPercent} % de descuento. También puedes pasar tu enlace.`,
              Icon: IconoCompartir,
              color: 'text-brand-500',
              bg: 'bg-brand-50',
              step: '1',
            },
            {
              title: 'Compran y reciben su pedido',
              desc: 'Cuenta cada compra pagada. Un registro sin compra no genera comisión, y una compra cancelada tampoco.',
              Icon: IconoCarrito,
              color: 'text-success-strong',
              bg: 'bg-success-strong/10',
              step: '2',
            },
            {
              title: 'Se acreditan tus Puntos ES',
              desc: `El ${influencer.commissionRate} % del valor de los productos (sin IVA ni envío), solos, ${dias} días después de la entrega. Los usas para comprar en la tienda; no se cambian por dinero.`,
              Icon: IconoBillete,
              color: 'text-brand-700',
              bg: 'bg-surface',
              step: '3',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-start gap-3 p-4 bg-white rounded-xl border border-line"
            >
              <div
                className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}
              >
                <item.Icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-bold text-brand-500">
                    Paso {item.step}
                  </span>
                </div>
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                <p className="text-xs text-muted mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two column: Conversions & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent conversions */}
        <div>
          <h3 className="text-base font-bold text-ink mb-3">
            Tus últimas ventas{' '}
            <span className="text-muted font-normal text-sm">
              ({conversions?.length || 0})
            </span>
          </h3>
          {!conversions || conversions.length === 0 ? (
            <div className="text-center py-10 text-muted text-sm bg-white rounded-xl border border-line">
              <IconoClientes className="w-8 h-8 mx-auto mb-2 opacity-25" />
              <p>Aún no tienes ventas.</p>
              <p className="text-xs mt-1">Comparte tu código para empezar a ganar Puntos ES.</p>
            </div>
          ) : (
            // C-251: una lista y no una tabla: a 360 px la tabla se cortaba ("Se acredita el 12…" y sin la fecha)
            <ul className={`${adminCard} divide-y divide-line p-0!`}>
              {conversions.slice(0, 10).map((conv) => {
                const typeInfo = CONVERSION_LABELS[conv.type] || {
                  label: conv.type,
                  Icon: IconoRegalo,
                  color: 'text-muted',
                };
                const estado = estadoDeComision(conv);
                return (
                  <li key={conv.id} className="flex items-start gap-3 px-4 py-3">
                    <typeInfo.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${typeInfo.color}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">
                        {conv.type === 'PURCHASE'
                          ? `${formatUSD(conv.baseAmount)} ${conv.source === 'CODE' ? 'con tu código' : 'con tu enlace'}`
                          : typeInfo.label}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span className={adminBadge(estado.tono)}>{estado.texto}</span>
                        <span>{format(new Date(conv.createdAt), 'dd/MM/yy', { locale: es })}</span>
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-ink">
                      {conv.type === 'PURCHASE' ? formatUSD(conv.commission) : '—'}
                      <span className="block text-xs font-normal text-muted">Puntos ES</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Leaderboard */}
        <div>
          <h3 className="text-base font-bold text-ink mb-3">
            Clasificación{' '}
            <span className="text-muted font-normal text-sm">· por ventas acreditadas</span>
          </h3>
          {!leaderboard || leaderboard.length === 0 ? (
            <div className="text-center py-10 text-muted text-sm bg-white rounded-xl border border-line">
              <IconoPremio className="w-8 h-8 mx-auto mb-2 opacity-25" />
              <p>Todavía no hay ventas acreditadas.</p>
              <p className="text-xs mt-1">Sé el primero de la clasificación.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                    entry.isCurrentUser
                      ? 'bg-brand-50 border-brand-200'
                      : 'bg-white border-line'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      entry.rank === 1
                        ? 'bg-brand-700 text-white'
                        : entry.rank === 2
                          ? 'bg-brand-100 text-brand-800'
                          : entry.rank === 3
                            ? 'bg-brand-50 text-brand-700'
                            : 'bg-line text-muted'
                    }`}
                  >
                    {entry.rank <= 3
                      ? <IconoPremio className={`h-5 w-5 ${['text-brand-500', 'text-brand-700', 'text-brand-600'][entry.rank - 1]}`} aria-hidden="true" />
                      : `#${entry.rank}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">
                      {entry.name}
                      {entry.isCurrentUser && (
                        <span className="ml-1.5 text-xs text-brand-500 font-normal">
                          (Tú)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      {entry.conversionsCount} {entry.conversionsCount === 1 ? 'venta' : 'ventas'}
                    </p>
                  </div>
                </div>
              ))}
              {currentUserRank && currentUserRank > 10 && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-brand-50 border-brand-200">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 bg-brand-100 text-brand-500">
                    #{currentUserRank}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-brand-500">
                      Tu posición
                    </p>
                    <p className="text-xs text-muted">
                      Sigue compartiendo para subir
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
