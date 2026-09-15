'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaTelegram } from 'react-icons/fa6';
import { FiCopy, FiExternalLink, FiPause, FiPlay, FiPlus, FiSend, FiTrash2, FiUsers, FiUser } from 'react-icons/fi';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import {
  adminBadge, adminCard, adminDangerButton, adminHint, adminIconButton, adminInput, adminLabel, adminNotice,
  adminPrimaryButton, adminSecondaryButton, adminSpinner,
} from '@/lib/admin-ui';
import { timeAgo } from '@/components/notifications/notification-meta';

interface TelegramChat {
  id: string;
  title: string;
  type: string;
  isActive: boolean;
  lastSentAt: string | null;
  lastError: string | null;
  createdAt: string;
}

interface TelegramStatus {
  connected: boolean;
  tokenUnreadable: boolean;
  tokenPreview: string | null;
  bot: { id: string | null; username: string | null; name: string | null } | null;
  webhook: { active: boolean; url: string | null; pendingUpdates: number; lastError: string | null };
  webhookPossible: boolean;
  linkPending: { expiresAt: string } | null;
  chats: TelegramChat[];
  warning?: string | null;
}

interface LinkCode {
  code: string;
  expiresAt: string;
  privateUrl: string;
  groupUrl: string;
}

const COMMANDS = [
  ['/resumen', 'ventas, clientes y recargas de hoy'],
  ['/pendientes', 'lo que espera por el equipo'],
  ['/tasa', 'tasa BCV que usa la tienda'],
  ['/pausar y /reanudar', 'silenciar ese chat sin quitarlo'],
];

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

