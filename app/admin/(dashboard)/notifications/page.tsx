'use client';

import { useEffect, useState } from 'react';
import { FaTelegram } from 'react-icons/fa6';
import { FiInbox, FiSliders } from 'react-icons/fi';
import { adminPageHeader, adminPageSubtitle, adminPageTitle, adminTab } from '@/lib/admin-ui';
import Inbox from './_components/Inbox';
import ChannelMatrix from './_components/ChannelMatrix';
import TelegramPanel from './_components/TelegramPanel';

// Notificaciones del equipo (C-73): bandeja, qué se avisa por cada canal y bot de Telegram.
// Antes esta ruta solo redirigía a una pestaña de Mensajes (F5).

type TabId = 'bandeja' | 'avisos' | 'telegram';

const TABS: { id: TabId; label: string; Icon: typeof FiInbox }[] = [
  { id: 'bandeja', label: 'Bandeja', Icon: FiInbox },
  { id: 'avisos', label: 'Qué avisar', Icon: FiSliders },
  { id: 'telegram', label: 'Telegram', Icon: FaTelegram },
];

function tabFromHash(): TabId {
  if (typeof window === 'undefined') return 'bandeja';
  const hash = window.location.hash.slice(1);
  return TABS.some((tab) => tab.id === hash) ? (hash as TabId) : 'bandeja';
}

export default function NotificationsPage() {
  const [active, setActive] = useState<TabId>('bandeja');

  useEffect(() => {
    const sync = () => setActive(tabFromHash());
    const first = window.setTimeout(sync, 0);
    window.addEventListener('hashchange', sync);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const goTo = (id: TabId) => {
    setActive(id);
    window.history.replaceState(null, '', `#${id}`);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Notificaciones</h1>
          <p className={adminPageSubtitle}>Todo lo que pasa en la tienda, y por dónde te enteras: panel, correo o Telegram.</p>
        </div>
      </div>

      <div className="-mx-1 mb-5 overflow-x-auto px-1 pb-1">
        <div className="flex w-max gap-1 rounded-xl border border-line bg-white p-1" role="tablist" aria-label="Secciones">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={active === id} onClick={() => goTo(id)} className={adminTab(active === id)}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {active === 'bandeja' && <Inbox />}
      {active === 'avisos' && <ChannelMatrix onGoToTelegram={() => goTo('telegram')} />}
      {active === 'telegram' && <TelegramPanel />}
    </div>
  );
}
