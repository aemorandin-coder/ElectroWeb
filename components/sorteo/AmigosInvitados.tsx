// C-262: los amigos invitados, en "Tus boletos" de /sorteo. El equipo, 15/11: "¿cómo sabe si los amigos le aceptaron o le
// hace falta un amigo de su link?". Antes era una línea ("1 de 2 amigos ya activaron su cuenta"): no decía cuánto faltaba
// para el próximo boleto, ni quién, ni por qué un amigo no sumaba.
// - El par que se está llenando (dos barras) y la frase: "Te falta 1 amigo para tu próximo boleto".
// - Cada amigo con su nombre corto ("Luisa P.", nunca su correo ni su teléfono) y su estado, en los sellos de la tienda:
//   cuenta (verde fuerte), lo que le falta hacer (el azul oscuro del logo) y no suma (gris).
// - "Recordarles por WhatsApp": un mensaje listo, sin el número del amigo (lo elige quien invita en su WhatsApp).
// Sin hooks: la pinta el servidor.
import { IconoCheck, IconoClientes, IconoCuenta, IconoInfo } from '@/components/iconos';
import { FaWhatsapp } from 'react-icons/fa6';
import { adminBadge, adminDato } from '@/lib/admin-ui';
import type { AmigoInvitado } from '@/lib/sorteo/servidor';

const SELLO: Record<AmigoInvitado['estado'], { texto: string; clase: string }> = {
  cuenta: { texto: 'Cuenta', clase: adminBadge('success') },
  'falta-activar': { texto: 'Falta activar', clase: adminBadge('warning') },
  'falta-telefono': { texto: 'Falta su teléfono', clase: adminBadge('warning') },
  repetido: { texto: 'No suma', clase: adminDato },
};

export default function AmigosInvitados({
  amigos,
  porInvitar,
  tope,
  faltanParaProximo,
  premio,
  urlSorteo,
}: {
  amigos: AmigoInvitado[];
  porInvitar: number;
  tope: number;
  faltanParaProximo: number;
  premio: string;
  /** /sorteo con el dominio, para el recordatorio */
  urlSorteo: string;
}) {
  const llenos = faltanParaProximo === 0 ? 2 : 2 - faltanParaProximo;
  const frase = faltanParaProximo === 0
    ? `Ya ganaste los ${tope} ${tope === 1 ? 'boleto' : 'boletos'} de invitar`
    : faltanParaProximo === 1
      ? 'Te falta 1 amigo para tu próximo boleto'
      : porInvitar > 0
        ? 'Invita a 2 amigos más y ganas otro boleto'
        : 'Invita a 2 amigos y ganas un boleto';
  const sinActivar = amigos.some((a) => a.estado === 'falta-activar');
  const sinTelefono = amigos.some((a) => a.estado === 'falta-telefono');
  const repetidos = amigos.some((a) => a.estado === 'repetido');
  const pendientes = sinActivar || sinTelefono;
  const recordatorio = `¡Hola! Te uniste a Electro Shop con mi enlace del sorteo de ${premio}. Para que cuente, ${
    sinActivar ? 'activa tu cuenta con el enlace que te llegó al correo' : 'agrega tu teléfono en tu cuenta'
  }${sinActivar && sinTelefono ? ' (y agrega tu teléfono, si entraste con Google)' : ''}. Así los dos sumamos: ${urlSorteo}`;

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <IconoClientes className="h-4 w-4 text-brand-600" aria-hidden="true" />
          Invitando amigos
        </h3>
        <span className="text-sm tabular-nums text-ink-soft">
          {porInvitar} de {tope} {tope === 1 ? 'boleto' : 'boletos'}
        </span>
      </div>

      {/* El par que se está llenando: cada 2 amigos que cuentan, un boleto */}
      <div className="mt-2.5 flex items-center gap-3">
        <span className="flex shrink-0 gap-1" aria-hidden="true">
          {[0, 1].map((k) => (
            <span key={k} className={`h-2.5 w-7 rounded-full ${k < llenos ? 'bg-brand-500' : 'bg-brand-100'}`} />
          ))}
        </span>
        <p className="text-sm font-semibold text-brand-700">{frase}</p>
      </div>

      {amigos.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Tus amigos invitados">
          {amigos.map((a, k) => (
            <li key={k} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <IconoCuenta className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="truncate text-ink">{a.nombre}</span>
              </span>
              <span className={SELLO[a.estado].clase}>
                {a.estado === 'cuenta' && <IconoCheck className="h-3 w-3" aria-hidden="true" />}
                {SELLO[a.estado].texto}
              </span>
            </li>
          ))}
        </ul>
      )}

      {(sinTelefono || repetidos) && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
          <IconoInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {sinTelefono && 'Quien entró con Google cuenta cuando agrega su teléfono en su cuenta. '}
            {repetidos && 'Cada persona suma una sola vez: un teléfono o una cédula que ya contaron no suman de nuevo.'}
          </span>
        </p>
      )}

      {pendientes && (
        <a
          href={`https://wa.me/?text=${encodeURIComponent(recordatorio)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <FaWhatsapp className="h-4 w-4" aria-hidden="true" />
          Recordarles por WhatsApp
        </a>
      )}
    </div>
  );
}