export default function TelegramPanel() {
  const { confirm } = useConfirm();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [link, setLink] = useState<LinkCode | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const pollRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/telegram', { cache: 'no-store' }).catch(() => null);
    if (!response?.ok) {
      toast.error('No se pudo leer el estado de Telegram');
      return;
    }
    setStatus(await readJson(response));
  }, []);

  useEffect(() => {
    const first = window.setTimeout(load, 0);
    return () => window.clearTimeout(first);
  }, [load]);

  const stopPolling = () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;
  };
  useEffect(() => stopPolling, []);

  const checkLink = useCallback(async (manual: boolean) => {
    const response = await fetch('/api/admin/telegram/link', { cache: 'no-store' }).catch(() => null);
    const data = response ? await readJson(response) : {};
    if (!response?.ok) {
      if (manual) toast.error(data.error || 'No se pudo comprobar');
      return;
    }
    if (data.linked) {
      stopPolling();
      setLink(null);
      toast.success(`Conectado: ${data.linked.title}`);
      load();
    } else if (manual) {
      toast('Todavía no llega el mensaje. Abre el enlace y toca Iniciar en Telegram.');
    }
  }, [load]);

  const connect = async () => {
    setBusy('connect');
    try {
      const response = await fetch('/api/admin/telegram', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      const data = await readJson(response);
      if (!response.ok) {
        toast.error(data.error || 'No se pudo conectar el bot');
        return;
      }
      setToken('');
      setStatus(data);
      toast.success(`Bot conectado: @${data.bot?.username}`);
      if (data.warning) toast(data.warning, { duration: 8000 });
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    const ok = await confirm({
      title: 'Desconectar el bot',
      message: 'Dejarán de llegar avisos a Telegram. Los chats se guardan por si vuelves a conectar el mismo bot.',
      confirmText: 'Desconectar',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    if (!ok) return;
    setBusy('disconnect');
    const response = await fetch('/api/admin/telegram', { method: 'DELETE' }).catch(() => null);
    setBusy(null);
    if (!response?.ok) {
      toast.error('No se pudo desconectar');
      return;
    }
    setLink(null);
    stopPolling();
    setStatus(await readJson(response));
  };

  const createLink = async () => {
    setBusy('link');
    const response = await fetch('/api/admin/telegram/link', { method: 'POST' }).catch(() => null);
    setBusy(null);
    const data = response ? await readJson(response) : {};
    if (!response?.ok) {
      toast.error(data.error || 'No se pudo crear el código');
      return;
    }
    setLink(data);
    stopPolling();
    // Revisa cada 4 s durante el tiempo del código; con webhook el chat queda conectado al instante
    pollRef.current = window.setInterval(() => {
      setNow(Date.now());
      checkLink(false);
    }, 4000);
  };

  const updateChat = async (chat: TelegramChat, patch: Partial<Pick<TelegramChat, 'isActive'>>) => {
    setBusy(chat.id);
    const response = await fetch(`/api/admin/telegram/chats/${chat.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }).catch(() => null);
    setBusy(null);
    if (!response?.ok) {
      toast.error('No se pudo actualizar el chat');
      return;
    }
    const updated = await readJson(response);
    setStatus((previous) => previous && { ...previous, chats: previous.chats.map((entry) => (entry.id === chat.id ? updated : entry)) });
  };

  const removeChat = async (chat: TelegramChat) => {
    const ok = await confirm({ title: 'Quitar chat', message: `"${chat.title}" dejará de recibir avisos. Para volver hay que conectarlo con un código nuevo.`, confirmText: 'Quitar', cancelText: 'Cancelar', type: 'danger' });
    if (!ok) return;
    setBusy(chat.id);
    const response = await fetch(`/api/admin/telegram/chats/${chat.id}`, { method: 'DELETE' }).catch(() => null);
    setBusy(null);
    if (!response?.ok) {
      toast.error('No se pudo quitar el chat');
      return;
    }
    setStatus((previous) => previous && { ...previous, chats: previous.chats.filter((entry) => entry.id !== chat.id) });
  };

  const sendTest = async (chat?: TelegramChat) => {
    setBusy(chat ? `test-${chat.id}` : 'test');
    const response = await fetch('/api/admin/telegram/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId: chat?.id }) }).catch(() => null);
    setBusy(null);
    const data = response ? await readJson(response) : {};
    if (!response?.ok && !data.deliveries) {
      toast.error(data.error || 'No se pudo enviar la prueba');
      return;
    }
    const failed = (data.deliveries ?? []).filter((delivery: { ok: boolean }) => !delivery.ok);
    if (failed.length === 0) toast.success('Mensaje de prueba enviado');
    else toast.error(`No llegó a ${failed.length} chat(s). Revisa el error en la lista.`);
    load();
  };

  if (!status) {
    return <div className="flex justify-center py-16"><span className={adminSpinner} aria-label="Cargando" /></div>;
  }

  if (!status.connected) {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className={adminCard}>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><FaTelegram className="h-6 w-6" aria-hidden="true" /></span>
            <div>
              <h2 className="text-base font-semibold text-ink">Crea el bot de la tienda</h2>
              <p className="text-sm text-muted">Toma 2 minutos y se hace una sola vez.</p>
            </div>
          </div>
          <ol className="space-y-3 text-sm text-ink-soft">
            <li><strong className="text-ink">1.</strong> En Telegram abre <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:underline">@BotFather</a> y escribe <code className="rounded bg-surface px-1.5 py-0.5">/newbot</code>.</li>
            <li><strong className="text-ink">2.</strong> Ponle un nombre (por ejemplo <em>Avisos Electro Shop</em>) y un usuario que termine en <code className="rounded bg-surface px-1.5 py-0.5">bot</code>.</li>
            <li><strong className="text-ink">3.</strong> BotFather te responde con un <strong>token</strong> (números, dos puntos y letras). Cópialo completo y pégalo aquí.</li>
          </ol>
          <p className={`${adminHint} mt-4`}>El token queda cifrado en la base de datos y nunca se vuelve a mostrar. No lo compartas por chat.</p>
        </section>

        <section className={adminCard}>
          <h2 className="text-base font-semibold text-ink">Conectar el bot</h2>
          {status.tokenUnreadable && (
            <p className={`${adminNotice('warning')} mt-3`}>Había un bot guardado, pero su token ya no se puede leer (cambió la clave del servidor). Pégalo de nuevo.</p>
          )}
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              connect();
            }}
          >
            <div>
              <label htmlFor="telegram-token" className={adminLabel}>Token del bot</label>
              <input
                id="telegram-token"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="123456789:AAH…"
                className={`${adminInput()} font-mono`}
              />
            </div>
            <button type="submit" disabled={busy === 'connect' || token.trim().length < 20} className={`${adminPrimaryButton} w-full`}>
              {busy === 'connect' ? 'Conectando…' : 'Conectar bot'}
            </button>
          </form>
          {!status.webhookPossible && (
            <p className={`${adminHint} mt-3`}>
              Este servidor no tiene una dirección HTTPS pública (NEXTAUTH_URL). Los avisos salen igual; los comandos del bot solo responden cuando el panel está en electroshopve.com.
            </p>
          )}
        </section>
      </div>
    );
  }

  const secondsLeft = link ? Math.max(0, Math.round((new Date(link.expiresAt).getTime() - now) / 1000)) : 0;

  return (
    <div className="space-y-5">
      <section className={`${adminCard} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><FaTelegram className="h-6 w-6" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-ink">
              {status.bot?.name}{' '}
              <a href={`https://t.me/${status.bot?.username}`} target="_blank" rel="noopener noreferrer" className="font-normal text-brand-600 hover:underline">@{status.bot?.username}</a>
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className={adminBadge(status.webhook.active ? 'success' : 'warning')}>{status.webhook.active ? 'Comandos en vivo' : 'Solo avisos'}</span>
              <span className="font-mono text-xs">{status.tokenPreview}</span>
            </p>
            {status.webhook.lastError && <p className="mt-1 text-xs text-deal">Telegram reporta: {status.webhook.lastError}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => sendTest()} disabled={busy === 'test' || status.chats.every((chat) => !chat.isActive)} className={adminSecondaryButton}>
            <FiSend className="h-4 w-4" aria-hidden="true" />
            {busy === 'test' ? 'Enviando…' : 'Probar en todos'}
          </button>
          <button type="button" onClick={disconnect} disabled={busy === 'disconnect'} className={adminDangerButton}>Desconectar</button>
        </div>
      </section>

      <section className={adminCard}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Chats que reciben avisos</h2>
            <p className="mt-0.5 text-sm text-muted">Tu chat personal o un grupo del equipo. Qué avisos llegan se elige en Qué avisar.</p>
          </div>
          {!link && (
            <button type="button" onClick={createLink} disabled={busy === 'link'} className={adminPrimaryButton}>
              <FiPlus className="h-4 w-4" aria-hidden="true" />
              Conectar un chat
            </button>
          )}
        </div>

        {link && (
          <div className="mb-5 rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-sm font-semibold text-ink">Abre uno de estos enlaces en el teléfono o computadora donde tengas Telegram:</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a href={link.privateUrl} target="_blank" rel="noopener noreferrer" className={`${adminPrimaryButton} w-full`}>
                <FiUser className="h-4 w-4" aria-hidden="true" />
                Mi chat personal
              </a>
              <a href={link.groupUrl} target="_blank" rel="noopener noreferrer" className={`${adminSecondaryButton} w-full`}>
                <FiUsers className="h-4 w-4" aria-hidden="true" />
                Agregar a un grupo
              </a>
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              En Telegram toca <strong>Iniciar</strong> (o elige el grupo). Esta pantalla lo detecta sola.
              ¿Sin enlace? Escríbele al bot: <code className="rounded bg-white px-1.5 py-0.5 font-mono">/start {link.code}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(`/start ${link.code}`).then(() => toast.success('Copiado'))}
                aria-label="Copiar comando"
                className={`${adminIconButton} ml-1 h-7 w-7 align-middle`}
              >
                <FiCopy className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">{secondsLeft > 0 ? `El código vence en ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : 'El código venció'}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => { stopPolling(); setLink(null); }} className={`${adminSecondaryButton} h-9 px-3`}>Cancelar</button>
                <button type="button" onClick={() => checkLink(true)} className={`${adminPrimaryButton} h-9 px-3`}>Ya lo abrí</button>
              </div>
            </div>
          </div>
        )}

        {status.chats.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">Aún no hay chats. Conecta el tuyo con el botón de arriba.</p>
        ) : (
          <ul className="divide-y divide-line">
            {status.chats.map((chat) => (
              <li key={chat.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink-soft">
                    {chat.type === 'private' ? <FiUser className="h-4 w-4" aria-hidden="true" /> : <FiUsers className="h-4 w-4" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{chat.title}</span>
                      <span className={adminBadge(chat.isActive ? 'success' : 'neutral')}>{chat.isActive ? 'Recibe avisos' : 'Pausado'}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {chat.type === 'private' ? 'Chat personal' : 'Grupo'} · {chat.lastSentAt ? `último aviso ${timeAgo(chat.lastSentAt)}` : 'sin avisos todavía'}
                    </p>
                    {chat.lastError && <p className="mt-0.5 text-xs font-semibold text-deal">{chat.lastError}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1 self-end sm:self-center">
                  <button type="button" onClick={() => sendTest(chat)} disabled={busy === `test-${chat.id}` || !chat.isActive} aria-label={`Enviar prueba a ${chat.title}`} className={adminIconButton}>
                    <FiSend className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => updateChat(chat, { isActive: !chat.isActive })} disabled={busy === chat.id} aria-label={chat.isActive ? `Pausar ${chat.title}` : `Reanudar ${chat.title}`} className={adminIconButton}>
                    {chat.isActive ? <FiPause className="h-4 w-4" aria-hidden="true" /> : <FiPlay className="h-4 w-4" aria-hidden="true" />}
                  </button>
                  <button type="button" onClick={() => removeChat(chat)} disabled={busy === chat.id} aria-label={`Quitar ${chat.title}`} className={`${adminIconButton} hover:text-deal`}>
                    <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={adminCard}>
        <h2 className="text-base font-semibold text-ink">Comandos del bot</h2>
        <p className="mt-0.5 text-sm text-muted">
          {status.webhook.active ? 'Escríbelos en cualquier chat conectado.' : 'Responden cuando el panel corre en electroshopve.com (necesitan HTTPS).'}
        </p>
        <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {COMMANDS.map(([command, text]) => (
            <div key={command} className="rounded-xl bg-surface px-3 py-2">
              <dt className="font-mono text-sm font-semibold text-ink">{command}</dt>
              <dd className="text-sm text-muted">{text}</dd>
            </div>
          ))}
        </dl>
        <a href={`https://t.me/${status.bot?.username}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
          Abrir el bot <FiExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </section>
    </div>
  );
}
